import { OrganizationApiKeyData } from '@/types/organization/organization_api_key.type'

const API = process.env.NEXT_PUBLIC_API_URL

export class OrganizationApiKeyService {
   // Lấy thông tin api key của organization
   async getOrganizationApiKey(access_token: string, organization_id: string): Promise<OrganizationApiKeyData | null> {
      try {
         const response = await fetch(`${API}/organizations/${organization_id}/api-key`, {
            method: 'GET',
            headers: {
               'Authorization': `Bearer ${access_token}`,
               'Content-Type': 'application/json'
            }
         })
         const data = await response.json()
         if(data.success) {
            return data.data
         } else {
            throw new Error(data.message || 'Get organization api key failed')
         }
      } catch (error) {
         console.error('Get organization api key error:', error)
         throw error
      }
   }
}