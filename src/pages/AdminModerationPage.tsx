import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader } from '@/components/common/Loader';
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
} from 'lucide-react';

export default function AdminModerationPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectEvent, setRejectEvent] = useState<EventItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);

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
    <div className="min-h-screen bg-background">
      <Header />

      {/* Header */}
      <div className="bg-gradient-to-b from-wine-50 to-background pt-28 pb-8">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-wine-50">
              <ShieldCheck className="h-6 w-6 text-wine-700" />
            </div>
            <div>
              <h1 className="font-serif text-3xl font-semibold text-wine-950">
                Content Moderation
              </h1>
              <p className="text-sm text-muted-foreground">
                Review and approve pending event submissions
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader className="h-8 w-8" />
          </div>
        ) : events.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-4">
            {events.map((event, i) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-soft"
              >
                <div className="flex flex-col gap-4 p-5 sm:flex-row">
                  {/* Poster */}
                  <div className="h-32 w-full flex-shrink-0 overflow-hidden rounded-xl bg-wine-50 sm:h-24 sm:w-24">
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
                        <h3 className="font-serif text-lg font-semibold text-wine-950">
                          {event.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {event.venue_name}
                        </p>
                      </div>
                      <Badge className="border bg-amber-100 text-amber-700 border-amber-200">
                        <Clock className="mr-1 h-3 w-3" />
                        Pending
                      </Badge>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
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
                      <p className="mt-3 line-clamp-2 text-sm text-foreground/60">
                        {event.description}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-shrink-0 gap-2 sm:flex-col">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          className="rounded-full bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Approve
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="rounded-2xl">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="font-serif text-xl text-wine-950">
                            Approve Event
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to approve{' '}
                            <span className="font-semibold text-wine-950">
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
                            className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
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
            <DialogTitle className="font-serif text-2xl font-semibold text-wine-950">
              Reject Event
            </DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting{' '}
              <span className="font-semibold text-wine-950">
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
              className="rounded-xl bg-red-600 text-sm font-semibold text-white hover:bg-red-700"
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
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-wine-50">
        <ShieldCheck className="h-8 w-8 text-wine-600" />
      </div>
      <h3 className="font-serif text-xl font-semibold text-wine-950">
        No Pending Approvals
      </h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        All caught up! There are no events waiting for review right now.
      </p>
    </div>
  );
}
