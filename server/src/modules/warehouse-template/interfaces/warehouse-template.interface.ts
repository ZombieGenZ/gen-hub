import { WarehouseTemplate, RowTemplate, RackTemplate, ShelfTemplate, BlockTemplate, WarehouseDiscountTier } from '@prisma/client';

/**
 * WarehouseDiscountTier với relations
 */
export interface IDiscountTierWithRelations extends WarehouseDiscountTier { }

/**
 * WarehouseTemplate với relations đầy đủ
 */
export interface IWarehouseTemplateWithRelations extends WarehouseTemplate {
    rows: IRowTemplateWithRelations[];
    discount_tiers?: IDiscountTierWithRelations[];
    ward?: {
        id: string;
        name: string;
        district?: {
            id: string;
            name: string;
            province?: {
                id: string;
                name: string;
            };
        };
    };
}

/**
 * RowTemplate với relations
 */
export interface IRowTemplateWithRelations extends RowTemplate {
    racks: IRackTemplateWithRelations[];
}

/**
 * RackTemplate với relations
 */
export interface IRackTemplateWithRelations extends RackTemplate {
    shelves: IShelfTemplateWithRelations[];
}

/**
 * ShelfTemplate với relations
 */
export interface IShelfTemplateWithRelations extends ShelfTemplate {
    blocks: BlockTemplate[];
}

/**
 * Response phân trang
 */
export interface IPaginatedResponse<T> {
    items: T[];
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
}

/**
 * WebSocket events cho WarehouseTemplate
 */
export interface IWarehouseTemplateCreatedEvent {
    warehouseTemplateId: string;
    name: string;
    createdBy: string;
    timestamp: string;
}

export interface IWarehouseTemplateUpdatedEvent {
    warehouseTemplateId: string;
    name: string;
    updatedFields: string[];
    updatedBy: string;
    timestamp: string;
}

export interface IWarehouseTemplateDeletedEvent {
    warehouseTemplateId: string;
    name: string;
    deletedBy: string;
    timestamp: string;
}

export interface IWarehouseTemplateLayoutUpdatedEvent {
    warehouseTemplateId: string;
    name: string;
    updatedBy: string;
    summary: {
        rowsCreated: number;
        rowsUpdated: number;
        rowsDeleted: number;
        racksCreated: number;
        racksUpdated: number;
        racksDeleted: number;
        shelvesCreated: number;
        shelvesUpdated: number;
        shelvesDeleted: number;
        blocksCreated: number;
        blocksUpdated: number;
        blocksDeleted: number;
    };
    timestamp: string;
}
