import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader } from '@/components/common/Loader';
import { useAuth } from '@/hooks/useAuth';
import { getBookings } from '@/api/booking.api';
import type { Booking } from '@/types/booking.types';
import {
  Wine,
  Calendar,
  MapPin,
  Users,
  ArrowRight,
  Clock,
  CheckCircle2,
  Heart,
  Settings,
  Bell,
  Star,
  TrendingUp,
} from 'lucide-react';
import { formatCurrency } from '@/utils/currencyFormatter';
import { formatDate, isUpcoming } from '@/utils/dateFormatter';

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const data = await getBookings();
        setBookings(data);
      } catch {
        setBookings([]);
      } finally {
        setBookingsLoading(false);
      }
    };
    fetchBookings();
  }, []);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex justify-center py-20">
          <Loader className="h-8 w-8" />
        </div>
      </div>
    );
  }

  const initials = (user.full_name || user.email || 'U')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const upcoming = bookings.filter(
    (b) => b.status === 'CONFIRMED' && isUpcoming(b.booking_date)
  );
  const past = bookings.filter(
    (b) => b.status === 'COMPLETED' || !isUpcoming(b.booking_date)
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Header banner */}
      <div className="relative h-48 overflow-hidden wine-gradient lg:h-56">
        <div className="absolute inset-0 bg-wine-radial" />
        <div className="absolute -right-20 top-0 h-72 w-72 rounded-full bg-wine-500/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-wine-400/10 blur-3xl" />
      </div>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Profile header */}
        <div className="-mt-16 flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-4">
            <Avatar className="h-24 w-24 border-4 border-background shadow-wine-lg">
              <AvatarFallback className="bg-wine-700 font-serif text-2xl font-semibold text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="pb-2">
              <h1 className="font-serif text-3xl font-semibold text-wine-950">
                {user.full_name || 'Member'}
              </h1>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              {user.phone && (
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {user.phone}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2 pb-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full border-border bg-card"
            >
              <Link to ='/profile/edit'>
              <Settings className="mr-2 h-4 w-4" />
              </Link>
              Edit profile
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full border-border bg-card"
            >
              <Bell className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-8 grid grid-cols-3 gap-4">
          {[
            { label: 'Total bookings', value: bookings.length, icon: Calendar },
            { label: 'Upcoming', value: upcoming.length, icon: Clock },
            { label: 'Member since', value: '2026', icon: Star },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-border/50 bg-card p-4 text-center shadow-soft"
            >
              <stat.icon className="mx-auto mb-2 h-5 w-5 text-wine-600" />
              <p className="font-serif text-2xl font-semibold text-wine-900">
                {stat.value}
              </p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="bookings" className="mt-10" id="bookings">
          <TabsList className="grid w-full max-w-md grid-cols-3 rounded-xl bg-secondary/60 p-1">
            <TabsTrigger
              value="bookings"
              className="rounded-lg text-sm font-medium data-[state=active]:bg-card data-[state=active]:shadow-soft"
            >
              Bookings
            </TabsTrigger>
            <TabsTrigger
              value="saved"
              className="rounded-lg text-sm font-medium data-[state=active]:bg-card data-[state=active]:shadow-soft"
            >
              Saved
            </TabsTrigger>
            <TabsTrigger
              value="activity"
              className="rounded-lg text-sm font-medium data-[state=active]:bg-card data-[state=active]:shadow-soft"
            >
              Activity
            </TabsTrigger>
          </TabsList>

          {/* Bookings tab */}
          <TabsContent value="bookings" className="mt-6 space-y-8">
            {bookingsLoading ? (
              <div className="flex justify-center py-12">
                <Loader className="h-6 w-6" />
              </div>
            ) : bookings.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card/50 py-16 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-wine-50">
                  <Calendar className="h-7 w-7 text-wine-600" />
                </div>
                <h3 className="font-serif text-xl font-semibold text-wine-950">
                  No bookings yet
                </h3>
                <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                  When you book an experience, it&apos;ll show up here for easy
                  access.
                </p>
                <Button
                  asChild
                  className="mt-6 rounded-full bg-wine-700 px-6 text-sm font-semibold shadow-wine hover:bg-wine-800"
                >
                  <Link to="/">
                    Browse experiences
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            ) : (
              <>
                {upcoming.length > 0 && (
                  <div>
                    <h3 className="mb-4 flex items-center gap-2 font-serif text-xl font-semibold text-wine-950">
                      <Clock className="h-5 w-5 text-wine-600" />
                      Upcoming
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {upcoming.map((booking) => (
                        <BookingCard key={booking.id} booking={booking} />
                      ))}
                    </div>
                  </div>
                )}
                {past.length > 0 && (
                  <div>
                    <h3 className="mb-4 flex items-center gap-2 font-serif text-xl font-semibold text-wine-950">
                      <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
                      Past experiences
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {past.map((booking) => (
                        <BookingCard
                          key={booking.id}
                          booking={booking}
                          past
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* Saved tab */}
          <TabsContent value="saved" className="mt-6">
            <div className="rounded-2xl border border-dashed border-border bg-card/50 py-16 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-wine-50">
                <Heart className="h-7 w-7 text-wine-600" />
              </div>
              <h3 className="font-serif text-xl font-semibold text-wine-950">
                Nothing saved yet
              </h3>
              <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                Tap the heart icon on any experience to save it for later.
              </p>
            </div>
          </TabsContent>

          {/* Activity tab */}
          <TabsContent value="activity" className="mt-6">
            <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-soft">
              <h3 className="mb-4 flex items-center gap-2 font-serif text-xl font-semibold text-wine-950">
                <TrendingUp className="h-5 w-5 text-wine-600" />
                Recent activity
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3 border-b border-border/50 pb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-wine-50">
                    <Wine className="h-5 w-5 text-wine-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Joined Booking App</p>
                    <p className="text-xs text-muted-foreground">
                      Welcome to the community
                    </p>
                  </div>
                </div>
                {bookings.length > 0 && (
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-wine-50">
                      <Calendar className="h-5 w-5 text-wine-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">First booking made</p>
                      <p className="text-xs text-muted-foreground">
                        {bookings[bookings.length - 1]?.title}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <div className="h-20" />
    </div>
  );
}

function BookingCard({
  booking,
  past = false,
}: {
  booking: Booking;
  past?: boolean;
}) {
  return (
    <div
      className={`group overflow-hidden rounded-2xl border border-border/50 bg-card shadow-soft transition-all hover:shadow-soft-lg ${
        past ? 'opacity-80' : ''
      }`}
    >
      <div className="relative aspect-[16/9] overflow-hidden">
        {booking.image_url ? (
          <img
            src={booking.image_url}
            alt={booking.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center wine-gradient-soft">
            <Wine className="h-10 w-10 text-wine-400" />
          </div>
        )}
        <div className="absolute right-3 top-3">
          <Badge
            className={`rounded-full text-xs font-semibold ${
              past ? 'bg-muted text-muted-foreground' : 'bg-wine-700 text-white'
            }`}
          >
            {past ? 'Completed' : 'Confirmed'}
          </Badge>
        </div>
      </div>
      <div className="p-4">
        <h4 className="font-serif text-lg font-semibold text-wine-950">
          {booking.title}
        </h4>
        <p className="text-xs text-muted-foreground">{booking.venue}</p>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatDate(booking.booking_date)}
          </span>
          {booking.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {booking.location}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {booking.guests} {booking.guests === 1 ? 'guest' : 'guests'}
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-3">
          <span className="font-serif text-xl font-semibold text-wine-800">
            {formatCurrency(booking.total_price)}
          </span>
          {!past && (
            <Button
              size="sm"
              variant="outline"
              className="rounded-full border-wine-200 text-xs text-wine-700 hover:bg-wine-50"
            >
              View details
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
