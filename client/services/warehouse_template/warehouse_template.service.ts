import { CreateBlockTemplateRequest, UpdateBlockTemplateRequest, DeleteBlockTemplateRequest, DeleteManyBlockTemplateRequest } from '@/types/warehoue_template/block_warehouse_template.type';
import { CreateRackTemplateRequest, UpdateRackTemplateRequest, DeleteRackTemplateRequest, DeleteManyRackTemplateRequest } from '@/types/warehoue_template/rack_warehouse_template.type';
import { CreateRowTemplateRequest, UpdateRowTemplateRequest, DeleteRowTemplateRequest, DeleteManyRowTemplateRequest } from '@/types/warehoue_template/row_warehouse_template.type';
import { CreateShelfTemplateRequest, UpdateShelfTemplateRequest, DeleteShelfTemplateRequest, DeleteManyShelfTemplateRequest } from '@/types/warehoue_template/shelf_warehouse_template.type';

const API = process.env.NEXT_PUBLIC_API_URL

export class WarehouseTemplateService {

    /**
     * Lấy danh sách kho
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
            throw new Error(errorData.message || 'Không thể lấy danh sách kho');
        }
        
        const res = await response.json();
        return res.data;
    }

    /**
     * Lấy kho hàng bằng ID
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
            throw new Error(errorData.message || 'Không thể lấy chi tiết kho');
        }
        
        const res = await response.json();
        return res.data;
    }

    /**
     * Tạo mới template kho hàng
     */
    async createWarehouseTemplate(token: string, data: unknown) {
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
            throw new Error(errorData.message || 'Không thể tạo kho mới');
        }
        
