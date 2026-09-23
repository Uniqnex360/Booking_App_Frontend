import React, { useState } from "react";
import { X, Mail, RefreshCw } from "lucide-react";
import { api, unwrap, setTokens } from "@/api/client";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  reloadOnSuccess?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  reloadOnSuccess,
}) => {
  const [step, setStep] = useState<"input" | "otp">("input");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [userId, setUserId] = useState("");
  const [method, setMethod] = useState<"EMAIL" | "SMS">("EMAIL");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const sendOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await unwrap<{ user_id: string; method: "EMAIL" | "SMS" }>(
        api.post("/auth/login/initiate", { email }),
      );
      setUserId(res.user_id);
      setMethod(res.method);
      setStep("otp");
    } catch (err: any) {
      setError(
        err?.error?.message ??
          err?.detail?.message ??
          err?.message ??
          "Could not send OTP",
      );
    } finally {
      setLoading(false);
    }
  };
  const handleClose = () => {
    setStep("input");
    setEmail("");
    setOtp("");
    setUserId("");
    setError("");
    setLoading(false);
    onClose();
  };
  // src/pages/AuthModal.tsx

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await unwrap<{ access_token: string; refresh_token: string }>(
        api.post('/auth/login/verify', {
          user_id: userId,
          otp_code: otp,
          method,
        })
      );
      setTokens(res.access_token, res.refresh_token);
      setLoading(false);
      
      // 1. Call onSuccess to trigger handleCheckout in SeatMapPage
      onSuccess();
      
      // 2. Close the modal without reloading the page
      handleClose();
    } catch (err: any) {
      setError(
        err?.error?.message ?? err?.detail?.message ?? err?.message ?? 'Invalid OTP'
      );
      setLoading(false);
    }
  };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
        <div className="relative w-full max-w-[400px] bg-white rounded-xl shadow-2xl overflow-hidden zoom-in-95 animate-in duration-200">
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-800">
              {step === "input" ? "Get Started" : "Verify your details"}
            </h2>
            <button
              onClick={handleClose}
              className="p-1 text-slate-400 hover:text-slate-700 transition-colors"
              aria-label="Close"
            >
              <X size={20} strokeWidth={2.5} />
            </button>
          </div>

          <div className="p-8">
            {error && (
              <div className="mb-6 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <span className="font-bold mt-0.5">!</span>
                <span>{error}</span>
              </div>
            )}

            {step === "input" ? (
              <form onSubmit={sendOtp} className="space-y-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">
                    Continue with Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="w-full pl-12 pr-4 py-3 text-slate-800 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#F84464] focus:border-[#F84464] transition-colors"
                      autoFocus
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#F84464] text-white font-semibold py-3.5 rounded-lg hover:bg-[#e03c5a] transition-colors disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
                >
                  {loading ? "Sending OTP..." : "Continue"}
                </button>

                <p className="text-[11px] text-slate-500 text-center leading-relaxed mt-4">
                  I agree to the{" "}
                  <a
                    href="/terms"
                    className="text-slate-700 underline hover:text-[#F84464]"
                  >
                    Terms & Conditions
                  </a>{" "}
                  &{" "}
                  <a
                    href="#"
                    className="text-slate-700 underline hover:text-[#F84464]"
                  >
                    Privacy Policy
                  </a>
                  .
                </p>
              </form>
            ) : (
              <form onSubmit={verifyOtp} className="space-y-6">
                <div className="text-center mb-2">
                  <p className="text-sm text-slate-600">
                    We've sent a 6-digit OTP to
                  </p>
                  <p className="text-sm font-semibold text-slate-900 mt-1">
                    {email}
                  </p>
                </div>

                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  className="w-full text-center tracking-[0.75em] text-2xl font-bold px-4 py-3.5 text-slate-800 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#F84464] focus:border-[#F84464] transition-colors"
                  autoFocus
                  required
                />

                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-full bg-[#F84464] text-white font-semibold py-3.5 rounded-lg hover:bg-[#e03c5a] transition-colors disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
                >
                  {loading ? "Verifying..." : "Verify & Proceed"}
                </button>

                <div className="flex justify-between items-center text-sm pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setStep("input")}
                    className="text-slate-500 hover:text-slate-800 font-medium transition-colors"
                  >
                    Change email
                  </button>
                  <button
                    type="button"
                    onClick={(e) => sendOtp(e)}
                    className="flex items-center gap-1.5 text-[#F84464] font-semibold hover:underline"
                  >
                    <RefreshCw
                      size={14}
                      className={loading ? "animate-spin" : ""}
                    />
                    Resend OTP
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  };

export default AuthModal;
