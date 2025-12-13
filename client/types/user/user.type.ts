export type Provider = 'DEFAULT' | 'GOOGLE' | 'GITHUB' | 'FACEBOOK'; // tuỳ backend của bạn
export interface Role {
  id: string;
  name: string;
  description: string;
}
export interface Permission {
  id: string;
  name: string;
  key: string;
  description: string;
}
export interface User {
  id: string;
  name: string;
  email: string;
  email_confirmed: boolean;
  is_verified: boolean;
  two_factor_enabled: boolean;
  language: string;
  created_at: string; // hoặc Date nếu bạn parse
}
export interface UserData {
  user: User;
  roles: Role[];
  permissions: Permission[];
}
// Nếu response từ API là { data: { ... } }
export interface UserResponse {
  data: UserData;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
}