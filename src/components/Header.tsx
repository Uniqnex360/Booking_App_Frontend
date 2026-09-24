import { useState, useEffect, useRef } from "react";
import {
  Link,
  useNavigate,
  useLocation,
  useSearchParams,
} from "react-router-dom";
import { withCity } from "@/lib/cityLink";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { api, unwrap } from "@/api/client";
import {
  Menu,
  MonitorPlay,
  User,
  LogOut,
  Calendar,
  LayoutDashboard,
  ShieldCheck,
  Users,
  Sparkles,
  X,
  Search,
  ChevronDown,
  Film,
  Music,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { detectCity, SUPPORTED_CITIES } from "@/utils/geolocation";

const CITY_STORAGE_KEY = "vyhbz_selected_city";

const navLinks = [
  { href: "/movies", label: "Movies" },
  { href: "/events", label: "Events" },
  { href: "/restaurants", label: "Dining" },
];

interface SearchResults {
  movies: any[];
  events: any[];
  restaurants: any[];
}

function getStoredCity(): string | null {
  try {
    return localStorage.getItem(CITY_STORAGE_KEY);
  } catch {
    return null;
  }
}

function storeCity(city: string) {
  try {
    localStorage.setItem(CITY_STORAGE_KEY, city);
  } catch {}
}

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const cityFromUrl = searchParams.get("city");
  const city = cityFromUrl || getStoredCity() || "Kochi";

  const setCity = (next: string) => {
    storeCity(next);
    const p = new URLSearchParams(searchParams);
    p.set("city", next);
    setSearchParams(p, { replace: true });
  };

  useEffect(() => {
    if (cityFromUrl) {
      storeCity(cityFromUrl);
      return;
    }

    const stored = getStoredCity();
    if (stored) {
      const p = new URLSearchParams(searchParams);
      p.set("city", stored);
      setSearchParams(p, { replace: true });
      return;
    }

    detectCity().then((c) => {
      if (!c) return;
      if (
        !getStoredCity() &&
        !new URLSearchParams(window.location.search).get("city")
      ) {
        storeCity(c);
        const p = new URLSearchParams(window.location.search);
        p.set("city", c);
        setSearchParams(p, { replace: true });
      }
    });
  }, []);

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [results, setResults] = useState<SearchResults>({
    movies: [],
    events: [],
    restaurants: [],
  });
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setShowDropdown(false);
    setMobileSearchOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q.length < 2) {
      setResults({ movies: [], events: [], restaurants: [] });
      setShowDropdown(false);
      return;
    }

    setShowDropdown(true);
    setIsSearching(true);

    const timer = setTimeout(async () => {
      try {
        const today = new Date().toISOString().split("T")[0];
        const [moviesRes, eventsRes] = await Promise.all([
          unwrap<any[]>(
            api.get("/movies", { params: { city, date: today } }),
          ).catch(() => []),
          unwrap<any>(api.get("/events")).catch(() => []),
        ]);

        const rawEvents = Array.isArray(eventsRes)
          ? eventsRes
          : eventsRes.items || [];

        const filteredMovies = moviesRes
          .filter(
            (m: any) =>
              m.title.toLowerCase().includes(q) ||
              (m.language && m.language.toLowerCase().includes(q)),
          )
          .slice(0, 4);

        const filteredEvents = rawEvents
          .filter(
            (e: any) =>
              e.title.toLowerCase().includes(q) ||
              (e.category && e.category.toLowerCase().includes(q)),
          )
          .slice(0, 4);

        setResults({
          movies: filteredMovies,
          events: filteredEvents,
          restaurants: [],
        });
      } catch (err) {
        console.error("Global search error", err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, city]);

  const hasResults =
    results.movies.length > 0 ||
    results.events.length > 0 ||
    results.restaurants.length > 0;

  const initials = (user?.full_name || user?.email || "U")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm transition-all duration-300">
      <div className="mx-auto flex max-w-[1240px] items-center gap-4 sm:gap-6 px-4 h-16">
        <Link to={withCity('/', city)} className="flex items-center shrink-0">
  <img 
    src="/logo.png" 
    alt="Vyhbz" 
    className="h-10 sm:h-12 w-auto object-contain rounded-lg hover:scale-105 transition-transform"
  />
</Link>

        <div
          className="relative hidden md:flex flex-1 max-w-[600px] ml-4"
          ref={dropdownRef}
        >
          <div className="flex w-full items-center bg-gray-50 focus-within:bg-white border border-gray-200 focus-within:border-[#7B1E3D]/50 rounded-md transition shadow-inner shadow-gray-100/50">
            <Search className="h-4 w-4 text-gray-400 ml-3 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() =>
                searchQuery.trim().length >= 2 && setShowDropdown(true)
              }
              placeholder="Search for Movies, Events, Plays, Sports and Activities"
              className="flex-1 bg-transparent px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none"
            />
            {isSearching ? (
              <Loader2 className="h-4 w-4 text-gray-400 mr-3 animate-spin" />
            ) : searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>

          {showDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50 max-h-[480px] overflow-y-auto">
              {!isSearching && !hasResults ? (
                <div className="p-6 text-center text-gray-500 text-sm">
                  No matches found for &quot;
                  <span className="font-semibold">{searchQuery}</span>&quot;
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {results.movies.length > 0 && (
                    <div className="p-2">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider px-2 mb-1.5">
                        <Film className="h-3 w-3" /> Movies
                      </div>
                      <div className="space-y-0.5">
                        {results.movies.map((m) => (
                          <Link
                            key={m.id}
                            to={withCity(`/movies/${m.id}`, city)}
                            onClick={() => setShowDropdown(false)}
                            className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-md transition group"
                          >
                            <div className="h-10 w-7 bg-gray-200 rounded overflow-hidden shrink-0">
                              {m.poster_url && (
                                <img
                                  src={m.poster_url}
                                  alt={m.title}
                                  className="w-full h-full object-cover"
                                />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-900 truncate group-hover:text-[#7B1E3D]">
                                {m.title}
                              </p>
                              <p className="text-[11px] text-gray-500 truncate">
                                {m.language} • {m.certificate}
                              </p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {results.events.length > 0 && (
                    <div className="p-2">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider px-2 mb-1.5 mt-1">
                        <Music className="h-3 w-3" /> Events
                      </div>
                      <div className="space-y-0.5">
                        {results.events.map((e) => (
                          <Link
                            key={e.id}
                            to={withCity(`/booking/event/${e.id}`, city)}
                            onClick={() => setShowDropdown(false)}
                            className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-md transition group"
                          >
                            <div className="h-8 w-10 bg-gray-200 rounded overflow-hidden shrink-0">
                              {e.cover_image_url && (
                                <img
                                  src={e.cover_image_url}
                                  alt={e.title}
                                  className="w-full h-full object-cover"
                                />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-900 truncate group-hover:text-[#7B1E3D]">
                                {e.title}
                              </p>
                              <p className="text-[11px] text-gray-500 truncate">
                                {e.category} • {e.city}
                              </p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 shrink-0 ml-auto md:ml-4">
          <button
            type="button"
            className="md:hidden text-gray-600 hover:text-gray-900 transition"
            onClick={() => setMobileSearchOpen((v) => !v)}
          >
            {mobileSearchOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Search className="h-5 w-5" />
            )}
          </button>

          <div className="relative hidden md:flex items-center">
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="appearance-none bg-transparent border-none outline-none cursor-pointer text-sm font-medium text-gray-700 hover:text-[#7B1E3D] pr-4 transition-colors z-10 relative"
            >
              {SUPPORTED_CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <ChevronDown className="h-3.5 w-3.5 text-gray-500 absolute right-0 pointer-events-none" />
          </div>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full hover:bg-gray-100 p-1 pr-3 transition">
                  <Avatar className="h-7 w-7 border border-gray-200">
                    <AvatarFallback className="bg-[#7B1E3D]/10 text-xs font-bold text-[#7B1E3D]">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:block text-sm font-medium text-gray-800 max-w-[80px] truncate">
                    {user.full_name?.split(" ")[0] || "Hi, Guest"}
                  </span>
                  <ChevronDown className="h-3 w-3 text-gray-500 hidden sm:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 rounded-xl border-gray-200 bg-white text-gray-900 shadow-xl p-1"
              >
                <div className="px-3 py-2">
                  <p className="text-sm font-bold">
                    {user.full_name || "Member"}
                  </p>
                  <p className="truncate text-xs text-gray-500">{user.email}</p>
                </div>
                <DropdownMenuSeparator className="bg-gray-100" />
                <DropdownMenuItem
                  onClick={() => navigate(withCity("/profile", city))}
                  className="hover:bg-gray-50 cursor-pointer rounded-md font-medium text-sm"
                >
                  <User className="mr-2 h-4 w-4" /> Profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate(withCity("/profile", city))}
                  className="hover:bg-gray-50 cursor-pointer rounded-md font-medium text-sm"
                >
                  <Calendar className="mr-2 h-4 w-4" /> My Bookings
                </DropdownMenuItem>

                {user.role === "PARTNER" && (
                  <DropdownMenuItem
                    onClick={() => navigate("/partner/dashboard")}
                    className="hover:bg-gray-50 text-[#7B1E3D] cursor-pointer rounded-md font-medium text-sm"
                  >
                    <LayoutDashboard className="mr-2 h-4 w-4" /> Partner
                    Dashboard
                  </DropdownMenuItem>
                )}
                {user.role !== "PARTNER" && user.role !== "ADMIN" && (
                  <DropdownMenuItem
                    onClick={() => navigate("/partner/become")}
                    className="hover:bg-gray-50 text-[#7B1E3D] cursor-pointer rounded-md font-medium text-sm"
                  >
                    <Sparkles className="mr-2 h-4 w-4" /> Become a Partner
                  </DropdownMenuItem>
                )}
                {user.role === "ADMIN" && (
                  <>
                    <DropdownMenuSeparator className="bg-gray-100" />
                    <DropdownMenuItem
                      onClick={() => navigate("/admin/partners")}
                      className="hover:bg-gray-50 text-[#7B1E3D] cursor-pointer rounded-md font-medium text-sm"
                    >
                      <Users className="mr-2 h-4 w-4" /> Partner Verification
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => navigate("/admin/moderation")}
                      className="hover:bg-gray-50 text-[#7B1E3D] cursor-pointer rounded-md font-medium text-sm"
                    >
                      <ShieldCheck className="mr-2 h-4 w-4" /> Event Moderation
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator className="bg-gray-100" />
                <DropdownMenuItem
                  onClick={() => signOut()}
                  className="cursor-pointer text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-md font-medium text-sm"
                >
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              onClick={() => navigate(withCity("/login", city))}
              className="rounded text-xs font-semibold h-7 px-4 bg-[#7B1E3D] hover:bg-[#5C0F2A] text-white shadow-none"
            >
              Sign in
            </Button>
          )}

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button className="lg:hidden text-gray-700 hover:text-gray-900">
                <Menu className="h-6 w-6" />
              </button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-[300px] border-gray-200 bg-white p-0"
            >
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 bg-[#333338] text-white">
                <span className="text-lg font-bold">Hey!</span>
                <button onClick={() => setMobileOpen(false)}>
                  <X className="h-5 w-5 text-white/70 hover:text-white" />
                </button>
              </div>

              <div className="px-5 py-4 border-b border-gray-100">
                <label className="text-xs font-semibold text-gray-500 mb-1 block">
                  Your City
                </label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 outline-none"
                >
                  {SUPPORTED_CITIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col py-2">
                {navLinks.map((link, i) => (
                  <Link
                    key={`${link.href}-${i}`}
                    to={withCity(link.href, city)}
                    onClick={() => setMobileOpen(false)}
                    className="px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-[#7B1E3D] flex items-center justify-between"
                  >
                    {link.label}
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </Link>
                ))}
                <div className="h-px bg-gray-100 my-2 mx-5" />
                <Link
                  to="/partner/become"
                  onClick={() => setMobileOpen(false)}
                  className="px-5 py-3 text-sm font-medium text-[#7B1E3D] hover:bg-gray-50 flex items-center justify-between"
                >
                  List Your Show
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="hidden lg:block bg-[#F5F5FA] border-t border-gray-200">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between px-4 h-10">
          <div className="flex items-center gap-6">
            {navLinks.map((link, i) => (
              <Link
                key={`${link.href}-${i}`}
                to={withCity(link.href, city)}
                className={`text-[13px] font-medium transition-colors hover:text-[#7B1E3D] ${
                  location.pathname.startsWith(link.href)
                    ? "text-[#7B1E3D]"
                    : "text-gray-600"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
          <Link
            to="/partner/become"
            className="text-[13px] font-medium text-gray-600 hover:text-[#7B1E3D] transition-colors"
          >
            List Your Show
          </Link>
        </div>
      </div>

      {mobileSearchOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white p-3 shadow-md">
          <div className="flex items-center bg-gray-50 border border-gray-200 rounded-md px-3 py-2">
            <Search className="h-4 w-4 text-gray-400 mr-2" />
            <input
              autoFocus
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Movies, Events..."
              className="w-full bg-transparent text-sm focus:outline-none text-gray-900"
            />
          </div>
          {hasResults && (
            <div className="mt-2 divide-y divide-gray-100 max-h-60 overflow-y-auto border border-gray-100 rounded-md shadow-sm">
              {results.movies.map((m) => (
                <Link
                  key={m.id}
                  to={withCity(`/movies/${m.id}`, city)}
                  onClick={() => setMobileSearchOpen(false)}
                  className="flex items-center gap-3 p-2.5 hover:bg-gray-50"
                >
                  <Film className="h-4 w-4 text-[#7B1E3D] shrink-0" />
                  <span className="text-sm font-medium text-gray-800 truncate">
                    {m.title}
                  </span>
                </Link>
              ))}
              {results.events.map((e) => (
                <Link
                  key={e.id}
                  to={withCity(`/booking/event/${e.id}`, city)}
                  onClick={() => setMobileSearchOpen(false)}
                  className="flex items-center gap-3 p-2.5 hover:bg-gray-50"
                >
                  <Music className="h-4 w-4 text-[#7B1E3D] shrink-0" />
                  <span className="text-sm font-medium text-gray-800 truncate">
                    {e.title}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </header>
  );
}
