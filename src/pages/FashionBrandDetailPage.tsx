import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Sparkles,
  MapPin,
  Clock,
  Phone,
  ShieldCheck,
  Tag,
  ArrowLeft,
  Navigation,
  Globe,
  Instagram,
  Store,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { retailApi, RetailBrand } from '@/api/retail.api';

export default function FashionBrandDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [brand, setBrand] = useState<RetailBrand | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadBrand(id);
    }
  }, [id]);

  const loadBrand = async (brandId: string) => {
    try {
      setLoading(true);
      const data = await retailApi.getBrandDetail(brandId);
      setBrand(data);
    } catch (err: any) {
      console.error('Failed to load brand', err);
      setErrorMsg(err.response?.data?.detail || 'Failed to load brand profile');
    } finally {
      setLoading(false);
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

  if (!brand) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans">
        <Header />
        <div className="flex-1 max-w-xl mx-auto px-4 py-20 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-xl font-bold">Brand Not Found</h2>
          <p className="text-sm text-slate-400">
            {errorMsg || 'This brand is not listed or currently inactive.'}
          </p>
          <Link
            to="/fashion"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-pink-600 text-white font-semibold text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Fashion</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-20 md:pb-0">
      <Header />

      {/* Main Content Area with top offset for fixed header */}
      <div className="flex-1 pt-28 sm:pt-36 lg:pt-40">
        {/* Top Cover Banner */}
        <div className="relative h-48 sm:h-64 lg:h-80 w-full overflow-hidden bg-slate-900">
        <img
          src={brand.cover_image_url || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200'}
          alt={brand.brand_name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
        <button
          onClick={() => navigate('/fashion')}
          className="absolute top-4 left-4 p-2.5 rounded-xl bg-black/60 backdrop-blur-md text-white hover:bg-black/80 transition flex items-center gap-1.5 text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
      </div>

      {/* Brand Header Profile Info */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 w-full -mt-16 sm:-mt-20 relative z-10 space-y-8">
        <div className="bg-slate-900/90 backdrop-blur-md rounded-3xl border border-white/10 p-6 sm:p-8 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4 sm:gap-6">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-slate-800 p-1.5 border border-white/20 overflow-hidden shrink-0 shadow-2xl">
              <img
                src={brand.logo_url || 'https://images.unsplash.com/photo-1544441893-675973e31985?w=400'}
                alt={brand.brand_name}
                className="w-full h-full object-cover rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white">
                  {brand.brand_name}
                </h1>
                <span title="Verified Vybhz Partner">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                </span>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-pink-500/10 text-pink-300 border border-pink-500/20 uppercase tracking-wide">
                  {brand.business_type.replace('_', ' ')}
                </span>
              </div>

              {brand.tagline && (
                <p className="text-xs sm:text-sm text-slate-300 font-medium">
                  {brand.tagline}
                </p>
              )}

              <p className="text-xs text-slate-400 pt-1">
                {brand.stores?.length || 0} Showroom Branches • {brand.offers?.length || 0} Active Offers
              </p>
            </div>
          </div>

          {/* Social Links */}
          <div className="flex items-center gap-2 shrink-0">
            {brand.website_url && (
              <a
                href={brand.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center gap-1.5 text-xs font-semibold"
              >
                <Globe className="w-4 h-4 text-pink-400" />
                <span className="hidden sm:inline">Website</span>
              </a>
            )}
            {brand.instagram_handle && (
              <a
                href={`https://instagram.com/${brand.instagram_handle.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center gap-1.5 text-xs font-semibold"
              >
                <Instagram className="w-4 h-4 text-pink-400" />
                <span className="hidden sm:inline">Instagram</span>
              </a>
            )}
          </div>
        </div>

        {brand.description && (
          <div className="bg-slate-900/60 rounded-2xl border border-white/5 p-6 text-xs sm:text-sm text-slate-300 leading-relaxed">
            {brand.description}
          </div>
        )}

        {/* Active Offers Section */}
        {brand.offers && brand.offers.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <Tag className="w-5 h-5 text-pink-400" />
              <span>Active Offers from {brand.brand_name}</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {brand.offers.map((offer) => {
                const discountText =
                  offer.offer_type === 'PERCENTAGE'
                    ? `${offer.offer_value}% OFF`
                    : offer.offer_type === 'FLAT_AMOUNT'
                    ? `₹${offer.offer_value} OFF`
                    : offer.offer_type === 'BUY_X_GET_Y'
                    ? 'Buy 2 Get 1'
                    : 'Special Gift';

                return (
                  <div
                    key={offer.id}
                    onClick={() => navigate(`/fashion/offers/${offer.id}`)}
                    className="bg-slate-900 rounded-2xl border border-white/10 hover:border-pink-500/40 overflow-hidden shadow-xl transition cursor-pointer flex flex-col justify-between group"
                  >
                    <div className="relative h-36 w-full overflow-hidden bg-slate-800">
                      <img
                        src={offer.banner_url || 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800'}
                        alt={offer.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                      />
                      <div className="absolute top-2 right-2 px-2.5 py-1 rounded-xl bg-amber-400 text-slate-950 font-black text-xs shadow-lg">
                        {discountText}
                      </div>
                    </div>

                    <div className="p-4 space-y-2">
                      <h3 className="text-sm font-extrabold text-white group-hover:text-pink-300 transition line-clamp-2">
                        {offer.title}
                      </h3>
                      {offer.short_description && (
                        <p className="text-xs text-slate-400 line-clamp-2">{offer.short_description}</p>
                      )}
                      <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-pink-400 font-bold">
                        <span>Get Coupon</span>
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Showroom Directory */}
        <section className="space-y-4">
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Store className="w-5 h-5 text-pink-400" />
            <span>Showroom Branches ({brand.stores?.length || 0})</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {brand.stores?.map((store) => {
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
                  className="bg-slate-900/80 rounded-2xl border border-white/10 p-5 space-y-3 shadow-lg flex flex-col justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-pink-400">{store.city}</span>
                      <span className="text-[10px] font-mono text-slate-500">{store.store_code}</span>
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-white">{store.name}</h3>
                    <p className="text-xs text-slate-400">{store.address}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 pt-2 border-t border-white/5">
                    {store.phone && (
                      <a href={`tel:${store.phone}`} className="flex items-center gap-1 hover:text-white">
                        <Phone className="w-3.5 h-3.5 text-pink-400" />
                        <span>{store.phone}</span>
                      </a>
                    )}
                    {store.opening_time && (
                      <div className="flex items-center gap-1 text-slate-400">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>{store.opening_time} - {store.closing_time}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 flex justify-end">
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-pink-300 transition"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Directions</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
      </div>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}
