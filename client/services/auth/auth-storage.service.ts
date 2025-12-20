import { getCookie, removeCookie, setCookie } from '@/lib/cookies';

class AuthStorageService {
  private static instance: AuthStorageService;
  
  // Token keys
  private readonly ACCESS_TOKEN_KEY = process.env.NEXT_PUBLIC_ACCESS_TOKEN_KEY;
  private readonly REFRESH_TOKEN_KEY = process.env.NEXT_PUBLIC_REFRESH_TOKEN_KEY;
  private readonly VERIFICATION_TOKEN_KEY = process.env.NEXT_PUBLIC_VERIFICATION_TOKEN_KEY;
  private readonly THEME_KEY = process.env.NEXT_PUBLIC_THEME_KEY;

  private constructor() {}

  static getInstance(): AuthStorageService {
    if (!AuthStorageService.instance) {
      AuthStorageService.instance = new AuthStorageService();
    }
    return AuthStorageService.instance;
  }

  // Token methods
  getAccessToken(): string | null {
    return getCookie(this.ACCESS_TOKEN_KEY!);
  }

  getRefreshToken(): string | null {
    return getCookie(this.REFRESH_TOKEN_KEY!);
  }

  getVerificationToken(): string | null {
    return getCookie(this.VERIFICATION_TOKEN_KEY!);
  }

  setTokens(accessToken: string, refreshToken: string): void {
    setCookie(this.ACCESS_TOKEN_KEY!, accessToken, Number(process.env.NEXT_PUBLIC_JWT_ACCESS_EXPIRATION)!);
    setCookie(this.REFRESH_TOKEN_KEY!, refreshToken, Number(process.env.NEXT_PUBLIC_JWT_REFRESH_EXPIRATION)!);
  }

  setVerificationToken(token: string): void {
    setCookie(this.VERIFICATION_TOKEN_KEY!, token, Number(process.env.NEXT_PUBLIC_ACCESS_VERIFICATION_TOKEN_EXPIRATION)!);
  }

  clearTokens(): void {
    removeCookie(this.ACCESS_TOKEN_KEY!);
    removeCookie(this.REFRESH_TOKEN_KEY!);
    removeCookie(this.VERIFICATION_TOKEN_KEY!);
  }

  // Theme methods
  getTheme(): 'dark' | 'light' {
    return (getCookie(this.THEME_KEY!) as 'dark' | 'light') || 'dark';
  }

  setTheme(theme: 'dark' | 'light'): void {
    setCookie(this.THEME_KEY!, theme, 365);
  }

  // Authentication state
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
}

export const authStorage = AuthStorageService.getInstance();
