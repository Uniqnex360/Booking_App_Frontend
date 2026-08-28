import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader } from '@/components/common/Loader';
import { getMovieById, getMovieShowtimes } from '@/api/movie.api';
import type { Movie, MovieShowtime } from '@/types/movie.types';
import { Star, Clock, Calendar, ArrowLeft, MapPin } from 'lucide-react';

const mockMovie: Movie = {
  id: '1',
  title: 'The Vintage Year',
  description:
    'A sweeping drama set in the vineyards of Burgundy, following three generations of a winemaking family through love, loss, and legacy. When the eldest son returns after a decade abroad, he must confront the secrets that tore the family apart and decide whether to preserve the estate or sell it to a corporation.',
  poster_url:
    'https://images.pexels.com/photos/20151747/pexels-photo-20151747.jpeg?auto=compress&cs=tinysrgb&h=600&w=400',
  backdrop_url:
    'https://images.pexels.com/photos/20151747/pexels-photo-20151747.jpeg?auto=compress&cs=tinysrgb&h=800&w=1600',
  genre: ['Drama', 'Romance'],
  duration_minutes: 142,
  rating: 4.7,
  director: 'Sophie Marchand',
  cast: ['Jean Reno', 'Marion Cotillard', 'Omar Sy'],
  release_date: '2026-08-15',
  languages: ['English', 'French'],
  format: ['IMAX', 'Dolby'],
};

const mockShowtimes: MovieShowtime[] = [
  { id: 's1', movie_id: '1', theater: 'Grand Cinema', screen: 'Screen 1 - IMAX', time: '10:00 AM', date: '2026-08-21', price: 18, seats_available: 120 },
  { id: 's2', movie_id: '1', theater: 'Grand Cinema', screen: 'Screen 1 - IMAX', time: '1:30 PM', date: '2026-08-21', price: 18, seats_available: 85 },
  { id: 's3', movie_id: '1', theater: 'Grand Cinema', screen: 'Screen 3 - Dolby', time: '4:00 PM', date: '2026-08-21', price: 22, seats_available: 60 },
  { id: 's4', movie_id: '1', theater: 'Grand Cinema', screen: 'Screen 3 - Dolby', time: '7:15 PM', date: '2026-08-21', price: 25, seats_available: 200 },
  { id: 's5', movie_id: '1', theater: 'Grand Cinema', screen: 'Screen 1 - IMAX', time: '10:30 PM', date: '2026-08-21', price: 15, seats_available: 150 },
];

export default function MovieDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [showtimes, setShowtimes] = useState<MovieShowtime[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const m = await getMovieById(id!);
        setMovie(m);
        const s = await getMovieShowtimes(id!);
        setShowtimes(s);
      } catch {
        setMovie(mockMovie);
        setShowtimes(mockShowtimes);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  if (loading || !movie) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex justify-center py-20">
          <Loader className="h-8 w-8" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Backdrop */}
      <div className="relative h-64 overflow-hidden sm:h-80">
        <img
          src={movie.backdrop_url || movie.poster_url}
          alt={movie.title}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Link
          to="/movies"
          className="mt-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-wine-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to movies
        </Link>

        <div className="mt-6 flex flex-col gap-8 sm:flex-row">
          {/* Poster */}
          <div className="flex-shrink-0">
            <div className="overflow-hidden rounded-2xl shadow-soft-lg">
              <img
                src={movie.poster_url}
                alt={movie.title}
                className="w-48 rounded-2xl sm:w-56"
              />
            </div>
          </div>

          {/* Details */}
          <div className="flex-1">
            <div className="flex flex-wrap gap-2">
              {movie.genre.map((g) => (
                <Badge
                  key={g}
                  variant="outline"
                  className="border-wine-200 bg-wine-50 text-wine-700"
                >
                  {g}
                </Badge>
              ))}
            </div>
            <h1 className="mt-3 font-serif text-4xl font-semibold text-wine-950 sm:text-5xl">
              {movie.title}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-wine-500 text-wine-500" />
                <span className="font-semibold text-foreground">
                  {movie.rating}
                </span>
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {Math.floor(movie.duration_minutes / 60)}h{' '}
                {movie.duration_minutes % 60}m
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {new Date(movie.release_date).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>

            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-foreground/70">
              {movie.description}
            </p>

            <div className="mt-4 grid grid-cols-2 gap-4 text-sm sm:max-w-md">
              <div>
                <p className="font-semibold text-foreground">Director</p>
                <p className="text-muted-foreground">{movie.director}</p>
              </div>
              <div>
                <p className="font-semibold text-foreground">Languages</p>
                <p className="text-muted-foreground">
                  {movie.languages.join(', ')}
                </p>
              </div>
              <div className="col-span-2">
                <p className="font-semibold text-foreground">Cast</p>
                <p className="text-muted-foreground">{movie.cast.join(', ')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Showtimes */}
        <div className="mt-12 pb-8">
          <h2 className="font-serif text-2xl font-semibold text-wine-950">
            Showtimes
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {movie.theater || 'Grand Cinema'} • Today,{' '}
            {new Date().toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
            })}
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {showtimes.map((show) => (
              <div
                key={show.id}
                className="flex items-center justify-between rounded-xl border border-border/50 bg-card p-4 shadow-soft transition-all hover:border-wine-200 hover:shadow-soft-lg"
              >
                <div>
                  <p className="font-serif text-lg font-semibold text-wine-950">
                    {show.time}
                  </p>
                  <p className="text-xs text-muted-foreground">{show.screen}</p>
                  <p className="mt-1 text-xs text-success">
                    {show.seats_available} seats available
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-serif text-xl font-semibold text-wine-700">
                    ${show.price}
                  </p>
                  <Button
                    size="sm"
                    className="mt-1 rounded-full bg-wine-700 text-xs font-semibold text-white shadow-wine hover:bg-wine-800"
                    onClick={() =>
                      navigate(`/booking/movie/${show.id}`)
                    }
                  >
                    Book
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="h-8" />
      <Footer />
    </div>
  );
}
