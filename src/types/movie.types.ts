export interface Movie {
  id: string;
  title: string;
  theater?:string
  description: string;
  poster_url: string;
  backdrop_url: string;
  genre: string[];
  duration_minutes: number;
  rating: number;
  rating_count:number
  director: string;
  cast: string[];
  release_date: string;
  languages: string[];
  
  format: string[];
}

export interface SeatItem {
  seat_ref: string;
  row_label: string;
  number: number;
  code: string;
  price_paise: number;
  is_available: boolean;
   is_bestseller?: boolean;
    is_couple?: boolean;   
}
export interface FnbItem {
  id: string;
  name: string;
  description?: string;
  price_paise: number;
  image_url?: string | null;
  is_veg?: boolean;
  category: string;
}
export interface SeatMapDetail {
  showtime_id: string;
  movie_title: string;
  screen_name: string;
  cinema_name?: string;
  venue_name?: string;
  starts_at: string;
  fetched_at?: string;
  seats?: SeatItem[];
  rows?: any[];
  code?: string;
  format?: string;
  language?: string;
}

export interface VenueShowtimeItem {
  id: string;
  starts_at: string;
  format?: string;
  screen_name?: string;
  language?: string;
}

export interface CastCrewMember {
  name: string;
  role: string;
  photo_url?: string | null;
}

export interface MovieDetail {
  id: string;
  title: string;
  language: string;
  duration_min: number;
  certificate: string;
  poster_url: string | null;
  banner_url?: string | null;
  trailer_url?: string | null;
  synopsis?: string | null;
  rating_count?:number|null
  external_rating?:number|null
  rating?:number|null
  genre: string;
  release_date: string;
  venues?: any[];
  cast?: CastCrewMember[];
  crew?: CastCrewMember[];
}
export interface MovieReviewsSummary {
  rating: number;
  rating_count: number;
  reviews: MovieReview[];
  hashtag_counts?: Record<string, number>;
}
export interface CreateReviewPayload {
  rating: number;
  hashtags: string[];
}
export interface MovieReview {
  id: string;
  movie_id: string;
  user_id: string;
  rating: number;
  hashtags: string[];
  created_at: string;
  updated_at: string;
  user_name?: string;
  likes?: number;
}
export interface MovieShowtime {
  id: string;
  movie_id: string;
  theater: string;
  screen: string;
  time: string;
  date: string;
  price: number;
  seats_available: number;
}
