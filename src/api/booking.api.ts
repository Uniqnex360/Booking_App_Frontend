import api from './client';
import type { Booking, CreateBookingPayload } from '@/types/booking.types';

export async function getBookings(): Promise<Booking[]> {
  const { data } = await api.get<Booking[]>('/bookings');
  return data;
}

export async function createBooking(
  payload: CreateBookingPayload
): Promise<Booking> {
  const { data } = await api.post<Booking>('/bookings', payload);
  return data;
}

export async function cancelBooking(id: string): Promise<void> {
  await api.delete(`/bookings/${id}`);
}
