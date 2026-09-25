import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader } from '@/components/common/Loader';
import {
  ChevronDown,
  ChevronUp,
  Search,
  MapPin,
  Calendar,
  ArrowRight,
  Music,
  Mic,
  Trophy,
  Wrench,
  Drama,
  Palette,
  Sparkles,
  ImageOff,
  Filter,
  X,
} from 'lucide-react';
import { getEvents } from '@/api/event.api';
import type { EventItem, EventCategory } from '@/types/event.types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
const categoryMeta: Record<
  EventCategory,
  { label: string; icon: typeof Music; color: string }
> = {
  concert: { label: 'Music Shows', icon: Music, color: '#E91E63' },
  comedy: { label: 'Comedy Shows', icon: Mic, color: '#FF5722' },
  sports: { label: 'Sports', icon: Trophy, color: '#4CAF50' },
  workshop: { label: 'Workshops', icon: Wrench, color: '#2196F3' },
  theatre: { label: 'Performances', icon: Drama, color: '#9C27B0' },
  exhibition: { label: 'Exhibitions', icon: Palette, color: '#FF9800' },
  other: { label: 'More', icon: Sparkles, color: '#607D8B' },
};

const categoryPills: { value: EventCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'concert', label: 'Music Shows' },
  { value: 'comedy', label: 'Comedy Shows' },
  { value: 'theatre', label: 'Performances' },
  { value: 'workshop', label: 'Workshops' },
  { value: 'sports', label: 'Sports' },
  { value: 'exhibition', label: 'Exhibitions' },
  { value: 'other', label: 'More' },
];

interface FilterSectionProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  onClear?: () => void;
  hasActiveFilter?: boolean;
}

