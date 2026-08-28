  import { useState } from 'react';
  import { Link, useNavigate } from 'react-router-dom';
  import { useAuth } from '@/hooks/useAuth';
  import { Button } from '@/components/ui/button';
  import { Input } from '@/components/ui/input';
  import { Label } from '@/components/ui/label';
  import {
    Wine,
    User,
    Mail,
    Lock,
    ArrowLeft,
    Loader2,
    ArrowRight,
    Check,
  } from 'lucide-react';
  import { validatePassword } from '@/utils/validators';
  import { useAuthContext } from '@/contexts/AuthContext';

  export default function RegisterPage() {
    const navigate = useNavigate();
  const { signUp, continueWithGoogle,initiateSignUp } = useAuthContext();

    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const { checks } = validatePassword(password);

  const handleGoogleAction = async () => {
    setLoading(true);
    const { error } = await continueWithGoogle();
    setLoading(false);
    
    if (error) setError(error);
    else navigate('/profile');
  };
   const handleRegister = async (e: React.FormEvent) => {
  e.preventDefault();
  setError(null);
  setLoading(true);

  const { userId, error: apiError } = await initiateSignUp({
    full_name: fullName,
    email,
    password,
  });

  setLoading(false);

  if (apiError) {
    setError(apiError);
  } else if (userId) {
    // 2. Navigate to OTP page passing user_id and email in the URL
    navigate(`/verify-otp?mode=signup&email=${encodeURIComponent(email)}&user_id=${userId}`);
  }
};


    return (
      <div className="flex min-h-screen flex-col lg:flex-row">
        {/* Left visual panel */}
        <div className="relative hidden flex-1 overflow-hidden wine-gradient lg:block">
          <div className="absolute inset-0 bg-wine-radial" />
          <div className="absolute -right-20 top-20 h-96 w-96 rounded-full bg-wine-500/20 blur-3xl" />
          <div className="absolute -bottom-32 -left-10 h-80 w-80 rounded-full bg-wine-400/10 blur-3xl" />
          <div className="relative flex h-full flex-col justify-between p-12 text-white">
            {/* <Link to="/" className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur">
                <Wine className="h-5 w-5 text-white" strokeWidth={2.2} />
              </div>
              <span className="font-serif text-2xl font-semibold">Vignette</span>
            </Link> */}
            {/* <div>
              <h2 className="font-serif text-5xl font-semibold leading-tight">
                Begin your
                <br />
                <em className="italic text-wine-200">journey.</em>
              </h2>
              <p className="mt-4 max-w-sm text-wine-100/70">
                Create an account to book exclusive dining, events, and curated
                experiences — all in one place.
              </p>
              <div className="mt-8 space-y-3">
                {[
                  'Instant booking confirmation',
                  'Flexible rescheduling',
                  'Exclusive member experiences',
                ].map((benefit) => (
                  <div key={benefit} className="flex items-center gap-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-sm text-wine-100/80">{benefit}</span>
                  </div>
                ))}
              </div>
            </div> */}
            {/* <p className="text-sm text-wine-100/50">
              Join 50,000+ guests who book with Vignette
            </p> */}
          </div>
        </div>

        {/* Right form panel */}
        <div className="flex flex-1 items-center justify-center bg-background px-4 py-12 sm:px-6">
          <div className="w-full max-w-md">
            <Link
              to="/"
              className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-wine-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </Link>

            <div className="mb-6 lg:hidden">
              <Link to="/" className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl wine-gradient">
                  <Wine className="h-5 w-5 text-white" strokeWidth={2.2} />
                </div>
                <span className="font-serif text-2xl font-semibold text-wine-900">
                  Vignette
                </span>
              </Link>
            </div>

            <h1 className="font-serif text-4xl font-semibold text-wine-950">
              Create account
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-medium text-wine-700 hover:text-wine-900"
              >
                Sign in
              </Link>
            </p>

            {error && (
              <div className="mt-6 animate-slide-down rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}
  <div className="mt-8">
              <Button 
                type="button"
                onClick={handleGoogleAction}
                variant="outline" 
                className="w-full h-11 rounded-xl border-wine-100 hover:bg-wine-50 gap-3 shadow-sm transition-all"
                disabled={loading}
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                Continue with Google
              </Button>
            </div>

            <div className="relative mt-8 mb-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-muted" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or register with email</span>
              </div>
            </div>
            <form onSubmit={handleRegister} className="mt-8 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-sm font-medium">
                  Full name
                </Label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="fullName"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    className="h-11 rounded-xl pl-10"
                  />
                </div>
              </div>

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

              {/* <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium">
                  Phone number
                </Label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 123-4567"
                    className="h-11 rounded-xl pl-10"
                  />
                </div>
              </div> */}

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a strong password"
                    className="h-11 rounded-xl pl-10"
                  />
                </div>
                {password.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1 animate-fade-in">
                    {checks.map((check) => (
                      <span
                        key={check.label}
                        className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
                          check.met
                            ? 'bg-success/10 text-success'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {check.met ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <span className="h-3 w-3 rounded-full border border-current" />
                        )}
                        {check.label}
                      </span>
                    ))}
                  </div>
                )}
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
                    Create account
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            {/* <p className="mt-8 text-center text-xs text-muted-foreground">
              By creating an account, you agree to our{' '}
              <Link to="#" className="underline hover:text-wine-700">
                Terms
              </Link>{' '}
              and{' '}
              <Link to="#" className="underline hover:text-wine-700">
                Privacy Policy
              </Link>
              .
            </p> */}
          </div>
        </div>
      </div>
    );
  }
