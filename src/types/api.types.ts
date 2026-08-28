// export interface Event {
//   id: string;
//   title: string;
//   description: string;
//   image_url: string;
//   venue: string;
//   location: string;
//   date: string;
//   time: string;
//   price: number;
//   category: string;
//   rating: number;
//   reviews_count: number;
//   tags: string[];
// }
export interface Event {
  id: string;
  title: string;
  slug: string;
  category: EventCategory;
  venue_name: string;      
  city: string;            
  starts_at: string;       
  ends_at: string;
  poster_image_url?: string;
  rating?: number;
  reviews_count?: number;
  tags?: string[];
}
export type EventCategory = 'concert' | 'comedy' | 'sports' | 'workshop' | 'theatre' | 'exhibition' | 'other';

export interface Restaurant {
  id: string;
  name: string;
  description: string;
  image_url: string;
  cuisine: string;
  location: string;
  price_range: string;
  rating: number;
  reviews_count: number;
  available_times: string[];
  tags: string[];
}
