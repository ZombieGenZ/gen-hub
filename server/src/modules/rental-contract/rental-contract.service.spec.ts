import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ContractStatus, ContractCancelType, Prisma } from '@prisma/client';
import { RentalContractService } from './rental-contract.service';
import { RentalContractRepository } from '../rental-contract-shared/rental-contract.repository';
import { WarehouseTemplateRepository } from '../warehouse-template/warehouse-template.repository';
import { OrganizationRepository } from '../organization/organization.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { SystemLogService } from '../system-log/system-log.service';
import { OrganizationAuditLogService } from '../organization/organization-audit-log.service';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { EmailService } from '../notification/email.service';
import { SepayService } from '../payment/sepay.service';
import { PaymentSchedulerService } from '../payment/payment-scheduler.service';
import { SignatureService } from '../rental-contract-shared/signature.service';
import { AdminPaymentType } from './dto';

// ─── Mock data ─────────────────────────────────────────────────
const mockTier = {
  id: 'tier-1',
  duration_value: 6,
  duration_unit: 'MONTH',
  is_deleted: false,
  is_active: true,
};

const mockOrganization = {
  id: 'org-1',
  name: 'Test Org',
  owner: { email: 'owner@example.com', name: 'Owner' },
};

const mockTemplate = {
  id: 'template-1',
  name: 'Warehouse A',
  description: 'Large warehouse',
  is_shared_warehouse: true,
  price_per_month: new Prisma.Decimal(5000000),
  length: 50,
  width: 30,
  block_length: 5,
  block_width: 3,
  rows: [],
};

const mockContract = {
  id: 'contract-1',
  code: 'GENHUB-ABC123',
  name: 'Test Contract',
  status: ContractStatus.ACTIVE,
  organization_id: 'org-1',
  started_at: new Date('2024-01-01'),
  expired_at: new Date('2024-07-01'),
  total_price: new Prisma.Decimal(30000000),
  final_price: new Prisma.Decimal(30000000),
  discount_rate: new Prisma.Decimal(0),
  created_by: 'user-1',
  organization: mockOrganization,
};

const mockContractPending = {
  ...mockContract,
  id: 'contract-2',
  status: ContractStatus.PENDING,
};

const mockContractCompleted = {
  ...mockContract,
  id: 'contract-3',
  status: ContractStatus.COMPLETED,
};

// ─── Mock factories ────────────────────────────────────────────
const createMockRepository = () => ({
  createWithDetails: jest.fn().mockResolvedValue(mockContract),
  findMany: jest.fn().mockResolvedValue({
    items: [mockContract],
    total: 1,
    limit: 10,
    offset: 0,
    hasMore: false,
  }),
  findById: jest.fn().mockResolvedValue(mockContract),
  findByIdWithOrganization: jest.fn().mockResolvedValue(mockContract),
  findByIds: jest.fn().mockResolvedValue([mockContract]),
  update: jest.fn().mockResolvedValue(mockContract),
  cancelContract: jest.fn().mockResolvedValue(undefined),
});

const createMockTemplateRepository = () => ({
  findById: jest.fn().mockResolvedValue(mockTemplate),
});

const createMockOrganizationRepository = () => ({
  findById: jest.fn().mockResolvedValue(mockOrganization),
  findOrgIdsByUser: jest.fn().mockResolvedValue(['org-1']),
});

const createMockPrisma = () => ({
  rentalDurationTier: {
    findFirst: jest.fn().mockResolvedValue(mockTier),
  },
  rentalContractDetail: {
    findMany: jest.fn().mockResolvedValue([]),
  },
  rentalContract: {
    findUnique: jest.fn().mockResolvedValue(mockContract),
    findMany: jest.fn().mockResolvedValue([]),
    update: jest.fn(),
  },
  payment: {
    findFirst: jest.fn().mockResolvedValue(null),
    findMany: jest.fn().mockResolvedValue([]),
  },
  $transaction: jest.fn((fn) => fn({})),
});

const createMockRedisService = () => ({
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
  setNX: jest.fn().mockResolvedValue(true),
  keys: jest.fn().mockResolvedValue([]),
  exists: jest.fn().mockResolvedValue(false),
  delByPattern: jest.fn().mockResolvedValue(0),
});

const createMockWebsocketGateway = () => ({
  emitRentalContractCreated: jest.fn(),
  emitToOrganization: jest.fn(),
  server: { to: jest.fn().mockReturnValue({ emit: jest.fn() }) },
});

const createMockSystemLogService = () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
});

const createMockAuditLogService = () => ({
  logCreate: jest.fn(),
  logUpdate: jest.fn(),
  logDelete: jest.fn(),
});

