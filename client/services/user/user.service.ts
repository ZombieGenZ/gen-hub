import { UpdateUserRequest, UserData, ChangePasswordRequest } from "@/types/user/user.type"
import { authStorage } from "@/services/auth/auth-storage.service"
import { AuthService } from "../auth/auth.service"

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
}

const API = process.env.NEXT_PUBLIC_API_URL

export class UserService {
   
   // Lấy thông tin user
   async getUser(access_token: string, refresh_token: string): Promise<UserData | null> {
      try {
         const response = await fetch(`${API}/account/profile`, {
            headers: {
               'Authorization': `Bearer ${access_token}`,
               'x-refresh-token': refresh_token
            }
         })

         if (!response.ok) {
            if (response.status === 401) {
               const newTokens = await this.refreshToken(refresh_token)
               if (newTokens) {
                  authStorage.setTokens(newTokens.access_token, newTokens.refresh_token)
                  return this.getUser(newTokens.access_token, newTokens.refresh_token)
               }
               return null
            }
            throw new Error('Failed to fetch user data')
         }
         const data = await response.json()
         return data.data
      } catch (error) {
         console.error('Error fetching user data:', error)
         return null
      }
   }

   // Refresh access token using refresh token
   private async refreshToken(refreshToken: string): Promise<TokenResponse | null> {
      try {
         const response = await fetch(`${API}/auth/refresh-token`, {
            method: 'POST',
            headers: {
               'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refresh_token: refreshToken })
         })

         if (!response.ok) {
            return null
         }

         return await response.json()
      } catch (error) {
         console.error('Error refreshing token:', error)
         return null
      }
   }

   // Cập nhật thông tin user
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
            // If logging out all devices, clear the current session as well
            if (newInfo.logout_all_devices) {
               authStorage.clearTokens()
            }
            return data
         } else {
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

   async verifyTwoFactor(token: string, secret: string, twoFactorCode: string) {

   }
}