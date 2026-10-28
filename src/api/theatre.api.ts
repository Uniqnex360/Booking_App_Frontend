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
  access_level: 'CHAIN_ADMIN' | 'VENUE_MANAGER' | 'BOX_OFFICE' | 'FINANCE_STAFF' | 'AUDITOR';
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
  access_level?: string;
  can_view_finances?: boolean;
  total_bookings: number;
  total_tickets: number;
  gross_revenue_paise: number;
  commission_invoiced_paise: number;
  commission_paid_paise: number;
  commission_outstanding_paise: number;
  screens_count: number;
  states_count?: number;
  venues_count?: number;
  upcoming_showtimes_count: number;
  open_exceptions_count: number;
  payment_queues?: {
    confirmed: { count: number; paise: number };
    pending: { count: number; paise: number };
    cancelled: { count: number; paise: number };
  };
  sync_health?: {
    provider_name: string;
    status: string;
    last_sync_at: string;
    sync_lag_seconds: number;
    authoritative_source?: string;
    channel?: string;
  };
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
  screen_id?: string;
  date?: string;
  limit?: number;
  offset?: number;
}): Promise<TheatreShowtimeItem[]> {
  const res = await api.get('/theatre/showtimes', { params });
  return unwrap(res.data);
}

export async function getTheatreBookings(params?: {
  venue_id?: string;
  status?: string;
  movie_id?: string;
  screen_id?: string;
  screen_name?: string;
  city?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<TheatreBookingItem[]> {
  const res = await api.get('/theatre/bookings', { params });
  return unwrap(res.data);
}

export interface InvoiceDetailItem {
  id: string;
  invoice_number: string;
  venue_id: string;
  venue_name: string;
  venue_city: string;
  period_start: string;
  period_end: string;
  booking_count: number;
  ticket_count: number;
  gross_sales_paise: number;
  commission_paise: number;
  adjustments_paise: number;
  tax_paise: number;
  total_paise: number;
  paid_paise: number;
  balance_paise: number;
  status: string;
  issue_date?: string;
  due_date: string;
  notes?: string;
  items: Array<{
    id: string;
    description: string;
    item_type: string;
    amount_paise: number;
    created_at: string;
  }>;
  collections: Array<{
    id: string;
    payment_ref: string;
    payment_method: string;
    amount_paise: number;
    status: string;
    collected_at: string;
    notes?: string;
  }>;
  remittance_instructions: {
    beneficiary_name: string;
    bank_name: string;
    account_number: string;
    ifsc_code: string;
    payment_reference_hint: string;
    dispute_email: string;
  };
}

export interface InvoiceDisputePayload {
  reason: string;
  disputed_amount_paise?: number;
  booking_ids?: string[];
  notes?: string;
}

export interface InvoiceRemittancePayload {
  payment_ref: string;
  payment_method: string;
  amount_paise: number;
  notes?: string;
}

export async function getTheatreInvoices(params?: {
  venue_id?: string;
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<TheatreInvoiceItem[]> {
  const res = await api.get('/theatre/invoices', { params });
  return unwrap(res.data);
}

export async function getTheatreInvoiceDetails(invoiceId: string): Promise<InvoiceDetailItem> {
  const res = await api.get(`/theatre/invoices/${invoiceId}`);
  return unwrap(res.data);
}

export async function raiseTheatreInvoiceDispute(
  invoiceId: string,
  payload: InvoiceDisputePayload
): Promise<any> {
  const res = await api.post(`/theatre/invoices/${invoiceId}/dispute`, payload);
  return unwrap(res.data);
}

export async function submitTheatreInvoiceRemittance(
  invoiceId: string,
  payload: InvoiceRemittancePayload
): Promise<any> {
  const res = await api.post(`/theatre/invoices/${invoiceId}/remittance`, payload);
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

export async function updateTheatreException(
  exceptionId: string,
  payload: {
    status?: string;
    resolution_notes?: string;
    assigned_to?: string;
  }
): Promise<any> {
  const res = await api.patch(`/theatre/exceptions/${exceptionId}`, payload);
  return unwrap(res.data);
}

export interface ShowtimeSeatItem {
  id: string;
  row_id: string;
  row_label: string;
  section?: string;
  price_paise: number;
  number: number;
  code: string;
  status: 'AVAILABLE' | 'BOOKED' | 'LOCKED' | 'BLOCKED';
  blocked_reason?: string;
}

export interface ShowtimeSeatsData {
  showtime: {
    id: string;
    starts_at: string;
    movie_title: string;
    screen_name: string;
    venue_name: string;
    total_seats: number;
    booked_count: number;
    blocked_count: number;
    available_count: number;
    sync_metadata?: {
      source: string;
      status: string;
      last_synced_at: string;
    };
  };
  seats: ShowtimeSeatItem[];
}

export async function getShowtimeSeats(showtimeId: string): Promise<ShowtimeSeatsData> {
  const res = await api.get(`/theatre/showtimes/${showtimeId}/seats`);
  return unwrap(res.data);
}

export async function blockShowtimeSeats(
  showtimeId: string,
  payload: {
    seat_ids: string[];
    action: 'BLOCK' | 'UNBLOCK';
    reason?: string;
    notes?: string;
  }
): Promise<any> {
  const res = await api.post(`/theatre/showtimes/${showtimeId}/seats/block`, payload);
  return unwrap(res.data);
}

export interface TheatreNotificationItem {
  id: string;
  type: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  title: string;
  message: string;
  timestamp: string;
  link?: string;
}

export async function getTheatreNotifications(): Promise<TheatreNotificationItem[]> {
  const res = await api.get('/theatre/notifications');
  return unwrap(res.data);
}

export async function validateTheatreTicket(payload: ValidateTicketPayload): Promise<TicketValidationResult> {
  const res = await api.post('/theatre/tickets/validate', payload);
  return unwrap(res.data);
}

export async function listTheatreAdmissions(params?: {
  venue_id?: string;
  limit?: number;
}): Promise<TicketAdmissionItem[]> {
  const res = await api.get('/theatre/tickets/admissions', { params });
  return unwrap(res.data);
}

export interface ValidateTicketPayload {
  code: string;
  venue_id?: string;
  gate_device?: string;
  admit_now?: boolean;
  notes?: string;
}

export interface TicketValidationResult {
  valid: boolean;
  status:
    | "VALID"
    | "ALREADY_USED"
    | "CANCELLED"
    | "UNCONFIRMED"
    | "NOT_FOUND"
    | "WRONG_VENUE"
    | "UNAUTHORIZED_VENUE"
    | "INVALID_INPUT";
  message: string;
  admitted_at?: string;
  admitted_by?: string;
  gate_device?: string;
  booking?: {
    id?: string;
    ref_code?: string;
    movie_title?: string;
    movie_poster?: string;
    venue_name?: string;
    screen_name?: string;
    showtime?: string;
    quantity?: number;
    seats?: string;
    contact_email?: string;
    contact_phone?: string;
  };
}

export interface TicketAdmissionItem {
  id: string;
  booking_id: string;
  ref_code?: string;
  venue_name?: string;
  screen_name?: string;
  ticket_count: number;
  admitted_at: string;
  admitted_by?: string;
  gate_device?: string;
  status: string;
  seats?: string;
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

// ---------------------------------------------------------------------------
// Theatre My Account & Remittance Bank Credentials (Request 25)
// ---------------------------------------------------------------------------

export interface TheatreAccountData {
  brand_name: string;
  brand_code: string;
  contact_email?: string;
  contact_phone?: string;
  access_level: string;
  bank_account: {
    bank_name: string;
    bank_account_number: string;
    bank_ifsc_code: string;
    bank_account_holder_name: string;
    bank_account_type: string;
    bank_branch?: string;
    remittance_schedule: string;
    bank_verification_status: string;
  };
  kyc: {
    gst_number?: string;
    pan_number?: string;
    gst_certificate_url?: string;
    pan_card_url?: string;
  };
  financial_summary: {
    gross_sales_paise: number;
    commission_invoiced_paise: number;
    commission_paid_paise: number;
    commission_outstanding_paise: number;
    net_share_paise: number;
    total_bookings: number;
    total_tickets: number;
  };
  settlement_remittances: Array<{
    id: string;
    payment_ref: string;
    payment_method: string;
    amount_paise: number;
    collected_at: string;
    status: string;
    invoice_number: string;
    venue_name: string;
    notes?: string;
  }>;
}

export interface TheatreLedgerItem {
  id: string;
  type: string;
  entry_type: "CREDIT" | "DEBIT";
  date: string;
  reference: string;
  description: string;
  gross_amount_paise: number;
  commission_paise: number;
  net_amount_paise: number;
  status: string;
  venue_name: string;
}

export interface TheatreStatementData {
  summary: {
    gross_sales_paise: number;
    commission_paise: number;
    remitted_paise: number;
    pending_payout_paise: number;
    entries_count: number;
  };
  ledger: TheatreLedgerItem[];
}

export async function getTheatreAccountDetails(): Promise<TheatreAccountData> {
  const res = await api.get('/theatre/account');
  return unwrap(res.data);
}

export async function updateTheatreBankAccount(data: {
  bank_name: string;
  bank_account_number: string;
  bank_ifsc_code: string;
  bank_account_holder_name: string;
  bank_account_type: string;
  bank_branch?: string;
  remittance_schedule?: string;
}): Promise<any> {
  const res = await api.put('/theatre/account/bank-account', data);
  return unwrap(res.data);
}

export async function uploadTheatreDocument(
  file: File,
  docType: string = 'gst_certificate'
): Promise<{ url: string; filename: string; size: number }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('doc_type', docType);
  const res = await api.post('/theatre/account/upload-document', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return unwrap(res.data);
}

export async function updateTheatreKyc(data: {
  pan_number: string;
  gst_number?: string;
  gst_certificate_url?: string;
  pan_card_url?: string;
}): Promise<any> {
  const res = await api.put('/theatre/account/kyc', data);
  return unwrap(res.data);
}

export async function getTheatreAccountStatement(params?: {
  date_from?: string;
  date_to?: string;
  venue_id?: string;
}): Promise<TheatreStatementData> {
  const res = await api.get('/theatre/account/statement', { params });
  return unwrap(res.data);
}


