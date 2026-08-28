import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader } from '@/components/common/Loader';
import { getMyPartnerProfile } from '@/api/partner.api';
import type { Partner, PartnerType } from '@/types/partner.types';
import type { EventItem, EventStatus } from '@/types/event.types';
import { getMyEvents } from '@/api/event.api';

import {
  Store,
  Film,
  CalendarDays,
  Phone,
  MapPin,
  FileText,
  Percent,
  Clock,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Building2,
  Calendar,
  Plus,
  Ticket,
  ImageOff,
} from 'lucide-react';

const partnerTypeMeta: Record<
  PartnerType,
  { label: string; icon: typeof Store }
> = {
  restaurant: { label: 'Restaurant', icon: Store },
  cinema: { label: 'Cinema', icon: Film },
  event_organiser: { label: 'Event Organizer', icon: CalendarDays },
};

const statusMeta: Record<
  Partner['status'],
  { label: string; className: string; icon: typeof Clock }
> = {
  PENDING_APPROVAL: {
    label: 'Under Review',
    className: 'bg-amber-100 text-amber-700 border-amber-200',
    icon: Clock,
  },
  APPROVED: {
    label: 'Approved',
    className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    icon: CheckCircle2,
  },
  REJECTED: {
    label: 'Rejected',
    className: 'bg-red-100 text-red-700 border-red-200',
    icon: AlertCircle,
  },
  SUSPENDED: {
    label: 'Suspended',
    className: 'bg-red-100 text-red-700 border-red-200',
    icon: AlertCircle,
  },
};

const eventStatusBadge: Record<EventStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-600 border-slate-200',
  PENDING_APPROVAL: 'bg-amber-100 text-amber-700 border-amber-200',
  PUBLISHED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  REJECTED: 'bg-red-100 text-red-700 border-red-200',
  CANCELLED: 'bg-red-100 text-red-700 border-red-200',
};

const eventStatusLabel: Record<EventStatus, string> = {
  DRAFT: 'Draft',
  PENDING_APPROVAL: 'Pending',
  PUBLISHED: 'Published',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
};

