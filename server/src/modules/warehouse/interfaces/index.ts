import { Warehouse, Row, Rack, Shelf, Block } from '@prisma/client';

/**
 * Interface warehouse với relations
 */
export interface IWarehouseWithRelations extends Warehouse {
    organization?: {
        id: string;
        name: string;
    };
    ward?: {
        id: string;
        name: string;
        code: string;
        type: string | null;
        province?: {
            id: string;
            name: string;
            code: string;
            type: string | null;
        };
    } | null;
    rows?: IRowWithRelations[];
    _count?: {
        rows: number;
    };
}

export interface IRowWithRelations extends Row {
    racks?: IRackWithRelations[];
}

export interface IRackWithRelations extends Rack {
    shelves?: IShelfWithRelations[];
}

export interface IShelfWithRelations extends Shelf {
    blocks?: Block[];
}

/**
 * Interface response phân trang
 */
export interface IPaginatedResponse<T> {
    items: T[];
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
}

/**
 * Interface warehouse layout (toàn bộ cấu trúc)
 */
export interface IWarehouseLayout {
    id: string;
    name: string;
    description: string | null;
    unit: string;
    length: number;
    width: number;
    rows: {
        id: string;
        name: string;
        code: string;
        position_x: number | null;
        position_y: number | null;
        position_rotation: number | null;
        is_rented: boolean;
        racks: {
            id: string;
            name: string;
            code: string;
            position_x: number | null;
            position_y: number | null;
            position_rotation: number | null;
            dimensions_width: number | null;
            dimensions_depth: number | null;
            dimensions_height: number | null;
            shelves: {
                id: string;
                name: string;
                code: string;
                blocks: {
                    id: string;
                    name: string;
                    code: string;
                    position_x: number | null;
                    position_y: number | null;
                    dimensions_width: number | null;
                    dimensions_height: number | null;
                }[];
            }[];
        }[];
    }[];
}
