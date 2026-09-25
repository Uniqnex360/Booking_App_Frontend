import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { ChevronDown, ChevronUp, ImageOff } from 'lucide-react';

import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { getEvents } from '@/api/event.api';
import type { EventItem } from '@/types/event.types';

// The exact "Rose" color from BookMyShow
const ROSE_COLOR = '#F84464';

const DISPLAY_LABELS: Record<string, string> = {
  workshop: 'Workshops',
  concert: 'Music Shows',
  comedy: 'Comedy Shows',
  theatre: 'Performances',
  kids: 'Kids',
  spirituality: 'Spirituality',
  meetups: 'Meetups',
  exhibition: 'Exhibitions',
  other: 'Role Play',
};

function FilterAccordion({ title, isOpen, onToggle, children, isRoseTitle }: { title: string; isOpen: boolean; onToggle: () => void; children?: React.ReactNode; isRoseTitle?: boolean }) {
  return (
    <div className="mb-4 bg-white rounded-[4px] border border-[#f2f2f2] shadow-sm overflow-hidden">
      <button onClick={onToggle} className="flex w-full items-center justify-between p-3 transition-colors hover:bg-gray-50">
        <div className="flex items-center gap-2">
          {isOpen ? <ChevronUp className="h-3 w-3 text-[#999999]" /> : <ChevronDown className="h-3 w-3 text-[#999999]" />}
          <span 
            className="text-[13px] font-normal tracking-tight" 
            style={{ color: isRoseTitle ? ROSE_COLOR : '#333333' }}
          >
            {title}
          </span>
        </div>
        <span className="text-[10px] text-[#999999] uppercase font-semibold">Clear</span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="px-3 pb-4 pt-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function EventsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  const activeCategory = searchParams.get('cat') || 'all';
  const activeCity = searchParams.get('city') || 'Kochi';

  const [openFilters, setOpenFilters] = useState<Record<string, boolean>>({
    categories: true,
    date: false,
    languages: false,
    more: false,
    price: false,
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await getEvents();
        setEvents(res);
      } catch {
        toast.error('Failed to load events');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const dynamicCategories = useMemo(() => {
    const uniqueKeys = Array.from(new Set(events.map((e) => e.category)));
    return uniqueKeys.map((key) => ({
      key,
      label: DISPLAY_LABELS[key] || key.charAt(0).toUpperCase() + key.slice(1),
    }));
  }, [events]);

  const filtered = useMemo(() => {
    return events.filter((e) => {
      const matchesCategory = activeCategory === 'all' || e.category === activeCategory;
      const matchesCity = e.city.toLowerCase() === activeCity.toLowerCase();
      return matchesCategory && matchesCity;
    });
  }, [events, activeCategory, activeCity]);

  const updateCategory = (key: string) => {
    setSearchParams((prev) => {
      if (key === 'all') prev.delete('cat');
      else prev.set('cat', key);
      return prev;
    });
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      {/* Force Roboto Font via Google Fonts */}
      <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet" />
      
      <style>{`
        * { font-family: 'Roboto', sans-serif !important; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>

      <Header />

      <div className="pt-[104px] pb-20">
        <div className="mx-auto max-w-[1240px] px-4 mt-8">
          <div className="flex gap-8">
            
            {/* Sidebar Filters */}
            <aside className="hidden lg:block w-[280px] shrink-0">
              <h1 className="text-[24px] font-bold text-[#333333] mb-[24px] tracking-tight">
                Filters
              </h1>

              <FilterAccordion
                title="Categories"
                isOpen={openFilters.categories}
                onToggle={() => setOpenFilters(p => ({ ...p, categories: !p.categories }))}
                isRoseTitle={true}
              >
                <div className="flex flex-wrap gap-2 pt-2">
                  {dynamicCategories.map((cat) => (
                    <button
                      key={cat.key}
                      onClick={() => updateCategory(cat.key)}
                      className={`px-2 py-1.5 text-[12px] rounded-[4px] border transition-colors ${
                        activeCategory === cat.key
                          ? `bg-[${ROSE_COLOR}] text-white border-[${ROSE_COLOR}]`
                          : `bg-white border-[#eeeeee] text-[${ROSE_COLOR}] hover:border-[${ROSE_COLOR}]`
                      }`}
                      style={{ 
                        color: activeCategory === cat.key ? '#fff' : ROSE_COLOR,
                        borderColor: activeCategory === cat.key ? ROSE_COLOR : '#eeeeee',
                        backgroundColor: activeCategory === cat.key ? ROSE_COLOR : '#fff'
                      }}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </FilterAccordion>

              {['Date', 'Languages', 'More Filters', 'Price'].map((f) => (
                <FilterAccordion
                  key={f}
                  title={f}
                  isOpen={openFilters[f.toLowerCase().split(' ')[0]]}
                  onToggle={() => {
                    const key = f.toLowerCase().split(' ')[0];
                    setOpenFilters(p => ({ ...p, [key]: !p[key] }));
                  }}
                />
              ))}

            <button 
  onClick={() => navigate(`/venues?city=${activeCity}`)}
  className="w-full mt-2 py-2 border rounded-[4px] text-[13px] font-medium transition-colors"
  style={{ color: ROSE_COLOR, borderColor: ROSE_COLOR }}
>
  Browse by Venues
</button>
            </aside>

            {/* Main Section */}
            <main className="flex-1">
              <div className="mb-6">
                <h1 className="text-[24px] font-bold text-[#333333] mb-[24px] flex items-center tracking-tight">
                  Events In {activeCity}
                  <span className="ml-1 inline-block w-[2px] h-[24px] bg-[#3366cc]" />
                </h1>

                {/* Horizontal Category Pills */}
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {dynamicCategories.map((cat) => (
                    <button
                      key={cat.key}
                      onClick={() => updateCategory(cat.key)}
                      className="px-4 py-1.5 text-[12px] border rounded-full whitespace-nowrap transition-colors"
                      style={{ 
                        color: activeCategory === cat.key ? '#fff' : ROSE_COLOR,
                        borderColor: activeCategory === cat.key ? ROSE_COLOR : '#eeeeee',
                        backgroundColor: activeCategory === cat.key ? ROSE_COLOR : '#fff'
                      }}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                  {[1, 2, 3, 4].map(i => <div key={i} className="aspect-[2/3] bg-gray-200 rounded-lg animate-pulse" />)}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10">
                  {filtered.map((event, i) => {
                    const minPrice = event.ticket_categories?.length
                      ? Math.min(...event.ticket_categories.map((t) => t.price_paise))
                      : null;
                    const isPromoted = i < 2;

                    return (
                      <div
                        key={event.id}
                        className="cursor-pointer group flex flex-col"
                        onClick={() => navigate(`/booking/event/${event.id}`)}
                      >
                        <div className="relative aspect-[2/3.15] rounded-[8px] overflow-hidden bg-gray-100 mb-3 border border-gray-100">
                          <img
                            src={event.poster_image_url}
                            alt={event.title}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                          
                          {isPromoted && (
                            <div className="absolute top-0 right-0 bg-black/60 text-white text-[9px] px-2 py-0.5 font-bold tracking-wider rounded-bl-[4px]">
                              PROMOTED
                            </div>
                          )}

                          {/* EXACT BLACK DATE BAR */}
                          <div className="absolute bottom-0 left-0 right-0 bg-black py-1.5 px-3">
                            <span className="text-white text-[12px] font-medium tracking-wide">
                              {format(parseISO(event.starts_at), 'EEE, d MMM')}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-0.5">
                          <h3 className="text-[17px] font-bold text-[#222222] leading-[1.3] line-clamp-2 tracking-tight">
                            {event.title}
                          </h3>
                          <p className="text-[14px] text-[#666666] line-clamp-1 mt-1 font-normal">
                            {event.venue_name}: {event.city}
                          </p>
                          <p className="text-[14px] text-[#666666] font-normal">
                            {DISPLAY_LABELS[event.category] || event.category}
                          </p>
                          <div className="pt-2">
                            {minPrice !== null ? (
                              <span className="text-[14px] font-normal text-[#333333]">
                                ₹ {Math.round(minPrice / 100)} onwards
                              </span>
                            ) : (
                              <span className="text-[14px] text-[#999999]">Pricing TBD</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </main>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}