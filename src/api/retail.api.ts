import axios from 'axios';
import { api, getAccessToken } from './client';

// When running locally on localhost, communicate with local backend on port 9001
const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const RETAIL_API_BASE_URL = isLocal ? 'http://localhost:9001/v1' : (import.meta.env.VITE_API_BASE_URL || 'http://localhost:9001/v1');

const retailClient = axios.create({
  baseURL: RETAIL_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

retailClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface RetailCategory {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  description?: string;
  display_order: number;
}

export interface StoreBranch {
  id: string;
  partner_id: string;
  retail_partner_id: string;
  name: string;
  store_code: string;
  address: string;
  city: string;
  state?: string;
  pin_code?: string;
  latitude?: number;
  longitude?: number;
  map_url?: string;
  phone?: string;
  email?: string;
  images?: string[];
  opening_time?: string;
  closing_time?: string;
  weekly_working_days?: string;
  holiday_schedule?: string;
  is_active: boolean;
  distance_km?: number;
  created_at: string;
}

export interface RetailOffer {
  id: string;
  partner_id: string;
  retail_partner_id: string;
  brand_name: string;
  brand_logo_url?: string;
  title: string;
  short_description?: string;
  description?: string;
  banner_url?: string;
  offer_type: 'PERCENTAGE' | 'FLAT_AMOUNT' | 'BUY_X_GET_Y' | 'GIFT_WITH_PURCHASE';
  offer_value?: number;
  min_purchase_amount?: number;
  max_discount_amount?: number;
  is_vybhz_exclusive: boolean;
  is_coupon_required: boolean;
  starts_at: string;
  ends_at: string;
  total_redemption_cap?: number;
  per_customer_cap: number;
  claimed_count: number;
  redeemed_count: number;
  terms_conditions?: string;
  status: string;
  stores: StoreBranch[];
  categories: RetailCategory[];
  has_active_coupon: boolean;
  created_at: string;
}

export interface RetailBrand {
  id: string;
  partner_id: string;
  brand_name: string;
  business_type: string;
  tagline?: string;
  description?: string;
  logo_url?: string;
  cover_image_url?: string;
  website_url?: string;
  instagram_handle?: string;
  status: string;
  stores_count: number;
  active_offers_count: number;
  stores?: StoreBranch[];
  offers?: RetailOffer[];
  created_at: string;
}

export interface CustomerCoupon {
  id: string;
  customer_id: string;
  offer_id: string;
  coupon_code: string;
  qr_code_payload: string;
  claimed_at: string;
  expires_at: string;
  status: 'ACTIVE' | 'REDEEMED' | 'EXPIRED' | 'CANCELLED';
  redeemed_at?: string;
  redeemed_store_id?: string;
  redeemed_store_name?: string;
  offer?: RetailOffer;
}

export interface CouponValidationResult {
  is_valid: boolean;
  status: string;
  message: string;
  customer_coupon_id?: string;
  coupon_code?: string;
  offer_id?: string;
  offer_title?: string;
  brand_name?: string;
  offer_type?: string;
  offer_value?: number;
  min_purchase_amount?: number;
  max_discount_amount?: number;
  terms_conditions?: string;
  expires_at?: string;
  eligible_stores?: { id: string; name: string; city: string }[];
  customer_masked?: {
    name: string;
    phone: string;
    email: string;
  };
  current_store_eligible?: boolean;
}

export interface CouponRedemptionResult {
  success: boolean;
  status: string;
  message: string;
  redemption_id?: string;
  coupon_code?: string;
  redeemed_at?: string;
  store_name?: string;
  staff_name?: string;
  bill_reference_number?: string;
  discount_applied?: number;
}

export interface RetailAnalytics {
  total_offers: number;
  active_offers: number;
  total_stores: number;
  total_claims: number;
  total_redemptions: number;
  redemption_rate_percent: number;
  total_bill_amount: number;
  total_discount_given: number;
  recent_redemptions: any[];
}

export const retailApi = {
  // Customer Discovery
  getCategories: async (): Promise<RetailCategory[]> => {
    const res = await retailClient.get('/customer/fashion/categories');
    return res.data?.data || [];
  },

  getOffers: async (params?: {
    city?: string;
    category?: string;
    exclusive_only?: boolean;
    brand_id?: string;
    lat?: number;
    lng?: number;
    search?: string;
  }): Promise<RetailOffer[]> => {
    const res = await retailClient.get('/customer/fashion/offers', { params });
    return res.data?.data || [];
  },

  getOfferDetail: async (id: string): Promise<RetailOffer> => {
    const res = await retailClient.get(`/customer/fashion/offers/${id}`);
    return res.data?.data;
  },

  getBrands: async (params?: { city?: string; search?: string }): Promise<RetailBrand[]> => {
    const res = await retailClient.get('/customer/fashion/brands', { params });
    return res.data?.data || [];
  },

  getBrandDetail: async (id: string): Promise<RetailBrand> => {
    const res = await retailClient.get(`/customer/fashion/brands/${id}`);
    return res.data?.data;
  },

  claimCoupon: async (offerId: string): Promise<CustomerCoupon> => {
    const res = await retailClient.post(`/customer/fashion/offers/${offerId}/claim`);
    return res.data?.data;
  },

  getMyCoupons: async (status?: string): Promise<CustomerCoupon[]> => {
    const res = await retailClient.get('/customer/fashion/my-coupons', {
      params: status ? { status_filter: status } : {},
    });
    return res.data?.data || [];
  },

  getMyCouponDetail: async (id: string): Promise<CustomerCoupon> => {
    const res = await retailClient.get(`/customer/fashion/my-coupons/${id}`);
    return res.data?.data;
  },

  // In-Store Staff QR Validation & Redemption
  validateCoupon: async (data: {
    code_or_payload: string;
    store_id?: string;
  }): Promise<CouponValidationResult> => {
    const res = await retailClient.post('/retail/coupons/validate', data);
    return res.data?.data;
  },

  redeemCoupon: async (data: {
    code_or_payload: string;
    store_id: string;
    bill_reference_number?: string;
    bill_amount?: number;
    notes?: string;
    idempotency_key?: string;
  }): Promise<CouponRedemptionResult> => {
    const res = await retailClient.post('/retail/coupons/redeem', data);
    return res.data?.data;
  },

  // Partner Portal
  getMyRetailPartner: async (): Promise<RetailBrand | null> => {
    const res = await retailClient.get('/partner/retail/profile');
    return res.data?.data || null;
  },

  registerRetailPartner: async (data: any): Promise<RetailBrand> => {
    const res = await retailClient.post('/partner/retail/register', data);
    return res.data?.data;
  },

  getMyStores: async (): Promise<StoreBranch[]> => {
    const res = await retailClient.get('/partner/retail/stores');
    return res.data?.data || [];
  },

  createStore: async (data: any): Promise<StoreBranch> => {
    const res = await retailClient.post('/partner/retail/stores', data);
    return res.data?.data;
  },

  updateStore: async (id: string, data: any): Promise<StoreBranch> => {
    const res = await retailClient.put(`/partner/retail/stores/${id}`, data);
    return res.data?.data;
  },

  getMyOffers: async (): Promise<RetailOffer[]> => {
    const res = await retailClient.get('/partner/retail/offers');
    return res.data?.data || [];
  },

  createOffer: async (data: any): Promise<RetailOffer> => {
    const res = await retailClient.post('/partner/retail/offers', data);
    return res.data?.data;
  },

  getAnalytics: async (params?: { store_id?: string }): Promise<RetailAnalytics> => {
    const res = await retailClient.get('/partner/retail/analytics', { params });
    return res.data?.data;
  },
};

