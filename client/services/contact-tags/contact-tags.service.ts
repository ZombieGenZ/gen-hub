import { ContactTag, CreateContactTagDto, UpdateContactTagDto, QueryContactTagDto } from "@/types/contact/contact-tag.type";

const API = process.env.NEXT_PUBLIC_API_URL;

export class ContactTagsService {
    /**
     * Get all contact tags with pagination and filtering
     */
    async getAll(access_token: string, query: QueryContactTagDto = {}) {
        try {
            const queryParams = new URLSearchParams();
            if (query.page) queryParams.append('page', query.page.toString());
            if (query.limit) queryParams.append('limit', query.limit.toString());
            if (query.search) queryParams.append('search', query.search);
            if (query.is_active !== undefined) queryParams.append('is_active', query.is_active.toString());


            const response = await fetch(`${API}/admin/contact-tags?${queryParams.toString()}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to fetch contact tags');
            }
            return await response.json();
        } catch (err) {
            console.error("Failed to fetch contact tags", err);
            throw err;
        }
    }

    /**
     * Get contact tag by ID
     */
    async getById(access_token: string, id: string) {
        try {
            const response = await fetch(`${API}/admin/contact-tags/${id}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch contact tag');
            }
            return await response.json();
        } catch (err) {
            console.error("Failed to fetch contact tag", err);
            throw err;
        }
    }

    /**
     * Create new contact tag
     */
    async create(access_token: string, data: CreateContactTagDto) {
        try {
            const response = await fetch(`${API}/admin/contact-tags`, {
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
                    : errorData.message || 'Failed to create contact tag';
                throw new Error(errorMessage);
            }
            return await response.json();
        } catch (err) {
            console.error("Failed to create contact tag", err);
            throw err;
        }
    }

    /**
     * Update contact tag
     */
    async update(access_token: string, id: string, data: UpdateContactTagDto) {
        try {
            const response = await fetch(`${API}/admin/contact-tags/${id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to update contact tag');
            }
            return await response.json();
        } catch (err) {
            console.error("Failed to update contact tag", err);
            throw err;
        }
    }

    /**
     * Delete contact tag
     */
    async delete(access_token: string, id: string) {
        try {
            const response = await fetch(`${API}/admin/contact-tags/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to delete contact tag');
            }
            return await response.json();
        } catch (err) {
            console.error("Failed to delete contact tag", err);
            throw err;
        }
    }
}
