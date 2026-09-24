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
