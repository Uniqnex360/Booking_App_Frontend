import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Loader } from '@/components/common/Loader';
import { api, unwrap } from '@/api/client';
import { ArrowLeft, Clock, Calendar, MapPin } from 'lucide-react';

interface ShowtimeSlot {
  id: string;
  screen_id: string;
  screen_name: string;
  starts_at: string;
  language: string;
  format: string;
}

interface VenueGroup {
  venue_id: string;
  venue_name: string;
  city: string;
  address: string | null;
  showtimes: ShowtimeSlot[];
}

interface MovieDetail {
  id: string;
  title: string;
  original_title: string | null;
  language: string;
  duration_min: number;
  certificate: string;
  poster_url: string | null;
  synopsis: string | null;
  venues?: VenueGroup[];
}

export default function MovieDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [movie, setMovie] = useState<MovieDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMovie = async () => {
      try {
        const data = await unwrap<MovieDetail>(api.get(`/movies/${id}`));
        setMovie(data);
      } catch (err) {
        console.error('Failed to load movie details', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMovie();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex flex-col">
        <Header />
        <div className="flex-grow flex items-center justify-center">
          <Loader />
        </div>
        <Footer />
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex flex-col">
        <Header />
        <div className="flex-grow flex flex-col items-center justify-center p-4">
          <h2 className="text-xl font-bold">Movie not found</h2>
          <button onClick={() => navigate('/movies')} className="mt-4 text-amber-500 flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> Back to Movies
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  const hasShowtimes = movie.venues && movie.venues.length > 0;

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col">
      <Header />
      <main className="flex-grow">
        {/* Banner Section */}
        <div className="relative py-12 bg-neutral-900 border-b border-neutral-800">
          <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row gap-8 items-start relative z-10">
            <div className="w-48 aspect-[2/3] bg-neutral-800 rounded-xl overflow-hidden shadow-2xl flex-shrink-0">
              {movie.poster_url ? (
                <img src={movie.poster_url} alt={movie.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-neutral-500">No Poster</div>
              )}
            </div>
            <div>
              <button onClick={() => navigate('/movies')} className="text-sm text-neutral-400 hover:text-white flex items-center gap-1 mb-4">
                <ArrowLeft className="h-4 w-4" /> Back to Movies
              </button>
              <h1 className="text-4xl font-extrabold tracking-tight">{movie.title}</h1>
              <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-neutral-300">
                <span className="bg-neutral-800 px-2 py-0.5 rounded text-xs font-semibold">{movie.certificate}</span>
                <span>•</span>
                <span>{movie.duration_min} mins</span>
                <span>•</span>
                <span>{movie.language}</span>
              </div>
              <p className="mt-6 text-neutral-300 text-sm max-w-2xl leading-relaxed">
                {movie.synopsis || 'No synopsis available for this film.'}
              </p>
            </div>
          </div>
        </div>

        {/* Showtimes & Venue List */}
        <div className="max-w-7xl w-full mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold mb-8">Select Showtime</h2>

          {!hasShowtimes ? (
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-8 text-center text-neutral-400">
              This movie is currently not available in your city.
            </div>
          ) : (
            <div className="space-y-6">
              {movie.venues?.map((v) => (
                <div key={v.venue_id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
                  <div className="flex items-start gap-3 border-b border-neutral-800 pb-4 mb-4">
                    <MapPin className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="font-bold text-lg">{v.venue_name}</h3>
                      <p className="text-neutral-400 text-sm">{v.address || v.city}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {v.showtimes.map((st) => (
                      <Link
                        key={st.id}
                        to={`/showtimes/${st.id}/seat-map`}
                        className="bg-neutral-950 border border-neutral-800 hover:border-amber-500 rounded-lg py-2.5 px-4 text-center transition group min-w-[120px]"
                      >
                        <div className="font-bold text-sm text-neutral-200 group-hover:text-amber-500">
                          {new Date(st.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="text-[10px] text-neutral-500 mt-1 uppercase tracking-wider font-semibold">
                          {st.format} • {st.language}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
