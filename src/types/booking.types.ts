export type BookingStatus =
  | 'HELD'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'PENDING_CONFIRMATION';

export type BookingType = 'MOVIE' | 'EVENT' | 'RESTAURANT';

export interface Booking {
  id: string;
  user_id: string;
  type: BookingType;
  title: string;
  venue: string;
  location: string;
  booking_date: string;
  guests: number;
  total_price: number;
  status: BookingStatus;
  image_url: string;
  ref_code?: string | null;
  barcode?: string | null;
  created_at?: string | null;

  movie_title?: string | null;
  poster_url?: string | null;
  language?: string | null;
  format?: string | null;
  certificate?: string | null;
  duration_min?: number | null;
  starts_at?: string | null;
  screen_name?: string | null;
  cinema_name?: string | null;
  cinema_city?: string | null;
  cinema_address?: string | null;
  seat_codes?: string[] | null;
}
export interface CreateBookingPayload {
  type: BookingType;
  ref_id: string;
  title: string;
  venue: string;
  location: string;
  booking_date: string;
  guests: number;
  total_price: number;
}
