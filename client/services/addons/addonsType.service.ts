const API = process.env.NEXT_PUBLIC_API_URL;

export class AddonsTypeService {

    // Lấy tất cả addons type
    async getAllAddonsType(access_token: string) {
        try {
            const response = await fetch(`${API}/addon-types`, {
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                }
            });
            if(!response.ok) {
                throw new Error('Failed to fetch addons type');
            }
            const data = await response.json();
            return data;
        }
        catch(err) {
            console.error("Failed to fetch addons type", err);
        }
    }

    // Lấy addons type theo ID
    async getAddonsTypeById(access_token: string, id: string) {
        try {
            const response = await fetch(`${API}/addon-types/${id}`, {
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                }
            });
            if(!response.ok) {
                throw new Error('Failed to fetch addons type by id');
            }
            const data = await response.json();
            return data;
        }
        catch(err) {
            console.error("Failed to fetch addons type by id", err);
        }
    }

    // Lấy addons type theo active
    async getAddonsTypeActive(access_token: string) {
        try {
            const response = await fetch(`${API}/addon-types/active`, {
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                }
            });
            if(!response.ok) {
                throw new Error('Failed to fetch addons type active');
            }
            const data = await response.json();
            return data;
        }
        catch(err) {
            console.error("Failed to fetch addons type active", err);
        }
    }
}