import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Search,
  MapPin,
  Calendar,
  Utensils,
  ChevronDown,
  ChevronUp,
  X,
  Sparkles,
  Tag,
  Flame,
  Wine,
  Waves,
  Sun,
  Music,
  Smile,
  ImageOff,
  Filter,
} from 'lucide-react';

import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { getEvents } from '@/api/event.api';
import type { EventItem } from '@/types/event.types';
import { DINING_TAGS } from '@/types/event.types';

const WINE_COLOR = '#7B1E3D';
const WINE_HOVER = '#5C0F2A';

const EXPERIENCE_TAG_OPTIONS = [
  { value: 'FINE_DINING', label: 'Fine Dining', icon: Wine },
  { value: 'SUNDAY_BRUNCH', label: 'Sunday Brunch', icon: Sun },
  { value: 'BUFFET', label: 'Buffet Spread', icon: Utensils },
  { value: 'STREET_FOOD', label: 'Street Food Trail', icon: Flame },
];

const AMENITY_TAG_OPTIONS = [
  { value: 'POOLSIDE', label: 'Pool Access', icon: Waves },
  { value: 'ROOFTOP', label: 'Rooftop Dining', icon: Sun },
  { value: 'OUTDOOR_SEATING', label: 'Outdoor Seating', icon: Sun },
  { value: 'LIVE_MUSIC', label: 'Live Music', icon: Music },
  { value: 'KIDS_ALLOWED', label: 'Kids Friendly', icon: Smile },
];

const DATE_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'this-weekend', label: 'This Weekend' },
];

const PRICE_OPTIONS = [
  { value: 'free', label: 'Free' },
  { value: '0-500', label: '₹0 - ₹500' },
  { value: '500-2000', label: '₹501 - ₹2000' },
  { value: '2000+', label: 'Above ₹2000' },
];

const COMMON_CUISINES = [
  'Kerala',
  'South Indian',
  'North Indian',
  'Italian',
  'Continental',
  'Pan-Asian',
  'Seafood',
  'Mughlai',
  'Barbecue',
  'Desserts',
];

