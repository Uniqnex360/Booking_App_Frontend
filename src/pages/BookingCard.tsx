import { Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { MapPin, Users, Ticket } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/utils/currencyFormatter";
import { formatDate } from "@/utils/dateFormatter";
import { toast } from "sonner";
import type { Booking } from "@/types/booking.types";

export function BookingCard({
  booking,
  past = false,
}: {
  booking: Booking;
  past?: boolean;
}) {
  // --- adapter: support both the list shape and the confirmation DTO ---
  const b = booking as any;
  const poster = b.image_url ?? b.poster_url ?? null;
  const totalRupees =
    typeof b.total_price === "number"
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

  const statusLabel =
    booking.status === "CANCELLED"
      ? "Cancelled"
      : past
        ? "Completed"
        : "Confirmed";

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
      <div className="flex gap-4 p-4 pb-5">
        <div className="w-[76px] h-[110px] shrink-0 rounded-md overflow-hidden bg-gray-100">
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

        <div className="min-w-0 flex-1 pr-5">
          <h4 className="text-[17px] font-bold text-gray-900 leading-tight">
            {title}
          </h4>
          {(booking.language || booking.format) && (
            <p className="mt-1 text-sm text-gray-500">
              {[booking.language, booking.format].filter(Boolean).join(", ")}
            </p>
          )}
          <p className="mt-2 text-sm text-gray-700">
            {dateStr} | {timeStr}
          </p>
          {venueDisplay && (
            <p className="mt-1 text-sm text-gray-700 line-clamp-2">
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
      <div className="px-4 pt-3">
        <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 flex items-center gap-4">
          <div className="bg-white p-1.5 rounded shrink-0">
            <QRCodeSVG value={qrValue} size={96} level="M" />
          </div>
          <div className="flex-1 text-center min-w-0">
            <p className="text-xs text-gray-500">
              {seatCount} Ticket{seatCount === 1 ? "" : "s"}
            </p>
            <p className="mt-1 text-xl font-bold text-gray-900 truncate">
              {screenOrTier}
            </p>
            {booking.seat_codes?.length ? (
              <p className="text-xs text-gray-500 mt-0.5 break-words">
                {booking.seat_codes.join(", ")}
              </p>
            ) : booking.tier_name && venueDisplay ? (
              <p className="text-xs text-gray-500 mt-0.5 break-words truncate">
                {venueDisplay}
              </p>
            ) : null}
            {booking.ref_code && (
              <p className="mt-2 text-[11px] font-bold text-gray-900">
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
            disabled={past || booking.status === "CANCELLED"}
            onClick={() => toast.info("Cancellation coming soon")}
            className="py-2 text-xs text-gray-400 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Cancel booking
          </button>
          <Link
            to="/contact"
            className="py-2 text-xs text-gray-400 hover:text-gray-700"
          >
            Contact support
          </Link>
        </div>
      </div>

      {/* Footer: total */}
      <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-3 text-sm">
        <span className="text-gray-600">Total Amount</span>
        <div className="flex items-center gap-2">
          {booking.status === "CANCELLED" && (
            <Badge className="bg-red-100 text-red-700 hover:bg-red-100 text-[10px] font-bold uppercase">
              Cancelled
            </Badge>
          )}
          <span className="font-semibold text-gray-900">
            {formatCurrency(totalRupees)}
          </span>
        </div>
      </div>
    </div>
  );
}