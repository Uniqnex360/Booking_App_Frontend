import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api, unwrap } from "@/api/client";
import { useAuth } from "@/hooks/useAuth";
import { formatRupees } from "@/utils/currencyFormatter";
import { payForBooking } from "@/lib/razorpayCheckout";
import { LoadingPage } from "./LoadingPage";

export default function OrderSummaryPage() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [b, setB] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [left, setLeft] = useState(0);
  const [paying, setPaying] = useState(false);

  const seatMapUrl = b ? `/showtimes/${b.showtime_id}/seat-map` : "/";

  useEffect(() => {
    (async () => {
      try {
        const data = await unwrap<any>(api.get(`/bookings/${bookingId}`));
        setB(data);
        const saved = JSON.parse(localStorage.getItem("vyhbz_contact_details") || "{}");
        setEmail(data.contact_email || saved.email || user?.email || "");
        setPhone(data.contact_phone || saved.phone || (user as any)?.phone || "");
      } catch {
        toast.error("Booking not found or expired.");
        navigate("/", { replace: true });
      }
    })();
  }, [bookingId]);

  // hold countdown
  useEffect(() => {
    if (!b?.held_until) return;
    const tick = () => {
      const s = Math.max(0, Math.floor((new Date(b.held_until).getTime() - Date.now()) / 1000));
      setLeft(s);
      if (s === 0) {
        toast.error("Hold expired. Please select seats again.");
        navigate(seatMapUrl, { replace: true });
      }
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [b]);

  const release = async () => {
    try { await api.delete(`/bookings/hold/${bookingId}`); } catch {}
    navigate(seatMapUrl, { replace: true });
  };

  const isProvider = b?.payment_mode === "PROVIDER";

  const pay = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email) || phone.replace(/\D/g, "").length < 10) {
      toast.error("Enter a valid email and 10 digit phone.");
      return;
    }
    localStorage.setItem("vyhbz_contact_details", JSON.stringify({ email, phone }));
    setPaying(true);
    try {
      const seats = (b.seat_codes || []).join(", ");
      const res = await payForBooking({
        bookingId: bookingId!,
        description: `${b.movie_title} - Seats: ${seats}`,
        prefill: { name: user?.full_name, email, contact: phone },
      });

      if (res.kind === "DISMISSED") {
        toast.warning("Payment cancelled. Seats are still on hold for a short time.");
      } else {
        // PAID (or NOT_REQUIRED): fetch booking once for ref_code
        const done = await unwrap<any>(api.get(`/bookings/${bookingId}`));
        navigate(
          `/confirmation?id=${bookingId}&ref=${encodeURIComponent(done.ref_code ?? "")}`,
          { replace: true },
        );
      }
    } catch (e: any) {
      if (e?.afterPayment) {
        toast.error(
          `Payment done but confirmation failed. Contact support with Payment ID: ${e.paymentId}`,
          { duration: 15000 },
        );
      } else if (e?.code === "PAYMENT_NOT_AVAILABLE_HERE") {
        setB((x: any) => ({ ...x, payment_mode: "PROVIDER" }));
      } else if (e?.code === "HOLD_TOO_SHORT") {
        toast.error("Not enough hold time left to pay. Please select seats again.");
        release();
      } else if (e?.code === "BOOKING_NOT_PAYABLE") {
        toast.error("This booking can no longer be paid.");
        navigate(seatMapUrl, { replace: true });
      } else {
        toast.error(e?.message || "Payment failed.");
      }
    } finally {
      setPaying(false);
    }
  };

  if (!b) return <LoadingPage showFooter={false} />;

  const mm = Math.floor(left / 60);
  const ss = String(left % 60).padStart(2, "0");

  return (
    <div className="min-h-screen bg-[#F5F5FA]">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-[900px] mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate(`/bookings/${bookingId}/food`)}
              className="p-1 hover:bg-gray-100 rounded-full cursor-pointer"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <div className="min-w-0">
              <p className="text-sm font-bold truncate">{b.movie_title}</p>
              <p className="text-[11px] text-gray-500 truncate">
                {b.venue_name} | {new Date(b.starts_at).toLocaleString("en-IN")}
              </p>
            </div>
          </div>
          <div className="bg-[#7B1E3D] text-white px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 shrink-0">
            <Clock className="h-3 w-3" /> {mm}:{ss}
          </div>
        </div>
      </div>

      <div className="max-w-[900px] mx-auto px-4 py-4 grid gap-4 md:grid-cols-[1fr_340px]">
        {/* left: contact */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3 h-fit">
          <h2 className="text-sm font-bold">Your details</h2>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            type="email"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:border-[#7B1E3D]"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Mobile number"
            inputMode="tel"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:border-[#7B1E3D]"
          />
          <p className="text-[11px] text-gray-500">
            Your e-ticket will be sent to these details.
          </p>
        </div>

        {/* right: summary */}
        <div className="bg-white rounded-lg border border-gray-200 h-fit">
          <div className="px-4 py-3 border-b border-gray-100 text-sm font-bold">
            Order Summary
          </div>
          <div className="px-4 py-3 space-y-2 text-xs">
            <div className="flex justify-between gap-3">
              <span className="text-gray-600">
                Tickets ({(b.seat_codes || []).join(", ")})
              </span>
              <span className="font-semibold">{formatRupees(b.ticket_paise)}</span>
            </div>

            {(b.fnb_lines || []).map((l: any) => (
              <div key={l.item_id} className="flex justify-between gap-3">
                <span className="text-gray-600">
                  {l.name} × {l.quantity}
                </span>
                <span className="font-semibold">
                  {formatRupees(l.unit_price_paise * l.quantity)}
                </span>
              </div>
            ))}

            {b.convenience_fee_paise > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Convenience fees</span>
                <span className="font-semibold">{formatRupees(b.convenience_fee_paise)}</span>
              </div>
            )}

            <div className="border-t border-dashed border-gray-200 pt-3 flex justify-between text-sm">
              <span className="font-bold">Amount payable</span>
              <span className="font-bold">{formatRupees(b.total_paise)}</span>
            </div>
          </div>

          <div className="p-4 pt-0 space-y-2">
            {isProvider ? (
              <>
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-3">
                  Payment for this showtime is handled at the venue. Your seats are held. Pay at the box office before the show.
                </p>
                <button
                  onClick={release}
                  className="w-full border border-gray-300 text-gray-700 font-semibold py-2.5 rounded-lg text-sm cursor-pointer"
                >
                  Release seats
                </button>
              </>
            ) : (
              <>
                <p className="text-[10px] text-gray-500">
                  By proceeding, I express my consent to complete this transaction.
                </p>
                <button
                  onClick={pay}
                  disabled={paying}
                  className="w-full bg-[#D6445B] hover:bg-[#c33a4f] disabled:opacity-60 text-white font-bold py-3 rounded-lg text-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  {paying ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Processing...
                    </>
                  ) : (
                    <>Proceed to pay {formatRupees(b.total_paise)}</>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}