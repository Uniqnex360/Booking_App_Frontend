import { api, unwrap } from './client';

export interface TheatreEnquiryPayload {
  theatre_name: string;
  contact_name: string;
  email: string;
  phone: string;
  city: string;
  screen_count?: number;
  message?: string;
}

export interface TheatreEnquiryItem {
  id: string;
  theatre_name: string;
  contact_name: string;
  email: string;
  phone: string;
  city: string;
  screen_count: number;
  message?: string;
  status: 'NEW' | 'CONTACTED' | 'ONBOARDED' | 'ARCHIVED';
  created_at: string;
  updated_at: string;
}

export interface CreateTheatreAccountPayload {
  name: string;
  email: string;
  password: string;
  phone?: string;
  access_level: 'CHAIN_ADMIN' | 'VENUE_MANAGER';
  chain_id?: string;
  venue_id?: string;
}

export interface TheatreAccountItem {
  id: string;
  user_id: string;
  email: string;
  name: string;
  phone?: string;
  access_level: string;
  chain_id?: string;
  chain_name?: string;
  venue_id?: string;
  venue_name?: string;
  is_active: boolean;
  created_at: string;
}

export interface TheatrePartnerProfile {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  chain?: {
    id: string;
    name: string;
    code?: string;
  } | null;
  access_level: string;
  venues_count: number;
  venues: Array<{
    id: string;
    name: string;
    city: string;
    address: string;
    chain_id?: string;
  }>;
}

export interface TheatreDashboardStats {
  total_bookings: number;
  total_tickets: number;
  gross_revenue_paise: number;
  commission_invoiced_paise: number;
  commission_paid_paise: number;
  commission_outstanding_paise: number;
  screens_count: number;
  upcoming_showtimes_count: number;
  open_exceptions_count: number;
}

export interface TheatreVenueItem {
  id: string;
  name: string;
  city: string;
  address: string;
  screen_count: number;
  customer_payment_model: string;
  commission_model: string;
  rate_type: string;
  rate_value: number;
  currency: string;
}

export interface TheatreShowtimeItem {
  id: string;
  starts_at: string;
  movie: {
    id: string;
    title: string;
    language: string;
    poster_url?: string;
    certificate: string;
  };
  screen: {
    id: string;
    name: string;
    total_seats: number;
  };
  venue: {
    id: string;
    name: string;
    city: string;
  };
}

export interface TheatreBookingItem {
  id: string;
  ref_code: string;
  status: string;
  quantity: number;
  total_paise: number;
  seat_codes?: string;
  created_at: string;
  movie_title: string;
  venue_name: string;
  screen_name: string;
  showtime: string;
  contact_email?: string;
  contact_phone?: string;
}

export interface TheatreInvoiceItem {
  id: string;
  invoice_number: string;
  venue_id: string;
  venue_name: string;
  period_start: string;
  period_end: string;
  tickets_count: number;
  gross_booking_paise: number;
  commission_paise: number;
  tax_paise: number;
  total_paise: number;
  paid_paise: number;
  balance_paise: number;
  status: string;
  due_date: string;
  created_at: string;
}

export interface TheatreExceptionItem {
  id: string;
  exception_type: string;
  booking_id?: string;
  venue_id?: string;
  venue_name?: string;
  external_ref?: string;
  severity: string;
  status: string;
  discrepancy_details: string;
  resolution_notes?: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Public Enquiries
// ---------------------------------------------------------------------------

export async function submitTheatreEnquiry(data: TheatreEnquiryPayload) {
  const res = await api.post('/theatres/enquiry', data);
  return unwrap(res.data);
}

// ---------------------------------------------------------------------------
// Theatre Partner Scoped Portal
// ---------------------------------------------------------------------------

export async function getTheatreProfile(): Promise<TheatrePartnerProfile> {
  const res = await api.get('/theatre/me');
  return unwrap(res.data);
}

export async function getTheatreDashboardStats(): Promise<TheatreDashboardStats> {
  const res = await api.get('/theatre/dashboard/stats');
  return unwrap(res.data);
}

export async function getTheatreVenues(): Promise<TheatreVenueItem[]> {
  const res = await api.get('/theatre/venues');
  return unwrap(res.data);
}

export async function getTheatreShowtimes(params?: {
  venue_id?: string;
  movie_id?: string;
  limit?: number;
  offset?: number;
}): Promise<TheatreShowtimeItem[]> {
  const res = await api.get('/theatre/showtimes', { params });
  return unwrap(res.data);
}

export async function getTheatreBookings(params?: {
  venue_id?: string;
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<TheatreBookingItem[]> {
  const res = await api.get('/theatre/bookings', { params });
  return unwrap(res.data);
}

export async function getTheatreInvoices(params?: {
  venue_id?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<TheatreInvoiceItem[]> {
  const res = await api.get('/theatre/invoices', { params });
  return unwrap(res.data);
}

export async function getTheatreExceptions(params?: {
  venue_id?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<TheatreExceptionItem[]> {
  const res = await api.get('/theatre/exceptions', { params });
  return unwrap(res.data);
}

// ---------------------------------------------------------------------------
// Central Admin Management for Theatres
// ---------------------------------------------------------------------------

export async function listAdminTheatreEnquiries(status?: string): Promise<TheatreEnquiryItem[]> {
  const res = await api.get('/admin/theatres/enquiries', { params: { status } });
  return unwrap(res.data);
}

export async function updateAdminTheatreEnquiryStatus(
  enquiryId: string,
  status: 'NEW' | 'CONTACTED' | 'ONBOARDED' | 'ARCHIVED'
): Promise<TheatreEnquiryItem> {
  const res = await api.patch(`/admin/theatres/enquiries/${enquiryId}/status`, { status });
  return unwrap(res.data);
}

export async function createAdminTheatreAccount(
  data: CreateTheatreAccountPayload
): Promise<TheatreAccountItem> {
  const res = await api.post('/admin/theatres/accounts', data);
  return unwrap(res.data);
}

export async function listAdminTheatreAccounts(chainId?: string): Promise<TheatreAccountItem[]> {
  const res = await api.get('/admin/theatres/accounts', { params: { chain_id: chainId } });
  return unwrap(res.data);
}

