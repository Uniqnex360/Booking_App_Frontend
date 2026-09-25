import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { format, parseISO, isToday, isTomorrow } from 'date-fns';
import { ChevronDown, ChevronUp, ImageOff, X } from 'lucide-react';

import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { getEvents } from '@/api/event.api';
import type { EventItem } from '@/types/event.types';

// The centralized BookMyShow Wine branding color
const WINE_COLOR = '#7B1E3D';
const WINE_HOVER = '#5C0F2A';

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

const LANGUAGE_OPTIONS = [
  { value: 'english', label: 'English' },
  { value: 'malayalam', label: 'Malayalam' },
  { value: 'hindi', label: 'Hindi' },
  { value: 'tamil', label: 'Tamil' },
  { value: 'telugu', label: 'Telugu' },
  { value: 'kannada', label: 'Kannada' },
  { value: 'multi', label: 'Multi Language' },
];

const TAG_OPTIONS = [
  { value: 'outdoor', label: 'Outdoor' },
  { value: 'fast_filling', label: 'Fast Filling' },
  { value: 'must_attend', label: 'Must Attend' },
  { value: 'unmissable', label: 'Unmissable' },
  { value: 'kids_allowed', label: 'Kids Allowed' },
  { value: 'masterclass', label: 'Masterclass' },
  { value: 'new_year_party', label: 'New Year Party' },
];

const FLAG_OPTIONS = [
  { value: 'is_online', label: 'Online' },
  { value: 'is_outdoor', label: 'Outdoor' },
  { value: 'is_fast_filling', label: 'Fast Filling' },
  { value: 'is_must_attend', label: 'Must Attend' },
  { value: 'is_unmissable', label: 'Unmissable' },
  { value: 'is_kids_allowed', label: 'Kids Allowed' },
  { value: 'is_masterclass', label: 'Masterclass' },
  { value: 'is_new_year_party', label: 'New Year Party' },
];

const DATE_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'weekend', label: 'This Weekend' },
];

const PRICE_OPTIONS = [
  { value: 'free', label: 'Free' },
  { value: '0-500', label: '₹0 - ₹500' },
  { value: '501-2000', label: '₹501 - ₹2000' },
  { value: 'above-2000', label: 'Above ₹2000' },
];

