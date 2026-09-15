import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/common/Loader';
import { api, unwrap } from '@/api/client';
import { formatRupees } from '@/utils/currencyFormatter';
import {
  Search,
  Film,
  Music,
  Utensils,
  ArrowRight,
  Clock,
  Calendar,
  MapPin,
  Sparkles,
  Star,
  ChevronRight,
} from 'lucide-react';

interface MovieCard {
  id: string;
  title: string;
  language: string;
  duration_min: number;
  certificate: string;
  poster_url: string | null;
}

interface EventCard {
  id: string;
  title: string;
  category: string;
  venue_name: string;
  city: string;
  cover_image_url: string | null;
  start_date: string;
  min_price_paise?: number;
}

const HERO_BANNERS = [
  {
    title: 'PVR Cinemas — Now Booking',
    subtitle: 'Book premium IMAX and Dolby Atmos experiences at PVR Lulu Mall',
    image: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=1600&auto=format&fit=crop&q=80',
    link: '/movies',
    cta: 'Explore Movies',
  },
  {
    title: 'Live Events & Concerts',
    subtitle: 'Discover the hottest live shows and cultural events near you',
    image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1600&auto=format&fit=crop&q=80',
    link: '/events',
    cta: 'Browse Events',
  },
];

const CATEGORIES = [
  { icon: Film, title: 'Movies', link: '/movies', color: 'from-amber-500 to-orange-600' },
  { icon: Music, title: 'Events', link: '/events', color: 'from-purple-500 to-pink-600' },
  { icon: Utensils, title: 'Dining', link: '/restaurants', color: 'from-emerald-500 to-teal-600' },
];

