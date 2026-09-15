import { api, unwrap } from './client';
import type { Booking, CreateBookingPayload } from '@/types/booking.types';

export async function getBookings(): Promise<Booking[]> {
  return unwrap<Booking[]>(api.get('/bookings'));
}

export async function createBooking(
  payload: CreateBookingPayload
): Promise<Booking> {
  return unwrap<Booking>(api.post('/bookings', payload));
}

export async function cancelBooking(id: string): Promise<void> {
  await api.delete(`/bookings/${id}`);
}
