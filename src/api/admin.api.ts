import { api, unwrap } from './client';
import { Event } from '@/types/api.types';
import { AdminContentStatusPayload, Envelope, EventItem } from '@/types/event.types';
import { Partner, PartnerStatus } from '@/types/partner.types';

export interface AdminStats {
  users: { total: number; active: number; blocked: number };
  movies: { total: number; published: number; draft: number };
  events: { total: number; published: number; pending: number; rejected: number };
  partners: { total: number; pending: number; approved: number };
}

export interface AdminMovieItem {
  id: string;
  title: string;
  genre?: string | null;
  original_title?: string | null;
  language: string;
  duration_min: number;
  certificate: string;
  release_date?: string | null;
  poster_url?: string | null;
  banner_url?: string | null;
  trailer_url?: string | null;
  synopsis?: string | null;
  status: string;
}

export interface AdminUserItem {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  role: 'USER' | 'PARTNER' | 'ADMIN';
  is_active: boolean;
  is_verified: boolean;
  last_login_at?: string | null;
  created_at?: string | null;
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export async function getAdminStats(): Promise<AdminStats> {
  const res = await api.get('/admin/stats');
  return res.data?.data || res.data;
}

// ---------------------------------------------------------------------------
// Movies
// ---------------------------------------------------------------------------

export async function getAdminMovies(params?: {
  status?: string;
  search?: string;
  language?: string;
  genre?: string;
  page?: number;
  limit?: number;
}): Promise<{
  movies: AdminMovieItem[];
  pagination: any;
  facets?: {
    languages: { name: string; count: number }[];
    genres: { name: string; count: number }[];
    statuses: Record<string, number>;
  };
}> {
  const res = await api.get('/admin/movies', { params });
  return res.data?.data || res.data;
}

export async function updateAdminMovieStatus(
  movieId: string,
  status: string
): Promise<AdminMovieItem> {
  const res = await api.patch(`/admin/movies/${movieId}/status`, { status });
  return res.data?.data || res.data;
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export async function getAdminEvents(params?: {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{ events: EventItem[]; pagination: any }> {
  const res = await api.get('/admin/events', { params });
  return res.data?.data || res.data;
}

export async function updateAdminEventStatus(
  eventId: string,
  status: string,
  cancellation_reason?: string
) {
  const res = await api.patch(`/admin/events/${eventId}/status`, {
    status,
    cancellation_reason,
  });
  return res.data?.data || res.data;
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export async function getAdminUsers(params?: {
  search?: string;
  role?: string;
  is_active?: boolean;
  page?: number;
  limit?: number;
}): Promise<{ users: AdminUserItem[]; pagination: any }> {
  const res = await api.get('/admin/users', { params });
  return res.data?.data || res.data;
}

export async function updateAdminUserStatus(
  userId: string,
  isActive: boolean,
  reason?: string
) {
  const res = await api.patch(`/admin/users/${userId}/status`, {
    is_active: isActive,
    reason,
  });
  return res.data?.data || res.data;
}

export async function updateAdminUserRole(userId: string, role: string) {
  const res = await api.patch(`/admin/users/${userId}/role`, { role });
  return res.data?.data || res.data;
}

// ---------------------------------------------------------------------------
// Legacy / Pending Events & Partners
// ---------------------------------------------------------------------------

export async function getPendingEvents(): Promise<EventItem[]> {
  const response = await api.get<Envelope<{ items: EventItem[]; total: number }>>(
    '/admin/content/pending'
  );
  return response.data?.data?.items || [];
}

export async function updateContentStatus(
  eventId: string,
  payload: AdminContentStatusPayload
): Promise<EventItem> {
  const { data } = await api.patch<Envelope<EventItem>>(
    `/admin/content/${eventId}/status`,
    payload
  );
  return data.data;
}

export async function getAdminPartners(params: any) {
  const response = await api.get('/admin/partners', { params });
  return response.data?.data || response.data;
}

export const updatePartnerStatus = async (
  id: string,
  status: PartnerStatus,
  rejection_reason?: string
) => {
  const response = await api.patch(`/admin/partners/${id}/status`, {
    status,
    rejection_reason,
  });
  return response.data?.data || response.data;
};

export async function updateEventStatus(
  eventId: string, 
  status: 'PUBLISHED' | 'REJECTED', 
  rejection_reason?: string
) {
  const response = await api.patch(
    `/admin/content/${eventId}/status`, 
    { status, rejection_reason }
  );
  return response.data?.data || response.data;
}

// ---------------------------------------------------------------------------
// Central Admin Portal: Types & API Calls
// ---------------------------------------------------------------------------

export interface TheatreChain {
  id: string;
  name: string;
  code: string;
  contact_email?: string | null;
  contact_phone?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TheatreListItem {
  id: string;
  name: string;
  city: string;
  address?: string | null;
  chain_name?: string | null;
  chain_code?: string | null;
  operational_status: string;
  customer_payment_model: string;
  commission_model: string;
  commission_rate_display: string;
  invoice_cycle: string;
  last_sync_status: string;
}

export interface TheatrePaymentConfig {
  id?: string;
  venue_id: string;
  customer_payment_model: string;
  payment_provider: string;
  commission_model: string;
  rate_type: string;
  rate_value: number;
  fixed_fee_paise: number;
  calculation_base: string;
  invoice_cycle: string;
  due_days: number;
  currency: string;
  reconciliation_source: string;
  refund_treatment: string;
  contract_ref?: string | null;
  effective_from?: string;
  is_active?: boolean;
}

export interface TheatreConfigHistoryItem {
  id: string;
  venue_id: string;
  changed_by?: string | null;
  changed_by_name?: string | null;
  change_reason?: string | null;
  previous_config_json: string;
  new_config_json: string;
  created_at: string;
}

export interface AdminDetailedBooking {
  id: string;
  ref_code: string;
  customer_email?: string | null;
  customer_phone?: string | null;
  booking_type: string;
  movie_or_event_title: string;
  venue_id?: string | null;
  venue_name: string;
  showtime_at: string;
  seats: string[];
  quantity: number;
  ticket_paise: number;
  fnb_paise: number;
  convenience_fee_paise: number;
  total_paise: number;
  eligible_commission_base_paise: number;
  commission_earned_paise: number;
  commission_tax_paise?: number;
  commission_cgst_paise?: number;
  commission_sgst_paise?: number;
  booking_status: string;
  payment_status: string;
  refund_status: string;
  commission_invoice_status: string;
  commission_collection_status: string;
  provider_booking_id?: string | null;
  created_at: string;
}

export interface CommissionLedgerItem {
  id: string;
  booking_id: string;
  booking_ref?: string | null;
  venue_id: string;
  venue_name?: string | null;
  gross_ticket_paise: number;
  eligible_base_paise: number;
  rate_type: string;
  rate_value: number;
  commission_paise: number;
  tax_paise: number;
  cgst_paise?: number;
  sgst_paise?: number;
  status: string;
  invoice_id?: string | null;
  invoice_number?: string | null;
  created_at: string;
}

export interface CommissionInvoice {
  id: string;
  invoice_number: string;
  venue_id: string;
  venue_name?: string | null;
  period_start: string;
  period_end: string;
  booking_count: number;
  ticket_count: number;
  gross_sales_paise: number;
  commission_paise: number;
  adjustments_paise: number;
  tax_paise: number;
  cgst_paise?: number;
  sgst_paise?: number;
  total_paise: number;
  paid_paise: number;
  balance_paise: number;
  status: string;
  issue_date?: string | null;
  due_date: string;
  notes?: string | null;
  created_at: string;
}

export interface ReconciliationException {
  id: string;
  exception_type: string;
  booking_id?: string | null;
  booking_ref?: string | null;
  venue_id?: string | null;
  venue_name?: string | null;
  external_ref?: string | null;
  severity: string;
  status: string;
  discrepancy_details: string;
  resolution_notes?: string | null;
  resolved_at?: string | null;
  created_at: string;
}

export interface AdminComprehensiveStats {
  total_bookings: number;
  total_tickets: number;
  gross_booking_paise: number;
  commission_earned_paise: number;
  commission_invoiced_paise: number;
  commission_collected_paise: number;
  commission_outstanding_paise: number;
  overdue_invoices_count: number;
  total_refunds_paise: number;
  active_theatres_count: number;
  open_exceptions_count: number;
}

export interface IntegrationHealthItem {
  provider: string;
  endpoint: string;
  status: string;
  latency_ms: number;
  success_rate: string;
  last_sync: string;
}

export async function getAdminComprehensiveStats(): Promise<AdminComprehensiveStats> {
  const res = await api.get('/admin/stats/comprehensive');
  return res.data?.data || res.data;
}

export async function getAdminChains(): Promise<TheatreChain[]> {
  const res = await api.get('/admin/chains');
  return res.data?.data || res.data;
}

export async function createAdminChain(data: {
  name: string;
  code: string;
  contact_email?: string;
  contact_phone?: string;
  notes?: string;
}): Promise<TheatreChain> {
  const res = await api.post('/admin/chains', data);
  return res.data?.data || res.data;
}

export async function getAdminTheatres(params?: {
  city?: string;
  chain_code?: string;
  payment_model?: string;
  commission_model?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ theatres: TheatreListItem[]; total: number }> {
  const res = await api.get('/admin/theatres', { params });
  return res.data?.data || res.data;
}

export async function getTheatrePaymentConfig(venueId: string): Promise<TheatrePaymentConfig> {
  const res = await api.get(`/admin/theatres/${venueId}/config`);
  return res.data?.data || res.data;
}

export async function updateTheatrePaymentConfig(
  venueId: string,
  data: Partial<TheatrePaymentConfig> & { change_reason?: string }
): Promise<TheatrePaymentConfig> {
  const res = await api.put(`/admin/theatres/${venueId}/config`, data);
  return res.data?.data || res.data;
}

export async function getTheatreConfigHistory(venueId: string): Promise<TheatreConfigHistoryItem[]> {
  const res = await api.get(`/admin/theatres/${venueId}/config/history`);
  return res.data?.data || res.data;
}

export async function searchDetailedBookings(params?: {
  query?: string;
  venue_id?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<{ bookings: AdminDetailedBooking[]; total: number }> {
  const res = await api.get('/admin/bookings/detailed-search', { params });
  return res.data?.data || res.data;
}

export async function getCommissionLedger(params?: {
  venue_id?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<{ entries: CommissionLedgerItem[]; total: number }> {
  const res = await api.get('/admin/commission/ledger', { params });
  return res.data?.data || res.data;
}

export async function generateCommissionInvoice(data: {
  venue_id: string;
  period_start: string;
  period_end: string;
  due_days?: number;
  notes?: string;
}): Promise<CommissionInvoice> {
  const res = await api.post('/admin/commission/invoices/generate', data);
  return res.data?.data || res.data;
}

export async function getCommissionInvoices(params?: {
  venue_id?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<{ invoices: CommissionInvoice[]; total: number }> {
  const res = await api.get('/admin/commission/invoices', { params });
  return res.data?.data || res.data;
}

export async function updateInvoiceStatus(
  invoiceId: string,
  status: 'APPROVED' | 'ISSUED' | 'DISPUTED' | 'VOIDED',
  notes?: string
): Promise<CommissionInvoice> {
  const res = await api.patch(`/admin/commission/invoices/${invoiceId}/status`, { status, notes });
  return res.data?.data || res.data;
}

export async function recordInvoiceCollection(
  invoiceId: string,
  data: {
    amount_paise: number;
    payment_method: string;
    payment_ref: string;
    notes?: string;
  }
): Promise<any> {
  const res = await api.post(`/admin/commission/invoices/${invoiceId}/collections`, data);
  return res.data?.data || res.data;
}

export async function getReconciliationExceptions(params?: {
  status?: string;
  severity?: string;
  limit?: number;
  offset?: number;
}): Promise<{ exceptions: ReconciliationException[]; total: number }> {
  const res = await api.get('/admin/reconciliation/exceptions', { params });
  return res.data?.data || res.data;
}

export async function resolveReconciliationException(
  exceptionId: string,
  status: 'RESOLVED' | 'INVESTIGATING' | 'WRITTEN_OFF',
  resolutionNotes: string
): Promise<ReconciliationException> {
  const res = await api.patch(`/admin/reconciliation/exceptions/${exceptionId}/resolve`, {
    status,
    resolution_notes: resolutionNotes,
  });
  return res.data?.data || res.data;
}

export async function getIntegrationsHealth(): Promise<IntegrationHealthItem[]> {
  const res = await api.get('/admin/integrations/health');
  return res.data?.data || res.data;
}

