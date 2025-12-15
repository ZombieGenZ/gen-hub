const API = process.env.NEXT_PUBLIC_API_URL

export class WarehouseTemplateService {
    async getWarehouseTemplates(token: string, search?: string) {
        try {
            const response = await fetch(`${API}/warehouse-templates?keywords=${search}`, {
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
                console.error('Get warehouse templates error:', data)
                throw new Error(data.message || 'Get warehouse templates failed')
            }
        } catch (error) {
            console.error('Get warehouse templates error:', error)
            throw error
        }
    }
}