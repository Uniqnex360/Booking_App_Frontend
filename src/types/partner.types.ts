import { PaginationMeta } from ".";

export type PartnerType = 'restaurant' | 'cinema' | 'event_organiser';
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
  approved_at?: string;
  rejection_reason?: string;
  created_at: string;
}

export interface PartnerRegisterPayload {
  business_name: string;
  partner_type: PartnerType;
  contact_name: string;
  contact_phone: string;
  city: string;
  gst_number?: string;
  pan_number?: string;
}


export interface PaginatedPartners {
  partners: any[]; 
  pagination: PaginationMeta;
}

export interface PaginatedEvents {
  items: any[]; 
  total: number;
}
