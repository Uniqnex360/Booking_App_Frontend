import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import {
  Ticket,
  Sparkles,
  ArrowLeft,
  QrCode,
  X,
  CheckCircle2,
  Clock,
  Store,
  Tag,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { retailApi, CustomerCoupon } from '@/api/retail.api';

export default function MyCouponsPage() {
  const navigate = useNavigate();
  const [coupons, setCoupons] = useState<CustomerCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'REDEEMED' | 'EXPIRED'>('ACTIVE');
  const [selectedCoupon, setSelectedCoupon] = useState<CustomerCoupon | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    loadCoupons();
  }, [activeTab]);

  const loadCoupons = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/login?redirect=/my-coupons');
      return;
    }

    try {
      setLoading(true);
      const data = await retailApi.getMyCoupons(activeTab);
      setCoupons(data);
    } catch (err) {
      console.error('Failed to load my coupons', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-24 md:pb-0">
      <Header />

      {/* Main Content Area with top offset for fixed header */}
      <div className="flex-1 pt-28 sm:pt-36 lg:pt-40">
        {/* Top Header */}
        <section className="bg-slate-900/60 border-b border-white/5 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/fashion')}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2">
                <Ticket className="w-6 h-6 text-pink-400" />
                <span>My Fashion Coupons</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-400">
                Your saved discount coupons for in-store retail showrooms and boutiques.
              </p>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 mt-6">
            {(['ACTIVE', 'REDEEMED', 'EXPIRED'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeTab === tab
                    ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/30'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {tab === 'ACTIVE' ? 'Available' : tab === 'REDEEMED' ? 'Redeemed' : 'Expired'}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Coupon List */}
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 py-8 w-full">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 rounded-2xl bg-slate-900/50 animate-pulse border border-white/5" />
            ))}
          </div>
        ) : coupons.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-white/5 space-y-4">
            <Ticket className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-slate-300">No {activeTab.toLowerCase()} coupons</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Explore live offers from top fashion brands in your city and claim exclusive in-store discounts.
            </p>
            <div>
              <Link
                to="/fashion"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs shadow-lg transition"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Explore Fashion Offers</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {coupons.map((c) => {
              const offer = c.offer;
              const isAvailable = c.status === 'ACTIVE';

              return (
                <div
                  key={c.id}
                  className={`rounded-2xl border p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition shadow-lg ${
                    isAvailable
                      ? 'bg-slate-900/80 border-white/10 hover:border-pink-500/30'
                      : 'bg-slate-900/40 border-white/5 opacity-75'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-slate-800 p-1 border border-white/10 overflow-hidden shrink-0">
                      <img
                        src={offer?.brand_logo_url || 'https://images.unsplash.com/photo-1544441893-675973e31985?w=400'}
                        alt={offer?.brand_name || 'Brand'}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    </div>

                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-pink-400 truncate">
                          {offer?.brand_name || 'Fashion Brand'}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            c.status === 'ACTIVE'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : c.status === 'REDEEMED'
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          {c.status}
                        </span>
                      </div>

                      <h3 className="text-sm sm:text-base font-extrabold text-white truncate">
                        {offer?.title || 'Exclusive Discount'}
                      </h3>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                        <div className="flex items-center gap-1 font-mono font-bold text-amber-300 bg-black/40 px-2 py-0.5 rounded-md border border-white/10">
                          <span>{c.coupon_code}</span>
                          <button
                            onClick={() => handleCopyCode(c.coupon_code)}
                            className="text-slate-400 hover:text-white ml-1"
                            title="Copy Code"
                          >
                            {copiedCode === c.coupon_code ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>

                        <span>Expires: {new Date(c.expires_at).toLocaleDateString()}</span>

                        {c.redeemed_store_name && (
                          <span className="text-blue-300">
                            Redeemed at {c.redeemed_store_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Show QR Button */}
                  <div className="shrink-0 flex items-center justify-end">
                    <button
                      onClick={() => setSelectedCoupon(c)}
                      className="px-4 py-2.5 rounded-xl bg-pink-600/20 hover:bg-pink-600/30 border border-pink-500/40 text-pink-300 hover:text-pink-200 font-bold text-xs flex items-center gap-2 transition"
                    >
                      <QrCode className="w-4 h-4" />
                      <span>{isAvailable ? 'Show QR Code' : 'View Details'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* QR Code Presentation Modal */}
      {selectedCoupon && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-white/20 rounded-3xl p-6 text-white shadow-2xl space-y-4 text-center relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setSelectedCoupon(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <span className="text-xs font-bold text-pink-400">
                {selectedCoupon.offer?.brand_name}
              </span>
              <h3 className="text-base font-extrabold text-white mt-0.5">
                {selectedCoupon.offer?.title}
              </h3>
            </div>

            {/* Scannable High-Contrast QR Code */}
            <div className="bg-white p-4 rounded-2xl inline-block mx-auto shadow-2xl border border-slate-200">
              <QRCodeSVG
                value={selectedCoupon.qr_code_payload}
                size={210}
                level="H"
                includeMargin={false}
              />
            </div>

            {/* Alphanumeric Code String */}
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                Coupon Code for Cashier
              </span>
              <div className="mt-1 font-mono text-xl font-black text-amber-400 tracking-wider bg-black/50 py-2 px-3 rounded-xl border border-white/10 flex items-center justify-center gap-2">
                <span>{selectedCoupon.coupon_code}</span>
                <button
                  onClick={() => handleCopyCode(selectedCoupon.coupon_code)}
                  className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white"
                  title="Copy Code"
                >
                  {copiedCode === selectedCoupon.coupon_code ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Present this QR code to the cashier before payment. The staff member will scan it with their terminal to apply your discount.
            </p>

            <button
              onClick={() => setSelectedCoupon(null)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
      </div>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}
