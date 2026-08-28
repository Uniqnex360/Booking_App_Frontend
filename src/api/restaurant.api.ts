import api from './client';
import type { Restaurant } from '@/types/api.types';

export async function getRestaurants(): Promise<Restaurant[]> {
  const { data } = await api.get<Restaurant[]>('/restaurants');
  return data;
}

export async function getRestaurantById(id: string): Promise<Restaurant> {
  const { data } = await api.get<Restaurant>(`/restaurants/${id}`);
  return data;
}

export async function searchRestaurants(query: string): Promise<Restaurant[]> {
  const { data } = await api.get<Restaurant[]>('/restaurants', {
    params: { q: query },
  });
  return data;
}
