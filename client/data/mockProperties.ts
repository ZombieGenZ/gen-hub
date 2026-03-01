export interface Property {
    id: string;
    // UI Fields
    title: string;
    price: number;
    currency: string;
    area: number; // m2
    type: string;
    address: string;
    image: string;
    lat: number;
    lng: number;
    
    // DB Warehouse Fields (Mapped)
    name?: string;
    description?: string;
    is_active?: boolean;
    is_deleted?: boolean;
    organization_id?: string;
    address_detail?: string;
    ward_id?: string;
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
    
    length?: number;
    width?: number;
    
    block_length?: number;
    block_width?: number;
    
    ceiling_height?: number;
    total_weight_capacity?: number;
    
    price_per_month?: number;
    
    qc_warehouse_id?: string;
    created_at?: string;
    updated_at?: string;
    created_by?: string;

    // Filters & UI Helpers
    is_cold_storage?: boolean;
    is_shared_warehouse?: boolean;
    province_name?: string;
    electricity?: string;
    
    // B2B Demo Fields
    power_type?: string;
    pccc_level?: string;
    floor_load?: string;
    container_access?: boolean;

    // API Images
    images?: { id: string; url: string; order: number }[];
    // API Amenities
    amenities?: { id: string; name: string; icon?: string; description?: string }[];
    // Rental status
    rental_status?: string;

    // Manager info
    manager_name?: string;
    manager_phone?: string;
    manager_email?: string;

    // Rows (for partial rental)
    rows?: {
        id: string;
        name: string;
        code: string;
        description?: string;
        is_rented: boolean;
        price_per_month: number;
        total_weight_capacity?: number;
        is_active: boolean;
    }[];
}

/**
 * Map raw API warehouse template response → Property interface
 */
export function mapWarehouseToProperty(w: any): Property {
    const provinceName = w.ward?.district?.province?.name || '';
    const districtName = w.ward?.district?.name || '';
    const wardName = w.ward?.name || '';
    const fullAddress = [wardName, districtName, provinceName].filter(Boolean).join(', ');

    // Determine type
    let type = 'Kho Thường';
    if (w.is_cold_storage) type = 'Kho Mát';
    else if (w.is_shared_warehouse) type = 'Fulfillment';

    // Get first image URL
    const sortedImages = (w.images || []).sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
    const firstImage = sortedImages[0]?.url || '';

    return {
        id: w.id,
        title: w.name || '',
        name: w.name,
        description: w.description,
        price: Number(w.price_per_month) || 0,
        price_per_month: Number(w.price_per_month) || 0,
        currency: 'VND',
        area: (Number(w.length) || 0) * (Number(w.width) || 0),
        type,
        address: fullAddress || w.address_detail || '',
        address_detail: w.address_detail,
        image: firstImage,
        images: sortedImages,
        lat: Number(w.latitude) || 10.85,
        lng: Number(w.longitude) || 106.75,
        length: Number(w.length) || 0,
        width: Number(w.width) || 0,
        block_length: Number(w.block_length) || 0,
        block_width: Number(w.block_width) || 0,
        ceiling_height: Number(w.ceiling_height) || undefined,
        total_weight_capacity: Number(w.total_weight_capacity) || undefined,
        is_active: w.is_active,
        is_shared_warehouse: w.is_shared_warehouse,
        ward_id: w.ward_id,
        ward: w.ward,
        province_name: provinceName,
        rental_status: w.rental_status,
        amenities: w.amenities?.map((a: any) => ({
            id: a.amenity?.id || a.id,
            name: a.amenity?.name || a.name,
            icon: a.amenity?.icon || a.icon,
            description: a.amenity?.description || a.description,
        })) || [],
        created_at: w.created_at,
        updated_at: w.updated_at,
        created_by: w.created_by,

        // Manager
        manager_name: w.manager_name,
        manager_phone: w.manager_phone,
        manager_email: w.manager_email,


        // Rows
        rows: (w.rows || []).filter((r: any) => !r.is_deleted).map((r: any) => ({
            id: r.id,
            name: r.name,
            code: r.code,
            description: r.description,
            is_rented: r.is_rented ?? false,
            price_per_month: Number(r.price_per_month) || 0,
            total_weight_capacity: r.total_weight_capacity != null ? Number(r.total_weight_capacity) : undefined,
            is_active: r.is_active ?? true,
        })),
    };
}
