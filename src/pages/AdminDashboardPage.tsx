import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  getAdminStats,
  getAdminMovies,
  updateAdminMovieStatus,
  getAdminEvents,
  updateAdminEventStatus,
  getAdminUsers,
  updateAdminUserStatus,
  getAdminPartners,
  updatePartnerStatus,
  getAdminComprehensiveStats,
  getIntegrationsHealth,
  AdminStats,
  AdminMovieItem,
  AdminUserItem,
  AdminComprehensiveStats,
  IntegrationHealthItem,
} from "@/api/admin.api";
import { TheatresManagementTab } from "./admin/TheatresManagementTab";
import { BookingsReconciliationTab } from "./admin/BookingsReconciliationTab";
import { CommissionInvoicesTab } from "./admin/CommissionInvoicesTab";
import { ReconciliationExceptionsTab } from "./admin/ReconciliationExceptionsTab";
import { AdminSearchBar } from "@/components/admin/AdminSearchBar";
import { useDebounce } from "@/hooks/useDebounce";
import type { EventItem } from "@/types/event.types";
import type { Partner, PartnerStatus } from "@/types/partner.types";
import {
  LayoutDashboard,
  Film,
  CalendarDays,
  Users,
  Building2,
  Ticket,
  FileText,
  IndianRupee,
  Activity,
  CheckCircle2,
  Search,
  Eye,
  EyeOff,
  Check,
  X,
  UserX,
  UserCheck,
  RefreshCw,
  Loader2,
  Clock,
  MapPin,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

type ActiveTab =
  | "overview"
  | "theatres"
  | "bookings_rec"
  | "invoices"
  | "exceptions"
  | "movies"
  | "events"
  | "users"
  | "partners";

export default function AdminDashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get("tab") as ActiveTab) || "overview";
  const [activeTab, setActiveTab] = useState<ActiveTab>(initialTab);

  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // Sync tab from URL if changed externally
  useEffect(() => {
    const tabFromUrl = searchParams.get("tab") as ActiveTab;
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  // -------------------------------------------------------------------------
  // OVERVIEW / STATS STATE
  // -------------------------------------------------------------------------
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [compStats, setCompStats] = useState<AdminComprehensiveStats | null>(null);
  const [healthItems, setHealthItems] = useState<IntegrationHealthItem[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const [data, cData, hData] = await Promise.allSettled([
        getAdminStats(),
        getAdminComprehensiveStats(),
        getIntegrationsHealth(),
      ]);
      if (data.status === "fulfilled") setStats(data.value);
      if (cData.status === "fulfilled") setCompStats(cData.value);
      if (hData.status === "fulfilled") setHealthItems(hData.value);
    } catch {
      toast.error("Failed to load platform stats");
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // -------------------------------------------------------------------------
  // MOVIES CONTROL STATE
  // -------------------------------------------------------------------------
  const [movies, setMovies] = useState<AdminMovieItem[]>([]);
  const [moviesLoading, setMoviesLoading] = useState(false);
  const [movieSearch, setMovieSearch] = useState("");
  const debouncedMovieSearch = useDebounce(movieSearch, 300);
  const [movieStatusFilter, setMovieStatusFilter] = useState("ALL");
  const [movieLanguageFilter, setMovieLanguageFilter] = useState("ALL");
  const [movieGenreFilter, setMovieGenreFilter] = useState("ALL");
  const [moviePage, setMoviePage] = useState(1);
  const [moviePagination, setMoviePagination] = useState<any>(null);
  const [updatingMovieId, setUpdatingMovieId] = useState<string | null>(null);

  const fetchMovies = useCallback(async () => {
    setMoviesLoading(true);
    try {
      const res = await getAdminMovies({
        search: debouncedMovieSearch.trim() || undefined,
        status: movieStatusFilter !== "ALL" ? movieStatusFilter : undefined,
        language: movieLanguageFilter !== "ALL" ? movieLanguageFilter : undefined,
        genre: movieGenreFilter !== "ALL" ? movieGenreFilter : undefined,
        page: moviePage,
        limit: 15,
      });
      setMovies(res.movies || []);
      setMoviePagination(res.pagination || null);
    } catch {
      toast.error("Failed to load movies");
    } finally {
      setMoviesLoading(false);
    }
  }, [debouncedMovieSearch, movieStatusFilter, movieLanguageFilter, movieGenreFilter, moviePage]);

  useEffect(() => {
    if (activeTab === "movies" || activeTab === "overview") {
      fetchMovies();
    }
  }, [activeTab, fetchMovies]);

  const handleToggleMovieVisibility = async (movie: AdminMovieItem) => {
    const newStatus = movie.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    setUpdatingMovieId(movie.id);
    try {
      await updateAdminMovieStatus(movie.id, newStatus);
      toast.success(
        newStatus === "PUBLISHED"
          ? `"${movie.title}" is now visible in the catalog!`
          : `"${movie.title}" hidden from public catalog.`
      );
      // Optimistic local update
      setMovies((prev) =>
        prev.map((m) => (m.id === movie.id ? { ...m, status: newStatus } : m))
      );
      fetchStats();
    } catch {
      toast.error("Failed to update movie visibility");
    } finally {
      setUpdatingMovieId(null);
    }
  };

  // -------------------------------------------------------------------------
  // EVENTS MODERATION & CONTROL STATE
  // -------------------------------------------------------------------------
  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventSearch, setEventSearch] = useState("");
  const debouncedEventSearch = useDebounce(eventSearch, 300);
  const [eventStatusFilter, setEventStatusFilter] = useState("ALL");
  const [eventCategoryFilter, setEventCategoryFilter] = useState("ALL");
  const [eventPage, setEventPage] = useState(1);
  const [eventPagination, setEventPagination] = useState<any>(null);
  const [rejectingEvent, setRejectingEvent] = useState<EventItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const res = await getAdminEvents({
        search: debouncedEventSearch.trim() || undefined,
        status: eventStatusFilter !== "ALL" ? eventStatusFilter : undefined,
        page: eventPage,
        limit: 15,
      });
      let items = res.events || [];
      if (eventCategoryFilter !== "ALL") {
        items = items.filter((ev: any) =>
          ev.category?.toLowerCase() === eventCategoryFilter.toLowerCase()
        );
      }
      setEvents(items);
      setEventPagination(res.pagination || null);
    } catch {
      toast.error("Failed to load events");
    } finally {
      setEventsLoading(false);
    }
  }, [debouncedEventSearch, eventStatusFilter, eventCategoryFilter, eventPage]);

  useEffect(() => {
    if (activeTab === "events" || activeTab === "overview") {
      fetchEvents();
    }
  }, [activeTab, fetchEvents]);

  const handleApproveEvent = async (event: EventItem) => {
    setActionLoadingId(event.id);
    try {
      await updateAdminEventStatus(event.id, "PUBLISHED");
      toast.success(`Event "${event.title}" approved & published!`);
      fetchEvents();
      fetchStats();
    } catch {
      toast.error("Failed to approve event");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectEventConfirm = async () => {
    if (!rejectingEvent) return;
    if (!rejectionReason.trim()) {
      toast.error("Please enter a rejection reason");
      return;
    }
    setActionLoadingId(rejectingEvent.id);
    try {
      await updateAdminEventStatus(
        rejectingEvent.id,
        "REJECTED",
        rejectionReason.trim()
      );
      toast.success(`Event "${rejectingEvent.title}" rejected.`);
      setRejectingEvent(null);
      setRejectionReason("");
      fetchEvents();
      fetchStats();
    } catch {
      toast.error("Failed to reject event");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleEventDelist = async (event: EventItem) => {
    const nextStatus = event.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    setActionLoadingId(event.id);
    try {
      await updateAdminEventStatus(event.id, nextStatus);
      toast.success(
        nextStatus === "PUBLISHED"
          ? `Event "${event.title}" published!`
          : `Event "${event.title}" delisted / hidden.`
      );
      fetchEvents();
      fetchStats();
    } catch {
      toast.error("Failed to update event status");
    } finally {
      setActionLoadingId(null);
    }
  };

  // -------------------------------------------------------------------------
  // USERS MANAGEMENT STATE
  // -------------------------------------------------------------------------
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const debouncedUserSearch = useDebounce(userSearch, 300);
  const [userRoleFilter, setUserRoleFilter] = useState("ALL");
  const [userStatusFilter, setUserStatusFilter] = useState("ALL");
  const [userPage, setUserPage] = useState(1);
  const [userPagination, setUserPagination] = useState<any>(null);
  const [userToBlock, setUserToBlock] = useState<AdminUserItem | null>(null);
  const [userActionLoadingId, setUserActionLoadingId] = useState<string | null>(
    null
  );

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const activeFilter =
        userStatusFilter === "ACTIVE"
          ? true
          : userStatusFilter === "BLOCKED"
          ? false
          : undefined;

      const res = await getAdminUsers({
        search: debouncedUserSearch.trim() || undefined,
        role: userRoleFilter !== "ALL" ? userRoleFilter : undefined,
        is_active: activeFilter,
        page: userPage,
        limit: 15,
      });
      setUsers(res.users || []);
      setUserPagination(res.pagination || null);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setUsersLoading(false);
    }
  }, [debouncedUserSearch, userRoleFilter, userStatusFilter, userPage]);

  useEffect(() => {
    if (activeTab === "users" || activeTab === "overview") {
      fetchUsers();
    }
  }, [activeTab, fetchUsers]);

  const handleToggleUserBlock = async (
    targetUser: AdminUserItem,
    makeActive: boolean
  ) => {
    setUserActionLoadingId(targetUser.id);
    try {
      await updateAdminUserStatus(targetUser.id, makeActive);
      toast.success(
        makeActive
          ? `User "${targetUser.full_name}" is now unblocked and active.`
          : `User "${targetUser.full_name}" has been blocked and logged out.`
      );
      setUserToBlock(null);
      // Optimistic local update
      setUsers((prev) =>
        prev.map((u) =>
          u.id === targetUser.id ? { ...u, is_active: makeActive } : u
        )
      );
      fetchStats();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to update user status");
    } finally {
      setUserActionLoadingId(null);
    }
  };

  // -------------------------------------------------------------------------
  // PARTNERS VERIFICATION STATE
  // -------------------------------------------------------------------------
  const [partners, setPartners] = useState<Partner[]>([]);
  const [partnersLoading, setPartnersLoading] = useState(false);
  const [partnerStatusFilter, setPartnerStatusFilter] = useState("ALL");
  const [partnerPage, setPartnerPage] = useState(1);
  const [partnerPagination, setPartnerPagination] = useState<any>(null);
  const [partnerActionLoadingId, setPartnerActionLoadingId] = useState<
    string | null
  >(null);

  const fetchPartners = useCallback(async () => {
    setPartnersLoading(true);
    try {
      const res = await getAdminPartners({
        status: partnerStatusFilter !== "ALL" ? partnerStatusFilter : undefined,
        page: partnerPage,
        limit: 10,
      });
      setPartners(res.partners || res.data || []);
      setPartnerPagination(res.pagination || res.meta || null);
    } catch {
      toast.error("Failed to load partners");
    } finally {
      setPartnersLoading(false);
    }
  }, [partnerStatusFilter, partnerPage]);

  useEffect(() => {
    if (activeTab === "partners" || activeTab === "overview") {
      fetchPartners();
    }
  }, [activeTab, fetchPartners]);

  const handleApprovePartner = async (id: string) => {
    setPartnerActionLoadingId(id);
    try {
      await updatePartnerStatus(id, "APPROVED");
      toast.success("Partner approved successfully");
      fetchPartners();
      fetchStats();
    } catch {
      toast.error("Failed to approve partner");
    } finally {
      setPartnerActionLoadingId(null);
    }
  };

  const handleRejectPartner = async (id: string) => {
    setPartnerActionLoadingId(id);
    try {
      await updatePartnerStatus(id, "REJECTED", "Application criteria not met");
      toast.success("Partner application rejected");
      fetchPartners();
      fetchStats();
    } catch {
      toast.error("Failed to reject partner");
    } finally {
      setPartnerActionLoadingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Header />

      <main className="mx-auto max-w-7xl px-4 pt-32 sm:pt-36 lg:pt-44 pb-16 sm:px-6 lg:px-8">
        {/* TOP TITLE BAR */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-200">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-orange-100 text-orange-600 border border-orange-200">
                <ShieldCheck className="h-6 w-6" />
              </span>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">
                  Admin Control Center
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                  Full platform governance for Movies, Events, User Accounts, and Partners
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => {
                fetchStats();
                if (activeTab === "movies") fetchMovies();
                if (activeTab === "events") fetchEvents();
                if (activeTab === "users") fetchUsers();
                if (activeTab === "partners") fetchPartners();
                toast.success("Data refreshed");
              }}
              variant="outline"
              size="sm"
              className="bg-white border-gray-300 text-gray-700 hover:text-gray-900 hover:bg-gray-100 h-9 gap-1.5 shadow-2xs"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
          </div>
        </div>

        {/* NAVIGATION TABS (Sticky under header on scroll) */}
        <div className="sticky top-[72px] sm:top-[88px] lg:top-[128px] z-30 bg-white/95 backdrop-blur-md py-2.5 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 border-b border-gray-200 shadow-2xs">
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-1 scrollbar-none">
          {[
            { id: "overview", label: "Overview & Performance", icon: LayoutDashboard },
            {
              id: "theatres",
              label: "Theatres & Commercials",
              icon: Building2,
              count: compStats?.active_theatres_count,
            },
            {
              id: "bookings_rec",
              label: "Bookings & Settlement",
              icon: Ticket,
              count: compStats?.total_bookings,
            },
            {
              id: "invoices",
              label: "Commission Invoices",
              icon: FileText,
              badge: compStats?.overdue_invoices_count ? `${compStats.overdue_invoices_count} overdue` : undefined,
            },
            {
              id: "exceptions",
              label: "Exceptions Queue",
              icon: AlertTriangle,
              badge: compStats?.open_exceptions_count ? `${compStats.open_exceptions_count} open` : undefined,
            },
            { id: "movies", label: "Movies Control", icon: Film, count: stats?.movies.total },
            {
              id: "events",
              label: "Events Moderation",
              icon: CalendarDays,
              badge: stats?.events.pending ? `${stats.events.pending} pending` : undefined,
            },
            { id: "users", label: "User Management", icon: Users, count: stats?.users.total },
            {
              id: "partners",
              label: "Partner Requests",
              icon: Building2,
              badge: stats?.partners.pending ? `${stats.partners.pending} new` : undefined,
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id as ActiveTab)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "bg-orange-600 text-white shadow-md shadow-orange-600/20"
                    : "bg-gray-100 text-gray-600 hover:text-gray-900 hover:bg-gray-200/80"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`ml-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-gray-200 text-gray-700"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
                {tab.badge && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
          </div>
        </div>

        {/* ================================================================= */}
        {/* TAB 1: OVERVIEW METRICS & BUSINESS PERFORMANCE                    */}
        {/* ================================================================= */}
        {activeTab === "overview" && (
          <div className="py-6 space-y-6">
            {/* Business Performance & Revenue Operations (Central Admin Portal) */}
            <div className="bg-white border border-gray-200 p-6 rounded-2xl space-y-4 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200 pb-4">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                    <IndianRupee className="w-5 h-5 text-orange-600" />
                    Business Performance & Revenue Operations
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Centralized platform gross volume, net commission earnings, cash realization, and gateway health.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => handleTabChange("bookings_rec")}
                    variant="outline"
                    size="sm"
                    className="bg-white border-gray-200 text-xs text-gray-700 hover:text-gray-900 hover:bg-gray-50 shadow-2xs"
                  >
                    Audit Bookings
                  </Button>
                  <Button
                    onClick={() => handleTabChange("theatres")}
                    variant="outline"
                    size="sm"
                    className="bg-white border-gray-200 text-xs text-gray-700 hover:text-gray-900 hover:bg-gray-50 shadow-2xs"
                  >
                    Configure Theatres
                  </Button>
                  <Button
                    onClick={() => handleTabChange("invoices")}
                    variant="outline"
                    size="sm"
                    className="bg-white border-gray-200 text-xs text-gray-700 hover:text-gray-900 hover:bg-gray-50 shadow-2xs"
                  >
                    View Invoices
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <div className="text-xs uppercase font-medium text-gray-500">Gross Ticket Volume</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">
                    ₹{(((compStats?.gross_booking_paise || 0) / 100)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{compStats?.total_tickets || 0} tickets sold across {compStats?.total_bookings || 0} bookings</div>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <div className="text-xs uppercase font-medium text-gray-500">Commission Earned</div>
                  <div className="text-2xl font-bold text-emerald-600 mt-1">
                    ₹{(((compStats?.commission_earned_paise || 0) / 100)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Platform revenue base (₹30/tix default)</div>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <div className="text-xs uppercase font-medium text-gray-500">Total Billed Invoices</div>
                  <div className="text-2xl font-bold text-blue-600 mt-1">
                    ₹{(((compStats?.commission_invoiced_paise || 0) / 100)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-emerald-600 mt-1">₹{(((compStats?.commission_collected_paise || 0) / 100)).toLocaleString('en-IN')} collected</div>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <div className="text-xs uppercase font-medium text-gray-500">Outstanding Receivables</div>
                  <div className="text-2xl font-bold text-amber-600 mt-1">
                    ₹{(((compStats?.commission_outstanding_paise || 0) / 100)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-amber-600 mt-1">{compStats?.overdue_invoices_count || 0} overdue invoices</div>
                </div>
              </div>

              {/* Integration Gateway Health */}
              {healthItems.length > 0 && (
                <div className="pt-3 border-t border-gray-200">
                  <div className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-emerald-600" /> Integration & Settlement Gateways
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {healthItems.map((h, i) => (
                      <div key={i} className="flex items-center justify-between bg-gray-50 px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="font-semibold text-gray-900">{h.provider}</span>
                        </div>
                        <div className="text-right text-gray-500 font-mono">
                          <span className="text-emerald-600">{h.latency_ms}ms</span> &bull; {h.success_rate}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Stat Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Movies Stat */}
              <div
                onClick={() => handleTabChange("movies")}
                className="bg-white border border-gray-200 p-5 rounded-2xl cursor-pointer hover:border-orange-300 shadow-2xs transition group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider">
                    Movies Catalog
                  </span>
                  <div className="p-2.5 rounded-xl bg-orange-100 text-orange-600 group-hover:scale-110 transition">
                    <Film className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-3xl font-extrabold text-gray-900">
                    {stats?.movies.total ?? "—"}
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-xs">
                    <span className="text-emerald-600 font-medium flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      {stats?.movies.published ?? 0} Published
                    </span>
                    <span className="text-gray-400">•</span>
                    <span className="text-amber-600 font-medium">
                      {stats?.movies.draft ?? 0} Hidden / Draft
                    </span>
                  </div>
                </div>
              </div>

              {/* Events Stat */}
              <div
                onClick={() => handleTabChange("events")}
                className="bg-white border border-gray-200 p-5 rounded-2xl cursor-pointer hover:border-emerald-300 shadow-2xs transition group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider">
                    Live Events
                  </span>
                  <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-600 group-hover:scale-110 transition">
                    <CalendarDays className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-3xl font-extrabold text-gray-900">
                    {stats?.events.total ?? "—"}
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-xs">
                    <span className="text-emerald-600 font-medium">
                      {stats?.events.published ?? 0} Live
                    </span>
                    <span className="text-gray-400">•</span>
                    <span className="text-amber-600 font-medium">
                      {stats?.events.pending ?? 0} Pending Approval
                    </span>
                  </div>
                </div>
              </div>

              {/* Users Stat */}
              <div
                onClick={() => handleTabChange("users")}
                className="bg-white border border-gray-200 p-5 rounded-2xl cursor-pointer hover:border-blue-300 shadow-2xs transition group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider">
                    User Accounts
                  </span>
                  <div className="p-2.5 rounded-xl bg-blue-100 text-blue-600 group-hover:scale-110 transition">
                    <Users className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-3xl font-extrabold text-gray-900">
                    {stats?.users.total ?? "—"}
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-xs">
                    <span className="text-emerald-600 font-medium">
                      {stats?.users.active ?? 0} Active
                    </span>
                    <span className="text-gray-400">•</span>
                    <span className="text-rose-600 font-medium">
                      {stats?.users.blocked ?? 0} Blocked
                    </span>
                  </div>
                </div>
              </div>

              {/* Partners Stat */}
              <div
                onClick={() => handleTabChange("partners")}
                className="bg-white border border-gray-200 p-5 rounded-2xl cursor-pointer hover:border-purple-300 shadow-2xs transition group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider">
                    Partner Businesses
                  </span>
                  <div className="p-2.5 rounded-xl bg-purple-100 text-purple-600 group-hover:scale-110 transition">
                    <Building2 className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-3xl font-extrabold text-gray-900">
                    {stats?.partners.total ?? "—"}
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-xs">
                    <span className="text-emerald-600 font-medium">
                      {stats?.partners.approved ?? 0} Approved
                    </span>
                    <span className="text-gray-400">•</span>
                    <span className="text-amber-600 font-medium">
                      {stats?.partners.pending ?? 0} Awaiting Review
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions Panel */}
            <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-2xs">
              <h3 className="text-base font-bold text-gray-900 mb-4">
                Quick Governance Shortcuts
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <Button
                  onClick={() => handleTabChange("movies")}
                  className="bg-gray-50 hover:bg-gray-100 text-gray-800 border border-gray-200 justify-start h-12 px-4 gap-2.5 shadow-2xs"
                >
                  <Film className="h-4 w-4 text-orange-600" />
                  <span>Toggle Movie Visibility</span>
                </Button>
                <Button
                  onClick={() => handleTabChange("events")}
                  className="bg-gray-50 hover:bg-gray-100 text-gray-800 border border-gray-200 justify-start h-12 px-4 gap-2.5 shadow-2xs"
                >
                  <CalendarDays className="h-4 w-4 text-emerald-600" />
                  <span>Review Pending Events ({stats?.events.pending || 0})</span>
                </Button>
                <Button
                  onClick={() => handleTabChange("users")}
                  className="bg-gray-50 hover:bg-gray-100 text-gray-800 border border-gray-200 justify-start h-12 px-4 gap-2.5 shadow-2xs"
                >
                  <UserX className="h-4 w-4 text-rose-600" />
                  <span>Block / Manage Users</span>
                </Button>
                <Button
                  onClick={() => handleTabChange("partners")}
                  className="bg-gray-50 hover:bg-gray-100 text-gray-800 border border-gray-200 justify-start h-12 px-4 gap-2.5 shadow-2xs"
                >
                  <Building2 className="h-4 w-4 text-purple-600" />
                  <span>Approve Partners ({stats?.partners.pending || 0})</span>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB: THEATRES MANAGEMENT & COMMERCIAL TERMS                       */}
        {/* ================================================================= */}
        {activeTab === "theatres" && (
          <div className="py-6">
            <TheatresManagementTab />
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB: BOOKINGS & FINANCIAL DISAGGREGATION                         */}
        {/* ================================================================= */}
        {activeTab === "bookings_rec" && (
          <div className="py-6">
            <BookingsReconciliationTab />
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB: COMMISSION INVOICES & COLLECTIONS                           */}
        {/* ================================================================= */}
        {activeTab === "invoices" && (
          <div className="py-6">
            <CommissionInvoicesTab />
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB: RECONCILIATION EXCEPTIONS QUEUE                             */}
        {/* ================================================================= */}
        {activeTab === "exceptions" && (
          <div className="py-6">
            <ReconciliationExceptionsTab />
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 2: MOVIES CONTROL                                             */}
        {/* ================================================================= */}
        {activeTab === "movies" && (
          <div className="py-6 space-y-4">
            {/* Filter & Search Bar */}
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-3">
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <AdminSearchBar
                  value={movieSearch}
                  onChange={(val) => {
                    setMovieSearch(val);
                    setMoviePage(1);
                  }}
                  onClear={() => {
                    setMovieSearch("");
                    setMoviePage(1);
                  }}
                  placeholder="Search movie title, original title, genre..."
                  isSearching={moviesLoading && movieSearch !== debouncedMovieSearch}
                  className="flex-1"
                />

                {/* Filter Dropdowns & Pills */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Language Filter */}
                  <select
                    value={movieLanguageFilter}
                    onChange={(e) => {
                      setMovieLanguageFilter(e.target.value);
                      setMoviePage(1);
                    }}
                    className="h-10 rounded-xl border border-gray-200 px-3 bg-gray-50/80 hover:bg-white focus:bg-white text-xs font-semibold text-gray-700 cursor-pointer transition shadow-2xs"
                  >
                    <option value="ALL">All Languages</option>
                    <option value="Malayalam">Malayalam</option>
                    <option value="Tamil">Tamil</option>
                    <option value="Telugu">Telugu</option>
                    <option value="Hindi">Hindi</option>
                    <option value="English">English</option>
                    <option value="Kannada">Kannada</option>
                  </select>

                  {/* Genre Filter */}
                  <select
                    value={movieGenreFilter}
                    onChange={(e) => {
                      setMovieGenreFilter(e.target.value);
                      setMoviePage(1);
                    }}
                    className="h-10 rounded-xl border border-gray-200 px-3 bg-gray-50/80 hover:bg-white focus:bg-white text-xs font-semibold text-gray-700 cursor-pointer transition shadow-2xs"
                  >
                    <option value="ALL">All Genres</option>
                    <option value="Action">Action</option>
                    <option value="Comedy">Comedy</option>
                    <option value="Drama">Drama</option>
                    <option value="Thriller">Thriller</option>
                    <option value="Crime">Crime</option>
                    <option value="Sci-Fi">Sci-Fi</option>
                    <option value="Romance">Romance</option>
                    <option value="Horror">Horror</option>
                    <option value="Animation">Animation</option>
                    <option value="Adventure">Adventure</option>
                  </select>

                  {/* Status Filter Pills */}
                  <div className="flex items-center gap-1 bg-gray-50/80 p-1 rounded-xl border border-gray-200 shadow-2xs">
                    {["ALL", "PUBLISHED", "DRAFT", "PENDING_REVIEW"].map((st) => (
                      <button
                        key={st}
                        onClick={() => {
                          setMovieStatusFilter(st);
                          setMoviePage(1);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                          movieStatusFilter === st
                            ? "bg-orange-600 text-white shadow-2xs"
                            : "text-gray-600 hover:text-gray-900"
                        }`}
                      >
                        {st === "ALL"
                          ? "All Status"
                          : st === "PUBLISHED"
                          ? "Showing"
                          : st === "DRAFT"
                          ? "Hidden"
                          : "Pending"}
                      </button>
                    ))}
                  </div>

                  {(movieSearch.trim() !== "" ||
                    movieStatusFilter !== "ALL" ||
                    movieLanguageFilter !== "ALL" ||
                    movieGenreFilter !== "ALL") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setMovieSearch("");
                        setMovieStatusFilter("ALL");
                        setMovieLanguageFilter("ALL");
                        setMovieGenreFilter("ALL");
                        setMoviePage(1);
                      }}
                      className="h-10 px-3 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 gap-1 rounded-xl"
                    >
                      <X className="w-3.5 h-3.5" />
                      Reset
                    </Button>
                  )}
                </div>
              </div>

              {/* Filter Summary */}
              <div className="flex items-center justify-between text-xs text-gray-500 pt-1 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <span>
                    Showing <strong className="text-gray-900">{movies.length}</strong> movies
                    {moviePagination?.total ? ` (Total: ${moviePagination.total})` : ""}
                  </span>
                </div>
                {moviesLoading && (
                  <span className="inline-flex items-center gap-1.5 text-orange-600 font-medium">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Updating catalog...
                  </span>
                )}
              </div>
            </div>

            {/* Movies Table / List */}
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-2xs">
              {moviesLoading && movies.length === 0 ? (
                <div className="p-16 flex flex-col items-center justify-center gap-3 text-gray-400">
                  <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
                  <p className="text-sm">Loading movies catalog...</p>
                </div>
              ) : movies.length === 0 ? (
                <div className="p-16 text-center text-gray-400">
                  <Film className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                  <p className="text-base font-semibold text-gray-700">
                    No movies found
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Try adjusting your search query or status filter
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-gray-50 text-gray-500 uppercase text-[11px] tracking-wider border-b border-gray-200">
                      <tr>
                        <th className="py-3.5 px-4">Movie</th>
                        <th className="py-3.5 px-4">Genre / Lang</th>
                        <th className="py-3.5 px-4">Duration</th>
                        <th className="py-3.5 px-4">Catalog Status</th>
                        <th className="py-3.5 px-4 text-right">Visibility Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {movies.map((m) => {
                        const isPublished = m.status === "PUBLISHED";
                        const isUpdating = updatingMovieId === m.id;
                        return (
                          <tr
                            key={m.id}
                            className="hover:bg-gray-50 transition group"
                          >
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                {m.poster_url ? (
                                  <img
                                    src={m.poster_url}
                                    alt={m.title}
                                    className="w-10 h-14 object-cover rounded-lg bg-gray-100 shrink-0 border border-gray-200"
                                  />
                                ) : (
                                  <div className="w-10 h-14 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 border border-gray-200">
                                    <Film className="h-5 w-5 text-gray-400" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="font-bold text-gray-900 text-sm truncate max-w-xs">
                                    {m.title}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {m.certificate || "UA"} •{" "}
                                    {m.release_date
                                      ? format(parseISO(m.release_date), "dd MMM yyyy")
                                      : "Coming Soon"}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-gray-600">
                              <span className="font-medium text-gray-900">
                                {m.language}
                              </span>
                              <p className="text-xs text-gray-500 truncate max-w-[150px]">
                                {m.genre || "Drama"}
                              </p>
                            </td>
                            <td className="py-3 px-4 text-gray-600">
                              {m.duration_min} mins
                            </td>
                            <td className="py-3 px-4">
                              <Badge
                                className={
                                  isPublished
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : "bg-amber-50 text-amber-700 border-amber-200"
                                }
                              >
                                {isPublished ? "● Showing in Catalog" : "○ Hidden / Draft"}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <Button
                                onClick={() => handleToggleMovieVisibility(m)}
                                disabled={isUpdating}
                                size="sm"
                                variant={isPublished ? "destructive" : "default"}
                                className={`text-xs h-8 font-semibold gap-1.5 transition ${
                                  isPublished
                                    ? "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                                }`}
                              >
                                {isUpdating ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : isPublished ? (
                                  <>
                                    <EyeOff className="h-3.5 w-3.5" />
                                    <span>Hide Movie</span>
                                  </>
                                ) : (
                                  <>
                                    <Eye className="h-3.5 w-3.5" />
                                    <span>Show in Catalog</span>
                                  </>
                                )}
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {moviePagination && moviePagination.total_pages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50 text-xs text-gray-600">
                  <span>
                    Page {moviePage} of {moviePagination.total_pages} (
                    {moviePagination.total} total movies)
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      onClick={() => setMoviePage((p) => Math.max(1, p - 1))}
                      disabled={moviePage <= 1}
                      variant="outline"
                      size="sm"
                      className="h-7 px-2.5 bg-white border-gray-200 text-gray-700 shadow-2xs"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      onClick={() =>
                        setMoviePage((p) =>
                          Math.min(moviePagination.total_pages, p + 1)
                        )
                      }
                      disabled={moviePage >= moviePagination.total_pages}
                      variant="outline"
                      size="sm"
                      className="h-7 px-2.5 bg-white border-gray-200 text-gray-700 shadow-2xs"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 3: EVENTS MODERATION & CONTROL                                */}
        {/* ================================================================= */}
        {activeTab === "events" && (
          <div className="py-6 space-y-4">
            {/* Filter & Search Bar */}
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-3">
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <AdminSearchBar
                  value={eventSearch}
                  onChange={(val) => {
                    setEventSearch(val);
                    setEventPage(1);
                  }}
                  onClear={() => {
                    setEventSearch("");
                    setEventPage(1);
                  }}
                  placeholder="Search live events by title, venue, city..."
                  isSearching={eventsLoading && eventSearch !== debouncedEventSearch}
                  className="flex-1"
                />

                <div className="flex flex-wrap items-center gap-2">
                  {/* Category Filter */}
                  <select
                    value={eventCategoryFilter}
                    onChange={(e) => {
                      setEventCategoryFilter(e.target.value);
                      setEventPage(1);
                    }}
                    className="h-10 rounded-xl border border-gray-200 px-3 bg-gray-50/80 hover:bg-white focus:bg-white text-xs font-semibold text-gray-700 cursor-pointer transition shadow-2xs"
                  >
                    <option value="ALL">All Categories</option>
                    <option value="Music">Music</option>
                    <option value="Comedy">Comedy</option>
                    <option value="Workshop">Workshop</option>
                    <option value="Conference">Conference</option>
                    <option value="Sports">Sports</option>
                    <option value="Theater">Theater</option>
                  </select>

                  {/* Status Filter Pills */}
                  <div className="flex items-center gap-1 bg-gray-50/80 p-1 rounded-xl border border-gray-200 shadow-2xs">
                    {[
                      { id: "ALL", label: "All" },
                      { id: "PENDING_APPROVAL", label: "Pending" },
                      { id: "PUBLISHED", label: "Published" },
                      { id: "REJECTED", label: "Rejected" },
                      { id: "DRAFT", label: "Draft" },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setEventStatusFilter(tab.id);
                          setEventPage(1);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                          eventStatusFilter === tab.id
                            ? "bg-orange-600 text-white shadow-2xs"
                            : "text-gray-600 hover:text-gray-900"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {(eventSearch.trim() !== "" ||
                    eventStatusFilter !== "ALL" ||
                    eventCategoryFilter !== "ALL") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEventSearch("");
                        setEventStatusFilter("ALL");
                        setEventCategoryFilter("ALL");
                        setEventPage(1);
                      }}
                      className="h-10 px-3 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 gap-1 rounded-xl"
                    >
                      <X className="w-3.5 h-3.5" />
                      Reset
                    </Button>
                  )}
                </div>
              </div>

              {/* Filter Summary */}
              <div className="flex items-center justify-between text-xs text-gray-500 pt-1 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <span>
                    Showing <strong className="text-gray-900">{events.length}</strong> events
                    {eventPagination?.total ? ` (Total: ${eventPagination.total})` : ""}
                  </span>
                </div>
                {eventsLoading && (
                  <span className="inline-flex items-center gap-1.5 text-orange-600 font-medium">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Updating events...
                  </span>
                )}
              </div>
            </div>

            {/* Events Cards / Table */}
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-2xs">
              {eventsLoading && events.length === 0 ? (
                <div className="p-16 flex flex-col items-center justify-center gap-3 text-gray-400">
                  <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
                  <p className="text-sm">Loading events...</p>
                </div>
              ) : events.length === 0 ? (
                <div className="p-16 text-center text-gray-400">
                  <CalendarDays className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                  <p className="text-base font-semibold text-gray-700">
                    No events found
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Try another search term or filter
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {events.map((e) => {
                    const isPending = e.status === "PENDING_APPROVAL";
                    const isLive = e.status === "PUBLISHED";
                    const isRejected = e.status === "REJECTED";
                    const isActing = actionLoadingId === e.id;

                    return (
                      <div
                        key={e.id}
                        className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-gray-50 transition"
                      >
                        <div className="flex items-start gap-4 min-w-0 flex-1">
                          {e.poster_image_url ? (
                            <img
                              src={e.poster_image_url}
                              alt={e.title}
                              className="w-16 h-20 sm:w-20 sm:h-24 object-cover rounded-xl bg-gray-100 border border-gray-200 shrink-0"
                            />
                          ) : (
                            <div className="w-16 h-20 sm:w-20 sm:h-24 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 border border-gray-200">
                              <CalendarDays className="h-6 w-6 text-gray-400" />
                            </div>
                          )}

                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-gray-900 text-base truncate">
                                {e.title}
                              </h4>
                              <Badge
                                className={
                                  isLive
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : isPending
                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                    : isRejected
                                    ? "bg-rose-50 text-rose-700 border-rose-200"
                                    : "bg-gray-100 text-gray-700 border-gray-200"
                                }
                              >
                                {e.status}
                              </Badge>
                              <span className="text-[11px] px-2 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200 uppercase font-semibold">
                                {e.category}
                              </span>
                            </div>

                            <p className="text-xs text-gray-500 flex items-center gap-1.5">
                              <MapPin className="h-3 w-3 text-gray-400 shrink-0" />
                              <span className="truncate">
                                {e.venue_name}, {e.city}
                              </span>
                            </p>

                            <p className="text-xs text-gray-500 flex items-center gap-1.5">
                              <Clock className="h-3 w-3 text-gray-400 shrink-0" />
                              <span>
                                {e.starts_at
                                  ? format(
                                      parseISO(e.starts_at),
                                      "dd MMM yyyy, hh:mm a"
                                    )
                                  : "TBD"}
                              </span>
                            </p>

                            {e.rejection_reason && (
                              <p className="text-xs text-rose-700 italic bg-rose-50 px-2 py-1 rounded-md border border-rose-200 inline-block mt-1">
                                Reason: {e.rejection_reason}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          {isPending && (
                            <>
                              <Button
                                onClick={() => handleApproveEvent(e)}
                                disabled={isActing}
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 gap-1 shadow-2xs"
                              >
                                {isActing ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Check className="h-3.5 w-3.5" />
                                )}
                                <span>Approve</span>
                              </Button>

                              <Button
                                onClick={() => {
                                  setRejectingEvent(e);
                                  setRejectionReason("");
                                }}
                                disabled={isActing}
                                size="sm"
                                variant="outline"
                                className="border-rose-200 text-rose-700 hover:bg-rose-50 font-semibold text-xs h-9 gap-1 shadow-2xs"
                              >
                                <X className="h-3.5 w-3.5" />
                                <span>Reject</span>
                              </Button>
                            </>
                          )}

                          {isLive && (
                            <Button
                              onClick={() => handleToggleEventDelist(e)}
                              disabled={isActing}
                              size="sm"
                              variant="outline"
                              className="border-amber-200 text-amber-700 hover:bg-amber-50 font-semibold text-xs h-9 gap-1.5 shadow-2xs"
                            >
                              <EyeOff className="h-3.5 w-3.5" />
                              <span>Delist / Hide</span>
                            </Button>
                          )}

                          {!isLive && !isPending && (
                            <Button
                              onClick={() => handleApproveEvent(e)}
                              disabled={isActing}
                              size="sm"
                              className="bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs h-9 gap-1 shadow-2xs"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>Publish Event</span>
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 4: USER MANAGEMENT                                            */}
        {/* ================================================================= */}
        {activeTab === "users" && (
          <div className="py-6 space-y-4">
            {/* Filter & Search Bar */}
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-3">
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <AdminSearchBar
                  value={userSearch}
                  onChange={(val) => {
                    setUserSearch(val);
                    setUserPage(1);
                  }}
                  onClear={() => {
                    setUserSearch("");
                    setUserPage(1);
                  }}
                  placeholder="Search user by name, email, or phone..."
                  isSearching={usersLoading && userSearch !== debouncedUserSearch}
                  className="flex-1"
                />

                {/* Role & Status Filter Pills */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1 bg-gray-50/80 p-1 rounded-xl border border-gray-200 shadow-2xs">
                    {["ALL", "USER", "PARTNER", "ADMIN"].map((r) => (
                      <button
                        key={r}
                        onClick={() => {
                          setUserRoleFilter(r);
                          setUserPage(1);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                          userRoleFilter === r
                            ? "bg-orange-600 text-white shadow-2xs"
                            : "text-gray-600 hover:text-gray-900"
                        }`}
                      >
                        {r === "ALL" ? "All Roles" : r}
                      </button>
                    ))}
                  </div>

                  <div className="h-4 w-px bg-gray-200 mx-1 hidden sm:block" />

                  <div className="flex items-center gap-1 bg-gray-50/80 p-1 rounded-xl border border-gray-200 shadow-2xs">
                    {["ALL", "ACTIVE", "BLOCKED"].map((st) => (
                      <button
                        key={st}
                        onClick={() => {
                          setUserStatusFilter(st);
                          setUserPage(1);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                          userStatusFilter === st
                            ? "bg-emerald-600 text-white shadow-2xs"
                            : "text-gray-600 hover:text-gray-900"
                        }`}
                      >
                        {st === "ALL" ? "All Status" : st}
                      </button>
                    ))}
                  </div>

                  {(userSearch.trim() !== "" ||
                    userRoleFilter !== "ALL" ||
                    userStatusFilter !== "ALL") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setUserSearch("");
                        setUserRoleFilter("ALL");
                        setUserStatusFilter("ALL");
                        setUserPage(1);
                      }}
                      className="h-10 px-3 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 gap-1 rounded-xl"
                    >
                      <X className="w-3.5 h-3.5" />
                      Reset
                    </Button>
                  )}
                </div>
              </div>

              {/* Filter Summary */}
              <div className="flex items-center justify-between text-xs text-gray-500 pt-1 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <span>
                    Showing <strong className="text-gray-900">{users.length}</strong> users
                    {userPagination?.total ? ` (Total: ${userPagination.total})` : ""}
                  </span>
                </div>
                {usersLoading && (
                  <span className="inline-flex items-center gap-1.5 text-orange-600 font-medium">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Updating users...
                  </span>
                )}
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-2xs">
              {usersLoading && users.length === 0 ? (
                <div className="p-16 flex flex-col items-center justify-center gap-3 text-gray-400">
                  <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
                  <p className="text-sm">Loading users...</p>
                </div>
              ) : users.length === 0 ? (
                <div className="p-16 text-center text-gray-400">
                  <Users className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                  <p className="text-base font-semibold text-gray-700">
                    No users found
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Try a different search term or role filter
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-gray-50 text-gray-500 uppercase text-[11px] tracking-wider border-b border-gray-200">
                      <tr>
                        <th className="py-3.5 px-4">User</th>
                        <th className="py-3.5 px-4">Role</th>
                        <th className="py-3.5 px-4">Registered On</th>
                        <th className="py-3.5 px-4">Account Status</th>
                        <th className="py-3.5 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {users.map((u) => {
                        const isActive = u.is_active;
                        const isActing = userActionLoadingId === u.id;
                        return (
                          <tr
                            key={u.id}
                            className="hover:bg-gray-50 transition group"
                          >
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-orange-100 border border-orange-200 flex items-center justify-center text-xs font-bold text-orange-700 shrink-0">
                                  {u.full_name?.charAt(0)?.toUpperCase() || "U"}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-bold text-gray-900 truncate">
                                    {u.full_name}
                                  </p>
                                  <p className="text-xs text-gray-500 truncate">
                                    {u.email}
                                    {u.phone ? ` • ${u.phone}` : ""}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-4">
                              <Badge
                                variant="outline"
                                className={
                                  u.role === "ADMIN"
                                    ? "bg-purple-50 text-purple-700 border-purple-200"
                                    : u.role === "PARTNER"
                                    ? "bg-blue-50 text-blue-700 border-blue-200"
                                    : "bg-gray-100 text-gray-700 border-gray-200"
                                }
                              >
                                {u.role}
                              </Badge>
                            </td>

                            <td className="py-3 px-4 text-gray-500 text-xs">
                              {u.created_at
                                ? format(parseISO(u.created_at), "dd MMM yyyy")
                                : "N/A"}
                            </td>

                            <td className="py-3 px-4">
                              <Badge
                                className={
                                  isActive
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : "bg-rose-50 text-rose-700 border-rose-200 font-bold"
                                }
                              >
                                {isActive ? "● Active" : "✕ Blocked"}
                              </Badge>
                            </td>

                            <td className="py-3 px-4 text-right">
                              {u.role === "ADMIN" ? (
                                <span className="text-xs text-gray-400 italic pr-2">
                                  Protected Admin
                                </span>
                              ) : isActive ? (
                                <Button
                                  onClick={() => setUserToBlock(u)}
                                  disabled={isActing}
                                  size="sm"
                                  variant="destructive"
                                  className="h-8 text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 gap-1.5 shadow-2xs"
                                >
                                  <UserX className="h-3.5 w-3.5" />
                                  <span>Block User</span>
                                </Button>
                              ) : (
                                <Button
                                  onClick={() => handleToggleUserBlock(u, true)}
                                  disabled={isActing}
                                  size="sm"
                                  className="h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-2xs"
                                >
                                  {isActing ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <UserCheck className="h-3.5 w-3.5" />
                                  )}
                                  <span>Unblock User</span>
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 5: PARTNER VERIFICATION                                       */}
        {/* ================================================================= */}
        {activeTab === "partners" && (
          <div className="py-6 space-y-4">
            <div className="flex items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
              <div>
                <h3 className="font-bold text-gray-900 text-base">
                  Partner Applications & Approvals
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Verify business registrations for cinema exhibitors and event organisers
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                {["ALL", "PENDING_APPROVAL", "APPROVED", "REJECTED"].map((st) => (
                  <button
                    key={st}
                    onClick={() => {
                      setPartnerStatusFilter(st);
                      setPartnerPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      partnerStatusFilter === st
                        ? "bg-orange-600 text-white shadow-xs"
                        : "bg-gray-100 text-gray-600 hover:text-gray-900 hover:bg-gray-200"
                    }`}
                  >
                    {st === "ALL"
                      ? "All"
                      : st === "PENDING_APPROVAL"
                      ? "Pending"
                      : st === "APPROVED"
                      ? "Approved"
                      : "Rejected"}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-2xs">
              {partnersLoading ? (
                <div className="p-16 flex flex-col items-center justify-center gap-3 text-gray-400">
                  <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
                  <p className="text-sm">Loading partner applications...</p>
                </div>
              ) : partners.length === 0 ? (
                <div className="p-16 text-center text-gray-400">
                  <Building2 className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                  <p className="text-base font-semibold text-gray-700">
                    No partner applications found
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {partners.map((p) => {
                    const isPending = p.status === "PENDING_APPROVAL";
                    const isApproved = p.status === "APPROVED";
                    const isActing = partnerActionLoadingId === p.id;

                    return (
                      <div
                        key={p.id}
                        className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-gray-50 transition"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-gray-900 text-base">
                              {p.business_name}
                            </h4>
                            <Badge
                              className={
                                isApproved
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : isPending
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-rose-50 text-rose-700 border-rose-200"
                              }
                            >
                              {p.status}
                            </Badge>
                            <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200">
                              {p.partner_type}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">
                            Contact: <span className="text-gray-900 font-medium">{p.contact_name}</span>{" "}
                            • Phone: <span className="text-gray-900 font-medium">{p.contact_phone}</span>{" "}
                            • City: <span className="text-gray-900 font-medium">{p.city}</span>
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {isPending && (
                            <>
                              <Button
                                onClick={() => handleApprovePartner(p.id)}
                                disabled={isActing}
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 gap-1 shadow-2xs"
                              >
                                {isActing ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Check className="h-3.5 w-3.5" />
                                )}
                                <span>Approve</span>
                              </Button>
                              <Button
                                onClick={() => handleRejectPartner(p.id)}
                                disabled={isActing}
                                size="sm"
                                variant="outline"
                                className="border-rose-200 text-rose-700 hover:bg-rose-50 font-semibold text-xs h-9 gap-1 shadow-2xs"
                              >
                                <X className="h-3.5 w-3.5" />
                                <span>Reject</span>
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ================================================================= */}
      {/* DIALOG: REJECT EVENT WITH REASON                                  */}
      {/* ================================================================= */}
      <Dialog
        open={!!rejectingEvent}
        onOpenChange={(open) => !open && setRejectingEvent(null)}
      >
        <DialogContent className="bg-white border-gray-200 text-gray-900">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900">
              Reject Event Application
            </DialogTitle>
            <DialogDescription className="text-gray-500 text-xs">
              Provide feedback for why &quot;{rejectingEvent?.title}&quot; is
              being rejected. This will be shared with the partner organizer.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-2">
            <Label className="text-xs text-gray-700 font-medium">
              Rejection Reason / Guidance
            </Label>
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Organizer permissions missing, venue license required, or pricing error..."
              rows={4}
              className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 text-xs rounded-xl"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setRejectingEvent(null)}
              className="bg-white border-gray-200 text-gray-700 hover:bg-gray-50 shadow-2xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectEventConfirm}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-2xs"
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================================================================= */}
      {/* ALERT DIALOG: BLOCK USER CONFIRMATION                             */}
      {/* ================================================================= */}
      <AlertDialog
        open={!!userToBlock}
        onOpenChange={(open) => !open && setUserToBlock(null)}
      >
        <AlertDialogContent className="bg-white border-gray-200 text-gray-900">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-rose-600 font-bold">
              <AlertTriangle className="h-5 w-5 text-rose-600" />
              <span>Block User Account?</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-500 text-xs leading-relaxed">
              Are you sure you want to block &quot;{userToBlock?.full_name}&quot; (
              {userToBlock?.email})?
              <br />
              <br />
              <strong className="text-gray-900">Effects:</strong>
              <ul className="list-disc list-inside mt-1 space-y-0.5 text-gray-600">
                <li>All active login sessions and refresh tokens will be immediately revoked.</li>
                <li>The user will be denied login access until an admin unblocks them.</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white border-gray-200 text-gray-700 hover:bg-gray-50 shadow-2xs">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => userToBlock && handleToggleUserBlock(userToBlock, false)}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-2xs"
            >
              Block Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

