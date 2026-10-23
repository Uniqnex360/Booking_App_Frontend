import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { getTheatreShowtimes, getTheatreVenues, TheatreShowtimeItem, TheatreVenueItem } from "@/api/theatre.api";
import { Calendar, Clock, Film, Building2, Loader2, Filter, Eye, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function TheatreShowtimesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const venueIdFromUrl = searchParams.get("venue_id") || "ALL";

  const [showtimes, setShowtimes] = useState<TheatreShowtimeItem[]>([]);
  const [venues, setVenues] = useState<TheatreVenueItem[]>([]);
  const [selectedVenue, setSelectedVenue] = useState(venueIdFromUrl);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [sh, v] = await Promise.all([
          getTheatreShowtimes({
            venue_id: selectedVenue !== "ALL" ? selectedVenue : undefined,
            limit: 100,
          }),
          getTheatreVenues(),
        ]);
        setShowtimes(sh || []);
        setVenues(v || []);
      } catch (err) {
        console.error("Showtimes error", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [selectedVenue]);

  const handleVenueChange = (venueId: string) => {
    setSelectedVenue(venueId);
    if (venueId === "ALL") {
      searchParams.delete("venue_id");
      setSearchParams(searchParams);
    } else {
      setSearchParams({ venue_id: venueId });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Showtimes Schedule</h1>
          <p className="text-xs text-slate-500 mt-1">
            Browse upcoming screenings, audit auditorium capacity, and check titles playing across your screens.
          </p>
        </div>

        {/* Venue Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            className="h-10 rounded-xl border border-slate-200 px-3 bg-slate-50 text-xs font-semibold text-slate-800 cursor-pointer"
            value={selectedVenue}
            onChange={(e) => handleVenueChange(e.target.value)}
          >
            <option value="ALL">All Venues ({venues.length})</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} ({v.city})
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-24 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#7B1E3D]" />
        </div>
      ) : showtimes.length === 0 ? (
        <div className="py-20 bg-white rounded-2xl border border-slate-200 text-center text-sm text-slate-400">
          No showtimes scheduled for this selection.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Movie Title</th>
                  <th className="py-3.5 px-4">Multiplex Venue</th>
                  <th className="py-3.5 px-4">Auditorium / Screen</th>
                  <th className="py-3.5 px-4">Language & Rating</th>
                  <th className="py-3.5 px-4">Show Date & Time</th>
                  <th className="py-3.5 px-4">Capacity</th>
                  <th className="py-3.5 px-4 text-right">Customer View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {showtimes.map((sh) => (
                  <tr key={sh.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{sh.movie.title}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-medium">
                      {sh.venue.name}
                      <span className="text-[11px] text-slate-400 block">{sh.venue.city}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-800 font-semibold">
                      {sh.screen.name}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant="outline" className="text-[10px] font-semibold bg-slate-50 text-slate-700">
                        {sh.movie.language} • {sh.movie.certificate}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">
                        {new Date(sh.starts_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {new Date(sh.starts_at).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-700">
                      {sh.screen.total_seats} seats
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <a
                        href={`/showtimes/${sh.id}/seat-map`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition"
                        title="View customer interactive seat layout & availability"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Seat Map</span>
                        <ExternalLink className="w-3 h-3 text-emerald-500" />
                      </a>
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