const createMockConfigService = () => ({
  get: jest.fn((key: string) => {
    const map: Record<string, any> = {
      REDIS_RENTAL_CONTRACT_CACHE_TTL: 300,
      REDIS_RENTAL_CONTRACT_LIST_CACHE_TTL: 60,
      RENTAL_LOCK_DURATION_SECONDS: 3600,
      RENTAL_CONTRACT_PREFIX: 'GENHUB',
    };
    return map[key];
  }),
});

const createMockI18nService = () => ({
  t: jest.fn((key: string) => key),
});

const createMockEmailService = () => ({
  sendContractCancelledEmail: jest.fn(),
  sendContractTimeChangedEmail: jest.fn(),
});

const createMockSepayService = () => ({
  createContractPayment: jest.fn().mockResolvedValue({
    paymentId: 'payment-1',
    paymentCode: 'GH12345678',
    amount: 30000000,
    qrCode: 'https://qr.sepay.vn/img?...',
    status: 'PENDING',
    expiredAt: new Date(),
  }),
});

const createMockPaymentScheduler = () => ({
  cancelScheduledExpire: jest.fn(),
  cancelScheduledCancel: jest.fn(),
  schedulePaymentExpire: jest.fn(),
  scheduleContractCancel: jest.fn(),
});

const createMockSignatureService = () => ({
  uploadSignature: jest
    .fn()
    .mockResolvedValue({ url: 'https://example.com/sig.png' }),
});

