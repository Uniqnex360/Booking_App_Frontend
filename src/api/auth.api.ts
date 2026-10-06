import { ApiResponse } from '@/types';
import api, { setTokens, clearTokens, getRefreshToken } from './client';
import type {
  AuthTokens,
  LoginPayload,
  RegisterPayload,
  UserResponse,
  FirebaseLoginPayload,
  RefreshPayload,
} from '@/types/user.types';

export async function registerUser(
  payload: RegisterPayload
): Promise<UserResponse> {
 const response = await api.post<ApiResponse<UserResponse>>('/auth/register', payload);
  return response.data.data;
}

export async function login(payload: LoginPayload): Promise<AuthTokens> {
  const response= await api.post<ApiResponse<AuthTokens>>('/auth/login', payload);
  const result=response.data.data 

  setTokens(result.access_token, result .refresh_token);
  return result
}

export async function loginWithFirebase(
  payload: FirebaseLoginPayload
): Promise<AuthTokens> {
  const response= await api.post<ApiResponse<AuthTokens>>('/auth/login/firebase', payload);
  const result=response.data.data 

  setTokens(result.access_token, result .refresh_token);
  return result
}
export async function loginWithPhoneEmail(payload: { url: string }): Promise<AuthTokens> {
  const response = await api.post<ApiResponse<AuthTokens>>('/auth/login/phone-email', payload);
  const result=response.data.data
  setTokens(result.access_token, result.refresh_token); 
  return result
}
export async function refreshToken(
  payload: RefreshPayload
): Promise<AuthTokens> {
  const response = await api.post<ApiResponse<AuthTokens>>('/auth/refresh', payload);
  const result=response.data.data 

  setTokens(result.access_token, result .refresh_token);
  return result
}

export async function getCurrentUser(): Promise<UserResponse> {
  const response = await api.get<ApiResponse<UserResponse>>('/auth/me');
  return response.data.data;
}

export async function logout(): Promise<void> {
  try {
     const refresh = getRefreshToken();
  await api.post('/auth/logout', { refresh_token: refresh });
  } catch {
  }
  clearTokens();
}

export async function sendEmailOtp(payload: {
  email: string;
  full_name?: string;
}): Promise<{ user_id: string; email: string; otp_sent: boolean }> {
  const response = await api.post<ApiResponse<{ user_id: string; email: string; otp_sent: boolean }>>(
    "/auth/email-otp/send",
    payload
  );
  return response.data.data;
}

export async function verifyEmailOtp(payload: {
  user_id?: string;
  email?: string;
  otp_code: string;
}): Promise<AuthTokens> {
  const response = await api.post<ApiResponse<AuthTokens>>("/auth/email-otp/verify", payload);
  const result = response.data.data;
  setTokens(result.access_token, result.refresh_token);
  return result;
}

export async function checkEmailExists(
  email: string
): Promise<{ exists: boolean; has_password: boolean }> {
  const response = await api.post<
    ApiResponse<{ exists: boolean; has_password: boolean }>
  >("/auth/check-email", { email });
  return response.data.data;
}

