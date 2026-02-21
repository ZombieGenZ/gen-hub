import { ContactListEntry, CreateContactListDto, UpdateContactListDto, QueryContactListDto } from "@/types/contact/contact-list.type";

const API = process.env.NEXT_PUBLIC_API_URL;

export class ContactListService {
    /**
     * Get all contact list entries with pagination and filtering
     * @param access_token Token xác thực
     * @param query Các tham số lọc
     * @returns Danh sách entries
     */
    async getAll(access_token: string, query: QueryContactListDto = {}) {
        try {
            const queryParams = new URLSearchParams();
            if (query.page) queryParams.append('page', query.page.toString());
            if (query.limit) queryParams.append('limit', query.limit.toString());
            if (query.search) queryParams.append('search', query.search);
            if (query.list_type) queryParams.append('list_type', query.list_type);
            if (query.match_type) queryParams.append('match_type', query.match_type);
            if (query.is_active !== undefined) queryParams.append('is_active', query.is_active.toString());


            const response = await fetch(`${API}/admin/contact-list?${queryParams.toString()}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to fetch contact list');
            }
            return await response.json();
        } catch (err) {
            console.error("Failed to fetch contact list", err);
            throw err;
        }
    }

    /**
     * Get contact list entry by ID
     * @param access_token Token xác thực
     * @param id ID entry
     * @returns Entry
     */
    async getById(access_token: string, id: string) {
        try {
            const response = await fetch(`${API}/admin/contact-list/${id}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch contact list entry');
            }
            return await response.json();
        } catch (err) {
            console.error("Failed to fetch contact list entry", err);
            throw err;
        }
    }

    /**
     * Create new contact list entry
     * @param access_token Token xác thực
     * @param data Dữ liệu entry
     * @returns Entry đã tạo
     */
    async create(access_token: string, data: CreateContactListDto) {
        try {
            const response = await fetch(`${API}/admin/contact-list`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.errors 
                    ? `${errorData.message}: ${errorData.errors.map((e: any) => e.message).join(', ')}`
                    : errorData.message || 'Failed to create contact list entry';
                throw new Error(errorMessage);
            }
            return await response.json();
        } catch (err) {
            console.error("Failed to create contact list entry", err);
            throw err;
        }
    }

    /**
     * Update contact list entry
     * @param access_token Token xác thực
     * @param id ID entry
     * @param data Dữ liệu entry
     * @returns Entry đã cập nhật
     */
    async update(access_token: string, id: string, data: UpdateContactListDto) {
        try {
            const response = await fetch(`${API}/admin/contact-list/${id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to update contact list entry');
            }
            return await response.json();
        } catch (err) {
            console.error("Failed to update contact list entry", err);
            throw err;
        }
    }

    /**
     * Delete contact list entry
     */
    async delete(access_token: string, id: string) {
        try {
            const response = await fetch(`${API}/admin/contact-list/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to delete contact list entry');
            }
            return await response.json();
        } catch (err) {
            console.error("Failed to delete contact list entry", err);
            throw err;
        }
    }
}
