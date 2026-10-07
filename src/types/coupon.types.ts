export interface Coupon {
  id: string;
  code: string;
  partner_id: string;
  event_id?: string | null;
  discount_type: 'PERCENT' | 'FLAT';
  discount_value: number;
  min_order_paise: number;
  max_discount_paise?: number | null;
  valid_from: string;
  valid_until: string;
  total_usage_limit?: number | null;
  per_user_limit: number;
  used_count: number;
  is_active: boolean;
  created_at: string;
}

export interface CouponCreatePayload {
  code: string;
  event_id?: string | null;
  discount_type: 'PERCENT' | 'FLAT';
  discount_value: number;
  min_order_paise: number;
  max_discount_paise?: number | null;
  valid_from: string;
  valid_until: string;
  total_usage_limit?: number | null;
  per_user_limit: number;
}

export interface CouponUpdatePayload {
  is_active?: boolean;
  valid_until?: string;
  total_usage_limit?: number | null;
  per_user_limit?: number;
}

export interface ApplyCouponResult {
  valid: boolean;
  code: string;
  discount_paise: number;
  final_paise: number;
  message: string;
}

export interface CouponRedemption {
  id: string;
  booking_id: string;
  user_id: string;
  discount_paise: number;
  redeemed_at: string;
}

export interface AvailableCoupon {
  id: string;
  code: string;
  discount_type: 'PERCENT' | 'FLAT';
  discount_value: number;
  min_order_paise: number;
  max_discount_paise?: number | null;
  valid_until: string;
  discount_label: string;
  min_order_label: string;
  terms: string;
}