export default function HomePage() {
  const navigate = useNavigate();
  const [movies, setMovies] = useState<MovieCard[]>([]);
  const [events, setEvents] = useState<EventCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentBanner, setCurrentBanner] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % HERO_BANNERS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const [moviesData, eventsData] = await Promise.all([
          unwrap<MovieCard[]>(api.get(`/movies`, { params: { city: 'Kochi', date: today } })).catch(() => []),
          unwrap<any>(api.get(`/events`)).catch(() => ({ items: [] })),
        ]);

        setMovies(moviesData.slice(0, 8));
        const eventItems = Array.isArray(eventsData) ? eventsData : eventsData.items || [];
        setEvents(eventItems.slice(0, 4));
      } catch (err) {
        console.error('Failed to load homepage data', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/movies?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <Header />

      {/* HERO BANNER CAROUSEL */}
      <section className="relative overflow-hidden">
        <div className="relative h-[400px] md:h-[500px] w-full">
          {HERO_BANNERS.map((banner, idx) => (
            <div
              key={idx}
              className={`absolute inset-0 transition-opacity duration-1000 ${
                idx === currentBanner ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              <img src={banner.image} alt={banner.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-r from-neutral-950 via-neutral-950/70 to-transparent" />
              <div className="absolute inset-0 flex items-center">
                <div className="max-w-7xl w-full mx-auto px-6 md:px-12">
                  <div className="max-w-xl">
                    <span className="inline-flex items-center gap-1 bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full text-xs font-bold mb-4 border border-amber-500/30">
                      <Sparkles className="h-3 w-3" /> Featured
                    </span>
                    <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-4">{banner.title}</h1>
                    <p className="text-lg text-neutral-300 mb-6">{banner.subtitle}</p>
                    <Button
                      onClick={() => navigate(banner.link)}
                      size="lg"
                      className="bg-amber-500 hover:bg-amber-600 text-black font-bold shadow-lg"
                    >
                      {banner.cta}
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            {HERO_BANNERS.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentBanner(idx)}
                className={`h-1.5 rounded-full transition-all ${
                  idx === currentBanner ? 'bg-amber-500 w-8' : 'bg-white/40 w-2'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Search Bar */}
        <div className="max-w-3xl mx-auto -mt-8 relative z-20 px-4">
          <form
            onSubmit={handleSearch}
            className="bg-neutral-900 border border-neutral-800 rounded-2xl p-2 flex items-center shadow-2xl"
          >
            <Search className="h-5 w-5 text-neutral-500 ml-3" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for movies, events, plays..."
              className="flex-1 bg-transparent px-3 py-2 text-white placeholder:text-neutral-500 focus:outline-none"
            />
            <Button type="submit" className="bg-amber-500 hover:bg-amber-600 text-black font-bold">
              Search
            </Button>
          </form>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-3 gap-4">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.title}
              to={cat.link}
              className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${cat.color} p-6 text-white shadow-lg hover:scale-105 transition-transform`}
            >
              <cat.icon className="h-8 w-8 mb-2 opacity-90" />
              <h3 className="text-lg font-bold">{cat.title}</h3>
              <ChevronRight className="absolute top-1/2 -translate-y-1/2 right-4 h-6 w-6 opacity-0 group-hover:opacity-100 transition" />
            </Link>
          ))}
        </div>
      </section>

      {/* NOW SHOWING MOVIES */}
      <section className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold">🎬 Now Showing</h2>
            <p className="text-neutral-400 text-sm mt-1">The hottest movies playing near you</p>
          </div>
          <Link to="/movies" className="text-amber-500 flex items-center gap-1 font-semibold text-sm hover:text-amber-400 transition">
            See All <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader />
          </div>
        ) : movies.length === 0 ? (
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-8 text-center text-neutral-500">
            No movies currently playing. Check back soon!
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {movies.map((m) => (
              <Link
                key={m.id}
                to={`/movies/${m.id}`}
                className="group bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden hover:border-amber-500/50 transition"
              >
                <div className="aspect-[2/3] bg-neutral-800 overflow-hidden relative">
                  {m.poster_url ? (
                    <img
                      src={m.poster_url}
                      alt={m.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-500">
                      <Film className="h-10 w-10" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2 bg-black/80 backdrop-blur text-amber-400 px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1">
                    <Star className="h-3 w-3 fill-amber-400" />
                    8.5
                  </div>
                </div>
                <div className="p-3">
                  <h4 className="font-bold text-sm leading-tight group-hover:text-amber-500 transition line-clamp-1">{m.title}</h4>
                  <div className="text-neutral-400 text-xs mt-1 flex items-center gap-2 flex-wrap">
                    <span>{m.language}</span>
                    <span>•</span>
                    <span>{m.certificate}</span>
                  </div>
                  <div className="flex items-center gap-1 text-neutral-500 text-xs mt-2">
                    <Clock className="h-3 w-3" />
                    <span>{m.duration_min} min</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* UPCOMING EVENTS */}
      <section className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold">🎤 Live Events</h2>
            <p className="text-neutral-400 text-sm mt-1">Concerts, workshops, and experiences</p>
          </div>
          <Link to="/events" className="text-amber-500 flex items-center gap-1 font-semibold text-sm hover:text-amber-400 transition">
            See All <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {events.length === 0 ? (
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-8 text-center text-neutral-500">
            No upcoming events. Check back soon!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {events.map((e) => (
              <Link
                key={e.id}
                to={`/events/${e.id}`}
                className="group bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden hover:border-amber-500/50 transition"
              >
                <div className="aspect-[16/10] bg-neutral-800 overflow-hidden">
                  {e.cover_image_url ? (
                    <img src={e.cover_image_url} alt={e.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900 to-pink-900">
                      <Music className="h-10 w-10 text-white/50" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <span className="text-[10px] uppercase tracking-widest text-amber-500 font-bold">{e.category}</span>
                  <h4 className="font-bold text-base mt-1 group-hover:text-amber-500 transition line-clamp-1">{e.title}</h4>
                  <p className="text-neutral-400 text-xs mt-2 flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {e.venue_name}, {e.city}
                  </p>
                  {e.start_date && (
                    <p className="text-neutral-500 text-xs mt-1 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(e.start_date).toLocaleDateString()}
                    </p>
                  )}
                  {e.min_price_paise && (
                    <div className="text-amber-500 font-bold text-sm mt-3 border-t border-neutral-800 pt-3">
                      From {formatRupees(e.min_price_paise)}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* PROMO BANNER */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
          <div>
            <h3 className="text-2xl md:text-3xl font-extrabold text-black">Get the Best Movie Deals!</h3>
            <p className="text-black/80 text-sm mt-2">Book tickets now and enjoy exclusive discounts on PVR Premium seats.</p>
          </div>
          <Button
            onClick={() => navigate('/movies')}
            className="bg-black hover:bg-neutral-900 text-white font-bold px-6 py-3"
          >
            Book Now
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
