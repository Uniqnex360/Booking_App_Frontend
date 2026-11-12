import React from 'react';
import { Sparkles, Ticket, RotateCcw, ShieldCheck, ArrowRight, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface WelcomeFirstOpenModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WelcomeFirstOpenModal({ isOpen, onClose }: WelcomeFirstOpenModalProps) {
  const { openAuthModal } = useAuth();

  if (!isOpen) return null;

  const handleSignIn = () => {
    onClose();
    openAuthModal('get-started');
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[92vh] animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Top visual banner */}
        <div className="relative bg-gradient-to-br from-[#7B1E3D] via-[#5C0F2A] to-[#3B0717] px-6 pt-7 pb-6 text-white text-center">
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 p-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 mb-3 shadow-inner">
            <Sparkles className="w-6 h-6 text-amber-300" />
          </div>

          <h2 className="text-2xl font-black tracking-tight">Welcome to Vybhz</h2>
          <p className="text-white/80 text-xs sm:text-sm mt-1 max-w-xs mx-auto">
            Book Movies, Live Concerts, Standup Shows & Experiences
          </p>
        </div>

        {/* Benefits list */}
        <div className="p-6 space-y-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Why sign in?
          </p>

          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-[#7B1E3D] flex items-center justify-center shrink-0 mt-0.5">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">All Your Tickets in One Place</h3>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                Tickets booked earlier with your phone number or email are automatically saved to your account.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Instant Cancellations & Refunds</h3>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                Plans changed? Cancel eligible bookings in 1 tap and track automated refunds anytime.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Offline Gate Entry Pass</h3>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                Show QR gate passes even without internet connectivity at the venue scanner.
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-3 space-y-2.5">
            <button
              onClick={handleSignIn}
              className="w-full py-3.5 px-4 rounded-xl bg-[#7B1E3D] hover:bg-[#621630] active:scale-[0.99] text-white font-bold text-sm shadow-md shadow-[#7B1E3D]/25 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Sign In / Create Account</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={handleSkip}
              className="w-full py-2.5 px-4 rounded-xl text-gray-500 hover:text-gray-800 hover:bg-gray-50 text-xs sm:text-sm font-semibold transition cursor-pointer"
            >
              Skip for now · Continue as Guest
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
