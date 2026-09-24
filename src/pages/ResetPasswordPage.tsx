import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, unwrap } from "@/api/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { toast } from "sonner";
import { resetPassword, validateResetToken } from "@/api/booking.api";

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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
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
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password"
            className="w-full px-4 py-3 border border-slate-300 rounded-lg"
            minLength={8}
            required
          />
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