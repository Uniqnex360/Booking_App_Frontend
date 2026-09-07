import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";

import {
  Wine,
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
  const [phoneLoading, setPhoneLoading] = useState(false);
  const clientId = import.meta.env.VITE_PHONE_WITH_EMAIL_CLIENT_ID;
  console.log("CLIENT)D", clientId);
  const handleGoogleAction = async () => {
    setLoading(true);
    const { error } = await continueWithGoogle();
    setLoading(false);

    if (error) setError(error);
    else navigate("/profile");
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: apiError } = await signIn({ email, password });
    
    if (apiError) {
      setError(apiError);
      setLoading(false)
    } else {
      const currentUser=await getCurrentUser()
      setLoading(false)
      if(currentUser.role=='ADMIN')
      {
        navigate('/admin/partners')
      }
      else
      {
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

  useEffect(() => {
    if (activeTab === "phone") {
      const script = document.createElement("script");
script.src = "https://www.phone.email/sign_in_button_v1.js";      script.async = true;
      document.body.appendChild(script);

      return () => {
        if (document.body.contains(script)) {
          document.body.removeChild(script);
        }
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
        },
      );

      navigate(`/verify-otp?phone=${encodeURIComponent(phone)}`);
    } catch (err: any) {
      setError(
        "Failed to send SMS. Make sure to include country code (e.g. +91)",
      );
    } finally {
      setPhoneLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <div className="relative hidden flex-1 overflow-hidden wine-gradient lg:block">
        <div className="absolute inset-0 bg-wine-radial" />
        <div className="absolute -right-20 top-20 h-96 w-96 rounded-full bg-wine-500/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-10 h-80 w-80 rounded-full bg-wine-400/10 blur-3xl" />
        {/* <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur">
              <Wine className="h-5 w-5 text-white" strokeWidth={2.2} />
            </div>
            <span className="font-serif text-2xl font-semibold">Vignette</span>
          </Link>
          <div>
            <h2 className="font-serif text-5xl font-semibold leading-tight">
              Welcome back.
              <br />
              <em className="italic text-wine-200">Your table awaits.</em>
            </h2>
            <p className="mt-4 max-w-sm text-wine-100/70">
              Sign in to manage your bookings, discover new experiences, and
              pick up right where you left off.
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm text-wine-100/50">
            <div className="flex -space-x-2">
              {['A', 'M', 'J'].map((i) => (
                <div
                  key={i}
                  className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-wine-800 bg-wine-700 text-xs font-semibold"
                >
                  {i}
                </div>
              ))}
            </div>
            <span>50,000+ happy guests</span>
          </div>
        </div> */}
      </div>

      <div className="flex flex-1 items-center justify-center bg-background px-4 py-12 sm:px-6">
        <div className="w-full max-w-md">
          <Link
            to="/"
            className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-wine-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>

          <h1 className="font-serif text-4xl font-semibold text-wine-950">
            Sign in
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {/* New to Vignette?{' '} */}
            <Link
              to="/register"
              className="font-medium text-wine-700 hover:text-wine-900"
            >
              Create an account
            </Link>
          </p>

          {error && (
            <div className="mt-6 animate-slide-down rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Social Login Section */}
          <div className="mt-8">
            <Button
              onClick={handleGoogleAction}
              variant="outline"
              className="w-full h-11 rounded-xl border-wine-100 hover:bg-wine-50 gap-3"
              disabled={loading}
            >
              <img
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
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
              <span className="bg-background px-2 text-muted-foreground">
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
            <TabsList className="grid w-full grid-cols-2 rounded-xl bg-secondary/60 p-1">
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
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
                  </div>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
                  className="h-11 w-full rounded-xl bg-wine-700 text-sm font-semibold shadow-wine transition-all hover:bg-wine-800 hover:shadow-wine-lg"
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
    <p className="text-sm text-muted-foreground text-center">
      Click below to sign in securely with your phone number.
    </p>
    
    <div 
        className="pe_signin_button" 
      data-client-id={clientId}
      style={{ display: 'block', minHeight: '40px', minWidth: '200px' }}
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
