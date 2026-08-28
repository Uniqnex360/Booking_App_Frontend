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
          : 'glass shadow-soft py-2'
      }`}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        {/* <Link to="/" className="group flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl wine-gradient shadow-wine transition-transform group-hover:scale-105">
            <Wine className="h-5 w-5 text-white" strokeWidth={2.2} />
          </div>
          <span
            className={`font-serif text-2xl font-semibold tracking-tight ${
              transparent ? 'text-white' : 'text-wine-900'
            }`}
          >
            Vignette
          </span>
        </Link> */}

        {/* Desktop nav */}
        <div className="hidden items-center gap-8 lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className={`group relative text-sm font-medium transition-colors ${
                transparent
                  ? 'text-white/80 hover:text-white'
                  : 'text-foreground/70 hover:text-wine-700'
              }`}
            >
              {link.label}
              <span className="absolute -bottom-1 left-0 h-0.5 w-0 bg-wine-600 transition-all duration-300 group-hover:w-full" />
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
                      : 'border-border bg-card/50'
                  }`}
                >
                  <Avatar className="h-8 w-8 border border-wine-200">
                    <AvatarFallback className="bg-wine-100 text-xs font-semibold text-wine-700">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span
                    className={`hidden text-sm font-medium sm:block ${
                      transparent ? 'text-white' : 'text-foreground/80'
                    }`}
                  >
                    {user.full_name?.split(' ')[0] || 'Account'}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 rounded-xl border-border/60 shadow-soft-lg"
              >
                <div className="px-2 py-1.5">
                  <p className="text-sm font-semibold">
                    {user.full_name || 'Member'}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {user.email}
                  </p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/profile')}>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/profile')}>
                  <Calendar className="mr-2 h-4 w-4" />
                  My Bookings
                </DropdownMenuItem>
                {user.role === 'ADMIN' && (
                  <DropdownMenuItem onClick={() => navigate('/admin/users')}>
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Admin Dashboard
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => signOut()}
                  className="cursor-pointer text-destructive focus:text-destructive"
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
                    ? 'text-white/80 hover:text-white hover:bg-white/10'
                    : 'text-foreground/70 hover:text-wine-700'
                }`}
              >
                <Link to="/login">Log in</Link>
              </Button>
              <Button
                asChild
                className="rounded-full bg-wine-700 px-5 text-sm font-semibold text-white shadow-wine transition-all hover:bg-wine-800 hover:shadow-wine-lg"
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
                className="lg:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-[300px] border-border bg-card p-0"
            >
              <div className="flex items-center justify-between border-b border-border px-6 py-4">
                <span className="font-serif text-xl font-semibold text-wine-900">
                  Menu
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileOpen(false)}
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
                    className="rounded-lg px-3 py-2.5 text-sm font-medium text-foreground/70 transition-colors hover:bg-wine-50 hover:text-wine-700"
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="mt-4 border-t border-border pt-4">
                  {user ? (
                    <>
                      <Link
                        to="/profile"
                        onClick={() => setMobileOpen(false)}
                        className="rounded-lg px-3 py-2.5 text-sm font-medium text-foreground/70 hover:bg-wine-50"
                      >
                        Profile
                      </Link>
                      <button
                        onClick={() => {
                          signOut();
                          setMobileOpen(false);
                        }}
                        className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-destructive hover:bg-destructive/5"
                      >
                        Sign out
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <Button
                        asChild
                        variant="outline"
                        className="rounded-full"
                      >
                        <Link to="/login" onClick={() => setMobileOpen(false)}>
                          Log in
                        </Link>
                      </Button>
                      <Button
                        asChild
                        className="rounded-full bg-wine-700 text-white hover:bg-wine-800"
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
