import { api, unwrap } from './client';
import type {
  Coupon,
  CouponCreatePayload,
  CouponUpdatePayload,
  ApplyCouponResult,
  CouponRedemption,
} from '@/types/coupon.types';

export async function createCoupon(data: CouponCreatePayload): Promise<Coupon> {
  return unwrap<Coupon>(api.post('/partner/coupons', data));
}

export async function getPartnerCoupons(): Promise<Coupon[]> {
  return unwrap<Coupon[]>(api.get('/partner/coupons'));
}

export async function getCouponDetail(id: string): Promise<Coupon> {
  return unwrap<Coupon>(api.get(`/partner/coupons/${id}`));
}

export async function updateCoupon(id: string, data: CouponUpdatePayload): Promise<Coupon> {
  return unwrap<Coupon>(api.patch(`/partner/coupons/${id}`, data));
}

export async function deleteCoupon(id: string): Promise<{ id: string; is_active: boolean }> {
  return unwrap<{ id: string; is_active: boolean }>(api.delete(`/partner/coupons/${id}`));
}

export async function getCouponRedemptions(id: string): Promise<CouponRedemption[]> {
  return unwrap<CouponRedemption[]>(api.get(`/partner/coupons/${id}/redemptions`));
}

export async function applyCoupon(data: {
  code: string;
  event_id: string;
  cart_paise: number;
}): Promise<ApplyCouponResult> {
  return unwrap<ApplyCouponResult>(api.post('/checkout/apply-coupon', data));
}

export async function removeCoupon(data: {
  code: string;
  event_id?: string;
}): Promise<{ status: string }> {
  return unwrap<{ status: string }>(api.post('/checkout/remove-coupon', data));
}

