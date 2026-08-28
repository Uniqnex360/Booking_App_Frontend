import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, ArrowLeft } from 'lucide-react';

export default function VerifyOtpPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // 1. Extract EVERYTHING from context
  const { signInWithFirebase, verifySignUp } = useAuthContext();

  // 2. Extract URL Parameters
  const mode = searchParams.get('mode'); // 'signup' or null (login)
  const phone = searchParams.get('phone');
  const email = searchParams.get('email');
  const userId = searchParams.get('user_id');

  // 3. Component State
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'signup' && userId) {
        // --- PATH A: MANUAL SIGNUP (Internal Backend OTP) ---
        const { error: apiError } = await verifySignUp(userId, code);
        
        if (apiError) {
          setError(apiError);
        } else {
          // Success! User is now created in DB
          alert("Email verified! You can now sign in.");
          navigate('/login');
        }
      } else {
        // --- PATH B: PHONE LOGIN (Firebase OTP) ---
        const confirmObj = (window as any).confirmationResult;
        if (!confirmObj) {
          throw new Error("Session expired. Please restart the login process.");
        }

        const result = await confirmObj.confirm(code);
        const token = await result.user.getIdToken();
        
        const { error: apiError } = await signInWithFirebase({ token });
        
        if (apiError) setError(apiError);
        else navigate('/profile');
      }
    } catch (err: any) {
      setError(err.message || "Invalid verification code.");
    } finally {
      setLoading(false);
    }
  };

  // UI Strings based on mode
  const title = mode === 'signup' ? "Verify Email" : "Verify Phone";
  const destination = mode === 'signup' ? email : phone;

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md space-y-6 bg-card p-8 rounded-2xl border shadow-sm">
        
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-serif font-bold">{title}</h1>
          <p className="text-sm text-muted-foreground">
            Enter the 6-digit code sent to <br />
            <span className="font-medium text-foreground">{destination}</span>
          </p>
        </div>
        
        {error && (
          <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-xl animate-shake">
            {error}
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-4">
          <Input 
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000" 
            maxLength={6}
            value={code} 
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} // Only numbers
            className="text-center tracking-[0.5em] text-2xl h-14 rounded-xl font-mono"
          />
          
          <Button 
            type="submit" 
            className="w-full h-12 bg-wine-700 hover:bg-wine-800 text-white rounded-xl font-semibold"
            disabled={loading || code.length !== 6}
          >
            {loading ? <Loader2 className="animate-spin" /> : "Verify Identity"}
          </Button>
        </form>

        <Button 
          variant="ghost" 
          className="w-full text-muted-foreground" 
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>
    </div>
  );
}