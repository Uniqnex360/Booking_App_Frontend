import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Clock, Loader2, ShieldCheck, Ticket } from "lucide-react";
import { toast } from "sonner";
import { api, unwrap } from "@/api/client";
import { useAuth } from "@/hooks/useAuth";
import { formatRupees } from "@/utils/currencyFormatter";
import { payForBooking } from "@/lib/razorpayCheckout";
import { FoodStep } from "./FoodStep";
import type { FnbItem } from "./FoodStep";
import { TermsModal } from "./TermsModal";
import AuthModal from "./AuthModal";
import { LoadingPage } from "./LoadingPage";

type Contact = { email: string; phone: string };

export default function FoodPage() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [booking, setBooking] = useState<any>(null);
  const [menu, setMenu] = useState<FnbItem[]>([]);
  const [noMenu, setNoMenu] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [leftSeconds, setLeftSeconds] = useState(0);

  // Contact inputs on Summary view
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  const seatMapUrl = booking
    ? `/showtimes/${booking.showtime_id}/seat-map`
    : "/";

  // Initial load: booking + optional FnB menu
  useEffect(() => {
    (async () => {
      try {
        const b = await unwrap<any>(api.get(`/bookings/${bookingId}`));
        setBooking(b);

        const saved = JSON.parse(
          localStorage.getItem("vyhbz_contact_details") || "{}",
        );
        setContactEmail(b.contact_email || saved.email || user?.email || "");
        setContactPhone(
          b.contact_phone || saved.phone || (user as any)?.phone || "",
        );

        const pre: Record<string, number> = {};
        (b.fnb_lines || []).forEach((l: any) => {
          pre[l.item_id] = l.quantity;
        });
        setCart(pre);

        // Fetch FnB menu with graceful fallback
        try {
          const res = await unwrap<{ items: FnbItem[] }>(
            api.get(`/showtimes/${b.showtime_id}/fnb-menu`),
          );
          const m = res?.items ?? [];
          if (!Array.isArray(m) || m.length === 0) {
            setNoMenu(true);
            setShowSummary(true);
          } else {
            setMenu(m);
          }
        } catch {
          // If FnB fails, do not abort booking; proceed directly to summary
          setNoMenu(true);
          setShowSummary(true);
        }
      } catch {
        toast.error("Booking not found or expired.");
        navigate("/", { replace: true });
      }
    })();
  }, [bookingId]);

  // Hold countdown ticker
  useEffect(() => {
    if (!booking?.held_until) return;
    const check = () => {
      const remaining = Math.max(
        0,
        Math.floor((new Date(booking.held_until).getTime() - Date.now()) / 1000),
      );
      setLeftSeconds(remaining);
      if (remaining === 0) {
        toast.error("Hold expired. Please select seats again.");
        navigate(seatMapUrl, { replace: true });
      }
    };
    check();
    const t = setInterval(check, 1000);
    return () => clearInterval(t);
  }, [booking]);

  const goBackToSeatMap = () => {
    api.delete(`/bookings/hold/${bookingId}`).catch(() => {});
    navigate(seatMapUrl, { replace: true });
  };

  const knownContact = (): Contact => {
    const saved = JSON.parse(
      localStorage.getItem("vyhbz_contact_details") || "{}",
    );
    return {
      email: contactEmail || booking?.contact_email || saved.email || user?.email || "",
      phone: contactPhone || booking?.contact_phone || saved.phone || (user as any)?.phone || "",
    };
  };

  const startPay = () => {
    const c = knownContact();
    const cleanPhone = c.phone.replace(/\D/g, "");
    if (!/^\S+@\S+\.\S+$/.test(c.email) || cleanPhone.length < 10) {
      setShowContact(true);
      return;
    }
    goPay(c);
  };

  const goPay = async (contact: Contact) => {
    if (saving) return;
    setSaving(true);
    try {
      // Sync FnB cart if items exist
      if (Object.keys(cart).length > 0) {
        try {
          await api.put(`/bookings/${bookingId}/fnb`, {
            items: Object.entries(cart)
              .filter(([, q]) => q > 0)
              .map(([item_id, quantity]) => ({ item_id, quantity })),
          });
        } catch {
          // Non-critical
        }
      }

      // Sync contact details
      try {
        await api.patch(`/bookings/${bookingId}/contact`, {
          contact_email: contact.email,
          contact_phone: contact.phone,
        });
      } catch {
        // Non-critical
      }

      const fresh = await unwrap<any>(api.get(`/bookings/${bookingId}`));
      setBooking(fresh);

      const res = await payForBooking({
        bookingId: bookingId!,
        description: `${fresh.movie_title || fresh.title} - Seats: ${(
          fresh.seat_codes || []
        ).join(", ")}`,
        prefill: {
          name: user?.full_name,
          email: contact.email,
          contact: contact.phone,
        },
        onConfirming: () => setIsConfirming(true),
      });

      if (res.kind === "DISMISSED") {
        setIsConfirming(false);
        toast.warning(
          "Payment cancelled. Seats are still on hold for a short time.",
        );
        return;
      }

      setIsConfirming(true);
      let refCode = (res as any).refCode || "";
      if (!refCode) {
        try {
          const done = await unwrap<any>(api.get(`/bookings/${bookingId}`));
          refCode = done?.ref_code ?? "";
        } catch {
          // Proceed anyway
        }
      }
      navigate(
        `/confirmation?id=${bookingId}&ref=${encodeURIComponent(refCode)}`,
        { replace: true },
      );
    } catch (e: any) {
      if (e?.afterPayment) {
        toast.error(
          `Payment done but confirmation failed. Contact support with Payment ID: ${e.paymentId}`,
          { duration: 15000 },
        );
      } else if (
        e?.code === "HOLD_EXPIRED" ||
        e?.code === "BOOKING_NOT_PAYABLE" ||
        e?.code === "BOOKING_NOT_FOUND"
      ) {
        toast.error("Hold expired. Please select seats again.");
        navigate(seatMapUrl, { replace: true });
      } else if (e?.code === "HOLD_TOO_SHORT") {
        toast.error(
          "Not enough hold time left to pay. Please select seats again.",
        );
        goBackToSeatMap();
      } else if (e?.code === "PAYMENT_NOT_AVAILABLE_HERE") {
        toast.info("Payment for this show is at the venue. Your seats are held.");
        navigate(`/confirmation?id=${bookingId}`, { replace: true });
      } else {
        toast.error(e?.message || "Payment failed.");
      }
    } finally {
      setSaving(false);
      setIsConfirming(false);
    }
  };

  if (!booking) {
    return <LoadingPage showFooter={false} />;
  }

  const mm = Math.floor(leftSeconds / 60);
  const ss = String(leftSeconds % 60).padStart(2, "0");
  const isProvider = booking?.payment_mode === "PROVIDER";

  return (
    <>
      {/* ── 1. Food Step View (Shown only when menu items exist and summary is not open) ── */}
      {!noMenu && !showSummary && !isConfirming && (
        <FoodStep
          isOpen
          title={booking.movie_title || booking.title}
          subtitle={`${
            booking.cinema_name || booking.venue_name || booking.screen_name || "Cinema"
          } | ${new Date(booking.starts_at).toLocaleString("en-IN")}`}
          ticketPaise={booking.ticket_paise}
          menu={menu}
          cart={cart}
          setCart={setCart}
          onBack={goBackToSeatMap}
          onProceed={() => setShowSummary(true)}
          loading={saving}
        />
      )}

      {/* ── 2. Order Summary View (Shown when noMenu is true, or user clicked Proceed from food) ── */}
      {(noMenu || showSummary) && !isConfirming && (
        <div className="min-h-screen bg-[#F5F5FA] flex flex-col font-sans text-gray-900">
          {/* Header with Safe Area Padding */}
          <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-xs pt-[calc(0.75rem+env(safe-area-inset-top,0px))] pb-3">
            <div className="max-w-[900px] mx-auto px-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => {
                    if (!noMenu) {
                      setShowSummary(false);
                    } else {
                      goBackToSeatMap();
                    }
                  }}
                  className="p-1 hover:bg-gray-100 rounded-full cursor-pointer text-gray-700 hover:text-black transition"
                  title="Back"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate">
                    {booking.movie_title || booking.title}
                  </p>
                  <p className="text-[11px] text-gray-500 truncate">
                    {booking.cinema_name ||
                      booking.venue_name ||
                      booking.screen_name ||
                      "Cinema"}{" "}
                    | {new Date(booking.starts_at).toLocaleString("en-IN")}
                  </p>
                </div>
              </div>
              <div className="bg-[#7B1E3D] text-white px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 shrink-0 animate-pulse">
                <Clock className="h-3 w-3" /> {mm}:{ss}
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="max-w-[900px] mx-auto w-full px-4 py-4 grid gap-4 md:grid-cols-[1fr_360px] pb-24">
            {/* Left Column: Contact Details */}
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-gray-900">
                    Your Contact Details
                  </h2>
                  <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5" /> For M-Tickets
                  </span>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                    Email Address
                  </label>
                  <input
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="name@example.com"
                    type="email"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#7B1E3D] focus:ring-1 focus:ring-[#7B1E3D]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                    Mobile Number
                  </label>
                  <input
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="10-digit mobile number"
                    inputMode="tel"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#7B1E3D] focus:ring-1 focus:ring-[#7B1E3D]"
                  />
                </div>
                <p className="text-[11px] text-gray-500">
                  Your verified e-ticket and booking reference will be sent to
                  these details.
                </p>
              </div>

              {/* Terms card */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs">
                <button
                  type="button"
                  onClick={() => setShowTerms(true)}
                  className="text-xs text-[#7B1E3D] font-semibold hover:underline flex items-center justify-between w-full"
                >
                  <span>Review Booking Terms &amp; Cancellation Policy</span>
                  <span>&rarr;</span>
                </button>
              </div>
            </div>

            {/* Right Column: Order Breakdown & Payment Button */}
            <div className="bg-white rounded-xl border border-gray-200 h-fit shadow-xs overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 text-sm font-bold flex items-center gap-2">
                <Ticket className="h-4 w-4 text-[#7B1E3D]" />
                <span>Order Summary</span>
              </div>
              <div className="p-4 space-y-3 text-xs">
                {/* Tickets */}
                <div className="flex justify-between gap-3">
                  <span className="text-gray-600">
                    Tickets ({(booking.seat_codes || []).join(", ")})
                  </span>
                  <span className="font-semibold">
                    {formatRupees(booking.ticket_paise)}
                  </span>
                </div>

                {/* Food items (if any added) */}
                {Object.entries(cart)
                  .filter(([, q]) => q > 0)
                  .map(([itemId, q]) => {
                    const menuItem = menu.find((m) => m.id === itemId);
                    return (
                      <div key={itemId} className="flex justify-between gap-3 text-gray-600">
                        <span>
                          {menuItem?.name || "Snack"} × {q}
                        </span>
                        <span className="font-semibold text-gray-900">
                          {formatRupees((menuItem?.price_paise || 0) * q)}
                        </span>
                      </div>
                    );
                  })}

                {/* Convenience fee */}
                {booking.convenience_fee_paise > 0 && (
                  <div className="space-y-1 pt-2 border-t border-gray-100 text-gray-600">
                    <div className="flex justify-between">
                      <span>Convenience Fees &amp; Taxes</span>
                      <span className="font-semibold text-gray-900">
                        {formatRupees(booking.convenience_fee_paise)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Amount Payable */}
                <div className="border-t border-dashed border-gray-200 pt-3 flex justify-between text-sm">
                  <span className="font-bold text-gray-900">Amount Payable</span>
                  <span className="font-black text-[#7B1E3D] text-base">
                    {formatRupees(
                      (booking.total_paise || booking.ticket_paise || 0) +
                        Object.entries(cart).reduce((acc, [id, q]) => {
                          const item = menu.find((m) => m.id === id);
                          return acc + (item ? item.price_paise * q : 0);
                        }, 0),
                    )}
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="p-4 pt-0 space-y-2">
                {isProvider ? (
                  <>
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 leading-relaxed">
                      Payment for this showtime is handled directly at the cinema
                      counter. Your seats are held. Pay at the box office before
                      the show.
                    </p>
                    <button
                      type="button"
                      onClick={goBackToSeatMap}
                      className="w-full border border-gray-300 text-gray-700 font-semibold py-2.5 rounded-lg text-sm cursor-pointer hover:bg-gray-50 transition"
                    >
                      Release seats
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-[10px] text-gray-500 leading-tight">
                      By proceeding, you agree to our Terms of Service and
                      Cancellation Policy.
                    </p>
                    <button
                      type="button"
                      onClick={startPay}
                      disabled={saving}
                      className="w-full bg-[#7B1E3D] hover:bg-[#922549] active:bg-[#5C0F2A] disabled:opacity-60 text-white font-bold py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md transition"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Processing...
                        </>
                      ) : (
                        <>
                          Proceed to Pay{" "}
                          {formatRupees(
                            (booking.total_paise || booking.ticket_paise || 0) +
                              Object.entries(cart).reduce((acc, [id, q]) => {
                                const item = menu.find((m) => m.id === id);
                                return acc + (item ? item.price_paise * q : 0);
                              }, 0),
                          )}
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          </main>
        </div>
      )}

      {/* ── Modals ── */}
      <TermsModal
        isOpen={showTerms}
        onClose={() => setShowTerms(false)}
        onAccept={() => {
          setShowTerms(false);
          startPay();
        }}
      />

      <AuthModal
        isOpen={showContact}
        initialEmail={knownContact().email}
        initialPhone={knownContact().phone}
        onClose={() => setShowContact(false)}
        onSubmit={(d: Contact) => {
          setShowContact(false);
          setContactEmail(d.email);
          setContactPhone(d.phone);
          localStorage.setItem("vyhbz_contact_details", JSON.stringify(d));
          goPay(d);
        }}
      />

      {/* Confirming Overlay */}
      {isConfirming && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-3 bg-[#0f1117] text-white px-6 text-center">
          <Loader2 className="h-10 w-10 animate-spin text-emerald-400" />
          <p className="text-lg font-semibold">Confirming your payment...</p>
          <p className="text-sm text-white/80">
            Please do not close or refresh this page.
          </p>
        </div>
      )}
    </>
  );
}
