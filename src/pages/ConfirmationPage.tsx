import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CheckCircle2 } from "lucide-react";
import { api, unwrap } from "@/api/client";
import { LoadingPage } from "./LoadingPage";
import { BookingCard } from "./BookingCard";

export default function ConfirmationPage() {
  const [params] = useSearchParams();
  const id = params.get("id") ?? "";

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const data = await unwrap<any>(api.get(`/bookings/${id}`));
        setBooking(data);
      } catch {
        setBooking(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const isDining = booking?.category === "dining";
  const isEvent = booking?.type === "EVENT" || booking?.category;
  const backLabel = isDining ? "Back to dining" : isEvent ? "Back to events" : "Back to movies";
  const backPath = isDining ? "/dining" : isEvent ? "/events" : "/movies";

  const adapted = booking
    ? {
        ...booking,
        type: booking.type || (booking.tier_id || booking.event_id ? "EVENT" : "MOVIE"),
        image_url: booking.poster_url ?? booking.image_url ?? null,
        total_price:
          typeof booking.total_paise === "number"
            ? booking.total_paise / 100
            : (booking.total_price ?? 0),
      }
    : null;

  return (
    <div className="min-h-screen bg-[#F5F5FA] flex flex-col">
      <Header />

      <main className="flex-grow flex items-start justify-center p-6 pt-[128px] lg:pt-[144px]">
        <div className="max-w-md w-full">
          <div className="text-center mb-6">
            <CheckCircle2 className="w-16 h-16 text-[#1EA83C] mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Booking confirmed</h1>
            <p className="text-slate-500 text-sm">
              Show this QR at the entrance.
            </p>
          </div>

          {loading ? (
            <div className="bg-white rounded-2xl shadow-lg p-8 flex justify-center">
              <LoadingPage showFooter={false} />
            </div>
          ) : !adapted ? (
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
              <p className="text-slate-600 text-sm">
                We couldn't load your ticket. Please check your bookings.
              </p>
              <Link
                to="/profile?tab=orders"
                className="mt-4 inline-block text-[#7B1E3D] font-semibold hover:underline"
              >
                Go to My Bookings
              </Link>
            </div>
          ) : (
            <>
              <BookingCard booking={adapted} />

              <div className="mt-6 text-center">
                <Link
                  to={backPath}
                  className="block w-full bg-[#7B1E3D] hover:bg-[#5C0F2A] text-white font-bold py-3 rounded-lg transition"
                >
                  {backLabel}
                </Link>
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
