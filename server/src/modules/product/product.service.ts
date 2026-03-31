import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import * as ExcelJS from 'exceljs';
import { ProductRepository } from './product.repository';
import { CreateProductDto, UpdateProductDto, QueryProductDto } from './dto';
import { IProduct, IPaginatedResponse } from './interfaces';
import { RedisService } from '../redis/redis.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { OrganizationAuditLogService } from '../organization/organization-audit-log.service';
import { ExcelService } from '../../common/services/excel.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProductService {
    private readonly PRODUCT_LIST_TTL: number;
    private readonly PRODUCT_DETAIL_TTL: number;
    private readonly PRODUCT_KEY_PREFIX: string;
    private readonly PRODUCT_LIST_KEY_PREFIX: string;

    constructor(
        private readonly repository: ProductRepository,
        private readonly redisService: RedisService,
        private readonly configService: ConfigService,
        private readonly websocketGateway: WebsocketGateway,
        private readonly auditLogService: OrganizationAuditLogService,
        private readonly excelService: ExcelService,
        private readonly prisma: PrismaService,
        private readonly i18n: I18nService,
    ) {
        this.PRODUCT_LIST_TTL = this.configService.get<number>('REDIS_PRODUCT_LIST_TTL') || 300;
        this.PRODUCT_DETAIL_TTL = this.configService.get<number>('REDIS_PRODUCT_DETAIL_TTL') || 600;
        this.PRODUCT_KEY_PREFIX = this.configService.get<string>('REDIS_PRODUCT_KEY_PREFIX') || 'product:detail';
        this.PRODUCT_LIST_KEY_PREFIX = this.configService.get<string>('REDIS_PRODUCT_LIST_KEY_PREFIX') || 'product:list';
    }

    private getListCacheKey(orgId: string, query: QueryProductDto): string {
        const sortedParams = Object.keys(query)
            .sort()
            .filter(key => query[key as keyof QueryProductDto] !== undefined)
            .map(key => `${key}=${query[key as keyof QueryProductDto]}`)
            .join('&');
        return `${this.PRODUCT_LIST_KEY_PREFIX}:${orgId}:${sortedParams}`;
    }

    private getDetailCacheKey(id: string): string {
        return `${this.PRODUCT_KEY_PREFIX}:${id}`;
    }

    async create(
        orgId: string,
        dto: CreateProductDto,
        actorId: string,
        lang: string,
    ): Promise<IProduct> {
        const orgExists = await this.repository.orgExists(orgId);
        if (!orgExists) {
            throw new NotFoundException(
                await this.i18n.translate('product.errors.organization_not_found', { lang }),
            );
        }

        // Kiểm tra SKU trùng
        const skuExists = await this.repository.skuExistsInOrg(dto.sku, orgId);
        if (skuExists) {
            throw new ConflictException(
                await this.i18n.translate('product.errors.sku_exists', { lang }),
            );
        }

        // Kiểm tra base_unit tồn tại
        const baseUnitExists = await this.repository.unitExists(dto.base_unit_id, orgId);
        if (!baseUnitExists) {
            throw new BadRequestException(
                await this.i18n.translate('product.errors.base_unit_not_found', { lang }),
            );
        }

        // Kiểm tra các unit trong units array
        if (dto.units && dto.units.length > 0) {
            for (const unit of dto.units) {
                const unitExists = await this.repository.unitExists(unit.unit_id, orgId);
                if (!unitExists) {
                    throw new BadRequestException(
                        await this.i18n.translate('product.errors.unit_not_found', { lang }),
                    );
                }
            }
        }

        const product = await this.repository.create(
            {
                name: dto.name,
                sku: dto.sku,
                description: dto.description,
                image_url: dto.image_url,
                barcode: dto.barcode,
                weight: dto.weight,
                length: dto.length,
                width: dto.width,
                height: dto.height,
                max_weight_capacity: dto.max_weight_capacity,
                cost_price: dto.cost_price ?? 0,
                is_active: dto.is_active ?? true,
                created_by: actorId,
                organization: { connect: { id: orgId } },
                base_unit: { connect: { id: dto.base_unit_id } },
            },
            dto.units,
            actorId,
        );

        // Invalidate cache
        await this.redisService.delByPattern(`${this.PRODUCT_LIST_KEY_PREFIX}:${orgId}:*`);

        // Emit realtime event
        this.websocketGateway.emitToOrganization(orgId, 'product:created', {
            id: product.id,
            name: product.name,
            sku: product.sku,
            actorId,
        });

        // Audit log
        this.auditLogService.logCreate(
            orgId,
            'Product',
            product.id,
            product as unknown as Record<string, unknown>,
            { userId: actorId, description: `Created product: ${product.name}` },
        );

        return product;
    }

    async findMany(
        orgId: string,
        query: QueryProductDto,
        lang: string,
    ): Promise<IPaginatedResponse<IProduct>> {
        const orgExists = await this.repository.orgExists(orgId);
        if (!orgExists) {
            throw new NotFoundException(
                await this.i18n.translate('product.errors.organization_not_found', { lang }),
            );
        }

        const cacheKey = this.getListCacheKey(orgId, query);
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        const result = await this.repository.findByOrgId(orgId, query);

        await this.redisService.set(cacheKey, JSON.stringify(result), this.PRODUCT_LIST_TTL);

        return result;
    }

    async findById(orgId: string, id: string, lang: string): Promise<IProduct> {
        const cacheKey = this.getDetailCacheKey(id);
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            const product = JSON.parse(cached) as IProduct;
            if (product.organization_id === orgId) {
                return product;
            }
        }

        const product = await this.repository.findByIdAndOrgId(id, orgId);
        if (!product) {
            throw new NotFoundException(
                await this.i18n.translate('product.errors.not_found', { lang }),
            );
        }

        await this.redisService.set(cacheKey, JSON.stringify(product), this.PRODUCT_DETAIL_TTL);

        return product;
    }

    async update(
        orgId: string,
        id: string,
        dto: UpdateProductDto,
        actorId: string,
        lang: string,
    ): Promise<IProduct> {
        const existing = await this.repository.findByIdAndOrgId(id, orgId);
        if (!existing) {
            throw new NotFoundException(
                await this.i18n.translate('product.errors.not_found', { lang }),
            );
        }

        // Kiểm tra SKU trùng nếu thay đổi
        if (dto.sku && dto.sku !== existing.sku) {
            const skuExists = await this.repository.skuExistsInOrg(dto.sku, orgId, id);
            if (skuExists) {
                throw new ConflictException(
                    await this.i18n.translate('product.errors.sku_exists', { lang }),
                );
            }
        }

        // Kiểm tra base_unit nếu thay đổi
        if (dto.base_unit_id && dto.base_unit_id !== existing.base_unit_id) {
            const baseUnitExists = await this.repository.unitExists(dto.base_unit_id, orgId);
            if (!baseUnitExists) {
                throw new BadRequestException(
                    await this.i18n.translate('product.errors.base_unit_not_found', { lang }),
                );
            }
        }

        // Kiểm tra units nếu có
        if (dto.units && dto.units.length > 0) {
            for (const unit of dto.units) {
                const unitExists = await this.repository.unitExists(unit.unit_id, orgId);
                if (!unitExists) {
                    throw new BadRequestException(
                        await this.i18n.translate('product.errors.unit_not_found', { lang }),
                    );
                }
            }
        }

        const { units, base_unit_id, ...updateData } = dto;

        const product = await this.repository.update(
            id,
            {
                ...updateData,
                updated_by: actorId,
                ...(base_unit_id && { base_unit: { connect: { id: base_unit_id } } }),
            },
            units,
            actorId,
        );

        // Invalidate cache
        await this.redisService.del(this.getDetailCacheKey(id));
        await this.redisService.delByPattern(`${this.PRODUCT_LIST_KEY_PREFIX}:${orgId}:*`);

        // Emit realtime event
        this.websocketGateway.emitToOrganization(orgId, 'product:updated', {
            id: product.id,
            name: product.name,
            changedFields: Object.keys(dto),
            actorId,
        });

        // Audit log
        this.auditLogService.logUpdate(
            orgId,
            'Product',
            product.id,
            existing as unknown as Record<string, unknown>,
            product as unknown as Record<string, unknown>,
            { userId: actorId, description: `Updated product: ${product.name}` },
        );

        return product;
    }

    async delete(orgId: string, id: string, actorId: string, lang: string): Promise<void> {
        const existing = await this.repository.findByIdAndOrgId(id, orgId);
        if (!existing) {
            throw new NotFoundException(
                await this.i18n.translate('product.errors.not_found', { lang }),
            );
        }

        await this.repository.softDelete(id, actorId);

        // Invalidate cache
        await this.redisService.del(this.getDetailCacheKey(id));
        await this.redisService.delByPattern(`${this.PRODUCT_LIST_KEY_PREFIX}:${orgId}:*`);

        // Emit realtime event
        this.websocketGateway.emitToOrganization(orgId, 'product:deleted', {
            id,
            name: existing.name,
            actorId,
        });

        // Audit log
        this.auditLogService.logDelete(
            orgId,
            'Product',
            id,
            existing as unknown as Record<string, unknown>,
            { userId: actorId, description: `Deleted product: ${existing.name}` },
        );
    }

    async deleteMany(orgId: string, ids: string[], actorId: string, lang: string): Promise<void> {
        const products = await this.repository.findByIds(ids);
        if (products.length === 0) {
            throw new NotFoundException(
                await this.i18n.translate('product.errors.not_found', { lang }),
            );
        }

        // Check if all products belong to the organization
        const invalidOrg = products.find(p => p.organization_id !== orgId);
        if (invalidOrg) {
            throw new NotFoundException(
                await this.i18n.translate('product.errors.not_found', { lang }),
            );
        }

        await this.repository.softDeleteMany(ids, actorId);

        // Invalidate cache
        await Promise.all(ids.map(id => this.redisService.del(this.getDetailCacheKey(id))));
        await this.redisService.delByPattern(`${this.PRODUCT_LIST_KEY_PREFIX}:${orgId}:*`);

        // Emit realtime events
        this.websocketGateway.emitToOrganization(orgId, 'product:deleted_many', {
            ids,
            actorId
        });

        products.forEach(p => {
            this.auditLogService.logDelete(
                orgId,
                p.id,
                'Product',
                { name: p.name } as Record<string, unknown>,
                { userId: actorId, description: `Deleted product: ${p.name}` },
            );
        });
    }

    async exportProducts(orgId: string, lang: string): Promise<Buffer> {
        const result = await this.repository.findByOrgId(orgId, { limit: 10000, offset: 0 });
        const products = result.items;

        const columns = [
            { header: 'Tên sản phẩm', key: 'name', width: 30 },
            { header: 'SKU', key: 'sku', width: 15 },
            { header: 'Mã vạch', key: 'barcode', width: 15 },
            { header: 'Đơn vị cơ bản', key: 'base_unit', width: 15 },
            { header: 'Giá vốn', key: 'cost_price', width: 15 },
            { header: 'Khối lượng (kg)', key: 'weight', width: 15 },
            { header: 'Dài (cm)', key: 'length', width: 10 },
            { header: 'Rộng (cm)', key: 'width', width: 10 },
            { header: 'Cao (cm)', key: 'height', width: 10 },
            { header: 'Mô tả', key: 'description', width: 40 },
            { header: 'Quy đổi (Đơn vị:Tỷ lệ:Barcode)', key: 'units', width: 50 },
        ];

        const data = products.map(p => ({
            name: p.name,
            sku: p.sku,
            barcode: p.barcode || '',
            base_unit: p.base_unit?.name || '',
            cost_price: p.cost_price || 0,
            weight: p.weight || 0,
            length: p.length || 0,
            width: p.width || 0,
            height: p.height || 0,
            description: p.description || '',
            units: p.units?.map(u => `${u.unit?.name}:${u.conversion_rate}:${u.barcode || ''}`).join(', ') || '',
        }));

        return this.excelService.createExcelBuffer(columns, data, 'Products');
    }

    async importProducts(
        orgId: string,
        buffer: any,
        actorId: string,
        lang: string,
    ): Promise<{ success: number; errors: string[] }> {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);
        const worksheet = workbook.getWorksheet(1);
        if (!worksheet) {
            throw new BadRequestException('Invalid Excel file');
        }

        let successCount = 0;
        const errors: string[] = [];

        // Skip header
        const rows = worksheet.getRows(2, worksheet.rowCount - 1) || [];
        
        // This is a simplified version, ideally we'd use a transaction or bulk create
        // and handle async better. For now, let's just loop and call create.
        
        // First, fetch all units for the org to map names to IDs
        const orgUnits = await this.prisma.unit.findMany({
            where: { organization_id: orgId, is_deleted: false }
        });

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const name = row.getCell(1).value?.toString();
            const sku = row.getCell(2).value?.toString();
            if (!name || !sku) continue;

            try {
                // Find base unit by name
                const baseUnitName = row.getCell(4).value?.toString();
                const baseUnit = orgUnits.find(u => u.name?.toLowerCase() === baseUnitName?.toLowerCase());
                
                if (!baseUnit) {
                    errors.push(`Row ${i + 2}: Base unit "${baseUnitName}" not found`);
                    continue;
                }

                const createDto: CreateProductDto = {
                    name,
                    sku,
                    barcode: row.getCell(3).value?.toString(),
                    base_unit_id: baseUnit.id,
                    cost_price: Number(row.getCell(5).value) || 0,
                    weight: Number(row.getCell(6).value) || 0,
                    length: Number(row.getCell(7).value) || 0,
                    width: Number(row.getCell(8).value) || 0,
                    height: Number(row.getCell(9).value) || 0,
                    description: row.getCell(10).value?.toString(),
                    is_active: true,
                };

                // Handle units string: "Thùng:24:893456, Lốc:6:893457"
                const unitsStr = row.getCell(11).value?.toString();
                if (unitsStr) {
                    const unitParts = unitsStr.split(',').map(s => s.trim());
                    createDto.units = [];
                    for (const part of unitParts) {
                        const [uName, rate, uBarcode] = part.split(':');
                        if (!uName) continue;
                        const unit = orgUnits.find(u => u.name?.toLowerCase() === uName.toLowerCase());
                        if (unit) {
                            createDto.units.push({
                                unit_id: unit.id,
                                conversion_rate: Number(rate) || 1,
                                barcode: uBarcode || undefined
                            });
                        }
                    }
                }

                await this.create(orgId, createDto, actorId, lang);
                successCount++;
            } catch (err) {
                errors.push(`Row ${i + 2}: ${err.message}`);
            }
        }

        return { success: successCount, errors };
    }

    async getImportTemplate(): Promise<Buffer> {
        const columns = [
            { header: 'Tên sản phẩm*', key: 'name', width: 30 },
            { header: 'SKU*', key: 'sku', width: 15 },
            { header: 'Mã vạch', key: 'barcode', width: 15 },
            { header: 'Đơn vị cơ bản*', key: 'base_unit', width: 15 },
            { header: 'Giá vốn', key: 'cost_price', width: 15 },
            { header: 'Khối lượng (kg)', key: 'weight', width: 15 },
            { header: 'Dài (cm)', key: 'length', width: 10 },
            { header: 'Rộng (cm)', key: 'width', width: 10 },
            { header: 'Cao (cm)', key: 'height', width: 10 },
            { header: 'Mô tả', key: 'description', width: 40 },
            { header: 'Quy đổi (Đơn vị:Tỷ lệ:Barcode)', key: 'units', width: 50 },
        ];

        const data = [
            {
                name: 'Sản phẩm mẫu 1',
                sku: 'SKU001',
                barcode: '123456789',
                base_unit: 'Cái',
                cost_price: 10000,
                weight: 0.5,
                length: 10,
                width: 10,
                height: 10,
                description: 'Mô tả sản phẩm mẫu',
                units: 'Thùng:24:987654321, Lốc:6:',
            }
        ];

        return this.excelService.createExcelBuffer(columns, data, 'Template Nhập Sản Phẩm');
    }
}
