import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { toast } from "sonner";
import { resetPassword, validateResetToken } from "@/api/booking.api";
import { validatePassword } from "@/utils/validators";
import { Check } from "lucide-react";

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") ?? "";

  const [valid, setValid] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

    useEffect(() => {
    if (!token) {
      setValid(false);
      return;
    }
    validateResetToken(token)
      .then((r) => setValid(r.valid))
      .catch(() => setValid(false));
  }, [token]);
  const { checks } = validatePassword(password);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checks.every((c) => c.met)) {
  toast.error("Password doesn't meet the requirements");
  return;
}
    if (password !== confirm) {
      toast.error("Passwords don't match");
      return;
    }
    setLoading(true);
        try {
      await resetPassword(token, password);
      toast.success("Password updated. Please sign in.");
      navigate("/login");
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      toast.error(typeof detail === "string" && detail ? detail : "Could not reset password");
    } finally {
      setLoading(false);
    }
  };

  if (valid === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Checking link…
      </div>
    );
  }

  if (!valid) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F5F5FA]">
        <Header />
           <main className="flex-grow flex items-center justify-center p-6 pt-28 lg:pt-36 pb-12">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
            <h1 className="text-xl font-bold mb-2">Link expired</h1>
            <p className="text-slate-500 text-sm mb-6">
              This reset link is invalid or has expired. Request a new one.
            </p>
            <Link to="/forgot-password" className="text-[#7B1E3D] font-medium hover:underline">
              Request new link
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5FA]">
      <Header />
      <main className="flex-grow flex items-center justify-center p-6">
        <form onSubmit={submit} className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 space-y-5">
          <h1 className="text-2xl font-bold">Set a new password</h1>
          <div>
  <input
    id="password"
    type="password"
    required
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    placeholder="Create a strong password"
    className="w-full px-4 py-3 border border-slate-300 rounded-lg"
    minLength={8}
  />
  {password.length > 0 && (
    <div className="flex flex-wrap gap-2 pt-1 animate-fade-in">
      {checks.map((check) => (
        <span
          key={check.label}
          className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
            check.met
              ? "bg-emerald-50 text-emerald-600"
              : "bg-muted text-slate-500"
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
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirm new password"
            className="w-full px-4 py-3 border border-slate-300 rounded-lg"
            minLength={8}
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#7B1E3D] hover:bg-[#5C0F2A] text-white font-bold py-3 rounded-lg disabled:opacity-50"
          >
            {loading ? "Updating…" : "Update password"}
          </button>
        </form>
      </main>
      <Footer />
    </div>
  );
}