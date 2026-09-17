import { useState, useEffect, useRef, FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { api, unwrap } from '@/api/client';
import {
  Menu,
  Wine,
  User,
  LogOut,
  Calendar,
  LayoutDashboard,
  ShieldCheck,
  Users,
  Sparkles,
  X,
  Search,
  MapPin,
  ChevronDown,
  Film,
  Music,
  Utensils,
  Loader2,
  ChevronRight,
} from 'lucide-react';

const navLinks = [
  { href: '/movies', label: 'Movies' },
  { href: '/events', label: 'Events' },
  { href: '/restaurants', label: 'Restaurants' },
];

const CITIES = ['Kochi', 'Chennai', 'Bangalore', 'Mumbai'];

interface SearchResults {
  movies: any[];
  events: any[];
  restaurants: any[];
}

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();

  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [city, setCity] = useState('Kochi');

  // Global Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [results, setResults] = useState<SearchResults>({ movies: [], events: [], restaurants: [] });
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll);
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close dropdown on outside click or route change
  useEffect(() => {
    setShowDropdown(false);
    setMobileSearchOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced Live Global Search across Movies, Events, Restaurants
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
        const today = new Date().toISOString().split('T')[0];
        const [moviesRes, eventsRes] = await Promise.all([
          unwrap<any[]>(api.get('/movies', { params: { city, date: today } })).catch(() => []),
          unwrap<any>(api.get('/events')).catch(() => []),
        ]);

        const rawEvents = Array.isArray(eventsRes) ? eventsRes : eventsRes.items || [];

        const filteredMovies = moviesRes.filter((m: any) =>
  m.title.toLowerCase().includes(q) || (m.language && m.language.toLowerCase().includes(q))
).slice(0, 4);

const filteredEvents = rawEvents.filter((e: any) =>
  e.title.toLowerCase().includes(q) || (e.category && e.category.toLowerCase().includes(q))
).slice(0, 4);

        setResults({
          movies: filteredMovies,
          events: filteredEvents,
          restaurants: [], // Ready if dining endpoint is available
        });
      } catch (err) {
        console.error('Global search error', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, city]);

  const hasResults = results.movies.length > 0 || results.events.length > 0 || results.restaurants.length > 0;

  const initials = (user?.full_name || user?.email || 'U')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-200'
          : 'bg-white border-b border-slate-100'
      }`}
    >
      {/* ── TOP ROW ── */}
      <nav className="mx-auto flex max-w-[1280px] items-center gap-3 px-4 sm:px-6 h-16">
        {/* Logo */}
        <Link to="/" className="group flex items-center gap-2.5 shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#7B1E3D] to-[#9B1B3A] shadow-sm transition-transform group-hover:scale-105">
            <Wine className="h-4.5 w-4.5 text-white" strokeWidth={2.2} />
          </div>
          <span className="text-xl font-bold tracking-tight text-[#7B1E3D] hidden sm:block">
            Vyhbz
          </span>
        </Link>

        {/* City picker (BMS-style) */}
        <div className="relative hidden md:block shrink-0">
          <div className="flex items-center gap-1 text-sm font-semibold text-slate-700 cursor-pointer hover:text-[#7B1E3D]">
            <MapPin className="h-3.5 w-3.5 text-[#7B1E3D]" />
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="bg-transparent border-none outline-none cursor-pointer font-semibold text-slate-700 hover:text-[#7B1E3D] pr-1"
            >
              {CITIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Desktop Search — Live Categorised Overlay */}
        <div className="relative hidden md:flex flex-1 max-w-xl mx-2" ref={dropdownRef}>
          <div className="flex w-full items-center bg-slate-100 focus-within:bg-white border border-transparent focus-within:border-[#7B1E3D]/40 rounded-lg transition overflow-hidden">
            <Search className="h-4 w-4 text-slate-400 ml-3 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.trim().length >= 2 && setShowDropdown(true)}
              placeholder="Search for Movies, Events, Plays, Dining..."
              className="flex-1 bg-transparent px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
            />
            {isSearching ? (
              <Loader2 className="h-4 w-4 text-slate-400 mr-3 animate-spin" />
            ) : searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="p-2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>

          {/* GLOBAL SEARCH RESULTS DROPDOWN */}
          {showDropdown && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50 max-h-[480px] overflow-y-auto">
              {!isSearching && !hasResults ? (
                <div className="p-8 text-center text-slate-500 text-sm">
                  No matches found for "<span className="font-semibold">{searchQuery}</span>"
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {/* MOVIES SECTION */}
                  {results.movies.length > 0 && (
                    <div className="p-3">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#7B1E3D] uppercase tracking-wider px-2 mb-2">
                        <Film className="h-3.5 w-3.5" /> Movies
                      </div>
                      <div className="space-y-1">
                        {results.movies.map((m) => (
                          <Link
                            key={m.id}
                            to={`/movies/${m.id}`}
                            onClick={() => setShowDropdown(false)}
                            className="flex items-center gap-3 p-2 hover:bg-[#FDF2F4] rounded-lg transition group"
                          >
                            <div className="h-10 w-7 bg-slate-200 rounded overflow-hidden shrink-0">
                              {m.poster_url && <img src={m.poster_url} alt={m.title} className="w-full h-full object-cover" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-bold text-slate-900 truncate group-hover:text-[#7B1E3D]">
                                {m.title}
                              </p>
                              <p className="text-xs text-slate-500 truncate">{m.language} • {m.certificate}</p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-[#7B1E3D]" />
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* EVENTS SECTION */}
                  {results.events.length > 0 && (
                    <div className="p-3">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#7B1E3D] uppercase tracking-wider px-2 mb-2">
                        <Music className="h-3.5 w-3.5" /> Events
                      </div>
                      <div className="space-y-1">
                        {results.events.map((e) => (
                          <Link
                            key={e.id}
                            to={`/booking/event/${e.id}`}
                            onClick={() => setShowDropdown(false)}
                            className="flex items-center gap-3 p-2 hover:bg-[#FDF2F4] rounded-lg transition group"
                          >
                            <div className="h-8 w-10 bg-slate-200 rounded overflow-hidden shrink-0">
                              {e.cover_image_url && <img src={e.cover_image_url} alt={e.title} className="w-full h-full object-cover" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-bold text-slate-900 truncate group-hover:text-[#7B1E3D]">
                                {e.title}
                              </p>
                              <p className="text-xs text-slate-500 truncate">{e.category} • {e.city}</p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-[#7B1E3D]" />
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

        {/* Desktop Nav Links */}
        <div className="hidden lg:flex items-center gap-6 shrink-0 ml-auto">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className={`relative text-sm font-semibold transition-colors ${
                location.pathname.startsWith(link.href)
                  ? 'text-[#7B1E3D]'
                  : 'text-slate-700 hover:text-[#7B1E3D]'
              }`}
            >
              {link.label}
              {location.pathname.startsWith(link.href) && (
                <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-[#7B1E3D] rounded-full" />
              )}
            </Link>
          ))}
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto lg:ml-2">
          {/* Mobile Search Toggle */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="md:hidden text-slate-700"
            onClick={() => setMobileSearchOpen((v) => !v)}
          >
            {mobileSearchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
          </Button>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full border border-slate-200 bg-white p-1 pr-2.5 hover:shadow-sm transition">
                  <Avatar className="h-8 w-8 border border-slate-100">
                    <AvatarFallback className="bg-[#FDF2F4] text-xs font-bold text-[#7B1E3D]">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:block text-sm font-semibold text-slate-800 max-w-[90px] truncate">
                    {user.full_name?.split(' ')[0] || 'Account'}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 rounded-xl border-slate-200 bg-white text-slate-900 shadow-xl p-1"
              >
                <div className="px-3 py-2">
                  <p className="text-sm font-bold">{user.full_name || 'Member'}</p>
                  <p className="truncate text-xs text-slate-500">{user.email}</p>
                </div>
                <DropdownMenuSeparator className="bg-slate-100" />
                <DropdownMenuItem onClick={() => navigate('/profile')} className="hover:bg-[#FDF2F4] hover:text-[#7B1E3D] cursor-pointer rounded-lg font-medium">
                  <User className="mr-2 h-4 w-4" /> Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/profile')} className="hover:bg-[#FDF2F4] hover:text-[#7B1E3D] cursor-pointer rounded-lg font-medium">
                  <Calendar className="mr-2 h-4 w-4" /> My Bookings
                </DropdownMenuItem>

                {user.role === 'PARTNER' && (
                  <DropdownMenuItem onClick={() => navigate('/partner/dashboard')} className="hover:bg-[#FDF2F4] text-[#7B1E3D] cursor-pointer rounded-lg font-semibold">
                    <LayoutDashboard className="mr-2 h-4 w-4" /> Partner Dashboard
                  </DropdownMenuItem>
                )}
                {user.role !== 'PARTNER' && user.role !== 'ADMIN' && (
                  <DropdownMenuItem onClick={() => navigate('/partner/become')} className="hover:bg-[#FDF2F4] text-[#7B1E3D] cursor-pointer rounded-lg font-semibold">
                    <Sparkles className="mr-2 h-4 w-4" /> Become a Partner
                  </DropdownMenuItem>
                )}
                {user.role === 'ADMIN' && (
                  <>
                    <DropdownMenuSeparator className="bg-slate-100" />
                    <DropdownMenuItem onClick={() => navigate('/admin/partners')} className="hover:bg-[#FDF2F4] text-[#7B1E3D] cursor-pointer rounded-lg font-semibold">
                      <Users className="mr-2 h-4 w-4" /> Partner Verification
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/admin/moderation')} className="hover:bg-[#FDF2F4] text-[#7B1E3D] cursor-pointer rounded-lg font-semibold">
                      <ShieldCheck className="mr-2 h-4 w-4" /> Event Moderation
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator className="bg-slate-100" />
                <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer text-rose-600 hover:bg-rose-50 rounded-lg font-medium">
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Button asChild variant="ghost" className="text-sm font-semibold text-slate-700 hover:text-[#7B1E3D] hover:bg-[#FDF2F4]">
                <Link to="/login">Log in</Link>
              </Button>
              <Button asChild className="rounded-lg bg-[#7B1E3D] hover:bg-[#5C0F2A] px-4 text-sm font-semibold text-white">
                <Link to="/register">Sign up</Link>
              </Button>
            </div>
          )}

          {/* Mobile Drawer Toggle */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden text-slate-800">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] border-slate-200 bg-white p-0">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <span className="text-lg font-bold text-[#7B1E3D]">Menu</span>
                <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}>
                  <X className="h-5 w-5 text-slate-500" />
                </Button>
              </div>

              <div className="px-5 py-3 border-b border-slate-100">
                <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400">City</label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800"
                >
                  {CITIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1 px-3 py-3">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-[#FDF2F4] hover:text-[#7B1E3D]"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>

      {/* ── MOBILE SEARCH BAR ── */}
      {mobileSearchOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white p-3 shadow-lg">
          <div className="flex items-center bg-slate-100 rounded-lg px-3 py-2">
            <Search className="h-4 w-4 text-slate-400 mr-2" />
            <input
              autoFocus
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Movies, Events, Dining..."
              className="w-full bg-transparent text-sm focus:outline-none"
            />
          </div>

          {/* Mobile Results Overlay */}
          {hasResults && (
            <div className="mt-2 divide-y divide-slate-100 max-h-60 overflow-y-auto">
              {results.movies.map((m) => (
                <Link
                  key={m.id}
                  to={`/movies/${m.id}`}
                  onClick={() => setMobileSearchOpen(false)}
                  className="flex items-center gap-2 p-2 hover:bg-slate-50"
                >
                  <Film className="h-3.5 w-3.5 text-[#7B1E3D]" />
                  <span className="text-sm font-bold text-slate-800 truncate">{m.title}</span>
                </Link>
              ))}
              {results.events.map((e) => (
                <Link
                  key={e.id}
                  to={`/booking/event/${e.id}`}
                  onClick={() => setMobileSearchOpen(false)}
                  className="flex items-center gap-2 p-2 hover:bg-slate-50"
                >
                  <Music className="h-3.5 w-3.5 text-[#7B1E3D]" />
                  <span className="text-sm font-bold text-slate-800 truncate">{e.title}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </header>
  );
}