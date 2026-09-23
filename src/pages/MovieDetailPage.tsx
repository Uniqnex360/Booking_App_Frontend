import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Loader } from "@/components/common/Loader";
import { api, unwrap } from "@/api/client";
import {
  ChevronDown,
  ChevronRight,
  Heart,
  MapPin,
  Play,
  Search,
  Share2,
  Star,
  Users,
  X,
} from "lucide-react";
import { withCity } from "@/lib/cityLink";

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
  poster_url: string | null;
  synopsis: string;
  genre: string;
  release_date: string;
  venues?: VenueGroup[];
}

const MAX_TICKETS = 10;

function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

function formatReleaseDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

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

export default function MovieDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const city = searchParams.get("city") || "Kochi";

  const [movie, setMovie] = useState<MovieDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  
  // Enforced flow states
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [isBookingActive, setIsBookingActive] = useState(false); // Controls visibility of showtimes section
  const [ticketCount, setTicketCount] = useState(2);
  
  const [searchQuery, setSearchQuery] = useState("");

  // Filters
  const [langFormatFilter, setLangFormatFilter] = useState<string>("all");
  const [preferredTime, setPreferredTime] = useState<PreferredTime>("any");
  const [openDropdown, setOpenDropdown] = useState<
    "langFormat" | "time" | null
  >(null);

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
      <div className="min-h-screen bg-white flex flex-col">
        <Header />
        <div className="flex-grow flex justify-center items-center py-20">
          <Loader />
        </div>
        <Footer />
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Header />
        <div className="flex-grow flex justify-center items-center py-20 text-gray-500">
          Movie not found.
        </div>
        <Footer />
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

  const handleBookTicketsClick = () => {
    setShowTicketModal(true);
  };

  const handleTicketConfirm = () => {
    setShowTicketModal(false);
    setIsBookingActive(true);
    // Smooth scroll down to showtimes area after render
    setTimeout(() => {
      const el = document.getElementById("showtimes-section");
      el?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleShowtimeClick = (slotId: string) => {
    navigate(
      withCity(
        `/showtimes/${slotId}/seat-map?qty=${ticketCount}`,
        city
      )
    );
  };

  const toggleDropdown = (name: "langFormat" | "time") =>
    setOpenDropdown((cur) => (cur === name ? null : name));

  const genres = movie.genre.split(",").map((g) => g.trim());
  const allFormats = Array.from(
    new Set(venuesInCity.flatMap((v) => v.showtimes.map((s) => s.format)))
  );
  const allLanguages = Array.from(
    new Set(venuesInCity.flatMap((v) => v.showtimes.map((s) => s.language)))
  );

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />

      {/* ─── Hero Banner ─── */}
      <div
        className="relative pt-16 lg:pt-[72px]"
        style={{
          background:
            "linear-gradient(90deg, rgba(26,26,46,0.98) 0%, rgba(26,26,46,0.85) 50%, rgba(26,26,46,0.98) 100%)",
        }}
      >
        {movie.poster_url && (
          <div
            className="absolute inset-0 opacity-20 bg-cover bg-center blur-2xl"
            style={{ backgroundImage: `url(${movie.poster_url})` }}
          />
        )}

        <div className="relative max-w-[1240px] mx-auto px-4 py-8 lg:py-10">
          <div className="flex gap-8 items-start">
            {/* Poster */}
            <div className="hidden sm:block w-[240px] shrink-0">
              <div className="w-full aspect-[2/3] rounded-xl overflow-hidden shadow-2xl relative group cursor-pointer">
                {movie.poster_url ? (
                  <img
                    src={movie.poster_url}
                    alt={movie.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-700 flex items-center justify-center text-gray-400 text-sm">
                    No Poster
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                      <Play className="h-6 w-6 text-white fill-white ml-0.5" />
                    </div>
                    <span className="text-white text-xs font-medium">
                      Watch Trailer
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Movie Info */}
            <div className="flex-1 min-w-0 text-white">
              <h1 className="text-[32px] lg:text-[40px] font-bold leading-tight">
                {movie.title}
              </h1>

              {/* Rating Card */}
              <div className="mt-4 bg-[#333338] rounded-xl px-5 py-3 inline-flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Star className="h-6 w-6 text-[#F5C518] fill-[#F5C518]" />
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="font-bold text-xl">8.5</span>
                      <span className="text-sm text-gray-400">/10</span>
                    </div>
                    <div className="text-[11px] text-gray-400">
                      142.5K Votes
                    </div>
                  </div>
                </div>
                <button className="bg-white/10 hover:bg-white/20 border border-white/20 rounded-md px-4 py-2 text-xs font-medium transition">
                  Rate now
                </button>
              </div>

              {/* Format pills */}
              <div className="flex flex-wrap gap-2 mt-5">
                {allFormats.map((fmt) => (
                  <span
                    key={fmt}
                    className="bg-white/10 backdrop-blur border border-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded"
                  >
                    {fmt}
                  </span>
                ))}
                {allLanguages.length > 0 && (
                  <span className="bg-white/10 backdrop-blur border border-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded">
                    {allLanguages.join(", ")}
                  </span>
                )}
              </div>

              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-2 text-sm text-white mt-5">
                <span>{formatDuration(movie.duration_min)}</span>
                <span className="text-white/40">•</span>
                <span>{genres.join(", ")}</span>
                <span className="text-white/40">•</span>
                <span>{movie.certificate}</span>
                <span className="text-white/40">•</span>
                <span>{formatReleaseDate(movie.release_date)}</span>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-3 mt-6">
                <button
                  onClick={handleBookTicketsClick}
                  className="bg-[#F84464] hover:bg-[#E8375A] text-white font-semibold text-sm px-10 py-3 rounded-md transition shadow-lg shadow-[#F84464]/20"
                >
                  Book tickets
                </button>
                <button className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition">
                  <Heart className="h-4 w-4" />
                </button>
                <button className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition">
                  <Share2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── About section ─── */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-[1240px] mx-auto px-4 py-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            About the movie
          </h2>
          <p className="text-gray-700 text-sm leading-relaxed max-w-4xl">
            {movie.synopsis}
          </p>
        </div>
      </div>

      {/* ─── Showtimes Section (Strictly conditionally rendered) ─── */}
      {isBookingActive && (
        <div id="showtimes-section" className="bg-[#F5F5FA] border-t border-gray-200 scroll-mt-14">
          {dateKeys.length === 0 ? (
            <div className="max-w-[1240px] mx-auto px-4">
              <div className="text-center py-16 text-gray-500">
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
              {/* ─── Date strip ─── */}
              <div className="sticky top-[56px] lg:top-[72px] z-30 bg-white shadow-sm border-b border-gray-200">
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
                              ? "border-[#F84464] text-[#F84464]"
                              : "border-transparent text-gray-700 hover:text-[#F84464]"
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
                  {/* Persistent Active Seat Count indicator (BMS style) */}
                  <div className="flex items-center gap-2 bg-[#F84464]/10 text-[#F84464] px-4 py-1.5 rounded-full border border-[#F84464]/20 text-xs font-semibold">
                    <Users className="h-3.5 w-3.5" />
                    <span>{ticketCount} Tickets</span>
                    <button 
                      onClick={() => setShowTicketModal(true)} 
                      className="underline text-[10px] ml-1.5 hover:text-[#C73854]"
                    >
                      Change
                    </button>
                  </div>

                  {/* Vertical divider */}
                  <div className="h-6 w-px bg-gray-200 hidden sm:block" />

                  {/* Language/Format */}
                  <div className="relative">
                    <button
                      onClick={() => toggleDropdown("langFormat")}
                      className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-full border transition ${
                        langFormatFilter !== "all"
                          ? "bg-[#F84464] text-white border-[#F84464]"
                          : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
                      }`}
                    >
                      {langFormatFilter === "all"
                        ? "Languages & Formats"
                        : langFormatFilter}
                      <ChevronDown className="h-3 w-3" />
                    </button>
                    {openDropdown === "langFormat" && (
                      <div className="absolute left-0 z-20 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl py-1 min-w-[220px]">
                        <button
                          onClick={() => {
                            setLangFormatFilter("all");
                            setOpenDropdown(null);
                          }}
                          className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 ${
                            langFormatFilter === "all"
                              ? "text-[#F84464] font-medium"
                              : "text-gray-700"
                          }`}
                        >
                          All Languages
                        </button>
                        {langFormatOptions.map((opt) => (
                          <button
                            key={opt}
                            onClick={() => {
                              setLangFormatFilter(opt);
                              setOpenDropdown(null);
                            }}
                            className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 ${
                              langFormatFilter === opt
                                ? "text-[#F84464] font-medium"
                                : "text-gray-700"
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Time filter */}
                  <div className="relative">
                    <button
                      onClick={() => toggleDropdown("time")}
                      className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-full border transition ${
                        preferredTime !== "any"
                          ? "bg-[#F84464] text-white border-[#F84464]"
                          : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
                      }`}
                    >
                      {preferredTime === "any"
                        ? "Show Time"
                        : preferredTime.charAt(0).toUpperCase() +
                          preferredTime.slice(1)}
                      <ChevronDown className="h-3 w-3" />
                    </button>
                    {openDropdown === "time" && (
                      <div className="absolute left-0 z-20 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl py-1 min-w-[240px]">
                        {(
                          [
                            "any",
                            "morning",
                            "afternoon",
                            "evening",
                            "night",
                          ] as PreferredTime[]
                        ).map((key) => {
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
                              onClick={() => {
                                setPreferredTime(key);
                                setOpenDropdown(null);
                              }}
                              className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 ${
                                preferredTime === key
                                  ? "text-[#F84464] font-medium"
                                  : "text-gray-700"
                              }`}
                            >
                              {labels[key]}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Search cinemas */}
                  <div className="relative ml-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search cinemas"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-3 py-1.5 text-xs bg-white border border-gray-300 rounded-full w-56 focus:outline-none focus:border-[#F84464]"
                    />
                  </div>
                </div>
              </div>

              {/* ─── Legend ─── */}
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
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full border-2 border-gray-400" />
                    SUBTITLES LANGUAGE
                  </span>
                </div>
              </div>

              {/* ─── Venue List ─── */}
              <div className="max-w-[1240px] mx-auto px-4 py-6">
                <div className="flex flex-col gap-3 pb-8">
                  {venuesForDate.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 bg-white rounded-lg">
                      <p className="font-medium">
                        No shows available for selected filters
                      </p>
                      <p className="text-sm text-gray-400 mt-1">
                        Try changing date, language or time filter
                      </p>
                    </div>
                  ) : (
                    venuesForDate.map((venue) => (
                      <div
                        key={venue.venue_id}
                        className="bg-white rounded-lg px-5 py-5 flex items-start gap-6 border-b border-dashed border-gray-200"
                      >
                        {/* Venue info (left) */}
                        <div className="w-[280px] shrink-0">
                          <div className="flex items-start gap-2">
                            <Heart className="h-4 w-4 text-gray-300 hover:text-[#F84464] cursor-pointer transition mt-0.5 shrink-0" />
                            <div className="min-w-0">
                              <h3 className="text-[15px] font-medium text-gray-800 leading-snug">
                                {venue.venue_name}
                              </h3>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 mt-2 ml-6 text-[11px] font-semibold">
                            <button className="text-[#1EA83C] hover:underline">
                              INFO
                            </button>
                            <span className="text-gray-300">|</span>
                            <button className="text-[#1EA83C] hover:underline">
                              M-Ticket
                            </button>
                            <span className="text-gray-300">|</span>
                            <button className="text-[#1EA83C] hover:underline">
                              Food & Beverage
                            </button>
                          </div>
                        </div>

                        {/* Showtimes (right) */}
                        <div className="flex-1 flex flex-wrap gap-2.5">
                          {venue.showtimes.map((slot) => {
                            const isPast =
                              new Date(slot.starts_at).getTime() < now;
                            return (
                              <button
                                key={slot.id}
                                onClick={() => {
                                  if (isPast) return;
                                  // Instantly go to seat map with the pre-selected ticket count
                                  handleShowtimeClick(slot.id);
                                }}
                                disabled={isPast}
                                className={`group relative border rounded px-4 py-2 min-w-[100px] text-center transition ${
                                  isPast
                                    ? "border-gray-200 text-gray-300 cursor-not-allowed"
                                    : "border-[#1EA83C] text-[#1EA83C] bg-white hover:bg-[#1EA83C] hover:text-white cursor-pointer"
                                }`}
                              >
                                <span className="text-[13px] font-semibold block">
                                  {istTimeLabel(slot.starts_at)}
                                </span>
                                {!isPast && (
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none z-10">
                                    {slot.language} • {slot.format} •{" "}
                                    {slot.screen_name}
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

                {/* Cancellation info footer */}
                {venuesForDate.length > 0 && (
                  <div className="text-center text-xs text-gray-500 pb-8">
                    <p className="inline-flex items-center gap-1">
                      <span className="w-4 h-4 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-[10px] font-bold">
                        i
                      </span>
                      Cancellation available
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      <Footer />

      {/* ─── Ticket Selection Modal ─── */}
      {showTicketModal && (
        <div
          className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50"
          onClick={() => setShowTicketModal(false)}
        >
          <div
            className="bg-white rounded-t-2xl sm:rounded-lg w-full sm:max-w-[440px] overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="bg-white px-6 pt-5 pb-4 relative border-b border-gray-100">
              <button
                onClick={() => setShowTicketModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition"
              >
                <X className="h-5 w-5" />
              </button>
              <h3 className="text-gray-900 font-bold text-lg pr-8 text-center sm:text-left">
                How Many Seats?
              </h3>
            </div>

            {/* Ticket count illustrations */}
            <div className="px-6 py-8 bg-white">
              <div className="flex items-center justify-center mb-8">
                <div className="w-40 h-24 relative flex items-end justify-center">
                  <div className="flex items-end gap-1">
                    {Array.from({ length: ticketCount }, (_, i) => (
                      <div
                        key={i}
                        className="w-6 h-10 bg-[#F84464] rounded-t-full relative"
                        style={{
                          background:
                            "linear-gradient(180deg, #F84464 0%, #C73854 100%)",
                        }}
                      >
                        <div className="w-4 h-4 bg-[#FDBB9C] rounded-full absolute -top-3 left-1/2 -translate-x-1/2" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Number pills */}
              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                {Array.from({ length: MAX_TICKETS }, (_, i) => i + 1).map(
                  (n) => (
                    <button
                      key={n}
                      onClick={() => setTicketCount(n)}
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border transition ${
                        ticketCount === n
                          ? "bg-[#F84464] text-white border-[#F84464]"
                          : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
                      }`}
                    >
                      {n}
                    </button>
                  )
                )}
              </div>

              <button
                onClick={handleTicketConfirm}
                className="w-full bg-[#F84464] hover:bg-[#E8375A] text-white font-semibold rounded py-3 mt-8 transition text-sm flex items-center justify-center gap-2"
              >
                Select Showtimes
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {openDropdown && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setOpenDropdown(null)}
        />
      )}
    </div>
  );
}