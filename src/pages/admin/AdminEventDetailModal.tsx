import React, { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { updateAdminEventTerms, getAdminEventById } from '@/api/admin.api';
import { STANDARD_EVENT_TERMS, normalizeTermsToBullets } from '@/lib/eventTerms';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { EventItem } from '@/types/event.types';
import {
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

interface AdminEventDetailModalProps {
  event: EventItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove?: (event: EventItem) => Promise<void> | void;
  onReject?: (event: EventItem) => void;
  onToggleDelist?: (event: EventItem) => Promise<void> | void;
  isActionLoading?: boolean;
}

export function AdminEventDetailModal({
  event,
  open,
  onOpenChange,
  onApprove,
  onReject,
  onToggleDelist,
  isActionLoading = false,
}: AdminEventDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'tickets' | 'location' | 'content' | 'gallery' | 'faq'>('tickets');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const [localEvent, setLocalEvent] = useState<EventItem | null>(event);
  const [isEditingTerms, setIsEditingTerms] = useState(false);
  const [bulletTerms, setBulletTerms] = useState<string[]>([]);
  const [newBulletInput, setNewBulletInput] = useState('');
  const [isSavingTerms, setIsSavingTerms] = useState(false);

  useEffect(() => {
    setLocalEvent(event);
    if (event) {
      setBulletTerms(normalizeTermsToBullets(event.terms_and_conditions));
      setIsEditingTerms(false);
      setNewBulletInput('');

      // Hydrate full event payload asynchronously to ensure fresh terms and nested arrays
      getAdminEventById(event.id)
        .then((fresh) => {
          if (fresh && fresh.id === event.id) {
            setLocalEvent(fresh);
            if (fresh.terms_and_conditions && fresh.terms_and_conditions.length > 0) {
              setBulletTerms(normalizeTermsToBullets(fresh.terms_and_conditions));
            }
          }
        })
        .catch(() => {
          // Ignore background hydration failures; local event is already set
        });
    }
  }, [event]);

  if (!event) return null;
  const currentEvent = localEvent || event;

  const isPending = currentEvent.status === 'PENDING_APPROVAL';
  const isPublished = currentEvent.status === 'PUBLISHED';
  const isRejected = currentEvent.status === 'REJECTED';

  const ticketCategories = currentEvent.ticket_categories || [];
  const totalCapacity = ticketCategories.reduce((sum, cat) => sum + (cat.capacity || 0), 0);
  const minPrice = ticketCategories.length > 0
    ? Math.min(...ticketCategories.map((c) => c.price_paise / 100))
    : currentEvent.min_price_paise ? currentEvent.min_price_paise / 100 : 0;
  const maxPrice = ticketCategories.length > 0
    ? Math.max(...ticketCategories.map((c) => c.price_paise / 100))
    : minPrice;
  const potentialGross = ticketCategories.reduce(
    (sum, cat) => sum + ((cat.price_paise / 100) * (cat.capacity || 0)),
    0
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 sm:p-8">
          <DialogHeader className="border-b border-gray-100 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
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
                <DialogTitle className="font-serif text-2xl font-bold text-gray-900 leading-snug">
                  {event.title}
                </DialogTitle>
                <DialogDescription className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                  <span>ID: <code className="font-mono text-gray-700">{event.id}</code></span>
                  {event.created_at && (
                    <span>• Created {format(parseISO(event.created_at), 'dd MMM yyyy, hh:mm a')}</span>
                  )}
                </DialogDescription>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="rounded-xl text-xs gap-1.5 border-gray-200"
                >
                  <Link to={`/admin/events/${event.id}`}>
                    <Maximize2 className="w-3.5 h-3.5" />
                    Full Page
                  </Link>
                </Button>
                {isPublished && (
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="rounded-xl text-xs gap-1.5 text-orange-700 hover:text-orange-800 hover:bg-orange-50"
                  >
                    <a
                      href={`/events/${event.slug || event.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Public View
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

          {/* Hero Banner Strip */}
          <div className="mt-4 flex flex-col md:flex-row gap-5 bg-gradient-to-br from-slate-50 to-gray-100/70 p-4 sm:p-5 rounded-2xl border border-gray-200/80">
            {event.poster_image_url ? (
              <img
                src={event.poster_image_url}
                alt={event.title}
                className="w-full md:w-36 h-48 md:h-52 object-cover rounded-xl shadow-md border border-gray-200 shrink-0 cursor-pointer hover:opacity-95 transition"
                onClick={() => setPreviewImage(event.poster_image_url)}
                title="Click to enlarge poster"
              />
            ) : (
              <div className="w-full md:w-36 h-48 md:h-52 rounded-xl bg-gray-200 flex flex-col items-center justify-center text-gray-400 shrink-0 border border-gray-300">
                <ImageIcon className="w-8 h-8 mb-1" />
                <span className="text-xs">No Poster</span>
              </div>
            )}

            <div className="flex-1 space-y-3 min-w-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Date & Time */}
                <div className="bg-white p-3 rounded-xl border border-gray-200/80 shadow-2xs">
                  <span className="text-gray-400 block font-medium mb-1 flex items-center gap-1">
                    <CalendarDays className="w-3.5 h-3.5 text-orange-600" />
                    Schedule
                  </span>
                  <p className="font-semibold text-gray-900">
                    {event.starts_at ? format(parseISO(event.starts_at), 'EEEE, dd MMMM yyyy') : 'TBD'}
                  </p>
                  <p className="text-gray-500 font-mono text-[11px] mt-0.5">
                    {event.starts_at ? format(parseISO(event.starts_at), 'hh:mm a') : ''}
                    {event.ends_at ? ` - ${format(parseISO(event.ends_at), 'hh:mm a')}` : ''}
                  </p>
                </div>

                {/* Location */}
                <div className="bg-white p-3 rounded-xl border border-gray-200/80 shadow-2xs">
                  <span className="text-gray-400 block font-medium mb-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-rose-600" />
                    Venue & City
                  </span>
                  <p className="font-semibold text-gray-900 truncate" title={event.venue_name}>
                    {event.venue_name}
                  </p>
                  <p className="text-gray-500 text-[11px] truncate" title={event.city}>
                    {event.city}
                  </p>
                </div>
              </div>

              {/* Badges / Highlights */}
              <div className="flex items-center gap-2 flex-wrap">
                {event.is_outdoor && (
                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-medium border border-emerald-200">
                    Outdoor Event
                  </span>
                )}
                {event.is_kids_allowed && (
                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-medium border border-blue-200">
                    Kids Allowed
                  </span>
                )}
                {event.is_must_attend && (
                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-medium border border-purple-200">
                    Must Attend
                  </span>
                )}
                {event.is_fast_filling && (
                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-medium border border-amber-200">
                    Fast Filling
                  </span>
                )}
                {event.tags && event.tags.map((tag) => (
                  <span key={tag} className="text-[11px] px-2 py-0.5 rounded-md bg-gray-100 text-gray-600">
                    #{tag}
                  </span>
                ))}
              </div>

              {event.rejection_reason && (
                <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-3 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold text-rose-900 block">Rejection Reason</span>
                    <p className="text-xs text-rose-800 mt-0.5">{event.rejection_reason}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-gray-200 mt-6 gap-2 sm:gap-4 overflow-x-auto">
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
              Location & Map
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
            <div className="py-4 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                  <span className="text-gray-400 text-xs block font-medium">Total Capacity</span>
                  <span className="font-bold text-gray-900 text-lg">{totalCapacity.toLocaleString()} seats</span>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                  <span className="text-gray-400 text-xs block font-medium">Price Range</span>
                  <span className="font-bold text-gray-900 text-lg">
                    ₹{minPrice} {maxPrice > minPrice ? `– ₹${maxPrice}` : ''}
                  </span>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                  <span className="text-gray-400 text-xs block font-medium">Categories</span>
                  <span className="font-bold text-gray-900 text-lg">{ticketCategories.length} Tiers</span>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                  <span className="text-gray-400 text-xs block font-medium">Potential Gross</span>
                  <span className="font-bold text-emerald-700 text-lg">₹{potentialGross.toLocaleString()}</span>
                </div>
              </div>

              {ticketCategories.length === 0 ? (
                <div className="p-8 text-center text-gray-400 bg-gray-50 rounded-xl border border-gray-200">
                  <Ticket className="w-8 h-8 mx-auto text-gray-300 mb-1" />
                  <p className="text-sm">No ticket tiers defined for this event.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 text-gray-500 uppercase font-semibold border-b border-gray-200">
                      <tr>
                        <th className="py-3 px-4">Tier / Category Name</th>
                        <th className="py-3 px-4">Price</th>
                        <th className="py-3 px-4">Capacity</th>
                        <th className="py-3 px-4">Max / Booking</th>
                        <th className="py-3 px-4 text-right">Potential Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {ticketCategories.map((cat, idx) => {
                        const price = cat.price_paise / 100;
                        const subtotal = price * cat.capacity;
                        return (
                          <tr key={idx} className="hover:bg-gray-50 transition">
                            <td className="py-3 px-4 font-semibold text-gray-900">
                              {cat.name}
                            </td>
                            <td className="py-3 px-4 font-mono font-bold text-gray-800">
                              ₹{price}
                            </td>
                            <td className="py-3 px-4 text-gray-600">
                              {cat.capacity.toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-gray-600">
                              {cat.max_per_booking || 6}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
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

          {/* TAB 2: Location & Map */}
          {activeTab === 'location' && (
            <div className="py-4 space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-gray-200 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-gray-400 font-medium block">Venue Name</span>
                    <span className="text-sm font-bold text-gray-900">{event.venue_name}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 font-medium block">City / Town</span>
                    <span className="text-sm font-bold text-gray-900">{event.city}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-gray-400 font-medium block">Full Address</span>
                    <span className="text-xs text-gray-800">{event.venue_address || 'Address not explicitly specified'}</span>
                  </div>
                  {event.latitude && event.longitude && (
                    <div className="sm:col-span-2 flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200">
                      <div className="text-xs font-mono text-gray-700">
                        GPS Coordinates: {event.latitude}, {event.longitude}
                      </div>
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="text-xs rounded-lg gap-1 border-gray-300"
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
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <span className="text-xs font-bold text-gray-900 block mb-2">Venue Seating Layout Map</span>
                  <img
                    src={event.layout_image_url}
                    alt="Seating Layout"
                    className="max-h-[350px] w-auto mx-auto rounded-lg object-contain cursor-pointer hover:opacity-95"
                    onClick={() => setPreviewImage(event.layout_image_url || null)}
                  />
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Description & Highlights */}
          {activeTab === 'content' && (
            <div className="py-4 space-y-4 text-xs">
              <div className="bg-white p-4 rounded-xl border border-gray-200">
                <span className="text-gray-400 font-medium block mb-1">Event Description & Synopsis</span>
                <p className="text-gray-800 leading-relaxed whitespace-pre-line">
                  {event.description || 'No description provided.'}
                </p>
              </div>

              {event.what_included && (
                <div className="bg-white p-4 rounded-xl border border-gray-200">
                  <span className="text-gray-400 font-medium block mb-1">What's Included</span>
                  <p className="text-gray-800 leading-relaxed">{event.what_included}</p>
                </div>
              )}

              {event.artists && event.artists.length > 0 && (
                <div className="bg-white p-4 rounded-xl border border-gray-200">
                  <span className="text-gray-400 font-medium block mb-3">Artists & Performers Lineup</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {event.artists.map((artist, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 border border-gray-100">
                        {artist.image_url ? (
                          <img
                            src={artist.image_url}
                            alt={artist.name}
                            className="w-10 h-10 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-700 font-bold flex items-center justify-center shrink-0">
                            {artist.name?.charAt(0) || 'A'}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{artist.name}</p>
                          {artist.role && <p className="text-[10px] text-gray-500 truncate">{artist.role}</p>}
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
            <div className="py-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {event.gallery_images.map((img, idx) => (
                <div
                  key={idx}
                  className="group relative aspect-video overflow-hidden rounded-xl border border-gray-200 bg-gray-100 cursor-pointer"
                  onClick={() => setPreviewImage(img)}
                >
                  <img
                    src={img}
                    alt={`Gallery ${idx + 1}`}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                    <Maximize2 className="w-5 h-5 text-white" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 5: FAQs & Terms */}
          {activeTab === 'faq' && (
            <div className="py-4 space-y-5 text-xs">
              {/* Bullet-wise Terms & Conditions Section */}
              <div className="space-y-3 bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center font-bold shrink-0">
                      <ListOrdered className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h5 className="font-bold text-gray-900 text-sm">Terms & Conditions</h5>
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
                            setBulletTerms(normalizeTermsToBullets(currentEvent?.terms_and_conditions));
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
                            if (!currentEvent?.id) return;
                            try {
                              setIsSavingTerms(true);
                              await updateAdminEventTerms(currentEvent.id, bulletTerms);
                              setLocalEvent(prev => prev ? { ...prev, terms_and_conditions: bulletTerms } : null);
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
              {currentEvent.faqs && currentEvent.faqs.length > 0 && (
                <div className="space-y-2 bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
                  <h5 className="font-bold text-gray-900 text-sm mb-3">Frequently Asked Questions</h5>
                  {currentEvent.faqs.map((faq, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                      <p className="font-semibold text-gray-900">Q: {faq.question}</p>
                      <p className="text-gray-600 mt-1">A: {faq.answer}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Moderation Action Buttons Footer */}
          <div className="border-t border-gray-100 pt-4 mt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {isPending && onApprove && onReject && (
                <>
                  <Button
                    onClick={() => onApprove(event)}
                    disabled={isActionLoading}
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 gap-1 shadow-2xs"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>Approve Event</span>
                  </Button>
                  <Button
                    onClick={() => onReject(event)}
                    disabled={isActionLoading}
                    size="sm"
                    variant="outline"
                    className="border-rose-200 text-rose-700 hover:bg-rose-50 font-semibold text-xs h-9 gap-1 shadow-2xs"
                  >
                    <X className="h-3.5 w-3.5" />
                    <span>Reject</span>
                  </Button>
                </>
              )}

              {isPublished && onToggleDelist && (
                <Button
                  onClick={() => onToggleDelist(event)}
                  disabled={isActionLoading}
                  size="sm"
                  variant="outline"
                  className="border-amber-200 text-amber-700 hover:bg-amber-50 font-semibold text-xs h-9 gap-1.5 shadow-2xs"
                >
                  <EyeOff className="h-3.5 w-3.5" />
                  <span>Delist / Hide Event</span>
                </Button>
              )}

              {!isPublished && !isPending && onApprove && (
                <Button
                  onClick={() => onApprove(event)}
                  disabled={isActionLoading}
                  size="sm"
                  className="bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs h-9 gap-1 shadow-2xs"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>Publish Event</span>
                </Button>
              )}
            </div>

            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="text-xs rounded-xl"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lightbox Image Preview Modal */}
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
    </>
  );
}

