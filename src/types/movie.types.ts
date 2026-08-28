export interface Movie {
  id: string;
  title: string;
  description: string;
  poster_url: string;
  backdrop_url: string;
  genre: string[];
  duration_minutes: number;
  rating: number;
  director: string;
  cast: string[];
  release_date: string;
  languages: string[];
  format: string[];
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
