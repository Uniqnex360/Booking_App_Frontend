import { api, unwrap } from './client';
import type { Booking, BookingDetail, CreateBookingPayload, ForgotPasswordResponse, ResetPasswordResponse, ValidateResetTokenResponse } from '@/types/booking.types';

export async function getBookings(): Promise<Booking[]> {
  return unwrap<Booking[]>(api.get('/bookings'));
}
export async function getBookingById(id: string): Promise<BookingDetail> {
  return unwrap<BookingDetail>(api.get(`/bookings/${id}`));
}
export async function createBooking(
  payload: CreateBookingPayload
): Promise<Booking> {
  return unwrap<Booking>(api.post('/bookings', payload));
}

export async function cancelBooking(id: string): Promise<void> {
  await api.delete(`/bookings/${id}`);
}
export const forgotPassword = async (email: string): Promise<ForgotPasswordResponse> => {
  const res = await api.post<ForgotPasswordResponse>('/auth/forgot-password', { email });
  return res.data;
};



export const validateResetToken = async (token: string): Promise<ValidateResetTokenResponse> => {
  const res = await api.post<ValidateResetTokenResponse>('/auth/reset-password/validate', { token });
  return res.data;
};

export const resetPassword = async (token: string, newPassword: string): Promise<ResetPasswordResponse> => {
  const res = await api.post<ResetPasswordResponse>('/auth/reset-password', {
    token,
    new_password: newPassword,
  });
  return res.data;
};