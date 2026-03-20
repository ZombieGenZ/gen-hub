import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { OrganizationUpdateRequestRepository } from './organization-update-request.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrganizationUpdateRequestDto, QueryOrganizationUpdateRequestDto, RejectOrganizationUpdateRequestDto } from './dto';
import { OrganizationUpdateRequestStatus } from '@prisma/client';
import { SystemLogService } from '../system-log/system-log.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { OrganizationService } from '../organization/organization.service';
import { RedisService } from '../redis/redis.service';
import { OrganizationUpdateRequestCacheKeys } from './constants/cache-keys.helper';
import { UserNotificationService } from '../user-notification/user-notification.service';


@Injectable()
export class OrganizationUpdateRequestService {
    constructor(
        private readonly repository: OrganizationUpdateRequestRepository,
        private readonly prisma: PrismaService,
        private readonly i18n: I18nService,
        private readonly systemLogService: SystemLogService,
        private readonly websocketGateway: WebsocketGateway,
        private readonly organizationService: OrganizationService,
        private readonly redisService: RedisService,
        private readonly cacheKeys: OrganizationUpdateRequestCacheKeys,
        private readonly userNotificationService: UserNotificationService,
    ) { }


    async create(userId: string, organizationId: string, dto: CreateOrganizationUpdateRequestDto, lang: string) {
        // Validate organization exists
        const org = await this.organizationService.findById(organizationId, lang);

        // Check organization-level permission: organization.update_request
        // Check if user is member and has permission
        // Assuming organizationService.checkOrgPermission checks (orgId, userId, permissionKey, ownerId)
        await this.organizationService.checkOrgPermission(
            organizationId,
            userId,
            'organization.update_request',
            org.owner_id,
            lang,
        );

        // Check if there is already a PENDING request for this org?
        // Maybe allow multiple? Ideally one pending per org to avoid conflicts.
        const pendingRequest = await this.prisma.organizationUpdateRequest.findFirst({
            where: {
                organization_id: organizationId,
                status: OrganizationUpdateRequestStatus.PENDING,
                is_deleted: false,
            },
        });

        if (pendingRequest) {
            throw new BadRequestException(
                await this.i18n.translate('organization.errors.request_already_pending', { lang }),
            );
        }

        const request = await this.repository.create({
            ...dto,
            organization: { connect: { id: organizationId } },
            requester: { connect: { id: userId } },
            status: OrganizationUpdateRequestStatus.PENDING,
            created_by: userId,
        });

        // Log
        await this.systemLogService.info(
            'organization-update-request',
            'create',
            `User ${userId} requested update for org ${organizationId}`,
            { metaData: { requestId: request.id, organizationId: organizationId } },
        );

        // Emit Socket to Admin (Assuming there is an admin room or specific admins listening)
        // For now, maybe just system notification or handled by frontend polling/admin panel logic
        // But requirement said "socket.io for realtime updates".
        this.websocketGateway.server.to('admin_room').emit('organization_update_request_created', request);

        // Invalidate list cache
        await this.redisService.delByPattern(this.cacheKeys.allList());

        return request;
    }


    async findAll(query: QueryOrganizationUpdateRequestDto) {
        const cacheKey = this.cacheKeys.list(query as unknown as Record<string, unknown>);

        // Using any because findMany returns object with data and meta, but I need to define return type properly if possible.
        // Assuming findMany returns standard pagination response.
        const cached = await this.redisService.getJson<any>(cacheKey);
        if (cached) return cached;

        const result = await this.repository.findMany(query);
        await this.redisService.setJson(cacheKey, result, this.cacheKeys.ttlList);

        return result;
    }


    async findOne(id: string, lang: string) {
        const cacheKey = this.cacheKeys.item(id);
        const cached = await this.redisService.getJson<any>(cacheKey);
        if (cached) return cached;

        const request = await this.repository.findById(id);
        if (!request) {
            throw new NotFoundException(
                await this.i18n.translate('organization.errors.request_not_found', { lang }),
            );
        }

        await this.redisService.setJson(cacheKey, request, this.cacheKeys.ttlItem);
        return request;
    }


