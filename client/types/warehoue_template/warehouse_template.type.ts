export interface Province {
    id: string;
    name: string;
    code: string;
    type: string;
}

export interface Ward {
    id: string;
    name: string;
    code: string;
    type: string;
    province: Province;
}

export interface WarehouseCount {
    rows: number;
    images: number;
}

export interface WarehousePrototype {
    type: string;
}

export interface Warehouse {
    // Thông tin cơ bản
    id: string;
    name: string;
    description: string;
    
    // Kích thước và đơn vị
    unit: string;
    length: number;
    width: number;
    
    // Thông tin khối (block)
    block_unit: string;
    block_length: string;
    block_width: string;
    
    // Trạng thái
    is_active: boolean;
    is_rented: boolean;
    is_shared_warehouse: boolean;
    is_deleted: boolean;
    rental_status: string;
    
    // Giá và giảm giá
    price_per_month: string;
    discount_1_month: string;
    discount_1_year: string;
    discount_2_years: string;
    discount_3_months: string;
    discount_3_years_plus: string;
    discount_6_months: string;
    whole_warehouse_discount: string;
    
    // Địa chỉ và vị trí
    address_detail: string;
    ward_id: string;
    ward: Ward;
    latitude: string;
    longitude: string;
    
    // Audit fields (thông tin theo dõi)
    created_at: string;
    created_by: string;
    updated_at: string;
    updated_by: string;
    deleted_at: string | null;
    deleted_by: string | null;
    
    // Media và count
    images: string[];
    _count: WarehouseCount;
    
    // Prototype (nếu có)
    __prototype__?: WarehousePrototype[];
    
    // Rows (nếu có)
    rows?: any[];
}

// Interface cho response API
export interface WarehouseListResponse {
    items: Warehouse[];
    total?: number;
    page?: number;
    limit?: number;
}

// Interface cho query parameters
export interface WarehouseQueryParams {
    search?: string;
    is_rented?: boolean;
    is_shared_warehouse?: boolean;
    is_active?: boolean;
    ward_id?: string;
    province_id?: string;
    min_price?: number;
    max_price?: number;
    min_area?: number;
    max_area?: number;
    page?: number;
    limit?: number;
}