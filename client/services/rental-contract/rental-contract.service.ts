const API = process.env.NEXT_PUBLIC_API_URL

export class RentalContractService {
    async getRentalContracts(token: string, params: {
        keywords?: string;
        status?: string;
        organization_id?: string;
        page?: number;
        limit?: number;
    } = {}) {
        try {
            const query = new URLSearchParams();

            if (params.keywords) query.append('keywords', params.keywords);
            if (params.status && params.status !== 'all') query.append('status', params.status);
            if (params.organization_id) query.append('organization_id', params.organization_id);

            // Pagination
            if (params.limit) query.append('limit', String(params.limit));
            if (params.page && params.page > 0) {
                const offset = (params.page - 1) * (params.limit || 10);
                query.append('offset', String(offset));
            }

            const response = await fetch(`${API}/rental-contracts?${query.toString()}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            })
            const data = await response.json()
            if (data.success) {
                return data.data
            } else {
                console.error('Get rental contracts error:', data)
                throw new Error(data.message || 'Get rental contracts failed')
            }
        } catch (error) {
            console.error('Get rental contracts error:', error)
            throw error
        }
    }

    async getRentalContractById(token: string, id: string) {
        try {
            const response = await fetch(`${API}/rental-contracts/${id}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            })
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Two-factor authentication failed');
            }
            
            return response.json();
        } catch (error) {
            console.error('Get rental contract detail error:', error)
            throw error
        }
    }
}

export const rentalContractService = new RentalContractService();
