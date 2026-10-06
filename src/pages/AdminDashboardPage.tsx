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
  AdminStats,
  AdminMovieItem,
  AdminUserItem,
} from "@/api/admin.api";
import type { EventItem } from "@/types/event.types";
import type { Partner, PartnerStatus } from "@/types/partner.types";
import {
  LayoutDashboard,
  Film,
  CalendarDays,
  Users,
  Building2,
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

type ActiveTab = "overview" | "movies" | "events" | "users" | "partners";

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
  const [statsLoading, setStatsLoading] = useState(false);

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const data = await getAdminStats();
      setStats(data);
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
  const [movieStatusFilter, setMovieStatusFilter] = useState("ALL");
  const [moviePage, setMoviePage] = useState(1);
  const [moviePagination, setMoviePagination] = useState<any>(null);
  const [updatingMovieId, setUpdatingMovieId] = useState<string | null>(null);

  const fetchMovies = useCallback(async () => {
    setMoviesLoading(true);
    try {
      const res = await getAdminMovies({
        search: movieSearch.trim() || undefined,
        status: movieStatusFilter !== "ALL" ? movieStatusFilter : undefined,
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
  }, [movieSearch, movieStatusFilter, moviePage]);

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
  const [eventStatusFilter, setEventStatusFilter] = useState("ALL");
  const [eventPage, setEventPage] = useState(1);
  const [eventPagination, setEventPagination] = useState<any>(null);
  const [rejectingEvent, setRejectingEvent] = useState<EventItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const res = await getAdminEvents({
        search: eventSearch.trim() || undefined,
        status: eventStatusFilter !== "ALL" ? eventStatusFilter : undefined,
        page: eventPage,
        limit: 15,
      });
      setEvents(res.events || []);
      setEventPagination(res.pagination || null);
    } catch {
      toast.error("Failed to load events");
    } finally {
      setEventsLoading(false);
    }
  }, [eventSearch, eventStatusFilter, eventPage]);

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
        search: userSearch.trim() || undefined,
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
  }, [userSearch, userRoleFilter, userStatusFilter, userPage]);

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
    <div className="min-h-screen bg-[#0D0E12] text-white">
      <Header />

      <main className="mx-auto max-w-7xl px-4 pt-28 pb-16 sm:px-6 lg:px-8">
        {/* TOP TITLE BAR */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#22242B]">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-[#7B1E3D]/20 text-[#E63956] border border-[#7B1E3D]/40">
                <ShieldCheck className="h-6 w-6" />
              </span>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  Admin Control Center
                </h1>
                <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
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
              className="bg-[#181920] border-[#2C2E38] text-gray-300 hover:text-white hover:bg-[#22242F] h-9 gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-4 scrollbar-none border-b border-[#1E2028]">
          {[
            { id: "overview", label: "Overview", icon: LayoutDashboard },
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
                    ? "bg-[#7B1E3D] text-white shadow-lg shadow-[#7B1E3D]/30"
                    : "bg-[#16171E] text-gray-400 hover:text-white hover:bg-[#20222B]"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`ml-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-[#252833] text-gray-400"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
                {tab.badge && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-black">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ================================================================= */}
        {/* TAB 1: OVERVIEW METRICS                                           */}
        {/* ================================================================= */}
        {activeTab === "overview" && (
          <div className="py-6 space-y-6">
            {/* Stat Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Movies Stat */}
              <div
                onClick={() => handleTabChange("movies")}
                className="bg-[#15161C] border border-[#222530] p-5 rounded-2xl cursor-pointer hover:border-[#7B1E3D]/50 transition group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">
                    Movies Catalog
                  </span>
                  <div className="p-2.5 rounded-xl bg-[#7B1E3D]/20 text-[#E63956] group-hover:scale-110 transition">
                    <Film className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-3xl font-extrabold text-white">
                    {stats?.movies.total ?? "—"}
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-xs">
                    <span className="text-emerald-400 font-medium flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      {stats?.movies.published ?? 0} Published
                    </span>
                    <span className="text-gray-500">•</span>
                    <span className="text-amber-400 font-medium">
                      {stats?.movies.draft ?? 0} Hidden / Draft
                    </span>
                  </div>
                </div>
              </div>

              {/* Events Stat */}
              <div
                onClick={() => handleTabChange("events")}
                className="bg-[#15161C] border border-[#222530] p-5 rounded-2xl cursor-pointer hover:border-emerald-500/50 transition group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">
                    Live Events
                  </span>
                  <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 group-hover:scale-110 transition">
                    <CalendarDays className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-3xl font-extrabold text-white">
                    {stats?.events.total ?? "—"}
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-xs">
                    <span className="text-emerald-400 font-medium">
                      {stats?.events.published ?? 0} Live
                    </span>
                    <span className="text-gray-500">•</span>
                    <span className="text-amber-400 font-medium">
                      {stats?.events.pending ?? 0} Pending Approval
                    </span>
                  </div>
                </div>
              </div>

              {/* Users Stat */}
              <div
                onClick={() => handleTabChange("users")}
                className="bg-[#15161C] border border-[#222530] p-5 rounded-2xl cursor-pointer hover:border-blue-500/50 transition group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">
                    User Accounts
                  </span>
                  <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400 group-hover:scale-110 transition">
                    <Users className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-3xl font-extrabold text-white">
                    {stats?.users.total ?? "—"}
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-xs">
                    <span className="text-emerald-400 font-medium">
                      {stats?.users.active ?? 0} Active
                    </span>
                    <span className="text-gray-500">•</span>
                    <span className="text-rose-400 font-medium">
                      {stats?.users.blocked ?? 0} Blocked
                    </span>
                  </div>
                </div>
              </div>

              {/* Partners Stat */}
              <div
                onClick={() => handleTabChange("partners")}
                className="bg-[#15161C] border border-[#222530] p-5 rounded-2xl cursor-pointer hover:border-purple-500/50 transition group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">
                    Partner Businesses
                  </span>
                  <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 group-hover:scale-110 transition">
                    <Building2 className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-3xl font-extrabold text-white">
                    {stats?.partners.total ?? "—"}
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-xs">
                    <span className="text-emerald-400 font-medium">
                      {stats?.partners.approved ?? 0} Approved
                    </span>
                    <span className="text-gray-500">•</span>
                    <span className="text-amber-400 font-medium">
                      {stats?.partners.pending ?? 0} Awaiting Review
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions Panel */}
            <div className="bg-[#15161C] border border-[#222530] p-6 rounded-2xl">
              <h3 className="text-base font-bold text-white mb-4">
                Quick Governance Shortcuts
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <Button
                  onClick={() => handleTabChange("movies")}
                  className="bg-[#1E202A] hover:bg-[#282B38] text-white border border-[#2C2F3D] justify-start h-12 px-4 gap-2.5"
                >
                  <Film className="h-4 w-4 text-[#E63956]" />
                  <span>Toggle Movie Visibility</span>
                </Button>
                <Button
                  onClick={() => handleTabChange("events")}
                  className="bg-[#1E202A] hover:bg-[#282B38] text-white border border-[#2C2F3D] justify-start h-12 px-4 gap-2.5"
                >
                  <CalendarDays className="h-4 w-4 text-emerald-400" />
                  <span>Review Pending Events ({stats?.events.pending || 0})</span>
                </Button>
                <Button
                  onClick={() => handleTabChange("users")}
                  className="bg-[#1E202A] hover:bg-[#282B38] text-white border border-[#2C2F3D] justify-start h-12 px-4 gap-2.5"
                >
                  <UserX className="h-4 w-4 text-rose-400" />
                  <span>Block / Manage Users</span>
                </Button>
                <Button
                  onClick={() => handleTabChange("partners")}
                  className="bg-[#1E202A] hover:bg-[#282B38] text-white border border-[#2C2F3D] justify-start h-12 px-4 gap-2.5"
                >
                  <Building2 className="h-4 w-4 text-purple-400" />
                  <span>Approve Partners ({stats?.partners.pending || 0})</span>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 2: MOVIES CONTROL                                             */}
        {/* ================================================================= */}
        {activeTab === "movies" && (
          <div className="py-6 space-y-4">
            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#15161C] p-4 rounded-2xl border border-[#222530]">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                  value={movieSearch}
                  onChange={(e) => {
                    setMovieSearch(e.target.value);
                    setMoviePage(1);
                  }}
                  placeholder="Search movie title, language, genre..."
                  className="pl-10 bg-[#1D1E27] border-[#2C2F3D] text-white placeholder:text-gray-500 rounded-xl text-xs sm:text-sm h-10"
                />
              </div>

              {/* Status Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto">
                {["ALL", "PUBLISHED", "DRAFT", "PENDING_REVIEW"].map((st) => (
                  <button
                    key={st}
                    onClick={() => {
                      setMovieStatusFilter(st);
                      setMoviePage(1);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      movieStatusFilter === st
                        ? "bg-[#7B1E3D] text-white"
                        : "bg-[#1E202A] text-gray-400 hover:text-white"
                    }`}
                  >
                    {st === "ALL"
                      ? "All Movies"
                      : st === "PUBLISHED"
                      ? "Showing (Live)"
                      : st === "DRAFT"
                      ? "Hidden (Draft)"
                      : "Pending"}
                  </button>
                ))}
              </div>
            </div>

            {/* Movies Table / List */}
            <div className="bg-[#15161C] border border-[#222530] rounded-2xl overflow-hidden shadow-xl">
              {moviesLoading ? (
                <div className="p-16 flex flex-col items-center justify-center gap-3 text-gray-400">
                  <Loader2 className="h-8 w-8 animate-spin text-[#E63956]" />
                  <p className="text-sm">Loading movies catalog...</p>
                </div>
              ) : movies.length === 0 ? (
                <div className="p-16 text-center text-gray-400">
                  <Film className="h-10 w-10 mx-auto text-gray-600 mb-2" />
                  <p className="text-base font-semibold text-gray-300">
                    No movies found
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Try adjusting your search query or status filter
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-[#1B1D25] text-gray-400 uppercase text-[11px] tracking-wider border-b border-[#252835]">
                      <tr>
                        <th className="py-3.5 px-4">Movie</th>
                        <th className="py-3.5 px-4">Genre / Lang</th>
                        <th className="py-3.5 px-4">Duration</th>
                        <th className="py-3.5 px-4">Catalog Status</th>
                        <th className="py-3.5 px-4 text-right">Visibility Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1F222C]">
                      {movies.map((m) => {
                        const isPublished = m.status === "PUBLISHED";
                        const isUpdating = updatingMovieId === m.id;
                        return (
                          <tr
                            key={m.id}
                            className="hover:bg-[#1A1C24] transition group"
                          >
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                {m.poster_url ? (
                                  <img
                                    src={m.poster_url}
                                    alt={m.title}
                                    className="w-10 h-14 object-cover rounded-lg bg-[#252833] shrink-0 border border-[#2A2D3A]"
                                  />
                                ) : (
                                  <div className="w-10 h-14 rounded-lg bg-[#252833] flex items-center justify-center shrink-0">
                                    <Film className="h-5 w-5 text-gray-500" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="font-bold text-white text-sm truncate max-w-xs">
                                    {m.title}
                                  </p>
                                  <p className="text-xs text-gray-400">
                                    {m.certificate || "UA"} •{" "}
                                    {m.release_date
                                      ? format(parseISO(m.release_date), "dd MMM yyyy")
                                      : "Coming Soon"}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-gray-300">
                              <span className="font-medium text-white">
                                {m.language}
                              </span>
                              <p className="text-xs text-gray-400 truncate max-w-[150px]">
                                {m.genre || "Drama"}
                              </p>
                            </td>
                            <td className="py-3 px-4 text-gray-300">
                              {m.duration_min} mins
                            </td>
                            <td className="py-3 px-4">
                              <Badge
                                className={
                                  isPublished
                                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                    : "bg-amber-500/15 text-amber-400 border-amber-500/30"
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
                                    ? "bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30"
                                    : "bg-emerald-600 hover:bg-emerald-500 text-white"
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
                <div className="flex items-center justify-between px-4 py-3 border-t border-[#222530] bg-[#171821] text-xs text-gray-400">
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
                      className="h-7 px-2.5 bg-[#1F212C] border-[#2E313F] text-gray-300"
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
                      className="h-7 px-2.5 bg-[#1F212C] border-[#2E313F] text-gray-300"
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
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#15161C] p-4 rounded-2xl border border-[#222530]">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                  value={eventSearch}
                  onChange={(e) => {
                    setEventSearch(e.target.value);
                    setEventPage(1);
                  }}
                  placeholder="Search live event, city, venue..."
                  className="pl-10 bg-[#1D1E27] border-[#2C2F3D] text-white placeholder:text-gray-500 rounded-xl text-xs sm:text-sm h-10"
                />
              </div>

              {/* Status Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto">
                {[
                  { id: "ALL", label: "All Events" },
                  { id: "PENDING_APPROVAL", label: "Pending Approval" },
                  { id: "PUBLISHED", label: "Published (Live)" },
                  { id: "REJECTED", label: "Rejected" },
                  { id: "DRAFT", label: "Draft" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setEventStatusFilter(tab.id);
                      setEventPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                      eventStatusFilter === tab.id
                        ? "bg-[#7B1E3D] text-white"
                        : "bg-[#1E202A] text-gray-400 hover:text-white"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Events Cards / Table */}
            <div className="bg-[#15161C] border border-[#222530] rounded-2xl overflow-hidden shadow-xl">
              {eventsLoading ? (
                <div className="p-16 flex flex-col items-center justify-center gap-3 text-gray-400">
                  <Loader2 className="h-8 w-8 animate-spin text-[#E63956]" />
                  <p className="text-sm">Loading events...</p>
                </div>
              ) : events.length === 0 ? (
                <div className="p-16 text-center text-gray-400">
                  <CalendarDays className="h-10 w-10 mx-auto text-gray-600 mb-2" />
                  <p className="text-base font-semibold text-gray-300">
                    No events found
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Try another search term or filter
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[#1F222C]">
                  {events.map((e) => {
                    const isPending = e.status === "PENDING_APPROVAL";
                    const isLive = e.status === "PUBLISHED";
                    const isRejected = e.status === "REJECTED";
                    const isActing = actionLoadingId === e.id;

                    return (
                      <div
                        key={e.id}
                        className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-[#191B24] transition"
                      >
                        <div className="flex items-start gap-4 min-w-0 flex-1">
                          {e.poster_image_url ? (
                            <img
                              src={e.poster_image_url}
                              alt={e.title}
                              className="w-16 h-20 sm:w-20 sm:h-24 object-cover rounded-xl bg-[#252833] border border-[#2B2E3C] shrink-0"
                            />
                          ) : (
                            <div className="w-16 h-20 sm:w-20 sm:h-24 rounded-xl bg-[#252833] flex items-center justify-center shrink-0">
                              <CalendarDays className="h-6 w-6 text-gray-500" />
                            </div>
                          )}

                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-white text-base truncate">
                                {e.title}
                              </h4>
                              <Badge
                                className={
                                  isLive
                                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                    : isPending
                                    ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                                    : isRejected
                                    ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
                                    : "bg-gray-500/15 text-gray-400 border-gray-500/30"
                                }
                              >
                                {e.status}
                              </Badge>
                              <span className="text-[11px] px-2 py-0.5 rounded bg-[#252834] text-gray-300 uppercase font-semibold">
                                {e.category}
                              </span>
                            </div>

                            <p className="text-xs text-gray-400 flex items-center gap-1.5">
                              <MapPin className="h-3 w-3 text-gray-500 shrink-0" />
                              <span className="truncate">
                                {e.venue_name}, {e.city}
                              </span>
                            </p>

                            <p className="text-xs text-gray-400 flex items-center gap-1.5">
                              <Clock className="h-3 w-3 text-gray-500 shrink-0" />
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
                              <p className="text-xs text-rose-400 italic bg-rose-500/10 px-2 py-1 rounded-md border border-rose-500/20 inline-block mt-1">
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
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs h-9 gap-1"
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
                                className="border-rose-500/40 text-rose-400 hover:bg-rose-500/10 font-semibold text-xs h-9 gap-1"
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
                              className="border-amber-500/40 text-amber-400 hover:bg-amber-500/10 font-semibold text-xs h-9 gap-1.5"
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
                              className="bg-[#7B1E3D] hover:bg-[#912348] text-white font-semibold text-xs h-9 gap-1"
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
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#15161C] p-4 rounded-2xl border border-[#222530]">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                  value={userSearch}
                  onChange={(e) => {
                    setUserSearch(e.target.value);
                    setUserPage(1);
                  }}
                  placeholder="Search user by name, email, or phone..."
                  className="pl-10 bg-[#1D1E27] border-[#2C2F3D] text-white placeholder:text-gray-500 rounded-xl text-xs sm:text-sm h-10"
                />
              </div>

              {/* Role & Status Filter Pills */}
              <div className="flex items-center gap-2 overflow-x-auto">
                <div className="flex items-center gap-1">
                  {["ALL", "USER", "PARTNER", "ADMIN"].map((r) => (
                    <button
                      key={r}
                      onClick={() => {
                        setUserRoleFilter(r);
                        setUserPage(1);
                      }}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        userRoleFilter === r
                          ? "bg-[#7B1E3D] text-white"
                          : "bg-[#1E202A] text-gray-400 hover:text-white"
                      }`}
                    >
                      {r === "ALL" ? "All Roles" : r}
                    </button>
                  ))}
                </div>

                <div className="h-4 w-px bg-gray-700 mx-1" />

                <div className="flex items-center gap-1">
                  {["ALL", "ACTIVE", "BLOCKED"].map((st) => (
                    <button
                      key={st}
                      onClick={() => {
                        setUserStatusFilter(st);
                        setUserPage(1);
                      }}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        userStatusFilter === st
                          ? "bg-[#2E7D32] text-white"
                          : "bg-[#1E202A] text-gray-400 hover:text-white"
                      }`}
                    >
                      {st === "ALL" ? "All Status" : st}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-[#15161C] border border-[#222530] rounded-2xl overflow-hidden shadow-xl">
              {usersLoading ? (
                <div className="p-16 flex flex-col items-center justify-center gap-3 text-gray-400">
                  <Loader2 className="h-8 w-8 animate-spin text-[#E63956]" />
                  <p className="text-sm">Loading users...</p>
                </div>
              ) : users.length === 0 ? (
                <div className="p-16 text-center text-gray-400">
                  <Users className="h-10 w-10 mx-auto text-gray-600 mb-2" />
                  <p className="text-base font-semibold text-gray-300">
                    No users found
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Try a different search term or role filter
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-[#1B1D25] text-gray-400 uppercase text-[11px] tracking-wider border-b border-[#252835]">
                      <tr>
                        <th className="py-3.5 px-4">User</th>
                        <th className="py-3.5 px-4">Role</th>
                        <th className="py-3.5 px-4">Registered On</th>
                        <th className="py-3.5 px-4">Account Status</th>
                        <th className="py-3.5 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1F222C]">
                      {users.map((u) => {
                        const isActive = u.is_active;
                        const isActing = userActionLoadingId === u.id;
                        return (
                          <tr
                            key={u.id}
                            className="hover:bg-[#1A1C24] transition group"
                          >
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-[#7B1E3D]/30 border border-[#7B1E3D]/50 flex items-center justify-center text-xs font-bold text-[#E63956] shrink-0">
                                  {u.full_name?.charAt(0)?.toUpperCase() || "U"}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-bold text-white truncate">
                                    {u.full_name}
                                  </p>
                                  <p className="text-xs text-gray-400 truncate">
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
                                    ? "bg-purple-500/15 text-purple-300 border-purple-500/30"
                                    : u.role === "PARTNER"
                                    ? "bg-blue-500/15 text-blue-300 border-blue-500/30"
                                    : "bg-gray-500/15 text-gray-300 border-gray-500/30"
                                }
                              >
                                {u.role}
                              </Badge>
                            </td>

                            <td className="py-3 px-4 text-gray-400 text-xs">
                              {u.created_at
                                ? format(parseISO(u.created_at), "dd MMM yyyy")
                                : "N/A"}
                            </td>

                            <td className="py-3 px-4">
                              <Badge
                                className={
                                  isActive
                                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                    : "bg-rose-500/15 text-rose-400 border-rose-500/30 font-bold"
                                }
                              >
                                {isActive ? "● Active" : "✕ Blocked"}
                              </Badge>
                            </td>

                            <td className="py-3 px-4 text-right">
                              {u.role === "ADMIN" ? (
                                <span className="text-xs text-gray-500 italic pr-2">
                                  Protected Admin
                                </span>
                              ) : isActive ? (
                                <Button
                                  onClick={() => setUserToBlock(u)}
                                  disabled={isActing}
                                  size="sm"
                                  variant="destructive"
                                  className="h-8 text-xs font-semibold bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/40 gap-1.5"
                                >
                                  <UserX className="h-3.5 w-3.5" />
                                  <span>Block User</span>
                                </Button>
                              ) : (
                                <Button
                                  onClick={() => handleToggleUserBlock(u, true)}
                                  disabled={isActing}
                                  size="sm"
                                  className="h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5"
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
            <div className="flex items-center justify-between gap-3 bg-[#15161C] p-4 rounded-2xl border border-[#222530]">
              <div>
                <h3 className="font-bold text-white text-base">
                  Partner Applications & Approvals
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
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
                        ? "bg-[#7B1E3D] text-white"
                        : "bg-[#1E202A] text-gray-400 hover:text-white"
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

            <div className="bg-[#15161C] border border-[#222530] rounded-2xl overflow-hidden shadow-xl">
              {partnersLoading ? (
                <div className="p-16 flex flex-col items-center justify-center gap-3 text-gray-400">
                  <Loader2 className="h-8 w-8 animate-spin text-[#E63956]" />
                  <p className="text-sm">Loading partner applications...</p>
                </div>
              ) : partners.length === 0 ? (
                <div className="p-16 text-center text-gray-400">
                  <Building2 className="h-10 w-10 mx-auto text-gray-600 mb-2" />
                  <p className="text-base font-semibold text-gray-300">
                    No partner applications found
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[#1F222C]">
                  {partners.map((p) => {
                    const isPending = p.status === "PENDING_APPROVAL";
                    const isApproved = p.status === "APPROVED";
                    const isActing = partnerActionLoadingId === p.id;

                    return (
                      <div
                        key={p.id}
                        className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-[#191B24] transition"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-white text-base">
                              {p.business_name}
                            </h4>
                            <Badge
                              className={
                                isApproved
                                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                  : isPending
                                  ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                                  : "bg-rose-500/15 text-rose-400 border-rose-500/30"
                              }
                            >
                              {p.status}
                            </Badge>
                            <span className="text-xs px-2 py-0.5 rounded bg-[#252834] text-gray-300">
                              {p.partner_type}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400">
                            Contact: <span className="text-white">{p.contact_name}</span>{" "}
                            • Phone: <span className="text-white">{p.contact_phone}</span>{" "}
                            • City: <span className="text-white">{p.city}</span>
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {isPending && (
                            <>
                              <Button
                                onClick={() => handleApprovePartner(p.id)}
                                disabled={isActing}
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs h-9 gap-1"
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
                                className="border-rose-500/40 text-rose-400 hover:bg-rose-500/10 font-semibold text-xs h-9 gap-1"
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
        <DialogContent className="bg-[#181920] border-[#2C2F3D] text-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white">
              Reject Event Application
            </DialogTitle>
            <DialogDescription className="text-gray-400 text-xs">
              Provide feedback for why &quot;{rejectingEvent?.title}&quot; is
              being rejected. This will be shared with the partner organizer.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-2">
            <Label className="text-xs text-gray-300 font-medium">
              Rejection Reason / Guidance
            </Label>
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Organizer permissions missing, venue license required, or pricing error..."
              rows={4}
              className="bg-[#121318] border-[#2C2F3D] text-white placeholder:text-gray-600 text-xs rounded-xl"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setRejectingEvent(null)}
              className="bg-transparent border-[#2C2F3D] text-gray-300"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectEventConfirm}
              className="bg-rose-600 hover:bg-rose-500 text-white font-semibold"
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
        <AlertDialogContent className="bg-[#181920] border-[#2C2F3D] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-rose-400 font-bold">
              <AlertTriangle className="h-5 w-5 text-rose-400" />
              <span>Block User Account?</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400 text-xs leading-relaxed">
              Are you sure you want to block &quot;{userToBlock?.full_name}&quot; (
              {userToBlock?.email})?
              <br />
              <br />
              <strong className="text-gray-200">Effects:</strong>
              <ul className="list-disc list-inside mt-1 space-y-0.5 text-gray-400">
                <li>All active login sessions and refresh tokens will be immediately revoked.</li>
                <li>The user will be denied login access until an admin unblocks them.</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#242632] border-[#313444] text-gray-300 hover:bg-[#2C2F3E]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => userToBlock && handleToggleUserBlock(userToBlock, false)}
              className="bg-rose-600 hover:bg-rose-500 text-white font-semibold"
            >
              Block Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

