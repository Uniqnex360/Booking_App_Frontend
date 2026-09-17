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
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        transparent
          ? 'bg-transparent py-4'
          : 'bg-white/95 backdrop-blur-md shadow-sm py-2.5 border-b border-slate-200'
      }`}
    >
      <nav className="mx-auto flex max-w-[1280px] items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link to="/" className="group flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#7B1E3D] to-[#9B1B3A] shadow-md transition-transform group-hover:scale-105">
            <Wine className="h-5 w-5 text-white" strokeWidth={2.2} />
          </div>
          <span
            className={`text-2xl font-bold tracking-tight ${
              transparent ? 'text-slate-900' : 'text-[#7B1E3D]'
            }`}
          >
            Vyhbz
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden items-center gap-8 lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className={`group relative text-sm font-semibold transition-colors ${
                transparent
                  ? 'text-slate-900/90 hover:text-slate-900'
                  : 'text-slate-700 hover:text-[#7B1E3D]'
              }`}
            >
              {link.label}
              <span className="absolute -bottom-1 left-0 h-0.5 w-0 bg-[#7B1E3D] transition-all duration-300 group-hover:w-full" />
            </Link>
          ))}
        </div>

        {/* Right Action Menu */}
        <div className="flex items-center gap-3">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={`flex items-center gap-2.5 rounded-full border p-1 pr-3 transition-all hover:shadow-md ${
                    transparent
                      ? 'border-slate-300 bg-white/80'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <Avatar className="h-8 w-8 border border-slate-200">
                    <AvatarFallback className="bg-[#FDF2F4] text-xs font-bold text-[#7B1E3D]">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden text-sm font-semibold sm:block text-slate-800">
                    {user.full_name?.split(' ')[0] || 'Account'}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 rounded-xl border-slate-200 bg-white text-slate-900 shadow-xl p-1"
              >
                <div className="px-3 py-2">
                  <p className="text-sm font-bold text-slate-900">
                    {user.full_name || 'Member'}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {user.email}
                  </p>
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

                {/* Partner Options */}
                {user.role === 'PARTNER' && (
                  <DropdownMenuItem
                    onClick={() => navigate('/partner/dashboard')}
                    className="hover:bg-[#FDF2F4] text-[#7B1E3D] focus:text-[#7B1E3D] cursor-pointer rounded-lg font-semibold"
                  >
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Partner Dashboard
                  </DropdownMenuItem>
                )}

                {user.role !== 'PARTNER' && user.role !== 'ADMIN' && (
                  <DropdownMenuItem
                    onClick={() => navigate('/partner/become')}
                    className="hover:bg-[#FDF2F4] text-[#7B1E3D] focus:text-[#7B1E3D] cursor-pointer rounded-lg font-semibold"
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Become a Partner
                  </DropdownMenuItem>
                )}

                {/* Admin Options */}
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
                  className="cursor-pointer text-rose-600 focus:text-rose-600 hover:bg-rose-50 rounded-lg font-medium"
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
                className="text-sm font-semibold text-slate-700 hover:text-[#7B1E3D] hover:bg-[#FDF2F4]"
              >
                <Link to="/login">Log in</Link>
              </Button>
              <Button
                asChild
                className="rounded-lg bg-[#7B1E3D] hover:bg-[#5C0F2A] px-5 text-sm font-semibold text-white shadow-sm"
              >
                <Link to="/register">Sign up</Link>
              </Button>
            </div>
          )}

          {/* Mobile Sheet Toggle */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden text-slate-900"
                aria-label="Open menu"
              >
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-[300px] border-slate-200 bg-white text-slate-900 p-0"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <span className="text-xl font-bold text-[#7B1E3D]">Menu</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileOpen(false)}
                  className="text-slate-500"
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
                    className="rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-[#FDF2F4] hover:text-[#7B1E3D]"
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="mt-4 border-t border-slate-100 pt-4 flex flex-col gap-1">
                  {user ? (
                    <>
                      <Link
                        to="/profile"
                        onClick={() => setMobileOpen(false)}
                        className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-[#FDF2F4]"
                      >
                        Profile
                      </Link>

                      {user.role === 'PARTNER' && (
                        <Link
                          to="/partner/dashboard"
                          onClick={() => setMobileOpen(false)}
                          className="rounded-lg px-3 py-2.5 text-sm font-semibold text-[#7B1E3D] hover:bg-[#FDF2F4]"
                        >
                          Partner Dashboard
                        </Link>
                      )}

                      {user.role === 'ADMIN' && (
                        <>
                          <Link
                            to="/admin/partners"
                            onClick={() => setMobileOpen(false)}
                            className="rounded-lg px-3 py-2.5 text-sm font-semibold text-[#7B1E3D] hover:bg-[#FDF2F4]"
                          >
                            Partner Verification
                          </Link>
                          <Link
                            to="/admin/moderation"
                            onClick={() => setMobileOpen(false)}
                            className="rounded-lg px-3 py-2.5 text-sm font-semibold text-[#7B1E3D] hover:bg-[#FDF2F4]"
                          >
                            Event Moderation
                          </Link>
                        </>
                      )}

                      {user.role !== 'PARTNER' && user.role !== 'ADMIN' && (
                        <Link
                          to="/partner/become"
                          onClick={() => setMobileOpen(false)}
                          className="rounded-lg px-3 py-2.5 text-sm font-semibold text-[#7B1E3D] hover:bg-[#FDF2F4]"
                        >
                          Become a Partner
                        </Link>
                      )}

                      <button
                        onClick={() => {
                          signOut();
                          setMobileOpen(false);
                        }}
                        className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-rose-600 hover:bg-rose-50 mt-2"
                      >
                        Sign out
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col gap-2 mt-2">
                      <Button
                        asChild
                        variant="outline"
                        className="rounded-lg border-slate-200 bg-transparent text-slate-900"
                      >
                        <Link to="/login" onClick={() => setMobileOpen(false)}>
                          Log in
                        </Link>
                      </Button>
                      <Button
                        asChild
                        className="rounded-lg bg-[#7B1E3D] hover:bg-[#5C0F2A] text-white font-semibold"
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