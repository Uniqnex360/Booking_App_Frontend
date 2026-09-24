import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader } from "@/components/common/Loader";
import { useAuth } from "@/hooks/useAuth";
import { getBookings } from "@/api/booking.api";
import type { Booking } from "@/types/booking.types";
import {
  Wine,
  Calendar,
  MapPin,
  Users,
  ArrowRight,
  Settings,
  Star,
  Ticket,
  ChevronRight,
} from "lucide-react";
import { formatCurrency } from "@/utils/currencyFormatter";
import { formatDate, isUpcoming } from "@/utils/dateFormatter";

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
      <div className="min-h-screen bg-[#F5F5FA]">
        <Header />
        <div className="flex justify-center py-40">
          <Loader className="h-8 w-8" />
        </div>
      </div>
    );
  }

  const initials = (user.full_name || user.email || "U")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const upcoming = bookings.filter(
    (b) =>
      (b.status === "CONFIRMED" || b.status === "HELD") &&
      isUpcoming(b.starts_at ?? b.booking_date),
  );
  const past = bookings.filter((b) => !upcoming.some((u) => u.id === b.id));

  return (
    <div className="min-h-screen bg-[#F5F5FA] font-sans">
      <Header />

      <main className="mx-auto max-w-[1000px] w-full px-4 pt-28 lg:pt-[120px] pb-16">
        {/* Profile Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <Avatar className="h-20 w-20 sm:h-24 sm:w-24">
              <AvatarFallback className="bg-[#7B1E3D] text-2xl font-bold text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
                Hi, {user.full_name || "Member"}
              </h1>
              <p className="text-sm text-gray-500 mb-1">{user.email}</p>
              {user.phone && (
                <p className="text-sm text-gray-500">{user.phone}</p>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            className="rounded-lg border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900 sm:w-auto w-full"
            asChild
          >
            <Link to="/profile/edit">
              <Settings className="mr-2 h-4 w-4" />
              Edit Profile
            </Link>
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="bookings" className="mt-8">
          <TabsList className="flex w-full justify-start rounded-none border-b border-gray-200 bg-transparent p-0">
            <TabsTrigger
              value="bookings"
              className="rounded-none border-b-2 border-transparent px-6 py-3 text-sm font-semibold text-gray-500 hover:text-gray-700 data-[state=active]:border-[#7B1E3D] data-[state=active]:text-[#7B1E3D] data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              Your Orders
            </TabsTrigger>
            <TabsTrigger
              value="saved"
              className="rounded-none border-b-2 border-transparent px-6 py-3 text-sm font-semibold text-gray-500 hover:text-gray-700 data-[state=active]:border-[#7B1E3D] data-[state=active]:text-[#7B1E3D] data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              Saved
            </TabsTrigger>
            <TabsTrigger
              value="activity"
              className="rounded-none border-b-2 border-transparent px-6 py-3 text-sm font-semibold text-gray-500 hover:text-gray-700 data-[state=active]:border-[#7B1E3D] data-[state=active]:text-[#7B1E3D] data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              Activity
            </TabsTrigger>
          </TabsList>

          {/* Bookings tab */}
          <TabsContent value="bookings" className="mt-6 space-y-6">
            {bookingsLoading ? (
              <div className="flex justify-center py-12">
                <Loader className="h-6 w-6" />
              </div>
            ) : bookings.length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white py-16 text-center shadow-sm">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-50">
                  <Ticket className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">
                  No bookings found
                </h3>
                <p className="mx-auto mt-2 max-w-sm text-sm text-gray-500">
                  Looks like you haven't booked anything yet. Explore movies and
                  events around you.
                </p>
                <Button
                  asChild
                  className="mt-6 rounded-lg bg-[#7B1E3D] px-8 py-2 text-sm font-bold text-white hover:bg-[#5C0F2A]"
                >
                  <Link to="/">Explore Now</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-8">
                {upcoming.length > 0 && (
                  <div>
                    <h3 className="mb-4 text-lg font-bold text-gray-900 uppercase tracking-wide">
                      Upcoming Bookings
                    </h3>
                    <div className="grid gap-4">
                      {upcoming.map((booking) => (
                        <BookingCard key={booking.id} booking={booking} />
                      ))}
                    </div>
                  </div>
                )}
                {past.length > 0 && (
                  <div>
                    <h3 className="mb-4 text-lg font-bold text-gray-900 uppercase tracking-wide">
                      Past Bookings
                    </h3>
                    <div className="grid gap-4">
                      {past.map((booking) => (
                        <BookingCard key={booking.id} booking={booking} past />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Saved tab */}
          <TabsContent value="saved" className="mt-6">
            <div className="rounded-xl border border-gray-200 bg-white py-16 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-50">
                <Star className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">
                Nothing saved yet
              </h3>
              <p className="mx-auto mt-2 max-w-sm text-sm text-gray-500">
                Tap the heart icon on any experience to save it for later.
              </p>
            </div>
          </TabsContent>

          {/* Activity tab */}
          <TabsContent value="activity" className="mt-6">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-bold text-gray-900">
                Recent Activity
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-4 border-b border-gray-100 pb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#7B1E3D]/10">
                    <Wine className="h-5 w-5 text-[#7B1E3D]" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      Joined Vyhbz Platform
                    </p>
                    <p className="text-sm text-gray-500">
                      Welcome to the community
                    </p>
                  </div>
                </div>
                {bookings.length > 0 && (
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#7B1E3D]/10">
                      <Ticket className="h-5 w-5 text-[#7B1E3D]" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        First booking made
                      </p>
                      <p className="text-sm text-gray-500">
                        {bookings[bookings.length - 1]?.title}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
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
  const isMovie = booking.type === "MOVIE" && !!booking.starts_at;
  const bookingDate = new Date(booking.starts_at || booking.booking_date);

  return (
    <div
      className={`group flex flex-col sm:flex-row overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md ${
        past ? "opacity-75" : ""
      }`}
    >
      {/* Left Image Section (Poster style like BMS) */}
      <div className="relative w-full sm:w-36 shrink-0 aspect-video sm:aspect-[2/3] bg-gray-100">
        {booking.image_url ? (
          <img
            src={booking.image_url}
            alt={booking.movie_title ?? booking.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gray-200">
            <Ticket className="h-10 w-10 text-gray-400" />
          </div>
        )}
      </div>

      {/* Right Details Section */}
      <div className="flex flex-1 flex-col justify-between p-5">
        <div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h4 className="text-lg font-bold text-gray-900 leading-tight">
                {booking.movie_title ?? booking.title}
              </h4>

              {isMovie ? (
                <>
                  {(booking.language || booking.format) && (
                    <p className="mt-1 text-sm text-gray-500 font-medium">
                      {[booking.language, booking.format]
                        .filter(Boolean)
                        .join(" • ")}
                    </p>
                  )}
                  {(booking.cinema_name || booking.screen_name) && (
                    <p className="mt-3 text-sm font-semibold text-gray-800">
                      {booking.cinema_name}
                      {booking.screen_name ? `: ${booking.screen_name}` : ""}
                    </p>
                  )}
                  <p className="mt-1 text-sm text-gray-600">
                    {bookingDate.toLocaleString("en-IN", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                    {" | "}
                    {bookingDate.toLocaleString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-1 text-sm text-gray-500 font-medium">
                    {booking.venue}
                  </p>
                  <p className="mt-3 text-sm font-semibold text-gray-800">
                    {formatDate(booking.booking_date)}
                  </p>
                  {booking.location && (
                    <p className="mt-1 text-sm text-gray-600 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {booking.location}
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Status Badge */}
            <Badge
              className={`whitespace-nowrap px-3 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                past
                  ? "bg-gray-100 text-gray-600 hover:bg-gray-100"
                  : "bg-green-100 text-green-700 hover:bg-green-100"
              }`}
            >
              {past ? "Completed" : "Confirmed"}
            </Badge>
          </div>

          {/* Seats Info */}
          {isMovie && booking.seat_codes && booking.seat_codes.length > 0 ? (
            <p className="mt-4 text-sm font-semibold text-gray-800 bg-gray-50 inline-block px-3 py-1.5 rounded-md border border-gray-100">
              <span className="text-gray-500 font-normal">Ticket(s):</span>{" "}
              {booking.seat_codes.join(", ")}
            </p>
          ) : !isMovie && booking.guests ? (
            <p className="mt-4 text-sm font-semibold text-gray-800 bg-gray-50 inline-block px-3 py-1.5 rounded-md border border-gray-100">
              <span className="text-gray-500 font-normal">Guests:</span>{" "}
              <Users className="h-3 w-3 inline mr-1" />
              {booking.guests}
            </p>
          ) : null}
        </div>

        {/* Footer (Price & Actions) */}
        <div className="mt-5 flex flex-wrap items-center justify-between border-t border-gray-100 pt-4 gap-4">
          <div className="flex gap-8">
            {booking.ref_code && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-0.5">
                  Booking ID
                </p>
                <p className="font-mono text-sm font-bold text-gray-900">
                  {booking.ref_code}
                </p>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-0.5">
                Total Amount
              </p>
              <p className="text-sm font-bold text-gray-900">
                {formatCurrency(booking.total_price)}
              </p>
            </div>
          </div>

          {!past && (
            <Button
              asChild
              variant="link"
              className="text-[#7B1E3D] hover:text-[#5C0F2A] font-bold p-0 h-auto gap-1"
            >
              <Link to={`/bookings/${booking.id}`}>
                View Details <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}