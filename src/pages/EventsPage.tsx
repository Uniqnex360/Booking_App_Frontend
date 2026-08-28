import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader } from '@/components/common/Loader';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getEvents } from '@/api/event.api';
import type {
  EventItem,
  EventCategory,
} from '@/types/event.types';

import {
  Search,
  MapPin,
  Calendar,
  Clock,
  ArrowRight,
  CalendarDays,
  Music,
  Mic,
  Trophy,
  Wrench,
  Drama,
  Palette,
  Sparkles,
  ImageOff,
} from 'lucide-react';
import { formatCurrency } from '@/utils/currencyFormatter';

const categoryMeta: Record<
  EventCategory,
  { label: string; icon: typeof Music }
> = {
  concert: { label: 'Concert', icon: Music },
  comedy: { label: 'Comedy', icon: Mic },
  sports: { label: 'Sports', icon: Trophy },
  workshop: { label: 'Workshop', icon: Wrench },
  theatre: { label: 'Theatre', icon: Drama },
  exhibition: { label: 'Exhibition', icon: Palette },
  other: { label: 'Other', icon: Sparkles },
};

const categoryOptions: { value: EventCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All Categories' },
  ...Object.entries(categoryMeta).map(([value, meta]) => ({
    value: value as EventCategory,
    label: meta.label,
  })),
];

export default function EventsPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getEvents();
        if (!cancelled) setEvents(res.data);
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

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-b from-wine-50 to-background pt-28 pb-8">
        <div className="absolute -right-20 top-10 h-72 w-72 rounded-full bg-wine-500/10 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="font-serif text-4xl font-semibold text-wine-950 sm:text-5xl"
          >
            Experiences
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-2 text-foreground/60"
          >
            Discover and book unforgettable events near you
          </motion.p>

          {/* Filter bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center"
          >
            <div className="relative max-w-md flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search events or venues..."
                className="h-11 rounded-xl pl-10"
              />
            </div>
            <div className="flex gap-3">
              <Select value={cityFilter} onValueChange={setCityFilter}>
                <SelectTrigger className="h-11 w-[150px] rounded-xl">
                  <SelectValue placeholder="City" />
                </SelectTrigger>
                <SelectContent>
                  {cities.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c === 'all' ? 'All Cities' : c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={categoryFilter}
                onValueChange={setCategoryFilter}
              >
                <SelectTrigger className="h-11 w-[170px] rounded-xl">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Grid */}
      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader className="h-8 w-8" />
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((event, i) => {
                const CatIcon =
                  categoryMeta[event.category]?.icon || Sparkles;
                const minPrice = event.ticket_categories?.length
                  ? Math.min(
                      ...event.ticket_categories.map((t) => t.price_paise)
                    )
                  : null;
                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: i * 0.05 }}
                  >
                    <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border/50 bg-card shadow-soft transition-all hover:-translate-y-1 hover:shadow-soft-lg">
                      <div className="relative aspect-[4/3] overflow-hidden bg-wine-50">
                        {event.poster_image_url ? (
                          <img
                            src={event.poster_image_url}
                            alt={event.title}
                            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <ImageOff className="h-10 w-10 text-wine-300" />
                          </div>
                        )}
                        <div className="absolute left-3 top-3">
                          <Badge className="bg-wine-700 text-xs font-semibold text-white shadow-wine">
                            <CatIcon className="mr-1 h-3 w-3" />
                            {categoryMeta[event.category]?.label || 'Event'}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex flex-1 flex-col p-4">
                        <h3 className="font-serif text-lg font-semibold text-wine-950">
                          {event.title}
                        </h3>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {event.venue_name}
                        </p>
                        <div className="mt-3 flex flex-col gap-1.5 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <MapPin className="h-3 w-3" />
                            {event.city}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Calendar className="h-3 w-3" />
                            {format(parseISO(event.starts_at), 'MMM d, yyyy')}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Clock className="h-3 w-3" />
                            {format(parseISO(event.starts_at), 'h:mm a')}
                          </span>
                        </div>
                        <div className="mt-auto flex items-center justify-between border-t border-border/50 pt-3">
                          <div>
                            {minPrice !== null ? (
                              <>
                                <span className="font-serif text-2xl font-semibold text-wine-800">
                                  {formatCurrency(minPrice, 'INR', 100)}

                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {' '}
                                  /ticket
                                </span>
                              </>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                Pricing TBD
                              </span>
                            )}
                          </div>
                          <Button
                            size="sm"
                            onClick={() =>
                              navigate(`/booking/event/${event.id}`)
                            }
                            className="rounded-full bg-wine-700 px-4 text-xs font-semibold text-white shadow-wine hover:bg-wine-800"
                          >
                            Book Now
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
        </div>
      </section>

      <Footer />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-wine-50">
        <CalendarDays className="h-8 w-8 text-wine-600" />
      </div>
      <h3 className="font-serif text-xl font-semibold text-wine-950">
        No Events Found
      </h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Try adjusting your filters or search terms. New events are added
        regularly!
      </p>
    </div>
  );
}
