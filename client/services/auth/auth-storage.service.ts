import { getCookie, removeCookie, setCookie } from '@/lib/cookies';
import { UserData } from '@/types/user/user.type';

class AuthStorageService {
  private static instance: AuthStorageService;
  
  // Token keys
  private readonly ACCESS_TOKEN_KEY = process.env.NEXT_PUBLIC_ACCESS_TOKEN_KEY;
  private readonly REFRESH_TOKEN_KEY = process.env.NEXT_PUBLIC_REFRESH_TOKEN_KEY;
  private readonly VERIFICATION_TOKEN_KEY = process.env.NEXT_PUBLIC_VERIFICATION_TOKEN_KEY;
  private readonly THEME_KEY = process.env.NEXT_PUBLIC_THEME_KEY;
  private readonly EMAIL_VERIFIED = process.env.NEXT_PUBLIC_EMAIL_VERIFIED
  private readonly REQUIES_2FA = process.env.NEXT_PUBLIC_REQUIES_2FA
  private readonly TEMP_TOKEN = process.env.NEXT_PUBLIC_TEMP_TOKEN
  private readonly USER_ID = process.env.NEXT_PUBLIC_USER_ID

  // In-memory cache for organization_id
  private cachedOrgId: string | null = null;
  private orgIdExpiresAt: number = 0;
  private readonly ORG_ID_TTL = 60_000; // 60 seconds

  private constructor() {}

  static getInstance(): AuthStorageService {
    if (!AuthStorageService.instance) {
      AuthStorageService.instance = new AuthStorageService();
    }
    return AuthStorageService.instance;
  }

  /**
   * Lấy organization_id từ cache nếu còn hạn
   */
  getOrgId(): string | null {
    if (this.cachedOrgId && Date.now() < this.orgIdExpiresAt) {
      return this.cachedOrgId;
    }
    return null;
  }

  /**
   * Lưu organization_id vào cache với TTL
   */
  setOrgId(orgId: string): void {
    this.cachedOrgId = orgId;
    this.orgIdExpiresAt = Date.now() + this.ORG_ID_TTL;
  }

  /**
   * Xóa cache organization_id
   */
  clearOrgId(): void {
    this.cachedOrgId = null;
    this.orgIdExpiresAt = 0;
  }

  /**
   * Lấy token tạm thời (cho 2FA)
   * @returns Token tạm thời hoặc null
   */
  getTempToken(): string | null {
    return getCookie(this.TEMP_TOKEN!);
  }

  /**
   * Lấy trạng thái yêu cầu 2FA
   * @returns Trạng thái 2FA hoặc null
   */
  getRequies2fa(): string | null {
    return getCookie(this.REQUIES_2FA!);
  }

  /**
   * Lấy trạng thái xác minh email
   * @returns Trạng thái xác minh email hoặc null
   */
  getEmailVerified(): string | null {
    return getCookie(this.EMAIL_VERIFIED!);
  }

  // Token methods
  /**
   * Lấy token truy cập (Access Token)
   * @returns Token truy cập hoặc null
   */
  getAccessToken(): string | null {
    return getCookie(this.ACCESS_TOKEN_KEY!);
  }

  /**
   * Lấy token làm mới (Refresh Token)
   * @returns Token làm mới hoặc null
   */
  getRefreshToken(): string | null {
    return getCookie(this.REFRESH_TOKEN_KEY!);
  }

  /**
   * Lấy token xác minh (Verification Token)
   * @returns Token xác minh hoặc null
   */
  getVerificationToken(): string | null {
    return getCookie(this.VERIFICATION_TOKEN_KEY!);
  }

  /**
   * Lấy ID người dùng
   * @returns ID người dùng hoặc null
   */
  getUserID(): string | null {
    return getCookie(this.USER_ID!);
  }

  /**
   * Đặt trạng thái yêu cầu 2FA
   * @param is_2fa Trạng thái 2FA
   */
  setRequies2fa(is_2fa: string) {
    setCookie(this.REQUIES_2FA!, is_2fa, 365)
  }

