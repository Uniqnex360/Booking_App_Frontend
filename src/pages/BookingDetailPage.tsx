import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Loader } from '@/components/common/Loader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getBookingById, cancelBooking } from '@/api/booking.api';
import type { BookingDetail } from '@/types/booking.types';
import { formatRupees } from '@/utils/currencyFormatter';
import { toast } from 'sonner';
import { ArrowLeft, Clock, MapPin, Ticket, AlertCircle, Calendar } from 'lucide-react';

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const data = await getBookingById(id);
        setBooking(data);
      } catch {
        toast.error('Could not load booking');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleCancel = async () => {
    if (!booking) return;
    if (!window.confirm('Cancel this booking? This cannot be undone.')) return;
    setCancelling(true);
    try {
      await cancelBooking(booking.id);
      toast.success('Booking cancelled');
      navigate('/profile');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Cancel failed';
      toast.error(message);
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col">
        <Header />
        <div className="flex-grow flex items-center justify-center">
          <Loader />
        </div>
        <Footer />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col">
        <Header />
        <div className="flex-grow flex flex-col items-center justify-center py-20">
          <AlertCircle className="h-10 w-10 text-rose-500 mb-3" />
          <p className="text-slate-700 font-medium">Booking not found</p>
          <Button asChild variant="outline" className="mt-4 rounded-full">
            <Link to="/profile">Back to profile</Link>
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  const isMovie = booking.type === 'MOVIE' && !!booking.starts_at;
  const isEvent = booking.type === 'EVENT' && !!booking.starts_at;
  const isCancellable = booking.status === 'CONFIRMED' || booking.status === 'HELD';
  const showtime = booking.starts_at ? new Date(booking.starts_at) : null;
  const seats = booking.seat_codes ?? [];
  const qty = booking.quantity ?? seats.length ?? booking.guests ?? 1;

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <Header />

      <main className="flex-grow max-w-3xl w-full mx-auto px-4 pt-24 lg:pt-32 pb-16">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          {/* Header strip */}
          <div className="bg-gradient-to-br from-[#5C0F2A] via-[#7B1E3D] to-[#3A0718] px-6 py-4 flex items-center justify-between">
            <div className="text-white">
              <p className="text-[11px] font-bold uppercase tracking-wider opacity-90">
                {booking.status === 'CONFIRMED' ? 'Confirmed ticket' : booking.status}
              </p>
              <p className="text-lg font-extrabold mt-0.5">
                {booking.ref_code ?? booking.id.slice(0, 8)}
              </p>
            </div>
            <Ticket className="h-8 w-8 text-white/80" />
          </div>

          <div className="p-6">
            {/* ── MOVIE ── */}
            {isMovie && (
              <div className="flex flex-col sm:flex-row gap-5">
                {booking.poster_url && (
                  <div className="w-32 shrink-0">
                    <div className="aspect-[2/3] rounded-xl overflow-hidden bg-neutral-100">
                      <img
                        src={booking.poster_url}
                        alt={booking.movie_title ?? 'Poster'}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}
                <div className="flex-grow min-w-0">
                  <h1 className="text-2xl font-extrabold text-slate-900 leading-tight">
                    {booking.movie_title ?? 'Movie'}
                  </h1>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 mt-1">
                    {[booking.certificate, booking.format, booking.language]
                      .filter(Boolean)
                      .join(' • ')}
                  </p>
                  {booking.duration_min && (
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {Math.floor(booking.duration_min / 60)}h {booking.duration_min % 60}m
                    </p>
                  )}
                  {showtime && (
                    <p className="text-sm font-semibold text-slate-800 mt-3 flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 text-[#7B1E3D]" />
                      {showtime.toLocaleString([], {
                        weekday: 'short', day: 'numeric', month: 'short',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  )}
                  {(booking.cinema_name || booking.screen_name) && (
                    <p className="text-sm text-slate-700 mt-2">
                      {booking.cinema_name}
                      {booking.screen_name ? `, ${booking.screen_name}` : ''}
                    </p>
                  )}
                  {booking.cinema_address && (
                    <p className="text-xs text-slate-500 mt-1 flex items-start gap-1.5">
                      <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      {booking.cinema_address}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* ── EVENT ── */}
            {isEvent && (
              <div className="flex flex-col sm:flex-row gap-5">
                {booking.poster_url && (
                  <div className="w-32 shrink-0">
                    <div className="aspect-[2/3] rounded-xl overflow-hidden bg-neutral-100">
                      <img
                        src={booking.poster_url}
                        alt={booking.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}
                <div className="flex-grow min-w-0">
                  <h1 className="text-2xl font-extrabold text-slate-900 leading-tight">
                    {booking.title}
                  </h1>
                  {(booking.category || booking.age_restriction) && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {booking.category && (
                        <Badge className="rounded-md bg-[#7B1E3D]/5 text-[#7B1E3D] border border-[#7B1E3D]/30 text-[11px] font-bold uppercase">
                          {booking.category}
                        </Badge>
                      )}
                      {booking.age_restriction && (
                        <Badge className="rounded-md bg-rose-50 text-rose-600 border border-rose-200 text-[11px] font-bold">
                          {booking.age_restriction}
                        </Badge>
                      )}
                    </div>
                  )}
                  {showtime && (
                    <p className="text-sm font-semibold text-slate-800 mt-3 flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 text-[#7B1E3D]" />
                      {showtime.toLocaleString([], {
                        weekday: 'short', day: 'numeric', month: 'short',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  )}
                  {booking.venue_name && (
                    <p className="text-sm text-slate-700 mt-2">{booking.venue_name}</p>
                  )}
                  {booking.venue_address && (
                    <p className="text-xs text-slate-500 mt-1 flex items-start gap-1.5">
                      <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      {booking.venue_address}
                      {booking.city ? `, ${booking.city}` : ''}
                    </p>
                  )}
                  {booking.tier_name && (
                    <p className="text-xs text-slate-600 mt-2">
                      <span className="font-semibold">{qty} × </span>
                      {booking.tier_name}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* ── Fallback ── */}
            {!isMovie && !isEvent && (
              <div>
                <h1 className="text-2xl font-extrabold text-slate-900">
                  {booking.title ?? 'Booking'}
                </h1>
                {booking.venue && (
                  <p className="text-sm text-slate-500 mt-1">{booking.venue}</p>
                )}
              </div>
            )}

            {/* Divider */}
            <div className="border-t border-dashed border-slate-200 my-6" />

            {/* Seat chips (movies only) */}
            {isMovie && seats.length > 0 && (
              <div className="mb-6">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Seats
                </p>
                <div className="flex flex-wrap gap-2">
                  {seats.map((code) => (
                    <Badge
                      key={code}
                      className="rounded-md bg-[#7B1E3D]/5 text-[#7B1E3D] border border-[#7B1E3D]/30 text-xs font-bold px-2.5 py-1"
                    >
                      {code}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Payment summary */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3">
                Payment summary
              </p>
              <div className="space-y-2 text-sm">
                {(booking.unit_price_paise || booking.tier_price_paise) && qty > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>
                      {qty} × {formatRupees(booking.unit_price_paise ?? booking.tier_price_paise ?? 0)}
                    </span>
                    <span>{formatRupees(booking.total_paise)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-2 mt-2">
                  <span>Total paid</span>
                  <span>{formatRupees(booking.total_paise)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {isCancellable && (
          <div className="mt-6 flex justify-end">
            <Button
              onClick={handleCancel}
              disabled={cancelling}
              variant="outline"
              className="rounded-full border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
            >
              {cancelling ? 'Cancelling...' : 'Cancel ticket'}
            </Button>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}