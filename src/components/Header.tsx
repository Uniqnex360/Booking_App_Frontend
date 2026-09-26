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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { api, unwrap } from "@/api/client";
import {
  Menu,
  User,
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
  Ticket,
  Heart,
  HelpCircle,
  Headphones,
  Settings,
  Gift,
  ArrowLeft,
  Mail,
  Phone,
  MessageSquare,
  Copy,
  Check,
  ExternalLink,
  Bell,
} from "lucide-react";
import { detectCity, SUPPORTED_CITIES } from "@/utils/geolocation";
import { toast } from "sonner";

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

const FAQ_ITEMS = [
  {
    category: "cancellation",
    q: "How do I cancel my tickets and get a refund?",
    a: "You can cancel eligible movie or event tickets directly under 'Your Orders'. If the cinema or event policy permits cancellations, refunds are automatically credited to your original payment method within 5-7 working days.",
  },
  {
    category: "booking",
    q: "I haven't received my booking confirmation email or SMS.",
    a: "Confirmation emails and SMS are dispatched instantaneously. You can always view and download your valid e-ticket under 'Your Orders'. If needed, you can also click 'Resend Confirmation' from your order details.",
  },
  {
    category: "payment",
    q: "Money was deducted from my account but booking failed.",
    a: "If payment was deducted but a booking reference was not generated, the banking network will auto-reverse the complete transaction back to your bank account or card within 2 to 4 business days.",
  },
  {
    category: "booking",
    q: "Can I change my seat selection or timing after booking?",
    a: "As per cinema and organizer booking protocols, seats and timings cannot be swapped once confirmed. You may cancel your existing booking (if cancellation is enabled) and book the new timing.",
  },
  {
    category: "booking",
    q: "How do I book tickets for live events and concerts?",
    a: "Navigate to Events, choose your desired event, click 'Book Now', select your preferred ticket tier (VIP, General, etc.) and number of tickets, and complete payment for instant e-ticket generation.",
  },
  {
    category: "account",
    q: "How do I update my profile or phone number?",
    a: "Click on your profile avatar in the header and select 'Edit Profile'. From there, you can update your name, contact phone number, and avatar.",
  },
  {
    category: "payment",
    q: "What payment methods are supported on Vyhbz?",
    a: "We accept all major Credit/Debit Cards (Visa, Mastercard, RuPay), UPI (Google Pay, PhonePe, Paytm), Net Banking, and digital wallets.",
  },
];

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

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<"main" | "help" | "settings" | "rewards">("main");
  const [faqCategory, setFaqCategory] = useState<"all" | "booking" | "cancellation" | "payment" | "account">("all");
  const [faqSearch, setFaqSearch] = useState("");
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

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
    const DISCOVERY_PATHS = ["/", "/movies", "/events", "/restaurants"];
    const onDiscovery = DISCOVERY_PATHS.some((p) =>
      p === "/" ? location.pathname === "/" : location.pathname.startsWith(p),
    );
    if (!onDiscovery) return;

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
  }, [location.pathname]);

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

  const handleProfileNavigation = (path: string) => {
    setDrawerOpen(false);
    navigate(path);
  };

  const handleCopyVoucher = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Coupon ${code} copied to clipboard!`);
    setTimeout(() => setCopiedCode(null), 3000);
  };

  const filteredFaqs = FAQ_ITEMS.filter((item) => {
    const matchesCategory = faqCategory === "all" || item.category === faqCategory;
    const matchesQuery =
      !faqSearch.trim() ||
      item.q.toLowerCase().includes(faqSearch.toLowerCase()) ||
      item.a.toLowerCase().includes(faqSearch.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm transition-all duration-300 font-sans">
      <div className="mx-auto flex max-w-[1240px] items-center gap-4 sm:gap-6 px-4 h-16 sm:h-[72px]">
        {/* Brand Logo */}
        <Link to={withCity("/", city)} className="flex items-center shrink-0 py-1">
          <img
            src="/logo.png"
            alt="Vyhbz"
            className="h-12 sm:h-14 md:h-16 w-auto object-contain hover:scale-105 transition-transform"
          />
        </Link>

        {/* Search Bar */}
        <div
          className="relative hidden md:flex flex-1 max-w-[550px] lg:max-w-[620px] ml-4"
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

          {/* Search Dropdown */}
          {showDropdown && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg border border-gray-200 shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              {isSearching ? (
                <div className="p-4 text-center text-sm text-gray-500 flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-[#7B1E3D]" />
                  <span>Searching...</span>
                </div>
              ) : !hasResults ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  No results found for "{searchQuery}"
                </div>
              ) : (
                <div className="divide-y divide-gray-100 max-h-[380px] overflow-y-auto">
                  {results.movies.length > 0 && (
                    <div className="p-2">
                      <p className="text-[11px] font-bold text-gray-400 px-3 py-1 uppercase tracking-wider">
                        Movies
                      </p>
                      <div className="mt-1 space-y-1">
                        {results.movies.map((m) => (
                          <Link
                            key={m.id}
                            to={withCity(`/movies/${m.id}`, city)}
                            onClick={() => setShowDropdown(false)}
                            className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-50 transition group"
                          >
                            <div className="h-10 w-8 bg-gray-100 rounded overflow-hidden shrink-0">
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
                      <p className="text-[11px] font-bold text-gray-400 px-3 py-1 uppercase tracking-wider">
                        Events
                      </p>
                      <div className="mt-1 space-y-1">
                        {results.events.map((e) => (
                          <Link
                            key={e.id}
                            to={withCity(`/booking/event/${e.id}`, city)}
                            onClick={() => setShowDropdown(false)}
                            className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-50 transition group"
                          >
                            <div className="h-10 w-8 bg-gray-100 rounded overflow-hidden shrink-0">
                              {(e.poster_image_url || e.cover_image_url) && (
                                <img
                                  src={e.poster_image_url || e.cover_image_url}
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

        {/* Right Section: Aligned to the far right with ml-auto */}
        <div className="flex items-center gap-3 sm:gap-4 shrink-0 ml-auto">
          {/* Mobile Search Trigger */}
          <button
            type="button"
            className="md:hidden text-gray-600 hover:text-gray-900 transition p-1"
            onClick={() => setMobileSearchOpen((v) => !v)}
          >
            {mobileSearchOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Search className="h-5 w-5" />
            )}
          </button>

          {/* City Selector */}
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

          {/* User Sign In / Profile Avatar */}
          {user ? (
            <button
              onClick={() => {
                setDrawerTab("main");
                setDrawerOpen(true);
              }}
              className="flex items-center gap-2 rounded-full hover:bg-gray-100 p-1 pr-2.5 transition"
            >
              <Avatar className="h-7 w-7 border border-gray-200">
                <AvatarFallback className="bg-[#7B1E3D]/10 text-xs font-bold text-[#7B1E3D]">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden sm:block text-sm font-medium text-gray-800 max-w-[85px] truncate">
                {user.full_name?.split(" ")[0] || "Profile"}
              </span>
            </button>
          ) : (
            <Button
              onClick={() => navigate(withCity("/login", city))}
              className="rounded text-xs font-semibold h-8 px-4 bg-[#7B1E3D] hover:bg-[#5C0F2A] text-white shadow-none transition"
            >
              Sign in
            </Button>
          )}

          {/* BookMyShow Hamburger Menu Trigger (Visible on all devices!) */}
          <button
            onClick={() => {
              setDrawerTab("main");
              setDrawerOpen(true);
            }}
            className="text-gray-700 hover:text-[#7B1E3D] p-1.5 rounded-lg hover:bg-gray-100 transition"
            title="Menu"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Sub Navigation Bar */}
      <div className="hidden lg:block bg-[#F5F5FA] border-t border-gray-200">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between px-4 h-10">
          <div className="flex items-center gap-6">
            {navLinks.map((link, i) => (
              <Link
                key={`${link.href}-${i}`}
                to={withCity(link.href, city)}
                className={`text-[13px] font-medium transition-colors hover:text-[#7B1E3D] ${
                  location.pathname.startsWith(link.href)
                    ? "text-[#7B1E3D] font-semibold"
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

      {/* Mobile Search Overlay */}
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

      {/* BookMyShow Style Unified Side Drawer */}
      <Sheet open={drawerOpen} onOpenChange={(open) => {
        setDrawerOpen(open);
        if (!open) {
          setTimeout(() => setDrawerTab("main"), 200);
        }
      }}>
        <SheetContent
          side="right"
          className="w-full sm:w-[420px] p-0 flex flex-col bg-white border-l border-gray-200 z-[100] outline-none"
        >
          {/* TAB 1: MAIN MENU */}
          {drawerTab === "main" && (
            <div className="flex flex-col h-full animate-in fade-in duration-200">
              {/* BMS Profile / Guest Header */}
              {user ? (
                <div
                  className="p-6 flex items-center justify-between border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition mt-6"
                  onClick={() => handleProfileNavigation(withCity("/profile", city))}
                >
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 leading-tight">
                      {user.full_name || "Hi, Guest"}
                    </h2>
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1 hover:text-[#7B1E3D] transition">
                      Edit Profile <ChevronRight size={14} />
                    </p>
                  </div>
                  <Avatar className="h-12 w-12 border border-gray-200 shadow-sm">
                    <AvatarFallback className="bg-[#7B1E3D]/10 text-[#7B1E3D] font-bold text-base">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </div>
              ) : (
                <div className="p-6 border-b border-gray-100 bg-[#F9F9FA] mt-6">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xl font-bold text-gray-900">Hey!</h2>
                    <div className="h-10 w-10 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm">
                      <User className="h-5 w-5 text-gray-500" />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                    Unlock special offers, personalized recommendations & faster bookings
                  </p>
                  <Button
                    onClick={() => {
                      setDrawerOpen(false);
                      navigate(withCity("/login", city));
                    }}
                    className="w-full bg-[#7B1E3D] hover:bg-[#5C0F2A] text-white font-semibold py-2.5 rounded-lg text-sm transition shadow-sm"
                  >
                    Login / Register
                  </Button>
                </div>
              )}

              {/* Mobile City Selector */}
              <div className="md:hidden px-6 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Selected City
                </span>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="bg-transparent text-sm font-bold text-[#7B1E3D] outline-none cursor-pointer"
                >
                  {SUPPORTED_CITIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Menu Items List */}
              <div className="flex-1 overflow-y-auto py-2 divide-y divide-gray-50">
                {/* Mobile Navigation Links (if on small screen) */}
                <div className="lg:hidden py-1 border-b border-gray-100">
                  {navLinks.map((link) => (
                    <button
                      key={link.href}
                      onClick={() => handleProfileNavigation(withCity(link.href, city))}
                      className="w-full flex items-center justify-between px-6 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50 hover:text-[#7B1E3D] transition"
                    >
                      <span>{link.label}</span>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </button>
                  ))}
                </div>

                <div className="py-1">
                  {/* Your Orders */}
                  <DrawerMenuItem
                    icon={Ticket}
                    title="Your Orders"
                    subtitle="View all your bookings & purchases"
                    onClick={() => handleProfileNavigation(withCity("/profile", city))}
                  />

                  {/* Wishlist */}
                  <DrawerMenuItem
                    icon={Heart}
                    title="Your Wishlist"
                    subtitle="View your saved events and movies"
                    onClick={() => handleProfileNavigation(withCity("/profile", city))}
                  />
                </div>

                <div className="py-1">
                  {/* Help & Support (BookMyShow style) */}
                  <DrawerMenuItem
                    icon={Headphones}
                    title="Help & Support"
                    subtitle="View commonly asked queries and Chat"
                    onClick={() => handleProfileNavigation("/support")}
                    badge="24/7"
                  />

                  {/* Account & Settings */}
                  <DrawerMenuItem
                    icon={Settings}
                    title="Account & Settings"
                    subtitle="Location, payments, permissions & more"
                    onClick={() => setDrawerTab("settings")}
                  />

                  {/* Rewards & Offers */}
                  <DrawerMenuItem
                    icon={Gift}
                    title="Rewards & Offers"
                    subtitle="View your rewards & unlock new ones"
                    onClick={() => setDrawerTab("rewards")}
                  />
                </div>

                <div className="py-1">
                  {/* Partner actions */}
                  {user?.role === "PARTNER" && (
                    <DrawerMenuItem
                      icon={LayoutDashboard}
                      title="Partner Dashboard"
                      subtitle="Manage your listings and venues"
                      onClick={() => handleProfileNavigation("/partner/dashboard")}
                    />
                  )}

                  {user?.role !== "PARTNER" && user?.role !== "ADMIN" && (
                    <DrawerMenuItem
                      icon={Sparkles}
                      title="List Your Show"
                      subtitle="Got an event? Partner with us"
                      onClick={() => handleProfileNavigation("/partner/become")}
                    />
                  )}

                  {user?.role === "ADMIN" && (
                    <>
                      <DrawerMenuItem
                        icon={Users}
                        title="Partner Verification"
                        subtitle="Verify partner requests"
                        onClick={() => handleProfileNavigation("/admin/partners")}
                      />
                      <DrawerMenuItem
                        icon={ShieldCheck}
                        title="Event Moderation"
                        subtitle="Review and approve events"
                        onClick={() => handleProfileNavigation("/admin/moderation")}
                      />
                    </>
                  )}
                </div>
              </div>

              {/* Sign out (if logged in) */}
              {user && (
                <div className="p-4 border-t border-gray-100 bg-white">
                  <Button
                    onClick={() => {
                      setDrawerOpen(false);
                      signOut();
                    }}
                    variant="outline"
                    className="w-full border-red-500 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-lg h-11 font-semibold bg-white transition"
                  >
                    Sign out
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: HELP & SUPPORT (BookMyShow Style) */}
          {drawerTab === "help" && (
            <div className="flex flex-col h-full animate-in slide-in-from-right duration-200">
              {/* Help Header */}
              <div className="p-4 border-b border-gray-100 flex items-center justify-between mt-6 bg-white">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setDrawerTab("main")}
                    className="p-1.5 hover:bg-gray-100 rounded-full text-gray-600 hover:text-gray-900 transition"
                    title="Back"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 leading-tight">
                      Help & Support
                    </h2>
                    <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                      <span className="h-2 w-2 rounded-full bg-green-500 inline-block" />
                      24x7 Customer Care
                    </p>
                  </div>
                </div>
                <SheetClose className="p-1.5 hover:bg-gray-100 rounded-full text-gray-500">
                  <X className="h-5 w-5" />
                </SheetClose>
              </div>

              {/* Help Search */}
              <div className="p-4 bg-gray-50 border-b border-gray-100">
                <div className="flex items-center bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-inner">
                  <Search className="h-4 w-4 text-gray-400 mr-2 shrink-0" />
                  <input
                    type="text"
                    value={faqSearch}
                    onChange={(e) => setFaqSearch(e.target.value)}
                    placeholder="Search queries, refunds, bookings..."
                    className="w-full text-xs text-gray-800 bg-transparent focus:outline-none placeholder:text-gray-400"
                  />
                  {faqSearch && (
                    <button onClick={() => setFaqSearch("")}>
                      <X className="h-3.5 w-3.5 text-gray-400" />
                    </button>
                  )}
                </div>

                {/* Filter categories */}
                <div className="flex gap-1.5 overflow-x-auto mt-3 pb-1 no-scrollbar text-xs">
                  {[
                    { id: "all", label: "All Topics" },
                    { id: "booking", label: "Bookings" },
                    { id: "cancellation", label: "Cancellations" },
                    { id: "payment", label: "Payments" },
                    { id: "account", label: "Account" },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setFaqCategory(cat.id as any)}
                      className={`px-3 py-1 rounded-full whitespace-nowrap font-medium transition ${
                        faqCategory === cat.id
                          ? "bg-[#7B1E3D] text-white shadow-sm"
                          : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* FAQs Accordion List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-1">
                  Frequently Asked Questions
                </p>

                {filteredFaqs.length === 0 ? (
                  <div className="text-center py-10 text-gray-400 text-xs">
                    No help topics found matching "{faqSearch}"
                  </div>
                ) : (
                  filteredFaqs.map((faq, idx) => {
                    const isOpen = openFaqIndex === idx;
                    return (
                      <div
                        key={idx}
                        className="rounded-xl border border-gray-200 bg-white overflow-hidden transition-all shadow-sm"
                      >
                        <button
                          onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                          className="w-full text-left p-3.5 flex items-start justify-between gap-3 hover:bg-gray-50/70 transition"
                        >
                          <span className="text-xs font-semibold text-gray-900 leading-snug">
                            {faq.q}
                          </span>
                          <ChevronDown
                            className={`h-4 w-4 text-gray-400 shrink-0 mt-0.5 transition-transform duration-200 ${
                              isOpen ? "rotate-180 text-[#7B1E3D]" : ""
                            }`}
                          />
                        </button>
                        {isOpen && (
                          <div className="px-3.5 pb-3.5 text-xs text-gray-600 leading-relaxed border-t border-gray-100 pt-2.5 bg-gray-50/40">
                            {faq.a}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}

                {/* Contact Options Box */}
                <div className="mt-6 p-4 rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white shadow-sm space-y-3">
                  <div className="flex items-center gap-2">
                    <Headphones className="h-4 w-4 text-[#7B1E3D]" />
                    <span className="text-xs font-bold text-gray-900">
                      Still need help?
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 leading-relaxed">
                    Our dedicated support specialists are available 24/7 to resolve any booking or ticketing concerns.
                  </p>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <a
                      href="mailto:support@vyhbz.com"
                      className="flex items-center justify-center gap-1.5 p-2 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:border-[#7B1E3D] hover:text-[#7B1E3D] transition"
                    >
                      <Mail className="h-3.5 w-3.5 text-[#7B1E3D]" />
                      <span>Email Us</span>
                    </a>
                    <button
                      onClick={() =>
                        toast.info(
                          "Live Chat: Connecting you with a Vyhbz support agent...",
                          { description: "Average wait time is under 1 minute." },
                        )
                      }
                      className="flex items-center justify-center gap-1.5 p-2 rounded-lg bg-[#7B1E3D] text-white text-xs font-semibold hover:bg-[#5C0F2A] transition shadow-sm"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span>Live Chat</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ACCOUNT & SETTINGS */}
          {drawerTab === "settings" && (
            <div className="flex flex-col h-full animate-in slide-in-from-right duration-200">
              {/* Settings Header */}
              <div className="p-4 border-b border-gray-100 flex items-center justify-between mt-6 bg-white">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setDrawerTab("main")}
                    className="p-1.5 hover:bg-gray-100 rounded-full text-gray-600 hover:text-gray-900 transition"
                    title="Back"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 leading-tight">
                      Account & Settings
                    </h2>
                    <p className="text-xs text-gray-500">Preferences & App info</p>
                  </div>
                </div>
                <SheetClose className="p-1.5 hover:bg-gray-100 rounded-full text-gray-500">
                  <X className="h-5 w-5" />
                </SheetClose>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* City Preference */}
                <div className="p-4 rounded-xl border border-gray-200 bg-white space-y-2 shadow-sm">
                  <label className="text-xs font-semibold text-gray-700 block uppercase tracking-wider">
                    Current City
                  </label>
                  <p className="text-xs text-gray-500">
                    Showtimes and event schedules will be tailored to this city.
                  </p>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-900 outline-none focus:border-[#7B1E3D]"
                  >
                    {SUPPORTED_CITIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Notifications */}
                <div className="p-4 rounded-xl border border-gray-200 bg-white space-y-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4 text-gray-500" />
                      <span className="text-xs font-semibold text-gray-900">
                        Booking Notifications
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      defaultChecked
                      className="h-4 w-4 accent-[#7B1E3D] rounded cursor-pointer"
                    />
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Receive timely updates, reminders, and e-tickets via Email & SMS.
                  </p>
                </div>

                {/* Legal & Policies */}
                <div className="p-4 rounded-xl border border-gray-200 bg-white space-y-2 shadow-sm">
                  <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                    Legal & Compliance
                  </p>
                  <Link
                    to="/terms"
                    onClick={() => setDrawerOpen(false)}
                    className="flex items-center justify-between py-2 text-xs font-medium text-gray-700 hover:text-[#7B1E3D] transition border-b border-gray-50"
                  >
                    <span>Terms & Conditions</span>
                    <ExternalLink className="h-3.5 w-3.5 text-gray-400" />
                  </Link>
                  <Link
                    to="/terms"
                    onClick={() => setDrawerOpen(false)}
                    className="flex items-center justify-between py-2 text-xs font-medium text-gray-700 hover:text-[#7B1E3D] transition"
                  >
                    <span>Privacy Policy</span>
                    <ExternalLink className="h-3.5 w-3.5 text-gray-400" />
                  </Link>
                </div>

                {/* App Version */}
                <div className="text-center text-[11px] text-gray-400 pt-4">
                  <p>Vyhbz Entertainment v1.2.0 (BMS Edition)</p>
                  <p className="mt-0.5">Made with Wine branding</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: REWARDS & OFFERS */}
          {drawerTab === "rewards" && (
            <div className="flex flex-col h-full animate-in slide-in-from-right duration-200">
              {/* Rewards Header */}
              <div className="p-4 border-b border-gray-100 flex items-center justify-between mt-6 bg-white">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setDrawerTab("main")}
                    className="p-1.5 hover:bg-gray-100 rounded-full text-gray-600 hover:text-gray-900 transition"
                    title="Back"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 leading-tight">
                      Rewards & Offers
                    </h2>
                    <p className="text-xs text-gray-500">Exclusive coupons & discounts</p>
                  </div>
                </div>
                <SheetClose className="p-1.5 hover:bg-gray-100 rounded-full text-gray-500">
                  <X className="h-5 w-5" />
                </SheetClose>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {/* Coupon Card 1 */}
                <div className="p-4 rounded-xl border border-[#7B1E3D]/20 bg-[#7B1E3D]/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 bg-[#7B1E3D] text-white text-[10px] font-bold rounded uppercase tracking-wider">
                      New User Special
                    </span>
                    <button
                      onClick={() => handleCopyVoucher("VYHBZ20")}
                      className="flex items-center gap-1 text-xs font-semibold text-[#7B1E3D] hover:underline"
                    >
                      {copiedCode === "VYHBZ20" ? (
                        <>
                          <Check className="h-3.5 w-3.5" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" /> Copy Code
                        </>
                      )}
                    </button>
                  </div>
                  <h3 className="text-sm font-bold text-gray-900">
                    Flat 20% OFF on first event booking
                  </h3>
                  <p className="text-[11px] text-gray-600">
                    Use coupon code <strong className="text-[#7B1E3D]">VYHBZ20</strong> at checkout on any live event or concert.
                  </p>
                </div>

                {/* Coupon Card 2 */}
                <div className="p-4 rounded-xl border border-gray-200 bg-white space-y-2 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded uppercase tracking-wider">
                      Weekend Special
                    </span>
                    <button
                      onClick={() => handleCopyVoucher("WEEKEND100")}
                      className="flex items-center gap-1 text-xs font-semibold text-gray-700 hover:text-[#7B1E3D] hover:underline"
                    >
                      {copiedCode === "WEEKEND100" ? (
                        <>
                          <Check className="h-3.5 w-3.5" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" /> Copy Code
                        </>
                      )}
                    </button>
                  </div>
                  <h3 className="text-sm font-bold text-gray-900">
                    ₹100 Cashback on movie showtimes
                  </h3>
                  <p className="text-[11px] text-gray-600">
                    Book 2 or more tickets with code <strong className="text-gray-900">WEEKEND100</strong>.
                  </p>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </header>
  );
}

// Reusable menu item component for the BookMyShow side drawer
function DrawerMenuItem({
  icon: Icon,
  title,
  subtitle,
  onClick,
  badge,
}: {
  icon: any;
  title: string;
  subtitle?: string;
  onClick: () => void;
  badge?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-6 py-3.5 hover:bg-gray-50 transition border-b border-gray-50 last:border-none group text-left"
    >
      <div className="flex items-start gap-3.5 min-w-0">
        <Icon className="w-5 h-5 text-gray-500 mt-0.5 group-hover:text-[#7B1E3D] transition shrink-0" />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-900 group-hover:text-[#7B1E3D] transition truncate">
              {title}
            </h3>
            {badge && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#7B1E3D]/10 text-[#7B1E3D]">
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{subtitle}</p>
          )}
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition shrink-0 ml-2" />
    </button>
  );
}
