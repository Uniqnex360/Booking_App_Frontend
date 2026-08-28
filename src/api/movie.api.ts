import api from './client';
import type { Movie, MovieShowtime } from '@/types/movie.types';

export async function getMovies(): Promise<Movie[]> {
  const { data } = await api.get<Movie[]>('/movies');
  return data;
}

export async function getMovieById(id: string): Promise<Movie> {
  const { data } = await api.get<Movie>(`/movies/${id}`);
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
