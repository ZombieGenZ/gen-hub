import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
} from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { ConfigService } from '@nestjs/config';
import { RefundStatus } from '@prisma/client';

import { RefundRequestRepository } from './refund-request.repository';
import {
    QueryRefundRequestDto,
    AcceptRefundRequestDto,
    RejectRefundRequestDto,
    ChangeRefundStatusDto,
} from './dto';
import {
    IRefundRequestWithRelations,
    IPaginatedRefundRequestResponse,
    IRefundRequestStatusChangeResult,
} from './interfaces';
import { RedisService } from '../redis/redis.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { SystemLogService } from '../system-log/system-log.service';
import { OrganizationAuditLogService } from '../organization/organization-audit-log.service';
import { OrganizationRepository } from '../organization/organization.repository';
import { OrganizationBalanceService } from '../organization-balance/organization-balance.service';
import { CreateRefundRequestDto } from '../org-refund-request/dto';

/**
 * Service xử lý business logic cho RefundRequest
 */
@Injectable()
export class RefundRequestService {
    private readonly CACHE_TTL: number;
    private readonly LIST_CACHE_TTL: number;
    private readonly CACHE_PREFIX = 'refund-request';

    constructor(
        private readonly repository: RefundRequestRepository,
        private readonly organizationRepository: OrganizationRepository,
        private readonly redisService: RedisService,
        private readonly websocketGateway: WebsocketGateway,
        private readonly systemLogService: SystemLogService,
        private readonly auditLogService: OrganizationAuditLogService,
        private readonly configService: ConfigService,
        private readonly i18n: I18nService,
        private readonly balanceService: OrganizationBalanceService,
    ) {
        this.CACHE_TTL = this.configService.get<number>('REDIS_REFUND_REQUEST_CACHE_TTL') || 300;
        this.LIST_CACHE_TTL = this.configService.get<number>('REDIS_REFUND_REQUEST_LIST_CACHE_TTL') || 60;
    }

    /**
     * Kiểm tra quyền organization
     */
    private async checkOrgPermission(
        orgId: string,
        userId: string,
        permissionKey: string,
        lang: string,
    ): Promise<void> {
        const org = await this.organizationRepository.findById(orgId);
        if (!org) {
            throw new NotFoundException(
                await this.i18n.translate('organization.errors.not_found', { lang }),
            );
        }

        // Owner có full quyền
        if (userId === org.owner_id || userId === org.owner?.id) {
            return;
        }

        // Kiểm tra member và permission
        const member = await this.organizationRepository.findMemberByUserAndOrg(userId, orgId);
        if (!member || !member.is_accepted) {
            throw new ForbiddenException(
                await this.i18n.translate('refund-request.errors.no_permission', { lang }),
            );
        }

        const hasDirectPermission = member.permissions?.some(
            (p) => p.permission.key === permissionKey,
        );
        if (!hasDirectPermission) {
            throw new ForbiddenException(
                await this.i18n.translate('refund-request.errors.no_permission', { lang }),
            );
        }
    }

    /**
     * Lấy danh sách tất cả yêu cầu hoàn tiền (Admin)
     */
    async findMany(
        query: QueryRefundRequestDto,
        userId: string,
        lang: string,
    ): Promise<IPaginatedRefundRequestResponse> {
        const cacheKey = this.getListCacheKey(query);
        const cached = await this.redisService.get(cacheKey);

        if (cached) {
            try {
                return JSON.parse(cached);
            } catch {
                // Cache không hợp lệ
            }
        }

        const result = await this.repository.findMany(query);

        await this.redisService.set(cacheKey, JSON.stringify(result), this.LIST_CACHE_TTL);

        return result;
    }

