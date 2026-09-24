import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Loader } from "@/components/common/Loader";
import { api, unwrap } from "@/api/client";
import {
  ChevronDown,
  Heart,
  MapPin,
  Search,
  Users,
  X,
  Info
} from "lucide-react";
import { withCity } from "@/lib/cityLink";

// --- Interfaces & Utility functions ---
interface ShowtimeSlot {
  id: string;
  screen_name: string;
  starts_at: string;
  language: string;
  format: string;
}

interface VenueGroup {
  venue_id: string;
  venue_name: string;
  city: string;
  address: string | null;
  showtimes: ShowtimeSlot[];
}

interface MovieDetail {
  id: string;
  title: string;
  language: string;
  duration_min: number;
  certificate: string;
  genre: string;
  venues?: VenueGroup[];
}

const MAX_TICKETS = 10;

function istDateKey(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });
}

function istTimeLabel(iso: string): string {
  return new Date(iso)
    .toLocaleTimeString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
    .toLowerCase();
}

function dateTabParts(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return {
    weekday: dt.toLocaleDateString("en-IN", {
      weekday: "short",
      timeZone: "UTC",
    }),
    day: dt.toLocaleDateString("en-IN", { day: "2-digit", timeZone: "UTC" }),
    month: dt.toLocaleDateString("en-IN", { month: "short", timeZone: "UTC" }),
  };
}

type PreferredTime = "any" | "morning" | "afternoon" | "evening" | "night";

function istHour(iso: string): number {
  return Number(
    new Date(iso).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      hour12: false,
    })
  );
}

function matchesPreferredTime(iso: string, pref: PreferredTime): boolean {
  if (pref === "any") return true;
  const h = istHour(iso);
  if (pref === "morning") return h < 12;
  if (pref === "afternoon") return h >= 12 && h < 16;
  if (pref === "evening") return h >= 16 && h < 21;
  return h >= 21;
}

