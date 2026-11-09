import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Sparkles,
  MapPin,
  Clock,
  Phone,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Tag,
  ArrowLeft,
  Share2,
  Navigation,
  AlertCircle,
  ExternalLink,
  Ticket,
} from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { retailApi, RetailOffer, CustomerCoupon } from '@/api/retail.api';

export default function FashionOfferDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [offer, setOffer] = useState<RetailOffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [claimedCoupon, setClaimedCoupon] = useState<CustomerCoupon | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (id) {
      loadOffer(id);
    }
  }, [id]);

  const loadOffer = async (offerId: string) => {
    try {
      setLoading(true);
      const [data, myCoupons] = await Promise.all([
        retailApi.getOfferDetail(offerId),
        retailApi.getMyCoupons().catch(() => []),
      ]);
      setOffer(data);

      // Check if user already claimed or redeemed this offer
      const coupons = (myCoupons as any[]).filter(
        (c) => String(c.offer_id) === String(offerId) || String(c.offer?.id) === String(offerId)
      );
      const activeClaim = coupons.find((c) =>
        ['ACTIVE', 'AVAILABLE', 'CLAIMED'].includes(String(c.status).toUpperCase())
      );
      const redeemedClaim = coupons.find(
        (c) => String(c.status).toUpperCase() === 'REDEEMED'
      );
      if (activeClaim) {
        setClaimedCoupon(activeClaim);
      } else if (redeemedClaim) {
        setClaimedCoupon(redeemedClaim);
      }
    } catch (err: any) {
      console.error('Failed to load offer', err);
      setErrorMsg(err.response?.data?.detail || 'Failed to load offer details');
    } finally {
      setLoading(false);
    }
  };

  const handleClaimCoupon = async () => {
    if (!offer) return;
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate(`/login?redirect=/fashion/offers/${offer.id}`);
      return;
    }

    try {
      setClaiming(true);
      setErrorMsg(null);
      const coupon = await retailApi.claimCoupon(offer.id);
      setClaimedCoupon(coupon);
    } catch (err: any) {
      console.error('Failed to claim coupon', err);
      setErrorMsg(err.response?.data?.detail || 'Unable to claim coupon at this time');
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans">
        <Header />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans">
        <Header />
        <div className="flex-1 max-w-xl mx-auto px-4 py-20 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-xl font-bold">Offer Not Found</h2>
          <p className="text-sm text-slate-400">
            {errorMsg || 'This offer may have expired or is no longer available.'}
          </p>
          <Link
            to="/fashion"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-pink-600 text-white font-semibold text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Fashion & Offers</span>
          </Link>
        </div>
      </div>
    );
  }

  const discountBadge =
    offer.offer_type === 'PERCENTAGE'
      ? `${offer.offer_value}% OFF`
      : offer.offer_type === 'FLAT_AMOUNT'
      ? `₹${offer.offer_value} OFF`
      : offer.offer_type === 'BUY_X_GET_Y'
      ? 'Buy 2 Get 1'
      : 'Gift with Purchase';

  const expiryDate = new Date(offer.ends_at).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-24 md:pb-0">
      <Header />

      {/* Main Content Area with top offset for fixed header */}
      <div className="flex-1 pt-28 sm:pt-36 lg:pt-40">
        {/* Top Breadcrumb & Actions Bar */}
        <div className="border-b border-white/5 bg-slate-900/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate('/fashion')}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Offers</span>
          </button>
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: offer.title,
                  text: `Check out this exclusive offer from ${offer.brand_name} on Vybhz!`,
                  url: window.location.href,
                });
              }
            }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
            title="Share Offer"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-8 w-full space-y-8">
        {/* Hero Card */}
        <div className="relative rounded-3xl overflow-hidden bg-slate-900 border border-white/10 shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-12">
            {/* Banner Image */}
            <div className="lg:col-span-7 relative h-64 sm:h-80 lg:h-auto min-h-[300px]">
              <img
                src={offer.banner_url || 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1000'}
                alt={offer.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent lg:hidden" />
              {offer.is_vybhz_exclusive && (
                <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-[#7B1E3D] text-white text-xs font-black uppercase tracking-wider shadow-lg flex items-center gap-1.5 border border-pink-400/40">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Vybhz Exclusive Offer</span>
                </div>
              )}
            </div>

            {/* Offer Summary & Claim Action */}
            <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Link
                    to={`/fashion/brands/${offer.retail_partner_id}`}
                    className="flex items-center gap-2 group"
                  >
                    {offer.brand_logo_url && (
                      <div className="w-8 h-8 rounded-lg bg-slate-800 p-0.5 border border-white/10 overflow-hidden">
                        <img
                          src={offer.brand_logo_url}
                          alt={offer.brand_name}
                          className="w-full h-full object-cover rounded-md"
                        />
                      </div>
                    )}
                    <span className="text-sm font-bold text-pink-400 group-hover:underline">
                      {offer.brand_name}
                    </span>
                  </Link>
                  <span className="px-3 py-1 rounded-xl bg-amber-400 text-slate-950 font-black text-xs">
                    {discountBadge}
                  </span>
                </div>

                <h1 className="text-xl sm:text-2xl font-black text-white leading-tight">
                  {offer.title}
                </h1>

                {offer.short_description && (
                  <p className="text-xs sm:text-sm text-slate-300">
                    {offer.short_description}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                  <div className="bg-slate-800/80 p-2.5 rounded-xl border border-white/5">
                    <span className="text-[10px] text-slate-400 block font-medium">Valid Until</span>
                    <span className="font-bold text-white">{expiryDate}</span>
                  </div>
                  <div className="bg-slate-800/80 p-2.5 rounded-xl border border-white/5">
                    <span className="text-[10px] text-slate-400 block font-medium">Min. Purchase</span>
                    <span className="font-bold text-white">
                      {offer.min_purchase_amount ? `₹${offer.min_purchase_amount}` : 'No Minimum'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Claim Box */}
              <div className="pt-4 border-t border-white/10 space-y-3">
                {claimedCoupon ? (
                  claimedCoupon.status === 'REDEEMED' ? (
                    <div className="p-4 rounded-2xl bg-slate-900 border border-white/10 text-center space-y-2">
                      <div className="flex items-center justify-center gap-1.5 text-slate-300 font-bold text-sm">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Coupon Redeemed In-Store</span>
                      </div>
                      <div className="font-mono text-lg font-black tracking-widest text-slate-400 bg-black/40 py-2 px-3 rounded-xl border border-white/5 line-through">
                        {claimedCoupon.coupon_code || (claimedCoupon as any).claim_code}
                      </div>
                      <p className="text-[11px] text-slate-400">
                        This exclusive coupon has already been redeemed at checkout.
                      </p>
                      <button
                        onClick={() => navigate('/my-coupons')}
                        className="w-full mt-2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <Ticket className="w-4 h-4" />
                        <span>View Coupon History</span>
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-center space-y-2">
                      <div className="flex items-center justify-center gap-1.5 text-emerald-300 font-bold text-sm">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Coupon Active in Your Wallet</span>
                      </div>
                      <div className="font-mono text-xl font-black tracking-widest text-amber-300 bg-black/40 py-2 px-3 rounded-xl border border-white/10">
                        {claimedCoupon.coupon_code || (claimedCoupon as any).claim_code}
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Show your QR code at the billing counter to redeem this discount.
                      </p>
                      <button
                        onClick={() => navigate('/my-coupons')}
                        className="w-full mt-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <Ticket className="w-4 h-4" />
                        <span>View in My Coupons (Show QR)</span>
                      </button>
                    </div>
                  )
                ) : (
                  <>
                    {errorMsg && (
                      <div className="text-xs text-rose-400 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
                        {errorMsg}
                      </div>
                    )}
                    <button
                      onClick={handleClaimCoupon}
                      disabled={claiming}
                      className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#7B1E3D] to-rose-700 hover:from-[#922549] hover:to-rose-600 active:scale-98 text-white font-extrabold text-sm shadow-xl shadow-pink-950/50 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                    >
                      <Sparkles className="w-4 h-4 text-pink-200" />
                      <span>{claiming ? 'Claiming Offer...' : 'Claim Free Coupon Now'}</span>
                    </button>
                    <p className="text-[11px] text-center text-slate-500">
                      Free for all Vybhz users • In-store redemption only
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Details & Participating Showrooms Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Description & Terms */}
          <div className="lg:col-span-7 space-y-6">
            {offer.description && (
              <div className="bg-slate-900/60 rounded-2xl border border-white/5 p-6 space-y-3">
                <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                  <Tag className="w-4 h-4 text-pink-400" />
                  <span>About This Offer</span>
                </h2>
                <div className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                  {offer.description}
                </div>
              </div>
            )}

            <div className="bg-slate-900/60 rounded-2xl border border-white/5 p-6 space-y-3">
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-pink-400" />
                <span>How to Redeem in Store</span>
              </h2>
              <ol className="text-xs sm:text-sm text-slate-300 space-y-2 list-decimal list-inside leading-relaxed">
                <li>Claim this offer on Vybhz to generate your unique customer coupon QR code.</li>
                <li>Visit any of the participating showrooms listed below.</li>
                <li>Pick your favorite apparel, footwear, or accessories.</li>
                <li>Present your coupon QR code or code string to the cashier before bill generation.</li>
                <li>Cashier verifies and scans the coupon to apply your exclusive discount!</li>
              </ol>
            </div>
          </div>

          {/* Right Column: Participating Showrooms */}
          <div className="lg:col-span-5 space-y-4">
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-pink-400" />
              <span>Participating Showrooms ({offer.stores.length})</span>
            </h2>

            <div className="space-y-3">
              {offer.stores.map((store) => {
                const mapsUrl =
                  store.map_url ||
                  (store.latitude && store.longitude
                    ? `https://www.google.com/maps/search/?api=1&query=${store.latitude},${store.longitude}`
                    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        `${store.name} ${store.address} ${store.city}`
                      )}`);

                return (
                  <div
                    key={store.id}
                    className="bg-slate-900/80 rounded-2xl border border-white/10 p-4 space-y-3 shadow-lg"
                  >
                    <div>
                      <h3 className="text-sm font-bold text-white">{store.name}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">{store.address}, {store.city}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 pt-1">
                      {store.phone && (
                        <a
                          href={`tel:${store.phone}`}
                          className="flex items-center gap-1 text-slate-300 hover:text-white"
                        >
                          <Phone className="w-3.5 h-3.5 text-pink-400" />
                          <span>{store.phone}</span>
                        </a>
                      )}
                      {store.opening_time && store.closing_time && (
                        <div className="flex items-center gap-1 text-slate-400">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          <span>{store.opening_time} - {store.closing_time}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500 font-mono">
                        Code: {store.store_code}
                      </span>
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-pink-300 transition"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span>Directions</span>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>
      </div>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}
