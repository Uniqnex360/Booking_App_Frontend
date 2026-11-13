import { X, Loader2 } from "lucide-react";
import { normalizeTermsToBullets } from "@/lib/eventTerms";

export const DEFAULT_TERMS = [
  "Tickets once booked cannot be exchanged, cancelled, or refunded, except in case of event/show cancellation by the venue.",
  "Carry a valid government photo ID. Age-restricted shows (A / 18+) will verify ID at entry. Minors will not be admitted to 'A' certified films even if accompanied by parents.",
  "Entry is permitted only with a valid e-ticket or booking reference on your phone. Please arrive at least 15 minutes before showtime.",
  "Outside food and beverages are strictly not allowed inside the cinema premises.",
  "Children aged 3 years and above require a separate ticket.",
  "Audio or video recording inside the auditorium is strictly prohibited and punishable under law.",
  "Vybhz acts solely as a ticketing platform. Show timings, seating availability, and operational management are determined by the cinema partner.",
];

export function TermsModal({
  isOpen,
  terms,
  title = "Terms & Conditions",
  amountLabel,
  confirmLabel,
  isLoading,
  onClose,
  onAccept,
}: {
  isOpen: boolean;
  terms?: string[];
  title?: string;
  amountLabel?: string; // e.g. "₹380.00"
  confirmLabel?: string; // e.g. "Accept" or "Accept & Pay"
  isLoading?: boolean;
  onClose: () => void;
  onAccept: () => void;
}) {
  if (!isOpen) return null;
  const parsed = terms ? normalizeTermsToBullets(terms) : [];
  const list = parsed.length > 0 ? parsed : DEFAULT_TERMS;

  const buttonText =
    confirmLabel || (amountLabel ? `Accept & Pay ${amountLabel}` : "Accept");

  return (
    <div
      className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 pointer-events-auto backdrop-blur-xs animate-in fade-in duration-200"
      onClick={isLoading ? undefined : onClose}
    >
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-[480px] max-h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-200 pb-[env(safe-area-inset-bottom,0px)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100 shrink-0">
          <div>
            <h3 className="text-base font-bold text-gray-900">{title}</h3>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Please review cinema rules before proceeding
            </p>
          </div>
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 active:bg-gray-300 flex items-center justify-center cursor-pointer disabled:opacity-50 transition text-gray-500 hover:text-gray-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto max-h-[55vh]">
          <ul className="list-disc list-outside pl-4 space-y-2.5 text-xs text-gray-700 leading-relaxed">
            {list.map((t, i) => (
              <li key={i} className="marker:text-[#7B1E3D]">
                {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t border-gray-100 p-4 bg-white flex items-center gap-3 shrink-0">
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="w-1/3 py-3 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 active:bg-gray-100 font-semibold text-sm cursor-pointer transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={onAccept}
            className="flex-1 bg-[#7B1E3D] hover:bg-[#5C0F2A] active:bg-[#43071c] disabled:opacity-60 text-white font-bold py-3 rounded-xl text-sm cursor-pointer flex items-center justify-center gap-2 shadow-sm transition"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <span>{buttonText}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
