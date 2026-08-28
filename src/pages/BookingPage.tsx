import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader } from '@/components/common/Loader';
import { useAuth } from '@/hooks/useAuth';
import { createBooking } from '@/api/booking.api';
import {
  Wine,
  Calendar,
  Users,
  ArrowLeft,
  ArrowRight,
  Loader2,
  CheckCircle2,
  MapPin,
} from 'lucide-react';
import { formatCurrency } from '@/utils/currencyFormatter';

export default function BookingPage() {
  const { type, id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [guests, setGuests] = useState(2);
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mockDetails: Record<string, { title: string; venue: string; location: string; price: number; image: string }> = {
    '1': {
      title: 'Sunset Vineyard Tour & Tasting',
      venue: 'Château Lumière Estate',
      location: 'Napa Valley, CA',
      price: 85,
      image: 'https://images.pexels.com/photos/20151747/pexels-photo-20151747.jpeg?auto=compress&cs=tinysrgb&h=400&w=600',
    },
    '2': {
      title: 'Jazz Night: Live Quartet',
      venue: 'The Velvet Room',
      location: 'Soho, NYC',
      price: 45,
      image: 'https://images.pexels.com/photos/13230484/pexels-photo-13230484.jpeg?auto=compress&cs=tinysrgb&h=400&w=600',
    },
  };

  const details = mockDetails[id || '1'] || {
    title: 'Experience Booking',
    venue: 'Venue',
    location: 'Location',
    price: 50,
    image: 'https://images.pexels.com/photos/941861/pexels-photo-941861.jpeg?auto=compress&cs=tinysrgb&h=400&w=600',
  };

  const totalPrice = details.price * guests;

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await createBooking({
        type: type?.toUpperCase() as 'MOVIE' | 'EVENT' | 'RESTAURANT',
        ref_id: id || '',
        title: details.title,
        venue: details.venue,
        location: details.location,
        booking_date: date,
        guests,
        total_price: totalPrice,
      });
      setSuccess(true);
      setTimeout(() => navigate('/profile'), 2000);
    } catch {
      setError('Booking failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="animate-scale-in text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-success/10">
              <CheckCircle2 className="h-10 w-10 text-success" />
            </div>
            <h1 className="font-serif text-3xl font-semibold text-wine-950">
              Booking Confirmed!
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your reservation for {details.title} has been confirmed.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Redirecting to your profile...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="mx-auto max-w-4xl px-4 pt-28 sm:px-6 lg:px-8">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-wine-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>

        <h1 className="mt-4 font-serif text-4xl font-semibold text-wine-950">
          Complete your booking
        </h1>

        {error && (
          <div className="mt-6 animate-slide-down rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          {/* Summary */}
          <div className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-soft">
            <div className="relative aspect-[16/9] overflow-hidden">
              <img
                src={details.image}
                alt={details.title}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="p-5">
              <h2 className="font-serif text-2xl font-semibold text-wine-950">
                {details.title}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {details.venu}
              </p>
              <div className="mt-3 flex items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {details.location}
                </span>
              </div>
              <div className="mt-6 space-y-3 border-t border-border/50 pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Price per person</span>
                  <span className="font-medium">{formatCurrency(details.price)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Guests</span>
                  <span className="font-medium">{guests}</span>
                </div>
                <div className="flex justify-between border-t border-border/50 pt-3">
                  <span className="font-serif text-lg font-semibold text-wine-950">
                    Total
                  </span>
                  <span className="font-serif text-2xl font-semibold text-wine-700">
                    {formatCurrency(totalPrice)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleBooking} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="date" className="text-sm font-medium">
                <Calendar className="mr-1 inline h-4 w-4" />
                Select date
              </Label>
              <Input
                id="date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="guests" className="text-sm font-medium">
                <Users className="mr-1 inline h-4 w-4" />
                Number of guests
              </Label>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 rounded-xl"
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
                  className="h-11 rounded-xl text-center"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 rounded-xl"
                  onClick={() => setGuests((g) => Math.min(20, g + 1))}
                >
                  +
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Guest details</Label>
              <div className="rounded-xl border border-border/50 bg-card p-4 text-sm">
                <p className="font-medium text-foreground">
                  {user?.full_name || 'Guest'}
                </p>
                <p className="text-muted-foreground">{user?.email}</p>
                {user?.phone && (
                  <p className="text-muted-foreground">{user.phone}</p>
                )}
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-xl bg-wine-700 text-sm font-semibold shadow-wine transition-all hover:bg-wine-800 hover:shadow-wine-lg"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Confirm booking — {formatCurrency(totalPrice)}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </div>
      </div>

      <div className="h-20" />
    </div>
  );
}
