import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { api, unwrap } from "@/api/client";
import { useAuth } from "@/hooks/useAuth";
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
  const [cart, setCart] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showContact, setShowContact] = useState(false);

  const seatMapUrl = booking
    ? `/showtimes/${booking.showtime_id}/seat-map`
    : "/";

  
  useEffect(() => {
    (async () => {
      try {
        const b = await unwrap<any>(api.get(`/bookings/${bookingId}`));
        setBooking(b);

        
        const pre: Record<string, number> = {};
        (b.fnb_lines || []).forEach((l: any) => {
          pre[l.item_id] = l.quantity;
        });
        setCart(pre);

        const res = await unwrap<{ items: FnbItem[] }>(
  api.get(`/showtimes/${b.showtime_id}/fnb-menu`),
);
const m = res?.items ?? [];
if (!Array.isArray(m) || m.length === 0) {
  setNoMenu(true);
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

  
  const goBack = async () => {
    try {
      await api.delete(`/bookings/hold/${bookingId}`);
    } catch {
     
    }
    navigate(seatMapUrl, { replace: true });
  };

  
  const knownContact = (): Contact => {
    const saved = JSON.parse(
      localStorage.getItem("vyhbz_contact_details") || "{}",
    );
    return {
      email: booking?.contact_email || saved.email || user?.email || "",
      phone:
        booking?.contact_phone || saved.phone || (user as any)?.phone || "",
    };
  };

  
  const startPay = () => {
    const c = knownContact();
    if (!c.email || !c.phone) {
      setShowContact(true);
      return;
    }
    goPay(c);
  };

  
  const goPay = async (contact: Contact) => {
    if (saving) return;
    setSaving(true);
    try {
      
      await api.put(`/bookings/${bookingId}/fnb`, {
        items: Object.entries(cart)
          .filter(([, q]) => q > 0)
          .map(([item_id, quantity]) => ({ item_id, quantity })),
      });

      
      try {
        await api.patch(`/bookings/${bookingId}/contact`, {
          contact_email: contact.email,
          contact_phone: contact.phone,
        });
      } catch {
       
      }

      
      const fresh = await unwrap<any>(api.get(`/bookings/${bookingId}`));
     

      
      const res = await payForBooking({
        bookingId: bookingId!,
        description: `${fresh.movie_title} - Seats: ${(
          fresh.seat_codes || []
        ).join(", ")}`,
        prefill: {
          name: user?.full_name,
          email: contact.email,
          contact: contact.phone,
        },
      });

      if (res.kind === "DISMISSED") {
        toast.warning(
          "Payment cancelled. Seats are still on hold for a short time.",
        );
        return;
      }

      
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
          if (noMenu) goBack(); 
        }}
        onAccept={() => {
          setShowTerms(false);
          startPay();
        }}
      />

      <AuthModal
        isOpen={showContact}
        onClose={() => {
          setShowContact(false);
          if (noMenu) goBack();
        }}
        onSubmit={(d: Contact) => {
          setShowContact(false);
          localStorage.setItem("vyhbz_contact_details", JSON.stringify(d));
          goPay(d);
        }}
      />
    </>
  );
}