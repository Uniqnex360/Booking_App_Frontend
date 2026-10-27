import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader } from '@/components/common/Loader';
import { INDIAN_STATES, STATE_CITIES, ALL_SUPPORTED_CITIES } from '@/utils/indiaGeography';
import { AdminEventDetailModal } from './admin/AdminEventDetailModal';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
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
import {
  getPendingEvents,
  updateContentStatus,
} from '@/api/admin.api';
import type { EventItem } from '@/types/event.types';

import {
  ShieldCheck,
  Check,
  X,
  Loader2,
  CalendarClock,
  MapPin,
  ImageOff,
  Ticket,
  Clock,
  Eye,
  Search,
} from 'lucide-react';

export default function AdminModerationPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectEvent, setRejectEvent] = useState<EventItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState('ALL');
  const [selectedCity, setSelectedCity] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEventForDetails, setSelectedEventForDetails] = useState<EventItem | null>(null);

  const availableCities = useMemo(() => {
    if (selectedState !== 'ALL' && STATE_CITIES[selectedState]) {
      return STATE_CITIES[selectedState];
    }
    return ALL_SUPPORTED_CITIES;
  }, [selectedState]);

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          ev.title.toLowerCase().includes(q) ||
          ev.venue_name.toLowerCase().includes(q) ||
          ev.city.toLowerCase().includes(q);
        if (!matches) return false;
      }
      if (selectedCity !== 'ALL' && !ev.city.toLowerCase().includes(selectedCity.toLowerCase())) {
        return false;
      }
      if (selectedState !== 'ALL') {
        const stateLower = selectedState.toLowerCase();
        const matchState =
          ev.city.toLowerCase().includes(stateLower) ||
          (ev.venue_address && ev.venue_address.toLowerCase().includes(stateLower));
        if (!matchState && !STATE_CITIES[selectedState]?.some((c) => ev.city.toLowerCase().includes(c.toLowerCase()))) {
          return false;
        }
      }
      return true;
    });
  }, [events, searchQuery, selectedCity, selectedState]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const data = await getPendingEvents();
      setEvents(data);
    } catch {
      toast.error('Failed to load pending events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleApprove = async (id: string) => {
    setApprovingId(id);
    try {
      await updateContentStatus(id, { status: 'PUBLISHED' });
      toast.success('Event approved and published');
      fetchEvents();
    } catch {
      toast.error('Failed to approve event');
    } finally {
      setApprovingId(null);
    }
  };

  const openRejectDialog = (event: EventItem) => {
    setRejectEvent(event);
    setRejectReason('');
  };

  const handleReject = async () => {
    if (!rejectEvent) return;
    if (!rejectReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    setRejecting(true);
    try {
      await updateContentStatus(rejectEvent.id, {
        status: 'REJECTED',
        rejection_reason: rejectReason.trim(),
      });
      toast.success('Event rejected');
      setRejectEvent(null);
      fetchEvents();
    } catch {
      toast.error('Failed to reject event');
    } finally {
      setRejecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Header hideLocation />

      {/* Header */}
      <div className="bg-gradient-to-b from-wine-50 to-background pt-28 pb-8">
        <div className="mx-auto max-w-6xl px-4  pb-8 sm:px-6 lg:px-8">

          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#7B1E3D]/5">
              <ShieldCheck className="h-6 w-6 text-[#7B1E3D]" />
            </div>
            <div>
              <h1 className="font-serif text-3xl font-semibold text-slate-900">
                Content Moderation
              </h1>
              <p className="text-sm text-slate-500">
                Review and approve pending event submissions
              </p>
            </div>
          </div>
        </div>
      </div>

<div className="mx-auto max-w-6xl px-4 pt-8 pb-8 sm:px-6 lg:px-8">

        {/* Admin Navigation Tabs */}
        <div className="flex border-b border-slate-200/60 gap-4 mb-6">
          <a
            href="/admin/partners"
            className="pb-3 text-sm font-medium text-slate-500 hover:text-slate-900 flex items-center gap-2"
          >
            <ShieldCheck className="h-4 w-4" />
            Partner Verification
          </a>
          <button
            onClick={() => {}}
            className="pb-3 text-sm font-semibold border-b-2 border-wine-700 text-slate-900 flex items-center gap-2"
          >
            <CalendarClock className="h-4 w-4 text-[#7B1E3D]" />
            Event Moderation
          </button>
        </div>

        {/* Filter and Location Search Bar */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search pending events by title, venue, or city..."
                className="h-10 pl-9 rounded-xl border-slate-200 text-xs"
              />
            </div>

            {/* State Location Filter */}
            <select
              value={selectedState}
              onChange={(e) => {
                setSelectedState(e.target.value);
                setSelectedCity('ALL');
              }}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 cursor-pointer"
            >
              <option value="ALL">All States (India)</option>
              {INDIAN_STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            {/* City Location Filter */}
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 cursor-pointer"
            >
              <option value="ALL">
                {selectedState !== 'ALL' ? `All Cities in ${selectedState}` : 'All Cities'}
              </option>
              {availableCities.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {(searchQuery.trim() !== '' || selectedState !== 'ALL' || selectedCity !== 'ALL') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedState('ALL');
                  setSelectedCity('ALL');
                }}
                className="h-10 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl"
              >
                <X className="w-3.5 h-3.5 mr-1" />
                Reset
              </Button>
            )}
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
            <span>
              Showing <strong>{filteredEvents.length}</strong> of {events.length} pending submissions
            </span>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader className="h-8 w-8" />
          </div>
        ) : filteredEvents.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-4">
            {filteredEvents.map((event, i) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft"
              >
                <div className="flex flex-col gap-4 p-5 sm:flex-row">
                  {/* Poster */}
                  <div className="h-32 w-full flex-shrink-0 overflow-hidden rounded-xl bg-[#7B1E3D]/5 sm:h-24 sm:w-24">
                    {event.poster_image_url ? (
                      <img
                        src={event.poster_image_url}
                        alt={event.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <ImageOff className="h-6 w-6 text-wine-300" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-serif text-lg font-semibold text-slate-900">
                          {event.title}
                        </h3>
                        <p className="text-sm text-slate-500">
                          {event.venue_name}
                        </p>
                      </div>
                      <Badge className="border bg-[#7B1E3D]/10 text-[#7B1E3D] border-[#7B1E3D]/30">
                        <Clock className="mr-1 h-3 w-3" />
                        Pending
                      </Badge>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <CalendarClock className="h-3.5 w-3.5" />
                        {format(parseISO(event.starts_at), 'MMM d, yyyy')} at{' '}
                        {format(parseISO(event.starts_at), 'h:mm a')}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        {event.city}
                      </span>
                      {event.ticket_categories &&
                        event.ticket_categories.length > 0 && (
                          <span className="flex items-center gap-1.5">
                            <Ticket className="h-3.5 w-3.5" />
                            {event.ticket_categories.length} tier
                            {event.ticket_categories.length > 1 ? 's' : ''}
                          </span>
                        )}
                    </div>

                    {event.description && (
                      <p className="mt-3 line-clamp-2 text-sm text-slate-500">
                        {event.description}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-shrink-0 gap-2 sm:flex-col">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedEventForDetails(event)}
                      className="rounded-full border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Eye className="h-3.5 w-3.5 mr-1 text-[#7B1E3D]" />
                      Details
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          className="rounded-full bg-emerald-600 text-xs font-semibold text-slate-900 hover:bg-emerald-700"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Approve
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="rounded-2xl">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="font-serif text-xl text-slate-900">
                            Approve Event
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to approve{' '}
                            <span className="font-semibold text-slate-900">
                              {event.title}
                            </span>
                            ? It will be published immediately and visible to
                            all users.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="rounded-xl">
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleApprove(event.id)}
                            className="rounded-xl bg-emerald-600 text-slate-900 hover:bg-emerald-700"
                          >
                            {approvingId === event.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              'Yes, approve'
                            )}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openRejectDialog(event)}
                      className="rounded-full border-red-300 text-xs font-semibold text-red-600 hover:bg-red-50"
                    >
                      <X className="h-3.5 w-3.5" />
                      Reject
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Reject Dialog */}
      <Dialog
        open={!!rejectEvent}
        onOpenChange={(open) => !open && setRejectEvent(null)}
      >
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl font-semibold text-slate-900">
              Reject Event
            </DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting{' '}
              <span className="font-semibold text-slate-900">
                {rejectEvent?.title}
              </span>
              . This will be visible to the partner.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-reason" className="text-sm font-medium">
              Rejection Reason *
            </Label>
            <Textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Poster image does not meet guidelines..."
              className="min-h-[100px] rounded-xl"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setRejectEvent(null)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleReject}
              disabled={rejecting || !rejectReason.trim()}
              className="rounded-xl bg-red-600 text-sm font-semibold text-slate-900 hover:bg-red-700"
            >
              {rejecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Reject Event'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Event Details Inspection Modal */}
      <AdminEventDetailModal
        event={selectedEventForDetails}
        open={!!selectedEventForDetails}
        onOpenChange={(op) => !op && setSelectedEventForDetails(null)}
        onApprove={(ev) => handleApprove(ev.id)}
        onReject={(ev) => {
          setSelectedEventForDetails(null);
          openRejectDialog(ev);
        }}
        isActionLoading={!!approvingId}
      />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#7B1E3D]/5">
        <ShieldCheck className="h-8 w-8 text-[#7B1E3D]" />
      </div>
      <h3 className="font-serif text-xl font-semibold text-slate-900">
        No Pending Approvals
      </h3>
      <p className="mt-2 max-w-sm text-sm text-slate-500">
        All caught up! There are no events waiting for review right now.
      </p>
    </div>
  );
}
