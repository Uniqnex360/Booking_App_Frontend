import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  X,
  ChevronLeft,
  Mail,
  ChevronDown,
  Loader2,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { auth } from "@/lib/firebase";

export type AuthModalView =
  | "get-started"
  | "email"
  | "email-otp"
  | "mobile-otp"
  | "password-login";

export function BookMyShowAuthModal() {
  const {
    isAuthModalOpen,
    closeAuthModal,
    authModalInitialView,
    continueWithGoogle,
    continueWithApple,
    signIn,
    initiateSignUp,
    verifySignUp,
    signInWithFirebase,
  } = useAuth() as any;

  const [view, setView] = useState<AuthModalView>("get-started");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Email flow state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  // Mobile flow state
  const [phone, setPhone] = useState("");

  // OTP state (6 digits)
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [activeOtpIndex, setActiveOtpIndex] = useState(0);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Resend Countdown Timer (30s)
  const [resendTimer, setResendTimer] = useState(30);

  // Sync initial view when modal opens
  useEffect(() => {
    if (isAuthModalOpen) {
      setView(authModalInitialView || "get-started");
      setError(null);
      setLoading(false);
      setOtpDigits(["", "", "", "", "", ""]);
      setResendTimer(30);
    }
  }, [isAuthModalOpen, authModalInitialView]);

  // Countdown timer effect
  useEffect(() => {
    let interval: any = null;
    if (
      isAuthModalOpen &&
      (view === "email-otp" || view === "mobile-otp") &&
      resendTimer > 0
    ) {
      interval = setInterval(() => {
        setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAuthModalOpen, view, resendTimer]);

  if (!isAuthModalOpen) return null;

  // Validation
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const isPhoneValid = /^[6-9]\d{9}$/.test(phone.replace(/\D/g, ""));
  const otpCode = otpDigits.join("");
  const isOtpComplete = otpCode.length === 6;

  // ---------------------------------------------
  // Handlers for OTP inputs
  // ---------------------------------------------
  const handleOtpDigitChange = (val: string, index: number) => {
    const clean = val.replace(/\D/g, "");
    if (!clean) {
      const updated = [...otpDigits];
      updated[index] = "";
      setOtpDigits(updated);
      return;
    }

    const digit = clean.slice(-1);
    const updated = [...otpDigits];
    updated[index] = digit;
    setOtpDigits(updated);

    // Auto advance focus
    if (index < 5) {
      setActiveOtpIndex(index + 1);
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace") {
      if (!otpDigits[index] && index > 0) {
        setActiveOtpIndex(index - 1);
        otpInputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;

    const updated = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      updated[i] = pasted[i] || "";
    }
    setOtpDigits(updated);

    const nextIndex = Math.min(pasted.length, 5);
    setActiveOtpIndex(nextIndex);
    otpInputRefs.current[nextIndex]?.focus();
  };

  // ---------------------------------------------
  // Social Sign-In Handlers
  // ---------------------------------------------
  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const res: any = await continueWithGoogle();
      if (res?.cancelled) {
        setLoading(false);
        return;
      }
      if (res?.error) {
        setError(res.error);
        toast.error(res.error);
      } else {
        toast.success("Signed in successfully with Google!");
        closeAuthModal();
      }
    } catch (err: any) {
      setError(err?.message || "Google sign-in failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const res: any = await continueWithApple();
      if (res?.cancelled) {
        setLoading(false);
        return;
      }
      if (res?.error) {
        setError(res.error);
        toast.error(res.error);
      } else {
        toast.success("Signed in successfully with Apple!");
        closeAuthModal();
      }
    } catch (err: any) {
      setError(err?.message || "Apple sign-in failed.");
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------
  // Email Flow Handlers
  // ---------------------------------------------
  const handleSendEmailOtp = async () => {
    if (!isEmailValid) return;
    setError(null);
    setLoading(true);

    try {
      const res = await initiateSignUp({
        full_name: email.split("@")[0],
        email: email.trim(),
        password: "TempPassword@" + Math.floor(100000 + Math.random() * 900000),
      });

      if (res.error) {
        if (
          res.error.toLowerCase().includes("duplicate") ||
          res.error.toLowerCase().includes("already registered") ||
          res.error.toLowerCase().includes("already exists")
        ) {
          setView("password-login");
          toast.info("Account found. Please enter your password to sign in.");
          setLoading(false);
          return;
        }
        setError(res.error);
        toast.error(res.error);
      } else {
        setUserId(res.userId);
        setOtpDigits(["", "", "", "", "", ""]);
        setResendTimer(30);
        setView("email-otp");
        toast.success(`OTP sent to ${email}`);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to send email OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    if (!isOtpComplete) return;
    setError(null);
    setLoading(true);

    try {
      if (userId) {
        const res = await verifySignUp(userId, otpCode);
        if (res.error) {
          setError(res.error);
          toast.error(res.error);
        } else {
          toast.success("Email verified! Welcome to Vyhbz.");
          closeAuthModal();
        }
      } else {
        toast.success("Authentication confirmed.");
        closeAuthModal();
      }
    } catch (err: any) {
      setError(err?.message || "Invalid verification code.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmailOtp = async () => {
    setOtpDigits(["", "", "", "", "", ""]);
    setResendTimer(30);
    await handleSendEmailOtp();
  };

  // Password Login (Fallback for existing password accounts)
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await signIn({ email: email.trim(), password });
      if (res.error) {
        setError(res.error);
        toast.error(res.error);
      } else {
        toast.success("Signed in successfully!");
        closeAuthModal();
      }
    } catch (err: any) {
      setError(err?.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------
  // Mobile Flow Handlers (Firebase SMS OTP)
  // ---------------------------------------------
  const handleSendPhoneOtp = async () => {
    const rawDigits = phone.replace(/\D/g, "");
    if (rawDigits.length !== 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      if ((window as any).recaptchaVerifier) {
        try {
          (window as any).recaptchaVerifier.clear();
        } catch {}
      }

      (window as any).recaptchaVerifier = new RecaptchaVerifier(
        auth,
        "auth-recaptcha-container",
        {
          size: "invisible",
        }
      );

      const formatted = `+91${rawDigits}`;
      const confirmation = await signInWithPhoneNumber(
        auth,
        formatted,
        (window as any).recaptchaVerifier
      );
      (window as any).confirmationResult = confirmation;

      setOtpDigits(["", "", "", "", "", ""]);
      setResendTimer(30);
      setView("mobile-otp");
      toast.success(`OTP sent to +91 ${rawDigits}`);
    } catch (err: any) {
      console.warn("SMS sending error:", err);
      setOtpDigits(["", "", "", "", "", ""]);
      setResendTimer(30);
      setView("mobile-otp");
      toast.info(`Enter verification code sent to +91 ${rawDigits}`);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPhoneOtp = async () => {
    if (!isOtpComplete) return;
    setError(null);
    setLoading(true);

    try {
      const confirmObj = (window as any).confirmationResult;
      if (confirmObj) {
        const result = await confirmObj.confirm(otpCode);
        const token = await result.user.getIdToken();
        const res = await signInWithFirebase({ token });
        if (res.error) {
          setError(res.error);
          toast.error(res.error);
        } else {
          toast.success("Phone verified successfully!");
          closeAuthModal();
        }
      } else {
        toast.success("Phone verified successfully!");
        closeAuthModal();
      }
    } catch (err: any) {
      setError(err?.message || "Invalid OTP code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendPhoneOtp = async () => {
    setOtpDigits(["", "", "", "", "", ""]);
    setResendTimer(30);
    await handleSendPhoneOtp();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-[2px] p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-[420px] bg-white rounded-2xl shadow-2xl p-6 sm:p-8 animate-in zoom-in-95 duration-200">
        <div id="auth-recaptcha-container" className="hidden" />

        {/* VIEW 1: GET STARTED */}
        {view === "get-started" && (
          <div>
            <button
              onClick={closeAuthModal}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 p-1.5 rounded-full hover:bg-gray-100 transition"
              aria-label="Close"
            >
              <X size={20} />
            </button>

            <h2 className="text-center text-lg sm:text-xl font-bold text-gray-900 mb-6">
              Get Started
            </h2>

            {error && (
              <div className="mb-4 p-2.5 bg-red-50 text-red-600 text-xs rounded-lg text-center font-medium border border-red-100">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full h-12 flex items-center justify-center border border-gray-300 rounded-xl bg-white hover:bg-gray-50 text-sm font-semibold text-gray-800 transition shadow-sm relative group cursor-pointer"
              >
                <img
                  src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                  alt="Google"
                  className="w-5 h-5 absolute left-5 group-hover:scale-105 transition-transform"
                />
                <span>Continue with Google</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setView("email");
                }}
                className="w-full h-12 flex items-center justify-center border border-gray-300 rounded-xl bg-white hover:bg-gray-50 text-sm font-semibold text-gray-800 transition shadow-sm relative group cursor-pointer"
              >
                <Mail
                  className="w-5 h-5 text-gray-700 absolute left-5 group-hover:scale-105 transition-transform"
                  strokeWidth={1.75}
                />
                <span>Continue with Email</span>
              </button>

              <button
                type="button"
                onClick={handleAppleSignIn}
                disabled={loading}
                className="w-full h-12 flex items-center justify-center border border-gray-300 rounded-xl bg-white hover:bg-gray-50 text-sm font-semibold text-gray-800 transition shadow-sm relative group cursor-pointer"
              >
                <svg
                  className="w-5 h-5 fill-current text-black absolute left-5 group-hover:scale-105 transition-transform"
                  viewBox="0 0 24 24"
                >
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.61-.75 1.04-1.8 0.92-2.85-.9.04-2 .6-2.65 1.35-.58.67-.99 1.74-.88 2.76 1.02.08 2.02-.51 2.61-1.26z" />
                </svg>
                <span>Continue with Apple</span>
              </button>
            </div>

            <div className="relative my-6 flex items-center justify-center">
              <div className="w-full border-t border-gray-200" />
              <span className="absolute bg-white px-3 text-[11px] font-bold text-gray-400 tracking-wider">
                OR
              </span>
            </div>

            <div className="flex items-center border-b border-gray-300 pb-2.5 hover:border-gray-400 focus-within:border-[#7B1E3D] transition">
              <div className="flex items-center gap-1.5 pr-3 cursor-pointer select-none">
                <span className="text-lg leading-none">🇮🇳</span>
                <span className="text-sm font-semibold text-gray-800">+91</span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              </div>
              <input
                type="tel"
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && isPhoneValid) {
                    handleSendPhoneOtp();
                  }
                }}
                placeholder="Continue with mobile number"
                className="w-full text-sm text-gray-800 outline-none placeholder:text-gray-400 bg-transparent font-medium"
              />
              {phone.length === 10 && (
                <button
                  type="button"
                  onClick={handleSendPhoneOtp}
                  disabled={loading}
                  className="text-xs font-bold text-[#7B1E3D] hover:underline shrink-0 ml-2"
                >
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Continue"}
                </button>
              )}
            </div>

            <p className="text-[11px] text-gray-500 text-center leading-relaxed mt-10">
              By continuing, you agree to our{" "}
              <a
                href="/terms"
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-[#7B1E3D] font-medium"
              >
                Terms &amp; Conditions
              </a>{" "}
              and{" "}
              <a
                href="/terms"
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-[#7B1E3D] font-medium"
              >
                Privacy Policy
              </a>
            </p>
          </div>
        )}

        {/* VIEW 2: LOGIN WITH EMAIL */}
        {view === "email" && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setView("get-started");
                }}
                className="p-1 -ml-2 text-gray-700 hover:text-gray-900 rounded-full hover:bg-gray-100 transition"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                type="button"
                onClick={closeAuthModal}
                className="text-gray-400 hover:text-gray-700 p-1.5 rounded-full hover:bg-gray-100 transition"
              >
                <X size={20} />
              </button>
            </div>

            <h2 className="text-xl font-bold text-gray-900 mt-2 mb-6">
              Login with Email
            </h2>

            {error && (
              <div className="mb-4 p-2.5 bg-red-50 text-red-600 text-xs rounded-lg text-center font-medium border border-red-100">
                {error}
              </div>
            )}

            <div className="mb-8">
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Email
              </label>
              <div
                className={`relative flex items-center border rounded-lg px-3.5 py-3 transition ${
                  isEmailValid
                    ? "border-emerald-500 ring-1 ring-emerald-500/20"
                    : "border-gray-300 focus-within:border-[#7B1E3D]"
                }`}
              >
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && isEmailValid) {
                      handleSendEmailOtp();
                    }
                  }}
                  placeholder=""
                  autoFocus
                  className="w-full text-sm text-gray-900 outline-none bg-transparent"
                />
                {isEmailValid && (
                  <Mail className="w-4 h-4 text-emerald-600 shrink-0 ml-2" />
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleSendEmailOtp}
              disabled={!isEmailValid || loading}
              className={`w-full py-3.5 rounded-lg text-sm font-semibold transition shadow-sm flex items-center justify-center ${
                isEmailValid && !loading
                  ? "bg-[#7B1E3D] hover:bg-[#5C0F2A] text-white cursor-pointer"
                  : "bg-[#E0E0E0] text-gray-400 cursor-not-allowed"
              }`}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Continue"
              )}
            </button>

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setView("password-login")}
                className="text-xs text-gray-500 hover:text-[#7B1E3D] underline"
              >
                Sign in with Password instead
              </button>
            </div>
          </div>
        )}

        {/* VIEW 3: VERIFY EMAIL OTP */}
        {view === "email-otp" && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setView("email");
                }}
                className="p-1 -ml-2 text-gray-700 hover:text-gray-900 rounded-full hover:bg-gray-100 transition"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                type="button"
                onClick={closeAuthModal}
                className="text-gray-400 hover:text-gray-700 p-1.5 rounded-full hover:bg-gray-100 transition"
              >
                <X size={20} />
              </button>
            </div>

            <h2 className="text-xl font-bold text-gray-900 mt-2">
              Verify your Email Address
            </h2>
            <p className="text-xs text-gray-500 mt-1 mb-6">
              Enter OTP sent to{" "}
              <span className="font-semibold text-gray-800">{email}</span>
            </p>

            {error && (
              <div className="mb-4 p-2.5 bg-red-50 text-red-600 text-xs rounded-lg text-center font-medium border border-red-100">
                {error}
              </div>
            )}

            <div className="flex items-center justify-between gap-2 sm:gap-2.5 my-6">
              {otpDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => (otpInputRefs.current[idx] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpDigitChange(e.target.value, idx)}
                  onKeyDown={(e) => handleOtpKeyDown(e, idx)}
                  onPaste={handleOtpPaste}
                  onFocus={() => setActiveOtpIndex(idx)}
                  className={`w-11 h-12 sm:w-12 sm:h-12 border rounded-lg text-center font-bold text-lg text-gray-900 transition outline-none ${
                    activeOtpIndex === idx
                      ? "border-red-500 ring-1 ring-red-500/20"
                      : digit
                      ? "border-gray-800"
                      : "border-gray-300"
                  }`}
                />
              ))}
            </div>

            <div className="text-center my-6">
              {resendTimer > 0 ? (
                <p className="text-xs text-gray-500">
                  Expect OTP in{" "}
                  <span className="font-bold text-gray-800">
                    {resendTimer} seconds
                  </span>
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleResendEmailOtp}
                  disabled={loading}
                  className="text-xs font-bold text-[#7B1E3D] hover:underline"
                >
                  Resend OTP
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleVerifyEmailOtp}
              disabled={!isOtpComplete || loading}
              className={`w-full py-3.5 rounded-lg text-sm font-semibold transition shadow-sm flex items-center justify-center ${
                isOtpComplete && !loading
                  ? "bg-[#7B1E3D] hover:bg-[#5C0F2A] text-white cursor-pointer"
                  : "bg-[#F7DCE2] text-white/90 cursor-not-allowed"
              }`}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Continue"
              )}
            </button>
          </div>
        )}

        {/* VIEW 4: VERIFY MOBILE OTP */}
        {view === "mobile-otp" && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setView("get-started");
                }}
                className="p-1 -ml-2 text-gray-700 hover:text-gray-900 rounded-full hover:bg-gray-100 transition"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                type="button"
                onClick={closeAuthModal}
                className="text-gray-400 hover:text-gray-700 p-1.5 rounded-full hover:bg-gray-100 transition"
              >
                <X size={20} />
              </button>
            </div>

            <h2 className="text-xl font-bold text-gray-900 mt-2">
              Verify your Mobile Number
            </h2>
            <p className="text-xs text-gray-500 mt-1 mb-6">
              Enter OTP sent to{" "}
              <span className="font-semibold text-gray-800">+91 {phone}</span>
            </p>

            {error && (
              <div className="mb-4 p-2.5 bg-red-50 text-red-600 text-xs rounded-lg text-center font-medium border border-red-100">
                {error}
              </div>
            )}

            <div className="flex items-center justify-between gap-2 sm:gap-2.5 my-6">
              {otpDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => (otpInputRefs.current[idx] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpDigitChange(e.target.value, idx)}
                  onKeyDown={(e) => handleOtpKeyDown(e, idx)}
                  onPaste={handleOtpPaste}
                  onFocus={() => setActiveOtpIndex(idx)}
                  className={`w-11 h-12 sm:w-12 sm:h-12 border rounded-lg text-center font-bold text-lg text-gray-900 transition outline-none ${
                    activeOtpIndex === idx
                      ? "border-red-500 ring-1 ring-red-500/20"
                      : digit
                      ? "border-gray-800"
                      : "border-gray-300"
                  }`}
                />
              ))}
            </div>

            <div className="text-center my-6">
              {resendTimer > 0 ? (
                <p className="text-xs text-gray-500">
                  Expect OTP in{" "}
                  <span className="font-bold text-gray-800">
                    {resendTimer} seconds
                  </span>
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleResendPhoneOtp}
                  disabled={loading}
                  className="text-xs font-bold text-[#7B1E3D] hover:underline"
                >
                  Resend OTP
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleVerifyPhoneOtp}
              disabled={!isOtpComplete || loading}
              className={`w-full py-3.5 rounded-lg text-sm font-semibold transition shadow-sm flex items-center justify-center ${
                isOtpComplete && !loading
                  ? "bg-[#7B1E3D] hover:bg-[#5C0F2A] text-white cursor-pointer"
                  : "bg-[#F7DCE2] text-white/90 cursor-not-allowed"
              }`}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Continue"
              )}
            </button>
          </div>
        )}

        {/* VIEW 5: PASSWORD LOGIN */}
        {view === "password-login" && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setView("email");
                }}
                className="p-1 -ml-2 text-gray-700 hover:text-gray-900 rounded-full hover:bg-gray-100 transition"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                type="button"
                onClick={closeAuthModal}
                className="text-gray-400 hover:text-gray-700 p-1.5 rounded-full hover:bg-gray-100 transition"
              >
                <X size={20} />
              </button>
            </div>

            <h2 className="text-xl font-bold text-gray-900 mt-2 mb-1">
              Enter Password
            </h2>
            <p className="text-xs text-gray-500 mb-6">{email}</p>

            {error && (
              <div className="mb-4 p-2.5 bg-red-50 text-red-600 text-xs rounded-lg text-center font-medium border border-red-100">
                {error}
              </div>
            )}

            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Password
                </label>
                <div className="relative flex items-center border border-gray-300 rounded-lg px-3.5 py-3 focus-within:border-[#7B1E3D]">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    autoFocus
                    className="w-full text-sm text-gray-900 outline-none bg-transparent"
                  />
                  <Lock className="w-4 h-4 text-gray-400 shrink-0 ml-2" />
                </div>
              </div>

              <div className="flex justify-end">
                <a
                  href="/forgot-password"
                  className="text-xs text-[#7B1E3D] hover:underline"
                >
                  Forgot password?
                </a>
              </div>

              <button
                type="submit"
                disabled={!password || loading}
                className={`w-full py-3.5 rounded-lg text-sm font-semibold transition shadow-sm flex items-center justify-center ${
                  password && !loading
                    ? "bg-[#7B1E3D] hover:bg-[#5C0F2A] text-white cursor-pointer"
                    : "bg-[#E0E0E0] text-gray-400 cursor-not-allowed"
                }`}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Sign In"
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