    /**
     * Lấy chi tiết yêu cầu hoàn tiền theo ID (Admin)
     */
    async findById(
        id: string,
        userId: string,
        lang: string,
    ): Promise<IRefundRequestWithRelations> {
        const cacheKey = this.getCacheKey(id);
        const cached = await this.redisService.get(cacheKey);

        if (cached) {
            try {
                return JSON.parse(cached);
            } catch {
                // Cache không hợp lệ
            }
        }

        const refundRequest = await this.repository.findById(id);
        if (!refundRequest) {
            throw new NotFoundException(
                this.i18n.t('refund-request.errors.not_found', { lang }),
            );
        }

        await this.redisService.set(cacheKey, JSON.stringify(refundRequest), this.CACHE_TTL);

        return refundRequest;
    }

    /**
     * Duyệt yêu cầu hoàn tiền
     */
    async accept(
        id: string,
        dto: AcceptRefundRequestDto,
        userId: string,
        lang: string,
    ): Promise<IRefundRequestWithRelations> {
        const existing = await this.repository.findById(id);
        if (!existing) {
            throw new NotFoundException(
                this.i18n.t('refund-request.errors.not_found', { lang }),
            );
        }

        // Chỉ PENDING mới có thể accept
        if (existing.status !== RefundStatus.PENDING) {
            throw new BadRequestException(
                this.i18n.t('refund-request.errors.invalid_status_for_accept', { lang }),
            );
        }

        const result = await this.repository.updateStatus(
            id,
            RefundStatus.APPROVED,
            userId,
            dto.process_notes,
            {
                fee_percent: dto.fee_percent,
                fee_amount: dto.fee_amount,
                final_refund_amount: dto.final_refund_amount,
            }
        );

        // Cộng tiền vào tài khoản
        await this.balanceService.processRefund(
            existing.organization_id,
            Number(dto.final_refund_amount),
            id,
            `Hoàn tiền cho hợp đồng ${existing.rental_contract_id}`,
            userId
        );

        // Invalidate cache
        await this.invalidateCache(id);
        await this.invalidateListCache();

        // Ghi SystemLog
        this.systemLogService.info(
            'refund-request',
            'accept',
            `Accepted refund request: ${id}`,
            { userId, metaData: { refundRequestId: id, contractId: existing.rental_contract_id } },
        );

        // Ghi Audit log
        this.auditLogService.logUpdate(
            existing.organization_id,
            'refund_request',
            id,
            { status: existing.status } as Record<string, unknown>,
            { status: RefundStatus.APPROVED, process_notes: dto.process_notes } as Record<string, unknown>,
            { userId, description: `Accepted refund request` },
        );

        // Emit socket
        this.websocketGateway.emitToOrganization(existing.organization_id, 'refundRequest:accepted', {
            id,
            status: RefundStatus.APPROVED,
            processedBy: userId,
            timestamp: new Date().toISOString(),
        });

        return result;
    }

    /**
     * Từ chối yêu cầu hoàn tiền
     */
    async reject(
        id: string,
        dto: RejectRefundRequestDto,
        userId: string,
        lang: string,
    ): Promise<IRefundRequestWithRelations> {
        const existing = await this.repository.findById(id);
        if (!existing) {
            throw new NotFoundException(
                this.i18n.t('refund-request.errors.not_found', { lang }),
            );
        }

        // Chỉ PENDING mới có thể reject
        if (existing.status !== RefundStatus.PENDING) {
            throw new BadRequestException(
                this.i18n.t('refund-request.errors.invalid_status_for_reject', { lang }),
            );
        }

        const processNotes = dto.process_notes
            ? `${dto.reject_reason}\n---\n${dto.process_notes}`
            : dto.reject_reason;

        const result = await this.repository.updateStatus(
            id,
            RefundStatus.REJECTED,
            userId,
            processNotes,
        );

        // Invalidate cache
        await this.invalidateCache(id);
        await this.invalidateListCache();

        // Ghi SystemLog
        this.systemLogService.info(
            'refund-request',
            'reject',
            `Rejected refund request: ${id}`,
            { userId, metaData: { refundRequestId: id, reason: dto.reject_reason } },
        );

        // Ghi Audit log
        this.auditLogService.logUpdate(
            existing.organization_id,
            'refund_request',
            id,
            { status: existing.status } as Record<string, unknown>,
            { status: RefundStatus.REJECTED, reject_reason: dto.reject_reason } as Record<string, unknown>,
            { userId, description: `Rejected refund request: ${dto.reject_reason}` },
        );

        // Emit socket
        this.websocketGateway.emitToOrganization(existing.organization_id, 'refundRequest:rejected', {
            id,
            status: RefundStatus.REJECTED,
            rejectReason: dto.reject_reason,
            processedBy: userId,
            timestamp: new Date().toISOString(),
        });

        return result;
    }

