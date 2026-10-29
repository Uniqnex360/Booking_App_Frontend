import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { checkEmailExists } from "@/api/auth.api";
import { X, ChevronLeft, Mail, Loader2, EyeOff, Eye } from "lucide-react";
import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";

export type AuthModalView =
  | "get-started"
  | "email"
  | "email-otp"
  | "mobile-otp";

export function QuickAuthModal() {
  const navigate = useNavigate();
  const {
    isAuthModalOpen,
    closeAuthModal,
    authModalInitialView,
    continueWithGoogle,
    continueWithApple,
    signIn,
    sendEmailOtpLogin,
    verifyEmailOtpLogin,
    signInWithPhoneEmail,
  } = useAuth() as any;

  const clientId =
    import.meta.env.VITE_PHONE_WITH_EMAIL_CLIENT_ID || "16879666373804430168";

  const [view, setView] = useState<AuthModalView>("get-started");
  const isIos = Capacitor.getPlatform() === "ios";
  const isAndroid = Capacitor.getPlatform() === "android" || /Android/i.test(navigator?.userAgent || "");
  // Apple Sign-In is required on iOS devices for Apple Review Guideline 4.8.
  // On Android devices, it is hidden to prevent confusion and errors.
  const showAppleSignIn = isIos || (!isAndroid && /Mac|iPhone|iPad|iPod/i.test(navigator?.userAgent || ""));
  const [showInAppPhoneAuth, setShowInAppPhoneAuth] = useState(false);
  const [emailStep, setEmailStep] = useState<"enter-email" | "password">("enter-email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  const [otpDigits, setOtpDigits] = useState<string[]>([
    "",
    "",
    "",
    "",
    "",
    "",
  ]);
  const [activeOtpIndex, setActiveOtpIndex] = useState(0);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [resendTimer, setResendTimer] = useState(30);

  useEffect(() => {
    if (isAuthModalOpen) {
      setView(authModalInitialView || "get-started");
      setShowInAppPhoneAuth(false);
      setEmailStep("enter-email");
      setError(null);
      setLoading(false);
      setOtpDigits(["", "", "", "", "", ""]);
      setPassword("");
      setShowPassword(false);
      setResendTimer(30);
    } else {
      setShowInAppPhoneAuth(false);
    }
  }, [isAuthModalOpen, authModalInitialView]);

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

  const isProcessingPhoneRef = useRef(false);

  const handlePhoneVerified = async (userJsonUrl: string) => {
    if (!userJsonUrl || isProcessingPhoneRef.current) return;
    isProcessingPhoneRef.current = true;
    setLoading(true);
    try {
      const { error: apiError } = await signInWithPhoneEmail({
        url: userJsonUrl,
      });
      if (apiError) {
        setError(apiError);
        toast.error(apiError);
      } else {
        toast.success("Phone verified successfully!");
        closeAuthModal();
      }
    } catch (err: any) {
      setError(err?.message || "Phone verification failed.");
    } finally {
      setLoading(false);
      setTimeout(() => {
        isProcessingPhoneRef.current = false;
      }, 2500);
    }
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (
        event.origin === "https://auth.phone.email" ||
        event.origin === "https://www.phone.email"
      ) {
        const userJsonUrl = event.data?.user_json_url;
        if (userJsonUrl) {
          setShowInAppPhoneAuth(false);
          handlePhoneVerified(userJsonUrl);
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  useEffect(() => {
    if (!isAuthModalOpen) return;

    (window as any).phoneEmailListener = (userObj: any) => {
      const userJsonUrl = userObj?.user_json_url;
      if (userJsonUrl) {
        setShowInAppPhoneAuth(false);
        handlePhoneVerified(userJsonUrl);
      }
    };

    const handleCustomToken = (e: any) => {
      const userJsonUrl = e?.detail?.user_json_url;
      if (userJsonUrl) {
        setShowInAppPhoneAuth(false);
        handlePhoneVerified(userJsonUrl);
      }
    };
    window.addEventListener("phoneEmailToken", handleCustomToken);

    return () => {
      window.removeEventListener("phoneEmailToken", handleCustomToken);
      delete (window as any).phoneEmailListener;
    };
  }, [isAuthModalOpen]);

  const openPhoneEmailLogin = () => {
    setError(null);
    if ((window as any).Android && typeof (window as any).Android.openPhoneLogin === "function") {
      (window as any).Android.openPhoneLogin(clientId);
      return;
    }
    if (Capacitor.isNativePlatform()) {
      setShowInAppPhoneAuth(true);
      return;
    }

    const currUrl = window.location.href;
    const w = 500;
    const h = 560;
    const left = (window.screen.width - w) / 2;
    const top = (window.screen.height - h) / 2;

    window.open(
      `https://auth.phone.email/log-in?client_id=${clientId}&auth_type=8&origin=${encodeURIComponent(
        currUrl,
      )}`,
      "peLoginWindow",
      `toolbar=0,scrollbars=0,location=0,statusbar=0,menubar=0,resizable=0,width=${w},height=${h},top=${top},left=${left}`,
    );
  };

  if (!isAuthModalOpen) return null;

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const otpCode = otpDigits.join("");
  const isOtpComplete = otpCode.length === 6;

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

    if (index < 5) {
      setActiveOtpIndex(index + 1);
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number,
  ) => {
    if (e.key === "Backspace") {
      if (!otpDigits[index] && index > 0) {
        setActiveOtpIndex(index - 1);
        otpInputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
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

  const handleSendEmailOtp = async () => {
    if (!isEmailValid) return;
    setError(null);
    setLoading(true);

    try {
      const res = await sendEmailOtpLogin({
        email: email.trim(),
        full_name: email.split("@")[0],
      });

      if (res.error) {
        setError(res.error);
        toast.error(res.error);
      } else {
        if (res.data?.user_id) {
          setUserId(res.data.user_id);
        }
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
      const res = await verifyEmailOtpLogin({
        user_id: userId || undefined,
        email: email.trim(),
        otp_code: otpCode,
      });

      if (res.error) {
        setError(res.error);
        toast.error(res.error);
      } else {
        toast.success("Signed in successfully!");
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

  const handleEmailContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEmailValid || loading) return;
    setError(null);
    setLoading(true);

    try {
      const emailStatus = await checkEmailExists(email.trim());
      if (emailStatus.exists) {
        // Existing user: reveal password input to sign in
        setEmailStep("password");
      } else {
        // New user: immediately send OTP to verify and sign up
        const res = await sendEmailOtpLogin({
          email: email.trim(),
          full_name: email.split("@")[0],
        });

        if (res.error) {
          setError(res.error);
          toast.error(res.error);
        } else {
          if (res.data?.user_id) {
            setUserId(res.data.user_id);
          }
          setOtpDigits(["", "", "", "", "", ""]);
          setResendTimer(30);
          setView("email-otp");
          toast.success(`Welcome! Verification OTP sent to ${email}`);
        }
      }
    } catch (err: any) {
      setError(err?.message || "Failed to check email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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
        const isAdminRole = ["ADMIN", "SUPER_ADMIN", "OPERATIONS_ADMIN", "FINANCE_ADMIN", "SUPPORT_ADMIN"].includes(res.user?.role);
        if (res.user?.role === "THEATRE_PARTNER") {
          navigate("/theatre/dashboard");
        } else if (res.user?.role === "PARTNER") {
          navigate("/partner/dashboard");
        } else if (isAdminRole) {
          navigate("/admin");
        }
      }
    } catch (err: any) {
      setError(err?.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-[2px] p-4 animate-in fade-in duration-200">
      <style>{`
        .pe_signin_button {
          display: flex !important;
          justify-content: center !important;
          width: 100% !important;
        }
        .pe_signin_button button,
        .pe_signin_button #btn_ph_login {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          width: 100% !important;
          height: 48px !important;
          border-radius: 12px !important;
          font-size: 14px !important;
          font-weight: 600 !important;
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05) !important;
          transition: all 0.2s ease !important;
          cursor: pointer !important;
          background-color: #02BD7E !important;
          color: #ffffff !important;
          border: none !important;
        }
        .pe_signin_button button:hover,
        .pe_signin_button #btn_ph_login:hover {
          filter: brightness(0.95) !important;
        }
      `}</style>
      <div
        className={`relative w-full max-w-[430px] bg-white rounded-2xl shadow-2xl ${
          showInAppPhoneAuth ? "p-4 sm:p-5" : "p-6 sm:p-8"
        } animate-in zoom-in-95 duration-200`}
      >
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/70 cursor-wait">
            <Loader2 className="w-8 h-8 animate-spin text-[#7B1E3D]" />
          </div>
        )}

        {showInAppPhoneAuth ? (
          <div>
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setShowInAppPhoneAuth(false);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 transition p-1.5 rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                <ChevronLeft size={16} />
                <span>Back</span>
              </button>
              <h3 className="text-sm font-bold text-gray-900">
                Sign In with Phone
              </h3>
              <button
                type="button"
                onClick={closeAuthModal}
                className="text-gray-400 hover:text-gray-700 p-1.5 rounded-full hover:bg-gray-100 transition cursor-pointer"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {error && (
              <div className="mb-3 p-2.5 bg-red-50 text-red-600 text-xs rounded-lg text-center font-medium border border-red-100">
                {error}
              </div>
            )}

            <div className="w-full h-[520px] max-h-[75vh] rounded-xl overflow-hidden border border-gray-100 bg-white shadow-inner">
              <iframe
                src={`https://auth.phone.email/log-in?client_id=${clientId}&auth_type=1`}
                title="Phone Verification"
                className="w-full h-full border-0"
                allow="clipboard-write"
              />
            </div>
          </div>
        ) : (
          <>
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
              {showAppleSignIn && (
                <button
                  type="button"
                  onClick={handleAppleSignIn}
                  disabled={loading}
                  className="w-full h-12 flex items-center justify-center rounded-xl bg-black hover:bg-neutral-900 text-sm font-semibold text-white transition shadow-sm relative group cursor-pointer border border-black"
                >
                  <svg className="w-5 h-5 absolute left-5 fill-current text-white group-hover:scale-105 transition-transform" viewBox="0 0 170 170">
                    <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.58-7.71-11.65-14-5.99-9.13-10.83-19.99-14.54-32.58-3.71-12.6-5.57-24.3-5.57-35.1 0-14.35 3.7-26.36 11.11-36.03 7.41-9.68 16.73-14.62 27.95-14.83 4.58 0 9.8 1.19 15.66 3.58 5.86 2.39 9.8 3.59 11.83 3.59 1.85 0 5.76-1.14 11.74-3.43 5.98-2.28 11.09-3.32 15.33-3.12 11.1.54 20.31 4.58 27.63 12.12-9.78 5.87-14.57 14.24-14.37 25.11.22 8.48 3.48 15.65 9.78 21.52 6.3 5.87 13.91 9.24 22.82 10.11-2.07 6.3-4.57 12.6-7.5 18.91zM119.22 31.84c0-7.72 2.72-14.88 8.15-21.49 5.43-6.61 12.17-10.35 20.21-11.22.11.98.16 1.85.16 2.61 0 7.72-2.82 14.99-8.47 21.82-5.65 6.83-12.49 10.64-20.52 11.43-.1-.98-.16-1.85-.16-2.61z"/>
                  </svg>
                  <span>Sign in with Apple</span>
                </button>
              )}

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
            </div>

            <div className="relative my-6 flex items-center justify-center">
              <div className="w-full border-t border-gray-200" />
              <span className="absolute bg-white px-3 text-[11px] font-bold text-gray-400 tracking-wider">
                OR
              </span>
            </div>

            <div className="flex flex-col items-center justify-center">
              <p className="text-xs text-gray-500 mb-3 text-center">
                Sign in securely with your mobile number via OTP
              </p>

              <div
                className="pe_signin_button w-full flex justify-center"
                data-client-id={clientId}
                style={{ minHeight: "48px", width: "100%" }}
              >
                <button
                  id="btn_ph_login"
                  name="btn_ph_login"
                  disabled={loading}
                  type="button"
                  onClick={openPhoneEmailLogin}
                  className="w-full h-12 flex items-center justify-center gap-2.5 rounded-xl text-white font-semibold text-sm transition-all shadow-sm cursor-pointer hover:brightness-95 active:scale-[0.99]"
                  style={{
                    backgroundColor: "#02BD7E",
                  }}
                >
                  <img
                    src="https://storage.googleapis.com/prod-phoneemail-prof-images/phem-widgets/phem-phone.svg"
                    alt="phone email"
                    className="w-5 h-5"
                  />
                  <span>Sign In with Phone</span>
                </button>
              </div>
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

        {view === "email" && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  if (emailStep === "password") {
                    setEmailStep("enter-email");
                  } else {
                    setView("get-started");
                  }
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

            <h2 className="text-xl font-bold text-gray-900 mt-2 mb-2">
              {emailStep === "password" ? "Enter your password" : "Continue with Email"}
            </h2>
            <p className="text-xs text-gray-500 mb-6">
              {emailStep === "password"
                ? `Welcome back! Enter your password for ${email}`
                : "Enter your email to sign in or get started"}
            </p>

            {error && (
              <div className="mb-4 p-2.5 bg-red-50 text-red-600 text-xs rounded-lg text-center font-medium border border-red-100">
                {error}
              </div>
            )}

            {emailStep === "enter-email" ? (
              <form onSubmit={handleEmailContinue} className="space-y-4">
                <div>
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
                      disabled={loading}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      autoFocus
                      className="w-full text-sm text-gray-900 outline-none bg-transparent"
                    />
                    {isEmailValid && (
                      <Mail className="w-4 h-4 text-emerald-600 shrink-0 ml-2" />
                    )}
                  </div>
                </div>

                <button
                  type="submit"
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
              </form>
            ) : (
              <form onSubmit={handlePasswordLogin} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-medium text-gray-600">
                      Email
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setEmailStep("enter-email");
                      }}
                      className="text-xs text-[#7B1E3D] hover:underline font-medium"
                    >
                      Change
                    </button>
                  </div>
                  <div className="flex items-center border border-gray-200 bg-gray-50 rounded-lg px-3.5 py-2.5 text-sm text-gray-700">
                    <span className="truncate flex-1">{email}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Password
                  </label>
                  <div className="relative flex items-center border border-gray-300 rounded-lg px-3.5 py-3 focus-within:border-[#7B1E3D]">
                    <input
                      type={showPassword ? "text" : "password"}
                      disabled={loading}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      autoFocus
                      required
                      className="w-full text-sm text-gray-900 outline-none bg-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      className="text-gray-400 hover:text-gray-700 shrink-0 ml-2"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
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
                  disabled={!isEmailValid || !password || loading}
                  className={`w-full py-3.5 rounded-lg text-sm font-semibold transition shadow-sm flex items-center justify-center ${
                    isEmailValid && password && !loading
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

                <div className="mt-4 text-center">
                  <button
                    type="button"
                    disabled={!isEmailValid || loading}
                    onClick={handleSendEmailOtp}
                    className={`text-xs underline transition ${
                      isEmailValid && !loading
                        ? "text-gray-500 hover:text-[#7B1E3D] cursor-pointer"
                        : "text-gray-300 cursor-not-allowed no-underline"
                    }`}
                  >
                    Login with OTP instead
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

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

            <div className="grid grid-cols-6 gap-2 sm:gap-2.5 my-6 mx-auto w-full max-w-[320px]">
              {otpDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => (otpInputRefs.current[idx] = el)}
                  type="text"
                  inputMode="numeric"
                  disabled={loading}
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpDigitChange(e.target.value, idx)}
                  onKeyDown={(e) => handleOtpKeyDown(e, idx)}
                  onPaste={handleOtpPaste}
                  onFocus={() => setActiveOtpIndex(idx)}
                  className={`w-full h-12 border rounded-xl text-center font-bold text-lg text-gray-900 transition-all outline-none ${
                    activeOtpIndex === idx
                      ? "border-[#7B1E3D] ring-2 ring-[#7B1E3D]/20 bg-white shadow-xs"
                      : digit
                        ? "border-gray-800 bg-white"
                        : "border-gray-300 bg-gray-50/50 hover:bg-white"
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
      </>
    )}
  </div>
</div>
);
}
