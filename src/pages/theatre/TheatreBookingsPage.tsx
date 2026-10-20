import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { getTheatreBookings, getTheatreVenues, TheatreBookingItem, TheatreVenueItem } from "@/api/theatre.api";
import { Ticket, Search, Filter, Loader2, CheckCircle2, User, Phone, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/useDebounce";

export default function TheatreBookingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const venueIdFromUrl = searchParams.get("venue_id") || "ALL";

  const [bookings, setBookings] = useState<TheatreBookingItem[]>([]);
  const [venues, setVenues] = useState<TheatreVenueItem[]>([]);
  const [selectedVenue, setSelectedVenue] = useState(venueIdFromUrl);
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [b, v] = await Promise.all([
          getTheatreBookings({
            venue_id: selectedVenue !== "ALL" ? selectedVenue : undefined,
            status: selectedStatus !== "ALL" ? selectedStatus : undefined,
            search: debouncedSearch.trim() || undefined,
            limit: 100,
          }),
          getTheatreVenues(),
        ]);
        setBookings(b || []);
        setVenues(v || []);
      } catch (err) {
        console.error("Bookings error", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [selectedVenue, selectedStatus, debouncedSearch]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Customer Admissions & Bookings</h1>
          <p className="text-xs text-slate-500 mt-1">
            Audit customer ticket admissions, seat allocations, ref codes, and gross collections across your screens.
          </p>
        </div>

        <Badge variant="outline" className="text-xs font-semibold px-3 py-1 bg-slate-50 text-slate-800">
          {bookings.length} Orders Loaded
        </Badge>
      </div>

      {/* Filter toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search bookings by booking ref, movie, phone, or email..."
            className="pl-10 h-10 rounded-xl"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Venue Filter */}
          <select
            className="h-10 rounded-xl border border-slate-200 px-3 bg-slate-50 text-xs font-semibold text-slate-800 cursor-pointer"
            value={selectedVenue}
            onChange={(e) => setSelectedVenue(e.target.value)}
          >
            <option value="ALL">All Venues</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            className="h-10 rounded-xl border border-slate-200 px-3 bg-slate-50 text-xs font-semibold text-slate-800 cursor-pointer"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="CANCELLED">CANCELLED</option>
            <option value="REFUNDED">REFUNDED</option>
          </select>
        </div>
      </div>

      {/* Bookings Table */}
      {loading ? (
        <div className="py-24 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#7B1E3D]" />
        </div>
      ) : bookings.length === 0 ? (
        <div className="py-20 bg-white rounded-2xl border border-slate-200 text-center text-sm text-slate-400">
          No bookings found matching criteria.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Ref Code</th>
                  <th className="py-3.5 px-4">Movie & Showtime</th>
                  <th className="py-3.5 px-4">Multiplex / Screen</th>
                  <th className="py-3.5 px-4">Tickets & Seats</th>
                  <th className="py-3.5 px-4">Customer Contact</th>
                  <th className="py-3.5 px-4">Total Amount</th>
                  <th className="py-3.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-bold text-slate-900">{b.ref_code}</div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(b.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{b.movie_title}</div>
                      <div className="text-[11px] text-slate-500">
                        {new Date(b.showtime).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">
                      <div className="font-medium">{b.venue_name}</div>
                      <div className="text-[11px] text-slate-400">{b.screen_name}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">
                        {b.quantity} {b.quantity === 1 ? "Ticket" : "Tickets"}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {b.seat_codes ? JSON.parse(b.seat_codes).join(", ") : "—"}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {b.contact_email && <div className="truncate">{b.contact_email}</div>}
                      {b.contact_phone && <div className="text-[11px] text-slate-400">{b.contact_phone}</div>}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      ₹{((b.total_paise || 0) / 100).toFixed(0)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" /> {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

