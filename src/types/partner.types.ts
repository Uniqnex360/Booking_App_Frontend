import { PaginationMeta } from ".";

export type PartnerType =
  | 'experience_partner'
  | 'restaurant'
  | 'event_organiser'
  | 'cinema';
export type PartnerStatus =
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'SUSPENDED';

export interface Partner {
  id: string;
  business_name: string;
  partner_type: PartnerType;
  contact_name: string;
  contact_phone: string;
  city: string;
  status: PartnerStatus;
  commission_rate: number;
  gst_number?: string;
  pan_number?: string;
  gst_certificate_url?: string;
  pan_card_url?: string;
  bank_account_number?: string;
  bank_ifsc_code?: string;
  bank_name?: string;
  bank_account_holder_name?: string;
  bank_account_type?: string;
  bank_branch?: string;
  remittance_schedule?: string;
  bank_verification_status?: string;
  approved_at?: string;
  rejection_reason?: string;
  created_at: string;
}

export interface PartnerBankAccount {
  account_holder_name: string;
  bank_name: string;
  account_number?: string;
  masked_account_number?: string;
  ifsc_code: string;
  account_type?: string;
  branch?: string;
  remittance_schedule?: string;
  verification_status?: string;
}

export interface PartnerRemittance {
  id: string;
  amount_paise: number;
  amount_inr: number;
  utr_number: string;
  bank_name?: string;
  bank_account_number?: string;
  status: string;
  notes?: string;
  created_at: string;
}

export interface PartnerLedgerItem {
  id: string;
  date: string;
  type: 'BOOKING_SALE' | 'REMITTANCE_PAYOUT';
  reference: string;
  description: string;
  item_title: string;
  gross_paise: number;
  commission_paise: number;
  tax_paise: number;
  net_paise: number;
  status: string;
  utr_number?: string | null;
}

export interface PartnerFinancialSummary {
  total_gross_paise: number;
  total_gross_inr: number;
  platform_commission_paise: number;
  platform_commission_inr: number;
  tds_tcs_paise: number;
  tds_tcs_inr: number;
  net_earned_paise: number;
  net_earned_inr: number;
  total_remitted_paise: number;
  total_remitted_inr: number;
  pending_remittance_paise: number;
  pending_remittance_inr: number;
  total_bookings_count: number;
  total_remittances_count: number;
}

export interface PartnerStatementResponse {
  partner: Partner & { bank_account: PartnerBankAccount };
  financial_summary: PartnerFinancialSummary;
  remittances: PartnerRemittance[];
  statement_ledger: PartnerLedgerItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
  period: {
    preset: string;
    from_date?: string | null;
    to_date?: string | null;
  };
}

export interface PartnerRegisterPayload {
  business_name: string;
  partner_type: PartnerType;
  contact_name: string;
  contact_phone: string;
  city: string;
  gst_number?: string;
  pan_number?: string;
  gst_certificate_url?: string;
  pan_card_url?: string;
}


export interface PaginatedPartners {
  partners: any[]; 
  pagination: PaginationMeta;
}

export interface PaginatedEvents {
  items: any[]; 
  total: number;
}
