import { Test, TestingModule } from '@nestjs/testing';
import { SchedulerRegistry } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PaymentStatus, ContractStatus } from '@prisma/client';
import { PaymentSchedulerService } from './payment-scheduler.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SystemLogService } from '../system-log/system-log.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';

// ─── Mock factories ────────────────────────────────────────────
const mockEmit = jest.fn();

const createMockPrisma = () => ({
  payment: {
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn(),
    findFirst: jest.fn().mockResolvedValue(null),
    update: jest.fn(),
  },
  rentalContract: {
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
});

const createMockSchedulerRegistry = () => ({
  addTimeout: jest.fn(),
  deleteTimeout: jest.fn(),
  getTimeouts: jest.fn().mockReturnValue([]),
});

const createMockConfigService = () => ({
  get: jest.fn((key: string) => {
    if (key === 'CONTRACT_PENDING_EXPIRE_SECONDS') return 86400;
    return undefined;
  }),
});

const createMockWebsocketGateway = () => ({
  server: { to: jest.fn().mockReturnValue({ emit: mockEmit }) },
});

const createMockSystemLogService = () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
});

// ─── Test Suite ────────────────────────────────────────────────
describe('PaymentSchedulerService', () => {
  let service: PaymentSchedulerService;
  let prisma: ReturnType<typeof createMockPrisma>;
  let schedulerRegistry: ReturnType<typeof createMockSchedulerRegistry>;
  let websocket: ReturnType<typeof createMockWebsocketGateway>;

  beforeEach(async () => {
    prisma = createMockPrisma();
    schedulerRegistry = createMockSchedulerRegistry();
    websocket = createMockWebsocketGateway();
    mockEmit.mockClear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentSchedulerService,
        { provide: PrismaService, useValue: prisma },
        { provide: SchedulerRegistry, useValue: schedulerRegistry },
        { provide: ConfigService, useValue: createMockConfigService() },
        { provide: SystemLogService, useValue: createMockSystemLogService() },
        { provide: WebsocketGateway, useValue: websocket },
      ],
    }).compile();

    service = module.get(PaymentSchedulerService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── processExistingPayments ──────────────────────────────
  describe('processExistingPayments', () => {
    it('should do nothing when no pending payments', async () => {
      prisma.payment.findMany.mockResolvedValue([]);

      await service.processExistingPayments();

      expect(prisma.payment.update).not.toHaveBeenCalled();
    });

    it('should immediately expire already-expired payments', async () => {
      const expiredPayment = {
        id: 'p-1',
        payment_code: 'GH001',
        status: PaymentStatus.PENDING,
        expired_at: new Date('2020-01-01'),
        created_by: 'user-1',
      };
      prisma.payment.findMany.mockResolvedValue([expiredPayment]);
      prisma.payment.findUnique.mockResolvedValue(expiredPayment);

      await service.processExistingPayments();

      expect(prisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'p-1' },
          data: { status: PaymentStatus.EXPIRED },
        }),
      );
    });

    it('should schedule future payments for expiration', async () => {
      const futurePayment = {
        id: 'p-2',
        payment_code: 'GH002',
        status: PaymentStatus.PENDING,
        expired_at: new Date(Date.now() + 60000), // 1 minute from now
        created_by: 'user-1',
      };
      prisma.payment.findMany.mockResolvedValue([futurePayment]);

      await service.processExistingPayments();

      expect(schedulerRegistry.addTimeout).toHaveBeenCalledWith(
        'payment_expire_p-2',
        expect.any(Object), // setTimeout handle
      );
    });
  });

  // ─── processExistingContracts ─────────────────────────────
  describe('processExistingContracts', () => {
    it('should do nothing when no pending contracts', async () => {
      prisma.rentalContract.findMany.mockResolvedValue([]);

      await service.processExistingContracts();

      expect(prisma.rentalContract.update).not.toHaveBeenCalled();
    });

    it('should cancel expired contracts with no pending payment', async () => {
      const oldContract = {
        id: 'c-1',
        code: 'GENHUB-001',
        status: ContractStatus.PENDING,
        created_at: new Date('2020-01-01'),
        created_by: 'user-1',
      };
      prisma.rentalContract.findMany.mockResolvedValue([oldContract]);
      prisma.payment.findFirst.mockResolvedValue(null); // no pending payment
      prisma.rentalContract.findUnique.mockResolvedValue(oldContract);

      await service.processExistingContracts();

      expect(prisma.rentalContract.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'c-1' },
          data: { status: ContractStatus.CANCELLED },
        }),
      );
    });

    it('should schedule future contract cancellation', async () => {
      const recentContract = {
        id: 'c-2',
        code: 'GENHUB-002',
        status: ContractStatus.PENDING,
        created_at: new Date(), // just created -> cancelAt is 24h from now
        created_by: 'user-1',
      };
      prisma.rentalContract.findMany.mockResolvedValue([recentContract]);

      await service.processExistingContracts();

      expect(schedulerRegistry.addTimeout).toHaveBeenCalledWith(
        'contract_cancel_c-2',
        expect.any(Object),
      );
    });
  });

  // ─── schedulePaymentExpire ────────────────────────────────
  describe('schedulePaymentExpire', () => {
    it('should schedule timeout for future expiry', () => {
      const futureDate = new Date(Date.now() + 60000);

      service.schedulePaymentExpire('p-1', futureDate, 'user-1');

      expect(schedulerRegistry.addTimeout).toHaveBeenCalledWith(
        'payment_expire_p-1',
        expect.any(Object),
      );
    });

    it('should immediately expire when delay <= 0', async () => {
      const pastDate = new Date('2020-01-01');
      prisma.payment.findUnique.mockResolvedValue({
        id: 'p-1',
        status: PaymentStatus.PENDING,
        created_by: 'user-1',
        payment_code: 'GH001',
      });

      service.schedulePaymentExpire('p-1', pastDate, 'user-1');

      // Should NOT add timeout since delay <= 0
      expect(schedulerRegistry.addTimeout).not.toHaveBeenCalled();
    });
  });

  // ─── scheduleContractCancel ───────────────────────────────
  describe('scheduleContractCancel', () => {
    it('should schedule timeout for future cancel', () => {
      const futureDate = new Date(Date.now() + 60000);

      service.scheduleContractCancel('c-1', futureDate, 'user-1');

      expect(schedulerRegistry.addTimeout).toHaveBeenCalledWith(
        'contract_cancel_c-1',
        expect.any(Object),
      );
    });
  });

  // ─── expirePayment ────────────────────────────────────────
  describe('expirePayment', () => {
    it('should set payment status to EXPIRED', async () => {
      prisma.payment.findUnique.mockResolvedValue({
        id: 'p-1',
        status: PaymentStatus.PENDING,
        payment_code: 'GH001',
        created_by: 'user-1',
        rental_contract_id: 'c-1',
      });

      await service.expirePayment('p-1');

      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'p-1' },
        data: { status: PaymentStatus.EXPIRED },
      });
    });

    it('should emit payment:expired socket event', async () => {
      prisma.payment.findUnique.mockResolvedValue({
        id: 'p-1',
        status: PaymentStatus.PENDING,
        payment_code: 'GH001',
        created_by: 'user-1',
        rental_contract_id: 'c-1',
      });

      await service.expirePayment('p-1');

      expect(websocket.server.to).toHaveBeenCalledWith('user:user-1');
      expect(mockEmit).toHaveBeenCalledWith(
        'payment:expired',
        expect.objectContaining({
          paymentId: 'p-1',
        }),
      );
    });

    it('should skip if payment is not PENDING', async () => {
      prisma.payment.findUnique.mockResolvedValue({
        id: 'p-1',
        status: PaymentStatus.PAID,
      });

      await service.expirePayment('p-1');

      expect(prisma.payment.update).not.toHaveBeenCalled();
    });

    it('should skip if payment not found', async () => {
      prisma.payment.findUnique.mockResolvedValue(null);

      await service.expirePayment('not-exist');

      expect(prisma.payment.update).not.toHaveBeenCalled();
    });
  });

  // ─── cancelContract ───────────────────────────────────────
  describe('cancelContract', () => {
    it('should cancel PENDING contract with no pending payment', async () => {
      prisma.rentalContract.findUnique.mockResolvedValue({
        id: 'c-1',
        code: 'GENHUB-001',
        status: ContractStatus.PENDING,
        created_by: 'user-1',
      });
      prisma.payment.findFirst.mockResolvedValue(null);

      await service.cancelContract('c-1');

      expect(prisma.rentalContract.update).toHaveBeenCalledWith({
        where: { id: 'c-1' },
        data: { status: ContractStatus.CANCELLED },
      });
    });

    it('should NOT cancel if pending payment exists', async () => {
      prisma.rentalContract.findUnique.mockResolvedValue({
        id: 'c-1',
        status: ContractStatus.PENDING,
      });
      prisma.payment.findFirst.mockResolvedValue({
        id: 'p-1',
        status: PaymentStatus.PENDING,
      });

      await service.cancelContract('c-1');

      expect(prisma.rentalContract.update).not.toHaveBeenCalled();
    });

    it('should skip if contract is not PENDING', async () => {
      prisma.rentalContract.findUnique.mockResolvedValue({
        id: 'c-1',
        status: ContractStatus.ACTIVE,
      });

      await service.cancelContract('c-1');

      expect(prisma.rentalContract.update).not.toHaveBeenCalled();
    });

    it('should emit contract:cancelled event', async () => {
      prisma.rentalContract.findUnique.mockResolvedValue({
        id: 'c-1',
        code: 'GENHUB-001',
        status: ContractStatus.PENDING,
        created_by: 'user-1',
      });
      prisma.payment.findFirst.mockResolvedValue(null);

      await service.cancelContract('c-1');

      expect(mockEmit).toHaveBeenCalledWith(
        'contract:cancelled',
        expect.objectContaining({
          contractId: 'c-1',
          reason: 'Payment timeout',
        }),
      );
    });
  });

  // ─── cancelScheduledExpire / cancelScheduledCancel ────────
  describe('cancelScheduledExpire', () => {
    it('should delete timeout from registry', () => {
      service.cancelScheduledExpire('p-1');

      expect(schedulerRegistry.deleteTimeout).toHaveBeenCalledWith(
        'payment_expire_p-1',
      );
    });

    it('should not throw if timeout does not exist', () => {
      schedulerRegistry.deleteTimeout.mockImplementation(() => {
        throw new Error('No Timeout found');
      });

      expect(() => service.cancelScheduledExpire('nope')).not.toThrow();
    });
  });

  describe('cancelScheduledCancel', () => {
    it('should delete contract cancel timeout', () => {
      service.cancelScheduledCancel('c-1');

      expect(schedulerRegistry.deleteTimeout).toHaveBeenCalledWith(
        'contract_cancel_c-1',
      );
    });
  });

  // ─── onModuleDestroy ──────────────────────────────────────
  describe('onModuleDestroy', () => {
    it('should clear all payment and contract timeouts', () => {
      schedulerRegistry.getTimeouts.mockReturnValue([
        'payment_expire_p1',
        'contract_cancel_c1',
        'some_other_timeout',
      ]);

      service.onModuleDestroy();

      expect(schedulerRegistry.deleteTimeout).toHaveBeenCalledWith(
        'payment_expire_p1',
      );
      expect(schedulerRegistry.deleteTimeout).toHaveBeenCalledWith(
        'contract_cancel_c1',
      );
      expect(schedulerRegistry.deleteTimeout).not.toHaveBeenCalledWith(
        'some_other_timeout',
      );
    });
  });
});
