import { UpdateUserRequest, UserData } from "@/types/user/user.type"
import { AuthService } from "../auth/auth.service"

const authService = new AuthService()
const API = process.env.NEXT_PUBLIC_API_URL

export class UserService {
   
   // Lấy thông tin user
   async getUser(token: string, refresh_token: string): Promise<UserData | null> {
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
         } else {
            const response = await authService.getNewToken(refresh_token)
            localStorage.setItem('access_token', response.authorization.access_token)
            localStorage.setItem('refresh_token', response.authorization.refresh_token)
            return await this.getUser(response.authorization.access_token, response.authorization.refresh_token)
         }
      } catch (error) {
         console.error('Get user error:', error)
         throw error
      }
   } 

   // Cập nhật thông tin user
   // Mới: gửi trực tiếp các field, không bọc newInfo
   async updateUser(token: string, newInfo: UpdateUserRequest): Promise<UserData | null> {
   try {
      const response = await fetch(`${API}/account/profile`, {
         method: 'PATCH',
         headers: {
         'Authorization': `Bearer ${token}`,
         'Content-Type': 'application/json',
         },
         body: JSON.stringify(newInfo),
      })

      const data = await response.json()
      if (data.success) {
         return data
      } else {
         // để debug thêm nếu BE trả lỗi định dạng
         console.error('Update user failed:', data)
         throw new Error(data.message || 'Update user failed')
      }
   } catch (error) {
      console.error('Update user error:', error)
      throw error
   }
   }
   
   // Bật xác thực 2fa
   // trong class UserService ( hiện chưa hoàn thiện )
   async enableTwoFactor(token: string): Promise<UserData | null> {
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