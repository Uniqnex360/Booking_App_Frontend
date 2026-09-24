import { Link, useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CheckCircle2 } from "lucide-react";

export default function ConfirmationPage() {
  const [params] = useSearchParams();
  const ref = params.get("ref") ?? "";
  const id = params.get("id") ?? "";

  return (
    <div className="min-h-screen bg-[#F5F5FA] flex flex-col">
      <Header />
      <main className="flex-grow flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <CheckCircle2 className="w-16 h-16 text-[#1EA83C] mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Booking confirmed</h1>
          <p className="text-slate-500 text-sm mb-6">
            Your tickets will be sent to your email shortly.
          </p>

          <div className="bg-slate-50 rounded-lg p-4 mb-6">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
              Reference
            </p>
            <p className="text-lg font-mono font-bold text-slate-900 break-all">
              {ref || "—"}
            </p>
          </div>

          <Link
            to="/"
            className="block w-full bg-[#7B1E3D] hover:bg-[#5C0F2A] text-white font-bold py-3 rounded-lg transition"
          >
            Back to movies
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}