import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentStatus, PaymentType } from '@prisma/client';
import { SepayService } from './sepay.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SystemLogService } from '../system-log/system-log.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { RentalContractService } from '../rental-contract/rental-contract.service';
import { OrganizationBalanceService } from '../organization-balance/organization-balance.service';
import { ContactListService } from '../contact-list/contact-list.service';

// ─── Mock factories ────────────────────────────────────────────
const createMockConfigService = () => ({
  get: jest.fn((key: string) => {
    const map: Record<string, any> = {
      SEPAY_ACCOUNT_NUMBER: '123456789',
      SEPAY_BANK_NAME: 'VIETCOMBANK',
      SEPAY_ACCOUNT_HOLDER: 'GENHUB JSC',
      SEPAY_API_KEY: 'test-api-key-secret',
      PAYMENT_CODE_PREFIX: 'GH',
      PAYMENT_CODE_LENGTH: 8,
      RENTAL_LOCK_DURATION_SECONDS: 3600,
      DEPOSIT_PAYMENT_EXPIRE_MINUTES: 10,
    };
    return map[key];
  }),
});

const mockPayment = (overrides: Record<string, any> = {}) => ({
  id: 'payment-1',
  payment_code: 'GH12345678',
  amount: 30000000,
  status: PaymentStatus.PENDING,
  type: PaymentType.NEW_CONTRACT,
  rental_contract_id: 'contract-1',
  organization_id: null,
  created_by: 'user-1',
  expired_at: new Date(Date.now() + 3600000), // 1 hour from now
  sepay_transaction_id: null,
  is_deleted: false,
  rental_contract: { id: 'contract-1', code: 'GENHUB-ABC', status: 'PENDING', organization_id: 'org-1' },
  ...overrides,
});

const mockEmit = jest.fn();

const createMockPrisma = () => ({
  payment: {
    create: jest.fn().mockResolvedValue(mockPayment()),
    findUnique: jest.fn().mockResolvedValue(null), // no duplicate by default
    findMany: jest.fn().mockResolvedValue([mockPayment()]),
    update: jest.fn().mockResolvedValue(mockPayment({ status: PaymentStatus.PAID })),
    count: jest.fn().mockResolvedValue(1),
  },
  rentalContract: {
    findUnique: jest.fn().mockResolvedValue({ id: 'contract-1', code: 'GENHUB-ABC', organization_id: 'org-1' }),
    update: jest.fn(),
  },
  user: {
    findUnique: jest.fn().mockResolvedValue({ email: 'user@example.com' }),
  },
});

const createMockWebsocketGateway = () => ({
  server: { to: jest.fn().mockReturnValue({ emit: mockEmit }) },
});

const createMockSystemLogService = () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
});

const createMockRentalContractService = () => ({
  cancelConflictingContracts: jest.fn(),
  activateContractWarehouses: jest.fn(),
});

const createMockOrgBalanceService = () => ({
  processDepositSuccess: jest.fn(),
});

const createMockContactListService = () => ({
  addToWhitelist: jest.fn(),
});

