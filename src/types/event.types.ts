export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'REJECTED' | 'CANCELLED' | 'PENDING_APPROVAL';

export type EventCategory =
  | 'concert'
  | 'comedy'
  | 'sports'
  | 'workshop'
  | 'theatre'
  | 'exhibition'
  | 'other';

export interface TicketCategory {
  name: string;
  price_paise: number;
  capacity: number;
  max_per_booking: number;
}

export interface EventItem {
  id: string;
  title: string;
  slug: string;
  category: EventCategory;
  venue_name: string;
  city: string;
  starts_at: string;
  ends_at: string;
  poster_image_url: string;
  status: EventStatus;
  description?: string;
  ticket_categories?: TicketCategory[];
  rejection_reason?: string;
  created_at?: string;
}

export interface EventCreatePayload {
  title: string;
  category: EventCategory;
  venue_name: string;
  city: string;
  starts_at: string;
  ends_at: string;
  poster_image_url: string;
  description?: string;
  ticket_categories: TicketCategory[];
}

export interface AdminContentStatusPayload {
  status: 'PUBLISHED' | 'REJECTED';
  rejection_reason?: string;
}

export interface PaginatedEvents {
  data: EventItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

export interface Envelope<T> {
  status: 'success' | 'error';
  code: number;
  data: T;
  message?: string;
}
