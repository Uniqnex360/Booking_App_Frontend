import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO, isValid } from 'date-fns';
import {
  ChevronDown,
  ImageOff,
  SlidersHorizontal,
  RotateCcw,
  Search,
  MapPin,
  X,
} from 'lucide-react';

import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CitySelectionModal } from '@/components/common/CitySelectionModal';
import { getStoredCity } from '@/utils/geolocation';
import { getEvents } from '@/api/event.api';
import type { EventItem } from '@/types/event.types';
import { WINE_COLOR, WINE_HOVER } from '@/constants/theme';

interface CategoryPill {
  value: string;
  label: string;
}

const CATEGORY_PILLS: CategoryPill[] = [
  { value: 'FINE_DINING', label: 'Fine Dining' },
  { value: 'STREET_FOOD', label: 'Street Food' },
  { value: 'SUNDAY_BRUNCH', label: 'Sunday Brunch' },
  { value: 'BUFFET', label: 'Buffet Spread' },
];

const DATE_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'this-weekend', label: 'This Weekend' },
];

const MORE_FILTER_OPTIONS = [
  { value: 'POOLSIDE', label: 'Poolside' },
  { value: 'ROOFTOP', label: 'Rooftop' },
  { value: 'OUTDOOR_SEATING', label: 'Outdoor Seating' },
  { value: 'LIVE_MUSIC', label: 'Live Music' },
  { value: 'KIDS_ALLOWED', label: 'Kids Allowed' },
];

const PRICE_OPTIONS = [
  { value: 'free', label: 'Free' },
  { value: '0-500', label: '0 - 500' },
  { value: '500-2000', label: '501 - 2000' },
  { value: '2000+', label: 'Above 2000' },
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
  children: React.ReactNode;
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
              isOpen ? 'rotate-0' : '-rotate-90'
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
            <div className="px-4 pb-4 pt-1 flex flex-wrap gap-2 border-t border-gray-50">
              {children}
            </div>
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
      className={`text-xs px-3 py-1.5 rounded-md border transition cursor-pointer ${
        isActive
          ? 'bg-[#7B1E3D] border-[#7B1E3D] text-white font-medium'
          : 'bg-white border-gray-200 text-gray-700 hover:border-[#7B1E3D] hover:text-[#7B1E3D]'
      }`}
    >
      {label}
    </button>
  );
}

