import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Store,
  Tag,
  TrendingUp,
  Ticket,
  Users,
  Plus,
  MapPin,
  Calendar,
  Clock,
  Sparkles,
  QrCode,
  DollarSign,
  Percent,
  CheckCircle2,
  X,
  FileText,
  Building,
  RefreshCw,
} from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import {
  retailApi,
  RetailBrand,
  StoreBranch,
  RetailOffer,
  RetailAnalytics,
} from '@/api/retail.api';

export default function RetailPartnerDashboard() {
  const navigate = useNavigate();

  const [partner, setPartner] = useState<RetailBrand | null>(null);
  const [stores, setStores] = useState<StoreBranch[]>([]);
  const [offers, setOffers] = useState<RetailOffer[]>([]);
  const [analytics, setAnalytics] = useState<RetailAnalytics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'STORES' | 'OFFERS' | 'AUDIT'>('OVERVIEW');

  // New Store Modal State
  const [showAddStoreModal, setShowAddStoreModal] = useState<boolean>(false);
  const [newStore, setNewStore] = useState({
    name: '',
    store_code: '',
    address: '',
    city: 'Kochi',
    state: 'Kerala',
    pin_code: '',
    phone: '',
    opening_time: '10:00',
    closing_time: '21:30',
  });

  // New Offer Modal State
  const [showAddOfferModal, setShowAddOfferModal] = useState<boolean>(false);
  const [newOffer, setNewOffer] = useState({
    title: '',
    short_description: '',
    description: '',
    banner_url: '',
    offer_type: 'PERCENTAGE',
    offer_value: 15,
    min_purchase_amount: 1500,
    is_vybhz_exclusive: true,
    code_strategy: 'COMMON_CODE',
    common_code: '',
    starts_at: new Date().toISOString().slice(0, 16),
    ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    selected_store_ids: [] as string[],
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [brandData, storesData, offersData, analyticsData] = await Promise.all([
        retailApi.getMyRetailPartner().catch(() => null),
        retailApi.getMyStores().catch(() => []),
        retailApi.getMyOffers().catch(() => []),
        retailApi.getAnalytics().catch(() => null),
      ]);

      setPartner(brandData);
      setStores(storesData);
      setOffers(offersData);
      setAnalytics(analyticsData);
    } catch (err) {
      console.error('Failed to load retail partner dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await retailApi.createStore(newStore);
      setShowAddStoreModal(false);
      loadDashboardData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create showroom branch');
    }
  };

  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await retailApi.createOffer({
        ...newOffer,
        offer_value: parseFloat(String(newOffer.offer_value)),
        min_purchase_amount: newOffer.min_purchase_amount
          ? parseFloat(String(newOffer.min_purchase_amount))
          : undefined,
        store_ids: newOffer.selected_store_ids.length > 0 ? newOffer.selected_store_ids : stores.map((s) => s.id),
      });
      setShowAddOfferModal(false);
      loadDashboardData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create offer');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans">
        <Header />
        <div className="flex-1 flex items-center justify-center p-8 pt-28 sm:pt-36 lg:pt-40">
          <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
        <Header />
        <div className="flex-1 max-w-xl mx-auto px-4 py-20 text-center space-y-4 pt-28 sm:pt-36 lg:pt-40">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto">
            <Store className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white">Retail Showroom Portal</h2>
          <p className="text-sm text-slate-400">
            Access to this portal is restricted to verified Fashion Showroom & Retail Brand partner accounts. Your account is categorized for Dining or Live Events.
          </p>
          <div className="pt-4">
            <button
              onClick={() => navigate('/partner/dashboard')}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#7B1E3D] to-rose-700 text-white font-bold text-sm shadow-lg hover:brightness-110 transition cursor-pointer"
            >
              Return to Partner Dashboard
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-16">
      <Header />

      {/* Main Content Area with top offset for fixed header */}
      <div className="flex-1 pt-28 sm:pt-36 lg:pt-40">
        {/* Partner Top Bar */}
        <section className="bg-slate-900/80 border-b border-white/5 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-slate-800 p-1 border border-white/10 overflow-hidden shrink-0">
                <img
                  src={partner?.logo_url || 'https://images.unsplash.com/photo-1544441893-675973e31985?w=400'}
                  alt={partner?.brand_name || 'Retail Partner'}
                  className="w-full h-full object-cover rounded-xl"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-white">
                    {partner?.brand_name || 'Retail Showroom Portal'}
                  </h1>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    APPROVED
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Multi-branch showroom management, exclusive campaigns, and in-store coupon redemption
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                to="/partner/retail/scanner"
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#7B1E3D] to-rose-700 hover:from-[#922549] text-white font-bold text-xs flex items-center gap-1.5 shadow-lg transition"
              >
                <QrCode className="w-4 h-4" />
                <span>Open Staff QR Scanner</span>
              </Link>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mt-6 overflow-x-auto pb-1 scrollbar-none">
            {(
              [
                { id: 'OVERVIEW', label: 'Performance Overview' },
                { id: 'STORES', label: `Showrooms (${stores.length})` },
                { id: 'OFFERS', label: `Offers & Campaigns (${offers.length})` },
                { id: 'AUDIT', label: 'Redemptions Log' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  activeTab === t.id
                    ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/30'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
        {/* KPI Cards Grid */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900/70 rounded-2xl border border-white/10 p-4 space-y-1">
            <span className="text-[11px] font-semibold text-slate-400">Total Showrooms</span>
            <div className="text-2xl font-black text-white">{analytics?.total_stores || stores.length}</div>
            <span className="text-[10px] text-pink-400">Active retail locations</span>
          </div>
          <div className="bg-slate-900/70 rounded-2xl border border-white/10 p-4 space-y-1">
            <span className="text-[11px] font-semibold text-slate-400">Live Campaigns</span>
            <div className="text-2xl font-black text-amber-400">{analytics?.active_offers || offers.length}</div>
            <span className="text-[10px] text-slate-400">Active promotional offers</span>
          </div>
          <div className="bg-slate-900/70 rounded-2xl border border-white/10 p-4 space-y-1">
            <span className="text-[11px] font-semibold text-slate-400">Total Coupons Claimed</span>
            <div className="text-2xl font-black text-emerald-400">{analytics?.total_claims || 0}</div>
            <span className="text-[10px] text-emerald-300">Added to user wallets</span>
          </div>
          <div className="bg-slate-900/70 rounded-2xl border border-white/10 p-4 space-y-1">
            <span className="text-[11px] font-semibold text-slate-400">Total In-Store Redemptions</span>
            <div className="text-2xl font-black text-blue-400">{analytics?.total_redemptions || 0}</div>
            <span className="text-[10px] text-blue-300">
              {analytics?.redemption_rate_percent || 0}% redemption rate
            </span>
          </div>
        </section>

        {/* Tab 1: Performance Overview */}
        {activeTab === 'OVERVIEW' && (
          <div className="space-y-6">
            <div className="bg-slate-900/60 rounded-3xl border border-white/10 p-6 space-y-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-pink-400" />
                <span>Sales & Discount Metrics</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-800/60 p-4 rounded-2xl border border-white/5 space-y-1">
                  <span className="text-xs text-slate-400">Total Bill Value from Vybhz Shoppers</span>
                  <div className="text-2xl font-black text-white">
                    ₹{analytics?.total_bill_amount?.toLocaleString() || 0}
                  </div>
                </div>
                <div className="bg-slate-800/60 p-4 rounded-2xl border border-white/5 space-y-1">
                  <span className="text-xs text-slate-400">Total Promotional Discounts Given</span>
                  <div className="text-2xl font-black text-pink-400">
                    ₹{analytics?.total_discount_given?.toLocaleString() || 0}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Showroom Branches */}
        {activeTab === 'STORES' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Showroom Branches</h2>
                <p className="text-xs text-slate-400">
                  Manage physical store locations where customers can redeem coupons.
                </p>
              </div>
              <button
                onClick={() => setShowAddStoreModal(true)}
                className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-lg"
              >
                <Plus className="w-4 h-4" />
                <span>Add Branch</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {stores.map((s) => (
                <div
                  key={s.id}
                  className="bg-slate-900 rounded-2xl border border-white/10 p-5 space-y-3 shadow-lg flex flex-col justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-pink-400">{s.city}</span>
                      <span className="text-[10px] font-mono text-slate-400">{s.store_code}</span>
                    </div>
                    <h3 className="text-sm font-bold text-white">{s.name}</h3>
                    <p className="text-xs text-slate-400">{s.address}</p>
                  </div>

                  <div className="pt-2 border-t border-white/5 text-xs text-slate-400 space-y-1">
                    {s.phone && <div>Tel: {s.phone}</div>}
                    <div>
                      Hours: {s.opening_time} - {s.closing_time}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Offers & Campaigns */}
        {activeTab === 'OFFERS' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Promotional Campaigns & Coupons</h2>
                <p className="text-xs text-slate-400">
                  Create and monitor time-bound offers and Vybhz-exclusive discounts.
                </p>
              </div>
              <button
                onClick={() => setShowAddOfferModal(true)}
                className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-lg"
              >
                <Plus className="w-4 h-4" />
                <span>Create Offer</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {offers.map((o) => (
                <div
                  key={o.id}
                  className="bg-slate-900 rounded-2xl border border-white/10 overflow-hidden shadow-lg flex flex-col justify-between"
                >
                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                        {o.status}
                      </span>
                      <span className="text-xs font-black text-amber-400">
                        {o.offer_type === 'PERCENTAGE' ? `${o.offer_value}% OFF` : `₹${o.offer_value} OFF`}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-white line-clamp-1">{o.title}</h3>
                    <p className="text-xs text-slate-400 line-clamp-2">{o.short_description}</p>
                  </div>

                  <div className="p-4 bg-slate-950/60 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
                    <span>Claimed: {o.claimed_count}</span>
                    <span>Redeemed: {o.redeemed_count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Redemptions Log */}
        {activeTab === 'AUDIT' && (
          <div className="bg-slate-900/60 rounded-3xl border border-white/10 p-6 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-pink-400" />
              <span>In-Store Redemptions Audit Log</span>
            </h2>

            {analytics?.recent_redemptions && analytics.recent_redemptions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Time</th>
                      <th className="p-3">Branch</th>
                      <th className="p-3">Coupon</th>
                      <th className="p-3">Bill Ref</th>
                      <th className="p-3">Bill Amount</th>
                      <th className="p-3">Discount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-300">
                    {analytics.recent_redemptions.map((r: any) => (
                      <tr key={r.id}>
                        <td className="p-3 whitespace-nowrap">
                          {new Date(r.redeemed_at).toLocaleString()}
                        </td>
                        <td className="p-3">{r.store_name}</td>
                        <td className="p-3 font-mono font-bold text-amber-300">{r.coupon_code}</td>
                        <td className="p-3">{r.bill_reference_number || '—'}</td>
                        <td className="p-3">₹{r.bill_amount || 0}</td>
                        <td className="p-3 font-bold text-emerald-400">₹{r.discount_applied || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-8 text-center">
                No redemptions logged yet. Use the staff QR scanner to redeem coupons in-store.
              </p>
            )}
          </div>
        )}
      </main>
      </div>

      {/* Add Store Modal */}
      {showAddStoreModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateStore}
            className="w-full max-w-lg bg-slate-900 border border-white/20 rounded-3xl p-6 text-white shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Add New Showroom Branch</h3>
              <button
                type="button"
                onClick={() => setShowAddStoreModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Branch Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. FabIndia Lulu Mall, Kochi"
                  value={newStore.name}
                  onChange={(e) => setNewStore({ ...newStore, name: e.target.value })}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-pink-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Store Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. FAB-LULU-01"
                    value={newStore.store_code}
                    onChange={(e) => setNewStore({ ...newStore, store_code: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white uppercase outline-none focus:border-pink-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={newStore.city}
                    onChange={(e) => setNewStore({ ...newStore, city: e.target.value })}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-pink-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Full Street Address</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Floor number, shopping mall, landmark..."
                  value={newStore.address}
                  onChange={(e) => setNewStore({ ...newStore, address: e.target.value })}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-pink-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Phone</label>
                  <input
                    type="text"
                    placeholder="+91 484 238..."
                    value={newStore.phone}
                    onChange={(e) => setNewStore({ ...newStore, phone: e.target.value })}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-pink-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">PIN Code</label>
                  <input
                    type="text"
                    placeholder="682001"
                    value={newStore.pin_code}
                    onChange={(e) => setNewStore({ ...newStore, pin_code: e.target.value })}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-pink-500"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddStoreModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs"
              >
                Save Branch
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Offer Modal */}
      {showAddOfferModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleCreateOffer}
            className="w-full max-w-lg bg-slate-900 border border-white/20 rounded-3xl p-6 text-white shadow-2xl space-y-4 my-8"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Create Promotional Campaign</h3>
              <button
                type="button"
                onClick={() => setShowAddOfferModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Campaign Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Festive Wardrobe Special: Flat 20% OFF"
                  value={newOffer.title}
                  onChange={(e) => setNewOffer({ ...newOffer, title: e.target.value })}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-pink-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Short Description</label>
                <input
                  type="text"
                  placeholder="Flat 20% OFF on all kurtas and festive wear."
                  value={newOffer.short_description}
                  onChange={(e) => setNewOffer({ ...newOffer, short_description: e.target.value })}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-pink-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Offer Type</label>
                  <select
                    value={newOffer.offer_type}
                    onChange={(e) => setNewOffer({ ...newOffer, offer_type: e.target.value })}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-pink-500"
                  >
                    <option value="PERCENTAGE">Percentage Discount (%)</option>
                    <option value="FLAT_AMOUNT">Flat Amount (₹)</option>
                    <option value="BUY_X_GET_Y">Buy 2 Get 1</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Discount Value</label>
                  <input
                    type="number"
                    required
                    value={newOffer.offer_value}
                    onChange={(e) => setNewOffer({ ...newOffer, offer_value: parseFloat(e.target.value) })}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-pink-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Min. Bill Amount (₹)</label>
                  <input
                    type="number"
                    value={newOffer.min_purchase_amount}
                    onChange={(e) => setNewOffer({ ...newOffer, min_purchase_amount: parseFloat(e.target.value) })}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-pink-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Coupon Code</label>
                  <input
                    type="text"
                    placeholder="e.g. FEST20"
                    value={newOffer.common_code}
                    onChange={(e) => setNewOffer({ ...newOffer, common_code: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white uppercase outline-none focus:border-pink-500 font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddOfferModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs"
              >
                Publish Offer
              </button>
            </div>
          </form>
        </div>
      )}

      <Footer />
    </div>
  );
}