// ─── Test Suite ────────────────────────────────────────────────
describe('RentalContractService', () => {
  let service: RentalContractService;
  let repository: ReturnType<typeof createMockRepository>;
  let templateRepo: ReturnType<typeof createMockTemplateRepository>;
  let orgRepo: ReturnType<typeof createMockOrganizationRepository>;
  let prisma: ReturnType<typeof createMockPrisma>;
  let redis: ReturnType<typeof createMockRedisService>;
  let websocket: ReturnType<typeof createMockWebsocketGateway>;
  let sepay: ReturnType<typeof createMockSepayService>;

  beforeEach(async () => {
    repository = createMockRepository();
    templateRepo = createMockTemplateRepository();
    orgRepo = createMockOrganizationRepository();
    prisma = createMockPrisma();
    redis = createMockRedisService();
    websocket = createMockWebsocketGateway();
    sepay = createMockSepayService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RentalContractService,
        { provide: RentalContractRepository, useValue: repository },
        { provide: WarehouseTemplateRepository, useValue: templateRepo },
        { provide: OrganizationRepository, useValue: orgRepo },
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
        { provide: WebsocketGateway, useValue: websocket },
        { provide: SystemLogService, useValue: createMockSystemLogService() },
        {
          provide: OrganizationAuditLogService,
          useValue: createMockAuditLogService(),
        },
        { provide: ConfigService, useValue: createMockConfigService() },
        { provide: I18nService, useValue: createMockI18nService() },
        { provide: EmailService, useValue: createMockEmailService() },
        { provide: SepayService, useValue: sepay },
        {
          provide: PaymentSchedulerService,
          useValue: createMockPaymentScheduler(),
        },
        { provide: SignatureService, useValue: createMockSignatureService() },
      ],
    }).compile();

    service = module.get(RentalContractService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── createByAdmin ─────────────────────────────────────────
  describe('createByAdmin', () => {
    const baseDto = {
      organization_id: 'org-1',
      templates: [{ template_id: 'template-1', row_template_ids: [] }],
      duration_tier_id: 'tier-1',
      payment_method: 'TRANSFER' as any,
      auto_renew: false,
      type: AdminPaymentType.CASH,
    };

    it('should throw BadRequestException when duration tier not found', async () => {
      prisma.rentalDurationTier.findFirst.mockResolvedValue(null);

      await expect(
        service.createByAdmin(baseDto as any, 'user-1', 'vi'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when organization not found', async () => {
      orgRepo.findById.mockResolvedValue(null);

      await expect(
        service.createByAdmin(baseDto as any, 'user-1', 'vi'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when warehouse template not found', async () => {
      templateRepo.findById.mockResolvedValue(null);

      await expect(
        service.createByAdmin(baseDto as any, 'user-1', 'vi'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when renting rows of non-shared warehouse', async () => {
      const nonSharedTemplate = { ...mockTemplate, is_shared_warehouse: false };
      templateRepo.findById.mockResolvedValue(nonSharedTemplate);

      const dtoWithRows = {
        ...baseDto,
        templates: [{ template_id: 'template-1', row_template_ids: ['row-1'] }],
      };

      await expect(
        service.createByAdmin(dtoWithRows as any, 'user-1', 'vi'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException when lock acquisition fails', async () => {
      redis.exists.mockResolvedValue(true);

      await expect(
        service.createByAdmin(baseDto as any, 'user-1', 'vi'),
      ).rejects.toThrow(ConflictException);
    });

    it('should create ACTIVE contract for CASH payment type', async () => {
      const cashDto = { ...baseDto, type: AdminPaymentType.CASH };
      const result = await service.createByAdmin(
        cashDto as any,
        'user-1',
        'vi',
      );

      expect(result).toBeDefined();
      expect(result.contract).toBeDefined();
      expect(repository.createWithDetails).toHaveBeenCalled();
      // CASH payment does not call sepayService
      expect(sepay.createContractPayment).not.toHaveBeenCalled();
    });

    it('should create PENDING contract and payment for TRANSFER type', async () => {
      const transferDto = { ...baseDto, type: AdminPaymentType.TRANSFER };
      // Repository returns PENDING contract for transfer
      const pendingContract = {
        ...mockContract,
        status: ContractStatus.PENDING,
        final_price: new Prisma.Decimal(30000000),
      };
      repository.createWithDetails.mockResolvedValue(pendingContract);

      const result = await service.createByAdmin(
        transferDto as any,
        'user-1',
        'vi',
      );

      expect(result).toBeDefined();
      expect(sepay.createContractPayment).toHaveBeenCalled();
    });

    it('should deduplicate template IDs', async () => {
      const dupeDto = {
        ...baseDto,
        templates: [
          { template_id: 'template-1', row_template_ids: [] },
          { template_id: 'template-1', row_template_ids: [] },
        ],
      };

      await service.createByAdmin(dupeDto as any, 'user-1', 'vi');
      // Only called once since duplicates are removed
      expect(templateRepo.findById).toHaveBeenCalledTimes(1);
    });

    it('should upload signature when file is provided', async () => {
      const sigService = createMockSignatureService();
      // Re-create module with accessible sigService
      const module = await Test.createTestingModule({
        providers: [
          RentalContractService,
          { provide: RentalContractRepository, useValue: repository },
          { provide: WarehouseTemplateRepository, useValue: templateRepo },
          { provide: OrganizationRepository, useValue: orgRepo },
          { provide: PrismaService, useValue: prisma },
          { provide: RedisService, useValue: redis },
          { provide: WebsocketGateway, useValue: websocket },
          { provide: SystemLogService, useValue: createMockSystemLogService() },
          {
            provide: OrganizationAuditLogService,
            useValue: createMockAuditLogService(),
          },
          { provide: ConfigService, useValue: createMockConfigService() },
          { provide: I18nService, useValue: createMockI18nService() },
          { provide: EmailService, useValue: createMockEmailService() },
          { provide: SepayService, useValue: sepay },
          {
            provide: PaymentSchedulerService,
            useValue: createMockPaymentScheduler(),
          },
          { provide: SignatureService, useValue: sigService },
        ],
      }).compile();

      const svc = module.get(RentalContractService);
      const fakeFile = {
        buffer: Buffer.from('fake-sig'),
      } as Express.Multer.File;

      const result = await svc.createByAdmin(
        baseDto as any,
        'user-1',
        'vi',
        fakeFile,
      );

      expect(result.signature).toBeDefined();
      expect(sigService.uploadSignature).toHaveBeenCalledWith(
        mockContract.id,
        fakeFile.buffer,
        'user-1',
        'vi',
      );
    });
  });

  // ─── findMany ──────────────────────────────────────────────
  describe('findMany', () => {
    const query = { limit: 10, offset: 0 };

    it('should return cached result when available', async () => {
      const cached = JSON.stringify({
        items: [mockContract],
        total: 1,
        limit: 10,
        offset: 0,
        hasMore: false,
      });
      redis.get.mockResolvedValue(cached);

      const result = await service.findMany(query as any, 'user-1', true, 'vi');

      expect(result.items).toHaveLength(1);
      expect(repository.findMany).not.toHaveBeenCalled();
    });

    it('should query database and cache result when no cache', async () => {
      redis.get.mockResolvedValue(null);

      const result = await service.findMany(query as any, 'user-1', true, 'vi');

      expect(repository.findMany).toHaveBeenCalled();
      expect(redis.set).toHaveBeenCalled();
      expect(result.items).toHaveLength(1);
    });

    it('should restrict to user orgs when no list-all permission', async () => {
      redis.get.mockResolvedValue(null);

      await service.findMany(query as any, 'user-1', false, 'vi');

      expect(orgRepo.findOrgIdsByUser).toHaveBeenCalledWith('user-1');
    });

    it('should return empty when user has no orgs and no list-all', async () => {
      orgRepo.findOrgIdsByUser.mockResolvedValue([]);

      const result = await service.findMany(
        query as any,
        'user-1',
        false,
        'vi',
      );

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  // ─── findById ──────────────────────────────────────────────
  describe('findById', () => {
    it('should return contract when found', async () => {
      const result = await service.findById('contract-1', 'user-1', 'vi');
      expect(result.id).toBe('contract-1');
    });

    it('should throw NotFoundException when contract not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.findById('not-exist', 'user-1', 'vi'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── update ────────────────────────────────────────────────
  describe('update', () => {
    it('should update contract name/notes', async () => {
      const dto = { name: 'Updated Name', notes: 'Updated notes' };

      await service.update('contract-1', dto as any, 'user-1', 'vi');

      expect(repository.update).toHaveBeenCalledWith(
        'contract-1',
        expect.objectContaining({
          name: 'Updated Name',
          notes: 'Updated notes',
        }),
      );
    });

    it('should throw NotFoundException when contract not found', async () => {
      repository.findByIdWithOrganization.mockResolvedValue(null);

      await expect(
        service.update('not-exist', {} as any, 'user-1', 'vi'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when extending non-ACTIVE contract', async () => {
      repository.findByIdWithOrganization.mockResolvedValue(
        mockContractPending,
      );

      const dto = { extend_duration_tier_id: 'tier-1' };

      await expect(
        service.update('contract-2', dto as any, 'user-1', 'vi'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when duration tier not found for extension', async () => {
      prisma.rentalDurationTier.findFirst.mockResolvedValue(null);

      const dto = { extend_duration_tier_id: 'tier-unknown' };

      await expect(
        service.update('contract-1', dto as any, 'user-1', 'vi'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when reducing past current date', async () => {
      const contractExpiringTomorrow = {
        ...mockContract,
        expired_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // tomorrow
      };
      repository.findByIdWithOrganization.mockResolvedValue(
        contractExpiringTomorrow,
      );

      const dto = { reduce_months: 12 }; // reducing more than remaining

      await expect(
        service.update('contract-1', dto as any, 'user-1', 'vi'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should invalidate cache after update', async () => {
      await service.update(
        'contract-1',
        { name: 'New' } as any,
        'user-1',
        'vi',
      );

      expect(redis.del).toHaveBeenCalled();
    });
  });

  // ─── delete (cancel) ──────────────────────────────────────
  describe('delete', () => {
    const cancelDto = {
      cancel_type: ContractCancelType.PROVIDER_REQUEST,
      cancel_reason: 'Admin decision',
    };

    it('should cancel an ACTIVE contract', async () => {
      await service.delete('contract-1', cancelDto as any, 'user-1', 'vi');

      expect(repository.cancelContract).toHaveBeenCalledWith(
        'contract-1',
        'user-1',
        ContractCancelType.PROVIDER_REQUEST,
        'Admin decision',
      );
    });

    it('should throw NotFoundException when contract not found', async () => {
      repository.findByIdWithOrganization.mockResolvedValue(null);

      await expect(
        service.delete('not-exist', cancelDto as any, 'user-1', 'vi'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when cancelling COMPLETED contract', async () => {
      repository.findByIdWithOrganization.mockResolvedValue(
        mockContractCompleted,
      );

      await expect(
        service.delete('contract-3', cancelDto as any, 'user-1', 'vi'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should release lock and invalidate cache', async () => {
      await service.delete('contract-1', cancelDto as any, 'user-1', 'vi');

      expect(redis.del).toHaveBeenCalled();
    });
  });

  // ─── deleteMany ────────────────────────────────────────────
  describe('deleteMany', () => {
    it('should cancel multiple contracts', async () => {
      const items = [
        {
          id: 'contract-1',
          cancel_type: ContractCancelType.PROVIDER_REQUEST,
          cancel_reason: 'Batch cancel',
        },
      ];

      await service.deleteMany(items as any, 'user-1', 'vi');

      expect(repository.cancelContract).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when no contracts found', async () => {
      repository.findByIds.mockResolvedValue([]);

      await expect(
        service.deleteMany([{ id: 'nope' }] as any, 'user-1', 'vi'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if any contract is COMPLETED', async () => {
      repository.findByIds.mockResolvedValue([
        mockContract,
        mockContractCompleted,
      ]);

      await expect(
        service.deleteMany(
          [{ id: 'contract-1' }, { id: 'contract-3' }] as any,
          'user-1',
          'vi',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
