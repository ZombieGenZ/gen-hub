import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { Prisma } from '@prisma/client';
const Decimal = Prisma.Decimal;
type Decimal = Prisma.Decimal;
import { v4 as uuidv4 } from 'uuid';

import { WarehouseTemplateRepository } from './warehouse-template.repository';
import {
    CreateWarehouseTemplateDto,
    UpdateWarehouseTemplateDto,
    QueryWarehouseTemplateDto,
    UpsertLayoutDto,
    LayoutRowDto,
    LayoutRackDto,
    LayoutShelfDto,
    LayoutBlockDto,
} from './dto';
import {
    IWarehouseTemplateWithRelations,
    IPaginatedResponse,
} from './interfaces';
import { RedisService } from '../redis/redis.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { SystemLogService } from '../system-log/system-log.service';
import { ImageUploadService, ImageUploadResult } from '../../common/services/image-upload.service';

// Giới hạn số lượng ảnh tối đa
const MAX_IMAGES_PER_TEMPLATE = 10;

/**
 * Service xử lý business logic cho WarehouseTemplate
 */
@Injectable()
export class WarehouseTemplateService {
    constructor(
        private readonly repository: WarehouseTemplateRepository,
        private readonly redisService: RedisService,
        private readonly websocketGateway: WebsocketGateway,
        private readonly systemLogService: SystemLogService,
        private readonly i18n: I18nService,
        private readonly imageUploadService: ImageUploadService,
    ) { }

    /**
     * Tạo mới WarehouseTemplate
     */
    async create(
        dto: CreateWarehouseTemplateDto,
        userId: string,
        lang: string,
    ): Promise<IWarehouseTemplateWithRelations> {
        // Chuẩn bị discount configs data nếu có
        const discountConfigsCreate = dto.discount_configs?.length
            ? this.prepareDiscountConfigsCreate(dto.discount_configs, userId)
            : undefined;

        const template = await this.repository.create({
            name: dto.name,
            description: dto.description,
            length: dto.length,
            width: dto.width,
            is_shared_warehouse: dto.is_shared_warehouse ?? false,
            price_per_month: new Decimal(dto.price_per_month),
            address_detail: dto.address_detail,
            ward: dto.ward_id ? { connect: { id: dto.ward_id } } : undefined,
            latitude: dto.latitude ? new Decimal(dto.latitude) : undefined,
            longitude: dto.longitude ? new Decimal(dto.longitude) : undefined,
            block_length: new Decimal(dto.block_length),
            block_width: new Decimal(dto.block_width),
            is_active: dto.is_active ?? true,
            created_by: userId,
            // Nested create discount configs
            discount_configs: discountConfigsCreate,
            addon_gifts: this.prepareAddonGiftsCreate(dto.addon_gifts, userId),
            insurance_gifts: this.prepareInsuranceGiftsCreate(dto.insurance_gifts, userId),
        });

        // Invalidate list cache
        await this.redisService.invalidateWarehouseTemplateListCache();

        // Log
        this.systemLogService.info('warehouse-template', 'create', `Created warehouse template: ${template.name}`, {
            userId,
            metaData: { templateId: template.id, name: template.name },
        });

        // Emit WebSocket event
        this.websocketGateway.emitWarehouseTemplateCreated(template.id, template.name, userId);

        return template;
    }

    /**
     * Chuẩn bị data để nested create discount configs
     * - De-dupe theo duration_tier_id
     */
    private prepareDiscountConfigsCreate(configs: CreateWarehouseTemplateDto['discount_configs'], userId: string) {
        if (!configs || configs.length === 0) return undefined;

        // De-dupe: giữ config cuối cùng nếu trùng duration_tier_id
        const uniqueMap = new Map<string, typeof configs[0]>();
        for (const config of configs) {
            uniqueMap.set(config.duration_tier_id, config);
        }

        const uniqueConfigs = Array.from(uniqueMap.values());

        return {
            create: uniqueConfigs.map(config => ({
                duration_tier: { connect: { id: config.duration_tier_id } },
                discount_percent: new Decimal(config.discount_percent),
                is_active: config.is_active ?? true,
                created_by: userId,
            })),
        };
    }

    /**
     * Prepare addon gifts for creation
     */
    private prepareAddonGiftsCreate(gifts: CreateWarehouseTemplateDto['addon_gifts'], userId: string) {
        if (!gifts || gifts.length === 0) return undefined;

        // De-dupe by addon_id
        const uniqueMap = new Map<string, typeof gifts[0]>();
        for (const gift of gifts) {
            uniqueMap.set(gift.addon_id, gift);
        }
        const uniqueGifts = Array.from(uniqueMap.values());

        return {
            create: uniqueGifts.map(gift => ({
                addon: { connect: { id: gift.addon_id } },
                // condition fields removed
                is_until_service_end: gift.is_until_service_end ?? true,
                gift_duration_value: gift.gift_duration_value,
                gift_duration_unit: gift.gift_duration_unit,
                is_active: gift.is_active ?? true,
                created_by: userId,
            })),
        };
    }

    /**
     * Prepare insurance gifts for creation
     */
    private prepareInsuranceGiftsCreate(gifts: CreateWarehouseTemplateDto['insurance_gifts'], userId: string) {
        if (!gifts || gifts.length === 0) return undefined;

        // De-dupe by insurance_id
        const uniqueMap = new Map<string, typeof gifts[0]>();
        for (const gift of gifts) {
            uniqueMap.set(gift.insurance_id, gift);
        }
        const uniqueGifts = Array.from(uniqueMap.values());

        return {
            create: uniqueGifts.map(gift => ({
                insurance: { connect: { id: gift.insurance_id } },
                is_until_service_end: gift.is_until_service_end ?? true,
                gift_duration_value: gift.gift_duration_value,
                gift_duration_unit: gift.gift_duration_unit,
                is_active: gift.is_active ?? true,
                created_by: userId,
            })),
        };
    }

    /**
     * Lấy danh sách WarehouseTemplate
     */
    async findMany(
        query: QueryWarehouseTemplateDto,
    ): Promise<IPaginatedResponse<IWarehouseTemplateWithRelations>> {
        // Tạo cache key dựa trên query params
        const queryParams: Record<string, unknown> = {
            limit: query.limit,
            offset: query.offset,
            keywords: query.keywords,
            is_active: query.is_active,
            rental_status: query.rental_status,
            province_id: query.province_id,
        };
        const cacheKey = this.redisService.getWarehouseTemplateListCacheKey(queryParams);

        // Kiểm tra cache
        const cached = await this.redisService.getWarehouseTemplateListCache<
            IPaginatedResponse<IWarehouseTemplateWithRelations>
        >(cacheKey);

        if (cached) {
            return cached;
        }

        const result = await this.repository.findMany(query);

        // Cache kết quả
        await this.redisService.setWarehouseTemplateListCache(cacheKey, result);

        return result;
    }

