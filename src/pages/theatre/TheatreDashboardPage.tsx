import React, { useState, useEffect } from "react";
import { Link, useOutletContext } from "react-router-dom";
import {
  getTheatreDashboardStats,
  getTheatreBookings,
  getTheatreShowtimes,
  TheatreDashboardStats,
  TheatreBookingItem,
  TheatreShowtimeItem,
  TheatrePartnerProfile,
} from "@/api/theatre.api";
import {
  Ticket,
  DollarSign,
  Building2,
  Calendar,
  AlertCircle,
  TrendingUp,
  Loader2,
  ArrowRight,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function TheatreDashboardPage() {
  const { profile } = useOutletContext<{ profile: TheatrePartnerProfile | null }>();
  const [stats, setStats] = useState<TheatreDashboardStats | null>(null);
  const [recentBookings, setRecentBookings] = useState<TheatreBookingItem[]>([]);
  const [upcomingShows, setUpcomingShows] = useState<TheatreShowtimeItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [s, b, sh] = await Promise.all([
          getTheatreDashboardStats(),
          getTheatreBookings({ limit: 5 }),
          getTheatreShowtimes({ limit: 5 }),
        ]);
        setStats(s);
        setRecentBookings(b || []);
        setUpcomingShows(sh || []);
      } catch (err) {
        console.error("Dashboard error", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="py-24 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#7B1E3D]" />
      </div>
    );
  }

  const grossRupees = ((stats?.gross_revenue_paise || 0) / 100).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  });
  const commissionDueRupees = ((stats?.commission_outstanding_paise || 0) / 100).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  });

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Welcome, {profile?.chain?.name || profile?.user.name}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time box office performance, customer admissions, and commission ledger for your multiplex locations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-semibold px-3 py-1 bg-slate-50 text-slate-800">
            {profile?.access_level === "CHAIN_ADMIN" ? "Chain Administrator" : "Multiplex Manager"}
          </Badge>
          <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold px-3 py-1">
            Brand Workspace Active
          </Badge>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Box Office */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Gross Box Office</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">₹{grossRupees}</div>
          <div className="text-[11px] text-slate-500 mt-1">Direct customer ticket volume</div>
        </div>

        {/* Tickets Sold */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Admissions Sold</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Ticket className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {(stats?.total_tickets || 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Across {stats?.total_bookings || 0} confirmed orders
          </div>
        </div>

        {/* Screens & Shows */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Screens & Shows</span>
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{stats?.screens_count || 0} Screens</div>
          <div className="text-[11px] text-slate-500 mt-1">
            {stats?.upcoming_showtimes_count || 0} scheduled upcoming shows
          </div>
        </div>

        {/* Commission Due */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Platform Commission Due</span>
            <div className="p-2 rounded-lg bg-orange-50 text-orange-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">₹{commissionDueRupees}</div>
          <div className="text-[11px] text-slate-500 mt-1">Net post-pay platform fee balance</div>
        </div>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Customer Bookings */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Ticket className="w-4 h-4 text-[#7B1E3D]" />
              Recent Admissions
            </h2>
            <Link
              to="/theatre/bookings"
              className="text-xs font-semibold text-[#7B1E3D] hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentBookings.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">No bookings recorded yet.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentBookings.map((b) => (
                <div key={b.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition">
                  <div>
                    <div className="font-bold text-xs text-slate-900">{b.movie_title}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {b.venue_name} • {b.screen_name} • {b.quantity} {b.quantity === 1 ? "seat" : "seats"}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{b.ref_code}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-slate-900">
                      ₹{((b.total_paise || 0) / 100).toFixed(0)}
                    </div>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full mt-1">
                      <CheckCircle2 className="w-3 h-3" /> CONFIRMED
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Showtimes */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#7B1E3D]" />
              Upcoming Showtimes
            </h2>
            <Link
              to="/theatre/showtimes"
              className="text-xs font-semibold text-[#7B1E3D] hover:underline flex items-center gap-1"
            >
              View schedule <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {upcomingShows.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">No scheduled shows found.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {upcomingShows.map((sh) => (
                <div key={sh.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition">
                  <div>
                    <div className="font-bold text-xs text-slate-900">{sh.movie.title}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {sh.venue.name} • {sh.screen.name}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {sh.movie.language} • {sh.movie.certificate}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-slate-900">
                      {new Date(sh.starts_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {new Date(sh.starts_at).toLocaleDateString([], { month: "short", day: "numeric" })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

