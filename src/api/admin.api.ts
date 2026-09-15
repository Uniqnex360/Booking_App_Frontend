import { api, unwrap } from './client';
import { Event } from '@/types/api.types';
import { AdminContentStatusPayload, Envelope, EventItem } from '@/types/event.types';
import { Partner, PartnerStatus } from '@/types/partner.types';

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
  // Queries GET /v1/admin/partners
  const response = await api.get('/admin/partners', { params });
  return response.data?.data || response.data;
}

export const updatePartnerStatus = async (
  id: string,
  status: PartnerStatus,
  rejection_reason?: string
) => {
  // Queries PATCH /v1/admin/partners/{id}/status
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
