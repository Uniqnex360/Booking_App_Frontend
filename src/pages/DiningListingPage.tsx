import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { format, parseISO, isValid } from 'date-fns';
import {
  ChevronDown,
  ChevronUp,
  ImageOff,
  Filter,
} from 'lucide-react';

import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { getEvents } from '@/api/event.api';
import type { EventItem } from '@/types/event.types';

// BookMyShow Signature Colors
const BMS_RED = '#F84464';

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

function FilterBox({
  title,
  isOpen,
  onToggle,
  onClear,
  showClear,
  children,
}: {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  onClear?: () => void;
  showClear?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-md border border-gray-200 shadow-2xs mb-3 overflow-hidden">
      <div className="flex items-center justify-between px-3.5 py-3 select-none">
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center gap-2 text-left font-medium text-gray-800 text-sm hover:text-gray-900 transition-colors"
        >
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-500" />
          )}
          <span>{title}</span>
        </button>
        {showClear && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-gray-400 hover:text-[#F84464] transition-colors font-normal"
          >
            Clear
          </button>
        )}
      </div>
      {isOpen && (
        <div className="px-3.5 pb-3.5 pt-1 border-t border-gray-50">
          {children}
        </div>
      )}
    </div>
  );
}

export default function DiningListingPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Accordion toggle states
  const [openSections, setOpenSections] = useState({
    categories: true,
    date: false,
    moreFilters: false,
    price: false,
  });

  const toggleSection = (key: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev [key] }));
  };

  // URL Query state parsing
  const cityParam =
    searchParams.get('city') ||
    localStorage.getItem('vyhbz_city') ||
    'Hyderabad';

  const tagsParam = searchParams.get('tags');
  const selectedTags = useMemo(() => {
    if (!tagsParam) return ['FINE_DINING']; // Default to Fine Dining per BMS
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

  const toggleTag = (val: string) => {
    let nextTags: string[];
    if (selectedTags.includes(val)) {
      nextTags = selectedTags.filter((t) => t !== val);
      if (nextTags.length === 0) {
        nextTags = ['FINE_DINING']; // Keep at least Fine Dining or allow empty
      }
    } else {
      nextTags = [...selectedTags, val];
    }
    updateQuery('tags', nextTags.join(','));
  };

  // Fetch events
  useEffect(() => {
    const fetchDiningEvents = async () => {
      setLoading(true);
      try {
        const params: Record<string, string> = {
          category: 'dining',
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

  // Format date overlay on poster: e.g. "Sat, 10 Oct onwards" or "Sun, 11 Oct"
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

  // Page title capitalization
  const primaryCategoryLabel = useMemo(() => {
    if (selectedTags.includes('FINE_DINING')) return 'Fine Dining';
    if (selectedTags.includes('STREET_FOOD')) return 'Street Food';
    if (selectedTags.includes('SUNDAY_BRUNCH')) return 'Sunday Brunch';
    if (selectedTags.includes('BUFFET')) return 'Buffet Spread';
    return 'Dining';
  }, [selectedTags]);

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-gray-900 font-sans flex flex-col">
      <Header />

      {/* Main Container */}
      <main className="max-w-[1240px] w-full mx-auto px-4 sm:px-6 pt-24 pb-16 flex-1">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          
          {/* ==================== LEFT SIDEBAR: FILTERS ==================== */}
          <aside className="w-full lg:w-[260px] shrink-0">
            <h1 className="text-2xl font-bold text-gray-900 mb-4 tracking-tight">
              Filters
            </h1>

            {/* Accordion 1: Categories */}
            <FilterBox
              title="Categories"
              isOpen={openSections.categories}
              onToggle={() => toggleSection('categories')}
              onClear={() => updateQuery('tags', 'FINE_DINING')}
              showClear={selectedTags.length > 1 || !selectedTags.includes('FINE_DINING')}
            >
              <div className="flex flex-wrap gap-2 pt-1">
                {CATEGORY_PILLS.map((pill) => {
                  const isSelected = selectedTags.includes(pill.value);
                  return (
                    <button
                      key={pill.value}
                      type="button"
                      onClick={() => toggleTag(pill.value)}
                      className={`px-3 py-1.5 rounded-sm text-xs font-normal transition-colors border ${
                        isSelected
                          ? 'bg-[#F84464] text-white border-[#F84464]'
                          : 'bg-white text-[#F84464] border-gray-200 hover:border-[#F84464]/50'
                      }`}
                    >
                      {pill.label}
                    </button>
                  );
                })}
              </div>
            </FilterBox>

            {/* Accordion 2: Date */}
            <FilterBox
              title="Date"
              isOpen={openSections.date}
              onToggle={() => toggleSection('date')}
              onClear={() => updateQuery('date', null)}
              showClear={Boolean(dateFilter)}
            >
              <div className="flex flex-wrap gap-2 pt-1">
                {DATE_OPTIONS.map((opt) => {
                  const isSelected = dateFilter === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateQuery('date', isSelected ? null : opt.value)}
                      className={`px-3 py-1.5 rounded-sm text-xs font-normal transition-colors border ${
                        isSelected
                          ? 'bg-[#F84464] text-white border-[#F84464]'
                          : 'bg-white text-[#F84464] border-gray-200 hover:border-[#F84464]/50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </FilterBox>

            {/* Accordion 3: More Filters (Amenities) */}
            <FilterBox
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
            >
              <div className="flex flex-wrap gap-2 pt-1">
                {MORE_FILTER_OPTIONS.map((opt) => {
                  const isSelected = selectedTags.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleTag(opt.value)}
                      className={`px-3 py-1.5 rounded-sm text-xs font-normal transition-colors border ${
                        isSelected
                          ? 'bg-[#F84464] text-white border-[#F84464]'
                          : 'bg-white text-[#F84464] border-gray-200 hover:border-[#F84464]/50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </FilterBox>

            {/* Accordion 4: Price */}
            <FilterBox
              title="Price"
              isOpen={openSections.price}
              onToggle={() => toggleSection('price')}
              onClear={() => updateQuery('price', null)}
              showClear={Boolean(priceFilter)}
            >
              <div className="flex flex-wrap gap-2 pt-1">
                {PRICE_OPTIONS.map((opt) => {
                  const isSelected = priceFilter === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateQuery('price', isSelected ? null : opt.value)}
                      className={`px-3 py-1.5 rounded-sm text-xs font-normal transition-colors border ${
                        isSelected
                          ? 'bg-[#F84464] text-white border-[#F84464]'
                          : 'bg-white text-[#F84464] border-gray-200 hover:border-[#F84464]/50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </FilterBox>

            {/* Browse by Venues button */}
            <button
              type="button"
              onClick={() => navigate('/venues')}
              className="w-full mt-2 py-2.5 px-4 rounded-md border border-[#F84464] text-[#F84464] text-xs font-semibold hover:bg-[#F84464]/5 transition-colors text-center"
            >
              Browse by Venues
            </button>
          </aside>

          {/* ==================== RIGHT MAIN COLUMN: GRID ==================== */}
          <section className="flex-1 min-w-0 w-full">
            {/* Header: Fine Dining In Hyderabad */}
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight capitalize">
              {primaryCategoryLabel} In {cityParam}
            </h2>

            {/* Category Pills Row above Cards */}
            <div className="flex flex-wrap items-center gap-2 mt-4 mb-6">
              {CATEGORY_PILLS.map((pill) => {
                const isSelected = selectedTags.includes(pill.value);
                return (
                  <button
                    key={pill.value}
                    type="button"
                    onClick={() => toggleTag(pill.value)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                      isSelected
                        ? 'bg-[#F84464] text-white border-[#F84464]'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {pill.label}
                  </button>
                );
              })}
            </div>

            {/* Cards Grid */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="animate-pulse space-y-2">
                    <div className="aspect-[3/4] bg-gray-200 rounded-lg w-full" />
                    <div className="h-4 bg-gray-200 rounded-sm w-4/5" />
                    <div className="h-3 bg-gray-200 rounded-sm w-3/5" />
                    <div className="h-3 bg-gray-200 rounded-sm w-1/4" />
                  </div>
                ))}
              </div>
            ) : events.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center my-6">
                <p className="text-base font-semibold text-gray-800">
                  No {primaryCategoryLabel.toLowerCase()} experiences found in {cityParam}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Try clearing your filters or exploring another category.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    updateQuery('tags', 'FINE_DINING');
                    updateQuery('date', null);
                    updateQuery('price', null);
                  }}
                  className="mt-4 px-4 py-2 bg-[#F84464] text-white text-xs font-semibold rounded-md hover:bg-[#d63351] transition-colors"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {events.map((ev) => {
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
                      <div className="relative aspect-[3/4] w-full rounded-lg overflow-hidden bg-gray-100 shadow-2xs">
                        {ev.poster_image_url ? (
                          <img
                            src={ev.poster_image_url}
                            alt={ev.title}
                            className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
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

                      {/* Card Details directly under the poster (BookMyShow standard) */}
                      <div className="pt-2.5 flex flex-col">
                        <h3 className="font-bold text-sm text-gray-900 line-clamp-1 group-hover:text-[#F84464] transition-colors">
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

      <Footer />
    </div>
  );
}
