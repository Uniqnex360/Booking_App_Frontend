import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:9001/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

let accessToken: string | null = null;
let refreshToken: string | null = null;
let onAuthFailure: (() => void) | null = null;

export function setTokens(access: string, refresh: string) {
  accessToken = access;
  refreshToken = refresh;
  localStorage.setItem('access_token', access);
  localStorage.setItem('refresh_token', refresh);
}

export function getAccessToken(): string | null {
  if (accessToken) return accessToken;
  return localStorage.getItem('access_token');
}

export function getRefreshToken(): string | null {
  if (refreshToken) return refreshToken;
  return localStorage.getItem('refresh_token');
}

export function clearTokens() {
  accessToken = null;
  refreshToken = null;
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
   if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
}

export function setAuthFailureHandler(handler: () => void) {
  onAuthFailure = handler;
}
const freshApi = axios.create({ baseURL: API_BASE_URL });

let isRefreshing = false;
let failedQueue: Array<(token: string | null) => void> = [];

function processQueue(token: string | null) {
  failedQueue.forEach((cb) => cb(token));
  failedQueue = [];
}

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };
    const isAuthPath = originalRequest.url?.includes('/auth/login') || 
                       originalRequest.url?.includes('/auth/register');
    const hasRefreshToken=!!getRefreshToken()
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthPath ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push((token) => {
            if (token && originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(api(originalRequest));
            } else {
              reject(error);
            }
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refresh = getRefreshToken();
        if (!refresh) throw new Error('No refresh token');

         const response = await freshApi.post('/auth/refresh', {
    refresh_token: refresh,
  });

        const newAccess = response.data.data.access_token;
  const newRefresh = response.data.data.refresh_token || refresh;
        setTokens(newAccess, newRefresh);

        processQueue(newAccess);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        }
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(null);
        clearTokens();
        onAuthFailure?.();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
