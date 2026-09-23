import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Loader } from '@/components/common/Loader';
import { api, unwrap } from '@/api/client';
import { formatRupees } from '@/utils/currencyFormatter';
import { withCity } from '@/lib/cityLink';
import {
  Film,
  Music,
  Utensils,
  ChevronLeft,
  ChevronRight,
  Star,
  ChevronRight as ChevronRightIcon,
} from 'lucide-react';

interface MovieCard {
  id: string;
  title: string;
  language: string;
  duration_min: number;
  certificate: string;
  poster_url: string | null;
  genre?: string;
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

// Simulated Carousel Data
const HERO_BANNERS = [
  {
    title: 'PVR Cinemas — Now Booking',
    subtitle: 'IMAX & Dolby Atmos at PVR Lulu Mall',
    image:
      'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=1240&auto=format&fit=crop&q=80',
    link: '/movies',
  },
  {
    title: 'Live Events & Concerts',
    subtitle: 'The best shows and experiences near you',
    image:
      'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1240&auto=format&fit=crop&q=80',
    link: '/events',
  },
];

const CATEGORIES = [
  { icon: Film, title: 'Movies', link: '/movies' },
  { icon: Music, title: 'Events', link: '/events' },
  { icon: Utensils, title: 'Dining', link: '/restaurants' },
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
    if (ref.current) {
      const clientWidth = ref.current.clientWidth;
      ref.current.scrollBy({ left: dir * (clientWidth * 0.75), behavior: 'smooth' });
    }
  };

