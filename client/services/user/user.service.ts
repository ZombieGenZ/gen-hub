import { UserData } from "@/types/user/user.type"

const API = process.env.NEXT_PUBLIC_API_URL

export class UserService {
   
   // Lấy thông tin user
   async getUser(token: string) {
      try {
         const response = await fetch(`${API}/account/profile`, {
            method: 'GET',
            headers: {
               'Authorization': `Bearer ${token}`,
               'Content-Type': 'application/json'
            }
         })
         const data = await response.json()
         if(data.success) {
            return data.data as UserData
         }
      } catch (error) {
         console.error('Get user error:', error)
         throw error
      }
   } 
   
   // Bật xác thực 2fa
   // trong class UserService
   async enableTwoFactor(token: string) {
      try {
         const response = await fetch(`${API}/account/2fa/enable`, {
            method: 'POST',
            headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            },
         })

         const data = await response.json()
         return data
      } catch (error) {
         console.error('Enable 2FA error:', error)
         throw error
      }
   }
}