// ─── Test Suite ────────────────────────────────────────────────
describe('SepayService', () => {
  let service: SepayService;
  let prisma: ReturnType<typeof createMockPrisma>;
  let websocket: ReturnType<typeof createMockWebsocketGateway>;
  let contractService: ReturnType<typeof createMockRentalContractService>;
  let balanceService: ReturnType<typeof createMockOrgBalanceService>;
  let contactService: ReturnType<typeof createMockContactListService>;

  beforeEach(async () => {
    prisma = createMockPrisma();
    websocket = createMockWebsocketGateway();
    contractService = createMockRentalContractService();
    balanceService = createMockOrgBalanceService();
    contactService = createMockContactListService();
    mockEmit.mockClear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SepayService,
        { provide: ConfigService, useValue: createMockConfigService() },
        { provide: PrismaService, useValue: prisma },
        { provide: SystemLogService, useValue: createMockSystemLogService() },
        { provide: WebsocketGateway, useValue: websocket },
        { provide: RentalContractService, useValue: contractService },
        { provide: OrganizationBalanceService, useValue: balanceService },
        { provide: ContactListService, useValue: contactService },
      ],
    }).compile();

    service = module.get(SepayService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── generatePaymentCode ──────────────────────────────────
  describe('generatePaymentCode', () => {
    it('should generate code with correct prefix', () => {
      const code = service.generatePaymentCode();
      expect(code).toMatch(/^GH[A-Z0-9]{8}$/);
    });

    it('should generate unique codes', () => {
      const codes = new Set(Array.from({ length: 100 }, () => service.generatePaymentCode()));
      // Statistically very unlikely to have duplicates in 100 codes
      expect(codes.size).toBeGreaterThan(90);
    });
  });

  // ─── generateQRUrl ────────────────────────────────────────
  describe('generateQRUrl', () => {
    it('should generate URL with correct parameters', () => {
      const url = service.generateQRUrl('GH12345678', 5000000);

      expect(url).toContain('qr.sepay.vn/img');
      expect(url).toContain('acc=123456789');
      expect(url).toContain('bank=VIETCOMBANK');
      expect(url).toContain('amount=5000000');
      expect(url).toContain('des=GH12345678');
    });
  });

  // ─── verifyWebhookAuth ────────────────────────────────────
  describe('verifyWebhookAuth', () => {
    it('should pass with valid API key', () => {
      expect(() => {
        service.verifyWebhookAuth('Apikey test-api-key-secret');
      }).not.toThrow();
    });

    it('should throw UnauthorizedException with invalid key', () => {
      expect(() => {
        service.verifyWebhookAuth('Apikey wrong-key');
      }).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException with missing header', () => {
      expect(() => {
        service.verifyWebhookAuth('');
      }).toThrow(UnauthorizedException);
    });
  });

  // ─── isDuplicateTransaction ───────────────────────────────
  describe('isDuplicateTransaction', () => {
    it('should return false for new transaction', async () => {
      prisma.payment.findUnique.mockResolvedValue(null);

      const result = await service.isDuplicateTransaction(12345);
      expect(result).toBe(false);
    });

    it('should return true for existing transaction', async () => {
      prisma.payment.findUnique.mockResolvedValue(mockPayment());

      const result = await service.isDuplicateTransaction(12345);
      expect(result).toBe(true);
    });
  });

  // ─── createContractPayment ────────────────────────────────
  describe('createContractPayment', () => {
    it('should create payment with PENDING status', async () => {
      const result = await service.createContractPayment({
        rentalContractId: 'contract-1',
        amount: 30000000,
        vat_amount: 3000000,
        description: 'GENHUB-ABC',
        type: 'NEW_CONTRACT',
        userId: 'user-1',
      });

      expect(result.status).toBe('PENDING');
      expect(result.paymentId).toBeDefined();
      expect(result.bankInfo).toBeDefined();
      expect(result.bankInfo.accountNumber).toBe('123456789');
      expect(result.vat_amount).toBe(3000000);
      expect(prisma.payment.create).toHaveBeenCalled();
    });

    it('should emit payment:created socket event', async () => {
      await service.createContractPayment({
        rentalContractId: 'contract-1',
        amount: 30000000,
        vat_amount: 3000000,
        description: 'Test',
        type: 'NEW_CONTRACT',
        userId: 'user-1',
      });

      expect(websocket.server.to).toHaveBeenCalledWith('user:user-1');
      expect(mockEmit).toHaveBeenCalledWith('payment:created', expect.any(Object));
    });
  });

  // ─── createDepositPayment ─────────────────────────────────
  describe('createDepositPayment', () => {
    it('should create deposit payment for organization', async () => {
      const result = await service.createDepositPayment({
        organizationId: 'org-1',
        userId: 'user-1',
        amount: 5000000,
        notes: 'Top up',
      });

      expect(result.status).toBe('PENDING');
      expect(prisma.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organization_id: 'org-1',
            type: PaymentType.ACCOUNT_DEPOSIT,
            purpose: 'ACCOUNT_DEPOSIT',
          }),
        }),
      );
    });
  });

  // ─── handlePaymentWebhook ─────────────────────────────────
  describe('handlePaymentWebhook', () => {
    const baseWebhookData = {
      id: 99999,
      gateway: 'SePay',
      transactionDate: new Date().toISOString(),
      accountNumber: '123456789',
      subAccount: null,
      code: 'REF001',
      content: 'GH12345678 thanh toan',
      transferType: 'in' as const,
      transferAmount: 30000000,
      accumulated: 0,
      referenceCode: 'REF001',
      description: 'Transfer',
    };

    it('should ignore outgoing transactions', async () => {
      const result = await service.handlePaymentWebhook({
        ...baseWebhookData,
        transferType: 'out',
      } as any);

      expect(result.message).toBe('Ignored outgoing transaction');
    });

    it('should ignore duplicate transactions', async () => {
      // Make isDuplicateTransaction return true
      prisma.payment.findUnique.mockResolvedValue(mockPayment({ sepay_transaction_id: BigInt(99999) }));

      const result = await service.handlePaymentWebhook(baseWebhookData as any);

      expect(result.message).toBe('Duplicate transaction ignored');
    });

    it('should return not-found when payment code not in content', async () => {
      prisma.payment.findMany.mockResolvedValue([]); // no matching payments

      const result = await service.handlePaymentWebhook(baseWebhookData as any);

      expect(result.message).toBe('Payment not found');
    });

    it('should return expired when payment is past expiry', async () => {
      const expiredPayment = mockPayment({ expired_at: new Date('2020-01-01') });
      prisma.payment.findMany.mockResolvedValue([expiredPayment]);

      const result = await service.handlePaymentWebhook(baseWebhookData as any);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Payment expired');
    });

    it('should return insufficient when amount is less than expected', async () => {
      prisma.payment.findMany.mockResolvedValue([mockPayment()]);

      const result = await service.handlePaymentWebhook({
        ...baseWebhookData,
        transferAmount: 100, // too low
      } as any);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Insufficient amount');
    });

    it('should process NEW_CONTRACT payment and activate contract', async () => {
      prisma.payment.findMany.mockResolvedValue([mockPayment()]);

      const result = await service.handlePaymentWebhook(baseWebhookData as any);

      expect(result.success).toBe(true);
      expect(prisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: PaymentStatus.PAID }),
        }),
      );
      expect(prisma.rentalContract.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'ACTIVE' },
        }),
      );
      expect(contractService.cancelConflictingContracts).toHaveBeenCalledWith('contract-1');
      expect(contractService.activateContractWarehouses).toHaveBeenCalled();
    });

    it('should process ACCOUNT_DEPOSIT and credit org balance', async () => {
      const depositPayment = mockPayment({
        type: PaymentType.ACCOUNT_DEPOSIT,
        organization_id: 'org-1',
        rental_contract_id: null,
      });
      prisma.payment.findMany.mockResolvedValue([depositPayment]);

      const result = await service.handlePaymentWebhook(baseWebhookData as any);

      expect(result.success).toBe(true);
      expect(balanceService.processDepositSuccess).toHaveBeenCalledWith(
        'org-1', 30000000, 'payment-1', 'GH12345678', 'user-1',
      );
    });

    it('should auto-whitelist user after successful payment', async () => {
      prisma.payment.findMany.mockResolvedValue([mockPayment()]);

      await service.handlePaymentWebhook(baseWebhookData as any);

      expect(contactService.addToWhitelist).toHaveBeenCalledWith(
        'user@example.com',
        expect.stringContaining('Auto whitelist'),
        'SYSTEM_PAYMENT',
      );
    });
  });

  // ─── manualAcceptPayment ──────────────────────────────────
  describe('manualAcceptPayment', () => {
    it('should throw BadRequestException when payment not found', async () => {
      prisma.payment.findUnique.mockResolvedValue(null);

      await expect(
        service.manualAcceptPayment('not-exist', 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when payment is not PENDING', async () => {
      prisma.payment.findUnique.mockResolvedValue(
        mockPayment({ status: PaymentStatus.PAID }),
      );

      await expect(
        service.manualAcceptPayment('payment-1', 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should accept PENDING payment and activate contract', async () => {
      prisma.payment.findUnique.mockResolvedValue(
        mockPayment({ organization: null }),
      );

      const result = await service.manualAcceptPayment('payment-1', 'admin-1');

      expect(result.success).toBe(true);
      expect(prisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: PaymentStatus.PAID }),
        }),
      );
      expect(contractService.cancelConflictingContracts).toHaveBeenCalled();
    });

    it('should auto-whitelist user after manual accept', async () => {
      prisma.payment.findUnique.mockResolvedValue(
        mockPayment({ organization: null }),
      );

      await service.manualAcceptPayment('payment-1', 'admin-1');

      expect(contactService.addToWhitelist).toHaveBeenCalled();
    });
  });

  // ─── manualRejectPayment ──────────────────────────────────
  describe('manualRejectPayment', () => {
    it('should throw BadRequestException when payment not found', async () => {
      prisma.payment.findUnique.mockResolvedValue(null);

      await expect(
        service.manualRejectPayment('not-exist', 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when payment is not PENDING', async () => {
      prisma.payment.findUnique.mockResolvedValue(
        mockPayment({ status: PaymentStatus.EXPIRED }),
      );

      await expect(
        service.manualRejectPayment('payment-1', 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should cancel payment and associated PENDING contract', async () => {
      prisma.payment.findUnique.mockResolvedValue(mockPayment());
      prisma.rentalContract.findUnique.mockResolvedValue({
        id: 'contract-1', code: 'GENHUB-ABC', status: 'PENDING', created_by: 'user-1',
      });

      const result = await service.manualRejectPayment('payment-1', 'admin-1');

      expect(result.success).toBe(true);
      expect(prisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: PaymentStatus.CANCELLED }),
        }),
      );
      expect(prisma.rentalContract.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'CANCELLED' }),
        }),
      );
    });

    it('should not cancel contract if already ACTIVE', async () => {
      prisma.payment.findUnique.mockResolvedValue(mockPayment());
      prisma.rentalContract.findUnique.mockResolvedValue({
        id: 'contract-1', code: 'GENHUB-ABC', status: 'ACTIVE',
      });

      await service.manualRejectPayment('payment-1', 'admin-1');

      // Contract update should not be called because status != PENDING
      expect(prisma.rentalContract.update).not.toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'CANCELLED' }),
        }),
      );
    });

    it('should emit payment:cancelled and contract:cancelled events', async () => {
      prisma.payment.findUnique.mockResolvedValue(mockPayment());
      prisma.rentalContract.findUnique.mockResolvedValue({
        id: 'contract-1', code: 'GENHUB-ABC', status: 'PENDING', created_by: 'user-1',
      });

      await service.manualRejectPayment('payment-1', 'admin-1');

      // Check that emit was called for both events
      expect(mockEmit).toHaveBeenCalledWith('contract:cancelled', expect.objectContaining({
        contractId: 'contract-1',
        reason: 'payment_rejected_by_admin',
      }));
      expect(mockEmit).toHaveBeenCalledWith('payment:cancelled', expect.objectContaining({
        paymentId: 'payment-1',
        manuallyRejected: true,
      }));
    });
  });

  // ─── findAllPayments ──────────────────────────────────────
  describe('findAllPayments', () => {
    it('should return paginated payments', async () => {
      const result = await service.findAllPayments({ limit: 20, offset: 0 });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(prisma.payment.findMany).toHaveBeenCalled();
    });

    it('should apply status filter', async () => {
      await service.findAllPayments({ status: 'PENDING' });

      expect(prisma.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'PENDING' }),
        }),
      );
    });
  });

  // ─── expirePayment ────────────────────────────────────────
  describe('expirePayment', () => {
    it('should expire PENDING payment', async () => {
      prisma.payment.findUnique.mockResolvedValue(mockPayment());

      await service.expirePayment('payment-1');

      expect(prisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: PaymentStatus.EXPIRED },
        }),
      );
    });

    it('should skip if payment is not PENDING', async () => {
      prisma.payment.findUnique.mockResolvedValue(
        mockPayment({ status: PaymentStatus.PAID }),
      );

      await service.expirePayment('payment-1');

      expect(prisma.payment.update).not.toHaveBeenCalled();
    });

    it('should skip if payment not found', async () => {
      prisma.payment.findUnique.mockResolvedValue(null);

      await service.expirePayment('not-exist');

      expect(prisma.payment.update).not.toHaveBeenCalled();
    });
  });
});
