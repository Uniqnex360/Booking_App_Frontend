import { ApiResponse } from '@/types';
import api from './client';
import type {
  Partner,
  PartnerRegisterPayload,
  PartnerStatementResponse,
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

export async function getMyStatement(params?: {
  period?: string;
  from_date?: string;
  to_date?: string;
  page?: number;
  limit?: number;
}): Promise<PartnerStatementResponse> {
  const response = await api.get<ApiResponse<PartnerStatementResponse>>('/partner/statement', { params });
  return response.data.data;
}

export async function updateMyBankAccount(data: {
  bank_account_number: string;
  bank_ifsc_code: string;
  bank_name: string;
  bank_account_holder_name: string;
  bank_account_type?: string;
  bank_branch?: string;
  remittance_schedule?: string;
}): Promise<Partner> {
  const response = await api.put<ApiResponse<Partner>>('/partner/bank-account', data);
  return response.data.data;
}

export async function uploadPartnerDocument(
  file: File,
  docType: string = 'document'
): Promise<{ url: string; filename: string; size: number }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('doc_type', docType);
  const response = await api.post<ApiResponse<{ url: string; filename: string; size: number }>>(
    '/partner/upload-document',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return response.data.data;
}
