import { OrganizationApiKeyData } from '@/types/organization/organization_api_key.type'

const API = process.env.NEXT_PUBLIC_API_URL

export class OrganizationApiKeyService {
   
   /**
    * Lấy thông tin API key của tổ chức
    * @param access_token Token truy cập
    * @param organization_id ID của tổ chức
    * @returns Thông tin API key của tổ chức hoặc null
    */
   async getOrganizationApiKey(access_token: string, organization_id: string): Promise<OrganizationApiKeyData | null> {
      try {
         const response = await fetch(`${API}/organizations/${organization_id}/api-key`, {
            method: 'GET',
            headers: {
               'Authorization': `Bearer ${access_token}`,
               'Content-Type': 'application/json'
            }
         })
         if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Lỗi khi lấy API key');
         }
         
         const data = await response.json();
         return data.data;
      } catch (error) {
         console.error('Get organization api key error:', error)
         throw error
      }
   }

   /**
    * Tạo mới hoặc làm mới API Key cho tổ chức
    */
   async generateApiKey(access_token: string, organization_id: string): Promise<OrganizationApiKeyData> {
      const response = await fetch(`${API}/organizations/${organization_id}/api-key`, {
         method: 'POST',
         headers: {
            'Authorization': `Bearer ${access_token}`,
            'Content-Type': 'application/json'
         }
      });
      if (!response.ok) throw new Error('Không thể tạo API key mới');
      const data = await response.json();
      return data.data;
   }

   /**
    * Thu hồi (vô hiệu hóa) API Key
    */
   async revokeApiKey(access_token: string, organization_id: string): Promise<void> {
      const response = await fetch(`${API}/organizations/${organization_id}/api-key`, {
         method: 'DELETE',
         headers: {
            'Authorization': `Bearer ${access_token}`,
         }
      });
      if (!response.ok) throw new Error('Không thể thu hồi API key');
   }
}