export default function DiningListingPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCityModalOpen, setIsCityModalOpen] = useState(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Accordion toggle states
  const [openSections, setOpenSections] = useState({
    categories: true,
    date: false,
    moreFilters: false,
    price: false,
  });

  const toggleSection = (key: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // URL Query state parsing
  const cityParam =
    searchParams.get('city') ||
    getStoredCity() ||
    'Kochi';

  const search = searchParams.get('search') || '';

  const tagsParam = searchParams.get('tags');
  const selectedTags = useMemo(() => {
    if (!tagsParam) return [];
    return tagsParam.split(',').filter(Boolean);
  }, [tagsParam]);

  const dateFilter = searchParams.get('date');
  const priceFilter = searchParams.get('price');

  // Update query params helper
  const updateQuery = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (!value) {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    setSearchParams(next, { replace: true });
  };

  const setSearch = (val: string) => {
    updateQuery('search', val || null);
  };

  const setCity = (c: string) => {
    updateQuery('city', c);
  };

  const toggleTag = (val: string) => {
    let nextTags: string[];
    if (selectedTags.includes(val)) {
      nextTags = selectedTags.filter((t) => t !== val);
    } else {
      nextTags = [...selectedTags, val];
    }
    updateQuery('tags', nextTags.length > 0 ? nextTags.join(',') : null);
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
  };

  const clearAllFilters = () => {
    const next = new URLSearchParams();
    if (cityParam) next.set('city', cityParam);
    setSearchParams(next, { replace: true });
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    count += selectedTags.length;
    if (dateFilter) count++;
    if (priceFilter) count++;
    if (search) count++;
    return count;
  }, [selectedTags, dateFilter, priceFilter, search]);

  // Fetch events
  useEffect(() => {
    const fetchDiningEvents = async () => {
      setLoading(true);
      try {
        const params: Record<string, string> = {
          category: 'dining',
          limit: '100',
        };
        if (cityParam) params.city = cityParam;
        if (selectedTags.length > 0) params.tags = selectedTags.join(',');
        if (dateFilter) params.date = dateFilter;
        if (priceFilter) params.price = priceFilter;

        const data = await getEvents(params);
        setEvents(data);
      } catch {
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDiningEvents();
  }, [cityParam, tagsParam, dateFilter, priceFilter]);

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (search) {
        const s = search.toLowerCase();
        const matchesTitle = e.title?.toLowerCase().includes(s);
        const matchesVenue = e.venue_name?.toLowerCase().includes(s);
        const matchesDesc = e.description?.toLowerCase().includes(s);
        if (!matchesTitle && !matchesVenue && !matchesDesc) return false;
      }
      return true;
    });
  }, [events, search]);

  const formatDateBadge = (startsAt: string) => {
    try {
      const d = parseISO(startsAt);
      if (isValid(d)) {
        return `${format(d, 'EEE, d MMM')} onwards`;
      }
    } catch {
      // Fallback
    }
    return 'Upcoming';
  };

  const primaryCategoryLabel = useMemo(() => {
    if (selectedTags.includes('FINE_DINING')) return 'Fine Dining';
    if (selectedTags.includes('STREET_FOOD')) return 'Street Food';
    if (selectedTags.includes('SUNDAY_BRUNCH')) return 'Sunday Brunch';
    if (selectedTags.includes('BUFFET')) return 'Buffet Spread';
    return 'Dining';
  }, [selectedTags]);

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#333333] flex flex-col font-sans">
      <Header />

      {/* Main Container */}
      <main className="max-w-[1240px] w-full mx-auto px-4 pt-28 lg:pt-[120px] pb-16 flex-1">
        {/* ─── Top Filter / Subheader Strip ─── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-4 mb-4 border-b border-gray-200">
          <div>
            <h1 className="text-2xl font-bold text-[#1A1A2E] tracking-tight">
              Dining in {cityParam}
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Explore curated dining experiences, brunches & culinary events in your city
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search for Dining..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-white border border-gray-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:border-[#7B1E3D] focus:ring-1 focus:ring-[#7B1E3D]/30"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
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
              <span>{cityParam?.toLowerCase() === 'bangalore' || cityParam?.toLowerCase() === 'bengaluru' ? 'Bengaluru' : cityParam}</span>
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
          {/* ==================== LEFT SIDEBAR: FILTERS ==================== */}
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

            {/* Accordion 1: Categories */}
            <FilterAccordion
              title="Categories"
              isOpen={openSections.categories}
              onToggle={() => toggleSection('categories')}
              onClear={() => updateQuery('tags', 'FINE_DINING')}
              showClear={selectedTags.length > 1 || !selectedTags.includes('FINE_DINING')}
              activeCount={selectedTags.length}
            >
              {CATEGORY_PILLS.map((pill) => (
                <FilterButton
                  key={pill.value}
                  label={pill.label}
                  isActive={selectedTags.includes(pill.value)}
                  onClick={() => toggleTag(pill.value)}
                />
              ))}
            </FilterAccordion>

            {/* Accordion 2: Date */}
            <FilterAccordion
              title="Date"
              isOpen={openSections.date}
              onToggle={() => toggleSection('date')}
              onClear={() => updateQuery('date', null)}
              showClear={Boolean(dateFilter)}
              activeCount={dateFilter ? 1 : 0}
            >
              {DATE_OPTIONS.map((opt) => (
                <FilterButton
                  key={opt.value}
                  label={opt.label}
                  isActive={dateFilter === opt.value}
                  onClick={() => updateQuery('date', dateFilter === opt.value ? null : opt.value)}
                />
              ))}
            </FilterAccordion>

            {/* Accordion 3: More Filters (Amenities) */}
            <FilterAccordion
              title="More Filters"
              isOpen={openSections.moreFilters}
              onToggle={() => toggleSection('moreFilters')}
              onClear={() => {
                const next = selectedTags.filter(
                  (t) => !MORE_FILTER_OPTIONS.some((m) => m.value === t)
                );
                updateQuery('tags', next.length > 0 ? next.join(',') : null);
              }}
              showClear={MORE_FILTER_OPTIONS.some((m) => selectedTags.includes(m.value))}
              activeCount={MORE_FILTER_OPTIONS.filter((m) => selectedTags.includes(m.value)).length}
            >
              {MORE_FILTER_OPTIONS.map((opt) => (
                <FilterButton
                  key={opt.value}
                  label={opt.label}
                  isActive={selectedTags.includes(opt.value)}
                  onClick={() => toggleTag(opt.value)}
                />
              ))}
            </FilterAccordion>

            {/* Accordion 4: Price */}
            <FilterAccordion
              title="Price"
              isOpen={openSections.price}
              onToggle={() => toggleSection('price')}
              onClear={() => updateQuery('price', null)}
              showClear={Boolean(priceFilter)}
              activeCount={priceFilter ? 1 : 0}
            >
              {PRICE_OPTIONS.map((opt) => (
                <FilterButton
                  key={opt.value}
                  label={opt.label}
                  isActive={priceFilter === opt.value}
                  onClick={() => updateQuery('price', priceFilter === opt.value ? null : opt.value)}
                />
              ))}
            </FilterAccordion>

            {/* Browse by Venues button */}
            <button
              type="button"
              onClick={() => navigate(`/venues?city=${cityParam}`)}
              className="w-full mt-2 py-2.5 border rounded-lg text-xs font-semibold transition-colors cursor-pointer hover:bg-[#7B1E3D]/5"
              style={{ color: WINE_COLOR, borderColor: WINE_COLOR }}
            >
              Browse by Venues
            </button>
          </aside>

          {/* ==================== RIGHT MAIN COLUMN: GRID ==================== */}
          <section className="flex-1 min-w-0">
            {/* Category Pills Row above Cards */}
            <div className="mb-4 sm:mb-6">
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                <button
                  type="button"
                  onClick={() => {
                    updateQuery('tags', null);
                    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
                    if (document.documentElement) document.documentElement.scrollTop = 0;
                    if (document.body) document.body.scrollTop = 0;
                  }}
                  className={`px-3.5 py-1.5 text-xs rounded-full whitespace-nowrap font-medium transition cursor-pointer border shrink-0 ${
                    !tagsParam
                      ? 'bg-[#7B1E3D] text-white border-[#7B1E3D] shadow-sm font-semibold'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  All Dining
                </button>
                {CATEGORY_PILLS.map((pill) => {
                  const isSelected = selectedTags.includes(pill.value);
                  return (
                    <button
                      key={pill.value}
                      type="button"
                      onClick={() => toggleTag(pill.value)}
                      className={`px-3.5 py-1.5 text-xs rounded-full whitespace-nowrap font-medium transition cursor-pointer border shrink-0 ${
                        isSelected
                          ? 'bg-[#7B1E3D] text-white border-[#7B1E3D] shadow-sm font-semibold'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-[#7B1E3D]/50 hover:text-[#7B1E3D]'
                      }`}
                    >
                      {pill.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cards Grid: 4 columns matching Movies and Events */}
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <div key={i} className="animate-pulse space-y-2">
                    <div className="aspect-[3/4] bg-gray-200 rounded-lg w-full" />
                    <div className="h-4 bg-gray-200 rounded-sm w-4/5" />
                    <div className="h-3 bg-gray-200 rounded-sm w-3/5" />
                    <div className="h-3 bg-gray-200 rounded-sm w-1/4" />
                  </div>
                ))}
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <MapPin className="h-10 w-10 mx-auto text-gray-300 mb-3" />
                <p className="text-base font-bold text-gray-800">
                  No {primaryCategoryLabel.toLowerCase()} experiences found in {cityParam}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Try clearing your filters or exploring another category.
                </p>
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="mt-4 px-4 py-2 bg-[#7B1E3D] text-white text-xs font-semibold rounded-lg hover:bg-[#5C0F2A] transition-colors"
                  >
                    Reset All Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                {filteredEvents.map((ev) => {
                  const minTicketPrice =
                    ev.min_price_paise !== undefined && ev.min_price_paise !== null
                      ? ev.min_price_paise / 100
                      : ev.ticket_categories && ev.ticket_categories.length > 0
                      ? Math.min(...ev.ticket_categories.map((t) => t.price_paise)) / 100
                      : 0;

                  return (
                    <div
                      key={ev.id}
                      onClick={() => navigate(`/events/${ev.id}`)}
                      className="group cursor-pointer flex flex-col"
                    >
                      {/* Vertical Poster Card */}
                      <div className="relative aspect-[3/4] w-full rounded-lg overflow-hidden bg-gray-100 shadow-sm group-hover:shadow-md transition duration-200">
                        {ev.poster_image_url ? (
                          <img
                            src={ev.poster_image_url}
                            alt={ev.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300 ease-out"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                            <ImageOff className="h-8 w-8" />
                            <span className="text-xs mt-1">No Image</span>
                          </div>
                        )}

                        {/* Date overlay bar on bottom edge of poster */}
                        <div className="absolute inset-x-0 bottom-0 bg-black/85 text-white px-2.5 py-1.5 flex items-center justify-between text-[11px] font-medium tracking-wide">
                          <span>{formatDateBadge(ev.starts_at)}</span>
                        </div>
                      </div>

                      {/* Card Details directly under the poster */}
                      <div className="pt-2.5 flex flex-col">
                        <h3 className="font-bold text-sm text-gray-900 line-clamp-1 group-hover:text-[#7B1E3D] transition-colors">
                          {ev.title}
                        </h3>

                        <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                          {ev.venue_name}: {ev.city}
                        </p>

                        <p className="text-xs text-gray-500 mt-0.5">
                          {ev.category === 'dining' ? 'Fine Dining' : ev.category}
                        </p>

                        <p className="text-xs font-semibold text-gray-800 mt-1">
                          ₹ {minTicketPrice > 0 ? `${minTicketPrice}` : 'Free'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ==================== BOTTOM SEO / INFORMATIONAL TEXT ==================== */}
            <div className="mt-16 pt-8 border-t border-gray-200 text-gray-500 text-xs leading-relaxed space-y-4">
              {/* Breadcrumb */}
              <div className="flex items-center gap-1.5 text-gray-400 text-[11px]">
                <Link to="/" className="hover:underline">Home</Link>
                <span>→</span>
                <span>Activities</span>
                <span>→</span>
                <span>Food and Drinks</span>
                <span>→</span>
                <span className="text-gray-600 font-medium">Fine Dining</span>
              </div>

              <div>
                <h4 className="font-bold text-gray-700 text-sm mb-1.5">
                  Find Places for Fine Dining Near you!
                </h4>
                <p>
                  Once in a while, we all like to splurge and pamper ourselves by treating ourselves or loved ones to places for fine dining near you, whether it is specific places for gourmet dining near you or the trusted Michelin Star restaurants or even romantic restaurants in your city. On this page, you can find various such options for restaurants that cater to your fine dining near you needs.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-gray-700 text-sm mb-1.5">
                  Why Should You Try Fine Dining Near you?
                </h4>
                <p>
                  Whether it's a special occasion like a birthday, anniversary or promotion, or simply because you want to make your loved ones feel special, the option to go gourmet dining near you, whether it is as a Michelin Star restaurant or a romantic restaurant, is always a good idea. When looking for fine dining establishments near you, you will also get the chance to experience unique cuisines and ambiences, especially since a number establishments for fine dining near you are known for their authenticity and overall experience.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-gray-700 text-sm mb-1.5">
                  Where to Find the Best Fine Dining Near you?
                </h4>
                <p>
                  Your city or residence offers a host of opportunities to experience gourmet dining near you, ranging from 3-4 star restaurants to Michelin Star restaurants and even romantic restaurants. Such places can easily be found online by searching for establishments providing fine dining near you, or by looking up fine dining near you. On this page, you can search for dining experiences near you and filter based on your preferences.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-gray-700 text-sm mb-1.5">
                  How to Book Tickets for Fine Dining Near you?
                </h4>
                <p>
                  Finding the best restaurants for fine dining near you is now as easy as 1-2-3. Simply choose from a range of curated dining experiences, book your tickets, proceed to pay, and access your m-ticket via your confirmation page.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Mobile Filters Slide-over Sheet */}
      <AnimatePresence>
        {isMobileFilterOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileFilterOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            />

            {/* Slide-over panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative ml-auto w-full max-w-sm h-full bg-white shadow-2xl flex flex-col z-10"
            >
              {/* Header */}
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <span className="text-base font-bold text-gray-900">Filters</span>
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
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORY_PILLS.map((pill) => (
                      <FilterButton
                        key={pill.value}
                        label={pill.label}
                        isActive={selectedTags.includes(pill.value)}
                        onClick={() => toggleTag(pill.value)}
                      />
                    ))}
                  </div>
                </div>

                {/* Date */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                      Date
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {DATE_OPTIONS.map((opt) => (
                      <FilterButton
                        key={opt.value}
                        label={opt.label}
                        isActive={dateFilter === opt.value}
                        onClick={() => updateQuery('date', dateFilter === opt.value ? null : opt.value)}
                      />
                    ))}
                  </div>
                </div>

                {/* More Filters */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                      Amenities
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {MORE_FILTER_OPTIONS.map((opt) => (
                      <FilterButton
                        key={opt.value}
                        label={opt.label}
                        isActive={selectedTags.includes(opt.value)}
                        onClick={() => toggleTag(opt.value)}
                      />
                    ))}
                  </div>
                </div>

                {/* Price */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                      Price
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {PRICE_OPTIONS.map((opt) => (
                      <FilterButton
                        key={opt.value}
                        label={opt.label}
                        isActive={priceFilter === opt.value}
                        onClick={() => updateQuery('price', priceFilter === opt.value ? null : opt.value)}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom Action */}
              <div className="p-4 border-t border-gray-100 bg-white shrink-0">
                <button
                  type="button"
                  onClick={() => setIsMobileFilterOpen(false)}
                  className="w-full py-3 bg-[#7B1E3D] hover:bg-[#5C0F2A] text-white font-bold text-sm rounded-xl transition shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Show {filteredEvents.length} Experiences</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <CitySelectionModal
        isOpen={isCityModalOpen}
        onClose={() => setIsCityModalOpen(false)}
        currentCity={cityParam}
        onSelectCity={(newCity) => {
          setCity(newCity);
          setIsCityModalOpen(false);
        }}
      />

      <Footer />
    </div>
  );
}
