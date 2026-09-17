import { ApiResponse } from '@/types';
import api from './client';
import type {
  Partner,
  PartnerRegisterPayload,
} from '@/types/partner.types';

export const registerPartner = (data: PartnerRegisterPayload) =>
  api.post<Partner>('/partner/register', data).then((res) => res.data);

export async function getMyPartnerProfile() {
  const response = await api.get<ApiResponse<Partner>>('/partner/me');
  return response.data.data;
}
export async function getPartnerRevenue(fromDate?: string, toDate?: string) {
  const params: any = {};
  if (fromDate) params.from_date = fromDate;
  if (toDate) params.to_date = toDate;
  const response = await api.get<any>('/partner/revenue', { params });
  return response.data.data;
}
