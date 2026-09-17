import { useState, useEffect, FormEvent } from 'react';
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
} from 'lucide-react';

const navLinks = [
  { href: '/movies', label: 'Movies' },
  { href: '/events', label: 'Events' },
  { href: '/restaurants', label: 'Restaurants' },
];

const CITIES = ['Kochi', 'Chennai', 'Bangalore', 'Mumbai'];

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [city, setCity] = useState('Kochi');
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll);
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Prefill search from URL when on /movies
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get('search') || '';
    setSearchQuery(q);
  }, [location.search]);

  const initials = (user?.full_name || user?.email || 'U')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const handleSearch = (e?: FormEvent) => {
    e?.preventDefault();
    const q = searchQuery.trim();
    navigate(q ? `/movies?search=${encodeURIComponent(q)}&city=${encodeURIComponent(city)}` : `/movies?city=${encodeURIComponent(city)}`);
    setMobileSearchOpen(false);
    setMobileOpen(false);
  };

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
              onChange={(e) => {
                setCity(e.target.value);
                // Keep search context when city changes on movies page
                if (location.pathname.startsWith('/movies')) {
                  const q = searchQuery.trim();
                  navigate(
                    q
                      ? `/movies?search=${encodeURIComponent(q)}&city=${encodeURIComponent(e.target.value)}`
                      : `/movies?city=${encodeURIComponent(e.target.value)}`
                  );
                }
              }}
              className="bg-transparent border-none outline-none cursor-pointer font-semibold text-slate-700 hover:text-[#7B1E3D] pr-1"
              aria-label="Select city"
            >
              {CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </div>
        </div>

        {/* Desktop Search — center, BMS style */}
        <form
          onSubmit={handleSearch}
          className="hidden md:flex flex-1 max-w-xl mx-2"
        >
          <div className="flex w-full items-center bg-slate-100 hover:bg-slate-50 focus-within:bg-white border border-transparent focus-within:border-[#7B1E3D]/40 rounded-lg transition overflow-hidden">
            <Search className="h-4 w-4 text-slate-400 ml-3 shrink-0" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for Movies, Events, Plays, Sports and Activities"
              className="flex-1 bg-transparent px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="p-2 text-slate-400 hover:text-slate-600"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="submit"
              className="bg-[#7B1E3D] hover:bg-[#5C0F2A] text-white text-sm font-semibold px-4 py-2.5 transition"
            >
              Search
            </button>
          </div>
        </form>

        {/* Desktop nav links */}
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

        {/* Right actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto lg:ml-2">
          {/* Mobile search toggle */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="md:hidden text-slate-700"
            onClick={() => setMobileSearchOpen((v) => !v)}
            aria-label="Search"
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
                <DropdownMenuItem
                  onClick={() => navigate('/profile')}
                  className="hover:bg-[#FDF2F4] hover:text-[#7B1E3D] cursor-pointer rounded-lg font-medium"
                >
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate('/profile')}
                  className="hover:bg-[#FDF2F4] hover:text-[#7B1E3D] cursor-pointer rounded-lg font-medium"
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  My Bookings
                </DropdownMenuItem>

                {user.role === 'PARTNER' && (
                  <DropdownMenuItem
                    onClick={() => navigate('/partner/dashboard')}
                    className="hover:bg-[#FDF2F4] text-[#7B1E3D] cursor-pointer rounded-lg font-semibold"
                  >
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Partner Dashboard
                  </DropdownMenuItem>
                )}
                {user.role !== 'PARTNER' && user.role !== 'ADMIN' && (
                  <DropdownMenuItem
                    onClick={() => navigate('/partner/become')}
                    className="hover:bg-[#FDF2F4] text-[#7B1E3D] cursor-pointer rounded-lg font-semibold"
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Become a Partner
                  </DropdownMenuItem>
                )}
                {user.role === 'ADMIN' && (
                  <>
                    <DropdownMenuSeparator className="bg-slate-100" />
                    <DropdownMenuItem
                      onClick={() => navigate('/admin/partners')}
                      className="hover:bg-[#FDF2F4] text-[#7B1E3D] cursor-pointer rounded-lg font-semibold"
                    >
                      <Users className="mr-2 h-4 w-4" />
                      Partner Verification
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => navigate('/admin/moderation')}
                      className="hover:bg-[#FDF2F4] text-[#7B1E3D] cursor-pointer rounded-lg font-semibold"
                    >
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      Event Moderation
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator className="bg-slate-100" />
                <DropdownMenuItem
                  onClick={() => signOut()}
                  className="cursor-pointer text-rose-600 hover:bg-rose-50 rounded-lg font-medium"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Button
                asChild
                variant="ghost"
                className="text-sm font-semibold text-slate-700 hover:text-[#7B1E3D] hover:bg-[#FDF2F4]"
              >
                <Link to="/login">Log in</Link>
              </Button>
              <Button
                asChild
                className="rounded-lg bg-[#7B1E3D] hover:bg-[#5C0F2A] px-4 text-sm font-semibold text-white"
              >
                <Link to="/register">Sign up</Link>
              </Button>
            </div>
          )}

          {/* Mobile menu */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden text-slate-800" aria-label="Open menu">
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

              {/* City in mobile drawer */}
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

              <div className="mt-2 border-t border-slate-100 px-3 py-3 flex flex-col gap-1">
                {user ? (
                  <>
                    <Link to="/profile" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-[#FDF2F4]">
                      Profile
                    </Link>
                    {user.role === 'PARTNER' && (
                      <Link to="/partner/dashboard" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-semibold text-[#7B1E3D] hover:bg-[#FDF2F4]">
                        Partner Dashboard
                      </Link>
                    )}
                    {user.role === 'ADMIN' && (
                      <>
                        <Link to="/admin/partners" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-semibold text-[#7B1E3D] hover:bg-[#FDF2F4]">
                          Partner Verification
                        </Link>
                        <Link to="/admin/moderation" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-semibold text-[#7B1E3D] hover:bg-[#FDF2F4]">
                          Event Moderation
                        </Link>
                      </>
                    )}
                    {user.role !== 'PARTNER' && user.role !== 'ADMIN' && (
                      <Link to="/partner/become" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-semibold text-[#7B1E3D] hover:bg-[#FDF2F4]">
                        Become a Partner
                      </Link>
                    )}
                    <button
                      onClick={() => { signOut(); setMobileOpen(false); }}
                      className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-rose-600 hover:bg-rose-50 mt-1"
                    >
                      Sign out
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col gap-2 mt-1 px-1">
                    <Button asChild variant="outline" className="rounded-lg border-slate-200">
                      <Link to="/login" onClick={() => setMobileOpen(false)}>Log in</Link>
                    </Button>
                    <Button asChild className="rounded-lg bg-[#7B1E3D] hover:bg-[#5C0F2A] text-white font-semibold">
                      <Link to="/register" onClick={() => setMobileOpen(false)}>Sign up</Link>
                    </Button>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>

      {/* ── MOBILE SEARCH ROW (expands under header) ── */}
      {mobileSearchOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white px-3 py-2.5">
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <div className="flex flex-1 items-center bg-slate-100 border border-slate-200 rounded-lg overflow-hidden focus-within:border-[#7B1E3D]/50 focus-within:bg-white">
              <Search className="h-4 w-4 text-slate-400 ml-3 shrink-0" />
              <input
                autoFocus
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Movies, events, plays..."
                className="flex-1 bg-transparent px-2 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
            </div>
            <Button type="submit" className="bg-[#7B1E3D] hover:bg-[#5C0F2A] text-white font-semibold rounded-lg px-4">
              Go
            </Button>
          </form>
        </div>
      )}
    </header>
  );
}