import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getAdminEventById, updateAdminEventStatus, updateAdminEventTerms } from '@/api/admin.api';
import { STANDARD_EVENT_TERMS, normalizeTermsToBullets } from '@/lib/eventTerms';
import type { EventItem } from '@/types/event.types';
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  MapPin,
  Ticket,
  Users,
  Check,
  X,
  Eye,
  EyeOff,
  ExternalLink,
  Navigation,
  Sparkles,
  Info,
  HelpCircle,
  FileText,
  Image as ImageIcon,
  DollarSign,
  Maximize2,
  AlertTriangle,
  Loader2,
  CalendarClock,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Copy,
  Edit3,
  Save,
  RotateCcw,
  ListOrdered,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function AdminEventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'tickets' | 'location' | 'content' | 'gallery' | 'faq'>('tickets');
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const [isEditingTerms, setIsEditingTerms] = useState(false);
  const [bulletTerms, setBulletTerms] = useState<string[]>([]);
  const [newBulletInput, setNewBulletInput] = useState('');
  const [isSavingTerms, setIsSavingTerms] = useState(false);

  useEffect(() => {
    if (event) {
      setBulletTerms(normalizeTermsToBullets(event.terms_and_conditions));
      setIsEditingTerms(false);
      setNewBulletInput('');
    }
  }, [event]);

  useEffect(() => {
    async function loadEvent() {
      if (!eventId) return;
      setLoading(true);
      try {
        const data = await getAdminEventById(eventId);
        setEvent(data);
      } catch (err: any) {
        toast.error('Failed to load event details', {
          description: err?.message || 'Event not found or network error.',
        });
      } finally {
        setLoading(false);
      }
    }
    loadEvent();
  }, [eventId]);

  const handleApprove = async () => {
    if (!event) return;
    setActionLoading(true);
    try {
      await updateAdminEventStatus(event.id, 'PUBLISHED');
      toast.success('Event approved and published successfully!');
      setEvent({ ...event, status: 'PUBLISHED', rejection_reason: undefined });
    } catch (err: any) {
      toast.error('Failed to approve event');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!event) return;
    if (!rejectionReason.trim()) {
      toast.error('Please enter a rejection reason');
      return;
    }
    setActionLoading(true);
    try {
      await updateAdminEventStatus(event.id, 'REJECTED', rejectionReason.trim());
      toast.success('Event rejected');
      setEvent({ ...event, status: 'REJECTED', rejection_reason: rejectionReason.trim() });
      setRejectModalOpen(false);
    } catch (err: any) {
      toast.error('Failed to reject event');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleDelist = async () => {
    if (!event) return;
    const newStatus = event.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    setActionLoading(true);
    try {
      await updateAdminEventStatus(event.id, newStatus);
      toast.success(`Event ${newStatus === 'PUBLISHED' ? 'published' : 'hidden/delisted'}`);
      setEvent({ ...event, status: newStatus as any });
    } catch (err: any) {
      toast.error('Failed to update event status');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header hideLocation />
        <div className="pt-32 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
          <p className="text-sm text-gray-500">Loading event details...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header hideLocation />
        <div className="pt-32 max-w-xl mx-auto text-center px-4">
          <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h2 className="text-2xl font-bold font-serif text-gray-900">Event Not Found</h2>
          <p className="text-sm text-gray-500 mt-1 mb-6">
            The event with ID {eventId} could not be retrieved.
          </p>
          <Button asChild className="rounded-xl bg-orange-600 text-white">
            <Link to="/admin?tab=events">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Back to Events
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const isPending = event.status === 'PENDING_APPROVAL';
  const isPublished = event.status === 'PUBLISHED';
  const isRejected = event.status === 'REJECTED';

  const ticketCategories = event.ticket_categories || [];
  const totalCapacity = ticketCategories.reduce((sum, cat) => sum + (cat.capacity || 0), 0);
  const minPrice = ticketCategories.length > 0
    ? Math.min(...ticketCategories.map((c) => c.price_paise / 100))
    : event.min_price_paise ? event.min_price_paise / 100 : 0;
  const maxPrice = ticketCategories.length > 0
    ? Math.max(...ticketCategories.map((c) => c.price_paise / 100))
    : minPrice;
  const potentialGross = ticketCategories.reduce(
    (sum, cat) => sum + ((cat.price_paise / 100) * (cat.capacity || 0)),
    0
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <Header hideLocation />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-28">
        {/* Navigation Breadcrumb / Top Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="rounded-xl border-gray-200 text-xs font-semibold"
            >
              <Link to="/admin?tab=events">
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Back to Events
              </Link>
            </Button>
            <span className="text-xs text-gray-400">/</span>
            <span className="text-xs font-medium text-gray-500 truncate max-w-xs">
              {event.title}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isPending && (
              <>
                <Button
                  onClick={handleApprove}
                  disabled={actionLoading}
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl gap-1 shadow-2xs"
                >
                  {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Approve Event
                </Button>
                <Button
                  onClick={() => setRejectModalOpen(true)}
                  disabled={actionLoading}
                  size="sm"
                  variant="outline"
                  className="border-rose-200 text-rose-700 hover:bg-rose-50 font-semibold text-xs rounded-xl gap-1 shadow-2xs"
                >
                  <X className="w-3.5 h-3.5" />
                  Reject
                </Button>
              </>
            )}

            {isPublished && (
              <>
                <Button
                  onClick={handleToggleDelist}
                  disabled={actionLoading}
                  size="sm"
                  variant="outline"
                  className="border-amber-200 text-amber-700 hover:bg-amber-50 font-semibold text-xs rounded-xl gap-1.5 shadow-2xs"
                >
                  <EyeOff className="w-3.5 h-3.5" />
                  Delist / Hide
                </Button>
                <Button
                  asChild
                  size="sm"
                  className="bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs rounded-xl gap-1.5 shadow-2xs"
                >
                  <a
                    href={`/events/${event.slug || event.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    View Live Page
                  </a>
                </Button>
              </>
            )}

            {!isPublished && !isPending && (
              <Button
                onClick={handleApprove}
                disabled={actionLoading}
                size="sm"
                className="bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs rounded-xl gap-1 shadow-2xs"
              >
                <Eye className="w-3.5 h-3.5" />
                Publish Event
              </Button>
            )}
          </div>
        </div>

        {/* Hero Card */}
        <div className="mt-6 bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row gap-6">
            {event.poster_image_url ? (
              <img
                src={event.poster_image_url}
                alt={event.title}
                className="w-full md:w-44 h-60 md:h-64 object-cover rounded-2xl shadow-md border border-gray-200 shrink-0 cursor-pointer hover:opacity-95 transition"
                onClick={() => setPreviewImage(event.poster_image_url)}
                title="Click to zoom poster"
              />
            ) : (
              <div className="w-full md:w-44 h-60 md:h-64 rounded-2xl bg-gray-100 flex flex-col items-center justify-center text-gray-400 shrink-0 border border-gray-200">
                <ImageIcon className="w-10 h-10 mb-2" />
                <span className="text-xs">No Poster</span>
              </div>
            )}

            <div className="flex-1 space-y-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <Badge
                    className={
                      isPublished
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : isPending
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : isRejected
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-gray-100 text-gray-700 border-gray-200'
                    }
                  >
                    {event.status}
                  </Badge>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 font-bold uppercase tracking-wider border border-orange-200/60">
                    {event.category}
                  </span>
                  {event.language && (
                    <span className="text-xs px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 font-medium">
                      {event.language}
                    </span>
                  )}
                </div>
                <h1 className="font-serif text-3xl font-bold text-gray-900 leading-tight">
                  {event.title}
                </h1>
                <p className="text-xs text-gray-500 mt-1 font-mono">
                  Event ID: {event.id}
                </p>
              </div>

              {/* KPI Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-50 p-3 rounded-2xl border border-gray-200">
                  <span className="text-gray-400 text-xs block font-medium flex items-center gap-1 mb-0.5">
                    <CalendarDays className="w-3.5 h-3.5 text-orange-600" />
                    Date & Schedule
                  </span>
                  <p className="font-semibold text-gray-900 text-xs">
                    {event.starts_at ? format(parseISO(event.starts_at), 'dd MMM yyyy') : 'TBD'}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    {event.starts_at ? format(parseISO(event.starts_at), 'hh:mm a') : ''}
                    {event.ends_at ? ` – ${format(parseISO(event.ends_at), 'hh:mm a')}` : ''}
                  </p>
                </div>

                <div className="bg-slate-50 p-3 rounded-2xl border border-gray-200">
                  <span className="text-gray-400 text-xs block font-medium flex items-center gap-1 mb-0.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-600" />
                    Venue & City
                  </span>
                  <p className="font-semibold text-gray-900 text-xs truncate" title={event.venue_name}>
                    {event.venue_name}
                  </p>
                  <p className="text-[11px] text-gray-500 truncate" title={event.city}>
                    {event.city}
                  </p>
                </div>

                <div className="bg-slate-50 p-3 rounded-2xl border border-gray-200">
                  <span className="text-gray-400 text-xs block font-medium flex items-center gap-1 mb-0.5">
                    <Ticket className="w-3.5 h-3.5 text-emerald-600" />
                    Capacity & Price
                  </span>
                  <p className="font-semibold text-gray-900 text-xs">
                    {totalCapacity.toLocaleString()} seats
                  </p>
                  <p className="text-[11px] text-emerald-700 font-bold">
                    ₹{minPrice} {maxPrice > minPrice ? `– ₹${maxPrice}` : ''}
                  </p>
                </div>
              </div>

              {event.rejection_reason && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-3 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold text-rose-900 block">Rejection Reason</span>
                    <p className="text-xs text-rose-800 mt-0.5">{event.rejection_reason}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200 gap-4 overflow-x-auto pt-2">
            <button
              onClick={() => setActiveTab('tickets')}
              className={`pb-3 text-xs sm:text-sm font-semibold border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'tickets'
                  ? 'border-orange-600 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              <Ticket className="w-4 h-4" />
              Ticket Tiers & Pricing ({ticketCategories.length})
            </button>
            <button
              onClick={() => setActiveTab('location')}
              className={`pb-3 text-xs sm:text-sm font-semibold border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'location'
                  ? 'border-orange-600 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              <MapPin className="w-4 h-4" />
              Location & Venue Details
            </button>
            <button
              onClick={() => setActiveTab('content')}
              className={`pb-3 text-xs sm:text-sm font-semibold border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'content'
                  ? 'border-orange-600 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              <FileText className="w-4 h-4" />
              Description & Highlights
            </button>
            {event.gallery_images && event.gallery_images.length > 0 && (
              <button
                onClick={() => setActiveTab('gallery')}
                className={`pb-3 text-xs sm:text-sm font-semibold border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === 'gallery'
                    ? 'border-orange-600 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                Gallery ({event.gallery_images.length})
              </button>
            )}
            <button
              onClick={() => setActiveTab('faq')}
              className={`pb-3 text-xs sm:text-sm font-semibold border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'faq'
                  ? 'border-orange-600 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              FAQs & Terms ({bulletTerms.length} Points)
            </button>
          </div>

          {/* TAB 1: Ticket Categories */}
          {activeTab === 'tickets' && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-gray-50 p-3 rounded-2xl border border-gray-200">
                  <span className="text-gray-400 block font-medium">Total Capacity</span>
                  <span className="font-bold text-gray-900 text-base">{totalCapacity.toLocaleString()} seats</span>
                </div>
                <div className="bg-gray-50 p-3 rounded-2xl border border-gray-200">
                  <span className="text-gray-400 block font-medium">Price Range</span>
                  <span className="font-bold text-gray-900 text-base">
                    ₹{minPrice} {maxPrice > minPrice ? `– ₹${maxPrice}` : ''}
                  </span>
                </div>
                <div className="bg-gray-50 p-3 rounded-2xl border border-gray-200">
                  <span className="text-gray-400 block font-medium">Ticket Tiers</span>
                  <span className="font-bold text-gray-900 text-base">{ticketCategories.length} Categories</span>
                </div>
                <div className="bg-gray-50 p-3 rounded-2xl border border-gray-200">
                  <span className="text-gray-400 block font-medium">Potential Gross</span>
                  <span className="font-bold text-emerald-700 text-base">₹{potentialGross.toLocaleString()}</span>
                </div>
              </div>

              {ticketCategories.length === 0 ? (
                <div className="p-8 text-center text-gray-400 bg-gray-50 rounded-2xl border border-gray-200">
                  <Ticket className="w-8 h-8 mx-auto text-gray-300 mb-1" />
                  <p className="text-sm">No ticket tiers defined for this event.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-gray-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 text-gray-500 uppercase font-semibold border-b border-gray-200">
                      <tr>
                        <th className="py-3.5 px-4">Tier / Category Name</th>
                        <th className="py-3.5 px-4">Price</th>
                        <th className="py-3.5 px-4">Capacity</th>
                        <th className="py-3.5 px-4">Max / Booking</th>
                        <th className="py-3.5 px-4 text-right">Potential Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {ticketCategories.map((cat, idx) => {
                        const price = cat.price_paise / 100;
                        const subtotal = price * cat.capacity;
                        return (
                          <tr key={idx} className="hover:bg-gray-50 transition">
                            <td className="py-3.5 px-4 font-semibold text-gray-900">
                              {cat.name}
                            </td>
                            <td className="py-3.5 px-4 font-mono font-bold text-gray-800">
                              ₹{price}
                            </td>
                            <td className="py-3.5 px-4 text-gray-600">
                              {cat.capacity.toLocaleString()}
                            </td>
                            <td className="py-3.5 px-4 text-gray-600">
                              {cat.max_per_booking || 6}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700">
                              ₹{subtotal.toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Location */}
          {activeTab === 'location' && (
            <div className="space-y-4 pt-2">
              <div className="bg-slate-50 p-5 rounded-2xl border border-gray-200 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-gray-400 font-medium block">Venue Name</span>
                    <span className="text-base font-bold text-gray-900">{event.venue_name}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 font-medium block">City / Town</span>
                    <span className="text-base font-bold text-gray-900">{event.city}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-gray-400 font-medium block">Full Address</span>
                    <span className="text-xs text-gray-800">{event.venue_address || 'Address not explicitly specified'}</span>
                  </div>
                  {event.latitude && event.longitude && (
                    <div className="sm:col-span-2 flex items-center justify-between bg-white p-3 rounded-xl border border-gray-200">
                      <div className="text-xs font-mono text-gray-700">
                        GPS Coordinates: {event.latitude}, {event.longitude}
                      </div>
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="text-xs rounded-xl gap-1 border-gray-300"
                      >
                        <a
                          href={`https://www.google.com/maps?q=${event.latitude},${event.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Navigation className="w-3.5 h-3.5 text-blue-600" />
                          View on Google Maps
                        </a>
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {event.layout_image_url && (
                <div className="rounded-2xl border border-gray-200 bg-white p-5">
                  <span className="text-xs font-bold text-gray-900 block mb-2">Venue Seating Layout Map</span>
                  <img
                    src={event.layout_image_url}
                    alt="Seating Layout"
                    className="max-h-[400px] w-auto mx-auto rounded-xl object-contain cursor-pointer hover:opacity-95"
                    onClick={() => setPreviewImage(event.layout_image_url || null)}
                  />
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Content */}
          {activeTab === 'content' && (
            <div className="space-y-4 pt-2 text-xs">
              <div className="bg-white p-5 rounded-2xl border border-gray-200">
                <span className="text-gray-400 font-medium block mb-2 text-xs">Event Description & Synopsis</span>
                <p className="text-gray-800 leading-relaxed whitespace-pre-line text-sm">
                  {event.description || 'No description provided.'}
                </p>
              </div>

              {event.what_included && (
                <div className="bg-white p-5 rounded-2xl border border-gray-200">
                  <span className="text-gray-400 font-medium block mb-2 text-xs">What's Included</span>
                  <p className="text-gray-800 leading-relaxed text-sm">{event.what_included}</p>
                </div>
              )}

              {event.artists && event.artists.length > 0 && (
                <div className="bg-white p-5 rounded-2xl border border-gray-200">
                  <span className="text-gray-400 font-medium block mb-3 text-xs">Artists & Performers Lineup</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {event.artists.map((artist, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                        {artist.image_url ? (
                          <img
                            src={artist.image_url}
                            alt={artist.name}
                            className="w-11 h-11 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-orange-100 text-orange-700 font-bold flex items-center justify-center shrink-0">
                            {artist.name?.charAt(0) || 'A'}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{artist.name}</p>
                          {artist.role && <p className="text-[11px] text-gray-500 truncate">{artist.role}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Gallery */}
          {activeTab === 'gallery' && event.gallery_images && (
            <div className="pt-2 grid grid-cols-2 sm:grid-cols-3 gap-4">
              {event.gallery_images.map((img, idx) => (
                <div
                  key={idx}
                  className="group relative aspect-video overflow-hidden rounded-2xl border border-gray-200 bg-gray-100 cursor-pointer"
                  onClick={() => setPreviewImage(img)}
                >
                  <img
                    src={img}
                    alt={`Gallery ${idx + 1}`}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                    <Maximize2 className="w-6 h-6 text-white" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 5: FAQs & Terms */}
          {activeTab === 'faq' && (
            <div className="space-y-6 pt-2 text-xs">
              {/* Bullet-wise Terms & Conditions Section */}
              <div className="space-y-3 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center font-bold shrink-0">
                      <ListOrdered className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-gray-900 text-sm">Terms & Conditions</h4>
                        <Badge className="bg-orange-50 text-orange-700 border-orange-200/80 font-mono text-[10px] px-2 py-0.5">
                          {bulletTerms.length} Points
                        </Badge>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        Bullet-wise guidelines and entry regulations for event attendees
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-auto flex-wrap">
                    {bulletTerms.length > 0 && !isEditingTerms && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const text = bulletTerms.map((t, i) => `${i + 1}. ${t}`).join('\n');
                          navigator.clipboard.writeText(text);
                          toast.success('Terms & conditions copied to clipboard');
                        }}
                        className="text-[11px] h-7 px-2.5 rounded-lg border-gray-200 text-gray-600 hover:text-gray-900 gap-1"
                      >
                        <Copy className="w-3 h-3" />
                        Copy All
                      </Button>
                    )}

                    {!isEditingTerms ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (bulletTerms.length === 0) {
                            setBulletTerms([...STANDARD_EVENT_TERMS]);
                          }
                          setIsEditingTerms(true);
                        }}
                        className="text-[11px] h-7 px-2.5 rounded-lg border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 gap-1 font-semibold"
                      >
                        <Edit3 className="w-3 h-3" />
                        {bulletTerms.length === 0 ? 'Add Terms' : 'Edit Bullets'}
                      </Button>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setBulletTerms(normalizeTermsToBullets(event?.terms_and_conditions));
                            setIsEditingTerms(false);
                          }}
                          className="text-[11px] h-7 px-2 rounded-lg text-gray-500 hover:text-gray-900"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          disabled={isSavingTerms}
                          onClick={async () => {
                            if (!event?.id) return;
                            try {
                              setIsSavingTerms(true);
                              await updateAdminEventTerms(event.id, bulletTerms);
                              setEvent(prev => prev ? { ...prev, terms_and_conditions: bulletTerms } : null);
                              setIsEditingTerms(false);
                              toast.success('Event terms & conditions saved successfully');
                            } catch (err: any) {
                              toast.error('Failed to update terms', {
                                description: err?.response?.data?.message || err.message,
                              });
                            } finally {
                              setIsSavingTerms(false);
                            }
                          }}
                          className="text-[11px] h-7 px-3 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-semibold gap-1 shadow-xs"
                        >
                          <Save className="w-3 h-3" />
                          {isSavingTerms ? 'Saving...' : 'Save Bullets'}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Edit Mode */}
                {isEditingTerms ? (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-gray-700">
                        Edit or Reorder Bullet Points
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setBulletTerms([...STANDARD_EVENT_TERMS])}
                        className="text-[10px] h-6 px-2 rounded-md border-gray-200 text-gray-600 hover:text-orange-600 gap-1"
                      >
                        <RotateCcw className="w-2.5 h-2.5" />
                        Load Standard Template
                      </Button>
                    </div>

                    <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                      {bulletTerms.map((term, idx) => (
                        <div key={idx} className="flex items-start gap-2 bg-gray-50 p-2 rounded-xl border border-gray-200">
                          <span className="w-6 h-6 rounded-lg bg-orange-100 text-orange-800 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <textarea
                            value={term}
                            rows={2}
                            onChange={(e) => {
                              const updated = [...bulletTerms];
                              updated[idx] = e.target.value;
                              setBulletTerms(updated);
                            }}
                            className="flex-1 bg-white border border-gray-200 rounded-lg p-1.5 text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-orange-500"
                          />
                          <div className="flex flex-col gap-1 shrink-0">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => {
                                if (idx === 0) return;
                                const updated = [...bulletTerms];
                                const temp = updated[idx];
                                updated[idx] = updated[idx - 1];
                                updated[idx - 1] = temp;
                                setBulletTerms(updated);
                              }}
                              className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 text-gray-500"
                              title="Move Up"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === bulletTerms.length - 1}
                              onClick={() => {
                                if (idx === bulletTerms.length - 1) return;
                                const updated = [...bulletTerms];
                                const temp = updated[idx];
                                updated[idx] = updated[idx + 1];
                                updated[idx + 1] = temp;
                                setBulletTerms(updated);
                              }}
                              className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 text-gray-500"
                              title="Move Down"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setBulletTerms(bulletTerms.filter((_, i) => i !== idx));
                              }}
                              className="p-1 rounded hover:bg-rose-100 text-rose-600"
                              title="Delete Bullet"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Add New Point Form */}
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                      <input
                        type="text"
                        value={newBulletInput}
                        onChange={(e) => setNewBulletInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (newBulletInput.trim()) {
                              setBulletTerms([...bulletTerms, newBulletInput.trim()]);
                              setNewBulletInput('');
                            }
                          }
                        }}
                        placeholder="Add a new bullet point and press Enter..."
                        className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                      <Button
                        type="button"
                        size="sm"
                        disabled={!newBulletInput.trim()}
                        onClick={() => {
                          if (newBulletInput.trim()) {
                            setBulletTerms([...bulletTerms, newBulletInput.trim()]);
                            setNewBulletInput('');
                          }
                        }}
                        className="text-xs h-8 px-3 rounded-lg bg-orange-600 hover:bg-orange-700 text-white gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Point
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* View Mode: Bullet-wise cards */
                  <div className="pt-1">
                    {bulletTerms.length === 0 ? (
                      <div className="p-6 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        <ListOrdered className="w-8 h-8 text-gray-400 mx-auto mb-2 opacity-60" />
                        <p className="text-gray-600 font-medium">No terms & conditions specified for this event.</p>
                        <p className="text-gray-400 text-[11px] mt-0.5">Click below to apply the standard 10-point event guidelines.</p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setBulletTerms([...STANDARD_EVENT_TERMS]);
                            setIsEditingTerms(true);
                          }}
                          className="mt-3 text-xs rounded-xl border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 gap-1.5 font-semibold"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Apply Standard Event Terms Template
                        </Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-2">
                        {bulletTerms.map((term, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-2.5 p-2.5 rounded-xl bg-gray-50/80 hover:bg-orange-50/30 transition border border-gray-150 group"
                          >
                            <span className="w-5 h-5 rounded-full bg-orange-100 group-hover:bg-orange-200 text-orange-700 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                              {idx + 1}
                            </span>
                            <span className="text-gray-700 leading-relaxed text-xs">
                              {term}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* FAQs section */}
              {event.faqs && event.faqs.length > 0 && (
                <div className="space-y-3 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
                  <h4 className="font-bold text-gray-900 text-sm">Frequently Asked Questions</h4>
                  {event.faqs.map((faq, idx) => (
                    <div key={idx} className="p-4 bg-gray-50 rounded-2xl border border-gray-200">
                      <p className="font-semibold text-gray-900 text-sm">Q: {faq.question}</p>
                      <p className="text-gray-600 mt-1 text-xs">{faq.answer}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Reject Dialog */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl font-semibold text-gray-900">
              Reject Event Submission
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Please specify the reason for rejecting <strong>{event.title}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 pt-2">
            <Label className="text-xs font-semibold text-gray-700">Rejection Reason *</Label>
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Venue authorization missing, or inaccurate ticketing details..."
              className="min-h-[100px] rounded-xl text-xs"
            />
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setRejectModalOpen(false)}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={handleReject}
              disabled={actionLoading || !rejectionReason.trim()}
              className="rounded-xl bg-rose-600 text-white text-xs hover:bg-rose-700"
            >
              {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Confirm Rejection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lightbox Modal */}
      <Dialog open={!!previewImage} onOpenChange={(op) => !op && setPreviewImage(null)}>
        <DialogContent className="max-w-3xl p-2 bg-black/90 border-0 rounded-2xl flex items-center justify-center">
          {previewImage && (
            <img
              src={previewImage}
              alt="Enlarged Preview"
              className="max-h-[80vh] w-auto max-w-full rounded-lg object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

