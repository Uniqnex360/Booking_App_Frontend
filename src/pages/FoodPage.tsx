import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { api, unwrap } from "@/api/client";
import { useAuth } from "@/hooks/useAuth";
import { payForBooking } from "@/lib/razorpayCheckout";
import { FoodStep } from "./FoodStep";
import type { FnbItem } from "./FoodStep";
import { TermsModal } from "./TermsModal";
import { LoadingPage } from "./LoadingPage";

export default function FoodPage() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [booking, setBooking] = useState<any>(null);
  const [menu, setMenu] = useState<FnbItem[]>([]);
  const [noMenu, setNoMenu] = useState(false);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const seatMapUrl = booking
    ? `/showtimes/${booking.showtime_id}/seat-map`
    : "/";

  // Load booking + menu
  useEffect(() => {
    (async () => {
      try {
        const b = await unwrap<any>(api.get(`/bookings/${bookingId}`));
        setBooking(b);

        // Pre-fill cart (user came back after cancelling payment)
        const pre: Record<string, number> = {};
        (b.fnb_lines || []).forEach((l: any) => {
          pre[l.item_id] = l.quantity;
        });
        setCart(pre);

        const m = await unwrap<FnbItem[]>(
          api.get(`/showtimes/${b.showtime_id}/fnb-menu`),
        );
        if (!Array.isArray(m) || m.length === 0) {
          setNoMenu(true); // no menu: go to Terms then pay seats only
          setShowTerms(true);
          return;
        }
        setMenu(m);
      } catch {
        toast.error("Booking not found or expired.");
        navigate("/", { replace: true });
      }
    })();
  }, [bookingId]);

  // Hold expiry: back to seat map
  useEffect(() => {
    if (!booking?.held_until) return;
    const check = () => {
      if (new Date(booking.held_until).getTime() <= Date.now()) {
        toast.error("Hold expired. Please select seats again.");
        navigate(seatMapUrl, { replace: true });
      }
    };
    check();
    const t = setInterval(check, 1000);
    return () => clearInterval(t);
  }, [booking]);

  // Back = release seats, return to seat map
  const goBack = async () => {
    try {
      await api.delete(`/bookings/hold/${bookingId}`);
    } catch {
      /* already released or expired */
    }
    navigate(seatMapUrl, { replace: true });
  };

  // Save food, then pay seats + food in one Razorpay payment
  const goPay = async () => {
    if (saving) return;
    setSaving(true);
    try {
      // 1. Save food. Empty cart clears it.
      await api.put(`/bookings/${bookingId}/fnb`, {
        items: Object.entries(cart)
          .filter(([, q]) => q > 0)
          .map(([item_id, quantity]) => ({ item_id, quantity })),
      });

      // 2. Provider-backed: no online payment
      const fresh = await unwrap<any>(api.get(`/bookings/${bookingId}`));
      if (fresh.payment_mode === "PROVIDER") {
        toast.info("Payment for this show is at the venue. Your seats are held.");
        navigate(`/confirmation?id=${bookingId}`, { replace: true });
        return;
      }

      // 3. Contact details for Razorpay prefill
      const saved = JSON.parse(
        localStorage.getItem("vyhbz_contact_details") || "{}",
      );
      const email = fresh.contact_email || saved.email || user?.email || "";
      const phone =
        fresh.contact_phone || saved.phone || (user as any)?.phone || "";

      // 4. Open Razorpay with the final amount
      const res = await payForBooking({
        bookingId: bookingId!,
        description: `${fresh.movie_title} - Seats: ${(
          fresh.seat_codes || []
        ).join(", ")}`,
        prefill: { name: user?.full_name, email, contact: phone },
      });

      if (res.kind === "DISMISSED") {
        toast.warning(
          "Payment cancelled. Seats are still on hold for a short time.",
        );
        return;
      }

      // 5. Paid: fetch ref_code once, go to confirmation
      const done = await unwrap<any>(api.get(`/bookings/${bookingId}`));
      navigate(
        `/confirmation?id=${bookingId}&ref=${encodeURIComponent(
          done.ref_code ?? "",
        )}`,
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
        e?.code === "BOOKING_NOT_PAYABLE"
      ) {
        toast.error("Hold expired. Please select seats again.");
        navigate(seatMapUrl, { replace: true });
      } else if (e?.code === "HOLD_TOO_SHORT") {
        toast.error(
          "Not enough hold time left to pay. Please select seats again.",
        );
        goBack();
      } else if (e?.code === "PAYMENT_NOT_AVAILABLE_HERE") {
        toast.info("Payment for this show is at the venue. Your seats are held.");
        navigate(`/confirmation?id=${bookingId}`, { replace: true });
      } else {
        toast.error(e?.message || "Payment failed.");
      }
    } finally {
      setSaving(false);
    }
  };

  if (!booking || (menu.length === 0 && !noMenu)) {
    return <LoadingPage showFooter={false} />;
  }

  return (
    <>
      {!noMenu && (
        <FoodStep
          isOpen
          title={booking.movie_title}
          subtitle={`${booking.venue_name} | ${new Date(
            booking.starts_at,
          ).toLocaleString("en-IN")}`}
          ticketPaise={booking.ticket_paise}
          menu={menu}
          cart={cart}
          setCart={setCart}
          onBack={goBack}
          onProceed={() => setShowTerms(true)}
        />
      )}

      <TermsModal
        isOpen={showTerms}
        onClose={() => {
          setShowTerms(false);
          if (noMenu) goBack(); // no food screen behind it, so release seats
        }}
        onAccept={() => {
          setShowTerms(false);
          goPay();
        }}
      />
    </>
  );
}