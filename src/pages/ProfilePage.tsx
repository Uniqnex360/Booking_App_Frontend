import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader } from "@/components/common/Loader";
import { useAuth } from "@/hooks/useAuth";
import { getBookings } from "@/api/booking.api";
import type { Booking } from "@/types/booking.types";
import {
  Calendar,
  MapPin,
  Users,
  ChevronRight,
  User,
  ListOrdered,
  Heart,
  LogOut,
  X,
  Pencil,
  Check,
  Ticket,
} from "lucide-react";
import { formatCurrency } from "@/utils/currencyFormatter";
import { formatDate, isUpcoming } from "@/utils/dateFormatter";

type Tab = "profile" | "orders" | "saved";

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  
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
    if (user) fetchBookings();
  }, [user]);

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

  // Derive split names for the form
  const firstName = user.full_name?.split(" ")[0] || "";
  const lastName = user.full_name?.split(" ").slice(1).join(" ") || "";

  // Filter Bookings
  const upcoming = bookings.filter(
    (b) =>
      (b.status === "CONFIRMED" || b.status === "HELD") &&
      isUpcoming(b.starts_at ?? b.booking_date),
  );
  const past = bookings.filter((b) => !upcoming.some((u) => u.id === b.id));

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-[#F5F5FA] font-sans">
      <Header />

      <main className="mx-auto max-w-[1200px] w-full px-4 pt-24 lg:pt-[120px] pb-16 flex flex-col lg:flex-row gap-6">
        
        {/* Left Sidebar Menu */}
        <aside className="w-full lg:w-72 shrink-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden h-fit">
          <div className="p-5 flex items-center justify-between border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-900">My Account</h2>
            <button className="text-gray-400 hover:text-gray-700 transition lg:hidden" onClick={() => navigate("/")}>
              <X size={20} />
            </button>
          </div>
          <nav className="flex flex-col py-2">
            <SidebarItem 
              icon={User} 
              label="Profile" 
              active={activeTab === "profile"} 
              onClick={() => setActiveTab("profile")} 
            />
            <SidebarItem 
              icon={ListOrdered} 
              label="Your Orders" 
              active={activeTab === "orders"} 
              onClick={() => setActiveTab("orders")} 
            />
            <SidebarItem 
              icon={Heart} 
              label="Your Wishlist" 
              active={activeTab === "saved"} 
              onClick={() => setActiveTab("saved")} 
            />
            
            <div className="my-2 border-t border-gray-100 mx-4" />
            
            <button 
              onClick={handleSignOut}
              className="flex items-center gap-4 px-6 py-3 text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition text-sm font-medium w-full text-left"
            >
              <LogOut size={18} />
              Sign Out
            </button>
          </nav>
        </aside>

        {/* Right Main Content */}
        <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm p-6 sm:p-10 min-h-[600px]">
          
          {/* PROFILE VIEW */}
          {activeTab === "profile" && (
            <div className="animate-in fade-in duration-300">
              {/* Avatar & Name Header */}
              <div className="flex flex-col sm:flex-row items-center gap-6 mb-12">
                <div className="h-28 w-28 rounded-full bg-gray-400 flex items-end justify-center overflow-hidden shrink-0 border-4 border-white shadow-md">
                   <User className="h-20 w-20 text-white translate-y-2" />
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 text-center sm:text-left">
                  {user.full_name || "Member"}
                </h1>
              </div>

              {/* Account Details */}
              <div className="mb-10">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Account Details</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Mobile Number */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-medium text-gray-600">Mobile Number</label>
                      <button className="text-xs font-semibold text-[#7B1E3D] flex items-center gap-1 hover:underline">
                        <Pencil size={12}/> Edit
                      </button>
                    </div>
                    <div className="border border-gray-200 rounded-lg p-3.5 bg-gray-50 flex justify-between items-center">
                      <span className="text-gray-800 text-sm font-medium">{user.phone || "Not provided"}</span>
                      {user.phone && <Check size={18} className="text-green-500" />}
                    </div>
                  </div>
                  {/* Email Address */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-medium text-gray-600">Email Address</label>
                      <button className="text-xs font-semibold text-[#7B1E3D] flex items-center gap-1 hover:underline">
                        <Pencil size={12}/> Edit
                      </button>
                    </div>
                    <div className="border border-gray-200 rounded-lg p-3.5 bg-gray-50 flex justify-between items-center">
                      <span className="text-gray-800 text-sm font-medium">{user.email}</span>
                      {user.email && <Check size={18} className="text-green-500" />}
                    </div>
                  </div>
                </div>
              </div>

              {/* Personal Details */}
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-6">Personal Details</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* First Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">First Name <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      value={firstName} 
                      disabled
                      className="w-full border border-gray-200 rounded-lg p-3.5 text-gray-800 text-sm font-medium bg-white focus:outline-none" 
                    />
                  </div>
                  {/* Last Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">Last Name <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      value={lastName} 
                      disabled
                      className="w-full border border-gray-200 rounded-lg p-3.5 text-gray-800 text-sm font-medium bg-white focus:outline-none" 
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ORDERS VIEW */}
          {activeTab === "orders" && (
            <div className="animate-in fade-in duration-300">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Orders</h2>
              
              {bookingsLoading ? (
                <div className="flex justify-center py-12">
                  <Loader className="h-6 w-6" />
                </div>
              ) : bookings.length === 0 ? (
                <div className="rounded-xl border border-gray-200 bg-gray-50 py-16 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm">
                    <Ticket className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">No bookings found</h3>
                  <p className="mx-auto mt-2 max-w-sm text-sm text-gray-500">
                    Looks like you haven't booked anything yet.
                  </p>
                  <Button asChild className="mt-6 bg-[#7B1E3D] hover:bg-[#5C0F2A]">
                    <Link to="/">Explore Now</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-8">
                  {upcoming.length > 0 && (
                    <div>
                      <h3 className="mb-4 text-sm font-bold text-gray-500 uppercase tracking-wider">Upcoming</h3>
                      <div className="grid gap-4">
                        {upcoming.map((booking) => (
                          <BookingCard key={booking.id} booking={booking} />
                        ))}
                      </div>
                    </div>
                  )}
                  {past.length > 0 && (
                    <div>
                      <h3 className="mb-4 text-sm font-bold text-gray-500 uppercase tracking-wider">Past</h3>
                      <div className="grid gap-4">
                        {past.map((booking) => (
                          <BookingCard key={booking.id} booking={booking} past />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* SAVED VIEW */}
          {activeTab === "saved" && (
            <div className="animate-in fade-in duration-300 text-center py-20">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-50">
                <Heart className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Your Wishlist is Empty</h3>
              <p className="mx-auto mt-2 max-w-sm text-sm text-gray-500">
                Save events and movies to find them easily later.
              </p>
            </div>
          )}
          
        </div>
      </main>
    </div>
  );
}


/* --- SUB-COMPONENTS --- */

function SidebarItem({ icon: Icon, label, active, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center justify-between px-6 py-3.5 transition w-full text-left group ${
        active ? "bg-gray-50 border-r-4 border-[#7B1E3D]" : "hover:bg-gray-50 border-r-4 border-transparent"
      }`}
    >
      <div className="flex items-center gap-4">
        <div className={`p-1.5 rounded-full ${active ? "text-[#7B1E3D]" : "text-gray-400 group-hover:text-gray-600"}`}>
          <Icon size={18} strokeWidth={active ? 2.5 : 2} />
        </div>
        <span className={`text-sm ${active ? "font-bold text-[#7B1E3D]" : "font-medium text-gray-600 group-hover:text-gray-900"}`}>
          {label}
        </span>
      </div>
      {active && <ChevronRight size={16} className="text-[#7B1E3D]" />}
    </button>
  );
}

function BookingCard({ booking, past = false }: { booking: Booking; past?: boolean; }) {
  const isMovie = booking.type === "MOVIE" && !!booking.starts_at;
  const bookingDate = new Date(booking.starts_at || booking.booking_date);

  return (
    <div className={`group flex flex-col sm:flex-row overflow-hidden rounded-xl border border-gray-200 bg-white hover:shadow-md transition-all ${past ? "opacity-75" : ""}`}>
      {/* Left Image Section */}
      <div className="relative w-full sm:w-36 shrink-0 aspect-[16/9] sm:aspect-[2/3] bg-gray-100">
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
                      {[booking.language, booking.format].filter(Boolean).join(" • ")}
                    </p>
                  )}
                  {(booking.cinema_name || booking.screen_name) && (
                    <p className="mt-3 text-sm font-semibold text-gray-800">
                      {booking.cinema_name}{booking.screen_name ? `: ${booking.screen_name}` : ""}
                    </p>
                  )}
                  <p className="mt-1 text-sm text-gray-600">
                    {bookingDate.toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                    {" | "}
                    {bookingDate.toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-1 text-sm text-gray-500 font-medium">{booking.venue}</p>
                  <p className="mt-3 text-sm font-semibold text-gray-800">{formatDate(booking.booking_date)}</p>
                  {booking.location && (
                    <p className="mt-1 text-sm text-gray-600 flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {booking.location}
                    </p>
                  )}
                </>
              )}
            </div>
            <Badge className={`whitespace-nowrap px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${past ? "bg-gray-100 text-gray-600 hover:bg-gray-100" : "bg-green-100 text-green-700 hover:bg-green-100"}`}>
              {past ? "Completed" : "Confirmed"}
            </Badge>
          </div>

          {/* Seats Info */}
          {isMovie && booking.seat_codes && booking.seat_codes.length > 0 ? (
            <p className="mt-4 text-sm font-semibold text-gray-800 bg-gray-50 inline-block px-3 py-1.5 rounded border border-gray-100">
              <span className="text-gray-500 font-normal">Ticket(s):</span> {booking.seat_codes.join(", ")}
            </p>
          ) : !isMovie && booking.guests ? (
            <p className="mt-4 text-sm font-semibold text-gray-800 bg-gray-50 inline-block px-3 py-1.5 rounded border border-gray-100">
              <span className="text-gray-500 font-normal">Guests:</span> <Users className="h-3 w-3 inline mr-1" /> {booking.guests}
            </p>
          ) : null}
        </div>

        {/* Footer */}
        <div className="mt-5 flex flex-wrap items-center justify-between border-t border-gray-100 pt-4 gap-4">
          <div className="flex gap-8">
            {booking.ref_code && (
              <div>
                <p className="text-xs text-gray-500 uppercase font-medium mb-0.5">Booking ID</p>
                <p className="font-mono text-sm font-bold text-gray-900">{booking.ref_code}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium mb-0.5">Total Amount</p>
              <p className="text-sm font-bold text-gray-900">{formatCurrency(booking.total_price)}</p>
            </div>
          </div>
          {!past && (
            <Button asChild variant="link" className="text-[#7B1E3D] font-bold p-0 h-auto gap-1 hover:text-[#5C0F2A] hover:no-underline group">
              <Link to={`/bookings/${booking.id}`}>
                View Details <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}