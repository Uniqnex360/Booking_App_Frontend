import React, { useState, useEffect, useRef } from "react";
import { Link, NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  getTheatreProfile,
  getTheatreNotifications,
  TheatrePartnerProfile,
  TheatreNotificationItem,
} from "@/api/theatre.api";
import {
  LayoutDashboard,
  Building2,
  Calendar,
  Ticket,
  FileText,
  AlertTriangle,
  LogOut,
  Film,
  QrCode,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Loader2,
  Menu,
  X,
  Bell,
  Info,
  RotateCcw,
} from "lucide-react";

export function TheatreLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<TheatrePartnerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<TheatreNotificationItem[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const seenNotifIdsRef = useRef<Set<string>>(new Set());
  const isFirstLoadRef = useRef(true);
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [location.pathname]);

  // Initial Profile Load
  useEffect(() => {
    async function load() {
      try {
        const pData = await getTheatreProfile();
        setProfile(pData);
      } catch (err: any) {
        console.warn("Failed to load theatre partner profile", err);
        const status = err?.statusCode ?? err?.response?.status;
        if (status === 401 || status === 403) {
          toast.error("Access denied. Theatre Partner account required.");
          navigate("/", { replace: true });
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [navigate]);

  // Real-time Live Notifications Polling & Delta Alert (Spec Section 12)
  const syncNotifications = async (isManual = false) => {
    try {
      if (isManual) setIsSyncing(true);
      const nData = await getTheatreNotifications();
      const freshList = nData || [];

      // Check for newly arrived notifications (not present in first load)
      if (!isFirstLoadRef.current) {
        freshList.forEach((item) => {
          if (!seenNotifIdsRef.current.has(item.id)) {
            // Brand new alert received without page refresh!
            if (item.severity === "CRITICAL") {
              toast.error(item.title, {
                description: item.message,
                action: item.link ? { label: "View", onClick: () => navigate(item.link!) } : undefined,
                duration: 6000,
              });
            } else if (item.severity === "WARNING") {
              toast.warning(item.title, {
                description: item.message,
                action: item.link ? { label: "Review", onClick: () => navigate(item.link!) } : undefined,
                duration: 5000,
              });
            } else {
              toast.info(item.title, {
                description: item.message,
                action: item.link ? { label: "Open", onClick: () => navigate(item.link!) } : undefined,
                duration: 4000,
              });
            }
          }
        });
      }

      // Record seen IDs
      const newIdSet = new Set<string>();
      freshList.forEach((n) => newIdSet.add(n.id));
      seenNotifIdsRef.current = newIdSet;
      isFirstLoadRef.current = false;

      setNotifications(freshList);
    } catch (err) {
      // quiet polling error
    } finally {
      if (isManual) setIsSyncing(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    syncNotifications();

    // Auto-poll every 12 seconds in the background
    const intervalId = setInterval(() => {
      syncNotifications();
    }, 12000);

    // Sync immediately when tab regains focus
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        syncNotifications();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const isBoxOffice = profile?.access_level === "BOX_OFFICE";

  const allNavItems = [
    { to: "/theatre/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/theatre/validate", label: "Gate QR Validator", icon: QrCode },
    { to: "/theatre/bookings", label: "Customer Bookings", icon: Ticket },
    { to: "/theatre/showtimes", label: "Showtimes Schedule", icon: Calendar },
    { to: "/theatre/venues", label: "My Venues & Screens", icon: Building2 },
    { to: "/theatre/invoices", label: "Invoices & Settlement", icon: FileText, hideForBoxOffice: true },
    { to: "/theatre/exceptions", label: "Audit & Exceptions", icon: AlertTriangle, hideForBoxOffice: true },
  ];

  const navItems = allNavItems.filter((item) => !(isBoxOffice && item.hideForBoxOffice));

  const brandName = profile?.chain?.name || (profile?.venues?.[0]?.name ? profile.venues[0].name : "Cinema Partner");

  return (
    <div className="h-screen w-full bg-slate-50 flex flex-col font-sans overflow-hidden">
      {/* Top Header */}
      <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between shrink-0 z-40 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 -ml-1 text-slate-600 hover:text-slate-900 md:hidden rounded-lg hover:bg-slate-100 transition cursor-pointer"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link to="/theatre/dashboard" className="flex items-center gap-2.5">
            <img
              src="/logo.png"
              alt="Vyhbz"
              className="h-10 sm:h-12 w-auto object-contain hover:scale-105 transition-transform shrink-0"
            />
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#7B1E3D]/10 text-[#7B1E3D] uppercase tracking-wider shrink-0 hidden xs:inline-block">
              {profile?.access_level === "BOX_OFFICE" ? "Box Office Gate" : "Theatre Admin"}
            </span>
          </Link>

          {profile?.chain && (
            <div className="hidden sm:flex items-center gap-2 pl-4 border-l border-slate-200">
              <span className="text-xs font-semibold text-slate-500">Partner Brand:</span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-900 font-bold text-xs">
                {profile.chain.name}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          {/* Real-time Alerts Bell (Spec Section 12) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer"
              title="Operational & Invoice Notifications"
            >
              <Bell className="w-4 h-4" />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#7B1E3D] text-white text-[10px] font-bold flex items-center justify-center">
                  {notifications.length}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="p-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-[#7B1E3D]" />
                    <span className="text-xs font-bold text-slate-900">Notifications & Alerts</span>
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                      Live
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isSyncing}
                      onClick={() => syncNotifications(true)}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-200/60 transition cursor-pointer"
                      title="Sync alerts now"
                    >
                      <RotateCcw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-[#7B1E3D]" : ""}`} />
                    </button>
                    <span className="text-[11px] font-semibold text-slate-500">
                      {notifications.length} active
                    </span>
                  </div>
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 text-xs">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-xs">No active alerts.</div>
                  ) : (
                    notifications.map((n) => (
                      <Link
                        key={n.id}
                        to={n.link || "#"}
                        onClick={() => setNotifOpen(false)}
                        className="p-3.5 block hover:bg-slate-50/80 transition"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span
                            className={`font-bold ${
                              n.severity === "CRITICAL"
                                ? "text-rose-600"
                                : n.severity === "WARNING"
                                ? "text-amber-700"
                                : "text-slate-900"
                            }`}
                          >
                            {n.title}
                          </span>
                          <span className="text-[10px] text-slate-400 shrink-0">
                            {new Date(n.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                          {n.message}
                        </p>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <Link
            to="/movies"
            className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg font-medium transition"
            title="Browse Movies on Customer Storefront"
          >
            <Film className="w-3.5 h-3.5 text-[#7B1E3D]" />
            <span className="hidden sm:inline">Customer Storefront</span>
            <span className="sm:hidden">Storefront</span>
          </Link>

          <div className="h-5 w-px bg-slate-200 hidden md:block" />

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-slate-900">{user?.full_name || "Theatre Manager"}</div>
              <div className="text-[11px] text-slate-500">{user?.email}</div>
            </div>

            <button
              onClick={async () => {
                await signOut();
                navigate("/login");
              }}
              title="Sign Out"
              className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile Backdrop */}
        {mobileMenuOpen && (
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 top-16 bg-slate-900/40 backdrop-blur-xs z-30 md:hidden animate-in fade-in duration-200"
          />
        )}

        {/* Sidebar (Fixed Desktop & Drawer Mobile) */}
        <aside
          className={`w-64 bg-white border-r border-slate-200 p-4 flex flex-col justify-between shrink-0 h-full overflow-y-auto z-40 transition-transform duration-200 ease-in-out md:translate-x-0 md:static ${
            mobileMenuOpen
              ? "fixed top-16 bottom-0 left-0 translate-x-0 shadow-2xl"
              : "fixed top-16 bottom-0 left-0 -translate-x-full md:flex"
          }`}
        >
          <div className="space-y-6">
            {/* Scoped Brand Card */}
            <div className="p-3.5 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-sm">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Assigned Tenancy
              </div>
              <div className="font-bold text-sm text-white mt-1 truncate">
                {brandName}
              </div>
              <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-300">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  {profile?.venues_count ?? 0} Cinema {profile?.venues_count === 1 ? "Multiplex" : "Multiplexes"}
                </span>
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? "bg-[#7B1E3D] text-white shadow-sm"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <div className="flex items-center gap-2.5">
                          <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                          <span>{item.label}</span>
                        </div>
                        {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/70" />}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </nav>

            {/* Direct Switch to Customer Storefront */}
            <div className="pt-2 border-t border-slate-100">
              <Link
                to="/movies"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 hover:text-slate-900 border border-slate-200 transition"
              >
                <div className="flex items-center gap-2.5">
                  <Film className="w-4 h-4 text-[#7B1E3D]" />
                  <span>Customer Storefront</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </Link>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-400">
            <div>Vyhbz Theatre Admin Portal</div>
            <div className="text-[10px] text-slate-400">v2.4 • Isolated Brand Workspace</div>
          </div>
        </aside>

        {/* Content Body - Independent Scroll Container */}
        <main ref={mainRef} className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto h-full scroll-smooth">
          {loading ? (
            <div className="py-24 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-[#7B1E3D]" />
            </div>
          ) : (
            <Outlet context={{ profile }} />
          )}
        </main>
      </div>
    </div>
  );
}