function FilterAccordion({
  title,
  isOpen,
  onToggle,
  onClear,
  children,
}: {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  onClear?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-4 bg-white rounded-xl border border-gray-100 shadow-xs overflow-hidden">
      <div className="flex w-full items-center justify-between p-3.5 transition-colors hover:bg-gray-50/60">
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center gap-2 flex-grow text-left font-semibold text-gray-900 text-sm"
        >
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
          <span>{title}</span>
        </button>
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="text-[11px] font-medium text-gray-400 hover:text-[#7B1E3D] transition-colors ml-2"
          >
            Clear
          </button>
        )}
      </div>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-gray-100 px-3.5 py-3"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function DiningListingPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  // URL state sync
  const cityParam = searchParams.get('city') || '';
  const dateFilter = searchParams.get('date') || '';
  const priceFilter = searchParams.get('price') || '';
  const selectedTags = useMemo(
    () => (searchParams.get('tags') ? searchParams.get('tags')!.split(',') : []),
    [searchParams]
  );
  const selectedCuisines = useMemo(
    () => (searchParams.get('cuisine') ? searchParams.get('cuisine')!.split(',') : []),
    [searchParams]
  );
  const searchQuery = searchParams.get('q') || '';

  // Accordion collapse state
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({
    experience: true,
    date: true,
    price: true,
    amenities: true,
    cuisines: true,
  });

  const toggleAccordion = (key: string) => {
    setOpenAccordions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const updateFilter = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (!value) {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    setSearchParams(next);
  };

  const toggleArrayFilter = (key: string, item: string) => {
    const next = new URLSearchParams(searchParams);
    const existing = next.get(key) ? next.get(key)!.split(',') : [];
    const itemUpper = item.trim();
    let updated: string[];
    if (existing.includes(itemUpper)) {
      updated = existing.filter((x) => x !== itemUpper);
    } else {
      updated = [...existing, itemUpper];
    }
    if (updated.length > 0) {
      next.set(key, updated.join(','));
    } else {
      next.delete(key);
    }
    setSearchParams(next);
  };

  const clearAllFilters = () => {
    const next = new URLSearchParams();
    if (cityParam) next.set('city', cityParam);
    setSearchParams(next);
  };

  // Fetch dining events
  useEffect(() => {
    const fetchDiningEvents = async () => {
      setLoading(true);
      try {
        const params: Record<string, any> = {
          category: 'dining',
        };
        if (cityParam) params.city = cityParam;
        if (dateFilter) params.date = dateFilter;
        if (priceFilter) params.price = priceFilter;
        if (selectedTags.length > 0) params.tags = selectedTags.join(',');

        const data = await getEvents(params);
        setEvents(data);
      } catch (err) {
        toast.error('Failed to load dining events');
      } finally {
        setLoading(false);
      }
    };

    fetchDiningEvents();
  }, [cityParam, dateFilter, priceFilter, selectedTags]);

  // Client-side filtering for search query & cuisines
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = ev.title.toLowerCase().includes(q);
        const matchesVenue = ev.venue_name.toLowerCase().includes(q);
        const matchesCity = ev.city.toLowerCase().includes(q);
        const matchesCuisine = (ev.cuisine || []).some((c) =>
          c.toLowerCase().includes(q)
        );
        if (!matchesTitle && !matchesVenue && !matchesCity && !matchesCuisine) {
          return false;
        }
      }

      if (selectedCuisines.length > 0) {
        const evCuisines = (ev.cuisine || []).map((c) => c.toLowerCase());
        const hasMatch = selectedCuisines.some((sc) =>
          evCuisines.includes(sc.toLowerCase())
        );
        if (!hasMatch) return false;
      }

      return true;
    });
  }, [events, searchQuery, selectedCuisines]);

  const hasActiveFilters =
    Boolean(dateFilter) ||
    Boolean(priceFilter) ||
    selectedTags.length > 0 ||
    selectedCuisines.length > 0 ||
    Boolean(searchQuery);

  return (
    <div className="min-h-screen bg-[#F6F7F9] text-gray-900 font-sans">
      <Header />

      {/* HERO BANNER - BOOKMYSHOW STYLE */}
      <section className="bg-gradient-to-r from-[#2B0B17] via-[#5C0F2A] to-[#7B1E3D] text-white pt-24 pb-12 px-4 sm:px-6 lg:px-8 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-rose-200 border border-white/10 backdrop-blur-xs">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" /> Curated Dining & Nightlife
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
              Food & Drinks Experiences
            </h1>
            <p className="text-sm sm:text-base text-rose-100/90 leading-relaxed">
              Explore fine dining degustation menus, luxury Sunday brunches, buffet spreads, and rooftop dinners in {cityParam || 'your city'}.
            </p>
          </div>

          {/* Search Input in Hero */}
          <div className="w-full md:w-80">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search restaurant or cuisine..."
                value={searchQuery}
                onChange={(e) => updateFilter('q', e.target.value.trim() ? e.target.value : null)}
                className="w-full bg-white text-gray-900 pl-10 pr-4 py-3 rounded-xl text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-300 shadow-md"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => updateFilter('q', null)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Quick Filter Pills in Hero */}
        <div className="max-w-7xl mx-auto mt-6 pt-6 border-t border-white/10 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-rose-200 uppercase tracking-wider mr-1">
            Trending:
          </span>
          {EXPERIENCE_TAG_OPTIONS.map((tag) => {
            const isSelected = selectedTags.includes(tag.value);
            return (
              <button
                key={tag.value}
                onClick={() => toggleArrayFilter('tags', tag.value)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs ${
                  isSelected
                    ? 'bg-white text-[#7B1E3D] shadow-md'
                    : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
                }`}
              >
                <tag.icon className="h-3.5 w-3.5" />
                {tag.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* MAIN CONTENT AREA: SIDEBAR FILTERS + GRID */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* SIDEBAR FILTERS */}
          <aside className="w-full lg:w-72 shrink-0">
            <div className="flex items-center justify-between pb-4 border-b border-gray-200 mb-4">
              <div className="flex items-center gap-2 font-bold text-gray-900 text-lg">
                <Filter className="h-5 w-5 text-[#7B1E3D]" /> Filters
              </div>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="text-xs font-semibold text-[#7B1E3D] hover:underline"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Experiences Accordion */}
            <FilterAccordion
              title="Experience Type"
              isOpen={openAccordions.experience}
              onToggle={() => toggleAccordion('experience')}
              onClear={selectedTags.length > 0 ? () => updateFilter('tags', null) : undefined}
            >
              <div className="space-y-2">
                {EXPERIENCE_TAG_OPTIONS.map((opt) => {
                  const isChecked = selectedTags.includes(opt.value);
                  return (
                    <label
                      key={opt.value}
                      className="flex items-center gap-2.5 text-xs text-gray-700 hover:text-gray-900 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleArrayFilter('tags', opt.value)}
                        className="rounded-sm border-gray-300 text-[#7B1E3D] focus:ring-[#7B1E3D]"
                      />
                      <span>{opt.label}</span>
                    </label>
                  );
                })}
              </div>
            </FilterAccordion>

            {/* Date Accordion */}
            <FilterAccordion
              title="Date"
              isOpen={openAccordions.date}
              onToggle={() => toggleAccordion('date')}
              onClear={dateFilter ? () => updateFilter('date', null) : undefined}
            >
              <div className="flex flex-wrap gap-1.5">
                {DATE_OPTIONS.map((d) => {
                  const isSelected = dateFilter === d.value;
                  return (
                    <button
                      key={d.value}
                      onClick={() => updateFilter('date', isSelected ? null : d.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                        isSelected
                          ? 'bg-[#7B1E3D] text-white border-[#7B1E3D]'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </FilterAccordion>

            {/* Price Accordion */}
            <FilterAccordion
              title="Price Range"
              isOpen={openAccordions.price}
              onToggle={() => toggleAccordion('price')}
              onClear={priceFilter ? () => updateFilter('price', null) : undefined}
            >
              <div className="flex flex-wrap gap-1.5">
                {PRICE_OPTIONS.map((p) => {
                  const isSelected = priceFilter === p.value;
                  return (
                    <button
                      key={p.value}
                      onClick={() => updateFilter('price', isSelected ? null : p.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                        isSelected
                          ? 'bg-[#7B1E3D] text-white border-[#7B1E3D]'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </FilterAccordion>

            {/* Amenities / Tags Accordion */}
            <FilterAccordion
              title="Amenities & Features"
              isOpen={openAccordions.amenities}
              onToggle={() => toggleAccordion('amenities')}
            >
              <div className="space-y-2">
                {AMENITY_TAG_OPTIONS.map((opt) => {
                  const isChecked = selectedTags.includes(opt.value);
                  return (
                    <label
                      key={opt.value}
                      className="flex items-center gap-2.5 text-xs text-gray-700 hover:text-gray-900 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleArrayFilter('tags', opt.value)}
                        className="rounded-sm border-gray-300 text-[#7B1E3D] focus:ring-[#7B1E3D]"
                      />
                      <opt.icon className="h-3.5 w-3.5 text-gray-500" />
                      <span>{opt.label}</span>
                    </label>
                  );
                })}
              </div>
            </FilterAccordion>

            {/* Cuisines Accordion */}
            <FilterAccordion
              title="Cuisines"
              isOpen={openAccordions.cuisines}
              onToggle={() => toggleAccordion('cuisines')}
              onClear={selectedCuisines.length > 0 ? () => updateFilter('cuisine', null) : undefined}
            >
              <div className="flex flex-wrap gap-1.5">
                {COMMON_CUISINES.map((c) => {
                  const isChecked = selectedCuisines.includes(c);
                  return (
                    <button
                      key={c}
                      onClick={() => toggleArrayFilter('cuisine', c)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors border ${
                        isChecked
                          ? 'bg-[#7B1E3D] text-white border-[#7B1E3D]'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </FilterAccordion>
          </aside>

          {/* EVENT CARDS GRID */}
          <div className="flex-1">
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                Experiences Available ({filteredEvents.length})
              </h2>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs animate-pulse space-y-3"
                  >
                    <div className="h-48 bg-gray-200 rounded-xl" />
                    <div className="h-4 bg-gray-200 rounded-sm w-3/4" />
                    <div className="h-3 bg-gray-200 rounded-sm w-1/2" />
                  </div>
                ))}
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center max-w-lg mx-auto shadow-xs">
                <Utensils className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-900">
                  No dining experiences found
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  Try adjusting your filters, selecting a different date, or searching for other cuisines.
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={clearAllFilters}
                    className="mt-5 px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#7B1E3D] hover:bg-[#5C0F2A] text-white transition-all shadow-xs"
                  >
                    Clear All Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredEvents.map((ev) => {
                  const minTicketPrice =
                    ev.min_price_paise !== undefined && ev.min_price_paise !== null
                      ? ev.min_price_paise / 100
                      : ev.ticket_categories && ev.ticket_categories.length > 0
                      ? Math.min(...ev.ticket_categories.map((t) => t.price_paise)) / 100
                      : 0;

                  return (
                    <motion.div
                      key={ev.id}
                      whileHover={{ y: -4 }}
                      transition={{ duration: 0.2 }}
                      onClick={() => navigate(`/events/${ev.id}`)}
                      className="group bg-white rounded-2xl border border-gray-200/80 shadow-xs hover:shadow-lg transition-all duration-300 overflow-hidden cursor-pointer flex flex-col"
                    >
                      {/* Image Box */}
                      <div className="relative h-48 w-full overflow-hidden bg-gray-100">
                        {ev.poster_image_url ? (
                          <img
                            src={ev.poster_image_url}
                            alt={ev.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                            <ImageOff className="h-8 w-8" />
                            <span className="text-xs mt-1">No Image</span>
                          </div>
                        )}

                        {/* Top Badges */}
                        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                          {ev.price_range && (
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-black/75 text-amber-300 backdrop-blur-xs">
                              {'₹'.repeat(ev.price_range)}
                            </span>
                          )}
                          {ev.tags && ev.tags.length > 0 && (
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-[#7B1E3D]/90 text-white backdrop-blur-xs uppercase tracking-wider">
                              {ev.tags[0].replace('_', ' ')}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Content Box */}
                      <div className="p-4 flex-1 flex flex-col justify-between">
                        <div className="space-y-2">
                          <h3 className="font-bold text-base text-gray-900 group-hover:text-[#7B1E3D] transition-colors line-clamp-1">
                            {ev.title}
                          </h3>

                          {/* Venue & City */}
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                            <span className="truncate">
                              {ev.venue_name}, {ev.city}
                            </span>
                          </div>

                          {/* Cuisines */}
                          {ev.cuisine && ev.cuisine.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {ev.cuisine.slice(0, 3).map((c, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200/60"
                                >
                                  {c}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* What's Included Snippet */}
                          {ev.what_included && (
                            <p className="text-xs text-gray-600 line-clamp-2 pt-1 italic">
                              "{ev.what_included}"
                            </p>
                          )}
                        </div>

                        {/* Card Footer: Price & Book Now */}
                        <div className="pt-4 mt-3 border-t border-gray-100 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
                              Starts from
                            </span>
                            <span className="text-base font-extrabold text-gray-900">
                              {minTicketPrice > 0 ? `₹${minTicketPrice}` : 'Free'}{' '}
                              <span className="text-xs font-normal text-gray-500">
                                onwards
                              </span>
                            </span>
                          </div>

                          <button
                            type="button"
                            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#7B1E3D] hover:bg-[#5C0F2A] text-white transition-all shadow-xs"
                          >
                            Book Now
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

