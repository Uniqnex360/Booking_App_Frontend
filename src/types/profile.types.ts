export type Gender = 'Male' | 'Female' | 'Other' | 'Prefer not to say';

export interface ExtendedProfile {
  id: string;
  user_id: string;
  avatar_url?: string;
  date_of_birth?: string;
  gender?: Gender;
  preferred_language: string;
  bio?: string;
  created_at: string;
  updated_at: string;
}

export interface ProfileUpdatePayload {
  avatar_url?: string;
  date_of_birth?: string;
  gender?: Gender;
  preferred_language?: string;
  bio?: string;
}

export interface Address {
  id: string;
  user_id: string;
  label: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  latitude?: number;
  longitude?: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface AddressCreatePayload {
  label: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  is_default?: boolean;
}