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
   async getUser(access_token: string, refresh_token: string): Promise<UserData> {
      const response = await fetch(`${API}/account/profile`, {
         headers: {
            'Authorization': `Bearer ${access_token}`,
            'x-refresh-token': refresh_token
         }
      });

      if (!response.ok) {
         if (response.status === 401) {
            const newTokens = await this.refreshToken(refresh_token);
            if (newTokens) {
               authStorage.setTokens(newTokens.access_token, newTokens.refresh_token);
               return this.getUser(newTokens.access_token, newTokens.refresh_token);
            }
         }
         const errorData = await response.json().catch(() => ({}));
         throw new Error(errorData.message || 'Failed to fetch user data');
      }
      
      const data = await response.json();
      return data.data;
   }

   // Refresh access token using refresh token
   private async refreshToken(refreshToken: string): Promise<TokenResponse | null> {
      const response = await fetch(`${API}/auth/refresh-token`, {
         method: 'POST',
         headers: {
            'Content-Type': 'application/json',
         },
         body: JSON.stringify({ refresh_token: refreshToken })
      });

      if (!response.ok) {
         return null;
      }

      return response.json();
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

   // Tắt xác thực 2fa
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

   async verifyTwoFactor(token: string, secret: string, twoFactorCode: string) {
      const response = await fetch(`${API}/2fa/verify`, {
         method: 'POST',
         headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
         },
         body: JSON.stringify({ secret, code: twoFactorCode }),
      });

      if (!response.ok) {
         const errorData = await response.json().catch(() => ({}));
         throw new Error(errorData.message || 'Two-factor authentication failed');
      }
      
      return response.json();
   }
}