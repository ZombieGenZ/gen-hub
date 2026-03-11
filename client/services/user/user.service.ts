import { UpdateUserRequest, UserData, ChangePasswordRequest, User } from "@/types/user/user.type"
import { authStorage } from "@/services/auth/auth-storage.service"
import { AuthService } from "@/services/auth/auth.service"

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
}

const API = process.env.NEXT_PUBLIC_API_URL

let cachedProfile: UserData | null = null;
let cachedAccessToken: string | null = null;
let cachedRefreshToken: string | null = null;
let inFlightProfilePromise: Promise<UserData> | null = null;
let inFlightAccessToken: string | null = null;
let inFlightRefreshToken: string | null = null;

function cacheUserProfile(profile: UserData, accessToken: string, refreshToken: string) {
  cachedProfile = profile;
  cachedAccessToken = accessToken;
  cachedRefreshToken = refreshToken;
  authStorage.setUserID(profile.user.id);
}

function clearUserProfileCache() {
  cachedProfile = null;
  cachedAccessToken = null;
  cachedRefreshToken = null;
}

function hasMatchingCache(accessToken: string, refreshToken: string) {
  return cachedProfile && cachedAccessToken === accessToken && cachedRefreshToken === refreshToken;
}

export function invalidateUserProfileCache() {
  clearUserProfileCache();
}

export class UserService {
   private readonly authService = new AuthService();

   /**
    * Lấy thông tin user
    * @param access_token Token truy cập
    * @param refresh_token Refresh token
    * @returns Thông tin user
    */
   async getUser(access_token: string, refresh_token: string): Promise<UserData> {
      if (hasMatchingCache(access_token, refresh_token)) {
         return cachedProfile!;
      }

      if (
         inFlightProfilePromise &&
         inFlightAccessToken === access_token &&
         inFlightRefreshToken === refresh_token
      ) {
         return inFlightProfilePromise;
      }

      inFlightAccessToken = access_token;
      inFlightRefreshToken = refresh_token;
      inFlightProfilePromise = (async () => {
         const response = await fetch(`${API}/account/profile`, {
            headers: {
               'Authorization': `Bearer ${access_token}`,
               'x-refresh-token': refresh_token
            }
         });

         if (!response.ok) {
            if (response.status === 401) {
               clearUserProfileCache();
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
         const profile = data.data as UserData;

         authStorage.setEmailVerified(String(profile.user.email_confirmed));
         cacheUserProfile(profile, access_token, refresh_token);
         return profile;
      })();

      try {
         return await inFlightProfilePromise;
      } finally {
         inFlightProfilePromise = null;
         inFlightAccessToken = null;
         inFlightRefreshToken = null;
      }
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

      const data = await response.json();
      const updatedProfile = (data.data ?? data) as UserData;
      const refreshToken = authStorage.getRefreshToken();

      if (refreshToken) {
         cacheUserProfile(updatedProfile, token, refreshToken);
      } else {
         clearUserProfileCache();
      }

      return updatedProfile;
   }

   // Thay đổi mật khẩu
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

      if (newInfo.logout_all_devices) {
         clearUserProfileCache();
         authStorage.clearTokens();
      }

      return data;
   }

   // Bật xác thực 2FA
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
    * Xác minh secret code verify setup
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
    * Tắt xác thực 2FA
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
       return [];
   }
}
