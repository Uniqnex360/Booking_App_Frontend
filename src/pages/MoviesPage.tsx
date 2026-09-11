import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Loader } from '@/components/common/Loader';
import { api, unwrap } from '@/api/client';
import { formatRupees } from '@/utils/currencyFormatter';
import { Search, Clock, Calendar } from 'lucide-react';

interface MovieItem {
  id: string;
  title: string;
  language: string;
  duration_min: number;
  certificate: string;
  poster_url: string | null;
  earliest_showtime?: string;
  min_price_paise?: number;
}

export default function MoviesPage() {
  const [movies, setMovies] = useState<MovieItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('Kochi');

  useEffect(() => {
    const fetchMoviesAndShowtimes = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const rawMovies = await unwrap<MovieItem[]>(
          api.get(`/movies`, { params: { city, date: today } })
        );

        // Fetch prices and showtimes for each movie
        const enriched = await Promise.all(
          rawMovies.map(async (m) => {
            try {
              const details = await unwrap<any>(api.get(`/movies/${m.id}`));
              let minPrice = 29000;
              let earliest: string | null = null;

              if (details.venues && details.venues.length > 0) {
                const allSlots = details.venues.flatMap((v: any) => v.showtimes || []);
                if (allSlots.length > 0) {
                  const sorted = allSlots.sort(
                    (a: any, b: any) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
                  );
                  earliest = new Date(sorted[0].starts_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                }
              }

              return {
                ...m,
                earliest_showtime: earliest || 'N/A',
                min_price_paise: minPrice,
              };
            } catch {
              return m;
            }
          })
        );

        setMovies(enriched);
      } catch (err) {
        console.error('Failed to load movies', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMoviesAndShowtimes();
  }, [city]);

  const filteredMovies = movies.filter((m) =>
    m.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col">
      <Header />
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Now Showing</h1>
            <p className="text-neutral-400 mt-1">Discover movies currently playing in {city}</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500" />
              <input
                type="text"
                placeholder="Search movies..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 w-64"
              />
            </div>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="bg-neutral-900 border border-neutral-800 rounded-lg py-2 px-3 text-sm focus:outline-none"
            >
              <option value="Kochi">Kochi</option>
              <option value="Bangalore">Bangalore</option>
              <option value="Mumbai">Mumbai</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader />
          </div>
        ) : filteredMovies.length === 0 ? (
          <div className="text-center py-20 text-neutral-500">No movies found matching your search.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredMovies.map((movie) => (
              <Link
                key={movie.id}
                to={`/movies/${movie.id}`}
                className="group bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden hover:border-neutral-700 transition duration-200 flex flex-col"
              >
                <div className="aspect-[2/3] w-full bg-neutral-800 relative overflow-hidden">
                  {movie.poster_url ? (
                    <img
                      src={movie.poster_url}
                      alt={movie.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-500 text-sm">
                      No Poster
                    </div>
                  )}
                </div>
                <div className="p-4 flex-grow flex flex-col">
                  <h3 className="font-bold text-lg leading-tight group-hover:text-amber-500 transition">
                    {movie.title}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-neutral-400 mt-2">
                    <span>{movie.language}</span>
                    <span>•</span>
                    <span>{movie.certificate}</span>
                  </div>

                  <div className="mt-auto pt-4 border-t border-neutral-800/50 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1.5 text-neutral-400">
                      <Clock className="h-4 w-4" />
                      <span>{movie.earliest_showtime || 'N/A'}</span>
                    </div>
                    <span className="font-bold text-amber-500">
                      from {formatRupees(movie.min_price_paise || 25000)}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
