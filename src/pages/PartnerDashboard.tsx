import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader } from "@/components/common/Loader";
import { getMyPartnerProfile } from "@/api/partner.api";
import { getPartnerRevenue } from "@/api/partner.api";
import { getMyEvents, updateEvent, cancelOrDeleteEvent } from "@/api/event.api";
import { formatRupees } from "@/utils/currencyFormatter";
import type { Partner, PartnerType } from "@/types/partner.types";
import type { EventItem } from "@/types/event.types";

import {
  Store,
  Phone,
  MapPin,
  Clock,
  CheckCircle2,
  Calendar,
  Plus,
  Ticket,
  ImageOff,
  Trash2,
  Edit3,
  CalendarCheck,
  CalendarX,
  CalendarDays,
  Loader2,
  TrendingUp,
  DollarSign,
  BarChart3,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { LoadingPage } from "./LoadingPage";
import { partnerTypeMeta } from "@/lib/partnerTypeMeta";

// ---------------------------------------------------------------------------
// Revenue Dashboard Sub-Component
// ---------------------------------------------------------------------------
function RevenueDashboard({ partnerId }: { partnerId: string }) {
  const [revenue, setRevenue] = useState<any>(null);
  const [revenueLoading, setRevenueLoading] = useState(true);

  useEffect(() => {
    const fetchRevenue = async () => {
      try {
        const data = await getPartnerRevenue();
        setRevenue(data);
      } catch {
        setRevenue(null);
      } finally {
        setRevenueLoading(false);
      }
    };
    fetchRevenue();
  }, []);

  if (revenueLoading) return <Loader />;
  if (!revenue)
    return <p className="text-slate-500">Failed to load revenue data.</p>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
            <DollarSign className="h-4 w-4 text-emerald-600" /> Total Revenue
          </div>
          <p className="text-2xl font-black text-slate-900">
            {formatRupees(revenue.total_revenue_paise)}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
            <BarChart3 className="h-4 w-4 text-[#7B1E3D]" /> Total Bookings
          </div>
          <p className="text-2xl font-black text-slate-900">
            {revenue.total_bookings}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
            <TrendingUp className="h-4 w-4 text-indigo-600" /> Avg Booking
          </div>
          <p className="text-2xl font-black text-slate-900">
            {formatRupees(revenue.average_booking_paise)}
          </p>
        </div>
      </div>

      {revenue.by_event && revenue.by_event.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-[#7B1E3D]" /> Revenue by Event
          </h3>
          <div className="space-y-3">
            {revenue.by_event.map((ev: any) => (
              <div
                key={ev.event_id}
                className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0"
              >
                <div>
                  <p className="font-bold text-sm text-slate-900">
                    {ev.event_title}
                  </p>
                  <p className="text-xs text-slate-500">
                    {ev.bookings} bookings
                  </p>
                </div>
                <span className="text-lg font-black text-emerald-700">
                  {formatRupees(ev.revenue_paise)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {revenue.by_event && revenue.by_event.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500 shadow-sm">
          No revenue data yet. Start hosting events to see earnings!
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Partner Dashboard
// ---------------------------------------------------------------------------
export default function PartnerDashboard() {
  const navigate = useNavigate();
  const [partner, setPartner] = useState<Partner | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "ACTIVE" | "PENDING" | "PAST" | "REVENUE"
  >("ACTIVE");

  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    venue_name: "",
    city: "",
    poster_image_url: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const p = await getMyPartnerProfile();
      setPartner(p);
      if (p && p.status === "APPROVED") {
        const evs = await getMyEvents();
        setEvents(evs);
      }
    } catch {
      toast.error("Failed to load partner dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openEditModal = (event: EventItem) => {
    setEditingEvent(event);
    setEditForm({
      title: event.title,
      description: event.description || "",
      venue_name: event.venue_name,
      city: event.city,
      poster_image_url: event.poster_image_url || "",
    });
  };
  useEffect(() => {
    if (partner && partner.status !== "APPROVED") {
      toast.error("Your partner account is not approved yet.");
      navigate("/partner/dashboard");
    }
  }, [partner]);
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;
    setSavingEdit(true);
    try {
      await updateEvent(editingEvent.id, editForm);
      toast.success("Event updated successfully");
      setEditingEvent(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update event");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleCancelEvent = async (id: string) => {
    try {
      await cancelOrDeleteEvent(id, "Cancelled by organizer");
      toast.success("Event cancelled successfully");
      fetchData();
    } catch {
      toast.error("Failed to cancel event");
    }
  };

  if (loading) {
    return <LoadingPage showFooter={false} />;
  }

  const now = new Date();
  const activeEvents = events.filter(
    (e) => e.status === "PUBLISHED" && new Date(e.ends_at) >= now,
  );
  const pendingEvents = events.filter(
    (e) => e.status === "PENDING_APPROVAL" || e.status === "DRAFT",
  );
  const pastEvents = events.filter(
    (e) => e.status === "CANCELLED" || new Date(e.ends_at) < now,
  );
  const currentList =
    activeTab === "ACTIVE"
      ? activeEvents
      : activeTab === "PENDING"
        ? pendingEvents
        : activeTab === "PAST"
          ? pastEvents
          : [];

  const tabClass = (tab: string) =>
    `px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5 ${
      activeTab === tab
        ? "bg-[#7B1E3D] text-white shadow-sm"
        : "text-slate-600 hover:bg-slate-100"
    }`;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Header />
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 py-8 pt-24">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">
                {partner?.business_name || "Partner Dashboard"}
              </h1>
              <Badge
                className={
                  partner?.status === "APPROVED"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold"
                    : partner?.status === "PENDING_APPROVAL"
                      ? "bg-[#7B1E3D]/5 text-[#7B1E3D] border border-[#7B1E3D]/30 font-bold"
                      : "bg-slate-100 text-slate-600 border border-slate-200 font-bold"
                }
              >
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {partner?.status === "APPROVED"
                  ? "Approved"
                  : partner?.status === "PENDING_APPROVAL"
                    ? "Pending Approval"
                    : partner?.status}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-500 mt-2">
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-[#7B1E3D]" />{" "}
                {partner?.city}
              </span>
              <span className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5 text-[#7B1E3D]" />{" "}
                {partner?.contact_phone}
              </span>
              <span className="flex items-center gap-1">
                <Store className="h-3.5 w-3.5 text-[#7B1E3D]" />{" "}
                {partner?.partner_type
                  ? (partnerTypeMeta[partner.partner_type]?.label ??
                    partner.partner_type)
                  : "Partner"}
              </span>
            </div>
          </div>
          {partner?.status !== "APPROVED" ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-center gap-2 text-sm text-amber-800 font-medium">
              <Clock className="h-4 w-4" />
              Application under review · We'll notify you once approved
            </div>
          ) : partner?.partner_type === "event_organiser" ? (
            <Button
              onClick={() => navigate("/partner/events/new")}
              className="bg-[#7B1E3D] hover:bg-[#5C0F2A] text-white font-bold rounded-2xl flex items-center gap-2 shadow-sm"
            >
              <Plus className="h-4 w-4" /> Host New Event
            </Button>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 flex items-center gap-2 text-sm text-slate-600">
              <Store className="h-4 w-4 text-[#7B1E3D]" />
              {partner?.partner_type === "restaurant"
                ? "Restaurant Partner"
                : "Partner"}
              <span className="text-xs text-slate-400">· Coming soon</span>
            </div>
          )}
        </div>

        {partner?.status !== "APPROVED" ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center shadow-sm">
            <Clock className="mx-auto h-10 w-10 text-[#7B1E3D] mb-3" />
            <h3 className="font-bold text-lg text-slate-900">
              Your application is under review
            </h3>
            <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">
              We'll notify you once an admin approves your account. You'll then
              be able to start listing on Vyhbz.
            </p>
          </div>
        ) : partner?.partner_type !== "event_organiser" ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center shadow-sm">
            <Store className="mx-auto h-10 w-10 text-[#7B1E3D] mb-3" />
            <h3 className="font-bold text-lg text-slate-900">
              {partner?.partner_type === "restaurant"
                ? "Restaurant Partner"
                : "Partner Account"}
            </h3>
            <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">
              {partner?.partner_type === "restaurant"
                ? "Restaurant management tools are coming soon. Meanwhile, you can update your profile from account settings."
                : "Partner tools are coming soon."}
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 border-b border-slate-200 mb-8 pb-3 overflow-x-auto">
              <button
                onClick={() => setActiveTab("ACTIVE")}
                className={tabClass("ACTIVE")}
              >
                <CalendarCheck className="h-4 w-4" /> Active (
                {activeEvents.length})
              </button>
              <button
                onClick={() => setActiveTab("PENDING")}
                className={tabClass("PENDING")}
              >
                <Clock className="h-4 w-4" /> Under Review (
                {pendingEvents.length})
              </button>
              <button
                onClick={() => setActiveTab("PAST")}
                className={tabClass("PAST")}
              >
                <CalendarX className="h-4 w-4" /> Past ({pastEvents.length})
              </button>
              <button
                onClick={() => setActiveTab("REVENUE")}
                className={tabClass("REVENUE")}
              >
                <TrendingUp className="h-4 w-4" /> Revenue
              </button>
            </div>

            {activeTab === "REVENUE" && partner && (
              <RevenueDashboard partnerId={partner.id} />
            )}

            {activeTab !== "REVENUE" && currentList.length === 0 && (
              <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-500 shadow-sm">
                <p className="text-base font-bold text-slate-800 mb-1">
                  No {activeTab.toLowerCase()} events found
                </p>
                <p className="text-xs text-slate-400">
                  Click &quot;Host New Event&quot; to publish your next event.
                </p>
              </div>
            )}

            {activeTab !== "REVENUE" && currentList.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {currentList.map((e) => {
                  const isPast = new Date(e.ends_at) < now;
                  const hoursUntilStart =
                    (new Date(e.starts_at).getTime() - now.getTime()) /
                    (1000 * 60 * 60);
                  const isEditLocked =
                    e.status === "PUBLISHED" && hoursUntilStart < 24;

                  return (
                    <div
                      key={e.id}
                      className="bg-white border border-slate-200 rounded-3xl overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-md transition-all"
                    >
                      <div>
                        <div className="aspect-[16/9] bg-slate-100 relative">
                          {e.poster_image_url ? (
                            <img
                              src={e.poster_image_url}
                              alt={e.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400">
                              <ImageOff className="h-8 w-8" />
                            </div>
                          )}
                          <div className="absolute top-3 right-3">
                            <Badge
                              className={`border ${e.status === "PUBLISHED" && !isPast ? "bg-emerald-50 text-emerald-700 border-emerald-200" : e.status === "PENDING_APPROVAL" ? "bg-[#7B1E3D]/5 text-[#7B1E3D] border-[#7B1E3D]/30" : "bg-slate-100 text-slate-600 border-slate-200"}`}
                            >
                              {isPast ? "COMPLETED" : e.status}
                            </Badge>
                          </div>
                        </div>
                        <div className="p-5">
                          <span className="text-[10px] font-bold text-[#7B1E3D] uppercase tracking-wider">
                            {e.category}
                          </span>
                          <h3 className="text-lg font-bold text-slate-900 mt-1 line-clamp-1">
                            {e.title}
                          </h3>
                          <p className="text-slate-500 text-xs mt-2 flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 text-slate-400" />{" "}
                            {e.venue_name}, {e.city}
                          </p>
                          <p className="text-slate-500 text-xs mt-1 flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />{" "}
                            {format(
                              parseISO(e.starts_at),
                              "MMM d, yyyy · h:mm a",
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="p-5 pt-0 border-t border-slate-100 mt-4 flex items-center justify-between">
                        <div className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                          <Ticket className="h-3.5 w-3.5 text-[#7B1E3D]" />{" "}
                          {e.ticket_categories?.length || 1} Tier(s)
                        </div>
                        <div className="flex items-center gap-1">
                          {e.status !== "CANCELLED" && !isPast && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={isEditLocked}
                                onClick={() => openEditModal(e)}
                                title={
                                  isEditLocked ? "Locked within 24h" : "Edit"
                                }
                                className={
                                  isEditLocked
                                    ? "text-slate-400 cursor-not-allowed"
                                    : "text-slate-700 hover:bg-slate-100 rounded-xl"
                                }
                              >
                                <Edit3 className="h-3.5 w-3.5 mr-1" />{" "}
                                {isEditLocked ? "Locked" : "Edit"}
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-rose-600 hover:bg-rose-50 rounded-xl"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="bg-white border-slate-200 text-slate-900 rounded-3xl shadow-xl">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="text-lg font-bold">
                                      Cancel Event?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription className="text-slate-600 text-sm">
                                      Cancel{" "}
                                      <strong className="text-slate-900">
                                        {e.title}
                                      </strong>
                                      ? This will notify attendees and stop
                                      sales.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter className="gap-2 mt-4">
                                    <AlertDialogCancel className="bg-slate-100 text-slate-700 border-0 hover:bg-slate-200 rounded-xl text-xs font-semibold">
                                      Close
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleCancelEvent(e.id)}
                                      className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold"
                                    >
                                      Confirm
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        <Dialog
          open={!!editingEvent}
          onOpenChange={(open) => !open && setEditingEvent(null)}
        >
          <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-lg rounded-3xl shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">
                Edit Event Details
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSaveEdit} className="space-y-4 py-2">
              <div>
                <Label className="text-xs font-semibold text-slate-600">
                  Event Title
                </Label>
                <Input
                  id="edit-title"
                  value={editForm.title}
                  onChange={(e) =>
                    setEditForm({ ...editForm, title: e.target.value })
                  }
                  className="bg-slate-50 border-slate-200 mt-1 rounded-xl"
                  required
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-600">
                  Description
                </Label>
                <Textarea
                  id="edit-desc"
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm({ ...editForm, description: e.target.value })
                  }
                  className="bg-slate-50 border-slate-200 mt-1 min-h-[80px] rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-slate-600">
                    Venue
                  </Label>
                  <Input
                    id="edit-venue"
                    value={editForm.venue_name}
                    onChange={(e) =>
                      setEditForm({ ...editForm, venue_name: e.target.value })
                    }
                    className="bg-slate-50 border-slate-200 mt-1 rounded-xl"
                    required
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-600">
                    City
                  </Label>
                  <Input
                    id="edit-city"
                    value={editForm.city}
                    onChange={(e) =>
                      setEditForm({ ...editForm, city: e.target.value })
                    }
                    className="bg-slate-50 border-slate-200 mt-1 rounded-xl"
                    required
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-600">
                  Poster URL
                </Label>
                <Input
                  id="edit-image"
                  value={editForm.poster_image_url}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      poster_image_url: e.target.value,
                    })
                  }
                  className="bg-slate-50 border-slate-200 mt-1 rounded-xl"
                  placeholder="https://..."
                />
              </div>
              <DialogFooter className="gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setEditingEvent(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={savingEdit}
                  className="bg-[#7B1E3D] hover:bg-[#5C0F2A] text-white font-bold rounded-xl"
                >
                  {savingEdit ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </main>
      <Footer />
    </div>
  );
}
