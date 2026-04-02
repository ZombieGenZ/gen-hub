import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ReceiptStatus, ExportStatus } from '@prisma/client';
import { InventoryRequestService } from './inventory-request.service';
import { InventoryRequestRepository } from './inventory-request.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { OrganizationAuditLogService } from '../organization/organization-audit-log.service';
import { InventoryRequestCacheKeys } from './constants/inventory-request-cache.helper';
import { ExcelService } from '../../common/services/excel.service';

// ─── Mock helpers ──────────────────────────────────────────────
const ORG_ID = 'org-1';
const WAREHOUSE_ID = 'wh-1';
const ACTOR_ID = 'actor-1';

const mockInboundReceipt = (overrides: Record<string, any> = {}) => ({
  id: 'receipt-1',
  code: 'INB-001',
  status: ReceiptStatus.PENDING,
  organization_id: ORG_ID,
  warehouse_id: WAREHOUSE_ID,
  warehouse: { id: WAREHOUSE_ID, name: 'Kho A' },
  partner: null,
  notes: null,
  purchase_order_code: null,
  details: [
    {
      id: 'detail-1',
      product_id: 'prod-1',
      unit_id: 'unit-1',
      batch_id: null,
      expected_qty: 100,
      actual_qty: null,
      conversion_rate: 1,
      product: { id: 'prod-1', name: 'Sản phẩm A', sku: 'SKU-001', image_url: null },
      batch: null,
      unit: { id: 'unit-1', name: 'Cái' },
    },
  ],
  created_by: ACTOR_ID,
  created_at: new Date(),
  ...overrides,
});

const mockOutboundExport = (overrides: Record<string, any> = {}) => ({
  id: 'export-1',
  code: 'OUT-001',
  status: ExportStatus.PENDING,
  organization_id: ORG_ID,
  warehouse_id: WAREHOUSE_ID,
  warehouse: { id: WAREHOUSE_ID, name: 'Kho A' },
  partner: null,
  notes: null,
  details: [
    {
      id: 'edetail-1',
      product_id: 'prod-1',
      unit_id: 'unit-1',
      required_batch_id: null,
      quantity: 50,
      conversion_rate: 1,
      product: { id: 'prod-1', name: 'Sản phẩm A', sku: 'SKU-001' },
      unit: { id: 'unit-1', name: 'Cái' },
    },
  ],
  created_by: ACTOR_ID,
  created_at: new Date(),
  ...overrides,
});

// ─── Mock factories ────────────────────────────────────────────
const createMockRepository = () => ({
  warehouseExistsInOrg: jest.fn().mockResolvedValue(true),
  warehouseHasActiveContract: jest.fn().mockResolvedValue(true),
  partnerExistsInOrg: jest.fn().mockResolvedValue(true),
  generateInboundCode: jest.fn().mockResolvedValue('INB-001'),
  generateOutboundCode: jest.fn().mockResolvedValue('OUT-001'),
  findInboundById: jest.fn().mockResolvedValue(mockInboundReceipt()),
  findOutboundById: jest.fn().mockResolvedValue(mockOutboundExport()),
  listOrgWarehouses: jest.fn().mockResolvedValue([{ id: WAREHOUSE_ID, name: 'Kho A' }]),
});

