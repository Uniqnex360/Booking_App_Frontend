import React, { useState, useEffect, useRef } from "react";
import { Link, NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { getTheatreProfile, TheatrePartnerProfile } from "@/api/theatre.api";
import {
  LayoutDashboard,
  Building2,
  Calendar,
  Ticket,
  FileText,
  AlertTriangle,
  LogOut,
  Film,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Loader2,
  Menu,
  X,
} from "lucide-react";

export function TheatreLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<TheatrePartnerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [location.pathname]);

  useEffect(() => {
    async function load() {
      try {
        const data = await getTheatreProfile();
        setProfile(data);
      } catch (err) {
        console.warn("Failed to load theatre partner profile", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const navItems = [
    { to: "/theatre/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/theatre/venues", label: "My Venues & Screens", icon: Building2 },
    { to: "/theatre/showtimes", label: "Showtimes Schedule", icon: Calendar },
    { to: "/theatre/bookings", label: "Customer Bookings", icon: Ticket },
    { to: "/theatre/invoices", label: "Invoices & Settlement", icon: FileText },
    { to: "/theatre/exceptions", label: "Audit & Exceptions", icon: AlertTriangle },
  ];

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

          <Link to="/theatre/dashboard" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#7B1E3D] text-white flex items-center justify-center font-bold shadow-sm">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <span className="font-serif font-black text-slate-900 tracking-tight text-lg">
                VYHBZ
              </span>
              <span className="ml-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#7B1E3D]/10 text-[#7B1E3D] uppercase tracking-wider">
                Partner Portal
              </span>
            </div>
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

        <div className="flex items-center gap-4">
          <Link
            to="/"
            target="_blank"
            rel="noreferrer"
            className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition"
          >
            <span>Customer Storefront</span>
            <ExternalLink className="w-3.5 h-3.5" />
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
          </div>

          <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-400">
            <div>Vyhbz Theatre Operating Portal</div>
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

