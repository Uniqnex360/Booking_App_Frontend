import { useEffect, useState } from "react";
import { X } from "lucide-react";

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
  onClose,
  onAccept,
}: {
  isOpen: boolean;
  terms?: string[];
  amountLabel?: string; // e.g. "₹380.00"
  onClose: () => void;
  onAccept: () => void;
}) {
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    if (isOpen) setAgreed(false);
  }, [isOpen]);

  if (!isOpen) return null;
  const list = terms && terms.length > 0 ? terms : DEFAULT_TERMS;

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 p-4 pointer-events-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-[460px] max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">Terms &amp; Conditions</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto">
          <ul className="list-disc list-outside pl-4 space-y-2 text-xs text-gray-600 leading-relaxed">
            {list.map((t, i) => (
              <li key={i} className="marker:text-[#7B1E3D]">
                {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t border-gray-100 p-4 space-y-3 bg-white">
          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[#7B1E3D] cursor-pointer"
            />
            <span className="text-xs text-gray-700">
              I have read and agree to the Terms &amp; Conditions.
            </span>
          </label>
          <button
            type="button"
            disabled={!agreed}
            onClick={onAccept}
            className={`w-full font-bold py-3 rounded-lg text-sm transition ${
              agreed
                ? "bg-[#7B1E3D] hover:bg-[#5C0F2A] text-white cursor-pointer shadow-md"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            {amountLabel ? `Accept & Pay ${amountLabel}` : "Accept & Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}