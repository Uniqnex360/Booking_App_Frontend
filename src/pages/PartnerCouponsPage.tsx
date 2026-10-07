import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import {
  Tag,
  Plus,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Ticket,
  Users,
  Percent,
  DollarSign,
  Trash2,
  Eye,
  Loader2,
  AlertCircle,
} from "lucide-react";

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader } from "@/components/common/Loader";
import { formatRupees } from "@/utils/currencyFormatter";
import { getMyPartnerProfile } from "@/api/partner.api";
import { getMyEvents } from "@/api/event.api";
import {
  getPartnerCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  getCouponRedemptions,
} from "@/api/coupon.api";
import type { Coupon, CouponRedemption } from "@/types/coupon.types";
import type { EventItem } from "@/types/event.types";

export default function PartnerCouponsPage() {
  const navigate = useNavigate();
  const [partner, setPartner] = useState<any>(null);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Coupon Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [code, setCode] = useState("");
  const [eventId, setEventId] = useState<string>("ALL");
  const [discountType, setDiscountType] = useState<"PERCENT" | "FLAT">("PERCENT");
  const [discountValue, setDiscountValue] = useState<string>("20");
  const [minOrderRupees, setMinOrderRupees] = useState<string>("1000");
  const [maxDiscountRupees, setMaxDiscountRupees] = useState<string>("500");
  const [validFrom, setValidFrom] = useState<string>(
    new Date().toISOString().split("T")[0] + "T00:00"
  );
  const [validUntil, setValidUntil] = useState<string>(
    new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split("T")[0] + "T23:59"
  );
  const [totalUsageLimit, setTotalUsageLimit] = useState<string>("100");
  const [perUserLimit, setPerUserLimit] = useState<string>("1");

  // Redemptions Modal State
  const [redemptionsModalOpen, setRedemptionsModalOpen] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [redemptions, setRedemptions] = useState<CouponRedemption[]>([]);
  const [loadingRedemptions, setLoadingRedemptions] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [partnerData, couponList, eventList] = await Promise.all([
        getMyPartnerProfile(),
        getPartnerCoupons(),
        getMyEvents().catch(() => []),
      ]);
      setPartner(partnerData);
      setCoupons(couponList);
      setEvents(eventList);
    } catch (err: any) {
      toast.error("Failed to load coupon data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      toast.error("Please enter a coupon code");
      return;
    }
    const valNum = parseInt(discountValue, 10);
    if (isNaN(valNum) || valNum <= 0) {
      toast.error("Please enter a valid discount value");
      return;
    }
    if (discountType === "PERCENT" && (valNum < 1 || valNum > 100)) {
      toast.error("Percentage discount must be between 1 and 100%");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        code: code.trim().toUpperCase(),
        event_id: eventId === "ALL" ? null : eventId,
        discount_type: discountType,
        discount_value: discountType === "PERCENT" ? valNum : valNum * 100, // Flat in paise
        min_order_paise: (parseInt(minOrderRupees, 10) || 0) * 100,
        max_discount_paise:
          discountType === "PERCENT" && maxDiscountRupees
            ? parseInt(maxDiscountRupees, 10) * 100
            : null,
        valid_from: new Date(validFrom).toISOString(),
        valid_until: new Date(validUntil).toISOString(),
        total_usage_limit: totalUsageLimit ? parseInt(totalUsageLimit, 10) : null,
        per_user_limit: parseInt(perUserLimit, 10) || 1,
      };

      await createCoupon(payload);
      toast.success(`Coupon ${payload.code} created successfully!`);
      setCreateModalOpen(false);
      resetForm();
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to create coupon");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setCode("");
    setEventId("ALL");
    setDiscountType("PERCENT");
    setDiscountValue("20");
    setMinOrderRupees("1000");
    setMaxDiscountRupees("500");
    setTotalUsageLimit("100");
    setPerUserLimit("1");
  };

  const handleToggleActive = async (coupon: Coupon) => {
    try {
      const updated = await updateCoupon(coupon.id, { is_active: !coupon.is_active });
      setCoupons((prev) =>
        prev.map((c) => (c.id === coupon.id ? { ...c, is_active: updated.is_active } : c))
      );
      toast.success(
        `Coupon ${coupon.code} is now ${updated.is_active ? "active" : "disabled"}`
      );
    } catch (err: any) {
      toast.error("Failed to update coupon status");
    }
  };

  const handleDelete = async (coupon: Coupon) => {
    if (!confirm(`Are you sure you want to deactivate ${coupon.code}?`)) return;
    try {
      await deleteCoupon(coupon.id);
      setCoupons((prev) =>
        prev.map((c) => (c.id === coupon.id ? { ...c, is_active: false } : c))
      );
      toast.success(`Coupon ${coupon.code} deactivated`);
    } catch {
      toast.error("Failed to deactivate coupon");
    }
  };

  const handleViewRedemptions = async (coupon: Coupon) => {
    setSelectedCoupon(coupon);
    setRedemptionsModalOpen(true);
    setLoadingRedemptions(true);
    try {
      const data = await getCouponRedemptions(coupon.id);
      setRedemptions(data);
    } catch {
      toast.error("Failed to load redemptions");
      setRedemptions([]);
    } finally {
      setLoadingRedemptions(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Loader />
        </div>
        <Footer />
      </div>
    );
  }

  const activeCount = coupons.filter((c) => c.is_active).length;
  const totalRedemptionsCount = coupons.reduce((acc, c) => acc + (c.used_count || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Navigation & Title */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <Button
              variant="ghost"
              onClick={() => navigate("/partner/dashboard")}
              className="p-0 h-auto text-slate-500 hover:text-slate-900 mb-2 flex items-center gap-1 text-sm font-semibold"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Dashboard
            </Button>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Tag className="h-8 w-8 text-[#7B1E3D]" /> Dining Coupons
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Create discount coupons for your dining events and drive bookings.
            </p>
          </div>

          <Button
            onClick={() => setCreateModalOpen(true)}
            className="bg-[#7B1E3D] hover:bg-[#5C0F2A] text-white font-bold rounded-2xl flex items-center gap-2 shadow-sm py-2.5 px-5"
          >
            <Plus className="h-4 w-4" /> Create Coupon
          </Button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
              <Ticket className="h-4 w-4 text-[#7B1E3D]" /> Total Coupons
            </div>
            <p className="text-3xl font-black text-slate-900">{coupons.length}</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Active Coupons
            </div>
            <p className="text-3xl font-black text-slate-900">{activeCount}</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
              <Users className="h-4 w-4 text-blue-600" /> Total Redemptions
            </div>
            <p className="text-3xl font-black text-slate-900">{totalRedemptionsCount}</p>
          </div>
        </div>

        {/* Coupons List */}
        {coupons.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-3xl p-12 text-center">
            <Tag className="mx-auto h-12 w-12 text-slate-300 mb-3" />
            <h3 className="font-bold text-lg text-slate-800">No coupons yet</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              Attract more diners by offering special promo codes like SUNDAY20 or EARLYBIRD.
            </p>
            <Button
              onClick={() => setCreateModalOpen(true)}
              className="mt-6 bg-[#7B1E3D] hover:bg-[#5C0F2A] text-white font-bold rounded-2xl"
            >
              <Plus className="h-4 w-4 mr-2" /> Create First Coupon
            </Button>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-xs border-b border-slate-200">
                  <tr>
                    <th className="py-4 px-6">Coupon Code</th>
                    <th className="py-4 px-6">Discount</th>
                    <th className="py-4 px-6">Scope</th>
                    <th className="py-4 px-6">Min Order</th>
                    <th className="py-4 px-6">Validity</th>
                    <th className="py-4 px-6">Usage</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {coupons.map((c) => {
                    const scopedEvent = events.find((e) => e.id === c.event_id);
                    const isExpired = new Date(c.valid_until) < new Date();
                    return (
                      <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-6 font-mono font-bold text-slate-900 text-base">
                          <span className="bg-[#7B1E3D]/10 text-[#7B1E3D] px-2.5 py-1 rounded-lg border border-[#7B1E3D]/20">
                            {c.code}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="font-bold text-slate-900">
                            {c.discount_type === "PERCENT"
                              ? `${c.discount_value}% OFF`
                              : `Flat ${formatRupees(c.discount_value)}`}
                          </span>
                          {c.discount_type === "PERCENT" && c.max_discount_paise ? (
                            <span className="block text-xs text-slate-400">
                              Cap: {formatRupees(c.max_discount_paise)}
                            </span>
                          ) : null}
                        </td>
                        <td className="py-4 px-6">
                          {c.event_id ? (
                            <span className="text-xs font-semibold text-slate-700 line-clamp-1 max-w-[180px]">
                              {scopedEvent?.title || "Specific Event"}
                            </span>
                          ) : (
                            <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-600">
                              All Dining Events
                            </Badge>
                          )}
                        </td>
                        <td className="py-4 px-6 font-medium text-slate-700">
                          {c.min_order_paise > 0 ? formatRupees(c.min_order_paise) : "None"}
                        </td>
                        <td className="py-4 px-6 text-xs text-slate-500">
                          <div>From: {format(parseISO(c.valid_from), "dd MMM yyyy")}</div>
                          <div className={isExpired ? "text-rose-600 font-semibold" : ""}>
                            To: {format(parseISO(c.valid_until), "dd MMM yyyy")}
                            {isExpired && " (Expired)"}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="font-semibold text-slate-900">{c.used_count}</span>
                          <span className="text-slate-400 text-xs">
                            {c.total_usage_limit ? ` / ${c.total_usage_limit}` : " used"}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={c.is_active}
                              onCheckedChange={() => handleToggleActive(c)}
                            />
                            <span
                              className={`text-xs font-semibold ${
                                c.is_active ? "text-emerald-700" : "text-slate-400"
                              }`}
                            >
                              {c.is_active ? "Active" : "Disabled"}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-right space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewRedemptions(c)}
                            title="View Redemptions"
                            className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(c)}
                            title="Deactivate Coupon"
                            className="h-8 w-8 p-0 text-rose-500 hover:text-rose-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Create Coupon Dialog */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-slate-900">
              <Tag className="h-5 w-5 text-[#7B1E3D]" /> Create Dining Coupon
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateCoupon} className="space-y-4 pt-2">
            <div>
              <Label className="text-xs font-bold uppercase text-slate-600">Coupon Code</Label>
              <Input
                placeholder="e.g. SUNDAY20"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                required
                className="mt-1 font-mono uppercase font-bold tracking-wider"
              />
              <p className="text-xs text-slate-400 mt-1">
                Customers will enter this code at checkout.
              </p>
            </div>

            <div>
              <Label className="text-xs font-bold uppercase text-slate-600">Event Scope</Label>
              <select
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
                className="mt-1 w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white"
              >
                <option value="ALL">All my dining events</option>
                {events.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-bold uppercase text-slate-600">Discount Type</Label>
                <div className="flex items-center gap-4 mt-2">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="discountType"
                      checked={discountType === "PERCENT"}
                      onChange={() => setDiscountType("PERCENT")}
                      className="accent-[#7B1E3D]"
                    />
                    <span>Percentage (%)</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="discountType"
                      checked={discountType === "FLAT"}
                      onChange={() => setDiscountType("FLAT")}
                      className="accent-[#7B1E3D]"
                    />
                    <span>Flat Amount (₹)</span>
                  </label>
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold uppercase text-slate-600">
                  {discountType === "PERCENT" ? "Discount Percentage (%)" : "Flat Discount (₹)"}
                </Label>
                <Input
                  type="number"
                  min="1"
                  max={discountType === "PERCENT" ? "100" : undefined}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-bold uppercase text-slate-600">Min Order (₹)</Label>
                <Input
                  type="number"
                  min="0"
                  value={minOrderRupees}
                  onChange={(e) => setMinOrderRupees(e.target.value)}
                  placeholder="0"
                  className="mt-1"
                />
                <p className="text-[11px] text-slate-400 mt-1">0 = No minimum subtotal</p>
              </div>

              {discountType === "PERCENT" && (
                <div>
                  <Label className="text-xs font-bold uppercase text-slate-600">
                    Max Discount Cap (₹)
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    value={maxDiscountRupees}
                    onChange={(e) => setMaxDiscountRupees(e.target.value)}
                    placeholder="e.g. 500"
                    className="mt-1"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Leave blank for no cap</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-bold uppercase text-slate-600">Valid From</Label>
                <Input
                  type="datetime-local"
                  value={validFrom}
                  onChange={(e) => setValidFrom(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-bold uppercase text-slate-600">Valid Until</Label>
                <Input
                  type="datetime-local"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-bold uppercase text-slate-600">
                  Total Usage Limit
                </Label>
                <Input
                  type="number"
                  min="1"
                  value={totalUsageLimit}
                  onChange={(e) => setTotalUsageLimit(e.target.value)}
                  placeholder="e.g. 100"
                  className="mt-1"
                />
                <p className="text-[11px] text-slate-400 mt-1">Leave blank for unlimited</p>
              </div>

              <div>
                <Label className="text-xs font-bold uppercase text-slate-600">
                  Per User Limit
                </Label>
                <Input
                  type="number"
                  min="1"
                  value={perUserLimit}
                  onChange={(e) => setPerUserLimit(e.target.value)}
                  required
                  className="mt-1"
                />
                <p className="text-[11px] text-slate-400 mt-1">Default 1 use per customer</p>
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateModalOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#7B1E3D] hover:bg-[#5C0F2A] text-white font-bold"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" /> Creating...
                  </>
                ) : (
                  "Create Coupon"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Redemptions Dialog */}
      <Dialog open={redemptionsModalOpen} onOpenChange={setRedemptionsModalOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" /> Usages for {selectedCoupon?.code}
            </DialogTitle>
          </DialogHeader>

          {loadingRedemptions ? (
            <div className="py-8 flex justify-center">
              <Loader />
            </div>
          ) : redemptions.length === 0 ? (
            <p className="text-center text-slate-500 py-8 text-sm">
              No customers have redeemed this coupon yet.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 mt-2">
              {redemptions.map((r) => (
                <div key={r.id} className="py-3 flex items-center justify-between text-sm">
                  <div>
                    <p className="font-mono text-xs font-bold text-slate-800">
                      Booking: {r.booking_id.slice(0, 8)}...
                    </p>
                    <p className="text-xs text-slate-400">
                      {format(parseISO(r.redeemed_at), "dd MMM yyyy, hh:mm a")}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-emerald-700 bg-emerald-50 font-bold">
                    -{formatRupees(r.discount_paise)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}

