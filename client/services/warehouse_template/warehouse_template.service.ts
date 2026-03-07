import { CreateBlockTemplateRequest, UpdateBlockTemplateRequest, DeleteBlockTemplateRequest, DeleteManyBlockTemplateRequest } from '@/types/warehoue_template/block_warehouse_template.type';
import { CreateRackTemplateRequest, UpdateRackTemplateRequest, DeleteRackTemplateRequest, DeleteManyRackTemplateRequest } from '@/types/warehoue_template/rack_warehouse_template.type';
import { CreateRowTemplateRequest, UpdateRowTemplateRequest, DeleteRowTemplateRequest, DeleteManyRowTemplateRequest } from '@/types/warehoue_template/row_warehouse_template.type';
import { CreateShelfTemplateRequest, UpdateShelfTemplateRequest, DeleteShelfTemplateRequest, DeleteManyShelfTemplateRequest } from '@/types/warehoue_template/shelf_warehouse_template.type';
import { de } from 'date-fns/locale';

const API = process.env.NEXT_PUBLIC_API_URL

export class WarehouseTemplateService {

    // Lấy danh sách kho
    /**
     * Lấy danh sách kho
     * @param token Token truy cập
     * @param params Tham số lọc
     * @returns Danh sách kho
     */
    async getWarehouseTemplates(token: string, params: {
        keywords?: string;
        is_active?: boolean;
        rental_status?: string;
        province_id?: string;
        page?: number;
        limit?: number;
    } = {}) {
        const query = new URLSearchParams();

        if (params.keywords) query.append('keywords', params.keywords);
        if (params.is_active !== undefined) query.append('is_active', String(params.is_active));
        if (params.rental_status) query.append('rental_status', params.rental_status);
        if (params.province_id) query.append('province_id', params.province_id);

        // Pagination
        if (params.limit) query.append('limit', String(params.limit));
        if (params.page && params.page > 0) {
            const offset = (params.page - 1) * (params.limit || 10);
            query.append('offset', String(offset));
        }

        const response = await fetch(`${API}/warehouse-templates?${query.toString()}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to fetch warehouse templates');
        }
        
        const data = await response.json();
        console.log(data)
        return data.data;
    }

    // Lấy kho bằng ID
    /**
     * Lấy kho hàng bằng ID
     * @param token Token truy cập
     * @param id ID của kho hàng
     * @returns Thông tin kho hàng
     */
    async getWarehouseTemplateById(token: string, id: string) {
        const response = await fetch(`${API}/warehouse-templates/${id}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to fetch warehouse template details');
        }
        
        const data = await response.json();
        return data.data;
    }

    /**
     * Tạo mới template kho hàng
     * @param token Token truy cập
     * @param data Dữ liệu tạo mới
     * @returns Kết quả tạo mới
     */
    async createWarehouseTemplate(token: string, data: any) {
        const response = await fetch(`${API}/warehouse-templates`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to create warehouse template');
        }
        
        return await response.json();
    }

    /**
     * Cập nhật template kho hàng
     * @param token Token truy cập
     * @param id ID của template
     * @param data Dữ liệu cập nhật
     * @returns Kết quả cập nhật
     */
    async updateWarehouseTemplate(token: string, id: string, data: any) {
        const response = await fetch(`${API}/warehouse-templates/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to update warehouse template');
        }
        
        return await response.json();
    }

    /**
     * Xóa template kho hàng
     * @param token Token truy cập
     * @param id ID của template
     * @returns Kết quả xóa
     */
    async deleteWarehouseTemplate(token: string, id: string) {
        const response = await fetch(`${API}/warehouse-templates/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to delete warehouse template');
        }
        
        return await response.json();
    }

    // Lấy ảnh từng kho
    async getWarehouseImage(access_token: string, warehouse_id: string) {
        const response = await fetch(`${API}/warehouse-templates/${warehouse_id}/images`, {
            headers: {
                'Authorization': `Bearer ${access_token}`,
                'Content-Type': 'application/json',
            },
        })  

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to fetch warehouse template details');
        }

