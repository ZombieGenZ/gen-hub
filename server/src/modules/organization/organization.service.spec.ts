import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import {
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { OrganizationRepository } from './organization.repository';
import { RedisService } from '../redis/redis.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { SystemLogService } from '../system-log/system-log.service';
import { OrganizationAuditLogService } from './organization-audit-log.service';
import { EmailService } from '../notification/email.service';
import { CipherService } from '../../common/services/cipher.service';

// ─── Mock helpers ──────────────────────────────────────────────
const USER_ID = 'owner-1';
const ORG_ID = 'org-1';

const mockOrg = (overrides: Record<string, any> = {}) => ({
  id: ORG_ID,
  name: 'Công ty TNHH Test',
  international_name: 'Test Company LLC',
  tax_code: '0123456789',
  headquarters_address: 'HCM',
  representative_name: 'Nguyen Van A',
  representative_title: 'CEO',
  representative_phone: '0901234567',
  representative_email: 'ceo@test.com',
  is_active: true,
  is_deleted: false,
  owner_id: USER_ID,
  owner: { id: USER_ID, name: 'Owner', email: 'owner@test.com' },
  is_using_google_email: false,
  google_client_id: null,
  google_client_secret: null,
  google_refresh_token: null,
  email_primary_address: null,
  gmail_pubsub_topic: null,
  gmail_pubsub_subscription: null,
  gmail_webhook_secret: null,
  api_key_logs_retention_ms: null,
  org_audit_logs_retention_ms: null,
  min_loss_tolerance: null,
  max_loss_tolerance: null,
  created_by: USER_ID,
  created_at: new Date(),
  ...overrides,
});

const mockMember = (overrides: Record<string, any> = {}) => ({
  id: 'member-1',
  organization_id: ORG_ID,
  user_id: 'member-user-1',
  is_accepted: true,
  is_active: true,
  invite_token: null,
  display_name: 'Member One',
  created_by: USER_ID,
  ...overrides,
});

// ─── Mock factories ────────────────────────────────────────────
const createMockRepository = () => ({
  findById: jest.fn(),
  findByIds: jest.fn(),
  findByTaxCode: jest.fn(),
  findMany: jest.fn(),
  create: jest.fn(),
  createMember: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn(),
  softDeleteMany: jest.fn(),
  softDeleteAllMembersByOrgId: jest.fn(),
  softDeleteAllMembersByOrgIds: jest.fn(),
  softDeleteAllRolesByOrgId: jest.fn(),
  softDeleteAllRolesByOrgIds: jest.fn(),
  softDeleteAllApiKeysByOrgId: jest.fn(),
  softDeleteAllApiKeysByOrgIds: jest.fn(),
  findMemberByUserAndOrg: jest.fn(),
  findUserByEmail: jest.fn(),
  findUserById: jest.fn(),
  removeMember: jest.fn(),
  updateMember: jest.fn(),
  listRolePermissions: jest.fn().mockResolvedValue([]),
  listMemberPermissions: jest.fn().mockResolvedValue([]),
});

const createMockRedis = () => ({
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(undefined),
  getOrganizationCache: jest.fn().mockResolvedValue(null),
  setOrganizationCache: jest.fn().mockResolvedValue(undefined),
  invalidateAllOrganizationCache: jest.fn().mockResolvedValue(undefined),
  invalidateOrganizationListCache: jest.fn().mockResolvedValue(undefined),
  getOrganizationListCacheKey: jest.fn().mockReturnValue('org:list:key'),
  getOrganizationListCache: jest.fn().mockResolvedValue(null),
  setOrganizationListCache: jest.fn().mockResolvedValue(undefined),
});

const createMockWebsocket = () => ({
  emitOrganizationCreated: jest.fn(),
  emitOrganizationUpdated: jest.fn(),
  emitOrganizationDeleted: jest.fn(),
  emitOrganizationsDeletedMany: jest.fn(),
  emitOwnershipTransferred: jest.fn(),
  emitMemberInvited: jest.fn(),
  server: { to: jest.fn().mockReturnValue({ emit: jest.fn() }) },
});

const createMockI18n = () => ({
  t: jest.fn((key: string) => Promise.resolve(key)),
  translate: jest.fn((key: string) => Promise.resolve(key)),
});

const createMockCipher = () => ({
  encrypt: jest.fn((val: string) => `enc:${val}`),
  decrypt: jest.fn((val: string) => val.replace('enc:', '')),
});

// ─── Test Suite ────────────────────────────────────────────────
describe('OrganizationService', () => {
  let service: OrganizationService;
  let repository: ReturnType<typeof createMockRepository>;
  let redisService: ReturnType<typeof createMockRedis>;
  let websocketGateway: ReturnType<typeof createMockWebsocket>;

  beforeEach(async () => {
    repository = createMockRepository();
    redisService = createMockRedis();
    websocketGateway = createMockWebsocket();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationService,
        { provide: OrganizationRepository, useValue: repository },
        { provide: RedisService, useValue: redisService },
        { provide: WebsocketGateway, useValue: websocketGateway },
        {
          provide: SystemLogService,
          useValue: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
        },
        {
          provide: OrganizationAuditLogService,
          useValue: {
            logCreate: jest.fn(),
            logUpdate: jest.fn(),
            logDelete: jest.fn(),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendOrganizationInviteEmail: jest.fn().mockResolvedValue(undefined),
          },
        },
        { provide: I18nService, useFactory: createMockI18n },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: CipherService, useFactory: createMockCipher },
      ],
    }).compile();

    service = module.get<OrganizationService>(OrganizationService);
  });

  // ───────────────────────────────────────────────────────────
  // CREATE
  // ───────────────────────────────────────────────────────────
  describe('create', () => {
    it('should throw ConflictException when tax code already exists', async () => {
      repository.findByTaxCode.mockResolvedValue(mockOrg());

      await expect(
        service.create(
          { tax_code: '0123456789', representative_name: 'A' } as any,
          USER_ID,
          'vi',
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ───────────────────────────────────────────────────────────
  // FIND BY ID
  // ───────────────────────────────────────────────────────────
  describe('findById', () => {
    it('should return org from cache if available', async () => {
      redisService.getOrganizationCache.mockResolvedValue(mockOrg());

      const result = await service.findById(ORG_ID, 'vi', USER_ID);

      expect(result).toBeDefined();
      expect(result.id).toBe(ORG_ID);
      expect(repository.findById).not.toHaveBeenCalled();
    });

    it('should fetch from DB and cache on cache miss', async () => {
      redisService.getOrganizationCache.mockResolvedValue(null);
      repository.findById.mockResolvedValue(mockOrg());

      const result = await service.findById(ORG_ID, 'vi', USER_ID);

      expect(result).toBeDefined();
      expect(redisService.setOrganizationCache).toHaveBeenCalled();
    });

    it('should throw NotFoundException when org does not exist', async () => {
      redisService.getOrganizationCache.mockResolvedValue(null);
      repository.findById.mockResolvedValue(null);

      await expect(service.findById(ORG_ID, 'vi')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if user is not owner/member and no admin permission', async () => {
      const org = mockOrg({ owner_id: 'other-user' });
      redisService.getOrganizationCache.mockResolvedValue(null);
      repository.findById.mockResolvedValue(org);
      repository.findMemberByUserAndOrg.mockResolvedValue(null);

      await expect(
        service.findById(ORG_ID, 'vi', 'stranger-user', false),
      ).rejects.toThrow(NotFoundException);
    });

    it('should allow access with readAll permission', async () => {
      const org = mockOrg({ owner_id: 'other-user' });
      redisService.getOrganizationCache.mockResolvedValue(null);
      repository.findById.mockResolvedValue(org);

      const result = await service.findById(
        ORG_ID,
        'vi',
        'stranger-user',
        true,
      );
      expect(result).toBeDefined();
    });
  });

  // ───────────────────────────────────────────────────────────
  // UPDATE
  // ───────────────────────────────────────────────────────────
  describe('update', () => {
    it('should update org when called by owner', async () => {
      repository.findById.mockResolvedValue(mockOrg());
      repository.update.mockResolvedValue(mockOrg({ name: 'Updated Name' }));

      const result = await service.update(
        ORG_ID,
        { representative_phone: '0909999999' } as any,
        USER_ID,
        'vi',
      );

      expect(result).toBeDefined();
      expect(redisService.invalidateAllOrganizationCache).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when non-owner tries to update', async () => {
      repository.findById.mockResolvedValue(mockOrg());

      await expect(
        service.update(
          ORG_ID,
          { representative_phone: '0909999999' } as any,
          'another-user',
          'vi',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when non-admin tries to toggle is_active', async () => {
      repository.findById.mockResolvedValue(mockOrg());

      await expect(
        service.update(
          ORG_ID,
          { is_active: false } as any,
          USER_ID,
          'vi',
          false,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow admin to toggle is_active', async () => {
      repository.findById.mockResolvedValue(mockOrg());
      repository.update.mockResolvedValue(mockOrg({ is_active: false }));

      const result = await service.update(
        ORG_ID,
        { is_active: false } as any,
        'admin-user',
        'vi',
        true, // hasUpdateAllPermission
      );

      expect(result).toBeDefined();
    });
  });

  // ───────────────────────────────────────────────────────────
  // DELETE
  // ───────────────────────────────────────────────────────────
  describe('delete', () => {
    it('should throw ForbiddenException when non-owner tries to delete', async () => {
      redisService.getOrganizationCache.mockResolvedValue(mockOrg());

      await expect(
        service.delete(ORG_ID, 'another-user', 'vi'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should soft delete all related resources', async () => {
      redisService.getOrganizationCache.mockResolvedValue(mockOrg());

      await service.delete(ORG_ID, USER_ID, 'vi');

      expect(repository.softDeleteAllMembersByOrgId).toHaveBeenCalledWith(
        ORG_ID,
        USER_ID,
      );
      expect(repository.softDeleteAllRolesByOrgId).toHaveBeenCalledWith(ORG_ID);
      expect(repository.softDeleteAllApiKeysByOrgId).toHaveBeenCalledWith(
        ORG_ID,
      );
      expect(repository.softDelete).toHaveBeenCalledWith(ORG_ID, USER_ID);
      expect(redisService.invalidateAllOrganizationCache).toHaveBeenCalled();
    });
  });

  // ───────────────────────────────────────────────────────────
  // TRANSFER OWNERSHIP
  // ───────────────────────────────────────────────────────────
  describe('transferOwnership', () => {
    it('should throw ForbiddenException when non-owner calls', async () => {
      redisService.getOrganizationCache.mockResolvedValue(mockOrg());

      await expect(
        service.transferOwnership(
          ORG_ID,
          { new_owner_email: 'new@test.com' } as any,
          'another-user',
          'vi',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when new owner email not found', async () => {
      redisService.getOrganizationCache.mockResolvedValue(mockOrg());
      repository.findUserByEmail.mockResolvedValue(null);

      await expect(
        service.transferOwnership(
          ORG_ID,
          { new_owner_email: 'nonexistent@test.com' } as any,
          USER_ID,
          'vi',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when transferring to self', async () => {
      redisService.getOrganizationCache.mockResolvedValue(mockOrg());
      repository.findUserByEmail.mockResolvedValue({
        id: USER_ID,
        email: 'owner@test.com',
      });

      await expect(
        service.transferOwnership(
          ORG_ID,
          { new_owner_email: 'owner@test.com' } as any,
          USER_ID,
          'vi',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when new owner is not a member', async () => {
      redisService.getOrganizationCache.mockResolvedValue(mockOrg());
      repository.findUserByEmail.mockResolvedValue({
        id: 'new-owner-1',
        email: 'new@test.com',
      });
      repository.findMemberByUserAndOrg.mockResolvedValue(null);

      await expect(
        service.transferOwnership(
          ORG_ID,
          { new_owner_email: 'new@test.com' } as any,
          USER_ID,
          'vi',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should successfully transfer ownership', async () => {
      redisService.getOrganizationCache.mockResolvedValue(mockOrg());
      repository.findUserByEmail.mockResolvedValue({
        id: 'new-owner-1',
        email: 'new@test.com',
      });
      repository.findMemberByUserAndOrg.mockResolvedValue(
        mockMember({ user_id: 'new-owner-1', is_accepted: true }),
      );
      repository.update.mockResolvedValue(mockOrg({ owner_id: 'new-owner-1' }));

      const result = await service.transferOwnership(
        ORG_ID,
        { new_owner_email: 'new@test.com' } as any,
        USER_ID,
        'vi',
      );

      expect(result).toBeDefined();
      expect(websocketGateway.emitOwnershipTransferred).toHaveBeenCalledWith(
        USER_ID,
        'new-owner-1',
        expect.any(Object),
      );
    });
  });

  // ───────────────────────────────────────────────────────────
  // INVITE MEMBER
  // ───────────────────────────────────────────────────────────
  describe('inviteMember', () => {
    beforeEach(() => {
      // findById needs to work for inviteMember
      redisService.getOrganizationCache.mockResolvedValue(mockOrg());
      repository.findUserById.mockResolvedValue({
        id: USER_ID,
        name: 'Owner',
        email: 'owner@test.com',
      });
    });

    it('should skip users that are already members', async () => {
      repository.findUserByEmail.mockResolvedValue({
        id: 'existing',
        email: 'existing@test.com',
        name: 'Existing',
      });
      repository.findMemberByUserAndOrg.mockResolvedValue(
        mockMember({ is_accepted: true }),
      );
      // Mock checkOrgPermission to pass (owner)
      repository.listRolePermissions.mockResolvedValue([]);
      repository.listMemberPermissions.mockResolvedValue([]);

      // All emails are already members → service throws NotFoundException
      await expect(
        service.inviteMember(
          ORG_ID,
          { emails: ['existing@test.com'] } as any,
          USER_ID,
          'vi',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ───────────────────────────────────────────────────────────
  // DELETE MANY
  // ───────────────────────────────────────────────────────────
  describe('deleteMany', () => {
    it('should throw NotFoundException when no orgs found', async () => {
      repository.findByIds.mockResolvedValue([]);

      await expect(
        service.deleteMany(['org-1', 'org-2'], USER_ID, 'vi'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when non-owner tries to bulk delete', async () => {
      repository.findByIds.mockResolvedValue([
        mockOrg({
          id: 'org-1',
          owner_id: 'other-user',
          owner: { id: 'other-user', name: 'Other', email: 'other@test.com' },
        }),
      ]);

      await expect(
        service.deleteMany(['org-1'], USER_ID, 'vi'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ───────────────────────────────────────────────────────────
  // FIND MANY
  // ───────────────────────────────────────────────────────────
  describe('findMany', () => {
    it('should return cached list if available', async () => {
      const cachedData = { items: [mockOrg()], total: 1, page: 1, limit: 10 };
      redisService.getOrganizationListCache.mockResolvedValue(cachedData);

      const result = await service.findMany({} as any, USER_ID);

      expect(result).toEqual(cachedData);
      expect(repository.findMany).not.toHaveBeenCalled();
    });

    it('should query DB and cache on cache miss', async () => {
      const dbData = { items: [mockOrg()], total: 1, page: 1, limit: 10 };
      redisService.getOrganizationListCache.mockResolvedValue(null);
      repository.findMany.mockResolvedValue(dbData);

      const result = await service.findMany({} as any, USER_ID);

      expect(result.items).toHaveLength(1);
      expect(redisService.setOrganizationListCache).toHaveBeenCalled();
    });

    it('should not filter by userId when hasListAllPermission', async () => {
      redisService.getOrganizationListCache.mockResolvedValue(null);
      repository.findMany.mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 10,
      });

      await service.findMany({} as any, USER_ID, true);

      expect(repository.findMany).toHaveBeenCalledWith(
        expect.any(Object),
        undefined, // userId should be undefined for admin
      );
    });
  });
});
