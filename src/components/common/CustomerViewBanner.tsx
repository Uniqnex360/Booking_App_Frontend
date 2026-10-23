import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { LayoutDashboard, ArrowRight, Eye } from "lucide-react";

export function CustomerViewBanner() {
  const { user } = useAuth();
  const location = useLocation();
  const pathname = location.pathname;

  // Don't show inside dedicated partner or admin portals
  if (
    !user ||
    (user.role !== "THEATRE_PARTNER" && user.role !== "PARTNER") ||
    pathname.startsWith("/theatre") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/partner/dashboard")
  ) {
    return null;
  }

  const isTheatre = user.role === "THEATRE_PARTNER";
  const dashboardUrl = isTheatre ? "/theatre/dashboard" : "/partner/dashboard";
  const label = isTheatre ? "Theatre Partner Dashboard" : "Partner Dashboard";

  return (
    <div className="fixed bottom-16 sm:bottom-5 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300 pointer-events-auto">
      <div className="bg-slate-900/95 backdrop-blur-md text-white border border-slate-700/80 shadow-[0_4px_20px_rgba(0,0,0,0.3)] rounded-full px-4 py-2 flex items-center gap-2.5 sm:gap-3 text-xs select-none">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-bold text-emerald-400 flex items-center gap-1">
            <Eye className="w-3.5 h-3.5 inline" />
            <span>Viewing as User</span>
          </span>
        </div>

        <div className="h-3.5 w-px bg-slate-700 shrink-0" />

        <Link
          to={dashboardUrl}
          className="flex items-center gap-1 font-bold text-amber-400 hover:text-amber-300 active:scale-95 transition shrink-0"
          title={`Return to ${label}`}
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Exit to {isTheatre ? "Theatre Portal" : "Dashboard"}</span>
          <span className="sm:hidden">Dashboard</span>
          <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
        </Link>
      </div>
    </div>
  );
}

