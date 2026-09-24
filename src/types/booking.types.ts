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

  // Enriched — present for MOVIE rows
  starts_at?: string | null;
  movie_title?: string | null;
  poster_url?: string | null;
  language?: string | null;
  format?: string | null;
  certificate?: string | null;
  duration_min?: number | null;
  screen_name?: string | null;
  cinema_name?: string | null;
  cinema_city?: string | null;
  cinema_address?: string | null;
  seat_codes?: string[] | null;

  // Enriched — present for EVENT rows
  category?: string | null;
  age_restriction?: string | null;
  ends_at?: string | null;
  venue_name?: string | null;
  venue_address?: string | null;
  city?: string | null;
  tier_name?: string | null;
  tier_price_paise?: number | null;
}

export interface BookingDetail extends Booking {
  total_paise: number;
  quantity?: number | null;
  unit_price_paise?: number | null;
}

export interface ForgotPasswordResponse {
  status: string;
  code: number;
  data: null;
  message: string;
}

export interface ValidateResetTokenResponse {
  valid: boolean;
}

export interface ResetPasswordResponse {
  status: string;
  code: number;
  data: null;
  message: string;
}
export interface ForgotPasswordResponse {
  status: string;
  code: number;
  data: null;
  message: string;
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