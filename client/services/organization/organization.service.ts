const API = process.env.NEXT_PUBLIC_API_URL;

export class OrganizationService {
    async getOrganizations(token: string, params: {
        keywords?: string;
        is_active?: boolean;
        page?: number;
        limit?: number;
    } = {}) {
        try {
            const query = new URLSearchParams();

            if (params.keywords) query.append('keywords', params.keywords);
            if (params.is_active !== undefined) query.append('is_active', String(params.is_active));
            if (params.page) query.append('page', String(params.page));
            if (params.limit) query.append('limit', String(params.limit));

            const response = await fetch(`${API}/organizations?${query.toString()}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to fetch organizations');
            }

            const data = await response.json();
            return data;
        }
        catch(err) {
            console.error("Failed to fetch organizations", err);
        }
    }

    // Lấy thông tin organization theo ID
    async getOrganizationById(token: string, id: string) {
        try {
            const response = await fetch(`${API}/organizations/${id}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });
            if(!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to fetch organization by id');
            }
            const data = await response.json();
            return data;
        }
        catch(err) {
            console.error("Failed to fetch organization by id", err);
        }
    }
}