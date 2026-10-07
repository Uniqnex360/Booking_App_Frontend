import { useState, useEffect, useMemo } from 'react';
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
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Image as ImageIcon,
  Utensils,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import {
  format,
  parseISO,
  differenceInHours,
  differenceInMinutes,
  addDays,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isSameDay,
  isSameMonth,
  eachDayOfInterval,
} from 'date-fns';
import { toast } from 'sonner';
import { LoadingPage } from './LoadingPage';
import { loadScript } from '@/utils/loadScript';
import { TermsModal } from './TermsModal';
import { applyCoupon, removeCoupon, getAvailableCoupons } from '@/api/coupon.api';
import type { ApplyCouponResult, AvailableCoupon } from '@/types/coupon.types';

const categoryLabels: Record<string, string> = {
  concert: 'Music Shows',
  comedy: 'Comedy Shows',
  sports: 'Sports',
  workshop: 'Workshops',
  theatre: 'Performances',
  exhibition: 'Exhibitions',
  dining: 'Dining Experience',
  other: 'Events',
};

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
  const [bookingStep, setBookingStep] = useState<1 | 2>(1); // 1 = Date & Time, 2 = Ticket
  const [selectedBookingDate, setSelectedBookingDate] = useState<Date | null>(null);
  const [calendarView, setCalendarView] = useState(false); // false = quick dates, true = calendar month
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);
  const [ticketQuantity, setTicketQuantity] = useState(1);
  const [isBooking, setIsBooking] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);  
  const [showTerms, setShowTerms] = useState(false);

  // Coupon state
  const [availableCoupons, setAvailableCoupons] = useState<AvailableCoupon[]>([]);
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<ApplyCouponResult | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isCouponSectionOpen, setIsCouponSectionOpen] = useState(false);

  // Generate available booking dates (BookMyShow pattern: 7 dates + 1 "See all dates >" slot = 8 grid slots)
  const availableBookingDates = useMemo(() => {
    if (!eventData?.starts_at) return [];
    try {
      const start = parseISO(eventData.starts_at);
      const dates: { date: Date; label: string; status: 'available' | 'fast_filling' | 'sold_out' }[] = [];
      
      let current = new Date(start);
      const now = new Date();
      // If start is in the past, roll forward
      while (current < now) {
        current = addDays(current, 7);
      }

      // Generate 7 upcoming occurrences (weekly or scheduled)
      for (let i = 0; i < 7; i++) {
        const d = i === 0 ? current : addDays(current, i * 7);
        dates.push({
          date: d,
          label: format(d, 'EEE dd MMM'),
          status: i === 0 ? 'available' : i === 1 ? 'fast_filling' : 'available',
        });
      }
      return dates;
    } catch {
      return [];
    }
  }, [eventData]);

  // Selected time slot (defaults from event starts_at)
  const selectedTime = useMemo(() => {
    if (!eventData?.starts_at) return '04:00 PM';
    try {
      return format(parseISO(eventData.starts_at), 'hh:mm a');
    } catch {
      return '04:00 PM';
    }
  }, [eventData]);

  // Calendar days grid for month view
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(calendarMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [calendarMonth]);

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

          if (id) {
            try {
              const coupons = await getAvailableCoupons(id);
              setAvailableCoupons(coupons || []);
            } catch {
              // non-fatal
            }
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

  const subtotalPaise = selectedTier ? selectedTier.price_paise * ticketQuantity : 0;
  const discountPaise = appliedCoupon ? appliedCoupon.discount_paise : 0;
  const finalPaise = Math.max(0, subtotalPaise - discountPaise);

  const handleApplyCoupon = async () => {
    if (!couponCodeInput.trim()) {
      setCouponError('Please enter a coupon code');
      return;
    }
    if (subtotalPaise <= 0) {
      setCouponError('Please select tickets first');
      return;
    }
    try {
      setIsApplyingCoupon(true);
      setCouponError(null);
      const res = await applyCoupon({
        code: couponCodeInput.trim().toUpperCase(),
        event_id: id!,
        cart_paise: subtotalPaise,
      });
      setAppliedCoupon(res);
      toast.success(res.message || 'Coupon applied successfully!');
    } catch (err: any) {
      const msg = err.message || 'Invalid or ineligible coupon code';
      setCouponError(msg);
      toast.error(msg);
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleApplySpecificCoupon = async (code: string) => {
    if (subtotalPaise <= 0) {
      toast.error('Please select at least 1 ticket first');
      return;
    }
    setCouponCodeInput(code);
    try {
      setIsApplyingCoupon(true);
      setCouponError(null);
      const res = await applyCoupon({
        code: code.trim().toUpperCase(),
        event_id: id!,
        cart_paise: subtotalPaise,
      });
      setAppliedCoupon(res);
      toast.success(res.message || 'Coupon applied successfully!');
    } catch (err: any) {
      const msg = err.message || 'Invalid or ineligible coupon code';
      setCouponError(msg);
      toast.error(msg);
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = async () => {
    if (appliedCoupon) {
      try {
        await removeCoupon({ code: appliedCoupon.code, event_id: id });
      } catch {}
    }
    setAppliedCoupon(null);
    setCouponCodeInput('');
    setCouponError(null);
    toast.info('Coupon removed');
  };

  const handleBookNow = () => {
    if (isEventEnded) {
      toast.error('This event has already ended and cannot be booked.');
      return;
    }
    if (!eventData?.ticket_categories || eventData.ticket_categories.length === 0) {
      toast.error('No tickets are currently available for this event.');
      return;
    }
    if (!selectedTierId && eventData.ticket_categories.length > 0) {
      setSelectedTierId(eventData.ticket_categories[0].id);
    }
    setTicketQuantity(0);
    setAppliedCoupon(null);
    setCouponCodeInput('');
    setCouponError(null);
    setIsCouponSectionOpen(availableCoupons.length > 0);

    // Initialize Date & Time step
    setBookingStep(1);
    setCalendarView(false);
    setSelectedBookingDate(null);
    if (eventData?.starts_at) {
      try {
        setCalendarMonth(parseISO(eventData.starts_at));
      } catch {
        setCalendarMonth(new Date());
      }
    }
    setBookingModalOpen(true);
  };

  const startRazorpayPayment = async (booking: any) => {
    const isLoaded = await loadScript('https://checkout.razorpay.com/v1/checkout.js');
    if (!isLoaded) {
      toast.error('Failed to load payment gateway.');
      setIsBooking(false);
      return;
    }

    try {
      const order = await unwrap<any>(
        api.post('/payments/order', {
          booking_id: booking.id,
          coupon_code: appliedCoupon?.code,
        })
      );

      if (order?.status === 'NOT_REQUIRED') {
        toast.success('Tickets reserved successfully!');
        setBookingModalOpen(false);
        navigate(
          `/confirmation?id=${booking.id}&ref=${encodeURIComponent(booking.ref_code ?? booking.id)}`
        );
        setIsBooking(false);
        return;
      }

      const options = {
        key: order.key_id,
        order_id: order.order_id,
        amount: order.amount_paise,
        currency: order.currency || 'INR',
        name: 'Vyhbz',
        description: `${eventData?.title || 'Event'} - ${selectedTier?.name || 'Tickets'} x ${ticketQuantity}`,
        handler: async (response: any) => {
          setIsConfirming(true);
          try {
            const orderId = response.razorpay_order_id || order.order_id;
            if (!orderId || !response.razorpay_payment_id || !response.razorpay_signature) {
              throw new Error('Payment gateway response is incomplete. Please contact support.');
            }
            await unwrap<any>(
              api.post('/payments/verify', {
                booking_id: booking.id,
                razorpay_order_id: orderId,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              })
            );
            toast.success('Tickets booked successfully!');
            setBookingModalOpen(false);
            navigate(
              `/confirmation?id=${booking.id}&ref=${encodeURIComponent(booking.ref_code ?? booking.id)}`
            );
          } catch (err: any) {
            toast.error(
              err.message || `Confirmation failed after payment. Please contact support with Payment ID: ${response.razorpay_payment_id}`
            );
          } finally {
            setIsBooking(false);
            setIsConfirming(false);
          }
        },
        prefill: {
          name: user?.full_name || '',
          email: user?.email || '',
          contact: (user as any)?.phone || '',
        },
        theme: { color: '#7B1E3D' },
        modal: {
          ondismiss: () => {
            toast.warning('Payment cancelled.');
            setIsBooking(false);
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', (r: any) => {
        toast.error(r?.error?.description || 'Payment failed.');
        setIsBooking(false);
      });
      rzp.open();
      setShowTerms(false);
      setIsBooking(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to initiate payment.');
      setIsBooking(false);
    }
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

    try {
      setIsBooking(true);
      const idempotencyKey =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `book-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      const res = await unwrap<any>(
        api.post('/bookings', {
          tier_id: selectedTier.id,
          quantity: ticketQuantity,
          idempotency_key: idempotencyKey,
        })
      );
      const booking = res?.booking || res;

      // Free event (or already confirmed by server), navigate directly
      if (booking.status === 'CONFIRMED') {
        toast.success('Tickets reserved successfully!');
        setBookingModalOpen(false);
        navigate(
          `/confirmation?id=${booking.id}&ref=${encodeURIComponent(booking.ref_code ?? booking.id)}`
        );
        setIsBooking(false);
        return;
      }

      // Status is HELD / PENDING: Proceed to Razorpay checkout
      await startRazorpayPayment(booking);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || err?.message || 'Failed to complete booking.');
      setIsBooking(false);
    }
  };

  const handleInterested = () => {
    setIsInterested(!isInterested);
    setInterestedCount((prev) => (isInterested ? prev - 1 : prev + 1));
  };

  // Calculate duration dynamically (matches BookMyShow)
  const getDuration = () => {
    if (eventData?.duration_min) {
      const h = Math.floor(eventData.duration_min / 60);
      const m = eventData.duration_min % 60;
      if (h > 0 && m > 0) return `${h} Hours ${m} Mins`;
      if (h > 0) return `${h} Hours`;
      if (m > 0) return `${m} Mins`;
    }
    if (!eventData?.starts_at || !eventData?.ends_at) return '3 Hours';
    const start = parseISO(eventData.starts_at);
    const end = parseISO(eventData.ends_at);
    const hours = differenceInHours(end, start);
    const minutes = differenceInMinutes(end, start) % 60;

    if (hours >= 24) return '3 Hours'; // Standard BookMyShow dining slot duration
    if (hours > 0 && minutes > 0) return `${hours} Hours ${minutes} Mins`;
    if (hours > 0) return `${hours} Hours`;
    if (minutes > 0) return `${minutes} Mins`;
    return '3 Hours';
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

            {/* Tags matching BookMyShow */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-[#333338] hover:bg-[#333338] text-white text-xs font-medium px-3 py-1 rounded">
                {categoryLabel}
              </Badge>
              {eventData.tags?.map((t: string, idx: number) => (
                <Badge key={idx} className="bg-[#333338] hover:bg-[#333338] text-white text-xs font-medium px-3 py-1 rounded capitalize">
                  {t.replace(/_/g, ' ')}
                </Badge>
              ))}
              {eventData.cuisine?.map((c: string, idx: number) => (
                <Badge key={idx} className="bg-[#333338] hover:bg-[#333338] text-white text-xs font-medium px-3 py-1 rounded">
                  {c}
                </Badge>
              ))}
              {eventData.city && (
                <Badge className="bg-[#333338] hover:bg-[#333338] text-white text-xs font-medium px-3 py-1 rounded">
                  {eventData.city}
                </Badge>
              )}
              {eventData.is_outdoor && (
                <Badge variant="outline" className="border-gray-300 text-gray-700 text-xs px-3 py-1 rounded">
                  Outdoor
                </Badge>
              )}
              {eventData.is_fast_filling && (
                <Badge className="bg-amber-500 text-white text-xs px-3 py-1 rounded">
                  Fast Filling
                </Badge>
              )}
            </div>

            {/* Interest Section matching BookMyShow */}
            <div className="flex items-center justify-between py-1 border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <ThumbsUp className="h-4 w-4 text-emerald-600" />
                <span className="text-xs sm:text-sm text-gray-700 font-medium">
                  <strong>{interestedCount}</strong> are interested
                </span>
              </div>
              <Button
                variant="outline"
                onClick={handleInterested}
                className={`rounded-md border-[#7B1E3D] text-xs px-3 py-1.5 h-auto font-medium transition-all ${
                  isInterested
                    ? 'bg-[#7B1E3D] text-white hover:bg-[#5C0F2A]'
                    : 'text-[#7B1E3D] hover:bg-[#7B1E3D]/10'
                }`}
              >
                {isInterested ? 'Interested ✓' : "I'm Interested"}
              </Button>
            </div>

            {/* About The Event */}
            <div className="space-y-3">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                About The Event
              </h2>
              <div className="text-gray-700 leading-relaxed text-sm sm:text-base">
                {eventData.description ? (
                  <p className="whitespace-pre-line">{eventData.description}</p>
                ) : (
                  <p className="text-gray-500">No description available.</p>
                )}
              </div>
            </div>

            {/* M-Ticket Banner matching BookMyShow */}
            <div className="space-y-2 pt-1">
              <h3 className="text-base font-bold text-gray-900">M-Ticket</h3>
              <div className="rounded-xl bg-[#FFF6F3] border border-[#FFE2D9] p-3.5 sm:p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white border border-[#FFE2D9] shadow-xs text-gray-700">
                  <Ticket className="h-5 w-5 text-gray-800" />
                </div>
                <p className="text-xs sm:text-sm text-gray-700">
                  Contactless Ticketing &amp; Fast-track Entry with M-ticket.{' '}
                  <span className="text-[#7B1E3D] font-semibold cursor-pointer hover:underline">
                    Learn How
                  </span>
                </p>
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

              {/* Special Offers Banner */}
              {availableCoupons.length > 0 && (
                <div className="border-t border-gray-100 pt-3 pb-1">
                  <div className="rounded-xl border border-dashed border-[#7B1E3D]/40 bg-[#7B1E3D]/5 p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-[#7B1E3D]">
                        <Sparkles className="h-3.5 w-3.5 text-[#7B1E3D]" /> Offers Available
                      </span>
                      <span className="text-[10px] bg-[#7B1E3D] text-white font-bold px-2 py-0.5 rounded-full">
                        {availableCoupons.length} {availableCoupons.length === 1 ? 'OFFER' : 'OFFERS'}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {availableCoupons.slice(0, 2).map((c) => (
                        <div
                          key={c.id}
                          className="bg-white/90 rounded-lg p-2 border border-[#7B1E3D]/20 text-xs flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <span className="font-mono font-bold text-gray-900 bg-gray-100 px-1.5 py-0.5 rounded text-[11px] border border-gray-200">
                              {c.code}
                            </span>
                            <span className="text-[#7B1E3D] font-semibold text-[11px] ml-1.5">
                              {c.discount_label}
                            </span>
                          </div>
                          <span className="text-[10px] text-gray-500 shrink-0">
                            {c.min_order_label}
                          </span>
                        </div>
                      ))}
                      {availableCoupons.length > 2 && (
                        <p className="text-[10px] text-gray-500 text-center pt-0.5 font-medium">
                          +{availableCoupons.length - 2} more discount code(s) available at checkout
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Price & Book Button */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-2xl font-bold text-gray-900 leading-tight">
                      ₹{Math.round(minPrice / 100).toLocaleString('en-IN')}
                    </p>
                    {isEventEnded ? (
                      <p className="text-xs text-rose-700 font-semibold mt-0.5">
                        Event Concluded
                      </p>
                    ) : (
                      <p className="text-xs text-emerald-600 font-semibold mt-0.5">
                        Available
                      </p>
                    )}
                  </div>
                  {isEventEnded ? (
                    <Button
                      disabled
                      className="bg-slate-200 text-slate-500 cursor-not-allowed font-semibold px-6 py-2.5 rounded-lg text-sm"
                    >
                      Event Ended
                    </Button>
                  ) : (
                    <Button
                      onClick={handleBookNow}
                      className="bg-[#7B1E3D] hover:bg-[#5C0F2A] text-white font-semibold px-7 py-2.5 rounded-lg text-sm transition-colors shadow-sm"
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

      {/* Full Screen BookMyShow-style Booking Flow */}
      {bookingModalOpen && (
        <div className="fixed inset-0 z-[100] bg-[#F5F5F5] overflow-y-auto flex flex-col min-h-screen text-gray-900 font-sans">
          {/* Top Header Bar */}
          <header className="bg-white border-b border-gray-200 h-16 flex items-center px-4 sm:px-8 sticky top-0 z-50 shrink-0">
            <div className="flex items-center gap-6 sm:gap-10 w-full max-w-6xl mx-auto">
              <button
                type="button"
                onClick={() => setBookingModalOpen(false)}
                className="shrink-0 flex items-center focus:outline-none"
              >
                <img
                  src="/logo.png"
                  alt="Vyhbz"
                  className="h-10 sm:h-12 w-auto object-contain"
                />
              </button>

              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => {
                    if (bookingStep === 2) {
                      setBookingStep(1);
                    } else {
                      setBookingModalOpen(false);
                    }
                  }}
                  className="p-1 rounded-full text-gray-700 hover:bg-gray-100 transition-colors shrink-0"
                  aria-label="Back"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <h1 className="text-sm sm:text-base font-bold text-gray-900 truncate">
                  {eventData.title}
                </h1>
              </div>
            </div>
          </header>

          {/* Stepper Strip & Venue Subtitle */}
          <div className="bg-[#EEEEEE] border-b border-gray-200 py-2.5 px-4 shrink-0">
            <div className="max-w-4xl mx-auto flex flex-col items-center justify-center gap-1">
              {/* Stepper items */}
              <div className="flex items-center gap-2 sm:gap-4 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setBookingStep(1)}
                  className={`flex items-center gap-1.5 transition-colors ${
                    bookingStep === 1
                      ? 'text-gray-900 font-semibold'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      bookingStep === 1
                        ? 'bg-black text-white'
                        : 'bg-gray-400 text-white'
                    }`}
                  >
                    1
                  </span>
                  <span>Date &amp; Time</span>
                </button>

                <span className="text-gray-400 text-xs">&gt;</span>

                <div
                  className={`flex items-center gap-1.5 ${
                    bookingStep === 2
                      ? 'text-gray-900 font-semibold'
                      : 'text-gray-400'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      bookingStep === 2
                        ? 'bg-black text-white'
                        : 'bg-gray-300 text-white'
                    }`}
                  >
                    2
                  </span>
                  <span>Ticket</span>
                </div>

                <span className="text-gray-400 text-xs">&gt;</span>

                <div className="flex items-center gap-1.5 text-gray-400">
                  <span className="w-4 h-4 rounded-full bg-gray-300 text-white flex items-center justify-center text-[10px] font-bold">
                    3
                  </span>
                  <span>Review &amp; Proceed to Pay</span>
                </div>
              </div>

              {/* Venue & Scheduled Info */}
              <div className="text-[11px] sm:text-xs text-gray-600 font-medium text-center">
                <span>{eventData.venue_name}{eventData.city ? `: ${eventData.city}` : ''}</span>
                {bookingStep === 2 && selectedBookingDate && (
                  <span className="block text-gray-800 font-semibold mt-0.5">
                    {format(selectedBookingDate, 'EEE dd MMM')} | {selectedTime}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <main className="flex-1 py-8 px-4 pb-32">
            {bookingStep === 1 ? (
              /* STEP 1: Date & Time Selection (matches Screenshots 3 & 4) */
              <div className="max-w-xl mx-auto bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                {/* Status Legend */}
                <div className="flex items-center justify-end gap-3 text-xs text-gray-600 pb-4 border-b border-gray-100">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#16A34A]" />
                    Available
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#EA580C]" />
                    Fast Filling
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#9CA3AF]" />
                    Sold out
                  </span>
                </div>

                <p className="text-xs font-bold text-gray-800 uppercase tracking-wider mt-4 mb-3">
                  Select Date
                </p>

                {!calendarView ? (
                  <div>
                    {/* 4 columns x 2 rows date grid */}
                    <div className="grid grid-cols-4 gap-2.5">
                      {availableBookingDates.map((item, idx) => {
                        const isSelected =
                          selectedBookingDate && isSameDay(selectedBookingDate, item.date);
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setSelectedBookingDate(item.date)}
                            className={`py-2.5 px-1.5 rounded-md text-center text-xs transition-colors border ${
                              isSelected
                                ? 'bg-[#7B1E3D] text-white border-[#7B1E3D] font-semibold shadow-sm'
                                : 'bg-white text-gray-800 border-gray-300 hover:border-gray-400 font-medium'
                            }`}
                          >
                            {format(item.date, 'EEE dd MMM')}
                          </button>
                        );
                      })}
                      {/* Slot 8: See all dates > */}
                      <button
                        type="button"
                        onClick={() => setCalendarView(true)}
                        className="flex items-center justify-center text-xs font-semibold text-[#7B1E3D] hover:underline cursor-pointer py-2.5"
                      >
                        See all dates &gt;
                      </button>
                    </div>

                    {/* Select Time (appears when date is selected, matches Screenshot 3) */}
                    {selectedBookingDate && (
                      <div className="mt-6 pt-4 border-t border-gray-100">
                        <p className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3">
                          Select Time
                        </p>
                        <button
                          type="button"
                          className="bg-[#7B1E3D] text-white font-semibold text-xs px-5 py-2.5 rounded-md shadow-sm"
                        >
                          {selectedTime}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Month Calendar View (matches uploaded calendar screenshot) */
                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-2 py-1">
                      <button
                        type="button"
                        onClick={() => setCalendarMonth((prev) => subMonths(prev, 1))}
                        className="p-1 rounded-full text-gray-600 hover:bg-gray-100"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <span className="text-xs sm:text-sm font-bold text-gray-900 tracking-wider uppercase">
                        {format(calendarMonth, 'MMMM yyyy')}
                      </span>
                      <button
                        type="button"
                        onClick={() => setCalendarMonth((prev) => addMonths(prev, 1))}
                        className="p-1 rounded-full text-gray-600 hover:bg-gray-100"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-7 text-center text-xs font-bold text-gray-400 py-1 border-b border-gray-100">
                      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((dayChar, i) => (
                        <div key={i}>{dayChar}</div>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center">
                      {calendarDays.map((day, i) => {
                        const inCurrentMonth = isSameMonth(day, calendarMonth);
                        const isSelected =
                          selectedBookingDate && isSameDay(selectedBookingDate, day);
                        const isPast = day < new Date(new Date().setHours(0, 0, 0, 0));
                        const matchesScheduled = availableBookingDates.some((d) =>
                          isSameDay(d.date, day)
                        );

                        if (!inCurrentMonth) {
                          return <div key={i} className="h-9 w-9 mx-auto" />;
                        }

                        return (
                          <button
                            key={i}
                            type="button"
                            disabled={isPast}
                            onClick={() => setSelectedBookingDate(day)}
                            className={`h-9 w-9 mx-auto rounded-full flex flex-col items-center justify-center text-xs transition-all relative ${
                              isPast
                                ? 'text-gray-300 cursor-not-allowed'
                                : isSelected
                                ? 'bg-[#7B1E3D] text-white font-bold shadow'
                                : matchesScheduled
                                ? 'font-bold text-gray-900 hover:bg-gray-100'
                                : 'text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            <span>{format(day, 'd')}</span>
                            {matchesScheduled && !isSelected && (
                              <span className="h-1 w-1 rounded-full bg-emerald-500 absolute bottom-1" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <div className="pt-3 text-center border-t border-gray-100">
                      <button
                        type="button"
                        onClick={() => setCalendarView(false)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#7B1E3D] hover:underline"
                      >
                        &lt; Show quick dates
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* STEP 2: Ticket Selection (matches Screenshots 1 & 2) */
              <div className="max-w-xl mx-auto">
                <h2 className="text-base font-bold text-gray-900">
                  Select Tickets
                </h2>
                <p className="text-xs text-gray-500 mt-0.5 mb-4">
                  You can add up to 10 tickets only
                </p>

                <div className="space-y-3">
                  {eventData.ticket_categories?.map((tier: any) => {
                    const isCurrentTier = selectedTier?.id === tier.id;
                    const currentQty = isCurrentTier ? ticketQuantity : 0;
                    const price = Math.round(tier.price_paise / 100);

                    return (
                      <div
                        key={tier.id}
                        className="border border-gray-200 rounded-lg p-5 bg-white shadow-sm flex items-center justify-between"
                      >
                        <div>
                          <p className="text-xs font-bold text-gray-800 tracking-wider uppercase">
                            {tier.name}
                          </p>
                          <p className="text-sm font-bold text-gray-900 mt-1">
                            ₹{price.toLocaleString('en-IN')}
                          </p>
                          {tier.description && (
                            <p className="text-xs text-gray-500 mt-0.5">{tier.description}</p>
                          )}
                        </div>

                        <div>
                          {currentQty === 0 ? (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedTierId(tier.id);
                                setTicketQuantity(1);
                              }}
                              className="border border-[#7B1E3D] text-[#7B1E3D] bg-white hover:bg-[#7B1E3D]/5 text-xs font-bold px-6 py-1.5 rounded-md transition-colors"
                            >
                              Add
                            </button>
                          ) : (
                            <div className="border border-[#7B1E3D] rounded-md flex items-center bg-white text-[#7B1E3D] overflow-hidden">
                              <button
                                type="button"
                                onClick={() => setTicketQuantity((q) => Math.max(0, q - 1))}
                                className="px-3 py-1 text-sm font-bold hover:bg-[#7B1E3D]/10 text-[#7B1E3D] transition"
                              >
                                -
                              </button>
                              <span className="px-3 py-1 text-xs font-bold text-gray-900 min-w-[28px] text-center">
                                {ticketQuantity}
                              </span>
                              <button
                                type="button"
                                disabled={ticketQuantity >= maxAllowedTickets}
                                onClick={() =>
                                  setTicketQuantity((q) => Math.min(maxAllowedTickets, q + 1))
                                }
                                className="px-3 py-1 text-sm font-bold hover:bg-[#7B1E3D]/10 text-[#7B1E3D] transition disabled:opacity-40"
                              >
                                +
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Coupon & Order Summary Breakdown */}
                {ticketQuantity > 0 && (
                  <div className="mt-6 border border-gray-200 rounded-xl p-4 bg-gray-50/60 mb-20">
                    {/* Have a coupon code toggle */}
                    {!appliedCoupon ? (
                      <div>
                        <button
                          type="button"
                          onClick={() => setIsCouponSectionOpen(!isCouponSectionOpen)}
                          className="flex items-center justify-between w-full text-left text-xs font-bold text-[#7B1E3D] hover:underline"
                        >
                          <span className="flex items-center gap-1.5">
                            <Tag className="h-3.5 w-3.5" /> Have a coupon code?
                            {availableCoupons.length > 0 && (
                              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded border border-emerald-300">
                                {availableCoupons.length} offer{availableCoupons.length > 1 ? 's' : ''} available
                              </span>
                            )}
                          </span>
                          <span className="text-[11px] text-gray-500 font-normal">
                            {isCouponSectionOpen ? 'Hide' : 'View Offers / Apply'}
                          </span>
                        </button>

                        {isCouponSectionOpen && (
                          <div className="mt-3">
                            <div className="flex gap-2">
                              <input
                                type="text"
                                placeholder="Enter coupon (e.g. SUNDAY20)"
                                value={couponCodeInput}
                                onChange={(e) => {
                                  setCouponCodeInput(e.target.value.toUpperCase());
                                  setCouponError(null);
                                }}
                                className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-xs font-mono uppercase font-semibold text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#7B1E3D]"
                              />
                              <button
                                type="button"
                                onClick={handleApplyCoupon}
                                disabled={isApplyingCoupon || !couponCodeInput.trim()}
                                className="bg-[#7B1E3D] hover:bg-[#5C0F2A] disabled:bg-gray-300 text-white text-xs font-bold px-4 py-1.5 rounded-lg transition cursor-pointer"
                              >
                                {isApplyingCoupon ? 'Applying...' : 'Apply'}
                              </button>
                            </div>
                            {couponError && (
                              <p className="text-xs text-rose-600 mt-1.5 font-medium">
                                {couponError}
                              </p>
                            )}

                            {/* Available Coupons Quick-Apply List */}
                            {availableCoupons.length > 0 && (
                              <div className="mt-4 pt-3 border-t border-gray-200">
                                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                  <Sparkles className="h-3.5 w-3.5 text-[#7B1E3D]" />
                                  Available Offers ({availableCoupons.length})
                                </p>
                                <div className="space-y-2">
                                  {availableCoupons.map((coupon) => {
                                    const isEligible = subtotalPaise >= coupon.min_order_paise;
                                    const deficitPaise = coupon.min_order_paise - subtotalPaise;

                                    return (
                                      <div
                                        key={coupon.id}
                                        className={`border rounded-lg p-2.5 transition flex items-start justify-between gap-3 ${
                                          isEligible
                                            ? 'bg-white border-gray-200 hover:border-[#7B1E3D]'
                                            : 'bg-gray-50/80 border-gray-200'
                                        }`}
                                      >
                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-center gap-2">
                                            <span className="font-mono text-xs font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                                              {coupon.code}
                                            </span>
                                            <span className="text-xs font-bold text-[#7B1E3D]">
                                              {coupon.discount_label}
                                            </span>
                                          </div>
                                          <p className="text-[11px] text-gray-600 mt-1">
                                            {coupon.min_order_label}
                                            {coupon.terms ? ` · ${coupon.terms}` : ''}
                                          </p>
                                          {!isEligible && deficitPaise > 0 && (
                                            <p className="text-[10px] text-amber-700 font-medium mt-0.5">
                                              Add ₹{Math.ceil(deficitPaise / 100).toLocaleString('en-IN')} more to unlock
                                            </p>
                                          )}
                                        </div>

                                        <button
                                          type="button"
                                          disabled={!isEligible || isApplyingCoupon}
                                          onClick={() => handleApplySpecificCoupon(coupon.code)}
                                          className={`text-xs font-bold px-3 py-1 rounded transition cursor-pointer shrink-0 ${
                                            isEligible
                                              ? 'bg-[#7B1E3D] hover:bg-[#5C0F2A] text-white shadow-xs'
                                              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                          }`}
                                        >
                                          Apply
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg p-2.5">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          <div>
                            <span className="text-xs font-mono font-bold text-emerald-800">
                              {appliedCoupon.code}
                            </span>
                            <span className="text-xs text-emerald-700 ml-1.5">
                              · {appliedCoupon.message}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveCoupon}
                          className="text-xs text-rose-600 hover:text-rose-800 font-semibold underline ml-2 cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    )}

                    {/* Order Summary Line Items */}
                    <div className="mt-4 pt-3 border-t border-gray-200 text-xs space-y-1.5 text-gray-600">
                      <div className="flex justify-between">
                        <span>
                          Tickets ({ticketQuantity} × ₹
                          {Math.round((selectedTier?.price_paise || 0) / 100).toLocaleString('en-IN')})
                        </span>
                        <span className="font-medium text-gray-900">
                          ₹{Math.round(subtotalPaise / 100).toLocaleString('en-IN')}
                        </span>
                      </div>
                      {appliedCoupon && (
                        <div className="flex justify-between text-emerald-700 font-medium">
                          <span>Discount ({appliedCoupon.code})</span>
                          <span>-₹{Math.round(discountPaise / 100).toLocaleString('en-IN')}</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-2 border-t border-gray-200 text-sm font-bold text-gray-900">
                        <span>Amount payable</span>
                        <span>₹{Math.round(finalPaise / 100).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </main>

          {/* Sticky Bottom Action Bar */}
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-3.5 px-6 z-50">
            {bookingStep === 1 ? (
              /* Step 1 Bottom Bar (matches Screenshots 3 & 4) */
              <div className="flex justify-center">
                <button
                  type="button"
                  disabled={!selectedBookingDate}
                  onClick={() => setBookingStep(2)}
                  className={`font-medium text-sm px-24 py-2.5 rounded-md transition-colors ${
                    selectedBookingDate
                      ? 'bg-[#7B1E3D] hover:bg-[#5C0F2A] text-white shadow-sm cursor-pointer'
                      : 'bg-[#C4C4C4] text-white cursor-not-allowed'
                  }`}
                >
                  Proceed
                </button>
              </div>
            ) : (
              /* Step 2 Bottom Bar (matches Screenshots 1 & 2) */
              ticketQuantity === 0 ? (
                <div className="flex justify-center">
                  <button
                    type="button"
                    disabled
                    className="bg-[#C4C4C4] text-white font-medium text-sm px-24 py-2.5 rounded-md cursor-not-allowed"
                  >
                    {user ? 'Proceed to Pay' : 'Login To Book'}
                  </button>
                </div>
              ) : (
                <div className="max-w-xl mx-auto flex items-center justify-between w-full">
                  <div>
                    <span className="text-[11px] font-semibold text-blue-600 block">
                      {ticketQuantity} {ticketQuantity === 1 ? 'Ticket' : 'Tickets'}
                      {appliedCoupon && (
                        <span className="ml-1 text-emerald-600 font-bold">
                          · {appliedCoupon.code} applied
                        </span>
                      )}
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-base sm:text-lg font-bold text-gray-900">
                        ₹{Math.round(finalPaise / 100).toLocaleString('en-IN')}
                      </span>
                      {appliedCoupon && (
                        <span className="text-xs text-gray-400 line-through">
                          ₹{Math.round(subtotalPaise / 100).toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={isBooking}
                    onClick={() => {
                      if (!user) {
                        navigate('/login', { state: { from: `/events/${id}` } });
                        return;
                      }
                      setShowTerms(true);
                    }}
                    className="bg-[#7B1E3D] hover:bg-[#5C0F2A] disabled:bg-[#7B1E3D]/70 text-white font-medium text-sm px-8 py-2.5 rounded-md shadow-sm transition-colors cursor-pointer flex items-center gap-2"
                  >
                    {isBooking ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : user ? (
                      'Proceed to Pay'
                    ) : (
                      'Login To Book'
                    )}
                  </button>
                </div>
              )
            )}
          </div>
        </div>
      )}

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
      {isBooking && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-3 bg-black/70 backdrop-blur-sm text-white px-6 text-center">
          <Loader2 className="h-10 w-10 animate-spin text-[#D6445B]" />
          <p className="text-lg font-semibold">Initiating payment...</p>
          <p className="text-sm text-white/80">
            Connecting to secure payment gateway, please wait...
          </p>
        </div>
      )}

      {isConfirming && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-3 bg-black/70 backdrop-blur-sm text-white px-6 text-center">
          <Loader2 className="h-10 w-10 animate-spin text-emerald-400" />
          <p className="text-lg font-semibold">Confirming your payment...</p>
          <p className="text-sm text-white/80">
            Please do not close or refresh this page.
          </p>
        </div>
      )}

      <TermsModal
        isOpen={showTerms}
        terms={eventData.terms_and_conditions}
        amountLabel={
          selectedTier
            ? `₹${Math.round(finalPaise / 100).toLocaleString('en-IN')}`
            : undefined
        }
        isLoading={isBooking}
        onClose={() => {
          if (!isBooking) {
            setShowTerms(false);
            setBookingModalOpen(true);
          }
        }}
        onAccept={() => {
          handleConfirmBooking();
        }}
      />
      <Footer />
    </div>
  );
}