    /**
     * Lấy chi tiết WarehouseTemplate theo ID
     * Nếu không có quyền list.all, chỉ trả về template is_active = true
     */
    async findById(id: string, lang: string, hasListAllPermission: boolean = false): Promise<IWarehouseTemplateWithRelations> {
        // Kiểm tra cache
        const cached = await this.redisService.getWarehouseTemplateCache<IWarehouseTemplateWithRelations>(id);
        if (cached) {
            // Nếu không có quyền list.all và template không active, trả về not found
            if (!hasListAllPermission && !cached.is_active) {
                throw new NotFoundException(
                    this.i18n.t('warehouse-template.errors.not_found', { lang }),
                );
            }
            return cached;
        }

        const template = await this.repository.findById(id);
        if (!template) {
            throw new NotFoundException(
                this.i18n.t('warehouse-template.errors.not_found', { lang }),
            );
        }

        // Nếu không có quyền list.all và template không active, trả về not found
        if (!hasListAllPermission && !template.is_active) {
            throw new NotFoundException(
                this.i18n.t('warehouse-template.errors.not_found', { lang }),
            );
        }

        // Cache kết quả
        await this.redisService.setWarehouseTemplateCache(id, template);

        return template;
    }

    /**
     * Cập nhật WarehouseTemplate
     */
    async update(
        id: string,
        dto: UpdateWarehouseTemplateDto,
        userId: string,
        lang: string,
    ): Promise<IWarehouseTemplateWithRelations> {
        const existing = await this.repository.findById(id);
        if (!existing) {
            throw new NotFoundException(
                this.i18n.t('warehouse-template.errors.not_found', { lang }),
            );
        }

        const updatedFields = Object.keys(dto);

        // Destructure ward_id và discount_configs để xử lý riêng
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { ward_id, discount_configs, amenity_ids, addon_gifts, insurance_gifts, ...restDto } = dto;

        // Xử lý discount configs upsert nếu có (trước khi update template)
        if (discount_configs !== undefined) {
            await this.upsertDiscountConfigs(id, discount_configs, existing.discount_configs || [], userId);
        }

        if (dto.addon_gifts !== undefined) {
            await this.upsertAddonGifts(id, dto.addon_gifts, existing.addon_gifts || [], userId);
        }

        if (dto.insurance_gifts !== undefined) {
            await this.upsertInsuranceGifts(id, dto.insurance_gifts, existing.insurance_gifts || [], userId);
        }

        // Update template với các trường cơ bản
        await this.repository.update(id, {
            ...restDto,
            price_per_month: dto.price_per_month !== undefined ? new Decimal(dto.price_per_month) : undefined,
            latitude: dto.latitude !== undefined ? new Decimal(dto.latitude) : undefined,
            longitude: dto.longitude !== undefined ? new Decimal(dto.longitude) : undefined,
            block_length: dto.block_length !== undefined ? new Decimal(dto.block_length) : undefined,
            block_width: dto.block_width !== undefined ? new Decimal(dto.block_width) : undefined,
            ward: ward_id ? { connect: { id: ward_id } } : undefined,
            updated_by: userId,
        });

        // Invalidate caches
        await Promise.all([
            this.redisService.invalidateWarehouseTemplateCache(id),
            this.redisService.invalidateWarehouseTemplateListCache(),
        ]);

        // Fetch lại template với đầy đủ relations để trả về format giống create và findMany
        const updatedTemplate = await this.repository.findById(id);

        // Log
        this.systemLogService.info('warehouse-template', 'update', `Updated warehouse template: ${updatedTemplate!.name}`, {
            userId,
            metaData: { templateId: id, updatedFields },
        });

        // Emit WebSocket event
        this.websocketGateway.emitWarehouseTemplateUpdated(id, updatedTemplate!.name, updatedFields, userId);

        return updatedTemplate!;
    }

    /**
     * Upsert discount configs cho warehouse template
     * - Configs có id trong request VÀ tồn tại trong DB → update
     * - Configs không có id HOẶC id không tồn tại trong DB → create (với de-dupe)
     * - Configs hiện có nhưng không trong request → soft delete
     */
    private async upsertDiscountConfigs(
        templateId: string,
        newConfigs: UpdateWarehouseTemplateDto['discount_configs'],
        existingConfigs: Array<{ id: string; duration_tier_id: string }>,
        userId: string,
    ): Promise<void> {
        if (!newConfigs) return;

        // Build set các existing config IDs để validate
        const existingConfigIds = new Set(existingConfigs.map(c => c.id));

        const requestConfigIds = new Set<string>();
        const configsToCreate: Array<{ duration_tier_id: string; discount_percent: number; is_active?: boolean }> = [];
        const configsToUpdate: Array<{ id: string; data: { discount_percent?: Decimal; is_active?: boolean; updated_by?: string } }> = [];

        // De-dupe theo duration_tier_id (giữ config cuối cùng nếu trùng)
        const uniqueMap = new Map<string, {
            id?: string;
            duration_tier_id: string;
            discount_percent: number;
            is_active?: boolean;
        }>();

        for (const config of newConfigs) {
            uniqueMap.set(config.duration_tier_id, config);
        }
        const uniqueConfigs = Array.from(uniqueMap.values());

        for (const config of uniqueConfigs) {
            // Chỉ update nếu config có ID VÀ ID đó tồn tại trong existingConfigs
            if (config.id && existingConfigIds.has(config.id)) {
                // Update existing config
                requestConfigIds.add(config.id);
                configsToUpdate.push({
                    id: config.id,
                    data: {
                        discount_percent: new Decimal(config.discount_percent),
                        is_active: config.is_active,
                        updated_by: userId,
                    },
                });
            } else {
                // Create new config (nếu không có ID hoặc ID không tồn tại trong DB)
                configsToCreate.push({
                    duration_tier_id: config.duration_tier_id,
                    discount_percent: config.discount_percent,
                    is_active: config.is_active,
                });
            }
        }

        // Tìm configs cần soft delete (hiện có nhưng không trong request)
        const configIdsToDelete = existingConfigs
            .filter(c => !requestConfigIds.has(c.id))
            .map(c => c.id);

        // Execute upsert operations
        await this.repository.upsertDiscountConfigs(
            templateId,
            configsToCreate.map(c => ({
                ...c,
                discount_percent: new Decimal(c.discount_percent),
                is_active: c.is_active ?? true,
                created_by: userId,
            })),
            configsToUpdate,
            configIdsToDelete,
            userId,
        );
    }

