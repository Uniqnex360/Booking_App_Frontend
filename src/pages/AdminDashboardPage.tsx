import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { INDIAN_STATES, STATE_CITIES, ALL_SUPPORTED_CITIES } from "@/utils/indiaGeography";
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
  getMyAdminPermissions,
  getAdminSections,
  getAdminUsersWithPermissions,
  AdminStats,
  AdminMovieItem,
  AdminUserItem,
  AdminComprehensiveStats,
  IntegrationHealthItem,
  AdminSectionItem,
  AdminUserPermissions,
  MyAdminPermissionsResponse,
} from "@/api/admin.api";
import { TheatresManagementTab } from "./admin/TheatresManagementTab";
import { BookingsReconciliationTab } from "./admin/BookingsReconciliationTab";
import { CommissionInvoicesTab } from "./admin/CommissionInvoicesTab";
import { ReconciliationExceptionsTab } from "./admin/ReconciliationExceptionsTab";
import { IntegrationsGatewaysTab } from "./admin/IntegrationsGatewaysTab";
import { AdminMovieDistributionModal } from "./admin/AdminMovieDistributionModal";
import { AdminEventDetailModal } from "./admin/AdminEventDetailModal";
import { AdminPartnerDetailModal } from "./admin/AdminPartnerDetailModal";
import EventCategoriesTab from "./admin/EventCategoriesTab";
import DiningModerationTab from "./admin/DiningModerationTab";
import { getActiveEventCategories } from "@/api/event.api";
import { EventCategoryRecord } from "@/types/event.types";
import { AdminCreateModal } from "./admin/AdminCreateModal";
import { AdminPermissionsModal } from "./admin/AdminPermissionsModal";
import { AdminSearchBar } from "@/components/admin/AdminSearchBar";
import { useDebounce } from "@/hooks/useDebounce";
import { getPartnerTypeMeta } from "@/lib/partnerTypeMeta";
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
  UserPlus,
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
  Tags,
  Utensils,
  Filter,
  RotateCcw,
} from "lucide-react";

type ActiveTab =
  | "overview"
  | "theatres"
  | "bookings_rec"
  | "invoices"
  | "exceptions"
  | "movies"
  | "events"
  | "dining"
  | "event_categories"
  | "users"
  | "partners"
  | "integrations";

