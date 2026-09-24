import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RecaptchaVerifier } from "firebase/auth";

import {
  Mail,
  Lock,
  Phone,
  ArrowLeft,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { getCurrentUser } from "@/api/auth.api";

export default function LoginPage() {
  const navigate = useNavigate();
  const { signIn, continueWithGoogle, signInWithPhoneEmail } = useAuthContext();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("email");
  const [, setPhoneLoading] = useState(false);
  const clientId = import.meta.env.VITE_PHONE_WITH_EMAIL_CLIENT_ID;

  const handleGoogleAction = async () => {
    setError(null);
    setLoading(true);
    try {
      const res: any = await continueWithGoogle();
      if (res?.cancelled) {
        return;
      }
      if (res?.error) {
        setError(res.error);
      } else {
        const currentUser = await getCurrentUser().catch(() => null);
        if (currentUser?.role === "ADMIN") {
          navigate("/admin/partners");
        } else {
          navigate("/profile");
        }
      }
    } catch (err: any) {
      setError(err?.message || "Google sign-in failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: apiError } = await signIn({ email, password });

    if (apiError) {
      setError(apiError);
      setLoading(false);
    } else {
      const currentUser = await getCurrentUser();
      setLoading(false);
      if (currentUser.role === "ADMIN") {
        navigate("/admin/partners");
      } else {
        navigate("/profile");
      }
    }
  };

  useEffect(() => {
    if (activeTab === "phone") {
      (window as any).phoneEmailListener = async (userObj: any) => {
        const userJsonUrl = userObj.user_json_url;
        if (userJsonUrl) {
          setLoading(true);
          const { error } = await signInWithPhoneEmail({ url: userJsonUrl });
          setLoading(false);
          if (error) setError(error);
          else navigate("/profile");
        }
      };

      const script = document.createElement("script");
      script.src = "https://www.phone.email/sign_in_button_v1.js";
      script.async = true;
      document.body.appendChild(script);

      return () => {
        if (document.body.contains(script)) {
          document.body.removeChild(script);
        }
        delete (window as any).phoneEmailListener;
      };
    }
  }, [activeTab]);

  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPhoneLoading(true);

    try {
      if ((window as any).recaptchaVerifier) {
        (window as any).recaptchaVerifier.clear();
      }

      (window as any).recaptchaVerifier = new RecaptchaVerifier(
        auth,
        "recaptcha-container",
        {
          size: "normal",
        }
      );

      navigate(`/verify-otp?phone=${encodeURIComponent(phone)}`);
    } catch {
      setError(
        "Failed to send SMS. Make sure to include country code (e.g. +91)"
      );
    } finally {
      setPhoneLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Left Banner Section with Logo */}
      <div className="relative hidden flex-1 overflow-hidden bg-gradient-to-br from-[#1A1A2E] via-[#2D121D] to-[#1A1A2E] lg:flex lg:items-center lg:justify-center p-12">
        {/* Glow Effects */}
        <div className="absolute -right-20 top-20 h-96 w-96 rounded-full bg-[#7B1E3D]/30 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-10 h-80 w-80 rounded-full bg-[#7B1E3D]/20 blur-3xl pointer-events-none" />

        <div className="absolute inset-0 flex items-center justify-center p-8">
          <div className="relative z-10 rounded-3xl bg-white p-8 shadow-2xl max-w-md w-full flex items-center justify-center border border-white/20 transition-transform duration-300 hover:scale-[1.01]">
            <img
              src="/logo.png"
              alt="Vyhbz Logo"
              className="w-full h-auto object-contain max-h-[480px]"
            />
          </div>
        </div>
      </div>

      {/* Right Login Form Section */}
      <div className="flex flex-1 items-center justify-center bg-slate-50 px-4 py-12 sm:px-6">
        <div className="w-full max-w-md">
          <Link
            to="/"
            className="mb-8 inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-[#5C0F2A]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>

          <h1 className="font-serif text-4xl font-semibold text-slate-900">
            Sign in
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            <Link
              to="/register"
              className="font-medium text-[#7B1E3D] hover:text-slate-900"
            >
              Create an account
            </Link>
          </p>

          {error && (
            <div className="mt-6 animate-slide-down rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {error}
            </div>
          )}

          {/* Social Login Section */}
          <div className="mt-8">
            <Button
              onClick={handleGoogleAction}
              variant="outline"
              className="w-full h-11 rounded-xl border-[#7B1E3D]/20 hover:bg-[#7B1E3D]/5 gap-3"
              disabled={loading}
            >
              <img
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                alt="Google"
                className="w-5 h-5"
              />
              Continue with Google
            </Button>
          </div>

          <div className="relative mt-8">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-slate-50 px-2 text-slate-500">
                Or continue with
              </span>
            </div>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            defaultValue="email"
            className="mt-6"
          >
            <TabsList className="grid w-full grid-cols-2 rounded-xl bg-slate-50 p-1">
              <TabsTrigger
                value="email"
                className="rounded-lg text-sm font-medium"
              >
                <Mail className="mr-2 h-4 w-4" />
                Email
              </TabsTrigger>
              <TabsTrigger
                value="phone"
                className="rounded-lg text-sm font-medium"
              >
                <Phone className="mr-2 h-4 w-4" />
                Phone
              </TabsTrigger>
            </TabsList>

            <TabsContent value="email" className="mt-6">
              <form onSubmit={handleEmailLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email address
                  </Label>

                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <Input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="h-11 rounded-xl pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-medium">
                      Password
                    </Label>
                    <Link
                      to="/forgot-password"
                      className="text-xs font-medium text-[#7B1E3D] hover:text-slate-900"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <Input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="h-11 rounded-xl pl-10"
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="h-11 w-full rounded-xl bg-[#7B1E3D] text-sm font-semibold shadow-sm transition-all hover:bg-[#5C0F2A] hover:shadow-md"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Sign in
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="phone" className="mt-6" key={activeTab}>
              <div className="flex flex-col items-center justify-center space-y-4 min-h-[120px]">
                <p className="text-sm text-slate-500 text-center">
                  Click below to sign in securely with your phone number.
                </p>

                <div
                  className="pe_signin_button"
                  data-client-id={clientId}
                  style={{ display: "block", minHeight: "40px", minWidth: "200px" }}
                ></div>
              </div>
            </TabsContent>
          </Tabs>

          <div id="recaptcha-container"></div>
        </div>
      </div>
    </div>
  );
}