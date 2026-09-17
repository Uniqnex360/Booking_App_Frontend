import { useEffect, useState, useRef } from 'react';
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
  ChevronLeft,
  ChevronRight,
  Clock,
  Calendar,
  MapPin,
  Star,
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

/* Wine palette
   wine-50  #FDF2F4
   wine-100 #F8E1E7
   wine-600 #9B1B3A
   wine-700 #7B1E3D  ← primary
   wine-800 #5C0F2A
*/

const HERO_BANNERS = [
  {
    title: 'PVR Cinemas — Now Booking',
    subtitle: 'IMAX & Dolby Atmos at PVR Lulu Mall',
    image:
      'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=1600&auto=format&fit=crop&q=80',
    link: '/movies',
    cta: 'Book Tickets',
  },
  {
    title: 'Live Events & Concerts',
    subtitle: 'The best shows and experiences near you',
    image:
      'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1600&auto=format&fit=crop&q=80',
    link: '/events',
    cta: 'Explore Events',
  },
];

const CATEGORIES = [
  { icon: Film, title: 'Movies', link: '/movies', blurb: 'Now showing' },
  { icon: Music, title: 'Events', link: '/events', blurb: 'Concerts & more' },
  { icon: Utensils, title: 'Dining', link: '/restaurants', blurb: 'Reserve a table' },
];

