import { OrganizationRoleData } from '@/types/organization/organization_role.type'
import { AuthService } from '@/services/auth/auth.service'

const authService = new AuthService()
const API = process.env.NEXT_PUBLIC_API_URL

export class OrganizationRoleService {
   // Lấy thông tin role của organization
   async getOrganizationRole(access_token: string, organization_id: string) {
      try {
         const response = await fetch(`${API}/organizations/${organization_id}`, {
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
            throw new Error(data.message || 'Get organization role failed')
         }
      } catch (error) {
         console.error('Get organization role error:', error)
         throw error
      }
   }
}