    /**
     * Thay đổi trạng thái (sau khi đã accept/reject)
     */
    async changeStatus(
        id: string,
        dto: ChangeRefundStatusDto,
        userId: string,
        lang: string,
    ): Promise<IRefundRequestStatusChangeResult> {
        const existing = await this.repository.findById(id);
        if (!existing) {
            throw new NotFoundException(
                this.i18n.t('refund-request.errors.not_found', { lang }),
            );
        }

        // Không cho đổi từ COMPLETED
        if (existing.status === RefundStatus.COMPLETED) {
            throw new BadRequestException(
                this.i18n.t('refund-request.errors.cannot_change_completed', { lang }),
            );
        }

        // Không cho đổi sang cùng trạng thái
        if (existing.status === dto.new_status) {
            throw new BadRequestException(
                this.i18n.t('refund-request.errors.same_status', { lang }),
            );
        }

        const oldStatus = existing.status;
        const processNotes = dto.change_reason
            ? `Thay đổi từ ${oldStatus} sang ${dto.new_status}: ${dto.change_reason}${dto.process_notes ? '\n---\n' + dto.process_notes : ''}`
            : dto.process_notes;

        await this.repository.updateStatus(id, dto.new_status, userId, processNotes);

        // Invalidate cache
        await this.invalidateCache(id);
        await this.invalidateListCache();

        // Ghi SystemLog
        this.systemLogService.info(
            'refund-request',
            'change_status',
            `Changed refund request status: ${id} from ${oldStatus} to ${dto.new_status}`,
            { userId, metaData: { refundRequestId: id, oldStatus, newStatus: dto.new_status } },
        );

        // Ghi Audit log
        this.auditLogService.logUpdate(
            existing.organization_id,
            'refund_request',
            id,
            { status: oldStatus } as Record<string, unknown>,
            { status: dto.new_status, change_reason: dto.change_reason } as Record<string, unknown>,
            { userId, description: `Changed refund request status from ${oldStatus} to ${dto.new_status}` },
        );

        // Emit socket
        this.websocketGateway.emitToOrganization(existing.organization_id, 'refundRequest:statusChanged', {
            id,
            oldStatus,
            newStatus: dto.new_status,
            changedBy: userId,
            timestamp: new Date().toISOString(),
        });

        return {
            id,
            old_status: oldStatus,
            new_status: dto.new_status,
            processed_by: userId,
            processed_at: new Date(),
        };
    }