function HorizontalScroller({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: -1 | 1) => {
    ref.current?.scrollBy({ left: dir * 320, behavior: 'smooth' });
  };
  return (
    <div className={`relative group/row ${className}`}>
      <button
        type="button"
        aria-label="Scroll left"
        onClick={() => scroll(-1)}
        className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 h-10 w-10 items-center justify-center rounded-full bg-white shadow-md border border-slate-200 text-slate-700 opacity-0 group-hover/row:opacity-100 transition hover:bg-wine-50"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <div
        ref={ref}
        className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-2 -mx-1 px-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {children}
      </div>
      <button
        type="button"
        aria-label="Scroll right"
        onClick={() => scroll(1)}
        className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 h-10 w-10 items-center justify-center rounded-full bg-white shadow-md border border-slate-200 text-slate-700 opacity-0 group-hover/row:opacity-100 transition hover:bg-wine-50"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const [movies, setMovies] = useState<MovieCard[]>([]);
  const [events, setEvents] = useState<EventCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentBanner, setCurrentBanner] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const t = setInterval(
      () => setCurrentBanner((p) => (p + 1) % HERO_BANNERS.length),
      5000
    );
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const [moviesData, eventsData] = await Promise.all([
          unwrap<MovieCard[]>(
            api.get(`/movies`, { params: { city: 'Kochi', date: today } })
          ).catch(() => []),
          unwrap<any>(api.get(`/events`)).catch(() => ({ items: [] })),
        ]);
        setMovies(moviesData.slice(0, 10));
        const items = Array.isArray(eventsData) ? eventsData : eventsData.items || [];
        setEvents(items.slice(0, 8));
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
      navigate(`/movies?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-slate-900">
      <Header />

      {/* ── HERO ── */}
      <section className="relative bg-white">
        <div className="relative h-[220px] sm:h-[320px] md:h-[420px] max-w-[1280px] mx-auto overflow-hidden md:rounded-b-2xl">
          {HERO_BANNERS.map((banner, idx) => (
            <div
              key={idx}
              className={`absolute inset-0 transition-opacity duration-700 ${
                idx === currentBanner ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              <img
                src={banner.image}
                alt={banner.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
              <div className="absolute inset-0 flex items-center">
                <div className="px-6 md:px-12 max-w-lg">
                  <p className="text-wine-100 text-xs font-semibold tracking-wider uppercase mb-2">
                    Featured
                  </p>
                  <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold text-white leading-tight mb-2">
                    {banner.title}
                  </h1>
                  <p className="text-sm sm:text-base text-white/80 mb-5">{banner.subtitle}</p>
                  <Button
                    onClick={() => navigate(banner.link)}
                    className="bg-[#7B1E3D] hover:bg-[#5C0F2A] text-white font-semibold rounded-lg px-5"
                  >
                    {banner.cta}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            {HERO_BANNERS.map((_, idx) => (
              <button
                key={idx}
                type="button"
                aria-label={`Go to slide ${idx + 1}`}
                onClick={() => setCurrentBanner(idx)}
                className={`h-1.5 rounded-full transition-all ${
                  idx === currentBanner ? 'bg-[#7B1E3D] w-6' : 'bg-white/70 w-2'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Floating search — BMS style */}
        {/* <div className="max-w-3xl mx-auto px-4 -mt-6 relative z-20">
          <form
            onSubmit={handleSearch}
            className="bg-white rounded-xl border border-slate-200 shadow-lg flex items-center p-1.5"
          >
            <Search className="h-5 w-5 text-slate-400 ml-3 shrink-0" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for movies, events, plays and more"
              className="flex-1 bg-transparent px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
            />
            <Button
              type="submit"
              className="bg-[#7B1E3D] hover:bg-[#5C0F2A] text-white font-semibold rounded-lg px-5"
            >
              Search
            </Button>
          </form>
        </div> */}
      </section>

      {/* ── CATEGORY CHIPS ── */}
      <section className="max-w-[1280px] mx-auto px-4 pt-10 pb-4">
        <div className="grid grid-cols-3 gap-3 md:gap-4">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.title}
              to={cat.link}
              className="group flex items-center gap-3 rounded-xl bg-white border border-slate-200 px-4 py-4 shadow-sm hover:border-[#7B1E3D]/40 hover:shadow-md transition"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#FDF2F4] text-[#7B1E3D] group-hover:bg-[#7B1E3D] group-hover:text-white transition">
                <cat.icon className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block font-bold text-slate-900 text-sm md:text-base">
                  {cat.title}
                </span>
                <span className="block text-xs text-slate-500 truncate">{cat.blurb}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── RECOMMENDED MOVIES ── */}
      <section className="max-w-[1280px] mx-auto px-4 py-8">
        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900">
              Recommended Movies
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">Now showing near you</p>
          </div>
          <Link
            to="/movies"
            className="text-sm font-semibold text-[#7B1E3D] hover:text-[#5C0F2A] flex items-center gap-1"
          >
            See All <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader />
          </div>
        ) : movies.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-500">
            No movies currently playing. Check back soon!
          </div>
        ) : (
          <HorizontalScroller>
            {movies.map((m) => (
              <Link
                key={m.id}
                to={`/movies/${m.id}`}
                className="snap-start shrink-0 w-[140px] sm:w-[160px] md:w-[180px] group"
              >
                <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-slate-200 shadow-sm">
                  {m.poster_url ? (
                    <img
                      src={m.poster_url}
                      alt={m.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <Film className="h-10 w-10" />
                    </div>
                  )}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2 pt-8">
                    <div className="flex items-center gap-1 text-white text-xs font-semibold">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      8.5/10
                    </div>
                  </div>
                </div>
                <h3 className="mt-2 font-bold text-sm text-slate-900 line-clamp-2 group-hover:text-[#7B1E3D] transition">
                  {m.title}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                  {m.certificate} • {m.language}
                </p>
                <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                  <Clock className="h-3 w-3" />
                  {m.duration_min} min
                </p>
              </Link>
            ))}
          </HorizontalScroller>
        )}
      </section>

      {/* ── WINE PROMO STRIP ── */}
      <section className="max-w-[1280px] mx-auto px-4 py-2">
        <div className="rounded-2xl bg-gradient-to-r from-[#5C0F2A] via-[#7B1E3D] to-[#9B1B3A] px-6 py-8 md:px-10 md:py-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-lg">
          <div>
            <h3 className="text-xl md:text-2xl font-bold text-white">
              Unlimited entertainment. One booking away.
            </h3>
            <p className="text-white/80 text-sm mt-1">
              Grab the best seats for PVR Premieres and live events.
            </p>
          </div>
          <Button
            onClick={() => navigate('/movies')}
            className="bg-white text-[#7B1E3D] hover:bg-wine-50 font-bold rounded-lg px-6 shrink-0"
          >
            Book Now
          </Button>
        </div>
      </section>

      {/* ── EVENTS ── */}
      <section className="max-w-[1280px] mx-auto px-4 py-10">
        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900">
              The Best Events This Week
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">Concerts, plays & experiences</p>
          </div>
          <Link
            to="/events"
            className="text-sm font-semibold text-[#7B1E3D] hover:text-[#5C0F2A] flex items-center gap-1"
          >
            See All <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {events.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-500">
            No upcoming events. Check back soon!
          </div>
        ) : (
          <HorizontalScroller>
            {events.map((e) => (
              <Link
                key={e.id}
                to={`/booking/event/${e.id}`}
                className="snap-start shrink-0 w-[260px] sm:w-[280px] group bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md hover:border-[#7B1E3D]/30 transition"
              >
                <div className="aspect-[16/9] bg-slate-100 overflow-hidden">
                  {e.cover_image_url ? (
                    <img
                      src={e.cover_image_url}
                      alt={e.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#5C0F2A] to-[#9B1B3A]">
                      <Music className="h-10 w-10 text-white/50" />
                    </div>
                  )}
                </div>
                <div className="p-3.5">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-[#7B1E3D]">
                    {e.category}
                  </span>
                  <h3 className="font-bold text-sm text-slate-900 mt-1 line-clamp-2 group-hover:text-[#7B1E3D] transition">
                    {e.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">
                      {e.venue_name}, {e.city}
                    </span>
                  </p>
                  {e.start_date && (
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(e.start_date).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  )}
                  {e.min_price_paise != null && (
                    <p className="text-sm font-bold text-slate-900 mt-3 pt-3 border-t border-slate-100">
                      <span className="text-slate-500 font-medium text-xs mr-1">from</span>
                      {formatRupees(e.min_price_paise)}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </HorizontalScroller>
        )}
      </section>

      <Footer />
    </div>
  );
}