export default function BuyTicketsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const city = searchParams.get("city") || "Kochi";
  
  // Read ticket count passed from MovieDetailPage (Default to 2)
  const ticketCount = Math.min(10, Math.max(1, parseInt(searchParams.get("qty") || "2", 10)));

  const [movie, setMovie] = useState<MovieDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [tempTicketCount, setTempTicketCount] = useState(ticketCount);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [langFormatFilter, setLangFormatFilter] = useState<string>("all");
  const [preferredTime, setPreferredTime] = useState<PreferredTime>("any");
  const [openDropdown, setOpenDropdown] = useState<"langFormat" | "time" | null>(null);

  useEffect(() => {
    const fetchMovie = async () => {
      try {
        setLoading(true);
        const data = await unwrap<MovieDetail>(api.get(`/movies/${id}`));
        setMovie(data);
      } catch (err) {
        console.error("Failed to load movie", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMovie();
  }, [id]);

  const now = Date.now();
  const todayKey = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });

  const venuesInCity = useMemo(() => {
    return (movie?.venues ?? []).filter((v) => v.city === city);
  }, [movie, city]);

  const dateKeys = useMemo(() => {
    return Array.from(
      new Set(
        venuesInCity.flatMap((v) =>
          v.showtimes
            .filter((s) => new Date(s.starts_at).getTime() > now)
            .map((s) => istDateKey(s.starts_at))
        )
      )
    ).sort();
  }, [venuesInCity, now]);

  const activeDate = selectedDate ?? dateKeys[0] ?? null;

  const langFormatOptions = useMemo(() => {
    const set = new Set<string>();
    venuesInCity.forEach((v) =>
      v.showtimes
        .filter((s) => new Date(s.starts_at).getTime() > now)
        .filter((s) => !activeDate || istDateKey(s.starts_at) === activeDate)
        .forEach((s) => set.add(`${s.language} - ${s.format}`))
    );
    return Array.from(set).sort();
  }, [venuesInCity, activeDate, now]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5FA] flex flex-col">
        <Header />
        <div className="flex-grow flex justify-center items-center py-20">
          <Loader />
        </div>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="min-h-screen bg-[#F5F5FA] flex flex-col">
        <Header />
        <div className="flex-grow flex justify-center items-center py-20 text-gray-500">
          Shows not found.
        </div>
      </div>
    );
  }

  const venuesForDate = activeDate
    ? venuesInCity
        .map((v) => ({
          ...v,
          showtimes: v.showtimes
            .filter((s) => new Date(s.starts_at).getTime() > now)
            .filter((s) => istDateKey(s.starts_at) === activeDate)
            .filter(
              (s) =>
                langFormatFilter === "all" ||
                `${s.language} - ${s.format}` === langFormatFilter
            )
            .filter((s) => matchesPreferredTime(s.starts_at, preferredTime))
            .sort(
              (a, b) =>
                new Date(a.starts_at).getTime() -
                new Date(b.starts_at).getTime()
            ),
        }))
        .filter((v) =>
          searchQuery
            ? v.venue_name.toLowerCase().includes(searchQuery.toLowerCase())
            : true
        )
        .filter((v) => v.showtimes.length > 0)
    : [];

  // Update URL search params when ticket count is changed from modal
  const handleTicketChangeConfirm = () => {
    setShowTicketModal(false);
    const p = new URLSearchParams(searchParams);
    p.set("qty", tempTicketCount.toString());
    setSearchParams(p, { replace: true });
  };

  const handleShowtimeClick = (slotId: string) => {
    navigate(withCity(`/showtimes/${slotId}/seat-map?qty=${ticketCount}`, city));
  };

  const toggleDropdown = (name: "langFormat" | "time") =>
    setOpenDropdown((cur) => (cur === name ? null : name));

  return (
    <div className="min-h-screen bg-[#F5F5FA] flex flex-col font-sans">
      <Header />

      {/* ─── Dedicated BMS Style Buy Tickets Header ─── */}
     <div className="bg-[#333338] pt-[120px] lg:pt-[136px] pb-6">
        <div className="max-w-[1240px] mx-auto px-4">
          <h1 className="text-[32px] font-bold text-white leading-tight">
            {movie.title} - {movie.language}
          </h1>
          <div className="flex items-center gap-2 mt-3">
            <span className="border border-white/40 rounded-full px-3 py-0.5 text-xs font-semibold text-white/90 uppercase tracking-wider">
              {movie.certificate}
            </span>
            <span className="border border-white/40 rounded-full px-3 py-0.5 text-xs font-semibold text-white/90">
              {movie.genre.split(',').join(' • ')}
            </span>
          </div>
        </div>
      </div>

      {dateKeys.length === 0 ? (
        <div className="max-w-[1240px] mx-auto px-4">
          <div className="text-center py-20 text-gray-500">
            <MapPin className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="text-lg font-medium">
              No showtimes available in {city}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              Try selecting a different city
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* ─── Date Strip ─── */}
          <div className="sticky top-[104px] lg:top-[112px] z-30 bg-white shadow-sm border-b border-gray-200">

            <div className="max-w-[1240px] mx-auto px-4">
              <div className="flex overflow-x-auto scrollbar-none">
                {dateKeys.map((dk) => {
                  const { weekday, day, month } = dateTabParts(dk);
                  const isToday = dk === todayKey;
                  const isActive = activeDate === dk;
                  return (
                    <button
                      key={dk}
                      onClick={() => setSelectedDate(dk)}
                      className={`shrink-0 flex flex-col items-center justify-center min-w-[88px] py-3.5 px-4 border-b-[3px] transition-all ${
                        isActive
                          ? "border-[#7B1E3D] text-[#7B1E3D]"
                          : "border-transparent text-gray-700 hover:text-[#7B1E3D]"
                      }`}
                    >
                      <span className="text-[13px] font-semibold uppercase">
                        {isToday ? "Today" : weekday}
                      </span>
                      <span className="text-[22px] font-bold leading-tight my-0.5">
                        {day}
                      </span>
                      <span className="text-[11px] font-medium uppercase text-gray-500">
                        {month}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ─── Filters & Selection Info bar ─── */}
          <div className="bg-white border-b border-gray-200">
            <div className="max-w-[1240px] mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
              {/* Ticket Count Pill (BMS Style) */}
              <div className="flex items-center gap-2 bg-[#7B1E3D]/10 text-[#7B1E3D] px-4 py-1.5 rounded-full border border-[#7B1E3D]/20 text-xs font-semibold cursor-pointer group" onClick={() => { setTempTicketCount(ticketCount); setShowTicketModal(true); }}>
                <Users className="h-3.5 w-3.5" />
                <span>{ticketCount} Tickets</span>
                <span className="underline text-[10px] ml-1 group-hover:text-[#5C0F2A]">
                  Edit
                </span>
              </div>

              <div className="h-6 w-px bg-gray-200 hidden sm:block" />

              {/* Language/Format Filter */}
              <div className="relative">
                <button
                  onClick={() => toggleDropdown("langFormat")}
                  className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-full border transition ${
                    langFormatFilter !== "all"
                      ? "bg-[#7B1E3D] text-white border-[#7B1E3D]"
                      : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
                  }`}
                >
                  {langFormatFilter === "all" ? "Languages & Formats" : langFormatFilter}
                  <ChevronDown className="h-3 w-3" />
                </button>
                {openDropdown === "langFormat" && (
                  <div className="absolute left-0 z-20 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl py-1 min-w-[220px]">
                    <button
                      onClick={() => { setLangFormatFilter("all"); setOpenDropdown(null); }}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 ${langFormatFilter === "all" ? "text-[#7B1E3D] font-medium" : "text-gray-700"}`}
                    >
                      All Languages
                    </button>
                    {langFormatOptions.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => { setLangFormatFilter(opt); setOpenDropdown(null); }}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 ${langFormatFilter === opt ? "text-[#7B1E3D] font-medium" : "text-gray-700"}`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Time Filter */}
              <div className="relative">
                <button
                  onClick={() => toggleDropdown("time")}
                  className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-full border transition ${
                    preferredTime !== "any"
                      ? "bg-[#7B1E3D] text-white border-[#7B1E3D]"
                      : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
                  }`}
                >
                  {preferredTime === "any" ? "Show Time" : preferredTime.charAt(0).toUpperCase() + preferredTime.slice(1)}
                  <ChevronDown className="h-3 w-3" />
                </button>
                {openDropdown === "time" && (
                  <div className="absolute left-0 z-20 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl py-1 min-w-[240px]">
                    {(["any", "morning", "afternoon", "evening", "night"] as PreferredTime[]).map((key) => {
                      const labels: Record<PreferredTime, string> = {
                        any: "Any Time",
                        morning: "Morning (Before 12 PM)",
                        afternoon: "Afternoon (12 PM - 4 PM)",
                        evening: "Evening (4 PM - 9 PM)",
                        night: "Night (After 9 PM)",
                      };
                      return (
                        <button
                          key={key}
                          onClick={() => { setPreferredTime(key); setOpenDropdown(null); }}
                          className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 ${preferredTime === key ? "text-[#7B1E3D] font-medium" : "text-gray-700"}`}
                        >
                          {labels[key]}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Search */}
              <div className="relative ml-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search cinemas"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-1.5 text-xs bg-white border border-gray-300 rounded-full w-56 focus:outline-none focus:border-[#7B1E3D]"
                />
              </div>
            </div>
          </div>

         <div className="bg-[#F5F5FA] border-b border-gray-200">
  <div className="max-w-[1240px] mx-auto px-4 py-3 flex items-center justify-end gap-5 text-[11px] text-gray-600 font-medium">
    <span className="flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full border-2 border-[#1EA83C]" />
      AVAILABLE
    </span>
    <span className="flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full border-2 border-[#FFB000] bg-[#FFB000]/20" />
      FAST FILLING
    </span>
  </div>
</div>

          {/* ─── Venue List ─── */}
          <div className="max-w-[1240px] mx-auto px-4 py-6">
            <div className="flex flex-col gap-3 pb-8">
              {venuesForDate.length === 0 ? (
                <div className="text-center py-12 text-gray-500 bg-white rounded-lg">
                  <p className="font-medium">No shows available for selected filters</p>
                  <p className="text-sm text-gray-400 mt-1">Try changing date, language or time filter</p>
                </div>
              ) : (
                venuesForDate.map((venue) => (
                  <div key={venue.venue_id} className="bg-white rounded-lg px-5 py-5 flex items-start gap-6 border-b border-dashed border-gray-200">
                    <div className="w-[280px] shrink-0">
                      <div className="flex items-start gap-2">
                        <div className="min-w-0">
                          <h3 className="text-[15px] font-medium text-gray-800 leading-snug">{venue.venue_name}</h3>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-2 ml-6 text-[11px] font-semibold">
                        <button className="text-[#1EA83C] hover:underline">INFO</button>
                        <span className="text-gray-300">|</span>
                        <button className="text-[#1EA83C] hover:underline">M-Ticket</button>
                        <span className="text-gray-300">|</span>
                        <button className="text-[#1EA83C] hover:underline">Food & Beverage</button>
                      </div>
                    </div>

                    <div className="flex-1 flex flex-wrap gap-2.5">
                      {venue.showtimes.map((slot) => {
                        const isPast = new Date(slot.starts_at).getTime() < now;
                        return (
                          <button
                            key={slot.id}
                            onClick={() => { if (!isPast) handleShowtimeClick(slot.id); }}
                            disabled={isPast}
                            className={`group relative border rounded px-4 py-2 min-w-[100px] text-center transition ${
                              isPast
                                ? "border-gray-200 text-gray-300 cursor-not-allowed"
                                : "border-[#1EA83C] text-[#1EA83C] bg-white hover:bg-[#1EA83C] hover:text-white cursor-pointer"
                            }`}
                          >
                            <span className="text-[13px] font-semibold block">{istTimeLabel(slot.starts_at)}</span>
                            {!isPast && (
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none z-10">
                                {slot.language} • {slot.format} • {slot.screen_name}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* ─── Re-select Ticket Modal (When clicking Edit in top bar) ─── */}
      {showTicketModal && (
        <div
          className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-4 sm:p-0"
          onClick={() => setShowTicketModal(false)}
        >
          <div
            className="bg-white rounded-2xl w-full sm:max-w-[440px] overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white px-6 pt-6 pb-4 relative border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-gray-900 font-bold text-lg">Change Seats</h3>
              <button onClick={() => setShowTicketModal(false)} className="text-gray-400 hover:text-gray-700 transition">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 py-8 bg-white">
              <div className="flex items-center justify-center mb-8">
                <div className="w-40 h-24 relative flex items-end justify-center">
                  <div className="flex items-end gap-1">
                    {Array.from({ length: tempTicketCount }, (_, i) => (
                      <div
                        key={i}
                        className="w-6 h-10 bg-[#7B1E3D] rounded-t-full relative"
                        style={{ background: "linear-gradient(180deg, #7B1E3D 0%, #5C0F2A 100%)" }}
                      >
                        <div className="w-4 h-4 bg-[#FDBB9C] rounded-full absolute -top-3 left-1/2 -translate-x-1/2" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 flex-wrap">
                {Array.from({ length: MAX_TICKETS }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    onClick={() => setTempTicketCount(n)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold border transition ${
                      tempTicketCount === n
                        ? "bg-[#7B1E3D] text-white border-[#7B1E3D] shadow-lg shadow-[#7B1E3D]/20"
                        : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>

              <button
                onClick={handleTicketChangeConfirm}
                className="w-full bg-[#7B1E3D] hover:bg-[#5C0F2A] text-white font-bold rounded-lg py-3.5 mt-8 transition flex items-center justify-center"
              >
                Update Selection
              </button>
            </div>
          </div>
        </div>
      )}

      {openDropdown && (
        <div className="fixed inset-0 z-10" onClick={() => setOpenDropdown(null)} />
      )}
    </div>
  );
}