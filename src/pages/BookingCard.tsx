import { useState } from "react";
import { Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { MapPin, Users, Ticket, Loader2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/utils/currencyFormatter";
import { formatDate } from "@/utils/dateFormatter";
import { toast } from "sonner";
import { api, unwrap } from "@/api/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Booking } from "@/types/booking.types";

export function BookingCard({
  booking,
  past = false,
  onCancelled,
}: {
  booking: Booking;
  past?: boolean;
  onCancelled?: () => void;
}) {
  const [currentStatus, setCurrentStatus] = useState<string>(booking.status);
  const [cancelling, setCancelling] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // --- adapter: support both the list shape and the confirmation DTO ---
  const b = booking as any;
  const poster = b.image_url ?? b.poster_url ?? null;
  const totalRupees =
    typeof b.paid_paise === "number"
      ? b.paid_paise / 100
      : typeof b.total_price === "number"
        ? b.total_price
        : typeof b.total_paise === "number"
          ? b.total_paise / 100
          : 0;
  const qrValue = b.barcode || b.ref_code || b.id;

  const isMovie = (booking.type === "MOVIE" || booking.type === "EVENT" || !booking.type) && !!(booking.starts_at || booking.booking_date);
  const bookingDate = new Date(booking.starts_at || booking.booking_date);
  const title = booking.movie_title ?? booking.title;
  const seatCount =
    typeof b.quantity === "number" && b.quantity > 0
      ? b.quantity
      : booking.seat_codes?.length
        ? booking.seat_codes.length
        : b.guests || 1;
  const venueDisplay = booking.venue_name || booking.venue || booking.cinema_name;
  const screenOrTier = booking.tier_name || booking.screen_name || (booking.type === "EVENT" ? "ENTRY PASS" : "SCREEN");
  const ticketLabel = booking.type === "EVENT" ? "E-Ticket" : "M-Ticket";

  const isCancelled = currentStatus === "CANCELLED";
  const isPastShowtime = bookingDate.getTime() <= Date.now();
  const statusLabel =
    isCancelled
      ? "Cancelled"
      : past || isPastShowtime
        ? "Completed"
        : "Confirmed";

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await unwrap<any>(api.patch(`/bookings/${booking.id}/cancel`));
      toast.success("Booking cancelled successfully", {
        description: `A refund of ₹${Math.round(totalRupees).toLocaleString("en-IN")} has been initiated to your original payment method.`,
      });
      setCurrentStatus("CANCELLED");
      setShowConfirm(false);
      onCancelled?.();
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || "Failed to cancel booking";
      toast.error("Cancellation failed", { description: msg });
    } finally {
      setCancelling(false);
    }
  };

  const dateStr = bookingDate.toLocaleString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const timeStr = bookingDate.toLocaleString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const handleShare = async () => {
    const url = `${window.location.origin}/confirmation?id=${booking.id}`;
    const shareText = `My ticket for ${title}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${title} — Ticket`,
          text: shareText,
          url,
        });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        toast.success("Ticket link copied to clipboard");
      } else {
        toast.error("Sharing not supported on this device");
      }
    } catch (err: any) {
      // user cancelled the share sheet — not an error
      if (err?.name !== "AbortError") {
        toast.error("Could not share ticket");
      }
    }
  };

  // ---------- non-movie: keep the simple card ----------
  if (!isMovie) {
    return (
      <div
        className={`rounded-xl border border-gray-200 bg-white p-5 hover:shadow-md transition-all ${
          past ? "opacity-75" : ""
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h4 className="text-lg font-bold text-gray-900 leading-tight">
              {title}
            </h4>
            <p className="mt-1 text-sm text-gray-500 font-medium">
              {booking.venue}
            </p>
            <p className="mt-3 text-sm font-semibold text-gray-800">
              {formatDate(booking.booking_date)}
            </p>
            {booking.location && (
              <p className="mt-1 text-sm text-gray-600 flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {booking.location}
              </p>
            )}
            {booking.guests ? (
              <p className="mt-3 text-sm text-gray-700">
                <Users className="h-3 w-3 inline mr-1" />
                {booking.guests} guests
              </p>
            ) : null}
          </div>
          <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-[10px] font-bold uppercase">
            {statusLabel}
          </Badge>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
          <span className="font-mono text-sm font-bold text-gray-900">
            {booking.ref_code}
          </span>
          <span className="text-sm font-bold text-gray-900">
            {formatCurrency(totalRupees)}
          </span>
        </div>
      </div>
    );
  }

  // ---------- movie: BMS-style M-Ticket with QR ----------
  return (
    <div
      className={`relative w-full max-w-[420px] mx-auto rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden ${
        past ? "opacity-80" : ""
      }`}
    >
      {/* Top: poster + info */}
      <div className="flex gap-3 sm:gap-4 p-3.5 sm:p-4 pb-4 sm:pb-5">
        <div className="w-[70px] h-[102px] sm:w-[76px] sm:h-[110px] shrink-0 rounded-md overflow-hidden bg-gray-100 shadow-2xs">
          {poster ? (
            <img
              src={poster}
              alt={title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Ticket className="h-6 w-6 text-gray-400" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 pr-4 sm:pr-5">
          <h4 className="text-base sm:text-[17px] font-bold text-gray-900 leading-tight">
            {title}
          </h4>
          {(booking.language || booking.format) && (
            <p className="mt-1 text-xs sm:text-sm text-gray-500">
              {[booking.language, booking.format].filter(Boolean).join(", ")}
            </p>
          )}
          <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-gray-700">
            {dateStr} | {timeStr}
          </p>
          {venueDisplay && (
            <p className="mt-1 text-xs sm:text-sm text-gray-700 line-clamp-2">
              {venueDisplay}
            </p>
          )}
        </div>

        {/* Vertical "M-Ticket" or "E-Ticket" label */}
        <span
          className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 tracking-wider"
          style={{ writingMode: "vertical-rl" }}
        >
          {ticketLabel}
        </span>
      </div>

      {/* Notch + dashed divider */}
      <div className="relative h-4">
        <span className="absolute -left-2 top-0 h-4 w-4 rounded-full bg-[#F5F5FA] border border-gray-200" />
        <span className="absolute -right-2 top-0 h-4 w-4 rounded-full bg-[#F5F5FA] border border-gray-200" />
        <div className="absolute left-4 right-4 top-1/2 border-t border-dashed border-gray-300" />
      </div>

      {/* Inner grey box: QR + details */}
      <div className="px-3 sm:px-4 pt-2.5 sm:pt-3">
        <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
          <div className="bg-white p-1.5 rounded shrink-0 shadow-2xs">
            <QRCodeSVG value={qrValue} size={88} className="w-[80px] h-[80px] sm:w-[96px] sm:h-[96px]" level="M" />
          </div>
          <div className="flex-1 text-center min-w-0">
            <p className="text-[11px] sm:text-xs text-gray-500">
              {seatCount} Ticket{seatCount === 1 ? "" : "s"}
            </p>
            <p className="mt-0.5 sm:mt-1 text-lg sm:text-xl font-bold text-gray-900 truncate">
              {screenOrTier}
            </p>
            {booking.seat_codes?.length ? (
              <p className="text-xs text-gray-600 font-medium mt-0.5 break-words line-clamp-2">
                {booking.seat_codes.join(", ")}
              </p>
            ) : booking.tier_name && venueDisplay ? (
              <p className="text-xs text-gray-500 mt-0.5 break-words truncate">
                {venueDisplay}
              </p>
            ) : null}
            {booking.ref_code && (
              <p className="mt-1.5 sm:mt-2 text-[10px] sm:text-[11px] font-bold text-gray-900 truncate">
                BOOKING ID: {booking.ref_code}
              </p>
            )}
            <Link
              to={`/bookings/${booking.id}`}
              className="mt-1 inline-block text-[11px] text-gray-500 hover:text-[#7B1E3D] underline-offset-2 hover:underline"
            >
              Tap to see more
            </Link>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-gray-500 leading-relaxed px-2">
          A confirmation is sent on e-mail/SMS/WhatsApp within 15 minutes of
          booking.
        </p>

        {/* Actions */}
        <div className="mt-4 mb-4 grid grid-cols-3 gap-2 text-center">
          <button
            type="button"
            onClick={handleShare}
            className="py-2 text-xs text-gray-500 hover:text-[#7B1E3D] transition"
          >
            Share ticket
          </button>
          <button
            type="button"
            disabled={past || isPastShowtime || isCancelled || cancelling}
            onClick={() => setShowConfirm(true)}
            className="py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {cancelling ? (
              <span className="inline-flex items-center gap-1 justify-center">
                <Loader2 className="w-3 h-3 animate-spin" />
                Cancelling...
              </span>
            ) : isCancelled ? (
              "Cancelled"
            ) : (
              "Cancel booking"
            )}
          </button>
          <Link
            to="/contact"
            className="py-2 text-xs text-gray-400 hover:text-gray-700"
          >
            Contact support
          </Link>
        </div>
      </div>

      {/* Discount / Coupon breakdown if present */}
      {b.discount_paise && b.discount_paise > 0 && (
        <div className="border-t border-gray-100 bg-emerald-50/70 px-4 py-2.5 text-xs flex items-center justify-between text-emerald-800">
          <span className="flex items-center gap-1.5 font-medium">
            <span>Coupon Discount</span>
            {b.coupon_code && (
              <span className="font-mono bg-emerald-100 text-emerald-900 px-1.5 py-0.5 rounded border border-emerald-300 font-bold text-[11px]">
                {b.coupon_code}
              </span>
            )}
          </span>
          <span className="font-bold text-emerald-700">
            -₹{Math.round(b.discount_paise / 100).toLocaleString("en-IN")}
          </span>
        </div>
      )}

      {/* Footer: total */}
      <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-3 text-sm">
        <span className="text-gray-600">Total Paid</span>
        <div className="flex items-center gap-2">
          {isCancelled && (
            <Badge className="bg-red-100 text-red-700 hover:bg-red-100 text-[10px] font-bold uppercase">
              Cancelled
            </Badge>
          )}
          {b.discount_paise && b.discount_paise > 0 && b.subtotal_paise && (
            <span className="text-xs text-gray-400 line-through">
              {formatCurrency(b.subtotal_paise / 100)}
            </span>
          )}
          <span className="font-semibold text-gray-900">
            {formatCurrency(totalRupees)}
          </span>
        </div>
      </div>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              Cancel Booking?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 space-y-2 pt-2">
              <span className="block text-sm">
                Are you sure you want to cancel your booking for{" "}
                <strong className="text-gray-900">{title}</strong>?
              </span>
              <span className="block text-xs text-gray-500 bg-gray-50 p-2.5 rounded border border-gray-200 mt-2">
                A full refund of{" "}
                <strong className="text-gray-900 font-bold">
                  ₹{Math.round(totalRupees).toLocaleString("en-IN")}
                </strong>{" "}
                will be initiated to your original payment method within 5-7 business days. Your reserved seats will be released immediately.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Keep Booking</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleCancel();
              }}
              disabled={cancelling}
              className="bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-500"
            >
              {cancelling ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Cancelling...
                </span>
              ) : (
                "Confirm Cancellation"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}