  return (
    <div className={`relative group/row ${className}`}>
      {/* Left Scroll Button */}
      <button
        type="button"
        aria-label="Scroll left"
        onClick={() => scroll(-1)}
        className="hidden md:flex absolute -left-5 top-1/2 -translate-y-1/2 z-10 h-10 w-10 items-center justify-center rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.2)] text-gray-700 opacity-0 group-hover/row:opacity-100 transition hover:scale-105"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>
      
      {/* Scrollable Container */}
      <div
        ref={ref}
        className="flex gap-6 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-4 pt-2 px-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {children}
      </div>

      {/* Right Scroll Button */}
      <button
        type="button"
        aria-label="Scroll right"
        onClick={() => scroll(1)}
        className="hidden md:flex absolute -right-5 top-1/2 -translate-y-1/2 z-10 h-10 w-10 items-center justify-center rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.2)] text-gray-700 opacity-0 group-hover/row:opacity-100 transition hover:scale-105"
      >
        <ChevronRight className="h-6 w-6" />
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
  const [searchParams] = useSearchParams();
  const city = searchParams.get('city') || 'Kochi';

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
            api.get(`/movies`, { params: { city, date: today } })
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
  }, [city]);

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-slate-900 pb-12 font-sans">
      <Header />

      <div className="pt-16 lg:pt-[104px]">
        {/* ── BMS STYLE HERO CAROUSEL ── */}
        <section className="bg-white pb-6 pt-2">
          <div className="relative h-[180px] sm:h-[260px] md:h-[320px] max-w-[1240px] mx-auto overflow-hidden rounded-xl shadow-sm cursor-pointer group">
            {HERO_BANNERS.map((banner, idx) => (
              <div
                key={idx}
                onClick={() => navigate(banner.link)}
                className={`absolute inset-0 transition-opacity duration-700 ${
                  idx === currentBanner ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
              >
                <img
                  src={banner.image}
                  alt={banner.title}
                  className="w-full h-full object-cover"
                />
                {/* Fallback dark overlay for text visibility if needed, though BMS banners are usually pre-designed images */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent" />
                <div className="absolute inset-0 flex items-center px-8 md:px-12">
                  <div className="max-w-lg">
                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2 leading-tight">
                      {banner.title}
                    </h2>
                    <p className="text-sm md:text-base text-white/80">
                      {banner.subtitle}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {/* Carousel Dots */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
              {HERO_BANNERS.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentBanner(idx);
                  }}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === currentBanner ? 'bg-white w-5' : 'bg-white/50 w-1.5'
                  }`}
                />
              ))}
            </div>
            
            {/* Carousel Arrows */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCurrentBanner((p) => (p - 1 + HERO_BANNERS.length) % HERO_BANNERS.length);
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-10 bg-black/40 text-white flex items-center justify-center rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCurrentBanner((p) => (p + 1) % HERO_BANNERS.length);
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-10 bg-black/40 text-white flex items-center justify-center rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>
        </section>

        {/* ── BMS STYLE QUICK CATEGORIES ── */}
        <section className="bg-white border-b border-gray-200">
          <div className="max-w-[1240px] mx-auto px-4 py-6">
            <div className="flex items-center justify-center gap-6 sm:gap-12">
              {CATEGORIES.map((cat) => (
                <Link
                  key={cat.title}
                  to={cat.link}
                  className="group flex flex-col items-center gap-2"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 group-hover:bg-[#F84464]/10 transition-colors">
                    <cat.icon className="h-6 w-6 text-gray-600 group-hover:text-[#F84464]" />
                  </div>
                  <span className="font-medium text-gray-700 text-sm group-hover:text-[#F84464] transition-colors">
                    {cat.title}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── RECOMMENDED MOVIES ── */}
        <section className="max-w-[1240px] mx-auto px-4 py-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-[#333333]">
              Recommended Movies
            </h2>
            <Link
              to={withCity("/movies", city)}
              className="text-sm font-semibold text-[#F84464] hover:underline flex items-center"
            >
              See All <ChevronRightIcon className="h-4 w-4 ml-0.5" />
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
                  to={withCity(`/movies/${m.id}`, city)}
                  className="snap-start shrink-0 w-[140px] sm:w-[180px] md:w-[220px] group"
                >
                  <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-slate-200 shadow-sm">
                    {m.poster_url ? (
                      <img
                        src={m.poster_url}
                        alt={m.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <Film className="h-10 w-10" />
                      </div>
                    )}
                    {/* BMS Rating Strip */}
                    <div className="absolute bottom-0 inset-x-0 bg-black/80 backdrop-blur-sm py-1.5 px-3 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-white text-xs font-semibold">
                        <Star className="h-3.5 w-3.5 fill-[#F5C518] text-[#F5C518]" />
                        <span>8.5/10</span>
                      </div>
                      <span className="text-white/80 text-[10px]">50K Votes</span>
                    </div>
                  </div>
                  <h3 className="mt-3 font-medium text-base text-[#333333] line-clamp-1 group-hover:text-black">
                    {m.title}
                  </h3>
                  <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">
                    {m.genre || 'Action/Thriller'}
                  </p>
                </Link>
              ))}
            </HorizontalScroller>
          )}
        </section>

        {/* ── BMS STYLE PROMO STRIP (PREMIERE OR STREAM) ── */}
        <section className="max-w-[1240px] mx-auto px-4 py-4">
          <div className="rounded-xl bg-[#2B314B] px-6 py-6 md:px-10 md:py-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-md cursor-pointer hover:shadow-lg transition">
            <div className="flex items-center gap-4">
              <div className="bg-[#F84464] w-12 h-12 rounded-full flex items-center justify-center shrink-0">
                <Film className="h-6 w-6 text-white ml-0.5" />
              </div>
              <div>
                <h3 className="text-xl md:text-2xl font-bold text-white">
                  Endless Entertainment Anytime.
                </h3>
                <p className="text-white/70 text-sm mt-1">
                  Watch new movies & live events on your schedule.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── THE BEST EVENTS ── */}
        <section className="max-w-[1240px] mx-auto px-4 py-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-[#333333]">
              The Best Events
            </h2>
            <Link
              to={withCity("/events", city)}
              className="text-sm font-semibold text-[#F84464] hover:underline flex items-center"
            >
              See All <ChevronRightIcon className="h-4 w-4 ml-0.5" />
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
                  to={withCity(`/booking/event/${e.id}`, city)}
                  className="snap-start shrink-0 w-[240px] sm:w-[280px] group cursor-pointer"
                >
                  <div className="aspect-[4/3] rounded-lg bg-slate-200 overflow-hidden shadow-sm relative">
                    {e.cover_image_url ? (
                      <img
                        src={e.cover_image_url}
                        alt={e.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100">
                        <Music className="h-10 w-10 text-gray-400" />
                      </div>
                    )}
                    {/* Event Category Tag */}
                    <div className="absolute top-2 right-2 bg-white/90 backdrop-blur px-2 py-0.5 rounded text-[10px] font-bold text-[#333] uppercase">
                      {e.category}
                    </div>
                  </div>
                  
                  <div className="mt-3">
                    <h3 className="font-medium text-[#333] text-base line-clamp-2 leading-snug group-hover:text-black">
                      {e.title}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-1">
                      {e.venue_name}, {e.city}
                    </p>
                    {e.start_date && (
                      <p className="text-sm text-gray-500 mt-0.5">
                        {new Date(e.start_date).toLocaleDateString('en-IN', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                        })}
                      </p>
                    )}
                    {e.min_price_paise != null && (
                      <p className="text-sm text-gray-700 mt-1">
                        {formatRupees(e.min_price_paise)} onwards
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </HorizontalScroller>
          )}
        </section>
      </div>

      <Footer />
    </div>
  );
}