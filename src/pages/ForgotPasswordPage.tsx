import { useState } from "react";
import { Link } from "react-router-dom";
import { api, unwrap } from "@/api/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await unwrap(api.post("/auth/forgot-password", { email }));
      setSent(true);
    } catch {
      toast.error("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5FA]">
      <Header />
           <main className="flex-grow flex items-center justify-center p-6 pt-28 lg:pt-36 pb-12">

        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-2xl font-bold mb-2">Reset your password</h1>
          {sent ? (
            <>
              <p className="text-slate-600 text-sm mb-6">
                If that email is registered, we've sent instructions.
                Check your inbox and spam folder.
              </p>
              <Link to="/login" className="text-[#7B1E3D] font-medium hover:underline">
                Back to sign in
              </Link>
            </>
          ) : (
            <form onSubmit={submit} className="space-y-5">
              <p className="text-slate-600 text-sm">
                Enter your account email and we'll send a reset link.
              </p>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7B1E3D]"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#7B1E3D] hover:bg-[#5C0F2A] text-white font-bold py-3 rounded-lg disabled:opacity-50"
              >
                {loading ? "Sending…" : "Send reset link"}
              </button>
              <Link
                to="/login"
                className="block text-center text-sm text-slate-500 hover:text-slate-800"
              >
                Back to sign in
              </Link>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}