export default function PartnerDashboard() {
  const [partner, setPartner] = useState<Partner | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [notApplied, setNotApplied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getMyPartnerProfile();
        if (!cancelled) setPartner(data);
      } catch (err: unknown) {
        const error = err as { response?: { status?: number } };
        if (error?.response?.status === 404) {
          setNotApplied(true);
        } else {
          toast.error('Failed to load your partner profile');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!partner || partner.status !== 'APPROVED') return;
    let cancelled = false;
    (async () => {
      try {
        const res = await getMyEvents();
        const eventList = res.items || [];
        if (!cancelled) setEvents(eventList);
      } catch {
        if (!cancelled) toast.error('Failed to load your events');
      } finally {
        if (!cancelled) setEventsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [partner]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex justify-center py-20">
          <Loader className="h-8 w-8" />
        </div>
      </div>
    );
  }

  // --- Not applied yet ---
  if (notApplied || !partner) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-border/50 bg-card p-8 text-center shadow-soft sm:p-12">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-wine-50">
              <Sparkles className="h-8 w-8 text-wine-600" />
            </div>
            <h1 className="font-serif text-3xl font-semibold text-wine-950">
              Become a Partner
            </h1>
            <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
              You haven't applied to the Vignette partner program yet. Join us
              to list your business and reach thousands of guests.
            </p>
            <Button
              asChild
              className="mt-6 rounded-full bg-wine-700 px-6 text-sm font-semibold shadow-wine transition-all hover:bg-wine-800 hover:shadow-wine-lg"
            >
              <Link to="/partner/become">
                Start Application
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const TypeIcon = partnerTypeMeta[partner.partner_type].icon;
  const status = statusMeta[partner.status];
  const StatusIcon = status.icon;

  // --- Pending ---
  if (partner.status === 'PENDING_APPROVAL') {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center shadow-soft sm:p-12">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100">
              <Clock className="h-8 w-8 text-amber-600" />
            </div>
            <h1 className="font-serif text-3xl font-semibold text-wine-950">
              Application Under Review
            </h1>
            <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
              Thank you for applying, {partner.contact_name}! Our team is
              reviewing your application for{' '}
              <span className="font-semibold text-wine-950">
                {partner.business_name}
              </span>
              . You'll be notified once a decision is made.
            </p>
            <div className="mt-6 flex items-center justify-center gap-2">
              <Badge className={status.className}>{status.label}</Badge>
              <span className="text-sm text-muted-foreground">
                Applied on{' '}
                {new Date(partner.created_at).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Rejected ---
  if (partner.status === 'REJECTED') {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-8 shadow-soft sm:p-12">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="font-serif text-3xl font-semibold text-wine-950">
              Application Rejected
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Unfortunately, your application for{' '}
              <span className="font-semibold text-wine-950">
                {partner.business_name}
              </span>{' '}
              was not approved at this time.
            </p>
            {partner.rejection_reason && (
              <div className="mt-5 rounded-xl border border-red-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-red-600">
                  Reason
                </p>
                <p className="mt-1 text-sm text-foreground/80">
                  {partner.rejection_reason}
                </p>
              </div>
            )}
            <Button
              asChild
              className="mt-6 rounded-full bg-wine-700 px-6 text-sm font-semibold shadow-wine transition-all hover:bg-wine-800 hover:shadow-wine-lg"
            >
              <Link to="/partner/become">
                Re-apply
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // --- Approved / Suspended ---
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Banner */}
      <div className="relative overflow-hidden wine-gradient">
        <div className="absolute inset-0 bg-wine-radial" />
        <div className="absolute -right-20 top-0 h-72 w-72 rounded-full bg-wine-500/20 blur-3xl" />
        <div className="relative mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur">
                <TypeIcon className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="font-serif text-3xl font-semibold text-white sm:text-4xl">
                  {partner.business_name}
                </h1>
                <p className="mt-1 text-sm text-wine-100/70">
                  {partnerTypeMeta[partner.partner_type].label} •{' '}
                  {partner.city}
                </p>
              </div>
            </div>
            <Button
              asChild
              className="rounded-full bg-white px-5 text-sm font-semibold text-wine-700 shadow-wine hover:bg-wine-50"
            >
              <Link to="/partner/events/new">
                <Plus className="h-4 w-4" />
                New Event
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Status badge */}
        <div className="mb-6 flex items-center gap-2">
          <StatusIcon className="h-4 w-4 text-muted-foreground" />
          <Badge className={status.className}>{status.label}</Badge>
          {partner.approved_at && (
            <span className="text-sm text-muted-foreground">
              Approved on{' '}
              {new Date(partner.approved_at).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          )}
        </div>

        {/* Details grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Business Info */}
          <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-soft">
            <h2 className="font-serif text-xl font-semibold text-wine-950">
              Business Details
            </h2>
            <dl className="mt-4 space-y-4">
              <DetailRow
                icon={Building2}
                label="Business Name"
                value={partner.business_name}
              />
              <DetailRow
                icon={TypeIcon}
                label="Type"
                value={partnerTypeMeta[partner.partner_type].label}
              />
              <DetailRow
                icon={MapPin}
                label="City"
                value={partner.city}
              />
              {partner.gst_number && (
                <DetailRow
                  icon={FileText}
                  label="GST Number"
                  value={partner.gst_number}
                />
              )}
              {partner.pan_number && (
                <DetailRow
                  icon={FileText}
                  label="PAN Number"
                  value={partner.pan_number}
                />
              )}
            </dl>
          </div>

          {/* Contact + Commission */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-soft">
              <h2 className="font-serif text-xl font-semibold text-wine-950">
                Contact Information
              </h2>
              <dl className="mt-4 space-y-4">
                <DetailRow
                  icon={Store}
                  label="Contact Person"
                  value={partner.contact_name}
                />
                <DetailRow
                  icon={Phone}
                  label="Phone"
                  value={partner.contact_phone}
                />
              </dl>
            </div>

            <div className="rounded-2xl border border-wine-200 bg-wine-50 p-6 shadow-soft">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-wine-100">
                  <Percent className="h-5 w-5 text-wine-700" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-wine-600">
                    Commission Rate
                  </p>
                  <p className="font-serif text-2xl font-semibold text-wine-950">
                    {partner.commission_rate}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* My Events Table */}
        <div className="mt-6 rounded-2xl border border-border/50 bg-card p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl font-semibold text-wine-950">
              My Events
            </h2>
            <Ticket className="h-5 w-5 text-muted-foreground" />
          </div>

          {eventsLoading ? (
            <div className="flex justify-center py-12">
              <Loader className="h-6 w-6" />
            </div>
          ) : events.length === 0 ? (
            <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 py-12 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-wine-50">
                <Calendar className="h-6 w-6 text-wine-600" />
              </div>
              <p className="font-serif text-lg font-semibold text-wine-950">
                No events yet
              </p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Create your first event to start accepting bookings.
              </p>
              <Button
                asChild
                className="mt-4 rounded-full bg-wine-700 text-sm font-semibold text-white shadow-wine hover:bg-wine-800"
              >
                <Link to="/partner/events/new">
                  <Plus className="h-4 w-4" />
                  Create Event
                </Link>
              </Button>
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50 bg-secondary/30">
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Event
                    </th>
                    <th className="hidden px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:table-cell">
                      Date
                    </th>
                    <th className="hidden px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground md:table-cell">
                      City
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {events.map((event, i) => (
                    <motion.tr
                      key={event.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className="transition-colors hover:bg-secondary/20"
                    >
                      <td className="px-3 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-wine-50">
                            {event.poster_image_url ? (
                              <img
                                src={event.poster_image_url}
                                alt={event.title}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <ImageOff className="h-4 w-4 text-wine-300" />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-wine-950">
                              {event.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {event.venue_name}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden px-3 py-4 sm:table-cell">
                        <span className="text-sm text-foreground/70">
                          {format(parseISO(event.starts_at), 'MMM d, yyyy')}
                        </span>
                      </td>
                      <td className="hidden px-3 py-4 md:table-cell">
                        <span className="text-sm text-foreground/70">
                          {event.city}
                        </span>
                      </td>
                      <td className="px-3 py-4">
                        <div className="flex flex-col gap-1">
                          <Badge
                            className={`border ${eventStatusBadge[event.status]}`}
                          >
                            {eventStatusLabel[event.status]}
                          </Badge>
                          {event.status === 'REJECTED' &&
                            event.rejection_reason && (
                              <p className="max-w-[200px] text-xs text-red-600">
                                {event.rejection_reason}
                              </p>
                            )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Store;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-wine-50">
        <Icon className="h-4 w-4 text-wine-600" />
      </div>
      <div>
        <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </dt>
        <dd className="text-sm font-medium text-wine-950">{value}</dd>
      </div>
    </div>
  );
}
