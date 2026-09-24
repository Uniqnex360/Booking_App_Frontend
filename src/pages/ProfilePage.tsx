import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader } from "@/components/common/Loader";
import { useAuth } from "@/hooks/useAuth";
import { getBookings } from "@/api/booking.api";
import {
  getExtendedProfile,
  updateProfile,
} from "@/api/profile.api"; // ← adjust path if different
import type { Booking } from "@/types/booking.types";
import type {
  ExtendedProfile,
  Gender,
  ProfileUpdatePayload,
} from "@/types/profile.types";
import {
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
  Loader2,
  Calendar as CalendarIcon,
} from "lucide-react";
import { formatCurrency } from "@/utils/currencyFormatter";
import { formatDate, isUpcoming } from "@/utils/dateFormatter";
import { toast } from "sonner";

type Tab = "profile" | "orders" | "saved";

const GENDER_OPTIONS: { label: string; value: Gender }[] = [
  { label: "Woman", value: "Female" },
  { label: "Man", value: "Male" },
  { label: "Other", value: "Other" },
  { label: "Prefer not to say", value: "Prefer not to say" },
];

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, loading, signOut, refreshUser } = useAuth() as any;

  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);

  const [profile, setProfile] = useState<ExtendedProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Account fields (from auth user)
  const [editingPhone, setEditingPhone] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  // Personal fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState(""); // yyyy-mm-dd for input[type=date]
  const [gender, setGender] = useState<Gender | "">("");
  const [preferredLanguage, setPreferredLanguage] = useState("en");
  const [bio, setBio] = useState("");

  // ---- Load auth user into form ----
  useEffect(() => {
    if (!user) return;
    const parts = (user.full_name || "").trim().split(/\s+/);
    setFirstName(parts[0] || "");
    setLastName(parts.slice(1).join(" ") || "");
    setPhone(user.phone || "");
    setEmail(user.email || "");
  }, [user]);

  // ---- Load extended profile ----
  useEffect(() => {
    const load = async () => {
      try {
        const data = await getExtendedProfile();
        setProfile(data);
        setDateOfBirth(data.date_of_birth ? data.date_of_birth.slice(0, 10) : "");
        setGender(data.gender || "");
        setPreferredLanguage(data.preferred_language || "en");
        setBio(data.bio || "");
      } catch {
        // Profile row may not exist yet — form still usable
        setProfile(null);
      } finally {
        setProfileLoading(false);
      }
    };
    if (user) load();
  }, [user]);

  // ---- Load bookings ----
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

  const handleSaveProfile = async () => {
    if (!firstName.trim()) {
      toast.error("First name is required");
      return;
    }

    const payload: ProfileUpdatePayload = {
      date_of_birth: dateOfBirth || undefined,
      gender: gender || undefined,
      preferred_language: preferredLanguage || undefined,
      bio: bio.trim() || undefined,
    };

    setSaving(true);
    try {
      const updated = await updateProfile(payload);
      setProfile(updated);

      // Keep local fields in sync with server response
      setDateOfBirth(updated.date_of_birth ? updated.date_of_birth.slice(0, 10) : "");
      setGender(updated.gender || "");
      setPreferredLanguage(updated.preferred_language || "en");
      setBio(updated.bio || "");

      setEditingPhone(false);
      setEditingEmail(false);

      if (typeof refreshUser === "function") {
        await refreshUser();
      }

      toast.success("Profile updated successfully");
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to update profile";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // Detect dirty extended-profile fields
  const hasChanges =
    (dateOfBirth || "") !== (profile?.date_of_birth?.slice(0, 10) || "") ||
    (gender || "") !== (profile?.gender || "") ||
    (preferredLanguage || "") !== (profile?.preferred_language || "en") ||
    (bio || "") !== (profile?.bio || "");

  return (
    <div className="min-h-screen bg-[#F5F5FA] font-sans">
      <Header />

      <main className="mx-auto max-w-[1200px] w-full px-4 pt-24 lg:pt-[120px] pb-16 flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <aside className="w-full lg:w-72 shrink-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden h-fit">
          <div className="p-5 flex items-center justify-between border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-900">My Account</h2>
            <button
              className="text-gray-400 hover:text-gray-700 transition lg:hidden"
              onClick={() => navigate("/")}
            >
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

        {/* Content */}
        <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm p-6 sm:p-10 min-h-[600px]">
          {activeTab === "profile" && (
            <div className="animate-in fade-in duration-300">
              {profileLoading ? (
                <div className="flex justify-center py-20">
                  <Loader className="h-6 w-6" />
                </div>
              ) : (
                <>
                  {/* Header row */}
                  <div className="flex flex-col sm:flex-row items-center gap-6 mb-12">
                    <div className="h-28 w-28 rounded-full bg-gray-200 flex items-end justify-center overflow-hidden shrink-0 border border-gray-100 shadow-sm">
                      {profile?.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt={user.full_name || "Avatar"}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <User className="h-20 w-20 text-gray-400 translate-y-2" />
                      )}
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 text-center sm:text-left">
                      {user.full_name || "Member"}
                    </h1>
                  </div>

                  {/* Account Details */}
                  <div className="mb-10">
                    <h2 className="text-xl font-bold text-gray-900 mb-6">
                      Account Details
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {/* Phone (display from auth — see note) */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-sm font-medium text-gray-600">
                            Mobile Number
                          </label>
                          <button
                            type="button"
                            onClick={() => setEditingPhone((v) => !v)}
                            className="text-xs font-semibold text-[#7B1E3D] flex items-center gap-1 hover:underline"
                          >
                            <Pencil size={12} />
                            {editingPhone ? "Cancel" : "Edit"}
                          </button>
                        </div>
                        <div className="border border-gray-200 rounded-lg p-3.5 bg-gray-50 flex justify-between items-center gap-2">
                          {editingPhone ? (
                            <input
                              type="tel"
                              value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                              className="w-full bg-transparent outline-none text-sm font-medium text-gray-800"
                              placeholder="+91 9876543210"
                            />
                          ) : (
                            <span className="text-gray-800 text-sm font-medium">
                              {phone || "Not provided"}
                            </span>
                          )}
                          {!editingPhone && !!phone && (
                            <Check size={18} className="text-green-500 shrink-0" />
                          )}
                        </div>
                      </div>

                      {/* Email (display from auth — see note) */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-sm font-medium text-gray-600">
                            Email Address
                          </label>
                          <button
                            type="button"
                            onClick={() => setEditingEmail((v) => !v)}
                            className="text-xs font-semibold text-[#7B1E3D] flex items-center gap-1 hover:underline"
                          >
                            <Pencil size={12} />
                            {editingEmail ? "Cancel" : "Edit"}
                          </button>
                        </div>
                        <div className="border border-gray-200 rounded-lg p-3.5 bg-gray-50 flex justify-between items-center gap-2">
                          {editingEmail ? (
                            <input
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              className="w-full bg-transparent outline-none text-sm font-medium text-gray-800"
                            />
                          ) : (
                            <span className="text-gray-800 text-sm font-medium">
                              {email}
                            </span>
                          )}
                          {!editingEmail && !!email && (
                            <Check size={18} className="text-green-500 shrink-0" />
                          )}
                        </div>
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-gray-400">
                      Mobile &amp; email are managed by your login account. Contact support to change verified credentials if required.
                    </p>
                  </div>

                  {/* Personal Details */}
                  <div className="mb-8">
                    <h2 className="text-xl font-bold text-gray-900 mb-6">
                      Personal Details
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-2">
                          First Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={firstName}
                          disabled
                          className="w-full border border-gray-200 rounded-lg p-3.5 text-gray-800 text-sm font-medium bg-gray-50"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-2">
                          Last Name
                        </label>
                        <input
                          type="text"
                          value={lastName}
                          disabled
                          className="w-full border border-gray-200 rounded-lg p-3.5 text-gray-800 text-sm font-medium bg-gray-50"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                      {/* Birthday */}
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-2">
                          Birthday (Optional)
                        </label>
                        <div className="relative">
                          <input
                            type="date"
                            value={dateOfBirth}
                            onChange={(e) => setDateOfBirth(e.target.value)}
                            className="w-full border border-gray-200 rounded-lg p-3.5 text-gray-800 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-[#7B1E3D]/30 focus:border-[#7B1E3D]"
                          />
                          <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                        </div>
                      </div>

                      {/* Identity / Gender — BMS pill buttons */}
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-2">
                          Identity (Optional)
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {GENDER_OPTIONS.map((opt) => {
                            const active = gender === opt.value;
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() =>
                                  setGender(active ? "" : opt.value)
                                }
                                className={`px-4 py-2 rounded-lg text-sm font-semibold border transition ${
                                  active
                                    ? "border-[#7B1E3D] text-[#7B1E3D] bg-[#7B1E3D]/5"
                                    : "border-gray-200 text-gray-600 hover:border-gray-300 bg-white"
                                }`}
                              >
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Preferred language */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-2">
                          Preferred Language
                        </label>
                        <select
                          value={preferredLanguage}
                          onChange={(e) => setPreferredLanguage(e.target.value)}
                          className="w-full border border-gray-200 rounded-lg p-3.5 text-gray-800 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-[#7B1E3D]/30 focus:border-[#7B1E3D]"
                        >
                          <option value="en">English</option>
                          <option value="ml">Malayalam</option>
                          <option value="ta">Tamil</option>
                          <option value="hi">Hindi</option>
                          <option value="te">Telugu</option>
                        </select>
                      </div>
                    </div>

                    {/* Bio */}
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">
                        Bio (Optional)
                      </label>
                      <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        rows={3}
                        placeholder="A short bio about you"
                        className="w-full border border-gray-200 rounded-lg p-3.5 text-gray-800 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-[#7B1E3D]/30 focus:border-[#7B1E3D] resize-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="button"
                      disabled={saving || !hasChanges}
                      onClick={handleSaveProfile}
                      className="bg-[#7B1E3D] hover:bg-[#5C0F2A] text-white font-semibold px-8 rounded-lg disabled:opacity-50"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Saving…
                        </>
                      ) : (
                        "Save Changes"
                      )}
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ORDERS — same as before */}
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
                    Looks like you haven&apos;t booked anything yet.
                  </p>
                  <Button asChild className="mt-6 bg-[#7B1E3D] hover:bg-[#5C0F2A]">
                    <Link to="/">Explore Now</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-8">
                  {upcoming.length > 0 && (
                    <div>
                      <h3 className="mb-4 text-sm font-bold text-gray-500 uppercase tracking-wider">
                        Upcoming
                      </h3>
                      <div className="grid gap-4">
                        {upcoming.map((b) => (
                          <BookingCard key={b.id} booking={b} />
                        ))}
                      </div>
                    </div>
                  )}
                  {past.length > 0 && (
                    <div>
                      <h3 className="mb-4 text-sm font-bold text-gray-500 uppercase tracking-wider">
                        Past
                      </h3>
                      <div className="grid gap-4">
                        {past.map((b) => (
                          <BookingCard key={b.id} booking={b} past />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

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

function SidebarItem({ icon: Icon, label, active, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-between px-6 py-3.5 transition w-full text-left group ${
        active
          ? "bg-gray-50 border-r-4 border-[#7B1E3D]"
          : "hover:bg-gray-50 border-r-4 border-transparent"
      }`}
    >
      <div className="flex items-center gap-4">
        <div
          className={`p-1.5 rounded-full ${
            active ? "text-[#7B1E3D]" : "text-gray-400 group-hover:text-gray-600"
          }`}
        >
          <Icon size={18} strokeWidth={active ? 2.5 : 2} />
        </div>
        <span
          className={`text-sm ${
            active
              ? "font-bold text-[#7B1E3D]"
              : "font-medium text-gray-600 group-hover:text-gray-900"
          }`}
        >
          {label}
        </span>
      </div>
      {active && <ChevronRight size={16} className="text-[#7B1E3D]" />}
    </button>
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
      className={`group flex flex-col sm:flex-row overflow-hidden rounded-xl border border-gray-200 bg-white hover:shadow-md transition-all ${
        past ? "opacity-75" : ""
      }`}
    >
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
                      <MapPin className="h-3 w-3" /> {booking.location}
                    </p>
                  )}
                </>
              )}
            </div>
            <Badge
              className={`whitespace-nowrap px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                past
                  ? "bg-gray-100 text-gray-600 hover:bg-gray-100"
                  : "bg-green-100 text-green-700 hover:bg-green-100"
              }`}
            >
              {past ? "Completed" : "Confirmed"}
            </Badge>
          </div>

          {isMovie && booking.seat_codes?.length ? (
            <p className="mt-4 text-sm font-semibold text-gray-800 bg-gray-50 inline-block px-3 py-1.5 rounded border border-gray-100">
              <span className="text-gray-500 font-normal">Ticket(s):</span>{" "}
              {booking.seat_codes.join(", ")}
            </p>
          ) : !isMovie && booking.guests ? (
            <p className="mt-4 text-sm font-semibold text-gray-800 bg-gray-50 inline-block px-3 py-1.5 rounded border border-gray-100">
              <span className="text-gray-500 font-normal">Guests:</span>{" "}
              <Users className="h-3 w-3 inline mr-1" /> {booking.guests}
            </p>
          ) : null}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between border-t border-gray-100 pt-4 gap-4">
          <div className="flex gap-8">
            {booking.ref_code && (
              <div>
                <p className="text-xs text-gray-500 uppercase font-medium mb-0.5">
                  Booking ID
                </p>
                <p className="font-mono text-sm font-bold text-gray-900">
                  {booking.ref_code}
                </p>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium mb-0.5">
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
              className="text-[#7B1E3D] font-bold p-0 h-auto gap-1 hover:text-[#5C0F2A] hover:no-underline group"
            >
              <Link to={`/bookings/${booking.id}`}>
                View Details{" "}
                <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}