    /**
     * Xóa mềm yêu cầu hoàn tiền
     */
    async delete(id: string, userId: string, lang: string): Promise<void> {
        const existing = await this.repository.findById(id);
        if (!existing) {
            throw new NotFoundException(
                this.i18n.t('refund-request.errors.not_found', { lang }),
            );
        }

        await this.repository.softDelete(id, userId);

        // Invalidate cache
        await this.invalidateCache(id);
        await this.invalidateListCache();

        // Ghi SystemLog
        this.systemLogService.info(
            'refund-request',
            'delete',
            `Deleted refund request: ${id}`,
            { userId, metaData: { refundRequestId: id } },
        );

        // Ghi Audit log
        this.auditLogService.logDelete(
            existing.organization_id,
            'refund_request',
            id,
            { status: existing.status } as Record<string, unknown>,
            { userId, description: `Deleted refund request` },
        );

        // Emit socket
        this.websocketGateway.emitToOrganization(existing.organization_id, 'refundRequest:deleted', {
            id,
            deletedBy: userId,
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * Lấy danh sách yêu cầu hoàn tiền của tổ chức (Org level)
     */
    async findByOrganization(
        query: QueryRefundRequestDto,
        userId: string,
        organizationId: string,
        lang: string,
    ): Promise<IPaginatedRefundRequestResponse> {
        await this.checkOrgPermission(organizationId, userId, 'refund-request.list', lang);

        const cacheKey = this.getListCacheKey({ ...query, organization_id: organizationId });
        const cached = await this.redisService.get(cacheKey);

        if (cached) {
            try {
                return JSON.parse(cached);
            } catch {
                // Cache không hợp lệ
            }
        }

        const result = await this.repository.findByOrganization(organizationId, query);

        await this.redisService.set(cacheKey, JSON.stringify(result), this.LIST_CACHE_TTL);

        return result;
    }

    /**
     * Lấy chi tiết yêu cầu hoàn tiền của tổ chức (Org level)
     */
    async findByIdByOrg(
        id: string,
        userId: string,
        organizationId: string,
        lang: string,
    ): Promise<IRefundRequestWithRelations> {
        const refundRequest = await this.repository.findById(id);
        if (!refundRequest) {
            throw new NotFoundException(
                this.i18n.t('refund-request.errors.not_found', { lang }),
            );
        }

        // Kiểm tra thuộc org
        if (refundRequest.organization_id !== organizationId) {
            throw new ForbiddenException(
                this.i18n.t('refund-request.errors.no_permission', { lang }),
            );
        }

        await this.checkOrgPermission(organizationId, userId, 'refund-request.read', lang);

        return refundRequest;
    }

    // --- TẠO MỚI TỪ ORGANIZATION ---

    /**
     * Khách hàng tạo yêu cầu hoàn tiền
     */
    async createByOrganization(
        organizationId: string,
        userId: string,
        dto: CreateRefundRequestDto,
        lang: string,
    ): Promise<IRefundRequestWithRelations> {
        await this.checkOrgPermission(organizationId, userId, 'refund-request.create', lang);

        // Kiểm tra xem đã có request PENDING nào chưa thì tốt nhưng tạm thời tạo luôn
        const result = await this.repository.create({
            rental_contract_id: dto.rental_contract_id,
            organization_id: organizationId,
            original_amount: dto.original_amount,
            fee_percent: dto.fee_percent,
            fee_amount: dto.fee_amount,
            final_refund_amount: dto.final_refund_amount,
            reason: dto.reason,
            created_by: userId,
        });

        await this.invalidateListCache();

        // Ghi Audit log
        this.auditLogService.logCreate(
            organizationId,
            'refund_request',
            result.id,
            { status: RefundStatus.PENDING, reason: dto.reason } as Record<string, unknown>,
            { userId, description: `Created refund request for contract ${dto.rental_contract_id}` },
        );

        // Emit socket
        this.websocketGateway.emitToOrganization(organizationId, 'refundRequest:created', {
            id: result.id,
            contractId: dto.rental_contract_id,
            status: RefundStatus.PENDING,
            timestamp: new Date().toISOString(),
        });

        return result;
    }

    // --- Cache Helper Methods ---

    private getCacheKey(id: string): string {
        return `${this.CACHE_PREFIX}:${id}`;
    }

    private getListCacheKey(query: QueryRefundRequestDto | Record<string, unknown>): string {
        const queryString = JSON.stringify(query);
        return `${this.CACHE_PREFIX}:list:${Buffer.from(queryString).toString('base64')}`;
    }

    private async invalidateCache(id: string): Promise<void> {
        await this.redisService.del(this.getCacheKey(id));
    }

    private async invalidateListCache(): Promise<void> {
        const pattern = `${this.CACHE_PREFIX}:list:*`;
        await this.redisService.delByPattern(pattern);
    }
}
