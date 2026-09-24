import api from './client';
import type { CreateReviewPayload, Movie, MovieDetail, MovieReview, MovieReviewsSummary, MovieShowtime } from '@/types/movie.types';

export async function getMovies(): Promise<Movie[]> {
  const { data } = await api.get<Movie[]>('/movies');
  return data;
}

export async function getMovieById<T = MovieDetail>(id: string): Promise<T> {
  const { data } = await api.get<T>(`/movies/${id}`);
  return data;
}

export async function getMovieShowtimes(
  id: string,
  date?: string
): Promise<MovieShowtime[]> {
  const params = date ? { date } : {};
  const { data } = await api.get<MovieShowtime[]>(`/movies/${id}/showtimes`, {
    params,
  });
  return data;
}



export async function getMovieReviews(movieId: string): Promise<MovieReview[]> {
  const { data } = await api.get<{ data: MovieReview[] } | MovieReview[]>(`/movies/${movieId}/reviews`);
  return Array.isArray(data) ? data : (data?.data || []);
}

export async function createMovieReview(movieId: string, payload: CreateReviewPayload): Promise<MovieReview> {
  const { data } = await api.post<{ data: MovieReview } | MovieReview>(`/movies/${movieId}/reviews`, payload);
  return 'data' in data ? data.data : data;
}