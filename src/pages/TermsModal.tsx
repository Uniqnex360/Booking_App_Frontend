import { useEffect, useState } from "react";
import { X, Loader2, ListOrdered } from "lucide-react";
import { normalizeTermsToBullets } from "@/lib/eventTerms";

export const DEFAULT_TERMS = [
  "Tickets once booked cannot be exchanged or refunded, except where the cinema/organiser cancels the show.",
  "Carry a valid government photo ID. Age-restricted shows (A / 18+) will check ID at entry.",
  "Entry is allowed only with a valid e-ticket or booking reference.",
  "Please arrive at least 15 minutes before showtime. Late entry is not guaranteed.",
  "Outside food and beverages are not allowed inside the venue.",
  "Convenience fees and taxes are shown at payment and are non-refundable.",
  "Seats are held for a limited time. If payment is not completed, the hold is released.",
  "Vyhbz acts only as a ticketing platform. Show timings and content are set by the venue.",
];

export function TermsModal({
  isOpen,
  terms,
  amountLabel,
  isLoading,
  onClose,
  onAccept,
}: {
  isOpen: boolean;
  terms?: string[];
  amountLabel?: string; // e.g. "₹380.00"
  isLoading?: boolean;
  onClose: () => void;
  onAccept: () => void;
}) {
  if (!isOpen) return null;
  const parsed = terms ? normalizeTermsToBullets(terms) : [];
  const list = parsed.length > 0 ? parsed : DEFAULT_TERMS;

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 p-4 pointer-events-auto"
      onClick={isLoading ? undefined : onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-[480px] max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center font-bold">
              <ListOrdered className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Terms &amp; Conditions</h3>
              <p className="text-[11px] text-gray-500">{list.length} Bullet Points</p>
            </div>
          </div>
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            aria-label="Close"
            className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center cursor-pointer disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto space-y-2">
          {list.map((t, i) => (
            <div key={i} className="flex items-start gap-2.5 p-2 rounded-xl bg-gray-50/70 border border-gray-100">
              <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-700 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                {i + 1}
              </span>
              <p className="text-xs text-gray-700 leading-relaxed font-normal">
                {t}
              </p>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-100 p-4 bg-white">
          <button
            type="button"
            disabled={isLoading}
            onClick={onAccept}
            className="w-full bg-[#D6445B] hover:bg-[#c33a4f] disabled:bg-[#D6445B]/60 text-white font-bold py-3 rounded-lg text-sm cursor-pointer flex items-center justify-center gap-2 transition"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Processing Payment...</span>
              </>
            ) : (
              <span>Accept &amp; Pay {amountLabel ? amountLabel : ''}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}