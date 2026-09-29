import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { api, unwrap } from '@/api/client';
import {
  Calendar,
  Clock,
  Hourglass,
  Users,
  Languages,
  Tag,
  MapPin,
  Share2,
  ThumbsUp,
  ExternalLink,
  Minus,
  Plus,
  Ticket,
  Loader2,
  HelpCircle,
  FileText,
  UserCheck,
  Layers,
  Phone,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Image as ImageIcon,
} from 'lucide-react';
import { format, parseISO, differenceInHours, differenceInMinutes } from 'date-fns';
import { toast } from 'sonner';
import { LoadingPage } from './LoadingPage';

const categoryLabels: Record<string, string> = {
  concert: 'Music Shows',
  comedy: 'Comedy Shows',
  sports: 'Sports',
  workshop: 'Workshops',
  theatre: 'Performances',
  exhibition: 'Exhibitions',
  other: 'Events',
};

function loadScript(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && (window as any).Razorpay) {
      resolve(true);
      return;
    }
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      existing.addEventListener('load', () => resolve(true));
      existing.addEventListener('error', () => resolve(false));
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function BookingPage() {
  const { type, id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [eventData, setEventData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [interestedCount, setInterestedCount] = useState(16);
  const [isInterested, setIsInterested] = useState(false);

  // Preview & Accordion States
  const [activeImagePreview, setActiveImagePreview] = useState<string | null>(null);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // Booking Modal States
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);
  const [ticketQuantity, setTicketQuantity] = useState(1);
  const [isBooking, setIsBooking] = useState(false);

  useEffect(() => {
    const fetchEventDetails = async () => {
      setLoading(true);
      try {
        if (!type || type?.toLowerCase() === 'event') {
          const res = await unwrap<any>(api.get(`/events/${id}`));
          setEventData(res);
          if (res?.ticket_categories?.length > 0) {
            setSelectedTierId(res.ticket_categories[0].id);
          }
        }
      } catch {
        toast.error('Failed to load event details');
      } finally {
        setLoading(false);
      }
    };

    fetchEventDetails();
  }, [type, id]);

  const isEventEnded = Boolean(
    eventData?.ends_at && new Date(eventData.ends_at) < new Date()
  );

  const selectedTier = eventData?.ticket_categories?.find(
    (t: any) => t.id === selectedTierId
  ) || eventData?.ticket_categories?.[0];

  const maxAllowedTickets = Math.min(
    selectedTier?.max_per_booking || 10,
    selectedTier?.capacity || 10,
    10
  );

  const handleBookNow = () => {
    if (isEventEnded) {
      toast.error('This event has already ended and cannot be booked.');
      return;
    }
    if (!eventData?.ticket_categories || eventData.ticket_categories.length === 0) {
      toast.error('No tickets are currently available for this event.');
      return;
    }
    if (!user) {
      toast.error('Please login to book tickets');
      navigate('/login', { state: { from: `/events/${id}` } });
      return;
    }
    if (!selectedTierId && eventData.ticket_categories.length > 0) {
      setSelectedTierId(eventData.ticket_categories[0].id);
    }
    setTicketQuantity(1);
    setBookingModalOpen(true);
  };

  const handleConfirmBooking = async () => {
    if (!selectedTier) {
      toast.error('Please select a ticket category');
      return;
    }
    if (!user) {
      toast.error('Please login to book tickets');
      navigate('/login', { state: { from: `/events/${id}` } });
      return;
    }

    const totalPaise = (selectedTier.price_paise || 0) * ticketQuantity;
    const idempotencyKey =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `book-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    // For free tickets (0 paise), book directly without launching payment gateway
    if (totalPaise <= 0) {
      try {
        setIsBooking(true);
        const payload = {
          tier_id: selectedTier.id,
          quantity: ticketQuantity,
          idempotency_key: idempotencyKey,
        };
        const res = await unwrap<any>(api.post('/bookings', payload));
        const bookingId = res?.booking?.id || res?.id;
        toast.success('Tickets reserved successfully!');
        setBookingModalOpen(false);
        navigate(`/confirmation?id=${bookingId}&ref=${bookingId}`);
      } catch (err: any) {
        toast.error(err?.message || 'Failed to complete booking. Please try again.');
      } finally {
        setIsBooking(false);
      }
      return;
    }

    // For paid tickets, launch Razorpay Checkout modal
    try {
      setIsBooking(true);
      const isLoaded = await loadScript('https://checkout.razorpay.com/v1/checkout.js');
      if (!isLoaded) {
        toast.error('Failed to load payment gateway. Please check your internet connection.');
        setIsBooking(false);
        return;
      }

      const rzpKey =
        import.meta.env.VITE_RAZORPAY_KEY_ID ||
        import.meta.env.VITE_RAZORPAY_KEY ||
        'rzp_test_Td8PA3wLtNQ2m3';

      const posterUrl =
        typeof eventData?.poster_image_url === 'string' &&
        eventData.poster_image_url.startsWith('http')
          ? eventData.poster_image_url
          : undefined;

      const options: any = {
        key: rzpKey,
        amount: totalPaise,
        currency: 'INR',
        name: 'Vyhbz Events',
        description: `${eventData?.title || 'Event'} - ${selectedTier.name} (x${ticketQuantity})`,
        ...(posterUrl ? { image: posterUrl } : {}),
        handler: async function (response: any) {
          toast.info('Payment received! Confirming your tickets...');
          try {
            const payload = {
              tier_id: selectedTier.id,
              quantity: ticketQuantity,
              payment_id: response.razorpay_payment_id,
              idempotency_key: idempotencyKey,
            };
            const res = await unwrap<any>(api.post('/bookings', payload));
            const bookingId = res?.booking?.id || res?.id;
            toast.success('Tickets booked successfully!');
            setBookingModalOpen(false);
            navigate(`/confirmation?id=${bookingId}&ref=${bookingId}`);
          } catch (err: any) {
            toast.error(err?.message || 'Payment received, but confirmation failed. Please contact support.');
          } finally {
            setIsBooking(false);
          }
        },
        prefill: {
          name: user?.full_name || (user as any)?.name || 'Attendee',
          email: user?.email || 'attendee@vybhz.com',
          contact: (user as any)?.phone || '9999999999',
        },
        theme: {
          color: '#7B1E3D',
        },
        modal: {
          ondismiss: function () {
            toast.warning('Payment cancelled. Your tickets have not been booked.');
            setIsBooking(false);
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (resp: any) {
        toast.error(resp?.error?.description || 'Payment failed. Please try again.');
        setIsBooking(false);
      });
      rzp.open();
    } catch (err: any) {
      console.error('Failed to initiate Razorpay checkout:', err);
      toast.error(err?.message || 'Failed to initiate payment.');
      setIsBooking(false);
    }
  };

  const handleInterested = () => {
    setIsInterested(!isInterested);
    setInterestedCount((prev) => (isInterested ? prev - 1 : prev + 1));
  };

  // Calculate duration dynamically
  const getDuration = () => {
    if (!eventData?.starts_at || !eventData?.ends_at) return null;
    const start = parseISO(eventData.starts_at);
    const end = parseISO(eventData.ends_at);
    const hours = differenceInHours(end, start);
    const minutes = differenceInMinutes(end, start) % 60;

    if (hours > 0 && minutes > 0) return `${hours} Hours ${minutes} Mins`;
    if (hours > 0) return `${hours} Hours`;
    if (minutes > 0) return `${minutes} Mins`;
    return null;
  };

  if (loading) {
    return <LoadingPage showFooter={true} />;
  }

  if (!eventData) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="flex items-center justify-center py-20">
          <p className="text-gray-500">Event not found</p>
        </div>
        <Footer />
      </div>
    );
  }

  const eventDate = parseISO(eventData.starts_at);
  const minPrice = eventData.ticket_categories?.length
    ? Math.min(...eventData.ticket_categories.map((t: any) => t.price_paise))
    : 0;

  const duration = getDuration();
  const categoryLabel = categoryLabels[eventData.category] || 'Event';

  return (
    <div className="min-h-screen bg-white font-sans">
      <Header />

      {/* pt-32 to clear fixed header */}
      <main className="mx-auto max-w-[1240px] px-4 pt-32 pb-16">
        {/* Event Title */}
        <div className="mb-6 flex items-start justify-between">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            {eventData.title.toUpperCase()}
          </h1>
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: eventData.title,
                  url: window.location.href,
                }).catch(() => {});
              } else {
                navigator.clipboard.writeText(window.location.href);
                toast.success('Link copied to clipboard');
              }
            }}
            className="p-2 hover:bg-gray-100 rounded-full transition"
            title="Share"
          >
            <Share2 className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Event Banner */}
            <div className="relative overflow-hidden rounded-xl bg-gray-100 shadow-sm border border-gray-100">
              <div className="aspect-[16/9] overflow-hidden">
                {eventData.poster_image_url ? (
                  <img
                    src={eventData.poster_image_url}
                    alt={eventData.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300">
                    <span className="text-gray-400">No Image</span>
                  </div>
                )}
              </div>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-[#333338] text-white text-xs font-medium px-3 py-1.5 rounded">
                {categoryLabel}
              </Badge>
              <Badge className="bg-[#333338] text-white text-xs font-medium px-3 py-1.5 rounded">
                {eventData.city}
              </Badge>
              {eventData.is_outdoor && (
                <Badge variant="outline" className="border-gray-300 text-gray-700 text-xs px-3 py-1.5 rounded">
                  Outdoor
                </Badge>
              )}
              {eventData.is_fast_filling && (
                <Badge className="bg-amber-500 text-white text-xs px-3 py-1.5 rounded">
                  Fast Filling
                </Badge>
              )}
            </div>

            {/* Interest Section */}
            {/* <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <ThumbsUp className="h-5 w-5 text-green-600" />
                <span className="text-sm text-gray-700">
                  <strong>{interestedCount}</strong> are interested
                </span>
              </div>
              <Button
                variant="outline"
                onClick={handleInterested}
                className={`rounded-full border-[#7B1E3D] text-sm px-4 py-2 transition-all ${
                  isInterested
                    ? 'bg-[#7B1E3D] text-white hover:bg-[#5C0F2A]'
                    : 'text-[#7B1E3D] hover:bg-[#7B1E3D]/10'
                }`}
              >
                {isInterested ? 'Interested ✓' : "I'm Interested"}
              </Button>
            </div> */}

            {/* About Section */}
            <div className="space-y-3">
              <h2 className="text-2xl font-bold text-gray-900">
                About The Event
              </h2>
              <div className="text-gray-700 leading-relaxed">
                {eventData.description ? (
                  <p className="whitespace-pre-line">{eventData.description}</p>
                ) : (
                  <p className="text-gray-500">No description available.</p>
                )}
              </div>
            </div>

            {/* Venue Details */}
            {eventData.venue_address && (
              <div className="space-y-3">
                <h2 className="text-2xl font-bold text-gray-900">
                  Venue Details
                </h2>
                <div className="flex items-start gap-2 text-gray-700 bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <MapPin className="h-5 w-5 text-[#7B1E3D] mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900">{eventData.venue_name}</p>
                    <p className="text-sm text-gray-600">{eventData.venue_address}</p>
                    <p className="text-sm text-gray-600">{eventData.city}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Artists Section */}
            {eventData.artists && eventData.artists.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Users className="h-6 w-6 text-[#7B1E3D]" />
                  Artists & Performers
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {eventData.artists.map((artist: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex flex-col items-center text-center p-3 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-colors"
                    >
                      <div className="h-20 w-20 rounded-full overflow-hidden bg-slate-200 border-2 border-[#7B1E3D]/20 mb-2 flex items-center justify-center">
                        {artist.image_url ? (
                          <img
                            src={artist.image_url}
                            alt={artist.name}
                            className="h-full w-full object-cover"
                            onError={(e) => ((e.target as any).style.display = "none")}
                          />
                        ) : (
                          <Users className="h-8 w-8 text-gray-400" />
                        )}
                      </div>
                      <p className="font-semibold text-gray-900 text-sm">{artist.name}</p>
                      {artist.role && (
                        <p className="text-xs text-[#7B1E3D] font-medium">{artist.role}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Seating / Stage Layout */}
            {eventData.layout_image_url && (
              <div className="space-y-3">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Layers className="h-6 w-6 text-[#7B1E3D]" />
                  Seating & Venue Layout
                </h2>
                <div
                  onClick={() => setActiveImagePreview(eventData.layout_image_url)}
                  className="group relative cursor-pointer overflow-hidden rounded-xl border border-gray-200 bg-slate-50 p-2 transition-all hover:shadow-md"
                >
                  <img
                    src={eventData.layout_image_url}
                    alt="Venue layout"
                    className="max-h-80 w-full object-contain rounded-lg"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white font-medium text-sm">
                    <Maximize2 className="h-5 w-5" />
                    <span>Click to view full layout</span>
                  </div>
                </div>
              </div>
            )}

            {/* Gallery Images */}
            {eventData.gallery_images && eventData.gallery_images.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <ImageIcon className="h-6 w-6 text-[#7B1E3D]" />
                  Event Gallery
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {eventData.gallery_images.map((imgUrl: string, idx: number) => (
                    <div
                      key={idx}
                      onClick={() => setActiveImagePreview(imgUrl)}
                      className="group relative h-36 rounded-xl overflow-hidden cursor-pointer border border-gray-100 bg-gray-100"
                    >
                      <img
                        src={imgUrl}
                        alt={`Gallery ${idx + 1}`}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                        <Maximize2 className="h-5 w-5" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Official Offline Promoter */}
            {eventData.offline_promoter &&
              (eventData.offline_promoter.name ||
                eventData.offline_promoter.contact ||
                eventData.offline_promoter.details) && (
                <div className="space-y-3">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <UserCheck className="h-6 w-6 text-[#7B1E3D]" />
                    Official Offline Promoter
                  </h2>
                  <div className="rounded-xl border border-wine-200 bg-[#7B1E3D]/5 p-5 space-y-2">
                    {eventData.offline_promoter.name && (
                      <p className="font-bold text-gray-900 text-base">
                        {eventData.offline_promoter.name}
                      </p>
                    )}
                    {eventData.offline_promoter.contact && (
                      <p className="text-sm text-gray-700 flex items-center gap-2">
                        <Phone className="h-4 w-4 text-[#7B1E3D]" />
                        <span>{eventData.offline_promoter.contact}</span>
                      </p>
                    )}
                    {eventData.offline_promoter.details && (
                      <p className="text-xs text-gray-600">
                        {eventData.offline_promoter.details}
                      </p>
                    )}
                  </div>
                </div>
              )}

            {/* FAQs */}
            {eventData.faqs && eventData.faqs.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <HelpCircle className="h-6 w-6 text-[#7B1E3D]" />
                  Frequently Asked Questions
                </h2>
                <div className="space-y-2">
                  {eventData.faqs.map((faq: any, idx: number) => {
                    const isOpen = openFaqIndex === idx;
                    return (
                      <div
                        key={idx}
                        className="rounded-xl border border-gray-200 bg-white overflow-hidden transition-colors"
                      >
                        <button
                          type="button"
                          onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                          className="w-full flex items-center justify-between p-4 text-left font-semibold text-gray-900 text-sm hover:bg-gray-50 transition-colors cursor-pointer"
                        >
                          <span>{faq.question}</span>
                          {isOpen ? (
                            <ChevronUp className="h-4 w-4 text-gray-500 shrink-0 ml-2" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-gray-500 shrink-0 ml-2" />
                          )}
                        </button>
                        {isOpen && (
                          <div className="px-4 pb-4 text-sm text-gray-600 border-t border-gray-100 pt-3">
                            <p className="whitespace-pre-line">{faq.answer}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Terms and Conditions */}
            {eventData.terms_and_conditions &&
              eventData.terms_and_conditions.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <FileText className="h-6 w-6 text-[#7B1E3D]" />
                    Terms & Conditions
                  </h2>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                    <ul className="list-disc list-inside space-y-1.5 text-xs text-gray-600 leading-relaxed">
                      {eventData.terms_and_conditions.map((term: string, idx: number) => (
                        <li key={idx} className="marker:text-[#7B1E3D]">
                          {term}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
          </div>

          {/* Right Booking Card */}
          <div className="lg:col-span-1">
            <div className="sticky top-[136px] rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
              {/* Date & Time Info */}
              <div className="space-y-3 text-sm">
                {/* Date */}
                <div className="flex items-center gap-3 text-gray-700">
                  <Calendar className="h-5 w-5 text-gray-500 shrink-0" />
                  <span className="font-medium">
                    {format(eventDate, 'EEE d MMM yyyy')}
                  </span>
                </div>

                {/* Time */}
                <div className="flex items-center gap-3 text-gray-700">
                  <Clock className="h-5 w-5 text-gray-500 shrink-0" />
                  <span className="font-medium">
                    {format(eventDate, 'h:mm a')}
                  </span>
                </div>

                {/* Duration */}
                {duration && (
                  <div className="flex items-center gap-3 text-gray-700">
                    <Hourglass className="h-5 w-5 text-gray-500 shrink-0" />
                    <span>{duration}</span>
                  </div>
                )}

                {/* Age Restriction */}
                <div className="flex items-center gap-3 text-gray-700">
                  <Users className="h-5 w-5 text-gray-500 shrink-0" />
                  <span>
                    {eventData.age_restriction || eventData.certificate || 'All age groups'}
                  </span>
                </div>

                {/* Language */}
                {eventData.language && (
                  <div className="flex items-center gap-3 text-gray-700">
                    <Languages className="h-5 w-5 text-gray-500 shrink-0" />
                    <span>{eventData.language}</span>
                  </div>
                )}

                {/* Category */}
                <div className="flex items-start gap-3 text-gray-700">
                  <Tag className="h-5 w-5 text-gray-500 mt-0.5 shrink-0" />
                  <div>
                    <p>{categoryLabel}</p>
                  </div>
                </div>

                {/* Venue Link */}
                <div className="flex items-start gap-3 text-gray-700">
                  <MapPin className="h-5 w-5 text-gray-500 mt-0.5 shrink-0" />
                  <div className="flex items-center gap-1 font-medium">
                    <span>{eventData.venue_name}</span>
                    <ExternalLink className="h-3 w-3 text-blue-500" />
                  </div>
                </div>
              </div>

              {/* Price & Book Button */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xl font-bold text-gray-900">
                      ₹{Math.round(minPrice / 100).toLocaleString('en-IN')}
                      <span className="text-xs font-normal text-gray-500 ml-1">onwards</span>
                    </p>
                    {isEventEnded ? (
                      <p className="text-xs text-rose-700 font-semibold">
                        Event Concluded
                      </p>
                    ) : (
                      <p className="text-xs text-green-600 font-medium">
                        Tickets Available
                      </p>
                    )}
                  </div>
                  {isEventEnded ? (
                    <Button
                      disabled
                      className="bg-slate-200 text-slate-500 cursor-not-allowed font-semibold px-6 py-3 rounded-lg text-sm"
                    >
                      Event Ended
                    </Button>
                  ) : (
                    <Button
                      onClick={handleBookNow}
                      className="bg-[#7B1E3D] hover:bg-[#5C0F2A] text-white font-semibold px-6 py-3 rounded-lg text-sm transition-colors shadow-sm"
                    >
                      Book Now
                    </Button>
                  )}
                </div>

                {/* Additional Info */}
                {/* <div className="space-y-2 text-xs text-gray-500 pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    <span>Instant booking confirmation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    <span>e-Ticket on email & SMS</span>
                  </div>
                </div> */}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Ticket Selection Dialog */}
      <Dialog open={bookingModalOpen} onOpenChange={setBookingModalOpen}>
        <DialogContent className="sm:max-w-md bg-white border border-gray-200 p-6 rounded-2xl shadow-xl">
          <DialogHeader className="border-b border-gray-100 pb-4 text-left">
            <div className="flex items-center gap-2 text-xs text-[#7B1E3D] font-semibold uppercase tracking-wider mb-1">
              <Ticket className="h-4 w-4" />
              <span>Select Tickets</span>
            </div>
            <DialogTitle className="text-xl font-bold text-gray-900 leading-tight">
              {eventData.title}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500 mt-1 flex items-center gap-2">
              <span>{format(eventDate, 'EEE, d MMM yyyy • h:mm a')}</span>
              <span>•</span>
              <span className="truncate">{eventData.venue_name}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Category selection */}
            <div>
              <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider block mb-2">
                Ticket Category
              </label>
              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {eventData.ticket_categories?.map((tier: any) => {
                  const isSelected = selectedTier?.id === tier.id;
                  const price = Math.round(tier.price_paise / 100);
                  return (
                    <div
                      key={tier.id}
                      onClick={() => {
                        setSelectedTierId(tier.id);
                        if (ticketQuantity > (tier.max_per_booking || 10)) {
                          setTicketQuantity(tier.max_per_booking || 10);
                        }
                      }}
                      className={`cursor-pointer rounded-xl border p-3.5 transition-all flex items-start justify-between ${
                        isSelected
                          ? 'border-[#7B1E3D] bg-[#7B1E3D]/5 shadow-sm ring-1 ring-[#7B1E3D]'
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div
                            className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                              isSelected
                                ? 'border-[#7B1E3D] bg-[#7B1E3D]'
                                : 'border-gray-300'
                            }`}
                          >
                            {isSelected && (
                              <div className="h-1.5 w-1.5 rounded-full bg-white" />
                            )}
                          </div>
                          <span className="text-sm font-semibold text-gray-900">
                            {tier.name}
                          </span>
                        </div>
                        {tier.description && (
                          <p className="text-xs text-gray-500 pl-6">
                            {tier.description}
                          </p>
                        )}
                        {tier.capacity && tier.capacity <= 20 && (
                          <p className="text-[11px] text-amber-600 font-medium pl-6">
                            Only {tier.capacity} spots remaining!
                          </p>
                        )}
                      </div>
                      <div className="text-right pl-2">
                        <span className="text-base font-bold text-gray-900">
                          ₹{price.toLocaleString('en-IN')}
                        </span>
                        <p className="text-[10px] text-gray-400">per ticket</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quantity stepper */}
            {selectedTier && (
              <div className="rounded-xl bg-gray-50 border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider block">
                      Number of Tickets
                    </label>
                    <span className="text-xs text-gray-500">
                      Max {maxAllowedTickets} tickets per booking
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={ticketQuantity <= 1}
                      onClick={() => setTicketQuantity((q) => Math.max(1, q - 1))}
                      className="h-8 w-8 rounded-lg border border-gray-300 bg-white flex items-center justify-center text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-8 text-center text-base font-bold text-gray-900">
                      {ticketQuantity}
                    </span>
                    <button
                      type="button"
                      disabled={ticketQuantity >= maxAllowedTickets}
                      onClick={() =>
                        setTicketQuantity((q) =>
                          Math.min(maxAllowedTickets, q + 1)
                        )
                      }
                      className="h-8 w-8 rounded-lg border border-gray-300 bg-white flex items-center justify-center text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Price summary */}
                <div className="mt-3 pt-3 border-t border-gray-200/80 flex items-center justify-between text-xs text-gray-600">
                  <span>
                    ₹{Math.round(selectedTier.price_paise / 100).toLocaleString('en-IN')} × {ticketQuantity}
                  </span>
                  <span className="text-sm font-bold text-gray-900">
                    ₹{Math.round((selectedTier.price_paise * ticketQuantity) / 100).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="pt-2">
            <Button
              onClick={handleConfirmBooking}
              disabled={isBooking || !selectedTier}
              className="w-full bg-[#7B1E3D] hover:bg-[#5C0F2A] text-white font-semibold py-3 rounded-xl text-base shadow-sm transition-colors flex items-center justify-center gap-2"
            >
              {isBooking ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Processing Booking...</span>
                </>
              ) : (
                <span>
                  Confirm & Pay ₹
                  {selectedTier
                    ? Math.round((selectedTier.price_paise * ticketQuantity) / 100).toLocaleString('en-IN')
                    : 0}
                </span>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Preview Lightbox */}
      <Dialog
        open={Boolean(activeImagePreview)}
        onOpenChange={(open) => !open && setActiveImagePreview(null)}
      >
        <DialogContent className="max-w-4xl p-2 bg-black/95 border-0 flex items-center justify-center rounded-2xl overflow-hidden">
          {activeImagePreview && (
            <img
              src={activeImagePreview}
              alt="Preview"
              className="max-h-[85vh] w-auto max-w-full rounded-lg object-contain"
            />
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
