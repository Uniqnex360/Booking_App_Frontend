import api from './client';
import { ApiResponse, PaginatedResponse } from '@/types/api.types';
import { Event } from '@/types/api.types';
import { AdminContentStatusPayload, Envelope, EventItem } from '@/types/event.types';
import { Partner, PartnerStatus } from '@/types/partner.types';

export async function getPendingEvents(): Promise<EventItem[]> {
  const response = await api.get<Envelope<{ items: EventItem[]; total: number }>>(
    '/admin/content/pending'
  );
  return response.data.data.items || [];
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
  const response = await api.get<ApiResponse<PaginatedResponse<Partner>>>('/partner/admin', { params });
  return response.data.data;
}
export const updatePartnerStatus = (
  id: string,
  status: PartnerStatus,
  rejection_reason?: string
) =>
  api
    .patch<Partner>(`/partner/admin/${id}/status`, {
    status,
    rejection_reason,
  })
    .then((res) => res.data);

export async function updateEventStatus(
  eventId: string, 
  status: 'PUBLISHED' | 'REJECTED', 
  rejection_reason?: string
) {
  const response = await api.patch<ApiResponse<Event>>(
    `/admin/content/${eventId}/status`, 
    { status, rejection_reason }
  );
  return response.data.data;
}