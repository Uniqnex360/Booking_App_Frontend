export type UserRole = 'USER' | 'ADMIN'|"PARTNER";

export interface User {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: UserRole;
  avatar_url?: string;
}

export interface UserResponse {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: UserRole;
  created_at:string
}

export interface RegisterPayload {
  full_name: string;
  email: string;
  userId?:string;
  password: string;
  phone?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface FirebaseLoginPayload {
  token: string;
}

export interface RefreshPayload {
  refresh_token: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type:string
  expires_in: number;
}
