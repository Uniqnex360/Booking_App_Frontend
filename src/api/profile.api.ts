import api from './client';
import type { 
  ExtendedProfile, 
  Address, 
  ProfileUpdatePayload, 
  AddressCreatePayload 
} from '@/types/profile.types';


export const getExtendedProfile = async (): Promise<ExtendedProfile> => {
  const response = await api.get<ExtendedProfile>('/users/me');
  return response.data;
};

export const updateProfile = async (data: ProfileUpdatePayload): Promise<ExtendedProfile> => {
  const response = await api.patch<ExtendedProfile>('/users/me', data);
  return response.data;
};


export const getAddresses = async (): Promise<Address[]> => {
  const response = await api.get<Address[]>('/users/me/addresses');
  return response.data;
};

export const createAddress = async (data: AddressCreatePayload): Promise<Address> => {
  const response = await api.post<{data:Address}>('/users/me/addresses', data);
  return response.data.data; 
};

export const updateAddress = async (id: string, data: Partial<AddressCreatePayload>): Promise<Address> => {
  const response = await api.patch<{data:Address}>(`/users/me/addresses/${id}`, data);
  return response.data.data; 
};

export const deleteAddress = async (id: string): Promise<void> => {
  await api.delete(`/users/me/addresses/${id}`);
};