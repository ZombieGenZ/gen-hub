import { WarehouseTemplate, RowTemplate, RackTemplate, ShelfTemplate, BlockTemplate, WarehouseDiscountConfig, RowDiscountConfig, RentalDurationTier } from '@prisma/client';

/**
 * WarehouseDiscountConfig với duration_tier relation
 */
export interface IDiscountConfigWithRelations extends WarehouseDiscountConfig {
    duration_tier?: RentalDurationTier;
}

/**
 * RowDiscountConfig với duration_tier relation
 */
export interface IRowDiscountConfigWithRelations extends RowDiscountConfig {
    duration_tier?: RentalDurationTier;
}

/**
 * WarehouseTemplate với relations đầy đủ
 */
export interface IWarehouseTemplateWithRelations extends WarehouseTemplate {
    rows: IRowTemplateWithRelations[];
    discount_configs?: IDiscountConfigWithRelations[];
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
    discount_configs?: IRowDiscountConfigWithRelations[];
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

// Re-export IPaginatedResponse từ common
export type { IPaginatedResponse } from '../../../common/interfaces/index.js';

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
