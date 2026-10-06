import { api, unwrap } from './client';
import { Event } from '@/types/api.types';
import { AdminContentStatusPayload, Envelope, EventItem } from '@/types/event.types';
import { Partner, PartnerStatus } from '@/types/partner.types';

export interface AdminStats {
  users: { total: number; active: number; blocked: number };
  movies: { total: number; published: number; draft: number };
  events: { total: number; published: number; pending: number; rejected: number };
  partners: { total: number; pending: number; approved: number };
}

export interface AdminMovieItem {
  id: string;
  title: string;
  genre?: string | null;
  original_title?: string | null;
  language: string;
  duration_min: number;
  certificate: string;
  release_date?: string | null;
  poster_url?: string | null;
  banner_url?: string | null;
  trailer_url?: string | null;
  synopsis?: string | null;
  status: string;
}

export interface AdminUserItem {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  role: 'USER' | 'PARTNER' | 'ADMIN';
  is_active: boolean;
  is_verified: boolean;
  last_login_at?: string | null;
  created_at?: string | null;
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export async function getAdminStats(): Promise<AdminStats> {
  const res = await api.get('/admin/stats');
  return res.data?.data || res.data;
}

// ---------------------------------------------------------------------------
// Movies
// ---------------------------------------------------------------------------

export async function getAdminMovies(params?: {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{ movies: AdminMovieItem[]; pagination: any }> {
  const res = await api.get('/admin/movies', { params });
  return res.data?.data || res.data;
}

export async function updateAdminMovieStatus(
  movieId: string,
  status: string
): Promise<AdminMovieItem> {
  const res = await api.patch(`/admin/movies/${movieId}/status`, { status });
  return res.data?.data || res.data;
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export async function getAdminEvents(params?: {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{ events: EventItem[]; pagination: any }> {
  const res = await api.get('/admin/events', { params });
  return res.data?.data || res.data;
}

export async function updateAdminEventStatus(
  eventId: string,
  status: string,
  cancellation_reason?: string
) {
  const res = await api.patch(`/admin/events/${eventId}/status`, {
    status,
    cancellation_reason,
  });
  return res.data?.data || res.data;
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export async function getAdminUsers(params?: {
  search?: string;
  role?: string;
  is_active?: boolean;
  page?: number;
  limit?: number;
}): Promise<{ users: AdminUserItem[]; pagination: any }> {
  const res = await api.get('/admin/users', { params });
  return res.data?.data || res.data;
}

export async function updateAdminUserStatus(
  userId: string,
  isActive: boolean,
  reason?: string
) {
  const res = await api.patch(`/admin/users/${userId}/status`, {
    is_active: isActive,
    reason,
  });
  return res.data?.data || res.data;
}

export async function updateAdminUserRole(userId: string, role: string) {
  const res = await api.patch(`/admin/users/${userId}/role`, { role });
  return res.data?.data || res.data;
}

// ---------------------------------------------------------------------------
// Legacy / Pending Events & Partners
// ---------------------------------------------------------------------------

export async function getPendingEvents(): Promise<EventItem[]> {
  const response = await api.get<Envelope<{ items: EventItem[]; total: number }>>(
    '/admin/content/pending'
  );
  return response.data?.data?.items || [];
}

export async function updateContentStatus(
  eventId: string,
  payload: AdminContentStatusPayload
): Promise<EventItem> {
  const { data } = await api.patch<Envelope<EventItem>>(
    `/admin/content/${eventId}/status`,
    payload
  );
  return data.data;
}

export async function getAdminPartners(params: any) {
  const response = await api.get('/admin/partners', { params });
  return response.data?.data || response.data;
}

export const updatePartnerStatus = async (
  id: string,
  status: PartnerStatus,
  rejection_reason?: string
) => {
  const response = await api.patch(`/admin/partners/${id}/status`, {
    status,
    rejection_reason,
  });
  return response.data?.data || response.data;
};

export async function updateEventStatus(
  eventId: string, 
  status: 'PUBLISHED' | 'REJECTED', 
  rejection_reason?: string
) {
  const response = await api.patch(
    `/admin/content/${eventId}/status`, 
    { status, rejection_reason }
  );
  return response.data?.data || response.data;
}

