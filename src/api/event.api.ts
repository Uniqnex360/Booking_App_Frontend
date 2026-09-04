import { ApiResponse } from '@/types';
import api from './client';
import type { Event } from '@/types/api.types';
import { EventItem } from '@/types/event.types';
export async function getMyEvents() {
  const response = await api.get<ApiResponse<{ items: EventItem[]; total: number }>>('/events/me');
  return response.data.data;
}
export async function getEvents(): Promise<EventItem[]> {
  const response = await api.get<ApiResponse<{ items: EventItem[]; total: number }>>('/events');
  return response.data.data.items;
}

export async function getEventById(id: string): Promise<Event> {
  const response = await api.get<ApiResponse<Event>>(`/events/${id}`);
  return response.data.data; 
}
export async function createEvent(data: any) {
  const response = await api.post<ApiResponse<Event>>('/events', data);
  return response.data.data;
}
export async function getEventsByCategory(category: string): Promise<Event[]> {
  const response = await api.get<ApiResponse<{ items: Event[]; total: number }>>('/events', {
    params: { category },
  });
  return response.data.data.items;
}