import { UpdateUserRequest, UserData, ChangePasswordRequest, User } from "@/types/user/user.type"
import { authStorage } from "@/services/auth/auth-storage.service"
import { AuthService } from "@/services/auth/auth.service"

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
}

const API = process.env.NEXT_PUBLIC_API_URL

export class UserService {
   private readonly authService = new AuthService();

   /**
    * Lấy thông tin user
    * @param access_token Token truy cập
    * @param refresh_token Refresh token
    * @returns Thông tin user
    */
   async getUser(access_token: string, refresh_token: string): Promise<UserData> {
      const response = await fetch(`${API}/account/profile`, {
         headers: {
            'Authorization': `Bearer ${access_token}`,
            'x-refresh-token': refresh_token
         }
      });

      if (!response.ok) {
         if (response.status === 401) {
            try {
               await this.authService.getNewToken(refresh_token);
               const newAccess = authStorage.getAccessToken();
               const newRefresh = authStorage.getRefreshToken();
               if (newAccess && newRefresh) {
                  return this.getUser(newAccess, newRefresh);
               }
            } catch {
               console.error('Failed to refresh token, falling through to throw error');
            }
         }
         const errorData = await response.json().catch(() => ({}));
         throw new Error(errorData.message || 'Failed to fetch user data');
      }
      
      const data = await response.json();

      // kiểm tra xác minh
      await authStorage.setEmailVerified(data.data.user.email_confirmed);
      console.log(data)
      return data.data;
   }

   // Cập nhật thông tin user
   async updateUser(token: string, newInfo: UpdateUserRequest): Promise<UserData> {
      const response = await fetch(`${API}/account/profile`, {
         method: 'PATCH',
         headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
         },
         body: JSON.stringify(newInfo),
      });

      if (!response.ok) {
         const errorData = await response.json().catch(() => ({}));
         throw new Error(errorData.message || 'Failed to update user profile');
      }
      
      return response.json();
   }

   //Thay đổi mật khẩu
   async change_password(token: string, newInfo: ChangePasswordRequest) {
      const response = await fetch(`${API}/account/change-password`, {
         method: 'POST',
         headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
         },
         body: JSON.stringify(newInfo),
      });

      if (!response.ok) {
         const errorData = await response.json().catch(() => ({}));
         throw new Error(errorData.message || 'Failed to change password');
      }
      
      const data = await response.json();
      
      // If logging out all devices, clear the current session as well
      if (newInfo.logout_all_devices) {
         authStorage.clearTokens();
      }
      
      return data;
   }
   
   // Bật xác thực 2fa
   async enableTwoFactor(token: string, access_verification_token: string) {
      const response = await fetch(`${API}/2fa/setup`, {
         method: 'POST',
         headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'x-access-verification-token': access_verification_token
         },
      });

      if (!response.ok) {
         const errorData = await response.json().catch(() => ({}));
         throw new Error(errorData.message || 'Failed to enable 2FA');
      }
      
      return response.json();
   }

   /**
    * Xác minh secret code verify set up
    * @param access_token Token truy cập
    * @param access_verification_token Token xác minh truy cập
    * @param twoFactorCode Mã 2FA
    * @returns Kết quả xác minh
    */
   async verifySetUp(access_token: string, access_verification_token: string, twoFactorCode: string) {
      const response = await fetch(`${API}/2fa/verify-setup`, {
         method: 'POST',
         headers: {
            'Authorization': `Bearer ${access_token}`,
            'Content-Type': 'application/json',
            'x-access-verification-token': access_verification_token
         },
         body: JSON.stringify({ two_factor_code: twoFactorCode }),
      })

      if (!response.ok) {
         const errorData = await response.json().catch(() => ({}));
         throw new Error(errorData.message || 'Failed to verify 2FA');
      }
      
      return response.json();
   }

   /**
    * Tắt xác thực 2fa
    * @param token Token truy cập
    * @param access_verification_token Token xác minh truy cập
    * @returns Kết quả tắt 2FA
    */
   async disableTwoFactor(token: string, access_verification_token: string) {
      const response = await fetch(`${API}/2fa/disable`, {
         method: 'POST',
         headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'x-access-verification-token': access_verification_token
         },
      });

      if (!response.ok) {
         const errorData = await response.json().catch(() => ({}));
         throw new Error(errorData.message || 'Failed to disable 2FA');
      }
      
      return response.json();
   }
   /**
    * Tìm kiếm user
    */
   async searchUsers(token: string, keyword: string): Promise<User[]> {
      const searchParams = new URLSearchParams();
      searchParams.append('keywords', keyword);
      // Giới hạn kết quả trả về
      searchParams.append('limit', '20'); 
      
      const response = await fetch(`${API}/admin/users?${searchParams.toString()}`, {
         headers: {
            'Authorization': `Bearer ${token}`
         }
      });

      if (!response.ok) {
         // Fallback to empty list if endpoint doesn't allow search or fails
         console.warn('Search users failed');
         return [];
      }
      
      const data = await response.json();
      return data.data.items || data.data || [];
   }

   /**
    * Lấy danh sách user theo role (nếu có endpoint)
    * Tạm thời dùng search
    */
   async getUsersByRole(token: string, role: string): Promise<User[]> {
       // TODO: Implement real endpoint if available. 
       // For now, we return empty or implement a filter if search supports it.
       return [];
   }
}