  /**
   * Lưu token tạm thời
   * @param temp_token Token tạm thời
   */
  setTempToken(temp_token: string) {
    setCookie(this.TEMP_TOKEN!, temp_token, 365)
  }

  /**
   * Lưu trữ cặp token (Access & Refresh)
   * @param accessToken Token truy cập
   * @param refreshToken Token làm mới
   */
  setTokens(accessToken: string, refreshToken: string): void {
    setCookie(this.ACCESS_TOKEN_KEY!, accessToken, Number(process.env.NEXT_PUBLIC_JWT_ACCESS_EXPIRATION)!);
    setCookie(this.REFRESH_TOKEN_KEY!, refreshToken, Number(process.env.NEXT_PUBLIC_JWT_REFRESH_EXPIRATION)!);
  }

  /**
   * Lưu token xác minh
   * @param token Token xác minh
   */
  setVerificationToken(token: string): void {
    setCookie(this.VERIFICATION_TOKEN_KEY!, token, Number(process.env.NEXT_PUBLIC_ACCESS_VERIFICATION_TOKEN_EXPIRATION)!);
  }

  /**
   * Đặt trạng thái xác minh email
   * @param is_verified Trạng thái xác minh
   */
  setEmailVerified(is_verified: string) {
    setCookie(this.EMAIL_VERIFIED!, is_verified, 365)
  }

  /**
   * Đặt ID người dùng
   * @param user_id ID người dùng
   */
  setUserID(user_id: string) {
    setCookie(this.USER_ID!, user_id, 365)
  }

  /**
   * Xóa thông tin yêu cầu 2FA và token tạm
   */
  clearRequies2fa(): void {
    removeCookie(this.REQUIES_2FA!)
    removeCookie(this.TEMP_TOKEN!)
  }

  /**
   * Xóa toàn bộ token và thông tin xác thực
   */
  clearTokens(): void {
    removeCookie(this.EMAIL_VERIFIED!)
    removeCookie(this.ACCESS_TOKEN_KEY!);
    removeCookie(this.REFRESH_TOKEN_KEY!);
    removeCookie(this.THEME_KEY!);
    removeCookie(this.VERIFICATION_TOKEN_KEY!);
    removeCookie(this.REQUIES_2FA!)
    this.clearOrgId();
  }

  // Theme methods
  /**
   * Lấy cài đặt giao diện (sáng/tối)
   * @returns Giao diện hiện tại ('light' hoặc 'dark')
   */
  getTheme(): 'dark' | 'light' {
    return (getCookie(this.THEME_KEY!) as 'dark' | 'light') || 'dark';
  }

  /**
   * Lưu cài đặt giao diện
   * @param theme Giao diện ('light' hoặc 'dark')
   */
  setTheme(theme: 'dark' | 'light'): void {
    setCookie(this.THEME_KEY!, theme, 365);
  }

  // Authentication state
  /**
   * Kiểm tra xem người dùng đã đăng nhập chưa
   * @returns True nếu đã đăng nhập và token còn hạn, False nếu ngược lại
   */
  isAuthenticated(): boolean {
    const token = this.getAccessToken();
    if (!token) return false;
    
    // Check if token is expired
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const isExpired = payload.exp * 1000 < Date.now();
        return !isExpired;
    } catch {
        return false;
    }
  }

  /**
   * Lấy thông tin người dùng từ token truy cập
   * @returns Thông tin người dùng hoặc null nếu không có token hợp lệ
   */
  async getUser(): Promise<UserData | null> {
    const token = this.getAccessToken();
    if (!token) return null;
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/account/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        return null;
      }
      
      const data = await response.json();
      await this.setUserID(data.data.user.id); // Lưu ID người dùng vào cookie
      return data.data;
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      return null;
    }
  }
}

export const authStorage = AuthStorageService.getInstance();