    /**
     * Upsert addon gifts for warehouse template
     */
    /**
     * Upsert addon gifts for warehouse template
     */
    private async upsertAddonGifts(
        templateId: string,
        newGifts: UpdateWarehouseTemplateDto['addon_gifts'],
        existingGifts: Array<{ id: string; addon_id: string }>,
        userId: string,
    ): Promise<void> {
        if (!newGifts) return;

        const existingGiftIds = new Set(existingGifts.map(g => g.id));
        const requestGiftIds = new Set<string>();

        const giftsToCreate: Prisma.WarehouseAddonGiftCreateManyInput[] = [];
        const giftsToUpdate: Array<{ id: string; data: Prisma.WarehouseAddonGiftUpdateInput }> = [];

        // De-dupe by addon_id
        const uniqueMap = new Map<string, typeof newGifts[0]>();
        for (const gift of newGifts) {
            uniqueMap.set(gift.addon_id, gift);
        }
        const uniqueGifts = Array.from(uniqueMap.values());

        for (const gift of uniqueGifts) {
            if (gift.id && existingGiftIds.has(gift.id)) {
                // Update
                requestGiftIds.add(gift.id);
                giftsToUpdate.push({
                    id: gift.id,
                    data: {
                        addon: { connect: { id: gift.addon_id } },
                        // conditions removed
                        is_until_service_end: gift.is_until_service_end,
                        gift_duration_value: gift.gift_duration_value,
                        gift_duration_unit: gift.gift_duration_unit,
                        is_active: gift.is_active,
                        updated_by: userId,
                    },
                });
            } else {
                // Create
                giftsToCreate.push({
                    warehouse_template_id: templateId,
                    addon_id: gift.addon_id,
                    // conditions removed
                    is_until_service_end: gift.is_until_service_end ?? true,
                    gift_duration_value: gift.gift_duration_value,
                    gift_duration_unit: gift.gift_duration_unit,
                    is_active: gift.is_active ?? true,
                    created_by: userId,
                });
            }
        }

        // Delete missing
        const giftIdsToDelete = existingGifts
            .filter(g => !requestGiftIds.has(g.id))
            .map(g => g.id);

        await this.repository.upsertAddonGifts(
            templateId,
            giftsToCreate,
            giftsToUpdate,
            giftIdsToDelete,
            userId,
        );
    }

    /**
     * Upsert insurance gifts for warehouse template
     */
    private async upsertInsuranceGifts(
        templateId: string,
        newGifts: UpdateWarehouseTemplateDto['insurance_gifts'],
        existingGifts: Array<{ id: string; insurance_id: string }>,
        userId: string,
    ): Promise<void> {
        if (!newGifts) return;

        const existingGiftIds = new Set(existingGifts.map(g => g.id));
        const requestGiftIds = new Set<string>();

        const giftsToCreate: Prisma.WarehouseInsuranceGiftCreateManyInput[] = [];
        const giftsToUpdate: Array<{ id: string; data: Prisma.WarehouseInsuranceGiftUpdateInput }> = [];

        // De-dupe by insurance_id
        const uniqueMap = new Map<string, typeof newGifts[0]>();
        for (const gift of newGifts) {
            uniqueMap.set(gift.insurance_id, gift);
        }
        const uniqueGifts = Array.from(uniqueMap.values());

        for (const gift of uniqueGifts) {
            if (gift.id && existingGiftIds.has(gift.id)) {
                // Update
                requestGiftIds.add(gift.id);
                giftsToUpdate.push({
                    id: gift.id,
                    data: {
                        insurance: { connect: { id: gift.insurance_id } },
                        is_until_service_end: gift.is_until_service_end,
                        gift_duration_value: gift.gift_duration_value,
                        gift_duration_unit: gift.gift_duration_unit,
                        is_active: gift.is_active,
                        updated_by: userId,
                    },
                });
            } else {
                // Create
                giftsToCreate.push({
                    warehouse_template_id: templateId,
                    insurance_id: gift.insurance_id,
                    is_until_service_end: gift.is_until_service_end ?? true,
                    gift_duration_value: gift.gift_duration_value,
                    gift_duration_unit: gift.gift_duration_unit,
                    is_active: gift.is_active ?? true,
                    created_by: userId,
                });
            }
        }

        // Delete missing
        const giftIdsToDelete = existingGifts
            .filter(g => !requestGiftIds.has(g.id))
            .map(g => g.id);

        await this.repository.upsertInsuranceGifts(
            templateId,
            giftsToCreate,
            giftsToUpdate,
            giftIdsToDelete,
            userId,
        );
    }

    /**
     * Upsert discount configs cho row template
     * - Configs có id trong request VÀ tồn tại trong DB → update
     * - Configs không có id HOẶC id không tồn tại trong DB → create (với de-dupe)
     * - Configs hiện có nhưng không trong request → soft delete
     */
    private async upsertRowDiscountConfigs(
        rowId: string,
        newConfigs: Array<{ id?: string; duration_tier_id: string; discount_percent: number; is_active?: boolean }>,
        existingConfigs: Array<{ id: string; duration_tier_id: string }>,
        userId: string,
    ): Promise<void> {
        if (!newConfigs || newConfigs.length === 0) return;

        // Build set các existing config IDs để validate
        const existingConfigIds = new Set(existingConfigs.map(c => c.id));

        const requestConfigIds = new Set<string>();
        const configsToCreate: Array<{ duration_tier_id: string; discount_percent: number; is_active?: boolean }> = [];
        const configsToUpdate: Array<{ id: string; data: { discount_percent?: Decimal; is_active?: boolean; updated_by?: string } }> = [];

        // De-dupe theo duration_tier_id (giữ config cuối cùng nếu trùng)
        const uniqueMap = new Map<string, {
            id?: string;
            duration_tier_id: string;
            discount_percent: number;
            is_active?: boolean;
        }>();

        for (const config of newConfigs) {
            uniqueMap.set(config.duration_tier_id, config);
        }
        const uniqueConfigs = Array.from(uniqueMap.values());

        for (const config of uniqueConfigs) {
            // Chỉ update nếu config có ID VÀ ID đó tồn tại trong existingConfigs
            if (config.id && existingConfigIds.has(config.id)) {
                // Update existing config
                requestConfigIds.add(config.id);
                configsToUpdate.push({
                    id: config.id,
                    data: {
                        discount_percent: new Decimal(config.discount_percent),
                        is_active: config.is_active,
                        updated_by: userId,
                    },
                });
            } else {
                // Create new config (nếu không có ID hoặc ID không tồn tại trong DB)
                configsToCreate.push({
                    duration_tier_id: config.duration_tier_id,
                    discount_percent: config.discount_percent,
                    is_active: config.is_active,
                });
            }
        }

        // Tìm configs cần soft delete (hiện có nhưng không trong request)
        const configIdsToDelete = existingConfigs
            .filter(c => !requestConfigIds.has(c.id))
            .map(c => c.id);

        // Execute upsert operations
        await this.repository.upsertRowDiscountConfigs(
            rowId,
            configsToCreate.map(c => ({
                ...c,
                discount_percent: new Decimal(c.discount_percent),
                is_active: c.is_active ?? true,
                created_by: userId,
            })),
            configsToUpdate,
            configIdsToDelete,
            userId,
        );
    }

    /**
     * Xóa mềm WarehouseTemplate
     */
    async delete(id: string, userId: string, lang: string): Promise<void> {
        const existing = await this.repository.findById(id);
        if (!existing) {
            throw new NotFoundException(
                this.i18n.t('warehouse-template.errors.not_found', { lang }),
            );
        }

        await this.repository.softDelete(id, userId);

        // Invalidate caches
        await this.redisService.invalidateWarehouseTemplateCache(id);
        await this.redisService.invalidateWarehouseTemplateListCache();

        // Log
        this.systemLogService.info('warehouse-template', 'delete', `Deleted warehouse template: ${existing.name}`, {
            userId,
            metaData: { templateId: id, name: existing.name },
        });

        // Emit WebSocket event
        this.websocketGateway.emitWarehouseTemplateDeleted(id, existing.name, userId);
    }

