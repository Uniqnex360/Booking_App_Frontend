export type BookingStatus = 'CONFIRMED' | 'PENDING' | 'CANCELLED' | 'COMPLETED';
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
