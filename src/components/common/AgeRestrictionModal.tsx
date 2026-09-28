import React, { useEffect } from "react";

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
}: AgeRestrictionModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-[460px] w-full shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="pt-6 px-6 pb-4">
          <h3 className="text-[19px] sm:text-xl font-bold text-gray-900 tracking-tight">
            This movie is rated &quot;A&quot;
          </h3>
        </div>

        {/* Content Body: 18+ Badge + Explanation */}
        <div className="flex items-center gap-4 px-6 pb-6">
          <div className="shrink-0 w-16 h-16 rounded-full border-[3.5px] border-[#c93b54] flex items-center justify-center text-gray-900 font-bold text-xl select-none">
            18+
          </div>
          <p className="text-[13.5px] sm:text-[14px] text-gray-600 leading-relaxed font-normal">
            This movie is only for viewers above 18. Please carry a valid ID/Age Proof to the theatre. If you are denied entry due to age or ID issues, you will not get a refund.
          </p>
        </div>

        {/* Footer / Continue Button */}
        <div className="border-t border-gray-100 px-6 py-4 bg-white">
          <button
            type="button"
            onClick={onConfirm}
            className="w-full py-3 sm:py-3.5 px-4 rounded-xl bg-[#cb3b56] hover:bg-[#b8314a] active:bg-[#a5293f] text-white font-semibold text-base transition-colors duration-150 shadow-xs cursor-pointer text-center"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