function FilterSection({
  title,
  isOpen,
  onToggle,
  children,
  onClear,
  hasActiveFilter,
}: FilterSectionProps) {
  return (
    <div className="border-b border-gray-200 py-4">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-800">{title}</span>
          {hasActiveFilter && (
            <span className="h-2 w-2 rounded-full bg-[#E91E63]" />
          )}
        </div>
        <div className="flex items-center gap-2">
          {onClear && hasActiveFilter && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="text-xs text-[#E91E63] hover:underline cursor-pointer"
            >
              Clear
            </span>
          )}
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
export default function EventsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
  // Filter sections state
  const [openFilters, setOpenFilters] = useState<Record<string, boolean>>({
    categories: true,
    date: false,
    languages: false,
    moreFilters: false,
    price: false,
  });

  // Mobile filter drawer
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  useEffect(() => {
    const cityParam = searchParams.get('city');
    if (cityParam) setCityFilter(cityParam);
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getEvents();
        if (!cancelled) setEvents(res);
      } catch {
        if (!cancelled) toast.error('Failed to load events');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const cities = useMemo(() => {
    const unique = Array.from(new Set(events.map((e) => e.city)));
    return ['all', ...unique];
  }, [events]);

  const filtered = useMemo(() => {
    return events.filter((e) => {
      const matchesSearch =
        e.title.toLowerCase().includes(search.toLowerCase()) ||
        e.venue_name.toLowerCase().includes(search.toLowerCase());
      const matchesCity = cityFilter === 'all' || e.city === cityFilter;
      const matchesCategory =
        categoryFilter === 'all' || e.category === categoryFilter;
      return matchesSearch && matchesCity && matchesCategory;
    });
  }, [events, search, cityFilter, categoryFilter]);

  const toggleFilter = (key: string) => {
    setOpenFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleClearAllFilters = () => {
    setCategoryFilter('all');
    setCityFilter('all');
    setSearch('');
  };

  const currentCity = cityFilter === 'all' ? 'All Cities' : cityFilter;

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      <Header />

      {/* Main Content */}
      <div className="pt-[104px]">
        {/* Page Title */}
        <div className="bg-white border-b border-gray-200">
          <div className="mx-auto max-w-[1240px] px-4 py-4">
            <h1 className="text-2xl font-bold text-gray-800">
              Events in {currentCity}
            </h1>
          </div>
        </div>

        <div className="mx-auto max-w-[1240px] px-4 py-6">
          <div className="flex gap-6">
            {/* Desktop Sidebar Filters */}
            <aside className="hidden lg:block w-64 shrink-0">
              <div className="sticky top-[120px] bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-800">Filters</h2>
                  <button
                    onClick={handleClearAllFilters}
                    className="text-xs text-[#E91E63] hover:underline"
                  >
                    Clear All
                  </button>
                </div>

                {/* Categories */}
                <FilterSection
                  title="Categories"
                  isOpen={openFilters.categories}
                  onToggle={() => toggleFilter('categories')}
                  onClear={() => setCategoryFilter('all')}
                  hasActiveFilter={categoryFilter !== 'all'}
                >
                  <div className="flex flex-wrap gap-2">
                    {categoryPills.map((cat) => (
                      <button
                        key={cat.value}
                        onClick={() => setCategoryFilter(cat.value)}
                        className={`px-3 py-1.5 text-xs font-medium rounded border transition ${
                          categoryFilter === cat.value
                            ? 'bg-[#E91E63] text-white border-[#E91E63]'
                            : 'bg-white text-gray-600 border-gray-300 hover:border-[#E91E63] hover:text-[#E91E63]'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </FilterSection>

                {/* Date */}
                <FilterSection
                  title="Date"
                  isOpen={openFilters.date}
                  onToggle={() => toggleFilter('date')}
                >
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm text-gray-600">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-[#E91E63] focus:ring-[#E91E63]"
                      />
                      Today
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-600">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-[#E91E63] focus:ring-[#E91E63]"
                      />
                      Tomorrow
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-600">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-[#E91E63] focus:ring-[#E91E63]"
                      />
                      This Weekend
                    </label>
                  </div>
                </FilterSection>

                {/* Languages */}
                <FilterSection
                  title="Languages"
                  isOpen={openFilters.languages}
                  onToggle={() => toggleFilter('languages')}
                >
                  <div className="space-y-2">
                    {['English', 'Hindi', 'Tamil', 'Telugu', 'Malayalam'].map(
                      (lang) => (
                        <label
                          key={lang}
                          className="flex items-center gap-2 text-sm text-gray-600"
                        >
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-[#E91E63] focus:ring-[#E91E63]"
                          />
                          {lang}
                        </label>
                      ),
                    )}
                  </div>
                </FilterSection>

                {/* More Filters */}
                <FilterSection
                  title="More Filters"
                  isOpen={openFilters.moreFilters}
                  onToggle={() => toggleFilter('moreFilters')}
                >
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm text-gray-600">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-[#E91E63] focus:ring-[#E91E63]"
                      />
                      Paid Events
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-600">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-[#E91E63] focus:ring-[#E91E63]"
                      />
                      Free Events
                    </label>
                  </div>
                </FilterSection>

                {/* Price */}
                <FilterSection
                  title="Price"
                  isOpen={openFilters.price}
                  onToggle={() => toggleFilter('price')}
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        className="h-9 text-sm"
                      />
                      <span className="text-gray-400">-</span>
                      <Input
                        type="number"
                        placeholder="Max"
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                </FilterSection>

                {/* Browse by Venues */}
                <Button
                  variant="outline"
                  className="w-full mt-4 border-[#E91E63] text-[#E91E63] hover:bg-[#E91E63] hover:text-white rounded"
                >
                  Browse by Venues
                </Button>
              </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1">
              {/* Search & Mobile Filter */}
              <div className="flex items-center gap-3 mb-6">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search for events"
                    className="h-10 rounded border-gray-300 pl-10 focus-visible:ring-[#E91E63] focus-visible:border-[#E91E63]"
                  />
                </div>
                <Button
                  variant="outline"
                  className="lg:hidden border-gray-300"
                  onClick={() => setShowMobileFilters(true)}
                >
                  <Filter className="h-4 w-4" />
                  Filters
                </Button>
              </div>

              {/* Category Pills (Horizontal Scroll) */}
              <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
                {categoryPills.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => setCategoryFilter(cat.value)}
                    className={`px-4 py-2 text-sm font-medium rounded-full border whitespace-nowrap transition ${
                      categoryFilter === cat.value
                        ? 'bg-[#E91E63] text-white border-[#E91E63]'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-[#E91E63] hover:text-[#E91E63]'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Results Count */}
              {!loading && (
                <p className="text-sm text-gray-500 mb-4">
                  Showing {filtered.length} events
                </p>
              )}

              {/* Events Grid */}
              {loading ? (
                <div className="flex justify-center py-20">
                  <Loader className="h-8 w-8" />
                </div>
              ) : filtered.length === 0 ? (
                <EmptyState onClearAll={handleClearAllFilters} />
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filtered.map((event, i) => {
                    const CatIcon =
                      categoryMeta[event.category]?.icon || Sparkles;
                    const minPrice = event.ticket_categories?.length
                      ? Math.min(
                          ...event.ticket_categories.map((t) => t.price_paise)
                        )
                      : null;
                    const eventDate = parseISO(event.starts_at);

                    return (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: i * 0.05 }}
                        className="group cursor-pointer"
                        onClick={() => navigate(`/booking/event/${event.id}`)}
                      >
                        <div className="overflow-hidden rounded-lg bg-white shadow-sm border border-gray-200 transition-all hover:shadow-md">
                          {/* Poster */}
                          <div className="relative aspect-[2/3] overflow-hidden bg-gray-100">
                            {event.poster_image_url ? (
                              <img
                                src={event.poster_image_url}
                                alt={event.title}
                                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300">
                                <ImageOff className="h-12 w-12 text-gray-400" />
                              </div>
                            )}

                            {/* Date Badge */}
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                              <div className="flex items-center gap-1 text-white text-xs">
                                <Calendar className="h-3 w-3" />
                                <span>
                                  {format(eventDate, 'EEE, d MMM')}
                                </span>
                              </div>
                            </div>

                            {/* Category Badge */}
                            <div className="absolute top-2 left-2">
                              <Badge
                                className="bg-white/90 text-gray-800 text-xs font-medium shadow-sm"
                                style={{
                                  color: categoryMeta[event.category]?.color,
                                }}
                              >
                                <CatIcon className="mr-1 h-3 w-3" />
                                {categoryMeta[event.category]?.label || 'Event'}
                              </Badge>
                            </div>
                          </div>

                          {/* Info */}
                          <div className="p-3">
                            <h3 className="font-semibold text-sm text-gray-900 line-clamp-2 group-hover:text-[#E91E63] transition">
                              {event.title}
                            </h3>
                            <p className="mt-1 text-xs text-gray-500 line-clamp-1">
                              {event.venue_name}
                            </p>
                            <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                              <MapPin className="h-3 w-3" />
                              <span className="line-clamp-1">{event.city}</span>
                            </div>
                            <div className="mt-2 flex items-center justify-between">
                              <div>
                                {minPrice !== null ? (
                                  <div>
                                    <span className="text-base font-bold text-gray-900">
                                      ₹{Math.round(minPrice / 100)}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      {' '}
                                      onwards
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-gray-500">
                                    Pricing TBD
                                  </span>
                                )}
                              </div>
                              <Button
                                size="sm"
                                className="bg-[#E91E63] hover:bg-[#C2185B] text-white text-xs font-semibold rounded"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/booking/event/${event.id}`);
                                }}
                              >
                                Book
                                <ArrowRight className="ml-1 h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </main>
          </div>
        </div>
      </div>

      <Footer />

      {/* Mobile Filter Drawer */}
      {showMobileFilters && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          onClick={() => setShowMobileFilters(false)}
        >
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="absolute right-0 top-0 h-full w-[280px] bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-bold">Filters</h2>
              <button
                onClick={() => setShowMobileFilters(false)}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto h-[calc(100vh-80px)]">
              {/* Mobile filter content */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold mb-2">Categories</h3>
                  <div className="flex flex-wrap gap-2">
                    {categoryPills.map((cat) => (
                      <button
                        key={cat.value}
                        onClick={() => {
                          setCategoryFilter(cat.value);
                          setShowMobileFilters(false);
                        }}
                        className={`px-3 py-1.5 text-xs font-medium rounded border ${
                          categoryFilter === cat.value
                            ? 'bg-[#E91E63] text-white border-[#E91E63]'
                            : 'bg-white text-gray-600 border-gray-300'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-2">City</h3>
                  <Select
                    value={cityFilter}
                    onValueChange={(v: string) => {
                      setCityFilter(v);
                      setShowMobileFilters(false);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {cities.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c === 'all' ? 'All Cities' : c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Fixed EmptyState component - receives onClearAll as prop
interface EmptyStateProps {
  onClearAll: () => void;
}

function EmptyState({ onClearAll }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
        <ImageOff className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-800">
        No events found
      </h3>
      <p className="mt-2 max-w-sm text-sm text-gray-500">
        Try adjusting your filters or search terms. New events are added
        regularly!
      </p>
      <Button
        variant="outline"
        className="mt-4 border-[#E91E63] text-[#E91E63] hover:bg-[#E91E63] hover:text-white"
        onClick={onClearAll}
      >
        Clear all filters
      </Button>
    </div>
  );
}