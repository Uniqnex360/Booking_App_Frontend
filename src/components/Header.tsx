import { useState, useEffect } from 'react';
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
} from 'lucide-react';

const navLinks = [
  { href: '/movies', label: 'Movies' },
  { href: '/events', label: 'Events' },
  { href: '/restaurants', label: 'Restaurants' },
];

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const isHome = location.pathname === '/';
  const transparent = isHome && !scrolled;

  const initials = (user?.full_name || user?.email || 'U')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        transparent
          ? 'bg-transparent py-4'
          : 'glass shadow-soft py-2 border-b border-slate-200'
      }`}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link to="/" className="group flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 shadow-sm transition-transform group-hover:scale-105">
            <Wine className="h-5 w-5 text-slate-900" strokeWidth={2.2} />
          </div>
          <span
            className={`font-serif text-2xl font-semibold tracking-tight ${
              transparent ? 'text-slate-900' : 'text-slate-800'
            }`}
          >
            Vyhbz
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-8 lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className={`group relative text-sm font-medium transition-colors ${
                transparent
                  ? 'text-slate-900/80 hover:text-slate-900'
                  : 'text-slate-700 hover:text-amber-500'
              }`}
            >
              {link.label}
              <span className="absolute -bottom-1 left-0 h-0.5 w-0 bg-amber-500 transition-all duration-300 group-hover:w-full" />
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={`flex items-center gap-2 rounded-full border p-1 pr-3 transition-all hover:shadow-soft ${
                    transparent
                      ? 'border-white/20 bg-white/10'
                      : 'border-slate-200 bg-white/50'
                  }`}
                >
                  <Avatar className="h-8 w-8 border border-slate-200">
                    <AvatarFallback className="bg-neutral-100 text-xs font-semibold text-amber-500">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span
                    className={`hidden text-sm font-medium sm:block ${
                      transparent ? 'text-slate-900' : 'text-slate-800'
                    }`}
                  >
                    {user.full_name?.split(' ')[0] || 'Account'}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 rounded-xl border-slate-200 bg-white text-slate-900 shadow-soft-lg"
              >
                <div className="px-2 py-1.5">
                  <p className="text-sm font-semibold">
                    {user.full_name || 'Member'}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {user.email}
                  </p>
                </div>
                <DropdownMenuSeparator className="bg-neutral-100" />
                
                <DropdownMenuItem onClick={() => navigate('/profile')} className="hover:bg-neutral-100 cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                
                <DropdownMenuItem onClick={() => navigate('/profile')} className="hover:bg-neutral-100 cursor-pointer">
                  <Calendar className="mr-2 h-4 w-4" />
                  My Bookings
                </DropdownMenuItem>

                {/* Partner Option */}
                {user.role === 'PARTNER' && (
                  <DropdownMenuItem onClick={() => navigate('/partner/dashboard')} className="hover:bg-neutral-100 text-amber-500 focus:text-amber-500 cursor-pointer">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Partner Dashboard
                  </DropdownMenuItem>
                )}

                {user.role !== 'PARTNER' && user.role !== 'ADMIN' && (
                  <DropdownMenuItem onClick={() => navigate('/partner/become')} className="hover:bg-neutral-100 text-amber-500 focus:text-amber-500 cursor-pointer">
                    <Sparkles className="mr-2 h-4 w-4" />
                    Become a Partner
                  </DropdownMenuItem>
                )}

                {/* Admin Options */}
                {user.role === 'ADMIN' && (
                  <>
                    <DropdownMenuSeparator className="bg-neutral-100" />
                    <DropdownMenuItem onClick={() => navigate('/admin/partners')} className="hover:bg-neutral-100 cursor-pointer">
                      <Users className="mr-2 h-4 w-4 text-amber-500" />
                      Partner Verification
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/admin/moderation')} className="hover:bg-neutral-100 cursor-pointer">
                      <ShieldCheck className="mr-2 h-4 w-4 text-amber-500" />
                      Event Moderation
                    </DropdownMenuItem>
                  </>
                )}
                
                <DropdownMenuSeparator className="bg-neutral-100" />
                
                <DropdownMenuItem
                  onClick={() => signOut()}
                  className="cursor-pointer text-rose-500 focus:text-rose-500 hover:bg-rose-500/10"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Button
                asChild
                variant="ghost"
                className={`text-sm font-medium ${
                  transparent
                    ? 'text-slate-900/80 hover:text-slate-900 hover:bg-white/10'
                    : 'text-slate-700 hover:text-amber-500 hover:bg-white'
                }`}
              >
                <Link to="/login">Log in</Link>
              </Button>
              <Button
                asChild
                className="rounded-full bg-amber-500 px-5 text-sm font-semibold text-black transition-all hover:bg-amber-600"
              >
                <Link to="/register">Sign up</Link>
              </Button>
            </div>
          )}

          {/* Mobile menu */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden text-slate-900"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-[300px] border-slate-200 bg-neutral-50 text-slate-900 p-0"
            >
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                <span className="font-serif text-xl font-semibold">
                  Menu
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileOpen(false)}
                  className="text-slate-900"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <div className="flex flex-col gap-1 px-4 py-4">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-white hover:text-amber-500"
                  >
                    {link.label}
                  </Link>
                ))} 
                <div className="mt-4 border-t border-slate-200 pt-4 flex flex-col gap-1">
                  {user ? (
                    <>
                      <Link
                        to="/profile"
                        onClick={() => setMobileOpen(false)}
                        className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-white"
                      >
                        Profile
                      </Link>
                      
                      {user.role === 'PARTNER' && (
                        <Link
                          to="/partner/dashboard"
                          onClick={() => setMobileOpen(false)}
                          className="rounded-lg px-3 py-2.5 text-sm font-medium text-amber-500 hover:bg-white"
                        >
                          Partner Dashboard
                        </Link>
                      )}

                      {user.role === 'ADMIN' && (
                        <>
                          <Link
                            to="/admin/partners"
                            onClick={() => setMobileOpen(false)}
                            className="rounded-lg px-3 py-2.5 text-sm font-medium text-amber-500 hover:bg-white"
                          >
                            Partner Verification
                          </Link>
                          <Link
                            to="/admin/moderation"
                            onClick={() => setMobileOpen(false)}
                            className="rounded-lg px-3 py-2.5 text-sm font-medium text-amber-500 hover:bg-white"
                          >
                            Event Moderation
                          </Link>
                        </>
                      )}

                      {user.role !== 'PARTNER' && user.role !== 'ADMIN' && (
                        <Link
                          to="/partner/become"
                          onClick={() => setMobileOpen(false)}
                          className="rounded-lg px-3 py-2.5 text-sm font-medium text-amber-500 hover:bg-white"
                        >
                          Become a Partner
                        </Link>
                      )}

                      <button
                        onClick={() => {
                          signOut();
                          setMobileOpen(false);
                        }}
                        className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-rose-500 hover:bg-rose-500/10"
                      >
                        Sign out
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col gap-2 mt-2">
                      <Button
                        asChild
                        variant="outline"
                        className="rounded-full border-slate-200 bg-transparent text-slate-900"
                      >
                        <Link to="/login" onClick={() => setMobileOpen(false)}>
                          Log in
                        </Link>
                      </Button>
                      <Button
                        asChild
                        className="rounded-full bg-amber-500 text-black font-bold"
                      >
                        <Link to="/register" onClick={() => setMobileOpen(false)}>
                          Sign up
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
}
