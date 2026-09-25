import { api, unwrap } from './client';
import { EventItem } from '@/types/event.types';

export interface VenueItem {
  venue_name: string;
  venue_address: string | null;
  city: string;
}

export async function getMyEvents(): Promise<EventItem[]> {
  const data = await unwrap<{ items: EventItem[]; total: number }>(api.get('/events/me'));
  return data.items || [];
}

export async function getEvents(params?: any): Promise<EventItem[]> {
  const data = await unwrap<{ items: EventItem[]; total: number }>(api.get('/events', { params }));
  return data.items || [];
}

export async function getEventById(id: string): Promise<EventItem> {
  return unwrap<EventItem>(api.get(`/events/${id}`));
}

export async function createEvent(payload: any): Promise<EventItem> {
  return unwrap<EventItem>(api.post('/events', payload));
}

export async function updateEvent(id: string, payload: any): Promise<EventItem> {
  return unwrap<EventItem>(api.patch(`/events/${id}`, payload));
}

export async function cancelOrDeleteEvent(id: string, reason?: string): Promise<void> {
  await unwrap<any>(api.delete(`/events/${id}`, { params: { reason } }));
}

export async function getEventVenues(city?: string): Promise<VenueItem[]> {
  const data = await unwrap<{ items: VenueItem[] }>(
    api.get('/events/venues', { params: city ? { city } : undefined })
  );
  return data.items || [];
}