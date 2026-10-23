import { useState, useEffect } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { Home, Film, Calendar, Search, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { withCity } from "@/lib/cityLink";
import { getStoredCity } from "@/utils/geolocation";
import { GlobalSearchModal } from "@/components/common/GlobalSearchModal";

export function MobileBottomNav() {
  const { user } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const city = searchParams.get("city") || getStoredCity() || "Kochi";
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    const handleOpenSearch = () => setIsSearchOpen(true);
    window.addEventListener("open-global-search", handleOpenSearch);
    return () => window.removeEventListener("open-global-search", handleOpenSearch);
  }, []);

  const pathname = location.pathname;

  // Don't render on dedicated immersive booking flows or dedicated backend portals
  if (
    pathname.includes("/seat-map") ||
    pathname.startsWith("/food/") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/theatre") ||
    pathname.startsWith("/partner/dashboard") ||
    pathname.startsWith("/buytickets") ||
    pathname.startsWith("/confirmation") ||
    /^\/movies\/[^/]+/.test(pathname) ||
    /^\/events\/[^/]+/.test(pathname)
  ) {
    return null;
  }

  const isHome = !isSearchOpen && (pathname === "/" || pathname === "/home");
  const isMovies = !isSearchOpen && pathname.startsWith("/movies");
  const isEvents = !isSearchOpen && pathname.startsWith("/events");
  const isDashboard = !isSearchOpen && (pathname.startsWith("/theatre") || pathname.startsWith("/partner") || pathname.startsWith("/admin"));

  const navItems: Array<{
    label: string;
    icon: any;
    href?: string;
    isActive: boolean;
    isAction?: boolean;
    onClick?: () => void;
  }> = [
    {
      label: "Home",
      icon: Home,
      href: "/",
      isActive: isHome,
    },
    {
      label: "Movies",
      icon: Film,
      href: "/movies",
      isActive: isMovies,
    },
    {
      label: "Live Events",
      icon: Calendar,
      href: "/events",
      isActive: isEvents,
    },
    {
      label: "Search",
      icon: Search,
      isAction: true,
      onClick: () => setIsSearchOpen(true),
      isActive: isSearchOpen,
    },
  ];

  if (user?.role === "THEATRE_PARTNER") {
    navItems.push({
      label: "Dashboard",
      icon: LayoutDashboard,
      href: "/theatre/dashboard",
      isActive: isDashboard,
    });
  } else if (user?.role === "PARTNER") {
    navItems.push({
      label: "Dashboard",
      icon: LayoutDashboard,
      href: "/partner/dashboard",
      isActive: isDashboard,
    });
  } else if (user?.role === "ADMIN" || user?.role === "SUPER_ADMIN") {
    navItems.push({
      label: "Admin",
      icon: LayoutDashboard,
      href: "/admin",
      isActive: isDashboard,
    });
  }

  return (
    <>
      <nav
        aria-label="Mobile Bottom Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] pb-[env(safe-area-inset-bottom,0px)]"
      >
        <div className="flex items-center justify-around h-14 sm:h-16 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;

            if (item.isAction) {
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={item.onClick}
                  className={`flex flex-col items-center justify-center flex-1 h-full py-1 transition-colors select-none cursor-pointer ${
                    item.isActive
                      ? "text-[#7B1E3D] font-bold"
                      : "text-gray-500 hover:text-gray-800 font-medium"
                  }`}
                >
                  <div className="relative">
                    <Icon
                      size={20}
                      strokeWidth={item.isActive ? 2.5 : 1.8}
                      className={`transition-transform duration-150 ${
                        item.isActive ? "scale-110" : "scale-100"
                      }`}
                    />
                  </div>
                  <span
                    className={`text-[10px] sm:text-xs mt-1 transition-all ${
                      item.isActive ? "font-bold text-[#7B1E3D]" : "font-medium text-gray-500"
                    }`}
                  >
                    {item.label}
                  </span>
                </button>
              );
            }

            const dest =
              item.href?.startsWith("/theatre") ||
              item.href?.startsWith("/partner") ||
              item.href?.startsWith("/admin")
                ? item.href
                : withCity(item.href || "/", city);

            return (
              <Link
                key={item.label}
                to={dest}
                onClick={() => {
                  window.scrollTo({ top: 0, left: 0, behavior: "instant" });
                  document.documentElement.scrollTop = 0;
                  document.body.scrollTop = 0;
                }}
                className={`flex flex-col items-center justify-center flex-1 h-full py-1 transition-colors select-none ${
                  item.isActive
                    ? "text-[#7B1E3D] font-bold"
                    : "text-gray-500 hover:text-gray-800 font-medium"
                }`}
              >
                <div className="relative">
                  <Icon
                    size={20}
                    strokeWidth={item.isActive ? 2.5 : 1.8}
                    className={`transition-transform duration-150 ${
                      item.isActive ? "scale-110" : "scale-100"
                    }`}
                  />
                </div>
                <span
                  className={`text-[10px] sm:text-xs mt-1 transition-all ${
                    item.isActive ? "font-bold text-[#7B1E3D]" : "font-medium text-gray-500"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        city={city}
      />
    </>
  );
}

