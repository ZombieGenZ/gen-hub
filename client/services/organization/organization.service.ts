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

            // Pagination
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
                throw new Error('Failed to fetch organizations');
            }

            const data = await response.json();
            if (data.success == true) {
                return data.data;
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error('Error fetching organizations:', error);
            throw error;
        }
    }
}