export default function AdminDashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get("tab") as ActiveTab) || "overview";
  const [activeTab, setActiveTab] = useState<ActiveTab>(initialTab);

  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  // Sync tab from URL if changed externally
  useEffect(() => {
    const tabFromUrl = searchParams.get("tab") as ActiveTab;
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
  }, [searchParams]);

  // -------------------------------------------------------------------------
  // RBAC & SECTION ACCESS STATE
  // -------------------------------------------------------------------------
  const [myPermissions, setMyPermissions] = useState<MyAdminPermissionsResponse | null>(null);
  const [rbacSections, setRbacSections] = useState<AdminSectionItem[]>([]);
  const [rbacPresets, setRbacPresets] = useState<Record<string, string[]>>({});
  const [adminUsersMap, setAdminUsersMap] = useState<Record<string, AdminUserPermissions>>({});
  const [isCreateAdminOpen, setIsCreateAdminOpen] = useState(false);
  const [permissionModalAdmin, setPermissionModalAdmin] = useState<AdminUserPermissions | null>(null);

  const fetchRbacData = useCallback(async () => {
    try {
      const [permRes, secRes, adminRes] = await Promise.allSettled([
        getMyAdminPermissions(),
        getAdminSections(),
        getAdminUsersWithPermissions(),
      ]);
      if (permRes.status === "fulfilled") {
        setMyPermissions(permRes.value);
      }
      if (secRes.status === "fulfilled") {
        setRbacSections(secRes.value.sections || []);
        setRbacPresets(secRes.value.presets || {});
      }
      if (adminRes.status === "fulfilled") {
        const map: Record<string, AdminUserPermissions> = {};
        (adminRes.value.admins || []).forEach((adm) => {
          map[adm.id] = adm;
        });
        setAdminUsersMap(map);
      }
    } catch (e) {
      console.error("Error loading RBAC permissions:", e);
    }
  }, []);

  useEffect(() => {
    fetchRbacData();
  }, [fetchRbacData]);

  // Tab protection: if logged in as section-restricted admin and visiting restricted tab, redirect
  useEffect(() => {
    if (!myPermissions) return;
    if (myPermissions.is_super_admin) return;
    const allowed = myPermissions.allowed_sections || [];
    if (allowed.length > 0 && !allowed.includes(activeTab)) {
      handleTabChange(allowed[0] as ActiveTab);
    }
  }, [myPermissions, activeTab]);

  const canAccessSection = (sectionKey: string): boolean => {
    if (!myPermissions || myPermissions.is_super_admin) return true;
    return (myPermissions.allowed_sections || []).includes(sectionKey);
  };

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
  const [movieStateFilter, setMovieStateFilter] = useState("ALL");
  const [movieCityFilter, setMovieCityFilter] = useState("ALL");
  const [movieDateFilter, setMovieDateFilter] = useState("");
  const [selectedMovieForDistribution, setSelectedMovieForDistribution] = useState<AdminMovieItem | null>(null);
  const [moviePage, setMoviePage] = useState(1);
  const [moviePagination, setMoviePagination] = useState<any>(null);
  const [updatingMovieId, setUpdatingMovieId] = useState<string | null>(null);
  const [movieFacets, setMovieFacets] = useState<{
    languages: { name: string; count: number }[];
    genres: { name: string; count: number }[];
    statuses: Record<string, number>;
  } | null>(null);

  const availableMovieCities = useMemo(() => {
    if (movieStateFilter && movieStateFilter !== "ALL") {
      return STATE_CITIES[movieStateFilter] || [];
    }
    return ALL_SUPPORTED_CITIES;
  }, [movieStateFilter]);

  const fetchMovies = useCallback(async () => {
    setMoviesLoading(true);
    try {
      const res = await getAdminMovies({
        search: debouncedMovieSearch.trim() || undefined,
        status: movieStatusFilter !== "ALL" ? movieStatusFilter : undefined,
        language: movieLanguageFilter !== "ALL" ? movieLanguageFilter : undefined,
        genre: movieGenreFilter !== "ALL" ? movieGenreFilter : undefined,
        state: movieStateFilter !== "ALL" ? movieStateFilter : undefined,
        city: movieCityFilter !== "ALL" ? movieCityFilter : undefined,
        date: movieDateFilter || undefined,
        page: moviePage,
        limit: 15,
      });
      setMovies(res.movies || []);
      setMoviePagination(res.pagination || null);
      if (res.facets) {
        setMovieFacets(res.facets);
      }
    } catch {
      toast.error("Failed to load movies");
    } finally {
      setMoviesLoading(false);
    }
  }, [debouncedMovieSearch, movieStatusFilter, movieLanguageFilter, movieGenreFilter, movieStateFilter, movieCityFilter, movieDateFilter, moviePage]);

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
  // Event management & CONTROL STATE
  // -------------------------------------------------------------------------
  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventSearch, setEventSearch] = useState("");
  const debouncedEventSearch = useDebounce(eventSearch, 300);
  const [eventStatusFilter, setEventStatusFilter] = useState("ALL");
  const [eventCategoryFilter, setEventCategoryFilter] = useState("ALL");
  const [eventPartnerFilter, setEventPartnerFilter] = useState("ALL");
  const [approvedEventPartners, setApprovedEventPartners] = useState<Partner[]>([]);
  const [dynamicCategories, setDynamicCategories] = useState<EventCategoryRecord[]>([]);
  const [eventStateFilter, setEventStateFilter] = useState("ALL");
  const [eventCityFilter, setEventCityFilter] = useState("ALL");
  const [selectedEventForDetails, setSelectedEventForDetails] = useState<EventItem | null>(null);
  const [eventPage, setEventPage] = useState(1);
  const [eventPagination, setEventPagination] = useState<any>(null);
  const [rejectingEvent, setRejectingEvent] = useState<EventItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  useEffect(() => {
    getActiveEventCategories()
      .then((cats) => {
        if (cats && cats.length > 0) {
          setDynamicCategories(cats);
        }
      })
      .catch((err) => console.error("Failed to load active event categories:", err));

    getAdminPartners({ status: "APPROVED", partner_type: "events", limit: 100 })
      .then((res: any) => {
        setApprovedEventPartners(res.partners || res.data || []);
      })
      .catch((err) => console.error("Failed to load approved event partners:", err));
  }, []);

  const availableEventCities = useMemo(() => {
    if (eventStateFilter !== "ALL" && STATE_CITIES[eventStateFilter]) {
      return STATE_CITIES[eventStateFilter];
    }
    return ALL_SUPPORTED_CITIES;
  }, [eventStateFilter]);

  const fetchEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const res = await getAdminEvents({
        search: debouncedEventSearch.trim() || undefined,
        status: eventStatusFilter !== "ALL" ? eventStatusFilter : undefined,
        city: eventCityFilter !== "ALL" ? eventCityFilter : undefined,
        state: eventStateFilter !== "ALL" ? eventStateFilter : undefined,
        category: eventCategoryFilter !== "ALL" ? eventCategoryFilter : undefined,
        partner_id: eventPartnerFilter !== "ALL" ? eventPartnerFilter : undefined,
        exclude_dining: true,
        page: eventPage,
        limit: 15,
      });
      let items = (res.events || []).filter((ev: any) => ev.category?.toLowerCase() !== "dining");
      if (eventCategoryFilter !== "ALL") {
        items = items.filter((ev: any) =>
          ev.category?.toLowerCase() === eventCategoryFilter.toLowerCase()
        );
      }
      if (eventCityFilter !== "ALL") {
        items = items.filter((ev: any) =>
          ev.city?.toLowerCase().includes(eventCityFilter.toLowerCase())
        );
      }
      setEvents(items);
      setEventPagination(res.pagination || null);
    } catch {
      toast.error("Failed to load events");
    } finally {
      setEventsLoading(false);
    }
  }, [
    debouncedEventSearch,
    eventStatusFilter,
    eventCategoryFilter,
    eventPartnerFilter,
    eventStateFilter,
    eventCityFilter,
    eventPage,
  ]);

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
  const [partnerTypeFilter, setPartnerTypeFilter] = useState("ALL");
  const [partnerSearch, setPartnerSearch] = useState("");
  const debouncedPartnerSearch = useDebounce(partnerSearch, 300);
  const [partnerPage, setPartnerPage] = useState(1);
  const [partnerPagination, setPartnerPagination] = useState<any>(null);
  const [partnerActionLoadingId, setPartnerActionLoadingId] = useState<
    string | null
  >(null);
  const [selectedPartnerIdForDetails, setSelectedPartnerIdForDetails] = useState<string | null>(null);

  const fetchPartners = useCallback(async () => {
    setPartnersLoading(true);
    try {
      const res = await getAdminPartners({
        status: partnerStatusFilter !== "ALL" ? partnerStatusFilter : undefined,
        partner_type: partnerTypeFilter !== "ALL" ? partnerTypeFilter : undefined,
        search: debouncedPartnerSearch.trim() || undefined,
        page: partnerPage,
        limit: 10,
      });
      const raw: any = res;
      setPartners(raw.partners || raw.data || []);
      setPartnerPagination(raw.pagination || raw.meta || null);
    } catch {
      toast.error("Failed to load partners");
    } finally {
      setPartnersLoading(false);
    }
  }, [partnerStatusFilter, partnerTypeFilter, debouncedPartnerSearch, partnerPage]);

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
      <Header hideLocation />

      <main className="mx-auto max-w-7xl px-4 pt-32 sm:pt-36 lg:pt-44 pb-16 sm:px-6 lg:px-8">
        {/* TOP TITLE BAR */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-200">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-orange-100 text-orange-600 border border-orange-200">
                <ShieldCheck className="h-6 w-6" />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">
                    Admin Control Center
                  </h1>
                  {myPermissions && (
                    <Badge
                      className={`text-xs px-2.5 py-0.5 rounded-lg border font-semibold flex items-center gap-1.5 ${
                        myPermissions.is_super_admin
                          ? "bg-amber-100 text-amber-900 border-amber-300 shadow-2xs"
                          : "bg-emerald-100 text-emerald-900 border-emerald-300 shadow-2xs"
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-orange-600" />
                      {myPermissions.is_super_admin
                        ? "Super Admin (Full Access)"
                        : `${myPermissions.role} (${myPermissions.allowed_sections?.length || 0} Sections Active)`}
                    </Badge>
                  )}
                </div>
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
                fetchRbacData();
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
            {
              id: "dining",
              label: "Dining & Restaurants",
              icon: Utensils,
              badge: stats?.dining?.pending ? `${stats.dining.pending} pending` : undefined,
              count: stats?.dining?.total,
            },
            {
              id: "event_categories",
              label: "Event Categories",
              icon: Tags,
              count: dynamicCategories.length > 0 ? dynamicCategories.length : undefined,
            },
            { id: "users", label: "User Management & RBAC", icon: Users, count: stats?.users.total },
            {
              id: "partners",
              label: "Partner Requests",
              icon: Building2,
              badge: stats?.partners.pending ? `${stats.partners.pending} new` : undefined,
            },
            {
              id: "integrations",
              label: "Integrations & Gateways",
              icon: Activity,
              count: healthItems.length,
            },
          ]
            .filter((tab) => {
              if (!myPermissions || myPermissions.is_super_admin) return true;
              return (myPermissions.allowed_sections || []).includes(tab.id);
            })
            .map((tab) => {
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
                <div className="flex items-center gap-2 flex-wrap">
                  {canAccessSection("bookings_rec") && (
                    <Button
                      onClick={() => handleTabChange("bookings_rec")}
                      variant="outline"
                      size="sm"
                      className="bg-white border-gray-200 text-xs text-gray-700 hover:text-gray-900 hover:bg-gray-50 shadow-2xs"
                    >
                      Audit Bookings
                    </Button>
                  )}
                  {canAccessSection("theatres") && (
                    <Button
                      onClick={() => handleTabChange("theatres")}
                      variant="outline"
                      size="sm"
                      className="bg-white border-gray-200 text-xs text-gray-700 hover:text-gray-900 hover:bg-gray-50 shadow-2xs"
                    >
                      Configure Theatres
                    </Button>
                  )}
                  {canAccessSection("invoices") && (
                    <Button
                      onClick={() => handleTabChange("invoices")}
                      variant="outline"
                      size="sm"
                      className="bg-white border-gray-200 text-xs text-gray-700 hover:text-gray-900 hover:bg-gray-50 shadow-2xs"
                    >
                      View Invoices
                    </Button>
                  )}
                </div>
              </div>

              {(canAccessSection("bookings_rec") || canAccessSection("invoices")) && (
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
              )}

              {/* Integration Gateway Health */}
              {canAccessSection("integrations") && healthItems.length > 0 && (
                <div className="pt-3 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-semibold text-gray-500 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-emerald-600" /> Integration & Settlement Gateways
                    </div>
                    <button
                      onClick={() => handleTabChange("integrations")}
                      className="text-xs font-medium text-orange-600 hover:text-orange-700 flex items-center gap-1 transition cursor-pointer"
                    >
                      <span>Manage All ({healthItems.length}) &rarr;</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {healthItems.slice(0, 3).map((h, i) => (
                      <div
                        key={i}
                        onClick={() => handleTabChange("integrations")}
                        className="flex items-center justify-between bg-gray-50 hover:bg-orange-50/50 hover:border-orange-200 transition cursor-pointer px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="font-semibold text-gray-900 truncate max-w-[150px]">{h.provider}</span>
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

            {/* Stat Cards Grid - Section Adaptive */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {/* Movies Stat */}
              {canAccessSection("movies") && (
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
              )}

              {/* Events Stat */}
              {canAccessSection("events") && (
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
              )}

              {/* Dining & Restaurants Stat */}
              {canAccessSection("dining") && (
                <div
                  onClick={() => handleTabChange("dining")}
                  className="bg-white border border-gray-200 p-5 rounded-2xl cursor-pointer hover:border-amber-400 shadow-2xs transition group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider">
                      Dining & Restaurants
                    </span>
                    <div className="p-2.5 rounded-xl bg-amber-100 text-amber-700 group-hover:scale-110 transition">
                      <Utensils className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-3xl font-extrabold text-gray-900">
                      {stats?.dining?.total ?? 0}
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-xs">
                      <span className="text-emerald-600 font-medium">
                        {stats?.dining?.published ?? 0} Live
                      </span>
                      <span className="text-gray-400">•</span>
                      <span className="text-amber-600 font-medium">
                        {stats?.dining?.pending ?? 0} Pending
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Users Stat */}
              {canAccessSection("users") && (
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
              )}

              {/* Partners Stat */}
              {canAccessSection("partners") && (
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
              )}
            </div>

            {/* Quick Actions Panel - Section Adaptive */}
            <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-2xs">
              <h3 className="text-base font-bold text-gray-900 mb-4">
                Quick Governance Shortcuts
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {canAccessSection("movies") && (
                  <Button
                    onClick={() => handleTabChange("movies")}
                    className="bg-gray-50 hover:bg-gray-100 text-gray-800 border border-gray-200 justify-start h-12 px-4 gap-2.5 shadow-2xs"
                  >
                    <Film className="h-4 w-4 text-orange-600" />
                    <span>Toggle Movie Visibility</span>
                  </Button>
                )}
                {canAccessSection("events") && (
                  <Button
                    onClick={() => handleTabChange("events")}
                    className="bg-gray-50 hover:bg-gray-100 text-gray-800 border border-gray-200 justify-start h-12 px-4 gap-2.5 shadow-2xs"
                  >
                    <CalendarDays className="h-4 w-4 text-emerald-600" />
                    <span>Review Pending Events ({stats?.events.pending || 0})</span>
                  </Button>
                )}
                {canAccessSection("users") && (
                  <Button
                    onClick={() => handleTabChange("users")}
                    className="bg-gray-50 hover:bg-gray-100 text-gray-800 border border-gray-200 justify-start h-12 px-4 gap-2.5 shadow-2xs"
                  >
                    <UserX className="h-4 w-4 text-rose-600" />
                    <span>Block / Manage Users</span>
                  </Button>
                )}
                {canAccessSection("partners") && (
                  <Button
                    onClick={() => handleTabChange("partners")}
                    className="bg-gray-50 hover:bg-gray-100 text-gray-800 border border-gray-200 justify-start h-12 px-4 gap-2.5 shadow-2xs"
                  >
                    <Building2 className="h-4 w-4 text-purple-600" />
                    <span>Approve Partners ({stats?.partners.pending || 0})</span>
                  </Button>
                )}
                {canAccessSection("theatres") && (
                  <Button
                    onClick={() => handleTabChange("theatres")}
                    className="bg-gray-50 hover:bg-gray-100 text-gray-800 border border-gray-200 justify-start h-12 px-4 gap-2.5 shadow-2xs"
                  >
                    <Building2 className="h-4 w-4 text-blue-600" />
                    <span>Configure Theatres</span>
                  </Button>
                )}
                {canAccessSection("invoices") && (
                  <Button
                    onClick={() => handleTabChange("invoices")}
                    className="bg-gray-50 hover:bg-gray-100 text-gray-800 border border-gray-200 justify-start h-12 px-4 gap-2.5 shadow-2xs"
                  >
                    <IndianRupee className="h-4 w-4 text-emerald-600" />
                    <span>Commission Invoices</span>
                  </Button>
                )}
                {canAccessSection("exceptions") && (
                  <Button
                    onClick={() => handleTabChange("exceptions")}
                    className="bg-gray-50 hover:bg-gray-100 text-gray-800 border border-gray-200 justify-start h-12 px-4 gap-2.5 shadow-2xs"
                  >
                    <Activity className="h-4 w-4 text-rose-600" />
                    <span>Exceptions & Disputes</span>
                  </Button>
                )}
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
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-2xs space-y-4">
              {/* ROW 1: 🔍 SEARCH & QUICK STATUS PILLS */}
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                <div className="flex-1 min-w-[280px]">
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
                    className="w-full"
                  />
                </div>

                {/* Status Filter Pills */}
                <div className="flex items-center gap-1 bg-gray-50/90 p-1 rounded-xl border border-gray-200 shadow-2xs self-start lg:self-auto shrink-0 overflow-x-auto max-w-full">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-2 hidden sm:inline">
                    Status:
                  </span>
                  {["ALL", "PUBLISHED", "DRAFT", "PENDING_REVIEW"].map((st) => {
                    const count = movieFacets?.statuses?.[st];
                    const label =
                      st === "ALL"
                        ? "All Status"
                        : st === "PUBLISHED"
                        ? "Showing"
                        : st === "DRAFT"
                        ? "Hidden"
                        : "Pending";
                    return (
                      <button
                        key={st}
                        onClick={() => {
                          setMovieStatusFilter(st);
                          setMoviePage(1);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                          movieStatusFilter === st
                            ? "bg-orange-600 text-white shadow-2xs font-bold"
                            : "text-gray-600 hover:text-gray-900 hover:bg-gray-200/50"
                        }`}
                      >
                        <span>{label}</span>
                        {count !== undefined && (
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                              movieStatusFilter === st
                                ? "bg-white/20 text-white"
                                : "bg-gray-200/80 text-gray-600"
                            }`}
                          >
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ROW 2: 🌐 LANGUAGE, 🎭 GENRE, 📍 LOCATION & 📅 DATE SECONDARY FILTERS */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-gray-100">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Language Filter */}
                  <select
                    value={movieLanguageFilter}
                    onChange={(e) => {
                      setMovieLanguageFilter(e.target.value);
                      setMoviePage(1);
                    }}
                    className="h-9 rounded-xl border border-gray-200 px-3 bg-gray-50/80 hover:bg-white focus:bg-white text-xs font-semibold text-gray-700 cursor-pointer transition shadow-2xs"
                  >
                    <option value="ALL">
                      All Languages {movieFacets ? `(${movieFacets.statuses.ALL || 0})` : ""}
                    </option>
                    {movieFacets?.languages.map((l) => (
                      <option key={l.name} value={l.name}>
                        {l.name} ({l.count})
                      </option>
                    ))}
                  </select>

                  {/* Genre Filter */}
                  <select
                    value={movieGenreFilter}
                    onChange={(e) => {
                      setMovieGenreFilter(e.target.value);
                      setMoviePage(1);
                    }}
                    className="h-9 rounded-xl border border-gray-200 px-3 bg-gray-50/80 hover:bg-white focus:bg-white text-xs font-semibold text-gray-700 cursor-pointer transition shadow-2xs"
                  >
                    <option value="ALL">
                      All Genres {movieFacets ? `(${movieFacets.statuses.ALL || 0})` : ""}
                    </option>
                    {movieFacets?.genres.map((g) => (
                      <option key={g.name} value={g.name}>
                        {g.name} ({g.count})
                      </option>
                    ))}
                  </select>

                  {/* Location State Filter */}
                  <select
                    value={movieStateFilter}
                    onChange={(e) => {
                      const newState = e.target.value;
                      setMovieStateFilter(newState);
                      if (newState !== "ALL") {
                        const stateCities = STATE_CITIES[newState] || [];
                        if (!stateCities.includes(movieCityFilter)) {
                          setMovieCityFilter("ALL");
                        }
                      }
                      setMoviePage(1);
                    }}
                    className="h-9 rounded-xl border border-gray-200 px-3 bg-gray-50/80 hover:bg-white focus:bg-white text-xs font-semibold text-gray-700 cursor-pointer transition shadow-2xs"
                  >
                    <option value="ALL">All States</option>
                    {INDIAN_STATES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>

                  {/* Location City Filter */}
                  <select
                    value={movieCityFilter}
                    onChange={(e) => {
                      setMovieCityFilter(e.target.value);
                      setMoviePage(1);
                    }}
                    className="h-9 rounded-xl border border-gray-200 px-3 bg-gray-50/80 hover:bg-white focus:bg-white text-xs font-semibold text-gray-700 cursor-pointer transition shadow-2xs"
                  >
                    <option value="ALL">
                      {movieStateFilter !== "ALL" ? `All Cities in ${movieStateFilter}` : "All Cities"}
                    </option>
                    {availableMovieCities.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>

                  {/* Date Filter */}
                  <input
                    type="date"
                    value={movieDateFilter}
                    onChange={(e) => {
                      setMovieDateFilter(e.target.value);
                      setMoviePage(1);
                    }}
                    className="h-9 rounded-xl border border-gray-200 px-3 bg-gray-50/80 hover:bg-white focus:bg-white text-xs font-semibold text-gray-700 cursor-pointer transition shadow-2xs"
                    title="Filter movies screening on date"
                  />
                </div>

                {(movieSearch.trim() !== "" ||
                  movieStatusFilter !== "ALL" ||
                  movieLanguageFilter !== "ALL" ||
                  movieGenreFilter !== "ALL" ||
                  movieStateFilter !== "ALL" ||
                  movieCityFilter !== "ALL" ||
                  movieDateFilter !== "") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setMovieSearch("");
                      setMovieStatusFilter("ALL");
                      setMovieLanguageFilter("ALL");
                      setMovieGenreFilter("ALL");
                      setMovieStateFilter("ALL");
                      setMovieCityFilter("ALL");
                      setMovieDateFilter("");
                      setMoviePage(1);
                    }}
                    className="h-9 px-3 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 gap-1.5 rounded-xl cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset Filters
                  </Button>
                )}
              </div>

              {/* ROW 3: FILTER SUMMARY */}
              <div className="flex items-center justify-between text-xs text-gray-500 pt-1 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-gray-400" />
                  <span>
                    Showing <strong className="text-gray-900">{movies.length}</strong> movies
                    {moviePagination?.total !== undefined ? ` (Total: ${moviePagination.total})` : ""}
                  </span>
                  {(movieStateFilter !== "ALL" || movieCityFilter !== "ALL") && (
                    <span className="inline-flex items-center gap-1 bg-orange-50 border border-orange-200 text-orange-800 text-[11px] font-semibold px-2 py-0.5 rounded-full">
                      <MapPin className="w-3 h-3 text-orange-600" />
                      {movieStateFilter !== "ALL" ? movieStateFilter : "All States"}
                      {movieCityFilter !== "ALL" ? ` • ${movieCityFilter}` : ""}
                    </span>
                  )}
                  {movieDateFilter && (
                    <span className="text-gray-400"> on {movieDateFilter}</span>
                  )}
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
                        <th className="py-3.5 px-4">Theatres Released</th>
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
                            <td className="py-3 px-4">
                              {m.theatres_count !== undefined && m.theatres_count > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => setSelectedMovieForDistribution(m)}
                                  className="text-left group/theatres hover:opacity-85 transition cursor-pointer"
                                  title="Click to view all theatres, screens & showtimes"
                                >
                                  <div className="flex items-center gap-1.5">
                                    <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                    <span className="font-bold text-gray-900 group-hover/theatres:text-indigo-600 transition text-xs sm:text-sm">
                                      {m.theatres_count} {m.theatres_count === 1 ? 'Theatre' : 'Theatres'}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1">
                                    <span>{m.screens_count || 1} screens</span>
                                    <span>&bull;</span>
                                    <span>{m.states_count !== undefined && m.states_count > 0 ? `${m.states_count} ${m.states_count === 1 ? 'state' : 'states'}` : '1 state'}</span>
                                    <span>&bull;</span>
                                    <span>{m.cities_count || 1} {m.cities_count === 1 ? 'city' : 'cities'}</span>
                                  </div>
                                  {m.cities && m.cities.length > 0 && (
                                    <div className="text-[10px] text-gray-400 truncate max-w-[170px] mt-0.5">
                                      {m.cities.slice(0, 3).join(', ')}{m.cities.length > 3 ? ` +${m.cities.length - 3}` : ''}
                                    </div>
                                  )}
                                </button>
                              ) : (
                                <div>
                                  <span className="text-[11px] font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md inline-block">
                                    Not Released
                                  </span>
                                  <p className="text-[10px] text-gray-400 mt-0.5">
                                    0 active theatres
                                  </p>
                                </div>
                              )}
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
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  onClick={() => setSelectedMovieForDistribution(m)}
                                  size="sm"
                                  variant="outline"
                                  className="text-xs h-8 font-semibold gap-1.5 bg-white border-gray-200 text-gray-700 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-200 shadow-2xs"
                                  title="Inspect showtimes, screens, divisions & languages"
                                >
                                  <Clock className="h-3.5 w-3.5 text-orange-600" />
                                  <span>Showtimes</span>
                                </Button>
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
                              </div>
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

            {/* MOVIE DISTRIBUTION & SHOWTIME INSPECTOR MODAL */}
            {selectedMovieForDistribution && (
              <AdminMovieDistributionModal
                movie={selectedMovieForDistribution}
                onClose={() => setSelectedMovieForDistribution(null)}
              />
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 3: Event management & CONTROL                                */}
        {/* ================================================================= */}
        {activeTab === "events" && (
          <div className="py-6 space-y-4">
            {/* Filter & Search Bar */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-2xs space-y-4">
              {/* ROW 1: 🔍 SEARCH & QUICK STATUS PILLS */}
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                <div className="flex-1 min-w-[280px]">
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
                    className="w-full"
                  />
                </div>

                {/* Status Filter Pills */}
                <div className="flex items-center gap-1 bg-gray-50/90 p-1 rounded-xl border border-gray-200 shadow-2xs self-start lg:self-auto shrink-0 overflow-x-auto max-w-full">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-2 hidden sm:inline">
                    Status:
                  </span>
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
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                        eventStatusFilter === tab.id
                          ? "bg-orange-600 text-white shadow-2xs font-bold"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-200/50"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ROW 2: 🏷️ CATEGORY, 📍 LOCATION & 🏢 ORGANIZER SECONDARY FILTERS */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-gray-100">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Category Filter */}
                  <select
                    value={eventCategoryFilter}
                    onChange={(e) => {
                      setEventCategoryFilter(e.target.value);
                      setEventPage(1);
                    }}
                    className="h-9 rounded-xl border border-gray-200 px-3 bg-gray-50/80 hover:bg-white focus:bg-white text-xs font-semibold text-gray-700 cursor-pointer transition shadow-2xs"
                  >
                    <option value="ALL">All Categories</option>
                    {dynamicCategories.length > 0 ? (
                      dynamicCategories.map((cat) => (
                        <option key={cat.id} value={cat.slug}>
                          {cat.name}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="concert">Concert</option>
                        <option value="comedy">Comedy</option>
                        <option value="workshop">Workshop</option>
                        <option value="sports">Sports</option>
                        <option value="theatre">Theatre</option>
                        <option value="exhibition">Exhibition</option>
                      </>
                    )}
                  </select>

                  <button
                    type="button"
                    onClick={() => handleTabChange("event_categories")}
                    className="h-9 flex items-center gap-1.5 px-3 rounded-xl border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-semibold cursor-pointer transition shadow-2xs"
                    title="Open Super Admin Event Categories CRUD"
                  >
                    <Tags className="h-3.5 w-3.5 text-orange-600" />
                    <span>Manage Categories</span>
                  </button>

                  {/* Location State Filter */}
                  <select
                    value={eventStateFilter}
                    onChange={(e) => {
                      setEventStateFilter(e.target.value);
                      setEventCityFilter("ALL");
                      setEventPage(1);
                    }}
                    className="h-9 rounded-xl border border-gray-200 px-3 bg-gray-50/80 hover:bg-white focus:bg-white text-xs font-semibold text-gray-700 cursor-pointer transition shadow-2xs"
                  >
                    <option value="ALL">All States (India)</option>
                    {INDIAN_STATES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>

                  {/* Location City Filter */}
                  <select
                    value={eventCityFilter}
                    onChange={(e) => {
                      setEventCityFilter(e.target.value);
                      setEventPage(1);
                    }}
                    className="h-9 rounded-xl border border-gray-200 px-3 bg-gray-50/80 hover:bg-white focus:bg-white text-xs font-semibold text-gray-700 cursor-pointer transition shadow-2xs"
                  >
                    <option value="ALL">
                      {eventStateFilter !== "ALL" ? `All Cities in ${eventStateFilter}` : "All Cities"}
                    </option>
                    {availableEventCities.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>

                  {/* Partner-Wise Event Organizer Filter */}
                  <select
                    value={eventPartnerFilter}
                    onChange={(e) => {
                      setEventPartnerFilter(e.target.value);
                      setEventPage(1);
                    }}
                    className="h-9 rounded-xl border border-gray-200 px-3 bg-gray-50/80 hover:bg-white focus:bg-white text-xs font-semibold text-gray-700 cursor-pointer transition shadow-2xs max-w-[220px] truncate"
                  >
                    <option value="ALL">All Event Organizers</option>
                    {approvedEventPartners.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.business_name} ({p.city})
                      </option>
                    ))}
                  </select>
                </div>

                {(eventSearch.trim() !== "" ||
                  eventStatusFilter !== "ALL" ||
                  eventCategoryFilter !== "ALL" ||
                  eventPartnerFilter !== "ALL" ||
                  eventStateFilter !== "ALL" ||
                  eventCityFilter !== "ALL") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEventSearch("");
                      setEventStatusFilter("ALL");
                      setEventCategoryFilter("ALL");
                      setEventPartnerFilter("ALL");
                      setEventStateFilter("ALL");
                      setEventCityFilter("ALL");
                      setEventPage(1);
                    }}
                    className="h-9 px-3 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 gap-1.5 rounded-xl cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset Filters
                  </Button>
                )}
              </div>

              {/* ROW 3: FILTER SUMMARY & STATUS */}
              <div className="flex items-center justify-between text-xs text-gray-500 pt-1 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-gray-400" />
                  <span>
                    Showing <strong className="text-gray-900">{events.length}</strong> events
                    {eventPagination?.total !== undefined ? ` (Total: ${eventPagination.total})` : ""}
                  </span>
                  {(eventStateFilter !== "ALL" || eventCityFilter !== "ALL") && (
                    <span className="inline-flex items-center gap-1 bg-orange-50 border border-orange-200 text-orange-800 text-[11px] font-semibold px-2 py-0.5 rounded-full">
                      <MapPin className="w-3 h-3 text-orange-600" />
                      {eventStateFilter !== "ALL" ? eventStateFilter : "All States"}
                      {eventCityFilter !== "ALL" ? ` • ${eventCityFilter}` : ""}
                    </span>
                  )}
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
                          <Button
                            onClick={() => setSelectedEventForDetails(e)}
                            size="sm"
                            variant="outline"
                            className="border-gray-300 text-gray-700 hover:bg-gray-100 font-semibold text-xs h-9 gap-1.5 shadow-2xs rounded-xl"
                            title="Inspect event details, tickets, and location"
                          >
                            <Eye className="h-3.5 w-3.5 text-orange-600" />
                            <span>Details</span>
                          </Button>

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
        {/* TAB: DINING & RESTAURANTS MODERATION                              */}
        {/* ================================================================= */}
        {activeTab === "dining" && (
          <DiningModerationTab />
        )}

        {/* ================================================================= */}
        {/* TAB: EVENT CATEGORIES GOVERNANCE (SUPER ADMIN CRUD)               */}
        {/* ================================================================= */}
        {activeTab === "event_categories" && (
          <div className="py-6">
            <EventCategoriesTab
              onCategoryCountChange={() => {
                getActiveEventCategories()
                  .then((cats) => {
                    if (cats) setDynamicCategories(cats);
                  })
                  .catch(() => {});
              }}
            />
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 4: USER MANAGEMENT & RBAC                                     */}
        {/* ================================================================= */}
        {activeTab === "users" && (
          <div className="py-6 space-y-4">
            {/* RBAC Governance Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-2xs">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Users className="w-5 h-5 text-orange-600" />
                  <h3 className="text-base font-bold text-gray-900">
                    User Accounts & Access Management (RBAC)
                  </h3>
                  <Badge className="bg-orange-100 text-orange-800 border-orange-200 text-xs">
                    Section-wise Access
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Super Admin decides section-level checkbox permissions (Finance, Operations, Support, Exceptions) for all admin team members.
                </p>
              </div>

              {myPermissions?.is_super_admin && (
                <Button
                  onClick={() => setIsCreateAdminOpen(true)}
                  size="sm"
                  className="bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-xl h-9 sm:h-10 px-4 gap-2 shadow-sm shadow-orange-600/30 cursor-pointer self-start sm:self-auto shrink-0"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>+ Create Admin User</span>
                </Button>
              )}
            </div>

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
                  className="flex-1 min-w-[280px]"
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
                  <Filter className="w-3.5 h-3.5 text-gray-400" />
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
                        const isAdminAccount = [
                          "ADMIN",
                          "SUPER_ADMIN",
                          "FINANCE_ADMIN",
                          "OPERATIONS_ADMIN",
                          "SUPPORT_ADMIN",
                        ].includes(u.role);
                        const adminData = adminUsersMap[u.id];

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
                              <div className="flex flex-col gap-1 items-start">
                                <Badge
                                  variant="outline"
                                  className={
                                    u.role === "SUPER_ADMIN"
                                      ? "bg-purple-100 text-purple-800 border-purple-300 font-bold"
                                      : u.role === "FINANCE_ADMIN"
                                      ? "bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold"
                                      : u.role === "OPERATIONS_ADMIN"
                                      ? "bg-blue-100 text-blue-800 border-blue-300 font-semibold"
                                      : u.role === "SUPPORT_ADMIN"
                                      ? "bg-indigo-100 text-indigo-800 border-indigo-300 font-semibold"
                                      : u.role === "ADMIN"
                                      ? "bg-purple-50 text-purple-700 border-purple-200 font-medium"
                                      : u.role === "PARTNER"
                                      ? "bg-amber-50 text-amber-800 border-amber-200 font-medium"
                                      : "bg-gray-100 text-gray-700 border-gray-200"
                                  }
                                >
                                  {u.role}
                                </Badge>

                                {isAdminAccount && (
                                  <span className="text-[11px] text-gray-600 font-medium flex items-center gap-1">
                                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                    {u.role === "SUPER_ADMIN" || adminData?.is_super_admin
                                      ? "All 10 Sections"
                                      : `${adminData?.assigned_sections?.length ?? 0} Sections Active`}
                                  </span>
                                )}
                              </div>
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
                              <div className="flex items-center justify-end gap-2">
                                {myPermissions?.is_super_admin && isAdminAccount && (
                                  <Button
                                    onClick={() => {
                                      const adm = adminData || {
                                        id: u.id,
                                        full_name: u.full_name,
                                        email: u.email,
                                        phone: u.phone,
                                        role: u.role,
                                        is_super_admin: u.role === "SUPER_ADMIN" || u.email === "admin@vybhz.com",
                                        is_active: u.is_active,
                                        is_verified: u.is_verified,
                                        created_at: u.created_at || null,
                                        assigned_sections: [],
                                      };
                                      setPermissionModalAdmin(adm);
                                    }}
                                    size="sm"
                                    variant="outline"
                                    className="h-8 text-xs font-semibold border-orange-200 bg-orange-50/50 text-orange-800 hover:bg-orange-100 gap-1.5 rounded-xl cursor-pointer"
                                  >
                                    <ShieldCheck className="w-3.5 h-3.5 text-orange-600" />
                                    <span>Edit Access</span>
                                  </Button>
                                )}

                                {u.role === "SUPER_ADMIN" || u.email === "admin@vybhz.com" ? (
                                  <span className="text-xs text-gray-400 italic pr-2">
                                    Root Super Admin
                                  </span>
                                ) : isActive ? (
                                  <Button
                                    onClick={() => setUserToBlock(u)}
                                    disabled={isActing}
                                    size="sm"
                                    variant="destructive"
                                    className="h-8 text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 gap-1.5 shadow-2xs rounded-xl"
                                  >
                                    <UserX className="h-3.5 w-3.5" />
                                    <span>Block</span>
                                  </Button>
                                ) : (
                                  <Button
                                    onClick={() => handleToggleUserBlock(u, true)}
                                    disabled={isActing}
                                    size="sm"
                                    className="h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-2xs rounded-xl"
                                  >
                                    {isActing ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <UserCheck className="h-3.5 w-3.5" />
                                    )}
                                    <span>Unblock</span>
                                  </Button>
                                )}
                              </div>
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
            {/* Header & Quick Intro */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-2xs">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-orange-100 text-orange-600 border border-orange-200">
                    <Building2 className="h-4 w-4" />
                  </span>
                  <h3 className="font-bold text-gray-900 text-base">
                    Partner Applications & Verification
                  </h3>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Manage commercial onboarding across Theatres & Cinemas, Live Events, and Dining & Restaurants
                </p>
              </div>

              {/* Status Filter Buttons */}
              <div className="flex items-center gap-1.5 bg-gray-50/80 p-1 rounded-xl border border-gray-200">
                {["ALL", "PENDING_APPROVAL", "APPROVED", "REJECTED"].map((st) => (
                  <button
                    key={st}
                    onClick={() => {
                      setPartnerStatusFilter(st);
                      setPartnerPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      partnerStatusFilter === st
                        ? "bg-orange-600 text-white shadow-2xs"
                        : "text-gray-600 hover:text-gray-900"
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

            {/* Vertical Filter Pills & Search */}
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { id: "ALL", label: "All Verticals", icon: Users },
                  { id: "theatre", label: "Theatres & Cinemas", icon: Film },
                  { id: "events", label: "Live Events & Shows", icon: CalendarDays },
                  { id: "dining", label: "Dining & Restaurants", icon: Utensils },
                ].map((vert) => {
                  const Icon = vert.icon;
                  const isSelected = partnerTypeFilter === vert.id;
                  return (
                    <button
                      key={vert.id}
                      onClick={() => {
                        setPartnerTypeFilter(vert.id);
                        setPartnerPage(1);
                      }}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                        isSelected
                          ? "bg-orange-600 text-white shadow-xs"
                          : "bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                      }`}
                    >
                      <Icon className={`h-3.5 w-3.5 ${isSelected ? "text-white" : "text-gray-500"}`} />
                      <span>{vert.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Search Bar */}
              <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    value={partnerSearch}
                    onChange={(e) => {
                      setPartnerSearch(e.target.value);
                      setPartnerPage(1);
                    }}
                    placeholder="Search partner by business name, contact person, city, or phone..."
                    className="pl-9 h-10 rounded-xl bg-gray-50/50 border-gray-200 text-xs text-gray-900 placeholder:text-gray-400"
                  />
                  {partnerSearch && (
                    <button
                      onClick={() => {
                        setPartnerSearch("");
                        setPartnerPage(1);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {(partnerSearch || partnerTypeFilter !== "ALL" || partnerStatusFilter !== "ALL") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setPartnerSearch("");
                      setPartnerTypeFilter("ALL");
                      setPartnerStatusFilter("ALL");
                      setPartnerPage(1);
                    }}
                    className="h-10 px-3 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 gap-1 rounded-xl"
                  >
                    <X className="w-3.5 h-3.5" />
                    Reset Filters
                  </Button>
                )}
              </div>
            </div>

            {/* Partners List */}
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
                  <p className="text-xs text-gray-400 mt-1">
                    Try another search term or vertical filter
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {partners.map((p) => {
                    const isPending = p.status === "PENDING_APPROVAL";
                    const isApproved = p.status === "APPROVED";
                    const isActing = partnerActionLoadingId === p.id;
                    const meta = getPartnerTypeMeta(p.partner_type);
                    const TypeIcon = meta.icon;

                    return (
                      <div
                        key={p.id}
                        className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-gray-50 transition"
                      >
                        <div className="space-y-1.5 min-w-0">
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
                            <span
                              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-semibold border ${
                                meta.badgeClass || "bg-gray-100 text-gray-700 border-gray-200"
                              }`}
                            >
                              <TypeIcon className="h-3 w-3" />
                              {meta.label}
                            </span>
                          </div>

                          <p className="text-xs text-gray-500">
                            Contact: <span className="text-gray-900 font-medium">{p.contact_name}</span>{" "}
                            • Phone: <span className="text-gray-900 font-medium">{p.contact_phone}</span>{" "}
                            • City: <span className="text-gray-900 font-medium">{p.city}</span>
                          </p>

                          {(p.gst_certificate_url || p.pan_card_url || p.gst_number || p.pan_number) && (
                            <div className="flex items-center gap-2 text-[11px] pt-0.5">
                              {p.gst_number && (
                                <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200 font-mono">
                                  GST: {p.gst_number}
                                </span>
                              )}
                              {p.pan_number && (
                                <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200 font-mono">
                                  PAN: {p.pan_number}
                                </span>
                              )}
                              {p.gst_certificate_url && (
                                <span className="text-emerald-700 font-medium">✓ GST Doc Uploaded</span>
                              )}
                              {p.pan_card_url && (
                                <span className="text-emerald-700 font-medium">✓ PAN Card Uploaded</span>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            onClick={() => setSelectedPartnerIdForDetails(p.id)}
                            size="sm"
                            variant="outline"
                            className="border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold text-xs h-9 gap-1.5 shadow-2xs cursor-pointer"
                          >
                            <FileText className="h-3.5 w-3.5 text-orange-600" />
                            <span>Details & Statement</span>
                          </Button>

                          {isPending && (
                            <>
                              <Button
                                onClick={() => handleApprovePartner(p.id)}
                                disabled={isActing}
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 gap-1 shadow-2xs cursor-pointer"
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
                                className="border-rose-200 text-rose-700 hover:bg-rose-50 font-semibold text-xs h-9 gap-1 shadow-2xs cursor-pointer"
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

              {/* Pagination */}
              {partnerPagination && partnerPagination.total_pages > 1 && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/50 text-xs text-gray-600">
                  <span>
                    Page {partnerPage} of {partnerPagination.total_pages} ({partnerPagination.total} partners)
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={partnerPage <= 1}
                      onClick={() => setPartnerPage((p) => Math.max(1, p - 1))}
                      className="h-8 px-2 text-xs"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      Prev
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={partnerPage >= partnerPagination.total_pages}
                      onClick={() => setPartnerPage((p) => p + 1)}
                      className="h-8 px-2 text-xs"
                    >
                      Next
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB: DYNAMIC INTEGRATION & SETTLEMENT GATEWAYS                    */}
        {/* ================================================================= */}
        {activeTab === "integrations" && (
          <div className="py-6">
            <IntegrationsGatewaysTab onNavigateTab={handleTabChange} />
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

      {/* RBAC MODALS */}
      <AdminCreateModal
        isOpen={isCreateAdminOpen}
        onClose={() => setIsCreateAdminOpen(false)}
        onCreated={() => {
          fetchUsers();
          fetchRbacData();
        }}
        sections={rbacSections}
        presets={rbacPresets}
      />

      <AdminPermissionsModal
        isOpen={!!permissionModalAdmin}
        onClose={() => setPermissionModalAdmin(null)}
        onUpdated={() => {
          fetchUsers();
          fetchRbacData();
        }}
        adminUser={permissionModalAdmin}
        sections={rbacSections}
        presets={rbacPresets}
      />

      {/* Event Details Inspection Modal */}
      <AdminEventDetailModal
        event={selectedEventForDetails}
        open={!!selectedEventForDetails}
        onOpenChange={(op) => !op && setSelectedEventForDetails(null)}
        onApprove={handleApproveEvent}
        onReject={(ev) => {
          setSelectedEventForDetails(null);
          setRejectingEvent(ev);
        }}
        onToggleDelist={handleToggleEventDelist}
        isActionLoading={!!actionLoadingId}
      />

      {/* Partner Details, Bank Account & Account Statement Modal */}
      <AdminPartnerDetailModal
        partnerId={selectedPartnerIdForDetails}
        isOpen={!!selectedPartnerIdForDetails}
        onClose={() => setSelectedPartnerIdForDetails(null)}
        onPartnerUpdated={fetchPartners}
      />
    </div>
  );
}

