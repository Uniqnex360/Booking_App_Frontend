import api from './client';
import type { 
  ExtendedProfile, 
  Address, 
  ProfileUpdatePayload, 
  AddressCreatePayload 
} from '@/types/profile.types';


export const getExtendedProfile = async (): Promise<ExtendedProfile> => {
  const response = await api.get<ExtendedProfile>('/user/me');
  return response.data;
};

export const updateProfile = async (data: ProfileUpdatePayload): Promise<ExtendedProfile> => {
  const response = await api.patch<ExtendedProfile>('/user/me', data);
  return response.data;
};


export const getAddresses = async (): Promise<Address[]> => {
  const response = await api.get<Address[]>('/user/me/addresses');
  return response.data;
};

export const createAddress = async (data: AddressCreatePayload): Promise<Address> => {
  const response = await api.post<Address>('/user/me/addresses', data);
  return response.data;
};

export const updateAddress = async (id: string, data: Partial<AddressCreatePayload>): Promise<Address> => {
  const response = await api.patch<Address>(`/user/me/addresses/${id}`, data);
  return response.data;
};

export const deleteAddress = async (id: string): Promise<void> => {
  await api.delete(`/user/me/addresses/${id}`);
};