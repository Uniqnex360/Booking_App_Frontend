import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader } from '@/components/common/Loader';
import { getMovies } from '@/api/movie.api';
import type { Movie } from '@/types/movie.types';
import { Search, Star, Clock, Calendar } from 'lucide-react';

const mockMovies: Movie[] = [
  {
    id: '1',
    title: 'The Vintage Year',
    description:
      'A sweeping drama set in the vineyards of Burgundy, following three generations of a winemaking family through love, loss, and legacy.',
    poster_url:
      'https://images.pexels.com/photos/20151747/pexels-photo-20151747.jpeg?auto=compress&cs=tinysrgb&h=500&w=350',
    backdrop_url: '',
    genre: ['Drama', 'Romance'],
    duration_minutes: 142,
    rating: 4.7,
    director: 'Sophie Marchand',
    cast: ['Jean Reno', 'Marion Cotillard', 'Omar Sy'],
    release_date: '2026-08-15',
    languages: ['English', 'French'],
    format: ['IMAX', 'Dolby'],
  },
  {
    id: '2',
    title: 'Midnight in the Cellar',
    description:
      'A thriller about a sommelier who discovers a century-old secret hidden in the wine cellar of a mysterious estate.',
    poster_url:
      'https://images.pexels.com/photos/39605/wineglass-wine-glass-wine-tasting-39605.jpeg?auto=compress&cs=tinysrgb&h=500&w=350',
    backdrop_url: '',
    genre: ['Thriller', 'Mystery'],
    duration_minutes: 118,
    rating: 4.3,
    director: 'James Whitfield',
    cast: ['Tilda Swinton', 'Michael Fassbender'],
    release_date: '2026-09-01',
    languages: ['English'],
    format: ['Standard', 'Dolby'],
  },
  {
    id: '3',
    title: 'Harvest Moon',
    description:
      'A heartwarming comedy about a city chef who inherits a struggling vineyard and must learn the art of winemaking.',
    poster_url:
      'https://images.pexels.com/photos/8856555/pexels-photo-8856555.jpeg?auto=compress&cs=tinysrgb&h=500&w=350',
    backdrop_url: '',
    genre: ['Comedy', 'Drama'],
    duration_minutes: 105,
    rating: 4.5,
    director: 'Lucia Fernandez',
    cast: ['Penelope Cruz', 'Javier Bardem'],
    release_date: '2026-08-20',
    languages: ['English', 'Spanish'],
    format: ['Standard'],
  },
  {
    id: '4',
    title: 'The Last Pour',
    description:
      'An action-packed adventure following a master thief who targets the world\'s most exclusive wine collection.',
    poster_url:
      'https://images.pexels.com/photos/14943491/pexels-photo-14943491.jpeg?auto=compress&cs=tinysrgb&h=500&w=350',
    backdrop_url: '',
    genre: ['Action', 'Adventure'],
    duration_minutes: 128,
    rating: 4.6,
    director: 'David Chen',
    cast: ['Idris Elba', 'Charlize Theron'],
    release_date: '2026-08-28',
    languages: ['English'],
    format: ['IMAX', '4DX'],
  },
  {
    id: '5',
    title: 'Crimson Letters',
    description:
      'A historical drama about forbidden love in 19th-century wine country, told through letters discovered in an old château.',
    poster_url:
      'https://images.pexels.com/photos/12181763/pexels-photo-12181763.jpeg?auto=compress&cs=tinysrgb&h=500&w=350',
    backdrop_url: '',
    genre: ['Drama', 'Historical'],
    duration_minutes: 137,
    rating: 4.8,
    director: 'Isabelle Moreau',
    cast: ['Keira Knightley', 'Ralph Fiennes'],
    release_date: '2026-09-05',
    languages: ['English', 'French'],
    format: ['IMAX', 'Dolby'],
  },
  {
    id: '6',
    title: 'Sparkling',
    description:
      'A vibrant documentary exploring the world of champagne making, from the chalk caves of Reims to exclusive tasting rooms.',
    poster_url:
      'https://images.pexels.com/photos/941861/pexels-photo-941861.jpeg?auto=compress&cs=tinysrgb&h=500&w=350',
    backdrop_url: '',
    genre: ['Documentary'],
    duration_minutes: 95,
    rating: 4.4,
    director: 'Henri Dubois',
    cast: ['Various vintners'],
    release_date: '2026-08-10',
    languages: ['English', 'French'],
    format: ['Standard'],
  },
];

export default function MoviesPage() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const data = await getMovies();
        setMovies(data);
      } catch {
        setMovies(mockMovies);
      } finally {
        setLoading(false);
      }
    };
    fetchMovies();
  }, []);

  const filtered = movies.filter(
    (m) =>
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      m.genre.some((g) => g.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="bg-gradient-to-b from-wine-50 to-background pt-28 pb-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="font-serif text-4xl font-semibold text-wine-950 sm:text-5xl">
            Now Showing
          </h1>
          <p className="mt-2 text-foreground/60">
            Book tickets for the latest releases
          </p>

          <div className="relative mt-6 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search movies or genres..."
              className="h-11 rounded-xl pl-10"
            />
          </div>
        </div>
      </div>

      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader className="h-8 w-8" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {filtered.map((movie) => (
                <Link
                  key={movie.id}
                  to={`/movies/${movie.id}`}
                  className="group overflow-hidden rounded-2xl border border-border/50 bg-card shadow-soft transition-all hover:-translate-y-1 hover:shadow-soft-lg"
                >
                  <div className="relative aspect-[2/3] overflow-hidden">
                    <img
                      src={movie.poster_url}
                      alt={movie.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3">
                      <div className="flex items-center gap-1 text-white">
                        <Star className="h-3.5 w-3.5 fill-wine-400 text-wine-400" />
                        <span className="text-xs font-semibold">
                          {movie.rating}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="p-3">
                    <h3 className="font-serif text-base font-semibold text-wine-950">
                      {movie.title}
                    </h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {movie.genre.join(' • ')}
                    </p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {Math.floor(movie.duration_minutes / 60)}h{' '}
                        {movie.duration_minutes % 60}m
                      </span>
                    </div>
                    <Button
                      size="sm"
                      className="mt-3 w-full rounded-full bg-wine-700 text-xs font-semibold text-white shadow-wine hover:bg-wine-800"
                    >
                      Book Tickets
                    </Button>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