        const res = await response.json();
        return res.data;
    }

    /**
     * Cập nhật template kho hàng
     */
    async updateWarehouseTemplate(token: string, id: string, data: unknown) {
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
            throw new Error(errorData.message || 'Không thể cập nhật thông tin kho');
        }
        
        const res = await response.json();
        return res.data;
    }

    /**
     * Xóa template kho hàng
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
            throw new Error(errorData.message || 'Không thể xóa kho');
        }
        
        const res = await response.json();
        return res.data;
    }

    /**
     * Lấy danh sách ảnh của kho
     */
    async getWarehouseImage(access_token: string, warehouse_id: string) {
        const response = await fetch(`${API}/warehouse-templates/${warehouse_id}/images`, {
            headers: {
                'Authorization': `Bearer ${access_token}`,
                'Content-Type': 'application/json',
            },
        })  

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy danh sách ảnh');
        }

        const res = await response.json();
        return res.data;
    }

    // API Row warehouse
    async getWarehouseRow(warehouse_id: string, access_token: string) {
        const response = await fetch(`${API}/warehouse-templates/${warehouse_id}/rows`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${access_token}`,
                'Content-Type': 'application/json',
            },
        })
        if(!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy danh sách dãy (rows)');
        }
        const res = await response.json();
        return res.data;
    }

    // API Rack warehouse
    async getWarehouseRack(row_id: string, warehouse_id: string, access_token: string) {
        const response = await fetch(`${API}/warehouse-templates/${warehouse_id}/rows/${row_id}/racks`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${access_token}`,
                'Content-Type': 'application/json',
            },
        })

        if(!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy danh sách kệ (racks)');
        }
        const res = await response.json();
        return res.data;
    }

    // API Shelf warehouse
    async getWarehouseShelf(rack_id: string, row_id: string, warehouse_id: string, access_token: string) {
        const response = await fetch(`${API}/warehouse-templates/${warehouse_id}/rows/${row_id}/racks/${rack_id}/shelves`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${access_token}`,
                'Content-Type': 'application/json',
            },
        })

        if(!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy danh sách tầng (shelves)');
        }
        const res = await response.json();
        return res.data;
    }

    // API Block warehouse
    async getWarehouseBlock(shelves_id: string, rack_id: string, row_id: string, warehouse_id: string, access_token: string) {
        const response = await fetch(`${API}/warehouse-templates/${warehouse_id}/rows/${row_id}/racks/${rack_id}/shelves/${shelves_id}/blocks`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${access_token}`,
                'Content-Type': 'application/json',
            },
        })

        if(!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy danh sách ô (blocks)');
        }

        const res = await response.json();
        return res.data;
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
        if (!response.ok) throw new Error('Không thể tạo dãy mới');
        const res = await response.json();
        return res.data;
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
        if (!response.ok) throw new Error('Không thể cập nhật thông tin dãy');
        const res = await response.json();
        return res.data;
    }

    async deleteRow(token: string, data: DeleteRowTemplateRequest) {
        const response = await fetch(`${API}/warehouse-templates/${data.warehouse_template_id}/rows/${data.row_template_id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        if (!response.ok) throw new Error('Không thể xóa dãy');
        const res = await response.json();
        return res.data;
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
        if (!response.ok) throw new Error('Không thể xóa các dãy đã chọn');
        const res = await response.json();
        return res.data;
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
        if (!response.ok) throw new Error('Không thể tạo kệ mới');
        const res = await response.json();
        return res.data;
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
        if (!response.ok) throw new Error('Không thể cập nhật thông tin kệ');
        const res = await response.json();
        return res.data;
    }

    async deleteRack(token: string, data: DeleteRackTemplateRequest) {
        const response = await fetch(`${API}/warehouse-templates/${data.warehouse_template_id}/rows/${data.row_template_id}/racks/${data.rack_template_id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        if (!response.ok) throw new Error('Không thể xóa kệ');
        const res = await response.json();
        return res.data;
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
        if (!response.ok) throw new Error('Không thể xóa các kệ đã chọn');
        const res = await response.json();
        return res.data;
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
        if (!response.ok) throw new Error('Không thể tạo tầng mới');
        const res = await response.json();
        return res.data;
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
        if (!response.ok) throw new Error('Không thể cập nhật thông tin tầng');
        const res = await response.json();
        return res.data;
    }

    async deleteShelf(token: string, data: DeleteShelfTemplateRequest) {
        const response = await fetch(`${API}/warehouse-templates/${data.warehouse_template_id}/rows/${data.row_template_id}/racks/${data.rack_template_id}/shelves/${data.shelf_template_id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        if (!response.ok) throw new Error('Không thể xóa tầng');
        const res = await response.json();
        return res.data;
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
        if (!response.ok) throw new Error('Không thể xóa các tầng đã chọn');
        const res = await response.json();
        return res.data;
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
        if (!response.ok) throw new Error('Không thể tạo ô mới');
        const res = await response.json();
        return res.data;
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
        if (!response.ok) throw new Error('Không thể cập nhật thông tin ô');
        const res = await response.json();
        return res.data;
    }

    async deleteBlock(token: string, data: DeleteBlockTemplateRequest) {
        const response = await fetch(`${API}/warehouse-templates/${data.warehouse_template_id}/rows/${data.row_template_id}/racks/${data.rack_template_id}/shelves/${data.shelf_template_id}/blocks/${data.block_template_id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        if (!response.ok) throw new Error('Không thể xóa ô');
        const res = await response.json();
        return res.data;
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
        if (!response.ok) throw new Error('Không thể xóa các ô đã chọn');
        const res = await response.json();
        return res.data;
    }

    /**
     * Xóa nhiều template cùng lúc
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
            throw new Error(errorData.message || 'Không thể xóa các kho đã chọn');
        }

        const res = await response.json();
        return res.data;
    }

    /**
     * Cập nhật toàn bộ layout (Rows -> Racks -> Shelves -> Blocks)
     */
    async upsertLayout(token: string, id: string, data: { rows: unknown[] }) {
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
            throw new Error(errorData.message || 'Không thể cập nhật layout kho');
        }

        const res = await response.json();
        return res.data;
    }

    /**
     * Upload nhiều ảnh cho template
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
            throw new Error(errorData.message || 'Không thể tải ảnh lên');
        }

        const res = await response.json();
        return res.data;
    }

    /**
     * Xóa một ảnh
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
            throw new Error(errorData.message || 'Không thể xóa ảnh');
        }

        const res = await response.json();
        return res.data;
    }

    /**
     * Xóa nhiều ảnh cùng lúc
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
            throw new Error(errorData.message || 'Không thể xóa các ảnh đã chọn');
        }

        const res = await response.json();
        return res.data;
    }

    /**
     * Sắp xếp lại thứ tự ảnh
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
            throw new Error(errorData.message || 'Không thể sắp xếp lại ảnh');
        }

        const res = await response.json();
        return res.data;
    }
}

export const warehouseTemplateService = new WarehouseTemplateService();
