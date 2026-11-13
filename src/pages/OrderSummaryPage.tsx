import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertCircle, ChevronLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api, unwrap } from "@/api/client";
import { useAuth } from "@/hooks/useAuth";
import { formatRupees } from "@/utils/currencyFormatter";
import { payForBooking, preloadRazorpayScript } from "@/lib/razorpayCheckout";
import {
  isValidIndianMobile,
  sanitizeMobileNumber,
  getSavedContactDetails,
} from "@/utils/validators";
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
    preloadRazorpayScript();
    (async () => {
      try {
        const data = await unwrap<any>(api.get(`/bookings/${bookingId}`));
        setB(data);
        const saved = getSavedContactDetails();
        setEmail(
          data.contact_email ||
            saved.email ||
            user?.email ||
            "",
        );
        setPhone(
          sanitizeMobileNumber(
            data.contact_phone || saved.phone || (user as any)?.phone || "",
          ),
        );
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

  const release = () => {
    api.delete(`/bookings/hold/${bookingId}`).catch(() => {});
    navigate(seatMapUrl, { replace: true });
  };

  const isProvider = b?.payment_mode === "PROVIDER";

  const pay = async () => {
    const cleanEmail = email.trim();
    const cleanPhone = sanitizeMobileNumber(phone);

    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    if (!isValidIndianMobile(cleanPhone)) {
      toast.error("Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.");
      return;
    }
    localStorage.setItem(
      "vyhbz_contact_details",
      JSON.stringify({ email: cleanEmail, phone: cleanPhone }),
    );
    setPaying(true);
    try {
      const seats = (b.seat_codes || []).join(", ");
      const res = await payForBooking({
        bookingId: bookingId!,
        description: `${b.movie_title} - Seats: ${seats}`,
        prefill: { name: user?.full_name, email: cleanEmail, contact: cleanPhone },
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

  return (
    <div className="min-h-screen bg-[#F5F5FA]">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] pb-3">
        <div className="max-w-[900px] mx-auto px-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate(`/bookings/${bookingId}/food`)}
              className="p-1 hover:bg-gray-100 rounded-full cursor-pointer"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <div className="min-w-0">
              <p className="text-sm font-bold truncate">{b.movie_title || b.title}</p>
              <p className="text-[11px] text-gray-500 truncate">
                {b.cinema_name || b.venue_name || b.screen_name || "Cinema"} |{" "}
                {new Date(b.starts_at).toLocaleString("en-IN")}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[900px] mx-auto px-4 py-4 grid gap-4 md:grid-cols-[1fr_340px]">
        {/* left: contact */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3 h-fit">
          <h2 className="text-sm font-bold">Your details</h2>
          <div>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value.trim())}
              placeholder="Email"
              type="email"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:border-[#7B1E3D]"
            />
            {email.length > 0 && !/^\S+@\S+\.\S+$/.test(email) && (
              <p className="text-[11px] text-rose-500 mt-1 font-medium flex items-center gap-1">
                <AlertCircle className="h-3 w-3 shrink-0" />
                Please enter a valid email address
              </p>
            )}
          </div>
          <div>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-xs font-bold text-gray-500 border-r border-gray-200 pr-2">
                +91
              </span>
              <input
                value={phone}
                onChange={(e) =>
                  setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
                }
                placeholder="10-digit mobile number"
                inputMode="tel"
                maxLength={10}
                className="w-full pl-14 pr-3 py-2 text-sm border border-gray-300 rounded outline-none focus:border-[#7B1E3D]"
              />
            </div>
            {phone.length > 0 && !isValidIndianMobile(phone) && (
              <p className="text-[11px] text-rose-500 mt-1 font-medium flex items-center gap-1">
                <AlertCircle className="h-3 w-3 shrink-0" />
                {phone.length < 10
                  ? `10-digit mobile number required (${10 - phone.length} more digit${10 - phone.length === 1 ? "" : "s"})`
                  : "Mobile number must start with 6, 7, 8, or 9"}
              </p>
            )}
          </div>
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

            {b.convenience_fee_paise > 0 && (() => {
              const baseFee = Math.round(b.convenience_fee_paise / 1.18);
              const gst = b.convenience_fee_paise - baseFee;
              const cgst = Math.round(gst / 2);
              const sgst = gst - cgst;
              return (
                <div className="space-y-1 pt-1 border-t border-gray-100">
                  <div className="flex justify-between text-gray-700">
                    <span>Convenience Fees</span>
                    <span className="font-semibold">{formatRupees(b.convenience_fee_paise)}</span>
                  </div>
                  <div className="pl-2.5 space-y-0.5 text-[11px] text-gray-500">
                    <div className="flex justify-between">
                      <span>• Base Handling Fee</span>
                      <span>{formatRupees(baseFee)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>• Integrated GST (9% CGST + 9% SGST)</span>
                      <span>{formatRupees(gst)}</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="border-t border-dashed border-gray-200 pt-3 flex justify-between text-sm">
              <span className="font-bold">Amount payable</span>
              <span className="font-bold">{formatRupees(b.total_paise)}</span>
            </div>
          </div>

          <div className="p-4 pt-0 space-y-2">
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
          </div>
        </div>
      </div>
    </div>
  );
}