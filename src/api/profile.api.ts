import api from './client';
import type { 
  ExtendedProfile, 
  Address, 
  ProfileUpdatePayload, 
  AddressCreatePayload 
} from '@/types/profile.types';


export const getExtendedProfile = async (): Promise<ExtendedProfile> => {
  const response = await api.get<{ data: ExtendedProfile }>('/users/me');
  return (response.data as any)?.data || response.data;
};

export const updateProfile = async (data: ProfileUpdatePayload): Promise<ExtendedProfile> => {
  const response = await api.patch<{ data: ExtendedProfile }>('/users/me', data);
  return (response.data as any)?.data || response.data;
};


export const getAddresses = async (): Promise<Address[]> => {
  const response = await api.get<{ data: { addresses: Address[] } | Address[] }>('/users/me/addresses');
  const resData = (response.data as any)?.data || response.data;
  if (Array.isArray(resData)) return resData;
  if (Array.isArray(resData?.addresses)) return resData.addresses;
  return [];
};

export const createAddress = async (data: AddressCreatePayload): Promise<Address> => {
  const response = await api.post<{ data: Address }>('/users/me/addresses', data);
  return (response.data as any)?.data || response.data; 
};

export const updateAddress = async (id: string, data: Partial<AddressCreatePayload>): Promise<Address> => {
  const response = await api.patch<{ data: Address }>(`/users/me/addresses/${id}`, data);
  return (response.data as any)?.data || response.data; 
};

export const deleteAddress = async (id: string): Promise<void> => {
  await api.delete(`/users/me/addresses/${id}`);
};

export const deleteAccount = async (): Promise<void> => {
  await api.delete('/users/me');
};