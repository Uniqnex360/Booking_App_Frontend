import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader } from '@/components/common/Loader';
import { useAuth } from '@/hooks/useAuth';
import { createBooking } from '@/api/booking.api';
import { api, unwrap } from '@/api/client';
import {
  Calendar,
  Users,
  ArrowLeft,
  ArrowRight,
  Loader2,
  CheckCircle2,
  MapPin,
  ShieldCheck,
} from 'lucide-react';
import { formatCurrency, formatRupees } from '@/utils/currencyFormatter';
import { toast } from 'sonner';

function loadScript(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function BookingPage() {
  const { type, id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [itemData, setItemData] = useState<any>(null);
  const [guests, setGuests] = useState(2);
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const idempotencyKeyRef = useRef<string>(crypto.randomUUID());

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      try {
        if (type?.toLowerCase() === 'event') {
          const res = await unwrap<any>(api.get(`/events/${id}`));
          setItemData({
            title: res.title,
            venue: res.venue_name,
            location: res.city,
            price_paise: res.ticket_categories?.[0]?.price_paise || 50000,
            image: res.poster_image_url || 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&auto=format&fit=crop&q=80',
            tier_id: res.ticket_categories?.[0]?.id,
          });
          setDate(res.starts_at?.split('T')[0] || '');
        } else if (type?.toLowerCase() === 'restaurant') {
          const res = await unwrap<any>(api.get(`/restaurants/${id}`).catch(() => null));
          setItemData({
            title: res?.name || 'Gourmet Table Reservation',
            venue: res?.name || 'Exclusive Dining',
            location: res?.city || 'Kochi',
            price_paise: 25000, // standard reservation deposit
            image: res?.image_url || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=80',
          });
        } else {
          setItemData({
            title: 'Experience Booking',
            venue: 'Vyhbz Experience Venue',
            location: 'Kochi',
            price_paise: 50000,
            image: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800&auto=format&fit=crop&q=80',
          });
        }
      } catch {
        setItemData({
          title: 'Experience Booking',
          venue: 'Vyhbz Experience Venue',
          location: 'Kochi',
          price_paise: 50000,
          image: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800&auto=format&fit=crop&q=80',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [type, id]);

  const pricePaisePerPerson = itemData?.price_paise || 50000;
  const totalPricePaise = pricePaisePerPerson * guests;

  const startRazorpayPayment = async () => {
    const isLoaded = await loadScript('https://checkout.razorpay.com/v1/checkout.js');
    if (!isLoaded) {
      toast.error('Failed to load payment gateway. Please retry.');
      setIsProcessing(false);
      return;
    }

    const rzpKey = import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_VyBhZExTMTk5';

    const options = {
      key: rzpKey,
      amount: totalPricePaise,
      currency: 'INR',
      name: 'Vyhbz Experiences',
      description: `${itemData?.title} (${guests} Guests)`,
      handler: async function (response: any) {
        toast.info('Payment verified! Confirming booking...');
        try {
          if (type?.toLowerCase() === 'event' && itemData?.tier_id) {
            await createBooking({
              type: 'EVENT',
              ref_id: itemData.tier_id,
              title: itemData.title,
              venue: itemData.venue,
              location: itemData.location,
              booking_date: date,
              guests,
              total_price: totalPricePaise / 100,
            });
          }
          setSuccess(true);
          setTimeout(() => navigate('/profile'), 2000);
        } catch (err: any) {
          toast.error(err.message || 'Booking confirmation failed.');
        } finally {
          setIsProcessing(false);
        }
      },
      prefill: {
        name: user?.full_name || 'Customer',
        email: user?.email || 'customer@vybhz.com',
        contact: user?.phone || '9999999999',
      },
      theme: {
        color: '#f59e0b',
      },
      modal: {
        ondismiss: function () {
          toast.warning('Payment canceled.');
          setIsProcessing(false);
        },
      },
    };

    const rzp = new (window as any).Razorpay(options);
    rzp.open();
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsProcessing(true);

    try {
      await startRazorpayPayment();
    } catch {
      setError('Checkout failed. Please try again.');
      setIsProcessing(false);
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

  if (success) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex flex-col">
        <Header />
        <div className="flex flex-grow items-center justify-center px-4">
          <div className="text-center bg-neutral-900 border border-neutral-800 p-8 rounded-2xl max-w-md w-full shadow-2xl">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h1 className="text-2xl font-black">Booking Confirmed!</h1>
            <p className="mt-2 text-sm text-neutral-400">
              Your reservation for <strong className="text-white">{itemData?.title}</strong> has been secured.
            </p>
            <p className="mt-4 text-xs text-amber-500 font-semibold">
              Redirecting to your profile...
            </p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col">
      <Header />

      <main className="flex-grow max-w-4xl w-full mx-auto px-4 pt-24 pb-12 sm:px-6 lg:px-8">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        <h1 className="mt-4 text-3xl md:text-4xl font-black tracking-tight">
          Complete your booking
        </h1>

        {error && (
          <div className="mt-6 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
            {error}
          </div>
        )}

        <div className="mt-8 grid gap-8 lg:grid-cols-2 items-start">
          {/* Summary Card */}
          <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900 shadow-soft">
            <div className="relative aspect-[16/9] overflow-hidden bg-neutral-800">
              <img
                src={itemData.image}
                alt={itemData.title}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="p-6">
              <h2 className="text-2xl font-bold">
                {itemData.title}
              </h2>
              <p className="mt-1 text-sm text-neutral-400">
                {itemData.venue}
              </p>
              <div className="mt-3 flex items-center gap-3 text-xs text-neutral-400">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-amber-500" />
                  {itemData.location}
                </span>
              </div>

              <div className="mt-6 space-y-3 border-t border-neutral-800 pt-4">
                <div className="flex justify-between text-sm text-neutral-400">
                  <span>Price per person</span>
                  <span className="font-bold text-white">{formatRupees(pricePaisePerPerson)}</span>
                </div>
                <div className="flex justify-between text-sm text-neutral-400">
                  <span>Guests</span>
                  <span className="font-bold text-white">{guests}</span>
                </div>
                <div className="flex justify-between border-t border-neutral-800 pt-3 items-center">
                  <span className="text-base font-bold text-neutral-300">Total</span>
                  <span className="text-2xl font-black text-amber-400">
                    {formatRupees(totalPricePaise)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleBooking} className="space-y-5 bg-neutral-900 border border-neutral-800 p-6 rounded-2xl">
            <div className="space-y-2">
              <Label htmlFor="date" className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                <Calendar className="mr-1 inline h-4 w-4 text-amber-500" /> Select Date
              </Label>
              <Input
                id="date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-11 rounded-xl bg-neutral-950 border-neutral-800 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="guests" className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                <Users className="mr-1 inline h-4 w-4 text-amber-500" /> Number of Guests / Tickets
              </Label>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 rounded-xl bg-neutral-950 border-neutral-800 text-white hover:bg-neutral-800"
                  onClick={() => setGuests((g) => Math.max(1, g - 1))}
                >
                  -
                </Button>
                <Input
                  id="guests"
                  type="number"
                  min={1}
                  max={20}
                  value={guests}
                  onChange={(e) => setGuests(Number(e.target.value) || 1)}
                  className="h-11 rounded-xl text-center bg-neutral-950 border-neutral-800 text-white font-bold"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 rounded-xl bg-neutral-950 border-neutral-800 text-white hover:bg-neutral-800"
                  onClick={() => setGuests((g) => Math.min(20, g + 1))}
                >
                  +
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Contact Details</Label>
              <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4 text-sm">
                <p className="font-bold text-white">
                  {user?.full_name || 'Customer'}
                </p>
                <p className="text-neutral-400 text-xs mt-0.5">{user?.email}</p>
                {user?.phone && (
                  <p className="text-neutral-400 text-xs mt-0.5">{user.phone}</p>
                )}
              </div>
            </div>

            <Button
              type="submit"
              disabled={isProcessing}
              className="h-12 w-full rounded-xl bg-amber-500 hover:bg-amber-600 text-black text-base font-extrabold shadow-lg transition-all"
            >
              {isProcessing ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  Pay {formatRupees(totalPricePaise)}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>

            <div className="flex items-center justify-center gap-1.5 text-xs text-neutral-500 pt-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              Secured by Razorpay Sandbox
            </div>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}
