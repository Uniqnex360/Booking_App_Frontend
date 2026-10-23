import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getTheatreVenues, TheatreVenueItem } from "@/api/theatre.api";
import { Building2, MapPin, Film, Sliders, Loader2, ArrowRight, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function TheatreVenuesPage() {
  const [venues, setVenues] = useState<TheatreVenueItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getTheatreVenues();
        setVenues(data || []);
      } catch (err) {
        console.error("Venues fetch error", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Assigned Cinema Multiplexes</h1>
          <p className="text-xs text-slate-500 mt-1">
            Locations where your brand operates screens, receives customer admissions, and generates box office receipts.
          </p>
        </div>
        <Badge variant="outline" className="text-xs font-semibold px-3 py-1 bg-slate-50 text-slate-800">
          {venues.length} Active {venues.length === 1 ? "Location" : "Locations"}
        </Badge>
      </div>

      {loading ? (
        <div className="py-24 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#7B1E3D]" />
        </div>
      ) : venues.length === 0 ? (
        <div className="py-20 bg-white rounded-2xl border border-slate-200 text-center text-sm text-slate-400">
          No cinema venues assigned to this partner account. Please contact central administration.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {venues.map((v) => (
            <div
              key={v.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between hover:shadow-md transition"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="p-2 rounded-xl bg-orange-50 text-orange-600">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                    ONLINE
                  </Badge>
                </div>

                <h3 className="font-bold text-base text-slate-900 leading-snug">{v.name}</h3>

                <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{v.address || v.city}</span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1 font-semibold">
                  <Film className="w-3.5 h-3.5 text-slate-400" />
                  <span>{v.screen_count} Screens / Auditoriums</span>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Payment Model:</span>
                    <span className="font-semibold text-slate-900">
                      {v.customer_payment_model === "THEATRE_DIRECT"
                        ? "Model A (Theatre Direct)"
                        : "Model B (Vyhbz Escrow)"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600">
                    <span>Commercial Terms:</span>
                    <span className="font-semibold text-[#7B1E3D]">
                      {v.rate_type === "PERCENTAGE" ? `${v.rate_value}%` : `₹${v.rate_value}/ticket`} ({v.commission_model})
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <Link
                  to={`/theatre/showtimes?venue_id=${v.id}`}
                  className="text-xs font-semibold text-[#7B1E3D] hover:underline flex items-center gap-1"
                >
                  Showtimes <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                <div className="flex items-center gap-3">
                  <Link
                    to={`/movies?city=${encodeURIComponent(v.city)}&view=customer`}
                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                    title={`See movies in ${v.city} as a user`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>See as User</span>
                  </Link>

                  <Link
                    to={`/theatre/bookings?venue_id=${v.id}`}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-900"
                  >
                    Bookings
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

