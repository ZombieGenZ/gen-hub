import { OrganizationRoleData } from '@/types/organization/organization_role.type'
import { AuthService } from '@/services/auth/auth.service'

const authService = new AuthService()
const API = process.env.NEXT_PUBLIC_API_URL

export class OrganizationRoleService {
   
   // Lấy thông tin role của organization
   async getOrganizationRole(access_token: string, organization_id: string) {
      const response = await fetch(`${API}/organizations/${organization_id}`, {
         method: 'GET',
         headers: {
            'Authorization': `Bearer ${access_token}`,
            'Content-Type': 'application/json'
         }
      });

      if (!response.ok) {
         const errorData = await response.json().catch(() => ({}));
         throw new Error(errorData.message || 'Failed to get organization role');
      }
      
      const data = await response.json();
      return data.data;
   }
}