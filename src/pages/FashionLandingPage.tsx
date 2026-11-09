import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  Sparkles,
  Search,
  MapPin,
  Tag,
  ArrowRight,
  ChevronRight,
  Store,
  ShieldCheck,
  Ticket,
  Calendar,
  Clock,
  Compass,
  Filter,
  CheckCircle2,
} from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { retailApi, RetailOffer, RetailCategory, RetailBrand } from '@/api/retail.api';

export default function FashionLandingPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlCity = searchParams.get('city') || 'Kochi';
  const urlCategory = searchParams.get('category') || 'all';

  const [categories, setCategories] = useState<RetailCategory[]>([]);
  const [offers, setOffers] = useState<RetailOffer[]>([]);
  const [brands, setBrands] = useState<RetailBrand[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>(urlCategory);
  const [selectedCity, setSelectedCity] = useState<string>(urlCity);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [claimedOfferIds, setClaimedOfferIds] = useState<Set<string>>(new Set());

  const CITIES = ['Kochi', 'Chennai', 'Bangalore', 'Coimbatore', 'Trivandrum'];

  // Keep state in sync with URL search params
  useEffect(() => {
    const qCity = searchParams.get('city');
    if (qCity && qCity !== selectedCity) {
      setSelectedCity(qCity);
    }
    const qCat = searchParams.get('category');
    if (qCat && qCat !== selectedCategory) {
      setSelectedCategory(qCat);
    }
  }, [searchParams]);

  useEffect(() => {
    loadData();
  }, [selectedCity, selectedCategory]);

  const handleCityChange = (newCity: string) => {
    setSelectedCity(newCity);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('city', newCity);
      return next;
    });
  };

  const handleCategoryChange = (newCat: string) => {
    setSelectedCategory(newCat);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (newCat === 'all') {
        next.delete('category');
      } else {
        next.set('category', newCat);
      }
      return next;
    });
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [catsRes, offersRes, brandsRes, myCouponsRes] = await Promise.allSettled([
        retailApi.getCategories(),
        retailApi.getOffers({
          city: selectedCity,
          category: selectedCategory !== 'all' ? selectedCategory : undefined,
        }),
        retailApi.getBrands({ city: selectedCity }),
        retailApi.getMyCoupons(),
      ]);
      if (catsRes.status === 'fulfilled') setCategories(catsRes.value);
      if (offersRes.status === 'fulfilled') setOffers(offersRes.value);
      if (brandsRes.status === 'fulfilled') setBrands(brandsRes.value);
      if (myCouponsRes.status === 'fulfilled' && Array.isArray(myCouponsRes.value)) {
        const claimedSet = new Set<string>(
          myCouponsRes.value
            .filter((c: any) => ['ACTIVE', 'AVAILABLE', 'CLAIMED'].includes(String(c.status).toUpperCase()))
            .map((c: any) => String(c.offer_id || c.offer?.id))
        );
        setClaimedOfferIds(claimedSet);
      }
    } catch (err) {
      console.error('Failed to load fashion data', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredOffers = offers.filter((o) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      o.title.toLowerCase().includes(q) ||
      o.brand_name.toLowerCase().includes(q) ||
      o.short_description?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-20 md:pb-0">
      <Header />

      {/* Main Content Area with top offset for fixed header */}
      <div className="flex-1 pt-28 sm:pt-36 lg:pt-40">
        {/* Hero Banner Section */}
        <section className="relative overflow-hidden bg-gradient-to-b from-[#2a0e18] via-slate-950 to-slate-950 pt-8 pb-12 border-b border-white/5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(123,30,61,0.25),transparent_60%)] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-400 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Exclusive Fashion & Showrooms</span>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white">
                Discover Top Brands &{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-rose-300 to-amber-300">
                  Exclusive In-Store Offers
                </span>
              </h1>
              <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
                Explore curated fashion showrooms, luxury boutiques, and retail chains. Claim verified Vybhz coupons and redeem instantly at store billing counters.
              </p>
            </div>

            {/* Quick Actions (My Coupons) */}
            <div className="flex items-center sm:items-end shrink-0">
              <button
                onClick={() => navigate('/my-coupons')}
                className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-gradient-to-r from-[#7B1E3D] to-rose-700 hover:from-[#922549] hover:to-rose-600 text-white font-bold text-sm shadow-xl shadow-pink-950/40 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
              >
                <Ticket className="w-4 h-4 text-pink-200" />
                <span>My Saved Coupons</span>
              </button>
            </div>
          </div>

          {/* Search & City Filter Bar */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-12 gap-3 bg-slate-900/80 backdrop-blur-md p-3 rounded-2xl border border-white/10 shadow-2xl">
            {/* City Selector */}
            <div className="sm:col-span-4 flex items-center gap-2 bg-slate-800/80 px-3 py-2.5 rounded-xl border border-white/5">
              <MapPin className="w-4 h-4 text-pink-400 shrink-0" />
              <select
                value={selectedCity}
                onChange={(e) => handleCityChange(e.target.value)}
                className="bg-transparent text-white font-semibold text-xs sm:text-sm outline-none w-full cursor-pointer"
              >
                {CITIES.map((c) => (
                  <option key={c} value={c} className="bg-slate-900 text-white">
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Input */}
            <div className="sm:col-span-8 flex items-center gap-2 bg-slate-800/80 px-3 py-2.5 rounded-xl border border-white/5">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Search brands, designer boutiques, offers or kurtas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-white placeholder-slate-500 text-xs sm:text-sm outline-none w-full"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-slate-400 hover:text-white text-xs px-1"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Categories Horizontal Scroll */}
          <div className="mt-5 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <button
              onClick={() => handleCategoryChange('all')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/30 font-bold'
                  : 'bg-slate-900/70 hover:bg-slate-800 text-slate-300 border border-white/5'
              }`}
            >
              All Categories
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.slug)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                  selectedCategory === cat.slug
                    ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/30 font-bold'
                    : 'bg-slate-900/70 hover:bg-slate-800 text-slate-300 border border-white/5'
                }`}
              >
                <span>{cat.name}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        {/* Vybhz Exclusive Offers Grid */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                <span>Exclusive In-Store Offers</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">
                  {filteredOffers.length} Live
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Claim free coupons on Vybhz, show the QR code at the counter to redeem.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-64 rounded-2xl bg-slate-900/50 animate-pulse border border-white/5" />
              ))}
            </div>
          ) : filteredOffers.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-white/5 space-y-3">
              <Tag className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-slate-300 font-semibold text-sm">No live offers found for this selection.</p>
              <p className="text-xs text-slate-500">Try switching your category or exploring other cities.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredOffers.map((offer) => {
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
                    className="group relative bg-slate-900/70 hover:bg-slate-900 rounded-2xl border border-white/10 hover:border-pink-500/40 overflow-hidden shadow-xl transition-all duration-300 cursor-pointer flex flex-col"
                  >
                    {/* Offer Banner Image */}
                    <div className="relative h-44 w-full overflow-hidden bg-slate-800">
                      <img
                        src={offer.banner_url || 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800'}
                        alt={offer.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />

                      {/* Exclusive Badge */}
                      {offer.is_vybhz_exclusive && (
                        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-[#7B1E3D] text-white text-[11px] font-black uppercase tracking-wider shadow-lg flex items-center gap-1 border border-pink-400/40">
                          <Sparkles className="w-3 h-3" />
                          <span>Vybhz Exclusive</span>
                        </div>
                      )}

                      {/* Discount Pill */}
                      <div className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-amber-400 text-slate-950 font-black text-sm shadow-xl tracking-tight">
                        {discountText}
                      </div>

                      {/* Brand Logo Avatar */}
                      {offer.brand_logo_url && (
                        <div className="absolute bottom-3 left-3 w-10 h-10 rounded-xl bg-slate-950 p-1 border border-white/20 shadow-lg overflow-hidden">
                          <img
                            src={offer.brand_logo_url}
                            alt={offer.brand_name}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        </div>
                      )}
                    </div>

                    {/* Card Content */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-pink-400 truncate max-w-[200px]">
                            {offer.brand_name}
                          </span>
                          {offer.min_purchase_amount && (
                            <span className="text-[11px] text-slate-400">
                              Min ₹{offer.min_purchase_amount}
                            </span>
                          )}
                        </div>

                        <h3 className="text-sm sm:text-base font-extrabold text-white mt-1 group-hover:text-pink-300 transition line-clamp-2">
                          {offer.title}
                        </h3>

                        {offer.short_description && (
                          <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                            {offer.short_description}
                          </p>
                        )}
                      </div>

                      {/* Stores & Action Footer */}
                      <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Store className="w-3.5 h-3.5 text-slate-500" />
                          <span>
                            {offer.stores.length} {offer.stores.length === 1 ? 'Showroom' : 'Showrooms'}
                          </span>
                        </div>

                        {claimedOfferIds.has(offer.id) ? (
                          <div className="flex items-center gap-1 text-emerald-400 font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Claimed</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-pink-400 font-bold group-hover:translate-x-1 transition">
                            <span>Get Coupon</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Featured Brands & Showroom Directory */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white">Popular Fashion Brands & Showrooms</h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Explore verified showroom locations with phone numbers, directions, and current collections.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {brands.map((brand) => (
              <div
                key={brand.id}
                onClick={() => navigate(`/fashion/brands/${brand.id}`)}
                className="bg-slate-900/60 hover:bg-slate-900 rounded-2xl border border-white/10 hover:border-white/20 p-4 transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-4 shadow-lg group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-slate-800 p-1 border border-white/10 overflow-hidden shrink-0 shadow-md">
                    <img
                      src={brand.logo_url || 'https://images.unsplash.com/photo-1544441893-675973e31985?w=400'}
                      alt={brand.brand_name}
                      className="w-full h-full object-cover rounded-xl"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-pink-300 transition truncate">
                        {brand.brand_name}
                      </h3>
                      <span title="Verified Retail Partner">
                        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      </span>
                    </div>
                    {brand.tagline && (
                      <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{brand.tagline}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-white/5">
                        {brand.stores_count} {brand.stores_count === 1 ? 'Branch' : 'Branches'}
                      </span>
                      {brand.active_offers_count > 0 && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-300 border border-pink-500/20">
                          {brand.active_offers_count} {brand.active_offers_count === 1 ? 'Offer' : 'Offers'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
                  <span className="text-[11px] truncate">{brand.business_type.replace('_', ' ').toUpperCase()}</span>
                  <span className="font-bold text-pink-400 group-hover:underline flex items-center gap-0.5">
                    View Stores & Offers <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Fashion Runway & Events Spotlight Banner */}
        <section className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-[#3e0b21] via-slate-900 to-[#1e072b] p-6 sm:p-10 border border-pink-500/30 shadow-2xl">
          <div className="max-w-xl space-y-3 relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-pink-200 text-xs font-bold backdrop-blur-sm">
              <Calendar className="w-3.5 h-3.5 text-amber-300" />
              <span>Fashion Weeks & Trunk Shows</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-white leading-tight">
              Attend Designer Pop-ups & Runway Nights in Your City
            </h3>
            <p className="text-xs sm:text-sm text-slate-300">
              Book front-row tickets and RSVP passes for upcoming bridal expos, couture showcases, and designer meet-and-greets.
            </p>
            <div className="pt-2">
              <Link
                to="/events?category=fashion"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-slate-950 font-bold text-xs sm:text-sm hover:bg-slate-200 transition shadow-lg"
              >
                <span>Explore Fashion Events</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      </div>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}