const createMockPrisma = () => ({
  $transaction: jest.fn((fn: any) =>
    fn({
      receipt: { create: jest.fn().mockResolvedValue(mockInboundReceipt()), update: jest.fn() },
      receiptDetail: { createMany: jest.fn(), update: jest.fn() },
      export: { create: jest.fn().mockResolvedValue(mockOutboundExport()), update: jest.fn() },
      exportDetail: { createMany: jest.fn(), update: jest.fn() },
      batch: { create: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
      inventory: { findMany: jest.fn().mockResolvedValue([]) },
      rentalContractDetail: { findMany: jest.fn().mockResolvedValue([]) },
    }),
  ),
  product: {
    findMany: jest.fn().mockResolvedValue([{ id: 'prod-1' }]),
  },
  unit: {
    findMany: jest.fn().mockResolvedValue([{ id: 'unit-1' }]),
  },
  batch: {
    findMany: jest.fn().mockResolvedValue([]),
  },
  productUnit: {
    findMany: jest.fn().mockResolvedValue([
      { product_id: 'prod-1', unit_id: 'unit-1', conversion_rate: { toNumber: () => 1 } },
    ]),
  },
  receipt: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  export: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  inventory: {
    findMany: jest.fn().mockResolvedValue([]),
  },
  rentalContractDetail: {
    findMany: jest.fn().mockResolvedValue([]),
  },
});

const createMockRedis = () => ({
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(undefined),
  delByPattern: jest.fn().mockResolvedValue(undefined),
});

const createMockWebsocket = () => ({
  emitToOrganization: jest.fn(),
  server: { to: jest.fn().mockReturnValue({ emit: jest.fn() }) },
});

const createMockAuditLog = () => ({
  log: jest.fn(),
  logCreate: jest.fn(),
  logUpdate: jest.fn(),
  logDelete: jest.fn(),
});

const createMockI18n = () => ({
  t: jest.fn((key: string) => Promise.resolve(key)),
  translate: jest.fn((key: string) => Promise.resolve(key)),
});

const createMockCacheKeys = () => ({
  inboundList: jest.fn((orgId: string, params: string) => `inv:inbound:${orgId}:${params}`),
  outboundList: jest.fn((orgId: string, params: string) => `inv:outbound:${orgId}:${params}`),
  inboundDetail: jest.fn((id: string) => `inv:inbound:detail:${id}`),
  outboundDetail: jest.fn((id: string) => `inv:outbound:detail:${id}`),
});

const createMockExcelService = () => ({
  generateExcel: jest.fn(),
  parseExcel: jest.fn(),
});

// ─── Test Suite ────────────────────────────────────────────────
describe('InventoryRequestService', () => {
  let service: InventoryRequestService;
  let repository: ReturnType<typeof createMockRepository>;
  let prisma: ReturnType<typeof createMockPrisma>;
  let redisService: ReturnType<typeof createMockRedis>;

  beforeEach(async () => {
    repository = createMockRepository();
    prisma = createMockPrisma();
    redisService = createMockRedis();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryRequestService,
        { provide: InventoryRequestRepository, useValue: repository },
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redisService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const map: Record<string, any> = {
                REDIS_INBOUND_LIST_TTL: 60,
                REDIS_OUTBOUND_LIST_TTL: 60,
                REDIS_INBOUND_DETAIL_TTL: 120,
                REDIS_OUTBOUND_DETAIL_TTL: 120,
              };
              return map[key];
            }),
          },
        },
        { provide: WebsocketGateway, useFactory: createMockWebsocket },
        { provide: OrganizationAuditLogService, useFactory: createMockAuditLog },
        { provide: I18nService, useFactory: createMockI18n },
        { provide: InventoryRequestCacheKeys, useFactory: createMockCacheKeys },
        { provide: ExcelService, useFactory: createMockExcelService },
      ],
    }).compile();

    service = module.get<InventoryRequestService>(InventoryRequestService);
  });

  // ───────────────────────────────────────────────────────────
  // CREATE INBOUND
  // ───────────────────────────────────────────────────────────
  describe('createInbound', () => {
    const createDto = {
      warehouse_id: WAREHOUSE_ID,
      details: [
        { product_id: 'prod-1', unit_id: 'unit-1', expected_qty: 100 },
      ],
    };

    it('should create inbound receipt successfully', async () => {
      const result = await service.createInbound(ORG_ID, createDto as any, ACTOR_ID, 'vi');
      expect(result).toBeDefined();
      expect(repository.warehouseExistsInOrg).toHaveBeenCalledWith(WAREHOUSE_ID, ORG_ID);
      expect(repository.warehouseHasActiveContract).toHaveBeenCalledWith(WAREHOUSE_ID, ORG_ID);
    });

    it('should throw NotFoundException when warehouse is not in org', async () => {
      repository.warehouseExistsInOrg.mockResolvedValue(false);

      await expect(
        service.createInbound(ORG_ID, createDto as any, ACTOR_ID, 'vi'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when no active contract', async () => {
      repository.warehouseHasActiveContract.mockResolvedValue(false);

      await expect(
        service.createInbound(ORG_ID, createDto as any, ACTOR_ID, 'vi'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when partner does not exist', async () => {
      repository.partnerExistsInOrg.mockResolvedValue(false);

      const dtoWithPartner = { ...createDto, partner_id: 'partner-1' };

      await expect(
        service.createInbound(ORG_ID, dtoWithPartner as any, ACTOR_ID, 'vi'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when product is not found', async () => {
      prisma.product.findMany.mockResolvedValue([]); // No products found

      await expect(
        service.createInbound(ORG_ID, createDto as any, ACTOR_ID, 'vi'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when unit is not found', async () => {
      prisma.unit.findMany.mockResolvedValue([]); // No units found

      await expect(
        service.createInbound(ORG_ID, createDto as any, ACTOR_ID, 'vi'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ───────────────────────────────────────────────────────────
  // CREATE OUTBOUND
  // ───────────────────────────────────────────────────────────
  describe('createOutbound', () => {
    const createDto = {
      warehouse_id: WAREHOUSE_ID,
      details: [
        { product_id: 'prod-1', unit_id: 'unit-1', quantity: 50 },
      ],
    };

    it('should throw NotFoundException when warehouse is not in org', async () => {
      repository.warehouseExistsInOrg.mockResolvedValue(false);

      await expect(
        service.createOutbound(ORG_ID, createDto as any, ACTOR_ID, 'vi'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when no active contract', async () => {
      repository.warehouseHasActiveContract.mockResolvedValue(false);

      await expect(
        service.createOutbound(ORG_ID, createDto as any, ACTOR_ID, 'vi'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ───────────────────────────────────────────────────────────
  // APPROVE INBOUND
  // ───────────────────────────────────────────────────────────
  describe('approveInbound', () => {
    it('should throw NotFoundException when receipt does not exist', async () => {
      repository.findInboundById.mockResolvedValue(null);

      await expect(
        service.approveInbound(ORG_ID, 'receipt-1', ACTOR_ID, 'vi'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when receipt is not PENDING', async () => {
      repository.findInboundById.mockResolvedValue(
        mockInboundReceipt({ status: ReceiptStatus.APPROVED }),
      );

      await expect(
        service.approveInbound(ORG_ID, 'receipt-1', ACTOR_ID, 'vi'),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ───────────────────────────────────────────────────────────
  // REJECT INBOUND
  // ───────────────────────────────────────────────────────────
  describe('rejectInbound', () => {
    it('should throw NotFoundException when receipt does not exist', async () => {
      repository.findInboundById.mockResolvedValue(null);

      await expect(
        service.rejectInbound(ORG_ID, 'receipt-1', ACTOR_ID, 'vi'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ───────────────────────────────────────────────────────────
  // START RECEIVING (APPROVED → RECEIVING)
  // ───────────────────────────────────────────────────────────
  describe('startReceiving', () => {
    it('should throw NotFoundException when receipt does not exist', async () => {
      prisma.receipt.findFirst.mockResolvedValue(null);

      await expect(
        service.startReceiving(ORG_ID, 'receipt-1', ACTOR_ID, 'vi'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when receipt is not APPROVED', async () => {
      prisma.receipt.findFirst.mockResolvedValue(
        mockInboundReceipt({ status: ReceiptStatus.PENDING }),
      );

      await expect(
        service.startReceiving(ORG_ID, 'receipt-1', ACTOR_ID, 'vi'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should transition APPROVED → RECEIVING', async () => {
      const receipt = mockInboundReceipt({ status: ReceiptStatus.APPROVED });
      prisma.receipt.findFirst.mockResolvedValue(receipt);
      prisma.receipt.update.mockResolvedValue({
        ...receipt,
        status: ReceiptStatus.RECEIVING,
      });

      const result = await service.startReceiving(ORG_ID, 'receipt-1', ACTOR_ID, 'vi');

      expect(prisma.receipt.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'receipt-1' },
          data: expect.objectContaining({
            status: ReceiptStatus.RECEIVING,
          }),
        }),
      );
    });
  });

  // ───────────────────────────────────────────────────────────
  // CONFIRM RECEIVING (RECEIVING → PROCESSING)
  // ───────────────────────────────────────────────────────────
  describe('confirmReceiving', () => {
    it('should throw NotFoundException when receipt does not exist', async () => {
      prisma.receipt.findFirst.mockResolvedValue(null);

      await expect(
        service.confirmReceiving(ORG_ID, 'receipt-1', ACTOR_ID, 'vi', {
          details: [{ detail_id: 'detail-1', actual_qty: 100 }],
        } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when status is not RECEIVING', async () => {
      prisma.receipt.findFirst.mockResolvedValue(
        mockInboundReceipt({ status: ReceiptStatus.PENDING }),
      );

      await expect(
        service.confirmReceiving(ORG_ID, 'receipt-1', ACTOR_ID, 'vi', {
          details: [{ detail_id: 'detail-1', actual_qty: 100 }],
        } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ───────────────────────────────────────────────────────────
  // CONFIRM PUTAWAY (inbound final step)
  // ───────────────────────────────────────────────────────────
  describe('confirmPutaway', () => {
    it('should throw NotFoundException when receipt does not exist', async () => {
      prisma.receipt.findFirst.mockResolvedValue(null);

      await expect(
        service.confirmPutaway(ORG_ID, 'receipt-1', ACTOR_ID, 'vi', {
          details: [],
        } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ───────────────────────────────────────────────────────────
  // APPROVE OUTBOUND
  // ───────────────────────────────────────────────────────────
  describe('approveOutbound', () => {
    it('should throw NotFoundException when export does not exist', async () => {
      repository.findOutboundById.mockResolvedValue(null);

      await expect(
        service.approveOutbound(ORG_ID, 'export-1', ACTOR_ID, 'vi'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ───────────────────────────────────────────────────────────
  // REJECT OUTBOUND
  // ───────────────────────────────────────────────────────────
  describe('rejectOutbound', () => {
    it('should throw NotFoundException when export does not exist', async () => {
      repository.findOutboundById.mockResolvedValue(null);

      await expect(
        service.rejectOutbound(ORG_ID, 'export-1', ACTOR_ID, 'vi'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ───────────────────────────────────────────────────────────
  // LIST ORG WAREHOUSES
  // ───────────────────────────────────────────────────────────
  describe('listOrgWarehouses', () => {
    it('should return warehouse list', async () => {
      const result = await service.listOrgWarehouses(ORG_ID);
      expect(result).toEqual([{ id: WAREHOUSE_ID, name: 'Kho A' }]);
    });

    it('should attempt lazy backfill when no warehouses found', async () => {
      repository.listOrgWarehouses
        .mockResolvedValueOnce([]) // First: empty
        .mockResolvedValueOnce([{ id: 'wh-new', name: 'Kho mới' }]); // After backfill

      prisma.rentalContractDetail.findMany.mockResolvedValue([]); // No contracts to backfill

      const result = await service.listOrgWarehouses(ORG_ID);
      // Since no contracts to backfill and no details, returns empty
      expect(repository.listOrgWarehouses).toHaveBeenCalledWith(ORG_ID);
    });
  });

  // ───────────────────────────────────────────────────────────
  // CONFIRM PICKING (outbound)
  // ───────────────────────────────────────────────────────────
  describe('confirmPicking', () => {
    it('should throw NotFoundException when export does not exist', async () => {
      prisma.export.findFirst.mockResolvedValue(null);

      await expect(
        service.confirmPicking(ORG_ID, 'export-1', ACTOR_ID, 'vi', {
          details: [],
        } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ───────────────────────────────────────────────────────────
  // CONFIRM CHECKING (outbound)
  // ───────────────────────────────────────────────────────────
  describe('confirmChecking', () => {
    it('should throw NotFoundException when export does not exist', async () => {
      prisma.export.findFirst.mockResolvedValue(null);

      await expect(
        service.confirmChecking(ORG_ID, 'export-1', ACTOR_ID, 'vi', {
          details: [],
        } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ───────────────────────────────────────────────────────────
  // COMPLETE SHIPMENT (outbound final step)
  // ───────────────────────────────────────────────────────────
  describe('completeShipment', () => {
    it('should throw NotFoundException when export does not exist', async () => {
      prisma.export.findFirst.mockResolvedValue(null);

      await expect(
        service.completeShipment(ORG_ID, 'export-1', ACTOR_ID, 'vi', {} as any),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