    async approve(id: string, userId: string, lang: string) {
        const request = await this.repository.findById(id);
        if (!request) {
            throw new NotFoundException(
                await this.i18n.translate('organization.errors.request_not_found', { lang }),
            );
        }

        if (request.status !== OrganizationUpdateRequestStatus.PENDING) {
            throw new BadRequestException(
                await this.i18n.translate('organization.errors.request_not_pending', { lang }),
            );
        }

        // Update Organization
        // Using updateAllPermission=true because this is an administrative action
        const updatedOrg = await this.organizationService.update(
            request.organization_id,
            {
                tax_code: request.tax_code ?? undefined,
                representative_name: request.representative_name ?? undefined,
                representative_title: request.representative_title ?? undefined,
                representative_phone: request.representative_phone ?? undefined,
                representative_email: request.representative_email ?? undefined,
            } as any, // Bypass UpdateOrganizationDto strict checking
            userId,
            lang,
            true // hasUpdateAllPermission
        );

        // Update Request Status
        const updatedRequest = await this.repository.update(id, {
            status: OrganizationUpdateRequestStatus.APPROVED,
            updated_by: userId,
            updated_at: new Date(),
        });

        // Log
        await this.systemLogService.info(
            'organization-update-request',
            'approve',
            `Request ${id} approved by ${userId}`,
            { metaData: { requestId: id, organizationId: request.organization_id } },
        );

        // Emit Socket
        this.websocketGateway.emitOrganizationUpdated(request.organization_id, updatedOrg); // Emit updated Org
        // Also notify requester/org members
        this.websocketGateway.server.to(`org_${request.organization_id}`).emit('organization_update_request_approved', updatedRequest);

        // Notify requester directly so they can see the result immediately in notification center.
        await this.userNotificationService.sendNotification(
            {
                user_id: request.requester_id,
                title: 'Yêu cầu cập nhật đã được duyệt',
                content: 'Yêu cầu cập nhật thông tin pháp lý của bạn đã được duyệt thành công.',
                type: 'SUCCESS',
            },
            userId,
            lang,
        );

        // Invalidate cache
        await this.redisService.del(this.cacheKeys.item(id));
        await this.redisService.delByPattern(this.cacheKeys.allList());

        return updatedRequest;
    }


    async reject(id: string, userId: string, dto: RejectOrganizationUpdateRequestDto, lang: string) {
        const request = await this.repository.findById(id);
        if (!request) {
            throw new NotFoundException(
                await this.i18n.translate('organization.errors.request_not_found', { lang }),
            );
        }

        if (request.status !== OrganizationUpdateRequestStatus.PENDING) {
            throw new BadRequestException(
                await this.i18n.translate('organization.errors.request_not_pending', { lang }),
            );
        }

        const updatedRequest = await this.repository.update(id, {
            status: OrganizationUpdateRequestStatus.REJECTED,
            reject_reason: dto.reject_reason,
            updated_by: userId,
            updated_at: new Date(),
        });

        // Log
        await this.systemLogService.info(
            'organization-update-request',
            'reject',
            `Request ${id} rejected by ${userId}`,
            { metaData: { requestId: id, organizationId: request.organization_id } },
        );

        // Emit Socket
        this.websocketGateway.server.to(`org_${request.organization_id}`).emit('organization_update_request_rejected', updatedRequest);

        await this.userNotificationService.sendNotification(
            {
                user_id: request.requester_id,
                title: 'Yêu cầu cập nhật bị từ chối',
                content: `Yêu cầu cập nhật thông tin pháp lý của bạn đã bị từ chối. Lý do: ${dto.reject_reason}`,
                type: 'WARNING',
            },
            userId,
            lang,
        );

        // Invalidate cache
        await this.redisService.del(this.cacheKeys.item(id));
        await this.redisService.delByPattern(this.cacheKeys.allList());

        return updatedRequest;
    }

}
