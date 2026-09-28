import React from "react";

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
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl w-full max-w-[420px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title + body */}
        <div className="px-6 pt-6 pb-5">
          <h3 className="text-[22px] font-medium text-gray-900 leading-tight">
            This movie is rated &quot;A&quot;
          </h3>

          <div className="flex items-center gap-4 mt-5">
            {/* 18+ red ring */}
            <div className="w-[76px] h-[76px] shrink-0 rounded-full border-[5px] border-[#C8354F] flex items-center justify-center">
              <span className="text-[26px] font-medium text-gray-900 leading-none">
                18+
              </span>
            </div>

            <p className="text-[15px] text-gray-500 leading-snug">
              This movie is only for viewers above 18. Please carry a valid
              ID/Age Proof to the theatre. If you are denied entry due to age or
              ID issues, you will not get a refund.
            </p>
          </div>
        </div>

        {/* Footer with button */}
        <div className="px-4 pt-3 pb-4 border-t border-gray-100 shadow-[0_-4px_8px_rgba(0,0,0,0.03)]">
          <button
            type="button"
            onClick={onConfirm}
            className="w-full bg-[#7B1E3D] hover:bg-[#5C0F2A] text-white font-semibold text-lg py-3 rounded-lg transition shadow-md cursor-pointer"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}