    /**
     * Xóa nhiều WarehouseTemplate
     */
    async deleteMany(ids: string[], userId: string, lang: string): Promise<void> {
        const templates = await this.repository.findByIds(ids);
        if (templates.length === 0) {
            throw new NotFoundException(
                this.i18n.t('warehouse-template.errors.not_found', { lang }),
            );
        }

        await this.repository.softDeleteMany(ids, userId);

        // Invalidate caches
        await Promise.all(ids.map(id => this.redisService.invalidateWarehouseTemplateCache(id)));
        await this.redisService.invalidateWarehouseTemplateListCache();

        // Log
        this.systemLogService.info('warehouse-template', 'delete_many', `Deleted ${templates.length} warehouse templates`, {
            userId,
            metaData: { ids, names: templates.map(t => t.name) },
        });

        // Emit WebSocket events
        this.websocketGateway.server.emit('warehouseTemplate:deletedMany', {
            ids,
            deletedBy: userId,
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * Cập nhật layout (rows, racks, shelves, blocks) - Auto-detect deletions và restore
     * Logic: Items không gửi = xóa, items có ID đã xóa nhưng gửi lại = restore
     */
    async upsertLayout(
        templateId: string,
        dto: UpsertLayoutDto,
        userId: string,
        lang: string,
    ): Promise<IWarehouseTemplateWithRelations> {
        const existing = await this.repository.findById(templateId);
        if (!existing) {
            throw new NotFoundException(
                this.i18n.t('warehouse-template.errors.not_found', { lang }),
            );
        }

        // Validate racks không được overlap trong cùng một row
        this.validateRacksNoOverlap(dto.rows, lang);

        // Validate tọa độ không vượt quá giới hạn warehouse (length x width)
        const warehouseLength = Number(existing.length);
        const warehouseWidth = Number(existing.width);
        this.validateLayoutBounds(dto.rows, warehouseLength, warehouseWidth, lang);

        const summary = {
            rowsCreated: 0, rowsUpdated: 0, rowsDeleted: 0, rowsRestored: 0,
            racksCreated: 0, racksUpdated: 0, racksDeleted: 0, racksRestored: 0,
            shelvesCreated: 0, shelvesUpdated: 0, shelvesDeleted: 0, shelvesRestored: 0,
            blocksCreated: 0, blocksUpdated: 0, blocksDeleted: 0, blocksRestored: 0,
        };

        // Lấy tất cả existing data (bao gồm cả đã xóa)
        const allExistingRows = await this.repository.findAllRowsByTemplateId(templateId, true);

        // Build lookup maps và collect existing active IDs
        const existingRowMap = new Map(allExistingRows.map(r => [r.id, r]));
        const existingRackMap = new Map<string, { id: string; is_deleted: boolean | null; row_id: string }>();
        const existingShelfMap = new Map<string, { id: string; is_deleted: boolean | null; rack_id: string }>();
        const existingBlockMap = new Map<string, { id: string; is_deleted: boolean | null; shelf_id: string }>();

        // Collect active existing IDs - dùng để detect deletions
        const activeRowIds = new Set<string>();
        const activeRackIds = new Set<string>();
        const activeShelfIds = new Set<string>();
        const activeBlockIds = new Set<string>();

        for (const row of allExistingRows) {
            if (!row.is_deleted) activeRowIds.add(row.id);
            for (const rack of row.racks || []) {
                existingRackMap.set(rack.id, { id: rack.id, is_deleted: rack.is_deleted, row_id: row.id });
                if (!rack.is_deleted) activeRackIds.add(rack.id);
                for (const shelf of rack.shelves || []) {
                    existingShelfMap.set(shelf.id, { id: shelf.id, is_deleted: shelf.is_deleted, rack_id: rack.id });
                    if (!shelf.is_deleted) activeShelfIds.add(shelf.id);
                    for (const block of shelf.blocks || []) {
                        existingBlockMap.set(block.id, { id: block.id, is_deleted: block.is_deleted, shelf_id: shelf.id });
                        if (!block.is_deleted) activeBlockIds.add(block.id);
                    }
                }
            }
        }

        // Collect incoming IDs
        const incomingRowIds = new Set<string>();
        const incomingRackIds = new Set<string>();
        const incomingShelfIds = new Set<string>();
        const incomingBlockIds = new Set<string>();

        // Operations - sử dụng Set cho delete IDs để O(1) dedup
        const rowIdsToDelete = new Set<string>();
        const rackIdsToDelete = new Set<string>();
        const shelfIdsToDelete = new Set<string>();
        const blockIdsToDelete = new Set<string>();

        const operations = {
            rowsToCreate: [] as Prisma.RowTemplateCreateManyInput[],
            rowsToUpdate: [] as { id: string; data: Prisma.RowTemplateUpdateInput }[],
            rowIdsToRestore: [] as string[],
            racksToCreate: [] as Prisma.RackTemplateCreateManyInput[],
            racksToUpdate: [] as { id: string; data: Prisma.RackTemplateUpdateInput }[],
            rackIdsToRestore: [] as string[],
            shelvesToCreate: [] as Prisma.ShelfTemplateCreateManyInput[],
            shelvesToUpdate: [] as { id: string; data: Prisma.ShelfTemplateUpdateInput }[],
            shelfIdsToRestore: [] as string[],
            blocksToCreate: [] as Prisma.BlockTemplateCreateManyInput[],
            blocksToUpdate: [] as { id: string; data: Prisma.BlockTemplateUpdateInput }[],
            blockIdsToRestore: [] as string[],
        };

        // Process incoming rows
        for (const row of dto.rows) {
            if (row.id) {
                incomingRowIds.add(row.id);
                const existingRow = existingRowMap.get(row.id);
                if (existingRow) {
                    if (existingRow.is_deleted) {
                        operations.rowIdsToRestore.push(row.id);
                        summary.rowsRestored++;
                    }
                    operations.rowsToUpdate.push({ id: row.id, data: this.buildRowUpdateData(row, userId) });
                    summary.rowsUpdated++;
                }
                if (row.racks) {
                    this.processIncomingRacks(row.id, row.racks, userId, operations, summary, existingRackMap, existingShelfMap, existingBlockMap, incomingRackIds, incomingShelfIds, incomingBlockIds);
                }
            } else {
                const newRowId = uuidv4();
                operations.rowsToCreate.push({ id: newRowId, warehouse_template_id: templateId, ...this.buildRowCreateDataFlat(row, userId) });
                summary.rowsCreated++;
                if (row.racks) {
                    this.processIncomingRacks(newRowId, row.racks, userId, operations, summary, existingRackMap, existingShelfMap, existingBlockMap, incomingRackIds, incomingShelfIds, incomingBlockIds);
                }
            }
        }

        // Auto-detect deletions - O(n) với Set lookup O(1)
        for (const rowId of activeRowIds) {
            if (!incomingRowIds.has(rowId)) {
                rowIdsToDelete.add(rowId);
                summary.rowsDeleted++;
            }
        }
        for (const rackId of activeRackIds) {
            if (!incomingRackIds.has(rackId)) {
                rackIdsToDelete.add(rackId);
                summary.racksDeleted++;
            }
        }
        for (const shelfId of activeShelfIds) {
            if (!incomingShelfIds.has(shelfId)) {
                shelfIdsToDelete.add(shelfId);
                summary.shelvesDeleted++;
            }
        }
        for (const blockId of activeBlockIds) {
            if (!incomingBlockIds.has(blockId)) {
                blockIdsToDelete.add(blockId);
                summary.blocksDeleted++;
            }
        }

        // Execute operations
        await this.repository.bulkUpsertLayout({
            ...operations,
            rowIdsToDelete: [...rowIdsToDelete],
            rackIdsToDelete: [...rackIdsToDelete],
            shelfIdsToDelete: [...shelfIdsToDelete],
            blockIdsToDelete: [...blockIdsToDelete],
        }, userId);

        // Process discount configs for rows sau khi rows đã được create/update
        // Thu thập tất cả row IDs và discount_configs của chúng
        const rowDiscountConfigsToProcess: Array<{
            rowId: string;
            discountConfigs: NonNullable<typeof dto.rows[0]['discount_configs']>;
            existingConfigs: Array<{ id: string; duration_tier_id: string }>;
        }> = [];

        for (const row of dto.rows) {
            if (row.discount_configs && row.discount_configs.length > 0) {
                // Nếu row có id, lấy existing configs từ existingRowMap
                // Nếu row mới được tạo, tìm id từ rowsToCreate
                let rowId: string | undefined;
                let existingConfigs: Array<{ id: string; duration_tier_id: string }> = [];

                if (row.id) {
                    rowId = row.id;
                    // Lấy existing discount configs từ existing row (cần fetch từ DB)
                    const existingRow = existingRowMap.get(row.id);
                    if (existingRow) {
                        // Fetch existing discount configs cho row này
                        const configs = await this.repository.findRowDiscountConfigs(row.id);
                        existingConfigs = configs.map(c => ({ id: c.id, duration_tier_id: c.duration_tier_id }));
                    }
                } else {
                    // Tìm rowId từ rowsToCreate (dựa trên name và code match)
                    const createdRow = operations.rowsToCreate.find(
                        r => r.name === row.name && r.code === row.code
                    );
                    if (createdRow) {
                        rowId = createdRow.id;
                    }
                }

                if (rowId) {
                    rowDiscountConfigsToProcess.push({
                        rowId,
                        discountConfigs: row.discount_configs,
                        existingConfigs,
                    });
                }
            }
        }

        // Upsert discount configs cho mỗi row
        for (const { rowId, discountConfigs, existingConfigs } of rowDiscountConfigsToProcess) {
            await this.upsertRowDiscountConfigs(rowId, discountConfigs, existingConfigs, userId);
        }

        // Invalidate caches
        await Promise.all([
            this.redisService.invalidateWarehouseTemplateCache(templateId),
            this.redisService.invalidateWarehouseTemplateListCache(),
        ]);

        this.systemLogService.info('warehouse-template', 'layout_update', `Updated layout for: ${existing.name}`, {
            userId,
            metaData: { templateId, summary },
        });

        this.websocketGateway.emitWarehouseTemplateLayoutUpdated(templateId, existing.name, userId, summary);

        return this.repository.findById(templateId) as unknown as IWarehouseTemplateWithRelations;
    }

    /**
     * Process incoming racks và nested entities
     */
    private processIncomingRacks(
        rowId: string,
        racks: LayoutRackDto[],
        userId: string,
        operations: {
            racksToCreate: Prisma.RackTemplateCreateManyInput[];
            racksToUpdate: { id: string; data: Prisma.RackTemplateUpdateInput }[];
            rackIdsToRestore: string[];
            shelvesToCreate: Prisma.ShelfTemplateCreateManyInput[];
            shelvesToUpdate: { id: string; data: Prisma.ShelfTemplateUpdateInput }[];
            shelfIdsToRestore: string[];
            blocksToCreate: Prisma.BlockTemplateCreateManyInput[];
            blocksToUpdate: { id: string; data: Prisma.BlockTemplateUpdateInput }[];
            blockIdsToRestore: string[];
        },
        summary: Record<string, number>,
        existingRackMap: Map<string, { id: string; is_deleted: boolean | null }>,
        existingShelfMap: Map<string, { id: string; is_deleted: boolean | null }>,
        existingBlockMap: Map<string, { id: string; is_deleted: boolean | null }>,
        incomingRackIds: Set<string>,
        incomingShelfIds: Set<string>,
        incomingBlockIds: Set<string>,
    ): void {
        for (const rack of racks) {
            if (rack.id) {
                incomingRackIds.add(rack.id);
                const existing = existingRackMap.get(rack.id);
                if (existing) {
                    if (existing.is_deleted) {
                        operations.rackIdsToRestore.push(rack.id);
                        summary.racksRestored++;
                    }
                    operations.racksToUpdate.push({ id: rack.id, data: this.buildRackUpdateData(rack, userId) });
                    summary.racksUpdated++;
                }
                if (rack.shelves) {
                    this.processIncomingShelves(rack.id, rack.shelves, userId, operations, summary, existingShelfMap, existingBlockMap, incomingShelfIds, incomingBlockIds);
                }
            } else {
                const newId = uuidv4();
                operations.racksToCreate.push({ id: newId, row_template_id: rowId, ...this.buildRackCreateDataFlat(rack, userId) });
                summary.racksCreated++;
                if (rack.shelves) {
                    this.processIncomingShelves(newId, rack.shelves, userId, operations, summary, existingShelfMap, existingBlockMap, incomingShelfIds, incomingBlockIds);
                }
            }
        }
    }

    /**
     * Process incoming shelves và nested blocks
     */
    private processIncomingShelves(
        rackId: string,
        shelves: LayoutShelfDto[],
        userId: string,
        operations: {
            shelvesToCreate: Prisma.ShelfTemplateCreateManyInput[];
            shelvesToUpdate: { id: string; data: Prisma.ShelfTemplateUpdateInput }[];
            shelfIdsToRestore: string[];
            blocksToCreate: Prisma.BlockTemplateCreateManyInput[];
            blocksToUpdate: { id: string; data: Prisma.BlockTemplateUpdateInput }[];
            blockIdsToRestore: string[];
        },
        summary: Record<string, number>,
        existingShelfMap: Map<string, { id: string; is_deleted: boolean | null }>,
        existingBlockMap: Map<string, { id: string; is_deleted: boolean | null }>,
        incomingShelfIds: Set<string>,
        incomingBlockIds: Set<string>,
    ): void {
        for (const shelf of shelves) {
            if (shelf.id) {
                incomingShelfIds.add(shelf.id);
                const existing = existingShelfMap.get(shelf.id);
                if (existing) {
                    if (existing.is_deleted) {
                        operations.shelfIdsToRestore.push(shelf.id);
                        summary.shelvesRestored++;
                    }
                    operations.shelvesToUpdate.push({ id: shelf.id, data: this.buildShelfUpdateData(shelf, userId) });
                    summary.shelvesUpdated++;
                }
                if (shelf.blocks) {
                    this.processIncomingBlocks(shelf.id, shelf.blocks, userId, operations, summary, existingBlockMap, incomingBlockIds);
                }
            } else {
                const newId = uuidv4();
                operations.shelvesToCreate.push({ id: newId, rack_template_id: rackId, ...this.buildShelfCreateDataFlat(shelf, userId) });
                summary.shelvesCreated++;
                if (shelf.blocks) {
                    this.processIncomingBlocks(newId, shelf.blocks, userId, operations, summary, existingBlockMap, incomingBlockIds);
                }
            }
        }
    }

    /**
     * Process incoming blocks
     */
    private processIncomingBlocks(
        shelfId: string,
        blocks: LayoutBlockDto[],
        userId: string,
        operations: {
            blocksToCreate: Prisma.BlockTemplateCreateManyInput[];
            blocksToUpdate: { id: string; data: Prisma.BlockTemplateUpdateInput }[];
            blockIdsToRestore: string[];
        },
        summary: Record<string, number>,
        existingBlockMap: Map<string, { id: string; is_deleted: boolean | null }>,
        incomingBlockIds: Set<string>,
    ): void {
        for (const block of blocks) {
            if (block.id) {
                incomingBlockIds.add(block.id);
                const existing = existingBlockMap.get(block.id);
                if (existing) {
                    if (existing.is_deleted) {
                        operations.blockIdsToRestore.push(block.id);
                        summary.blocksRestored++;
                    }
                    operations.blocksToUpdate.push({ id: block.id, data: this.buildBlockUpdateData(block, userId) });
                    summary.blocksUpdated++;
                }
            } else {
                operations.blocksToCreate.push({ id: uuidv4(), shelf_template_id: shelfId, ...this.buildBlockCreateDataFlat(block, userId) });
                summary.blocksCreated++;
            }
        }
    }

    private buildRowCreateData(row: LayoutRowDto, userId: string) {
        return {
            name: row.name,
            code: row.code,
            description: row.description,
            price_per_month: new Decimal(row.price_per_month ?? 0),
            address: row.address,
            latitude: row.latitude ? new Decimal(row.latitude) : undefined,
            longitude: row.longitude ? new Decimal(row.longitude) : undefined,
            position_x: row.position_x ? new Decimal(row.position_x) : undefined,
            position_y: row.position_y ? new Decimal(row.position_y) : undefined,
            position_rotation: row.position_rotation ? new Decimal(row.position_rotation) : undefined,
            is_active: row.is_active ?? true,
            created_by: userId,
        };
    }

    private buildRowUpdateData(row: LayoutRowDto, userId: string) {
        return {
            name: row.name,
            code: row.code,
            description: row.description,
            price_per_month: row.price_per_month !== undefined ? new Decimal(row.price_per_month) : undefined,
            address: row.address,
            latitude: row.latitude !== undefined ? new Decimal(row.latitude) : undefined,
            longitude: row.longitude !== undefined ? new Decimal(row.longitude) : undefined,
            position_x: row.position_x !== undefined ? new Decimal(row.position_x) : undefined,
            position_y: row.position_y !== undefined ? new Decimal(row.position_y) : undefined,
            position_rotation: row.position_rotation !== undefined ? new Decimal(row.position_rotation) : undefined,
            is_active: row.is_active,
            updated_by: userId,
        };
    }

    private buildRackCreateData(rack: LayoutRackDto, userId: string) {
        return {
            name: rack.name,
            code: rack.code,
            description: rack.description,
            position_x: rack.position_x ? new Decimal(rack.position_x) : undefined,
            position_y: rack.position_y ? new Decimal(rack.position_y) : undefined,
            position_rotation: rack.position_rotation ? new Decimal(rack.position_rotation) : undefined,
            dimensions_width: rack.dimensions_width ? new Decimal(rack.dimensions_width) : undefined,
            dimensions_height: rack.dimensions_height ? new Decimal(rack.dimensions_height) : undefined,
            default_block_max_weight_capacity: rack.default_block_max_weight_capacity ? new Decimal(rack.default_block_max_weight_capacity) : undefined,
            overload_threshold_percent: rack.overload_threshold_percent ? new Decimal(rack.overload_threshold_percent) : undefined,
            is_active: rack.is_active ?? true,
            created_by: userId,
        };
    }

    private buildRackUpdateData(rack: LayoutRackDto, userId: string) {
        return {
            name: rack.name,
            code: rack.code,
            description: rack.description,
            position_x: rack.position_x !== undefined ? new Decimal(rack.position_x) : undefined,
            position_y: rack.position_y !== undefined ? new Decimal(rack.position_y) : undefined,
            position_rotation: rack.position_rotation !== undefined ? new Decimal(rack.position_rotation) : undefined,
            dimensions_width: rack.dimensions_width !== undefined ? new Decimal(rack.dimensions_width) : undefined,
            dimensions_height: rack.dimensions_height !== undefined ? new Decimal(rack.dimensions_height) : undefined,
            default_block_max_weight_capacity: rack.default_block_max_weight_capacity !== undefined ? new Decimal(rack.default_block_max_weight_capacity) : undefined,
            overload_threshold_percent: rack.overload_threshold_percent !== undefined ? new Decimal(rack.overload_threshold_percent) : undefined,
            is_active: rack.is_active,
            updated_by: userId,
        };
    }

    private buildShelfCreateData(shelf: LayoutShelfDto, userId: string) {
        return {
            name: shelf.name,
            code: shelf.code,
            description: shelf.description,
            height: shelf.height ? new Decimal(shelf.height) : undefined,
            is_active: shelf.is_active ?? true,
            created_by: userId,
        };
    }

    private buildShelfUpdateData(shelf: LayoutShelfDto, userId: string) {
        return {
            name: shelf.name,
            code: shelf.code,
            description: shelf.description,
            height: shelf.height !== undefined ? new Decimal(shelf.height) : undefined,
            is_active: shelf.is_active,
            updated_by: userId,
        };
    }

    private buildBlockCreateData(block: LayoutBlockDto, userId: string) {
        return {
            name: block.name,
            code: block.code,
            description: block.description,
            position_x: block.position_x ? new Decimal(block.position_x) : undefined,
            position_y: block.position_y ? new Decimal(block.position_y) : undefined,
            dimensions_width: block.dimensions_width ? new Decimal(block.dimensions_width) : undefined,
            dimensions_height: block.dimensions_height ? new Decimal(block.dimensions_height) : undefined,
            is_active: block.is_active ?? true,
            created_by: userId,
        };
    }

    private buildBlockUpdateData(block: LayoutBlockDto, userId: string) {
        return {
            name: block.name,
            code: block.code,
            description: block.description,
            position_x: block.position_x !== undefined ? new Decimal(block.position_x) : undefined,
            position_y: block.position_y !== undefined ? new Decimal(block.position_y) : undefined,
            dimensions_width: block.dimensions_width !== undefined ? new Decimal(block.dimensions_width) : undefined,
            dimensions_height: block.dimensions_height !== undefined ? new Decimal(block.dimensions_height) : undefined,
            is_active: block.is_active,
            updated_by: userId,
        };
    }

    private buildRowCreateDataFlat(row: LayoutRowDto, userId: string): Omit<Prisma.RowTemplateCreateManyInput, 'id' | 'warehouse_template_id'> {
        return {
            name: row.name,
            code: row.code,
            description: row.description,
            price_per_month: row.price_per_month ?? 0,
            address: row.address,
            latitude: row.latitude,
            longitude: row.longitude,
            position_x: row.position_x,
            position_y: row.position_y,
            position_rotation: row.position_rotation,
            is_active: row.is_active ?? true,
            created_by: userId,
        };
    }


    private buildRackCreateDataFlat(rack: LayoutRackDto, userId: string): Omit<Prisma.RackTemplateCreateManyInput, 'id' | 'row_template_id'> {
        return {
            name: rack.name,
            code: rack.code,
            description: rack.description,
            position_x: rack.position_x,
            position_y: rack.position_y,
            position_rotation: rack.position_rotation,
            dimensions_width: rack.dimensions_width,
            dimensions_height: rack.dimensions_height,
            default_block_max_weight_capacity: rack.default_block_max_weight_capacity,
            overload_threshold_percent: rack.overload_threshold_percent,
            is_active: rack.is_active ?? true,
            created_by: userId,
        };
    }

    private buildShelfCreateDataFlat(shelf: LayoutShelfDto, userId: string): Omit<Prisma.ShelfTemplateCreateManyInput, 'id' | 'rack_template_id'> {
        return {
            name: shelf.name,
            code: shelf.code,
            description: shelf.description,
            height: shelf.height,
            is_active: shelf.is_active ?? true,
            created_by: userId,
        };
    }

    private buildBlockCreateDataFlat(block: LayoutBlockDto, userId: string): Omit<Prisma.BlockTemplateCreateManyInput, 'id' | 'shelf_template_id'> {
        return {
            name: block.name,
            code: block.code,
            description: block.description,
            position_x: block.position_x,
            position_y: block.position_y,
            dimensions_width: block.dimensions_width,
            dimensions_height: block.dimensions_height,
            is_active: block.is_active ?? true,
            created_by: userId,
        };
    }

    /**
     * Kiểm tra 2 hình chữ nhật có overlap hay không
     */
    private isRectOverlapping(
        rect1: { x: number; y: number; width: number; height: number },
        rect2: { x: number; y: number; width: number; height: number },
    ): boolean {
        // 2 hình chữ nhật KHÔNG overlap khi:
        // - rect1 nằm hoàn toàn bên trái rect2: rect1.x + rect1.width <= rect2.x
        // - rect1 nằm hoàn toàn bên phải rect2: rect1.x >= rect2.x + rect2.width
        // - rect1 nằm hoàn toàn bên trên rect2: rect1.y + rect1.height <= rect2.y
        // - rect1 nằm hoàn toàn bên dưới rect2: rect1.y >= rect2.y + rect2.height
        const noOverlap =
            rect1.x + rect1.width <= rect2.x ||
            rect1.x >= rect2.x + rect2.width ||
            rect1.y + rect1.height <= rect2.y ||
            rect1.y >= rect2.y + rect2.height;

        return !noOverlap;
    }

    /**
     * Validate các rack trong cùng một row không được đè lên nhau
     */
    private validateRacksNoOverlap(rows: LayoutRowDto[], lang: string): void {
        for (const row of rows) {
            if (!row.racks || row.racks.length < 2) continue;

            // Lọc các rack có đủ thông tin position và dimensions
            const racksWithBounds = row.racks.filter(
                rack =>
                    rack.position_x !== undefined &&
                    rack.position_y !== undefined &&
                    rack.dimensions_width !== undefined &&
                    rack.dimensions_height !== undefined
            );

            // Kiểm tra từng cặp rack
            for (let i = 0; i < racksWithBounds.length; i++) {
                for (let j = i + 1; j < racksWithBounds.length; j++) {
                    const rack1 = racksWithBounds[i];
                    const rack2 = racksWithBounds[j];

                    const rect1 = {
                        x: rack1.position_x!,
                        y: rack1.position_y!,
                        width: rack1.dimensions_width!,
                        height: rack1.dimensions_height!,
                    };

                    const rect2 = {
                        x: rack2.position_x!,
                        y: rack2.position_y!,
                        width: rack2.dimensions_width!,
                        height: rack2.dimensions_height!,
                    };

                    if (this.isRectOverlapping(rect1, rect2)) {
                        throw new BadRequestException(
                            this.i18n.t('warehouse-template.errors.racks_overlap', {
                                lang,
                                args: {
                                    rowName: row.name,
                                    rack1: rack1.name,
                                    rack2: rack2.name,
                                },
                            }),
                        );
                    }
                }
            }
        }
    }

    /**
     * Validate tọa độ của tất cả elements không vượt quá giới hạn warehouse (length x width)
     * - position_x + dimensions_width <= length
     * - position_y + dimensions_height <= width  
     * (Giả sử length là chiều dài theo trục X, width là chiều rộng theo trục Y)
     */
    private validateLayoutBounds(
        rows: LayoutRowDto[],
        warehouseLength: number,
        warehouseWidth: number,
        lang: string
    ): void {
        for (const row of rows) {
            // Validate row position
            if (row.position_x !== undefined && row.position_x > warehouseLength) {
                throw new BadRequestException(
                    this.i18n.t('warehouse-template.errors.row_out_of_bounds', {
                        lang,
                        args: { name: row.name, maxLength: warehouseLength, maxWidth: warehouseWidth },
                    }),
                );
            }
            if (row.position_y !== undefined && row.position_y > warehouseWidth) {
                throw new BadRequestException(
                    this.i18n.t('warehouse-template.errors.row_out_of_bounds', {
                        lang,
                        args: { name: row.name, maxLength: warehouseLength, maxWidth: warehouseWidth },
                    }),
                );
            }

            // Validate racks
            if (row.racks) {
                for (const rack of row.racks) {
                    // Kiểm tra position + dimensions có vượt quá không
                    const rackEndX = (rack.position_x ?? 0) + (rack.dimensions_width ?? 0);
                    const rackEndY = (rack.position_y ?? 0) + (rack.dimensions_height ?? 0);

                    if (rackEndX > warehouseLength || rackEndY > warehouseWidth) {
                        throw new BadRequestException(
                            this.i18n.t('warehouse-template.errors.rack_out_of_bounds', {
                                lang,
                                args: {
                                    name: rack.name,
                                    rowName: row.name,
                                    maxLength: warehouseLength,
                                    maxWidth: warehouseWidth,
                                },
                            }),
                        );
                    }

                    // Validate blocks trong shelves
                    if (rack.shelves) {
                        for (const shelf of rack.shelves) {
                            if (shelf.blocks) {
                                for (const block of shelf.blocks) {
                                    const blockEndX = (block.position_x ?? 0) + (block.dimensions_width ?? 0);
                                    const blockEndY = (block.position_y ?? 0) + (block.dimensions_height ?? 0);

                                    if (blockEndX > warehouseLength || blockEndY > warehouseWidth) {
                                        throw new BadRequestException(
                                            this.i18n.t('warehouse-template.errors.block_out_of_bounds', {
                                                lang,
                                                args: {
                                                    name: block.name,
                                                    maxLength: warehouseLength,
                                                    maxWidth: warehouseWidth,
                                                },
                                            }),
                                        );
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    /**
     * Upload ảnh cho WarehouseTemplate
     * @param templateId ID của template
     * @param files Danh sách files upload
     * @param userId ID user thực hiện
     * @param lang Ngôn ngữ
     */
    async uploadImages(
        templateId: string,
        files: Express.Multer.File[],
        userId: string,
        lang: string,
    ): Promise<ImageUploadResult[]> {
        // Kiểm tra template tồn tại
        const template = await this.repository.findById(templateId);
        if (!template) {
            throw new NotFoundException(
                this.i18n.t('warehouse-template.errors.not_found', { lang }),
            );
        }

        // Kiểm tra số lượng ảnh
        const currentCount = await this.repository.countImagesByTemplateId(templateId);
        if (currentCount + files.length > MAX_IMAGES_PER_TEMPLATE) {
            throw new BadRequestException(
                this.i18n.t('warehouse-template.errors.max_images_exceeded', {
                    lang,
                    args: { max: MAX_IMAGES_PER_TEMPLATE },
                }),
            );
        }

        // Upload lên ImageKit
        const uploadResults = await this.imageUploadService.processAndUploadMultiple(
            files.map((f) => ({ buffer: f.buffer, originalname: f.originalname })),
            `/warehouse-templates/${templateId}`,
        );

        // Lấy order hiện tại
        let currentOrder = await this.repository.getMaxImageOrder(templateId);

        // Lưu vào database
        const imageRecords = uploadResults.map((result) => ({
            warehouse_template_id: templateId,
            url: result.url,
            thumbnail_url: result.thumbnailUrl,
            file_id: result.fileId,
            original_name: result.name,
            size: result.size,
            order: ++currentOrder,
            created_by: userId,
        }));

        await this.repository.createManyImages(imageRecords);

        // Invalidate cache
        await this.redisService.invalidateWarehouseTemplateCache(templateId);

        // Log
        this.systemLogService.info('warehouse-template', 'upload_images', `Uploaded ${files.length} images for: ${template.name}`, {
            userId,
            metaData: { templateId, count: files.length },
        });

        // Emit WebSocket event
        this.websocketGateway.emitWarehouseTemplateImagesUploaded(templateId, files.length, userId);

        return uploadResults;
    }

    /**
     * Xóa ảnh của WarehouseTemplate
     * @param templateId ID template
     * @param imageId ID ảnh
     * @param userId ID user
     * @param lang Ngôn ngữ
     */
    async deleteImage(
        templateId: string,
        imageId: string,
        userId: string,
        lang: string,
    ): Promise<void> {
        // Kiểm tra template tồn tại
        const template = await this.repository.findById(templateId);
        if (!template) {
            throw new NotFoundException(
                this.i18n.t('warehouse-template.errors.not_found', { lang }),
            );
        }

        // Kiểm tra image tồn tại
        const image = await this.repository.findImageById(imageId);
        if (!image || image.warehouse_template_id !== templateId) {
            throw new NotFoundException(
                this.i18n.t('warehouse-template.errors.image_not_found', { lang }),
            );
        }

        // Xóa trên ImageKit
        try {
            await this.imageUploadService.deleteImage(image.file_id);
        } catch (error) {
            // Log lỗi nhưng không throw - vẫn xóa trong DB
            this.systemLogService.error('warehouse-template', 'delete_image_imagekit', `Failed to delete from ImageKit: ${error}`, {
                userId,
                metaData: { templateId, imageId, fileId: image.file_id },
            });
        }

        // Soft delete trong DB
        await this.repository.softDeleteImage(imageId, userId);

        // Invalidate cache
        await this.redisService.invalidateWarehouseTemplateCache(templateId);

        // Log
        this.systemLogService.info('warehouse-template', 'delete_image', `Deleted image from: ${template.name}`, {
            userId,
            metaData: { templateId, imageId },
        });

        // Emit WebSocket event
        this.websocketGateway.emitWarehouseTemplateImageDeleted(templateId, imageId, userId);
    }

    async deleteManyImages(
        templateId: string,
        ids: string[],
        userId: string,
        lang: string,
    ): Promise<void> {
        const template = await this.repository.findById(templateId);
        if (!template) {
            throw new NotFoundException(
                this.i18n.t('warehouse-template.errors.not_found', { lang }),
            );
        }

        const images = await this.repository.findImagesByIds(ids);
        if (images.length === 0) {
            throw new NotFoundException(
                this.i18n.t('warehouse-template.errors.image_not_found', { lang }),
            );
        }

        // Validate images belong to template
        const invalidImage = images.find(img => img.warehouse_template_id !== templateId);
        if (invalidImage) {
            throw new BadRequestException(
                this.i18n.t('warehouse-template.errors.image_not_found', { lang }),
            );
        }

        // Delete from ImageKit
        await Promise.all(
            images.map(image =>
                this.imageUploadService.deleteImage(image.file_id).catch(error => {
                    this.systemLogService.error('warehouse-template', 'delete_image_imagekit', `Failed to delete from ImageKit: ${error}`, {
                        userId,
                        metaData: { templateId, imageId: image.id, fileId: image.file_id },
                    });
                })
            )
        );

        await this.repository.softDeleteManyImages(ids, userId);

        await this.redisService.invalidateWarehouseTemplateCache(templateId);

        // Emit WebSocket event
        this.websocketGateway.emitWarehouseTemplateImagesDeletedMany(templateId, ids, userId);

        this.systemLogService.info('warehouse-template', 'delete_images_many', `Deleted ${ids.length} images from: ${template.name}`, {
            userId,
            metaData: { templateId, count: ids.length },
        });
    }

    /**
     * Sắp xếp lại thứ tự ảnh
     * @param templateId ID template
     * @param imageOrders Danh sách { id, order }
     * @param userId ID user
     * @param lang Ngôn ngữ
     */
    async reorderImages(
        templateId: string,
        imageOrders: { id: string; order: number }[],
        userId: string,
        lang: string,
    ): Promise<void> {
        // Kiểm tra template tồn tại
        const template = await this.repository.findById(templateId);
        if (!template) {
            throw new NotFoundException(
                this.i18n.t('warehouse-template.errors.not_found', { lang }),
            );
        }

        // Batch update order
        await this.repository.batchUpdateImageOrder(imageOrders);

        // Invalidate cache
        await this.redisService.invalidateWarehouseTemplateCache(templateId);

        // Log
        this.systemLogService.info('warehouse-template', 'reorder_images', `Reordered images for: ${template.name}`, {
            userId,
            metaData: { templateId, count: imageOrders.length },
        });

        // Emit WebSocket event
        this.websocketGateway.emitWarehouseTemplateImagesReordered(templateId, userId);
    }

    /**
     * Lấy danh sách ảnh của template
     */
    async getImages(templateId: string, lang: string) {
        const template = await this.repository.findById(templateId);
        if (!template) {
            throw new NotFoundException(
                this.i18n.t('warehouse-template.errors.not_found', { lang }),
            );
        }

        return this.repository.findImagesByTemplateId(templateId);
    }
}
