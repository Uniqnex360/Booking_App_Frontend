import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader } from '@/components/common/Loader';
import { getMyPartnerProfile } from '@/api/partner.api';
import { getMyEvents, cancelOrDeleteEvent } from '@/api/event.api';
import type { Partner, PartnerType } from '@/types/partner.types';
import type { EventItem } from '@/types/event.types';

import {
  Store,
  Film,
  CalendarDays,
  Phone,
  MapPin,
  Clock,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Plus,
  Ticket,
  ImageOff,
  Trash2,
  CalendarCheck,
  CalendarX,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const partnerTypeMeta: Record<
  PartnerType,
  { label: string; icon: typeof Store }
> = {
  restaurant: { label: 'Restaurant', icon: Store },
  cinema: { label: 'Cinema', icon: Film },
  event_organiser: { label: 'Event Organizer', icon: CalendarDays },
};

export default function PartnerDashboard() {
  const navigate = useNavigate();
  const [partner, setPartner] = useState<Partner | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'PENDING' | 'PAST'>('ACTIVE');
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const p = await getMyPartnerProfile();
      setPartner(p);
      if (p && p.status === 'APPROVED') {
        const evs = await getMyEvents();
        setEvents(evs);
      }
    } catch {
      toast.error('Failed to load partner dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCancelEvent = async (id: string) => {
    setCancellingId(id);
    try {
      await cancelOrDeleteEvent(id, 'Cancelled by organizer');
      toast.success('Event cancelled successfully');
      fetchData();
    } catch {
      toast.error('Failed to cancel event');
    } finally {
      setCancellingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex flex-col">
        <Header />
        <div className="flex-grow flex items-center justify-center">
          <Loader />
        </div>
        <Footer />
      </div>
    );
  }

  const now = new Date();

  // Categorize events dynamically
  const activeEvents = events.filter(
    (e) => e.status === 'PUBLISHED' && new Date(e.ends_at) >= now
  );
  const pendingEvents = events.filter(
    (e) => e.status === 'PENDING_APPROVAL' || e.status === 'DRAFT'
  );
  const pastEvents = events.filter(
    (e) => e.status === 'CANCELLED' || new Date(e.ends_at) < now
  );

  const currentList =
    activeTab === 'ACTIVE'
      ? activeEvents
      : activeTab === 'PENDING'
      ? pendingEvents
      : pastEvents;

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col">
      <Header />
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 py-8">
        {/* Partner Header Banner */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 md:p-8 mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-extrabold">{partner?.business_name || 'Partner Dashboard'}</h1>
              <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Approved
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-400 mt-2">
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4 text-amber-500" /> {partner?.city}
              </span>
              <span className="flex items-center gap-1">
                <Phone className="h-4 w-4 text-amber-500" /> {partner?.contact_phone}
              </span>
              <span className="flex items-center gap-1">
                <Store className="h-4 w-4 text-amber-500" /> {partnerTypeMeta[partner?.partner_type || 'event_organiser'].label}
              </span>
            </div>
          </div>

          <Button
            onClick={() => navigate('/partner/events/new')}
            className="bg-amber-500 hover:bg-amber-600 text-black font-bold flex items-center gap-2"
          >
            <Plus className="h-5 w-5" /> Host New Event
          </Button>
        </div>

        {/* Event Tabs */}
        <div className="flex items-center gap-2 border-b border-neutral-800 mb-8 pb-3">
          <button
            onClick={() => setActiveTab('ACTIVE')}
            className={`px-4 py-2 text-sm font-bold rounded-lg transition flex items-center gap-2 ${
              activeTab === 'ACTIVE'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <CalendarCheck className="h-4 w-4" /> Active Events ({activeEvents.length})
          </button>
          <button
            onClick={() => setActiveTab('PENDING')}
            className={`px-4 py-2 text-sm font-bold rounded-lg transition flex items-center gap-2 ${
              activeTab === 'PENDING'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Clock className="h-4 w-4" /> Under Review ({pendingEvents.length})
          </button>
          <button
            onClick={() => setActiveTab('PAST')}
            className={`px-4 py-2 text-sm font-bold rounded-lg transition flex items-center gap-2 ${
              activeTab === 'PAST'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <CalendarX className="h-4 w-4" /> Completed / Past ({pastEvents.length})
          </button>
        </div>

        {/* Events Grid */}
        {currentList.length === 0 ? (
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-12 text-center text-neutral-500">
            <p className="text-lg font-bold mb-2">No {activeTab.toLowerCase()} events found</p>
            <p className="text-sm">Click &quot;Host New Event&quot; to publish your upcoming events.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentList.map((e) => {
              const isPast = new Date(e.ends_at) < now;
              return (
                <div
                  key={e.id}
                  className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    <div className="aspect-[16/9] bg-neutral-800 relative">
                      {e.poster_image_url ? (
                        <img src={e.poster_image_url} alt={e.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-neutral-500">
                          <ImageOff className="h-8 w-8" />
                        </div>
                      )}
                      <div className="absolute top-3 right-3">
                        <Badge
                          className={`border ${
                            e.status === 'PUBLISHED' && !isPast
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : e.status === 'PENDING_APPROVAL'
                              ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                              : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                          }`}
                        >
                          {isPast ? 'COMPLETED' : e.status}
                        </Badge>
                      </div>
                    </div>

                    <div className="p-5">
                      <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">{e.category}</span>
                      <h3 className="text-xl font-bold mt-1 line-clamp-1">{e.title}</h3>
                      <p className="text-neutral-400 text-xs mt-2 flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" /> {e.venue_name}, {e.city}
                      </p>
                      <p className="text-neutral-400 text-xs mt-1 flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {format(parseISO(e.starts_at), 'MMM d, yyyy · h:mm a')}
                      </p>
                    </div>
                  </div>

                  <div className="p-5 pt-0 border-t border-neutral-800/60 mt-4 flex items-center justify-between">
                    <div className="text-xs text-neutral-400 flex items-center gap-1">
                      <Ticket className="h-3.5 w-3.5 text-amber-500" />
                      {e.ticket_categories?.length || 1} Ticket Tier(s)
                    </div>

                    {e.status !== 'CANCELLED' && !isPast && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="text-rose-500 hover:text-rose-400 hover:bg-rose-500/10">
                            <Trash2 className="h-4 w-4 mr-1" /> Cancel
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-neutral-900 border-neutral-800 text-white rounded-2xl">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Cancel Event?</AlertDialogTitle>
                            <AlertDialogDescription className="text-neutral-400">
                              Are you sure you want to cancel <strong className="text-white">{e.title}</strong>? This will notify ticket holders and cancel pending sales.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="bg-neutral-800 text-white border-0 hover:bg-neutral-700 rounded-xl">
                              Close
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleCancelEvent(e.id)}
                              className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl"
                            >
                              Confirm Cancellation
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
