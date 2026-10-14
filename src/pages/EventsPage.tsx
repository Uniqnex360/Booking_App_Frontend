import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { format, parseISO, isToday, isTomorrow } from 'date-fns';
import { ChevronDown, ImageOff, X, SlidersHorizontal, RotateCcw, Search, MapPin } from 'lucide-react';

import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CitySelectionModal } from '@/components/common/CitySelectionModal';
import { getEvents } from '@/api/event.api';
import type { EventItem } from '@/types/event.types';
import { WINE_COLOR, WINE_HOVER } from '@/constants/theme';

const DISPLAY_LABELS: Record<string, string> = {
  workshop: 'Workshops',
  concert: 'Music Shows',
  comedy: 'Comedy Shows',
  theatre: 'Performances',
  dining: 'Dining & Food',
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

const EVENT_CATEGORY_OPTIONS = [
  { key: 'workshop', label: 'Workshops' },
  { key: 'comedy', label: 'Comedy Shows' },
  { key: 'concert', label: 'Music Shows' },
  { key: 'theatre', label: 'Performances' },
  { key: 'dining', label: 'Dining & Food' },
  { key: 'meetups', label: 'Meetups' },
  { key: 'exhibition', label: 'Exhibitions' },
  { key: 'kids', label: 'Kids' },
  { key: 'spirituality', label: 'Spirituality' },
];

function FilterAccordion({
  title,
  isOpen,
  onToggle,
  onClear,
  showClear,
  activeCount,
  children,
}: {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  onClear?: () => void;
  showClear?: boolean;
  activeCount?: number;
  children?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50 transition select-none cursor-pointer"
      >
        <span className="flex items-center gap-2">
          <ChevronDown
            className={`h-4 w-4 text-[#7B1E3D] transition-transform duration-200 ${
              isOpen ? "rotate-0" : "-rotate-90"
            }`}
          />
          {title}
        </span>
        <div className="flex items-center gap-2">
          {activeCount !== undefined && activeCount > 0 && (
            <span className="text-[11px] font-bold text-[#7B1E3D] bg-[#7B1E3D]/10 px-2 py-0.5 rounded-full">
              {activeCount}
            </span>
          )}
          {showClear && onClear && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="text-xs text-gray-400 hover:text-[#7B1E3D] transition-colors font-normal cursor-pointer"
            >
              Clear
            </span>
          )}
        </div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 flex flex-wrap gap-2 border-t border-gray-50">{children}</div>
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
      className={`px-3 py-1.5 rounded-sm text-xs font-normal transition-colors border cursor-pointer ${
        isActive
          ? 'bg-[#7B1E3D] text-white border-[#7B1E3D] shadow-2xs'
          : 'bg-white text-[#7B1E3D] border-gray-200 hover:border-[#7B1E3D]/50 hover:bg-[#7B1E3D]/5'
      }`}
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
  const search = searchParams.get('search') || '';
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
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [isCityModalOpen, setIsCityModalOpen] = useState(false);

  const setCity = (nextCity: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('city', nextCity);
    setSearchParams(next);
  };

  const setSearch = (nextSearch: string) => {
    const next = new URLSearchParams(searchParams);
    if (nextSearch) next.set('search', nextSearch);
    else next.delete('search');
    setSearchParams(next);
  };

  const clearAllFilters = () => {
    const next = new URLSearchParams();
    if (activeCity) next.set('city', activeCity);
    setSearchParams(next);
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (activeCategory && activeCategory !== 'all') count++;
    if (activeDate) count++;
    if (activePrice) count++;
    if (search) count++;
    count += activeLangs.length;
    count += activeTags.length;
    count += activeFlags.length;
    return count;
  }, [activeCategory, activeDate, activePrice, activeLangs, activeTags, activeFlags, search]);

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

  // Only upcoming or live events (not past)
  const upcomingOrLiveEvents = useMemo(() => {
    const now = new Date();
    return events.filter((e) => !e.ends_at || new Date(e.ends_at) >= now);
  }, [events]);

  // Full list of categories: all standard event categories plus any custom categories from events
  const availableCategories = useMemo(() => {
    const map = new Map<string, string>();
    EVENT_CATEGORY_OPTIONS.forEach((c) => map.set(c.key, c.label));

    // Also include any dynamic categories from events
    events.forEach((e) => {
      if (e.category && !map.has(e.category)) {
        map.set(
          e.category,
          DISPLAY_LABELS[e.category] ||
            e.category.charAt(0).toUpperCase() + e.category.slice(1)
        );
      }
    });

    return Array.from(map.entries()).map(([key, label]) => ({ key, label }));
  }, [events]);

  // Client-side filtering logic
  const filteredEvents = useMemo(() => {
    return upcomingOrLiveEvents.filter((e) => {
      // Search filter
      if (search) {
        const s = search.toLowerCase();
        const matchesTitle = e.title?.toLowerCase().includes(s);
        const matchesCat = e.category?.toLowerCase().includes(s);
        const matchesVenue = e.venue_name?.toLowerCase().includes(s);
        if (!matchesTitle && !matchesCat && !matchesVenue) return false;
      }

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
  }, [upcomingOrLiveEvents, search, activeCategory, activeCity, activeLangs, activeTags, activeFlags, activeDate, activePrice]);

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#333333] flex flex-col font-sans">
      <Header />

      <main className="flex-grow max-w-[1240px] w-full mx-auto px-4 pt-28 lg:pt-[120px] pb-16">
        {/* ─── Top Filter / Subheader Strip ─── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-4 mb-4 border-b border-gray-200">
          <div>
            <h1 className="text-2xl font-bold text-[#1A1A2E] tracking-tight">
              Events in {activeCity}
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Explore upcoming & currently running events in your city
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search for Events..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-white border border-gray-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:border-[#7B1E3D] focus:ring-1 focus:ring-[#7B1E3D]/30"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* City Selector */}
            <button
              type="button"
              onClick={() => setIsCityModalOpen(true)}
              className="bg-white border border-gray-200 text-gray-700 font-medium rounded-lg py-2 px-3 text-xs sm:text-sm hover:border-[#7B1E3D] flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <span>{activeCity?.toLowerCase() === "bangalore" || activeCity?.toLowerCase() === "bengaluru" ? "Bengaluru" : activeCity}</span>
              <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
            </button>

            {/* Mobile Filter Toggle */}
            <button
              type="button"
              onClick={() => setIsMobileFilterOpen(true)}
              className="lg:hidden flex items-center gap-1.5 bg-white border border-gray-200 px-3 py-2 rounded-lg text-xs font-semibold text-gray-700 shadow-sm cursor-pointer"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-[#7B1E3D]" />
              Filters
              {activeFilterCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-[#7B1E3D]" />
              )}
            </button>
          </div>
        </div>

        {/* ─── Main Content Container (Sidebar + Grid) ─── */}
        <div className="flex gap-8 items-start">
          {/* ─── Left Filters Sidebar (Desktop) ─── */}
          <aside className="hidden lg:block w-[240px] shrink-0 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-bold text-[#1A1A2E]">Filters</h2>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="text-xs text-[#7B1E3D] font-medium flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3" />
                  Clear All
                </button>
              )}
            </div>

            {/* Categories Filter */}
            <FilterAccordion
              title="Categories"
              isOpen={openFilters.categories}
              onToggle={() => setOpenFilters((p) => ({ ...p, categories: !p.categories }))}
              onClear={() => updateCategory('all')}
              showClear={activeCategory !== 'all'}
              activeCount={activeCategory !== 'all' ? 1 : 0}
            >
              <div className="flex flex-wrap gap-2 pt-1">
                {availableCategories.map((cat) => (
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
              showClear={Boolean(activeDate)}
              activeCount={activeDate ? 1 : 0}
            >
              <div className="flex flex-wrap gap-2 pt-1">
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
              showClear={activeLangs.length > 0}
              activeCount={activeLangs.length}
            >
              <div className="flex flex-wrap gap-2 pt-1">
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
              showClear={activeTags.length > 0 || activeFlags.length > 0}
              activeCount={activeTags.length + activeFlags.length}
            >
              <div className="space-y-3 pt-1 w-full">
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
              showClear={Boolean(activePrice)}
              activeCount={activePrice ? 1 : 0}
            >
              <div className="flex flex-wrap gap-2 pt-1">
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
              className="w-full mt-2 py-2.5 border rounded-lg text-xs font-semibold transition-colors cursor-pointer hover:bg-[#7B1E3D]/5"
              style={{ color: WINE_COLOR, borderColor: WINE_COLOR }}
            >
              Browse by Venues
            </button>
          </aside>

          {/* ─── Main Content Section (Pills & Grid) ─── */}
          <section className="flex-1 min-w-0">
            {/* Horizontal Category & Quick Filter Pills */}
            <div className="mb-4 sm:mb-6">
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                {/* Category Pills */}
                <button
                  type="button"
                  onClick={() => updateCategory('all')}
                  className={`px-3.5 py-1.5 text-xs rounded-full whitespace-nowrap font-medium transition cursor-pointer border shrink-0 ${
                    activeCategory === 'all'
                      ? 'bg-[#7B1E3D] text-white border-[#7B1E3D] shadow-sm font-semibold'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  All Events
                </button>
                {availableCategories.map((cat) => (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => updateCategory(cat.key)}
                    className={`px-3.5 py-1.5 text-xs rounded-full whitespace-nowrap font-medium transition cursor-pointer border shrink-0 ${
                      activeCategory === cat.key
                        ? 'bg-[#7B1E3D] text-white border-[#7B1E3D] shadow-sm font-semibold'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-[#7B1E3D]/50 hover:text-[#7B1E3D]'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}

                  {/* Quick Date Pills (Mobile) */}
                  <div className="h-4 w-px bg-gray-200 shrink-0 mx-1 md:hidden" />
                  {DATE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFilter('date', opt.value)}
                      className={`md:hidden px-3 py-1.5 text-xs rounded-full whitespace-nowrap font-medium transition cursor-pointer border shrink-0 ${
                        activeDate === opt.value
                          ? 'bg-[#7B1E3D] text-white border-[#7B1E3D] shadow-2xs font-semibold'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}

                  {/* Quick Free Pill (Mobile) */}
                  <button
                    type="button"
                    onClick={() => setFilter('price', activePrice === 'free' ? '' : 'free')}
                    className={`md:hidden px-3 py-1.5 text-xs rounded-full whitespace-nowrap font-medium transition cursor-pointer border shrink-0 ${
                      activePrice === 'free'
                        ? 'bg-[#7B1E3D] text-white border-[#7B1E3D] shadow-2xs font-semibold'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    Free
                  </button>
                </div>
              </div>

              {/* Active Filter Chips */}
              {activeFilterCount > 0 && (
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <span className="text-xs text-gray-500 font-medium">Active:</span>
                  {activeCategory !== 'all' && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full bg-[#FDF2F4] text-[#7B1E3D] border border-[#7B1E3D]/20 font-medium">
                      {DISPLAY_LABELS[activeCategory] || activeCategory}
                      <X className="h-3 w-3 cursor-pointer hover:text-black" onClick={() => updateCategory('all')} />
                    </span>
                  )}
                  {activeDate && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full bg-[#FDF2F4] text-[#7B1E3D] border border-[#7B1E3D]/20 font-medium">
                      Date: {activeDate === 'today' ? 'Today' : activeDate === 'tomorrow' ? 'Tomorrow' : 'This Weekend'}
                      <X className="h-3 w-3 cursor-pointer hover:text-black" onClick={() => setFilter('date', '')} />
                    </span>
                  )}
                  {activePrice && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full bg-[#FDF2F4] text-[#7B1E3D] border border-[#7B1E3D]/20 font-medium">
                      Price: {PRICE_OPTIONS.find((p) => p.value === activePrice)?.label || activePrice}
                      <X className="h-3 w-3 cursor-pointer hover:text-black" onClick={() => setFilter('price', '')} />
                    </span>
                  )}
                  {activeLangs.map((lang) => (
                    <span
                      key={lang}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full bg-[#FDF2F4] text-[#7B1E3D] border border-[#7B1E3D]/20 font-medium capitalize"
                    >
                      {lang}
                      <X
                        className="h-3 w-3 cursor-pointer hover:text-black"
                        onClick={() => toggleMulti('lang', lang, activeLangs)}
                      />
                    </span>
                  ))}
                  {activeTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full bg-[#FDF2F4] text-[#7B1E3D] border border-[#7B1E3D]/20 font-medium"
                    >
                      #{tag}
                      <X
                        className="h-3 w-3 cursor-pointer hover:text-black"
                        onClick={() => toggleMulti('tag', tag, activeTags)}
                      />
                    </span>
                  ))}
                  {activeFlags.map((flag) => (
                    <span
                      key={flag}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full bg-[#FDF2F4] text-[#7B1E3D] border border-[#7B1E3D]/20 font-medium"
                    >
                      {flag.replace('is_', '')}
                      <X
                        className="h-3 w-3 cursor-pointer hover:text-black"
                        onClick={() => toggleMulti('flag', flag, activeFlags)}
                      />
                    </span>
                  ))}
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="text-xs text-[#7B1E3D] font-bold hover:underline ml-1 cursor-pointer flex items-center gap-1"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Clear All
                  </button>
                </div>
              )}

              {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="aspect-[2/3] bg-gray-200 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 sm:gap-x-6 gap-y-8">
                  {filteredEvents.map((event) => {
                    const lowestPrice =
                      event.ticket_categories && event.ticket_categories.length > 0
                        ? Math.min(...event.ticket_categories.map((t) => t.price_paise / 100))
                        : null;

                    const now = new Date();
                    const isLive = Boolean(
                      event.starts_at &&
                      event.ends_at &&
                      new Date(event.starts_at) <= now &&
                      new Date(event.ends_at) >= now
                    );

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
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 p-4 text-center">
                              <ImageOff className="h-8 w-8 mb-2 stroke-[1.5]" />
                              <span className="text-[11px] font-medium tracking-tight leading-tight">
                                No Poster Available
                              </span>
                            </div>
                          )}

                          {isLive && (
                            <div className="absolute top-2 right-2 bg-[#7B1E3D] text-white text-[10px] font-semibold px-2 py-0.5 rounded shadow flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                              LIVE
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
      </main>

      {/* Mobile Filter Bottom Sheet / Modal */}
      <AnimatePresence>
        {isMobileFilterOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center md:hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileFilterOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            />

            {/* Bottom Sheet Modal */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="relative w-full max-h-[85vh] bg-white rounded-t-2xl shadow-2xl flex flex-col z-10 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 shrink-0">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-[#7B1E3D]" />
                  <h3 className="font-bold text-base text-gray-900">Filters</h3>
                  {activeFilterCount > 0 && (
                    <span className="bg-[#7B1E3D] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {activeFilterCount}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {activeFilterCount > 0 && (
                    <button
                      type="button"
                      onClick={clearAllFilters}
                      className="text-xs font-semibold text-[#7B1E3D] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Reset
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsMobileFilterOpen(false)}
                    className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Scrollable Filter Options */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
                {/* Categories */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                      Categories
                    </span>
                    {activeCategory !== 'all' && (
                      <button
                        type="button"
                        onClick={() => updateCategory('all')}
                        className="text-[11px] text-[#7B1E3D] font-medium cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => updateCategory('all')}
                      className={`px-3 py-1.5 text-xs rounded-full font-medium transition cursor-pointer ${
                        activeCategory === 'all'
                          ? 'bg-[#7B1E3D] text-white shadow-xs font-semibold'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      All Events
                    </button>
                    {availableCategories.map((cat) => (
                      <button
                        key={cat.key}
                        type="button"
                        onClick={() => updateCategory(cat.key)}
                        className={`px-3 py-1.5 text-xs rounded-full font-medium transition cursor-pointer ${
                          activeCategory === cat.key
                            ? 'bg-[#7B1E3D] text-white shadow-xs font-semibold'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                      Date
                    </span>
                    {activeDate && (
                      <button
                        type="button"
                        onClick={() => setFilter('date', '')}
                        className="text-[11px] text-[#7B1E3D] font-medium cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {DATE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setFilter('date', opt.value)}
                        className={`px-3 py-1.5 text-xs rounded-full font-medium transition cursor-pointer ${
                          activeDate === opt.value
                            ? 'bg-[#7B1E3D] text-white shadow-xs font-semibold'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                      Price
                    </span>
                    {activePrice && (
                      <button
                        type="button"
                        onClick={() => setFilter('price', '')}
                        className="text-[11px] text-[#7B1E3D] font-medium cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {PRICE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setFilter('price', opt.value)}
                        className={`px-3 py-1.5 text-xs rounded-full font-medium transition cursor-pointer ${
                          activePrice === opt.value
                            ? 'bg-[#7B1E3D] text-white shadow-xs font-semibold'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Languages */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                      Languages
                    </span>
                    {activeLangs.length > 0 && (
                      <button
                        type="button"
                        onClick={() => clearFilterGroup(['lang'])}
                        className="text-[11px] text-[#7B1E3D] font-medium cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {LANGUAGE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => toggleMulti('lang', opt.value, activeLangs)}
                        className={`px-3 py-1.5 text-xs rounded-full font-medium transition cursor-pointer ${
                          activeLangs.includes(opt.value)
                            ? 'bg-[#7B1E3D] text-white shadow-xs font-semibold'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tags & Attributes */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                      Tags & Attributes
                    </span>
                    {(activeTags.length > 0 || activeFlags.length > 0) && (
                      <button
                        type="button"
                        onClick={() => clearFilterGroup(['tag', 'flag'])}
                        className="text-[11px] text-[#7B1E3D] font-medium cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {TAG_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => toggleMulti('tag', opt.value, activeTags)}
                        className={`px-3 py-1.5 text-xs rounded-full font-medium transition cursor-pointer ${
                          activeTags.includes(opt.value)
                            ? 'bg-[#7B1E3D] text-white shadow-xs font-semibold'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        #{opt.label}
                      </button>
                    ))}
                    {FLAG_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => toggleMulti('flag', opt.value, activeFlags)}
                        className={`px-3 py-1.5 text-xs rounded-full font-medium transition cursor-pointer ${
                          activeFlags.includes(opt.value)
                            ? 'bg-[#7B1E3D] text-white shadow-xs font-semibold'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Venues quick link */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileFilterOpen(false);
                      navigate(`/venues?city=${activeCity}`);
                    }}
                    className="w-full py-2.5 border border-[#7B1E3D] text-[#7B1E3D] rounded-xl text-xs font-bold hover:bg-[#7B1E3D]/5 transition cursor-pointer"
                  >
                    Browse by Venues in {activeCity}
                  </button>
                </div>
              </div>

              {/* Bottom Sticky Action Bar */}
              <div className="p-4 border-t border-gray-100 bg-white shrink-0">
                <button
                  type="button"
                  onClick={() => setIsMobileFilterOpen(false)}
                  className="w-full py-3 bg-[#7B1E3D] hover:bg-[#5C0F2A] text-white font-bold text-sm rounded-xl transition shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Show {filteredEvents.length} Events</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <CitySelectionModal
        isOpen={isCityModalOpen}
        onClose={() => setIsCityModalOpen(false)}
        currentCity={activeCity}
        onSelectCity={(newCity) => {
          setCity(newCity);
          setIsCityModalOpen(false);
        }}
      />

      <Footer />
    </div>
  );
}