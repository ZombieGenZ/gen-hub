import { UpdateUserRequest, UserData, ChangePasswordRequest } from "@/types/user/user.type"
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

   //Thay đổi mật khẩu
   async change_password(token: string, newInfo: ChangePasswordRequest) {
      try {
         const response = await fetch(`${API}/account/change-password`, {
            method: 'POST',
            headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            },
            body: JSON.stringify(newInfo),
         })

         const data = await response.json()
         if (data.success) {
            if (newInfo.logout_all_devices) {
               await authService.logoutAllDevices(token)
            }
            return data
         } else {
            // để debug thêm nếu BE trả lỗi định dạng
            console.error('Change password failed:', data)
            throw new Error(data.message || 'Change password failed')
         }
      } catch (error) {
         console.error('Change password error:', error)
         throw error
      }
   }
   
   // Bật xác thực 2fa
   // trong class UserService ( hiện chưa hoàn thiện )
   async enableTwoFactor(token: string, access_verification_token: string) {
      try {
         const response = await fetch(`${API}/2fa/setup`, {
            method: 'POST',
            headers: {
               Authorization: `Bearer ${token}`,
               'Content-Type': 'application/json',
               'x-access-verification-token': access_verification_token
            },
         })

         const data = await response.json()
         if (data.success) {
            return data
         } else {
            // để debug thêm nếu BE trả lỗi định dạng
            console.error('Enable 2FA failed:', data)
            throw new Error(data.message || 'Enable 2FA failed')
         }
      } catch (error) {
         console.error('Enable 2FA error:', error)
         throw error
      }
   }

   // Tắt xác thực 2fa
   // trong class UserService ( hiện chưa hoàn thiện )
   async disableTwoFactor(token: string, access_verification_token: string) {
      try {
         const response = await fetch(`${API}/2fa/disable`, {
            method: 'POST',
            headers: {
               Authorization: `Bearer ${token}`,
               'Content-Type': 'application/json',
               'x-access-verification-token': access_verification_token
            },
         })

         const data = await response.json()
         if (data.success) {
            return data
         } else {
            // để debug thêm nếu BE trả lỗi định dạng
            console.error('Disable 2FA failed:', data)
            throw new Error(data.message || 'Disable 2FA failed')
         }
      } catch (error) {
         console.error('Disable 2FA error:', error)
         throw error
      }
   }
}