        const data = await response.json();
        return data;
    }

    // API Row warehouse
    /**
     * Lấy danh sách hàng trong kho
     * @param warehouse_id ID của kho
     * @param access_token Token truy cập
     * @returns Danh sách hàng trong kho
     */
    async getWarehouseRow(warehouse_id: string, access_token: string) {
        try {
            const response = await fetch(`${API}/warehouse-templates/${warehouse_id}/rows`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json',
                },
            })
            if(!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to fetch warehouse template details');
            }
            const data = await response.json();
            return data.data;
        }
        catch (err) {
            console.error("Failed to fetch warehouse row", err);
        }
    }

    // API Rack warehouse
    /**
     * Lấy danh sách cột trong hàng
     * @param row_id ID của hàng
     * @param warehouse_id ID của kho
     * @param access_token Token truy cập
     * @returns Danh sách cột trong hàng
     */
    async getWarehouseRack(row_id: string, warehouse_id: string, access_token: string) {
        try {
            const response = await fetch(`${API}/warehouse-templates/${warehouse_id}/rows/${row_id}/racks`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json',
                },
            })

            if(!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to fetch warehouse template details');
            }
            const data = await response.json();
            return data.data;
        }
        catch (err) {
            console.error("Failed to fetch warehouse rack", err);
        }
    }

    /**
     * Lấy danh sách hàng trong kho
     * @param rack_id ID của rack
     * @param row_id ID của hàng
     * @param warehouse_id ID của kho
     * @param access_token Token truy cập
     * @returns Danh sách hàng trong kho
     */
    // API Shelf warehouse

    async getWarehouseShelf(rack_id: string, row_id: string, warehouse_id: string, access_token: string) {
        try {
            const response = await fetch(`${API}/warehouse-templates/${warehouse_id}/rows/${row_id}/racks/${rack_id}/shelves`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json',
                },
            })

            if(!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to fetch warehouse template details');
            }
            const data = await response.json();
            return data.data;
        }
        catch (err) {
            console.error("Failed to fetch warehouse shelf", err);
        }
    }

    // API Block warehouse
    /**
     * Lấy danh sách khối trong hàng
     * @param shelves_id ID của hàng
     * @param rack_id ID của rack
     * @param row_id ID của hàng
     * @param warehouse_id ID của kho
     * @param access_token Token truy cập
     * @returns Danh sách khối trong hàng
     */
    async getWarehouseBlock(shelves_id: string, rack_id: string, row_id: string, warehouse_id: string, access_token: string) {
        try {
            const response = await fetch(`${API}/warehouse-templates/${warehouse_id}/rows/${row_id}/racks/${rack_id}/shelves/${shelves_id}/blocks`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json',
                },
            })

            if(!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to fetch warehouse template details');
            }

            const data = await response.json();
            return data.data;
        }
        catch (err) {
            console.error("Failed to fetch warehouse block", err);
        }
    }

    // ── Row CRUD ──
    async createRow(token: string, data: CreateRowTemplateRequest) {
        const payload = {
            name: data.name,
            code: data.code,
            price_per_month: data.price_per_month,
            is_active: data.is_active,
        };
        const response = await fetch(`${API}/warehouse-templates/${data.warehouse_template_id}/rows`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error('Failed to create row');
        return await response.json();
    }

    async updateRow(token: string, data: UpdateRowTemplateRequest) {
        const payload = {
            name: data.name,
            price_per_month: data.price_per_month,
            description: data.description,
        };
        const response = await fetch(`${API}/warehouse-templates/${data.warehouse_template_id}/rows/${data.row_template_id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error('Failed to update row');
        return await response.json();
    }

    async deleteRow(token: string, data: DeleteRowTemplateRequest) {
        const response = await fetch(`${API}/warehouse-templates/${data.warehouse_template_id}/rows/${data.row_template_id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        if (!response.ok) throw new Error('Failed to delete row');
        return await response.json();
    }

    async deleteManyRows(token: string, data: DeleteManyRowTemplateRequest) {
        const response = await fetch(`${API}/warehouse-templates/${data.warehouse_template_id}/rows/delete/many`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ids: data.ids }),
        });
        if (!response.ok) throw new Error('Failed to delete rows');
        return await response.json();
    }

    // ── Rack CRUD ──
    async createRack(token: string, data: CreateRackTemplateRequest) {
        const payload = {
            name: data.name,
            code: data.code,
            description: data.description,
        };
        const response = await fetch(`${API}/warehouse-templates/${data.warehouse_template_id}/rows/${data.row_template_id}/racks`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error('Failed to create rack');
        return await response.json();
    }

    async updateRack(token: string, data: UpdateRackTemplateRequest) {
        const payload = {
            name: data.name,
            description: data.description,
        };
        const response = await fetch(`${API}/warehouse-templates/${data.warehouse_template_id}/rows/${data.row_template_id}/racks/${data.rack_template_id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error('Failed to update rack');
        return await response.json();
    }

    async deleteRack(token: string, data: DeleteRackTemplateRequest) {
        const response = await fetch(`${API}/warehouse-templates/${data.warehouse_template_id}/rows/${data.row_template_id}/racks/${data.rack_template_id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        if (!response.ok) throw new Error('Failed to delete rack');
        return await response.json();
    }

    async deleteManyRacks(token: string, data: DeleteManyRackTemplateRequest) {
        const response = await fetch(`${API}/warehouse-templates/${data.warehouse_template_id}/rows/${data.row_template_id}/racks/delete/many`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ids: data.ids }),
        });
        if (!response.ok) throw new Error('Failed to delete racks');
        return await response.json();
    }

    // ── Shelf CRUD ──
    async createShelf(token: string, data: CreateShelfTemplateRequest) {
        const payload = {
            name: data.name,
            code: data.code,
        };
        const response = await fetch(`${API}/warehouse-templates/${data.warehouse_template_id}/rows/${data.row_template_id}/racks/${data.rack_template_id}/shelves`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error('Failed to create shelf');
        return await response.json();
    }

    async updateShelf(token: string, data: UpdateShelfTemplateRequest) {
        const payload = {
            name: data.name,
            description: data.description,
        };
        const response = await fetch(`${API}/warehouse-templates/${data.warehouse_template_id}/rows/${data.row_template_id}/racks/${data.rack_template_id}/shelves/${data.shelf_template_id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error('Failed to update shelf');
        return await response.json();
    }

    async deleteShelf(token: string, data: DeleteShelfTemplateRequest) {
        const response = await fetch(`${API}/warehouse-templates/${data.warehouse_template_id}/rows/${data.row_template_id}/racks/${data.rack_template_id}/shelves/${data.shelf_template_id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        if (!response.ok) throw new Error('Failed to delete shelf');
        return await response.json();
    }

    async deleteManyShelves(token: string, data: DeleteManyShelfTemplateRequest) {
        const response = await fetch(`${API}/warehouse-templates/${data.warehouse_template_id}/rows/${data.row_template_id}/racks/${data.rack_template_id}/shelves/delete/many`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ids: data.ids }),
        });
        if (!response.ok) throw new Error('Failed to delete shelves');
        return await response.json();
    }

    // ── Block CRUD ──
    async createBlock(token: string, data: CreateBlockTemplateRequest) {
        const payload = {
            name: data.name,
            code: data.code,
        };
        const response = await fetch(`${API}/warehouse-templates/${data.warehouse_template_id}/rows/${data.row_template_id}/racks/${data.rack_template_id}/shelves/${data.shelf_template_id}/blocks`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error('Failed to create block');
        return await response.json();
    }

    async updateBlock(token: string, data: UpdateBlockTemplateRequest) {
        const payload = {
            name: data.name,
            description: data.description,
        };
        const response = await fetch(`${API}/warehouse-templates/${data.warehouse_template_id}/rows/${data.row_template_id}/racks/${data.rack_template_id}/shelves/${data.shelf_template_id}/blocks/${data.block_template_id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error('Failed to update block');
        return await response.json();
    }

    async deleteBlock(token: string, data: DeleteBlockTemplateRequest) {
        const response = await fetch(`${API}/warehouse-templates/${data.warehouse_template_id}/rows/${data.row_template_id}/racks/${data.rack_template_id}/shelves/${data.shelf_template_id}/blocks/${data.block_template_id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        if (!response.ok) throw new Error('Failed to delete block');
        return await response.json();
    }

    async deleteManyBlocks(token: string, data: DeleteManyBlockTemplateRequest) {
        const response = await fetch(`${API}/warehouse-templates/${data.warehouse_template_id}/rows/${data.row_template_id}/racks/${data.rack_template_id}/shelves/${data.shelf_template_id}/blocks/delete/many`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ids: data.ids }),
        });
        if (!response.ok) throw new Error('Failed to delete blocks');
        return await response.json();
    }

    /**
     * Xóa nhiều template cùng lúc
     * @param token Token truy cập
     * @param ids Danh sách ID template cần xóa
     * @returns Kết quả xóa
     */
    async deleteManyWarehouseTemplates(token: string, ids: string[]) {
        const response = await fetch(`${API}/warehouse-templates/delete/many`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ids }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to delete warehouse templates');
        }

        return await response.json();
    }

    /**
     * Cập nhật toàn bộ layout (Rows -> Racks -> Shelves -> Blocks)
     * @param token Token truy cập
     * @param id ID template
     * @param data Layout data (UpsertLayoutDto)
     * @returns Kết quả cập nhật
     */
    async upsertLayout(token: string, id: string, data: { rows: any[] }) {
        const response = await fetch(`${API}/warehouse-templates/${id}/layout`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to update warehouse layout');
        }

        return await response.json();
    }

    /**
     * Upload nhiều ảnh cho template
     * @param token Token truy cập
     * @param id ID template
     * @param files Danh sách file ảnh
     * @returns Kết quả upload
     */
    async uploadImages(token: string, id: string, files: File[]) {
        const formData = new FormData();
        files.forEach((file) => {
            formData.append('images', file);
        });

        const response = await fetch(`${API}/warehouse-templates/${id}/images`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to upload images');
        }

        return await response.json();
    }

    /**
     * Xóa một ảnh
     * @param token Token truy cập
     * @param id ID template
     * @param imageId ID ảnh cần xóa
     * @returns Kết quả xóa
     */
    async deleteImage(token: string, id: string, imageId: string) {
        const response = await fetch(`${API}/warehouse-templates/${id}/images/${imageId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to delete image');
        }

        return await response.json();
    }

    /**
     * Xóa nhiều ảnh cùng lúc
     * @param token Token truy cập
     * @param id ID template
     * @param imageIds Danh sách ID ảnh cần xóa
     * @returns Kết quả xóa
     */
    async deleteManyImages(token: string, id: string, imageIds: string[]) {
        const response = await fetch(`${API}/warehouse-templates/${id}/images/delete/many`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ids: imageIds }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to delete images');
        }

        return await response.json();
    }

    /**
     * Sắp xếp lại thứ tự ảnh
     * @param token Token truy cập
     * @param id ID template
     * @param images Danh sách { id, order }
     * @returns Kết quả sắp xếp
     */
    async reorderImages(token: string, id: string, images: { id: string; order: number }[]) {
        const response = await fetch(`${API}/warehouse-templates/${id}/images/reorder`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ images }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to reorder images');
        }

        return await response.json();
    }
}

export const warehouseTemplateService = new WarehouseTemplateService();