function FilterAccordion({
  title,
  isOpen,
  onToggle,
  onClear,
  children,
  isWineTitle,
}: {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  onClear?: () => void;
  children?: React.ReactNode;
  isWineTitle?: boolean;
}) {
  return (
    <div className="mb-4 bg-white rounded-[4px] border border-[#f2f2f2] shadow-sm overflow-hidden">
      <div className="flex w-full items-center justify-between p-3 transition-colors hover:bg-gray-50">
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center gap-2 flex-grow text-left"
        >
          {isOpen ? (
            <ChevronUp className="h-3 w-3 text-[#999999]" />
          ) : (
            <ChevronDown className="h-3 w-3 text-[#999999]" />
          )}
          <span
            className="text-[13px] font-normal tracking-tight"
            style={{ color: isWineTitle ? WINE_COLOR : '#333333' }}
          >
            {title}
          </span>
        </button>
        {onClear && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className="text-[10px] text-[#999999] hover:text-[#7B1E3D] uppercase font-semibold"
          >
            Clear
          </button>
        )}
      </div>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-4 pt-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FilterButton({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2 py-1.5 text-[12px] rounded-[4px] border transition-colors ${
        isActive
          ? 'bg-[#7B1E3D] text-white border-[#7B1E3D]'
          : 'bg-white border-[#eeeeee] text-[#7B1E3D] hover:border-[#7B1E3D]'
      }`}
      style={{
        color: isActive ? '#fff' : WINE_COLOR,
        borderColor: isActive ? WINE_COLOR : '#eeeeee',
        backgroundColor: isActive ? WINE_COLOR : '#fff',
      }}
    >
      {label}
    </button>
  );
}

export default function EventsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  const activeCategory = searchParams.get('cat') || 'all';
  const activeCity = searchParams.get('city') || 'Kochi';
  const activeDate = searchParams.get('date') || '';
  const activePrice = searchParams.get('price') || '';
  const activeLangs = useMemo(() => searchParams.getAll('lang'), [searchParams]);
  const activeTags = useMemo(() => searchParams.getAll('tag'), [searchParams]);
  const activeFlags = useMemo(() => searchParams.getAll('flag'), [searchParams]);

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

  const setFilter = (key: string, val: string) => {
    const next = new URLSearchParams(searchParams);
    if (!val || next.get(key) === val) {
      next.delete(key);
    } else {
      next.set(key, val);
    }
    setSearchParams(next);
  };

  const toggleMulti = (key: string, val: string, current: string[]) => {
    const next = new URLSearchParams(searchParams);
    next.delete(key);
    const set = new Set(current);
    if (set.has(val)) {
      set.delete(val);
    } else {
      set.add(val);
    }
    set.forEach((item) => next.append(key, item));
    setSearchParams(next);
  };

  const clearFilterGroup = (keys: string[]) => {
    const next = new URLSearchParams(searchParams);
    keys.forEach((k) => next.delete(k));
    setSearchParams(next);
  };

  const updateCategory = (cat: string) => {
    const next = new URLSearchParams(searchParams);
    if (cat === 'all') {
      next.delete('cat');
    } else {
      next.set('cat', cat);
    }
    setSearchParams(next);
  };

  // Dynamic categories found in events
  const dynamicCategories = useMemo(() => {
    const cats = new Set<string>();
    events.forEach((e) => {
      if (e.category) cats.add(e.category);
    });
    return Array.from(cats).map((c) => ({
      key: c,
      label: DISPLAY_LABELS[c] || c.charAt(0).toUpperCase() + c.slice(1),
    }));
  }, [events]);

  // Client-side filtering logic
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      // Category filter
      const matchesCategory = activeCategory === 'all' || e.category === activeCategory;
      // City filter
      const matchesCity = e.city.toLowerCase() === activeCity.toLowerCase();

      // Language filter
      const matchesLang =
        activeLangs.length === 0 || (e.language && activeLangs.includes(e.language));

      // Tags filter (any match)
      const matchesTags =
        activeTags.length === 0 ||
        (e.tags && e.tags.some((t: string) => activeTags.includes(t)));

      // Boolean flags filter (every active flag must be true)
      const matchesFlags =
        activeFlags.length === 0 ||
        activeFlags.every((flag) => {
          const val = (e as unknown as Record<string, unknown>)[flag];
          return val === true;
        });

      // Date filter
      let matchesDate = true;
      if (activeDate === 'today') {
        matchesDate = isToday(parseISO(e.starts_at));
      } else if (activeDate === 'tomorrow') {
        matchesDate = isTomorrow(parseISO(e.starts_at));
      }

      // Price filter
      let matchesPrice = true;
      if (activePrice && e.ticket_categories && e.ticket_categories.length > 0) {
        const minPrice = Math.min(...e.ticket_categories.map((t) => t.price_paise / 100));
        if (activePrice === 'free') {
          matchesPrice = minPrice === 0;
        } else if (activePrice === '0-500') {
          matchesPrice = minPrice <= 500;
        } else if (activePrice === '501-2000') {
          matchesPrice = minPrice > 500 && minPrice <= 2000;
        } else if (activePrice === 'above-2000') {
          matchesPrice = minPrice > 2000;
        }
      }

      return (
        matchesCategory &&
        matchesCity &&
        matchesLang &&
        matchesTags &&
        matchesFlags &&
        matchesDate &&
        matchesPrice
      );
    });
  }, [events, activeCategory, activeCity, activeLangs, activeTags, activeFlags, activeDate, activePrice]);

  return (
    <div className="min-h-screen bg-[#f5f5f5] text-[#333333] flex flex-col font-sans">
      <Header />

      <main className="flex-grow pt-[80px] pb-16">
        <div className="max-w-[1240px] mx-auto px-4">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            
            {/* Filter Sidebar */}
            <aside className="w-full md:w-[260px] flex-shrink-0">
              <h2 className="text-[18px] font-bold text-[#333333] mb-4">Filters</h2>

              {/* Categories Filter */}
              <FilterAccordion
                title="Categories"
                isOpen={openFilters.categories}
                onToggle={() => setOpenFilters((p) => ({ ...p, categories: !p.categories }))}
                onClear={() => updateCategory('all')}
                isWineTitle={true}
              >
                <div className="flex flex-wrap gap-2 pt-2">
                  {dynamicCategories.map((cat) => (
                    <FilterButton
                      key={cat.key}
                      label={cat.label}
                      isActive={activeCategory === cat.key}
                      onClick={() => updateCategory(cat.key)}
                    />
                  ))}
                </div>
              </FilterAccordion>

              {/* Date Filter */}
              <FilterAccordion
                title="Date"
                isOpen={openFilters.date}
                onToggle={() => setOpenFilters((p) => ({ ...p, date: !p.date }))}
                onClear={() => setFilter('date', '')}
              >
                <div className="flex flex-wrap gap-2 pt-2">
                  {DATE_OPTIONS.map((opt) => (
                    <FilterButton
                      key={opt.value}
                      label={opt.label}
                      isActive={activeDate === opt.value}
                      onClick={() => setFilter('date', opt.value)}
                    />
                  ))}
                </div>
              </FilterAccordion>

              {/* Languages Filter */}
              <FilterAccordion
                title="Languages"
                isOpen={openFilters.languages}
                onToggle={() => setOpenFilters((p) => ({ ...p, languages: !p.languages }))}
                onClear={() => clearFilterGroup(['lang'])}
              >
                <div className="flex flex-wrap gap-2 pt-2">
                  {LANGUAGE_OPTIONS.map((opt) => (
                    <FilterButton
                      key={opt.value}
                      label={opt.label}
                      isActive={activeLangs.includes(opt.value)}
                      onClick={() => toggleMulti('lang', opt.value, activeLangs)}
                    />
                  ))}
                </div>
              </FilterAccordion>

              {/* More Filters (Tags + Flags) */}
              <FilterAccordion
                title="More Filters"
                isOpen={openFilters.more}
                onToggle={() => setOpenFilters((p) => ({ ...p, more: !p.more }))}
                onClear={() => clearFilterGroup(['tag', 'flag'])}
              >
                <div className="space-y-3 pt-2">
                  <div>
                    <p className="text-[11px] text-[#999999] uppercase font-semibold mb-2">Tags</p>
                    <div className="flex flex-wrap gap-2">
                      {TAG_OPTIONS.map((opt) => (
                        <FilterButton
                          key={opt.value}
                          label={opt.label}
                          isActive={activeTags.includes(opt.value)}
                          onClick={() => toggleMulti('tag', opt.value, activeTags)}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] text-[#999999] uppercase font-semibold mb-2">Event Attributes</p>
                    <div className="flex flex-wrap gap-2">
                      {FLAG_OPTIONS.map((opt) => (
                        <FilterButton
                          key={opt.value}
                          label={opt.label}
                          isActive={activeFlags.includes(opt.value)}
                          onClick={() => toggleMulti('flag', opt.value, activeFlags)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </FilterAccordion>

              {/* Price Filter */}
              <FilterAccordion
                title="Price"
                isOpen={openFilters.price}
                onToggle={() => setOpenFilters((p) => ({ ...p, price: !p.price }))}
                onClear={() => setFilter('price', '')}
              >
                <div className="flex flex-wrap gap-2 pt-2">
                  {PRICE_OPTIONS.map((opt) => (
                    <FilterButton
                      key={opt.value}
                      label={opt.label}
                      isActive={activePrice === opt.value}
                      onClick={() => setFilter('price', opt.value)}
                    />
                  ))}
                </div>
              </FilterAccordion>

              <button
                type="button"
                onClick={() => navigate(`/venues?city=${activeCity}`)}
                className="w-full mt-2 py-2 border rounded-[4px] text-[13px] font-medium transition-colors"
                style={{ color: WINE_COLOR, borderColor: WINE_COLOR }}
              >
                Browse by Venues
              </button>
            </aside>

            {/* Main Content Section */}
            <section className="flex-grow w-full">
              <div className="mb-6">
                <h1 className="text-[24px] font-bold text-[#333333] mb-[20px] flex items-center tracking-tight">
                  Events In {activeCity}
                  <span className="ml-1 inline-block w-[2px] h-[24px] bg-[#7B1E3D]" />
                </h1>

                {/* Horizontal Category Filter Pills */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  <button
                    type="button"
                    onClick={() => updateCategory('all')}
                    className="px-4 py-1.5 text-[12px] border rounded-full whitespace-nowrap transition-colors"
                    style={{
                      color: activeCategory === 'all' ? '#fff' : WINE_COLOR,
                      borderColor: activeCategory === 'all' ? WINE_COLOR : '#eeeeee',
                      backgroundColor: activeCategory === 'all' ? WINE_COLOR : '#fff',
                    }}
                  >
                    All Events
                  </button>
                  {dynamicCategories.map((cat) => (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => updateCategory(cat.key)}
                      className="px-4 py-1.5 text-[12px] border rounded-full whitespace-nowrap transition-colors"
                      style={{
                        color: activeCategory === cat.key ? '#fff' : WINE_COLOR,
                        borderColor: activeCategory === cat.key ? WINE_COLOR : '#eeeeee',
                        backgroundColor: activeCategory === cat.key ? WINE_COLOR : '#fff',
                      }}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Active Filter Chips */}
              {(activeLangs.length > 0 || activeTags.length > 0 || activeFlags.length > 0 || activeDate || activePrice) && (
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <span className="text-xs text-slate-500 font-medium">Active Filters:</span>
                  {activeDate && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full bg-[#FDF2F4] text-[#7B1E3D] border border-[#7B1E3D]/20">
                      Date: {activeDate}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setFilter('date', '')} />
                    </span>
                  )}
                  {activePrice && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full bg-[#FDF2F4] text-[#7B1E3D] border border-[#7B1E3D]/20">
                      Price: {activePrice}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setFilter('price', '')} />
                    </span>
                  )}
                  {activeLangs.map((lang) => (
                    <span
                      key={lang}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full bg-[#FDF2F4] text-[#7B1E3D] border border-[#7B1E3D]/20"
                    >
                      {lang}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => toggleMulti('lang', lang, activeLangs)}
                      />
                    </span>
                  ))}
                  {activeTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full bg-[#FDF2F4] text-[#7B1E3D] border border-[#7B1E3D]/20"
                    >
                      #{tag}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => toggleMulti('tag', tag, activeTags)}
                      />
                    </span>
                  ))}
                  {activeFlags.map((flag) => (
                    <span
                      key={flag}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full bg-[#FDF2F4] text-[#7B1E3D] border border-[#7B1E3D]/20"
                    >
                      {flag.replace('is_', '')}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => toggleMulti('flag', flag, activeFlags)}
                      />
                    </span>
                  ))}
                </div>
              )}

              {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="aspect-[2/3] bg-gray-200 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
                  {filteredEvents.map((event) => {
                    const lowestPrice =
                      event.ticket_categories && event.ticket_categories.length > 0
                        ? Math.min(...event.ticket_categories.map((t) => t.price_paise / 100))
                        : null;

                    const isEnded = Boolean(event.ends_at && new Date(event.ends_at) < new Date());

                    return (
                      <div
                        key={event.id}
                        onClick={() => navigate(`/booking/event/${event.id}`)}
                        className="cursor-pointer group flex flex-col"
                      >
                        {/* Event Poster Card */}
                        <div className="relative aspect-[2/3] w-full rounded-[8px] overflow-hidden bg-[#ebebeb] mb-3 shadow-sm group-hover:shadow-md transition-shadow">
                          {event.poster_image_url ? (
                            <img
                              src={event.poster_image_url}
                              alt={event.title}
                              className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${
                                isEnded ? 'grayscale-[40%]' : ''
                              }`}
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 p-4 text-center">
                              <ImageOff className="h-8 w-8 mb-2 stroke-[1.5]" />
                              <span className="text-[11px] font-medium tracking-tight leading-tight">
                                No Poster Available
                              </span>
                            </div>
                          )}

                          {isEnded && (
                            <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-0.5 rounded shadow">
                              Ended
                            </div>
                          )}

                          {/* Event Date Badge on Bottom Left */}
                          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2.5 pt-6">
                            <span className="text-white text-[12px] font-medium tracking-tight">
                              {event.starts_at ? `${format(parseISO(event.starts_at), 'EEE, d MMM')} onwards` : ''}
                            </span>
                          </div>
                        </div>

                        {/* Event Details */}
                        <div className="flex flex-col flex-grow">
                          <h3 className="text-[16px] font-bold text-[#222222] leading-[20px] mb-1 line-clamp-2 group-hover:text-[#7B1E3D] transition-colors">
                            {event.title}
                          </h3>

                          <p className="text-[14px] text-[#666666] leading-[18px] mb-1 line-clamp-1">
                            {event.venue_name}
                          </p>

                          <p className="text-[14px] text-[#666666] leading-[18px] mb-2 capitalize">
                            {DISPLAY_LABELS[event.category] || event.category}
                            {event.language ? ` • ${event.language}` : ''}
                          </p>

                          {lowestPrice !== null && (
                            <div className="mt-auto text-[14px] font-semibold text-[#333333]">
                              {lowestPrice === 0 ? 'Free' : `₹ ${lowestPrice} onwards`}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {filteredEvents.length === 0 && (
                    <div className="col-span-full py-16 text-center text-gray-500">
                      <p className="text-lg font-bold mb-1">No events found</p>
                      <p className="text-sm">Try selecting different filters or choosing another city.</p>
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}