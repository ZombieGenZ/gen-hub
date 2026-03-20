import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ExecutionContext } from '@nestjs/common';
import request = require('supertest');
import { WarehouseVisitController } from '../src/modules/warehouse-visit/warehouse-visit.controller';
import { WarehouseVisitService } from '../src/modules/warehouse-visit/warehouse-visit.service';
import { WarehouseVisitRepository } from '../src/modules/warehouse-visit/warehouse-visit.repository';
import { PrismaService } from '../src/prisma/prisma.service';
import { WebsocketGateway } from '../src/modules/websocket/websocket.gateway';
import { EmailService } from '../src/modules/notification/email.service';
import { RedisService } from '../src/modules/redis/redis.service';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { PermissionGuard } from '../src/common/guards/permission.guard';
import { I18nService } from 'nestjs-i18n';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';

describe('WarehouseVisitController (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  const mockPrismaService = {
    warehouseVisitBooking: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findFirst: jest.fn().mockResolvedValue({ 
        id: 'test-user-id',
        system_permissions: [],
        system_roles: []
      }),
    },
    contactConversation: {
      findFirst: jest.fn(),
    },
    contactMessage: {
      create: jest.fn(),
    },
  };

  const mockWebsocketGateway = {
    emitWarehouseVisitCreated: jest.fn(),
    emitContactMessageCreated: jest.fn(),
  };

  const mockRedisService = {
    getWarehouseVisitListCacheKey: jest.fn().mockReturnValue('mock-key'),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    getWarehouseVisitCache: jest.fn().mockResolvedValue(null),
    setWarehouseVisitCache: jest.fn().mockResolvedValue('OK'),
    delByPattern: jest.fn().mockResolvedValue(1),
    invalidateWarehouseVisitCache: jest.fn().mockResolvedValue(1),
  };

  const mockEmailService = {
    sendVisitBookingApprovedEmail: jest.fn().mockResolvedValue(true),
    sendVisitBookingRejectedEmail: jest.fn().mockResolvedValue(true),
  };

  const mockI18nService = {
    translate: jest.fn().mockReturnValue('Mock Translation'),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue: any) => defaultValue),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [WarehouseVisitController],
      providers: [
        WarehouseVisitService,
        WarehouseVisitRepository,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: WebsocketGateway, useValue: mockWebsocketGateway },
        { provide: EmailService, useValue: mockEmailService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: I18nService, useValue: mockI18nService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest();
          req.user = { id: 'test-user-id' };
          return true;
        },
      })
      .overrideGuard(PermissionGuard)
      .useValue({
        canActivate: () => true, // Bypass permissions for e2e
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prismaService = app.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Conflict creating a new booking', () => {
    it('should return 409 Conflict when overlapping visit exists', async () => {
      // Mock an existing overlap from 09:00 to 10:00
      mockPrismaService.warehouseVisitBooking.findMany.mockResolvedValue([
        { visit_time_start: '09:00', visit_time_end: '10:00' },
      ]);

      const createDto = {
        warehouse_template_id: randomUUID(),
        visitor_name: 'Test Visitor',
        visitor_email: 'test@example.com',
        visitor_phone: '0123456789',
        visit_date: '2026-03-20',
        visit_time_start: '09:30', // Overlaps
        visit_time_end: '10:30',
        purpose: 'RENTAL_INQUIRY',
        number_of_visitors: 1,
      };

      const response = await request(app.getHttpServer())
        .post('/warehouse-visit')
        .send(createDto)
        .expect(409);

      expect(response.body.message).toContain('Ôi tiếc quá, khung giờ');
      expect(response.body.conflict).toBeDefined();
      expect(response.body.suggestions).toBeDefined();
    });
  });

  describe('Conflict rescheduling an existing booking', () => {
    it('should return 409 Conflict when rescheduling to an overlapping visit', async () => {
      const existingId = randomUUID();
      const warehouseTemplateId = randomUUID();

      // Mock finding the old booking
      mockPrismaService.warehouseVisitBooking.findUnique.mockResolvedValue({
        id: existingId,
        warehouse_template_id: warehouseTemplateId,
        visitor_name: 'Test Visitor',
        visitor_email: 'test@example.com',
        visit_date: new Date('2026-03-20'),
        visit_time_start: '09:00',
        visit_time_end: '10:00',
        status: 'PENDING',
        created_by: 'test-user-id',
      });

      // Mock an existing overlap from 14:00 to 15:00
      mockPrismaService.warehouseVisitBooking.findMany.mockResolvedValue([
        { visit_time_start: '14:00', visit_time_end: '15:00' },
      ]);

      const rescheduleDto = {
        visit_date: '2026-03-21',
        visit_time_start: '14:30', // Overlaps
        visit_time_end: '15:30',
        reason: 'Conflict test',
      };

      const response = await request(app.getHttpServer())
        .post(`/warehouse-visit/${existingId}/reschedule`)
        .send(rescheduleDto)
        .expect(409);

      expect(response.body.message).toContain('Ôi tiếc quá, khung giờ');
      expect(response.body.suggestions).toBeDefined();
    });
  });

  describe('Push message flow when booking is CONFIRMED', () => {
    it('should push Live Chat message (with phone fallback) when approved', async () => {
      const existingId = randomUUID();
      
      const oldBooking = {
        id: existingId,
        status: 'PENDING',
        visitor_name: 'Test Visitor',
        visitor_email: 'test@notfound.com',
        visitor_phone: '0123456789',
        visit_date: new Date('2026-03-20'),
        visit_time_start: '09:00',
        visit_time_end: '10:00',
        code: 'VISIT-1234',
        created_by: 'test-user-id',
      };

      mockPrismaService.warehouseVisitBooking.findUnique.mockResolvedValue(oldBooking);
      
      mockPrismaService.warehouseVisitBooking.update.mockResolvedValue({
        ...oldBooking,
        status: 'CONFIRMED',
      });

      mockPrismaService.contactConversation.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'conv-id-123',
          session_id: 'session-id-456',
        });

      mockPrismaService.contactMessage.create.mockResolvedValue({
        id: 'msg-id-789',
        content: 'Ting ting! Lịch hẹn thăm kho...',
        created_at: new Date(),
      });

      const approveDto = {
        action: 'APPROVE',
        confirmation_notes: 'Confirmed by Admin',
      };

      await request(app.getHttpServer())
        .patch(`/warehouse-visit/${existingId}/approve`)
        .send(approveDto)
        .expect(200);

      expect(mockEmailService.sendVisitBookingApprovedEmail).toHaveBeenCalled();

      expect(mockPrismaService.contactMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            conversation_id: 'conv-id-123',
            content: expect.stringContaining('Ting ting!'),
          }),
        }),
      );

      expect(mockWebsocketGateway.emitContactMessageCreated).toHaveBeenCalledWith(
        'conv-id-123',
        expect.any(Object),
        'session-id-456',
      );
    });
  });
});
