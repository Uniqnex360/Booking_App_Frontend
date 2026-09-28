import React from "react";
import { AlertTriangle, X, ShieldAlert } from "lucide-react";

export interface AgeRestrictionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  movieTitle?: string;
}

export function AgeRestrictionModal({
  isOpen,
  onClose,
  onConfirm,
  movieTitle,
}: AgeRestrictionModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 relative animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Warning Icon & Header */}
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-red-600 mb-3 shadow-xs">
            <ShieldAlert className="w-7 h-7" />
          </div>

          <div className="inline-flex items-center gap-1.5 bg-red-100 text-red-800 text-xs font-bold px-2.5 py-0.5 rounded-full mb-2 border border-red-200">
            <span>RATED 'A'</span>
            <span>•</span>
            <span>18+ ONLY</span>
          </div>

          <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
            Age Restriction Advisory
          </h3>

          {movieTitle && (
            <p className="text-xs font-semibold text-gray-500 mb-3">
              for <span className="text-gray-800 font-bold">{movieTitle}</span>
            </p>
          )}

          <p className="text-xs sm:text-sm text-gray-600 leading-relaxed mb-4 text-center">
            This movie is certified <strong className="text-gray-900">'A' (Adults Only)</strong> by the CBFC and is strictly restricted to viewers aged <strong className="text-gray-900">18 years and above</strong>.
          </p>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-left w-full mb-6 text-xs text-amber-800 flex gap-2.5 items-start">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="leading-snug">
              Please carry a valid government-issued photo ID. Entry will be denied to anyone under 18 years without exception, even if accompanied by an adult, and tickets cannot be refunded.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 w-full">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 font-semibold text-xs sm:text-sm transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="flex-1 py-2.5 px-4 rounded-xl bg-[#F84464] hover:bg-[#d63451] text-white font-semibold text-xs sm:text-sm transition shadow-sm cursor-pointer"
            >
              I am 18+ / Proceed
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
