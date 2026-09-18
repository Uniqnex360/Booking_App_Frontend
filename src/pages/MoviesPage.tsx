import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Loader } from '@/components/common/Loader';
import { api, unwrap } from '@/api/client';
import { formatRupees } from '@/utils/currencyFormatter';
import { Search, Clock } from 'lucide-react';
import { detectCity, SUPPORTED_CITIES } from '@/utils/geolocation';

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
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [movies, setMovies] = useState<MovieItem[]>([]);
  const [loading, setLoading] = useState(true);
  const search = searchParams.get('search') || '';
  const city = searchParams.get('city') || 'Kochi';

  const setCity = (next: string) => {
    const p = new URLSearchParams(searchParams);
    p.set('city', next);
    setSearchParams(p);
  };

  const setSearch = (next: string) => {
    const p = new URLSearchParams(searchParams);
    if (next) p.set('search', next);
    else p.delete('search');
    setSearchParams(p);
  };

  useEffect(() => {
    detectCity().then((c) => { if (c) setCity(c); });
  }, []);

  useEffect(() => {
    const fetchMoviesAndShowtimes = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const rawMovies = await unwrap<MovieItem[]>(
          api.get(`/movies`, { params: { city, date: today } })
        );

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
    <div className="min-h-screen bg-neutral-50 text-slate-900 flex flex-col">
      <Header />
      <main className="flex-grow max-w-[1280px] w-full mx-auto px-4 pt-16 lg:pt-[104px] pb-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 mt-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Now Showing</h1>
            <p className="text-slate-500 mt-1">Discover movies currently playing in {city}</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search movies..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#7B1E3D]/40 w-64"
              />
            </div>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg py-2 px-3 text-sm focus:outline-none"
            >
              {SUPPORTED_CITIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader />
          </div>
        ) : filteredMovies.length === 0 ? (
          <div className="text-center py-20 text-slate-500">No movies found matching your search.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredMovies.map((movie) => (
              <div
                key={movie.id}
                className="group bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-[#7B1E3D]/30 hover:shadow-md transition duration-200 flex flex-col"
              >
                <div className="aspect-[2/3] w-full bg-neutral-100 relative overflow-hidden">
                  {movie.poster_url ? (
                    <img
                      src={movie.poster_url}
                      alt={movie.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500 text-sm">
                      No Poster
                    </div>
                  )}
                </div>

                <div className="p-4 flex-grow flex flex-col">
                  <h3 className="font-bold text-lg leading-tight group-hover:text-[#7B1E3D] transition">
                    {movie.title}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-2">
                    <span>{movie.language}</span>
                    <span>•</span>
                    <span>{movie.certificate}</span>
                  </div>

                  {movie.earliest_showtime && movie.earliest_showtime !== 'N/A' && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-2">
                      <Clock className="h-3.5 w-3.5" />
                      <span>First show {movie.earliest_showtime}</span>
                    </div>
                  )}

                  <button
                    onClick={() => navigate(`/movies/${movie.id}`)}
                    className="mt-4 w-full bg-[#7B1E3D] hover:bg-[#5C0F2A] text-white text-sm font-bold rounded-lg py-2.5 transition"
                  >
                    Book Tickets
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}