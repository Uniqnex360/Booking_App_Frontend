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
  Minus,
  Plus,
  Search,
  Share2,
  Star,
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
    .toUpperCase();
}

function dateTabParts(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return {
    weekday: dt
      .toLocaleDateString("en-IN", { weekday: "short", timeZone: "UTC" })
      .toUpperCase(),
    day: dt.toLocaleDateString("en-IN", { day: "2-digit", timeZone: "UTC" }),
    month: dt
      .toLocaleDateString("en-IN", { month: "short", timeZone: "UTC" })
      .toUpperCase(),
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
  const [pendingSlot, setPendingSlot] = useState<ShowtimeSlot | null>(null);
  const [pendingVenue, setPendingVenue] = useState<VenueGroup | null>(null);
  const [ticketCount, setTicketCount] = useState(2);
  const [searchQuery, setSearchQuery] = useState("");

  // Filters
  const [langFormatFilter, setLangFormatFilter] = useState<string>("all");
  const [preferredTime, setPreferredTime] = useState<PreferredTime>("any");
  const [sortBy, setSortBy] = useState<"time" | "name">("time");
  const [openDropdown, setOpenDropdown] = useState<
    "langFormat" | "time" | "sort" | null
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

  // All hooks above early returns
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
      <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
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
      <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
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
        .sort((a, b) =>
          sortBy === "name" ? a.venue_name.localeCompare(b.venue_name) : 0
        )
    : [];

  const confirmSeatSelection = () => {
    if (!pendingSlot) return;
    navigate(
      withCity(
        `/showtimes/${pendingSlot.id}/seat-map?qty=${ticketCount}`,
        city
      )
    );
  };

  const toggleDropdown = (name: "langFormat" | "time" | "sort") =>
    setOpenDropdown((cur) => (cur === name ? null : name));

  const genres = movie.genre.split(",").map((g) => g.trim());

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
      <Header />

      {/* ─── Hero Banner (BMS style dark gradient) ─── */}
      <div className="bg-[#1A1A2E] pt-16 lg:pt-[72px]">
        <div className="max-w-[1240px] mx-auto px-4 py-6 lg:py-8">
          <div className="flex gap-6 items-start">
            {/* Poster */}
            <div className="hidden sm:block w-[196px] shrink-0">
              <div className="w-full aspect-[2/3] rounded-lg overflow-hidden shadow-2xl relative group cursor-pointer">
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
                {/* Play trailer overlay */}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                  <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                    <div className="w-0 h-0 border-l-[16px] border-l-white border-t-[10px] border-t-transparent border-b-[10px] border-b-transparent ml-1" />
                  </div>
                </div>
              </div>
            </div>

            {/* Movie Info */}
            <div className="flex-1 min-w-0 text-white">
              <h1 className="text-[28px] lg:text-[32px] font-bold leading-tight">
                {movie.title}
              </h1>

              {/* Rating pill */}
              <div className="flex items-center gap-3 mt-3">
                <div className="flex items-center gap-1 bg-[#333] rounded-lg px-3 py-1.5">
                  <Star className="h-4 w-4 text-[#E8375A] fill-[#E8375A]" />
                  <span className="font-bold text-sm">—</span>
                  <span className="text-xs text-gray-400">/10</span>
                </div>
                <button className="text-xs text-white/60 hover:text-white/80 underline underline-offset-2">
                  Rate now
                </button>
              </div>

              {/* Format pills */}
              <div className="flex flex-wrap gap-2 mt-4">
                {Array.from(
                  new Set(
                    venuesInCity.flatMap((v) =>
                      v.showtimes.map((s) => s.format)
                    )
                  )
                ).map((fmt) => (
                  <span
                    key={fmt}
                    className="bg-[#333] text-white text-xs font-medium px-3 py-1 rounded"
                  >
                    {fmt}
                  </span>
                ))}
              </div>

              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-1.5 text-sm text-white/70 mt-4">
                <span>{formatDuration(movie.duration_min)}</span>
                <span>•</span>
                {genres.map((g, i) => (
                  <span key={g}>
                    {g}
                    {i < genres.length - 1 ? "," : ""}
                  </span>
                ))}
                <span>•</span>
                <span>{movie.certificate}</span>
                <span>•</span>
                <span>{formatReleaseDate(movie.release_date)}</span>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-3 mt-6">
                <button
                  onClick={() => {
                    const el = document.getElementById("showtimes-section");
                    el?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="bg-[#E8375A] hover:bg-[#D42D4F] text-white font-bold text-sm px-8 py-3 rounded-lg transition shadow-lg shadow-[#E8375A]/30"
                >
                  Book tickets
                </button>
                <button className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center text-white/60 hover:text-white hover:border-white/40 transition">
                  <Share2 className="h-4 w-4" />
                </button>
                <button className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center text-white/60 hover:text-white hover:border-white/40 transition">
                  <Heart className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── About section ─── */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-[1240px] mx-auto px-4 py-6">
          <h2 className="text-lg font-bold text-gray-900 mb-2">
            About the movie
          </h2>
          <p className="text-gray-600 text-sm leading-relaxed max-w-3xl">
            {movie.synopsis}
          </p>
        </div>
      </div>

      {/* ─── Showtimes Section ─── */}
      <div id="showtimes-section" className="bg-[#F5F5F5]">
        <div className="max-w-[1240px] mx-auto px-4 py-0">
          {dateKeys.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <MapPin className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="text-lg font-medium">
                No showtimes available in {city}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                Try selecting a different city
              </p>
            </div>
          ) : (
            <>
              {/* ─── Date strip (BMS style) ─── */}
              <div className="sticky top-[56px] lg:top-[72px] z-30 bg-white border-b border-gray-200 -mx-4 px-4">
                <div className="flex items-stretch">
                  <div className="flex overflow-x-auto scrollbar-none gap-0 flex-1">
                    {dateKeys.map((dk) => {
                      const { weekday, day, month } = dateTabParts(dk);
                      const isToday = dk === todayKey;
                      const isActive = activeDate === dk;
                      return (
                        <button
                          key={dk}
                          onClick={() => setSelectedDate(dk)}
                          className={`shrink-0 flex flex-col items-center justify-center w-[76px] py-3 transition-all relative ${
                            isActive
                              ? "text-[#E8375A]"
                              : "text-gray-500 hover:text-gray-700"
                          }`}
                        >
                          <span
                            className={`text-[11px] font-medium ${isActive ? "text-[#E8375A]" : ""}`}
                          >
                            {isToday ? "TODAY" : weekday}
                          </span>
                          <span
                            className={`text-lg font-bold leading-tight ${
                              isActive
                                ? "bg-[#E8375A] text-white w-8 h-8 rounded-full flex items-center justify-center text-sm"
                                : ""
                            }`}
                          >
                            {day}
                          </span>
                          <span className="text-[10px] font-medium">
                            {month}
                          </span>
                          {isActive && (
                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-[3px] bg-[#E8375A] rounded-t" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Vertical divider */}
                  <div className="w-px bg-gray-200 my-2" />

                  {/* Filter buttons */}
                  <div className="flex items-center gap-0 pl-2 shrink-0">
                    {/* Language/Format */}
                    <div className="relative">
                      <button
                        onClick={() => toggleDropdown("langFormat")}
                        className={`flex items-center gap-1 px-3 py-2 text-xs font-medium rounded-full mx-0.5 transition ${
                          langFormatFilter !== "all"
                            ? "bg-[#E8375A] text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {langFormatFilter === "all"
                          ? movie.language
                          : langFormatFilter.split(" - ")[0]}
                        <ChevronDown className="h-3 w-3" />
                      </button>
                      {openDropdown === "langFormat" && (
                        <div className="absolute right-0 z-20 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl py-1 min-w-[200px]">
                          <button
                            onClick={() => {
                              setLangFormatFilter("all");
                              setOpenDropdown(null);
                            }}
                            className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 ${langFormatFilter === "all" ? "text-[#E8375A] font-medium" : "text-gray-700"}`}
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
                              className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 ${langFormatFilter === opt ? "text-[#E8375A] font-medium" : "text-gray-700"}`}
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
                        className={`flex items-center gap-1 px-3 py-2 text-xs font-medium rounded-full mx-0.5 transition ${
                          preferredTime !== "any"
                            ? "bg-[#E8375A] text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {preferredTime === "any"
                          ? "Show Time"
                          : preferredTime.charAt(0).toUpperCase() +
                            preferredTime.slice(1)}
                        <ChevronDown className="h-3 w-3" />
                      </button>
                      {openDropdown === "time" && (
                        <div className="absolute right-0 z-20 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl py-1 min-w-[220px]">
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
                                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 ${preferredTime === key ? "text-[#E8375A] font-medium" : "text-gray-700"}`}
                              >
                                {labels[key]}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Search cinemas */}
                    <div className="relative ml-1">
                      <button
                        onClick={() => {
                          const el =
                            document.getElementById("cinema-search-input");
                          el?.focus();
                        }}
                        className="flex items-center gap-1 px-3 py-2 text-xs font-medium rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition"
                      >
                        <Search className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* ─── Availability legend & search ─── */}
              <div className="flex items-center justify-between py-4">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                    <input
                      id="cinema-search-input"
                      type="text"
                      placeholder="Search cinemas"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 pr-3 py-1.5 text-sm bg-white border border-gray-200 rounded-md w-52 focus:outline-none focus:border-[#E8375A] focus:ring-1 focus:ring-[#E8375A]/20"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-5 text-xs text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#4ABD5D]" />
                    AVAILABLE
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#F5C518]" />
                    FAST FILLING
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full border-2 border-gray-300" />
                    SUBTITLES LANGUAGE
                  </span>
                </div>
              </div>

              {/* ─── Venue List (BMS style) ─── */}
              <div className="flex flex-col gap-0 pb-8">
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
                  venuesForDate.map((venue, idx) => (
                    <div
                      key={venue.venue_id}
                      className={`bg-white px-5 py-4 flex items-start gap-4 ${
                        idx === 0 ? "rounded-t-lg" : ""
                      } ${idx === venuesForDate.length - 1 ? "rounded-b-lg" : ""} ${
                        idx !== venuesForDate.length - 1
                          ? "border-b border-gray-100"
                          : ""
                      }`}
                    >
                      {/* Venue info (left side) */}
                      <div className="w-[260px] shrink-0">
                        <div className="flex items-center gap-1.5">
                          <Heart className="h-3.5 w-3.5 text-gray-300 hover:text-[#E8375A] cursor-pointer transition" />
                          <h3 className="text-sm font-semibold text-gray-800 truncate">
                            {venue.venue_name}
                          </h3>
                        </div>
                        {venue.address && (
                          <p className="text-[11px] text-gray-400 mt-0.5 ml-5 truncate">
                            {venue.address}
                          </p>
                        )}
                      </div>

                      {/* Showtimes (right side) */}
                      <div className="flex-1 flex flex-wrap gap-2.5">
                        {venue.showtimes.map((slot) => {
                          const isPast =
                            new Date(slot.starts_at).getTime() < now;
                          return (
                            <button
                              key={slot.id}
                              onClick={() => {
                                if (isPast) return;
                                setTicketCount(2);
                                setPendingSlot(slot);
                                setPendingVenue(venue);
                              }}
                              disabled={isPast}
                              className={`group relative border rounded-md px-4 py-2 min-w-[90px] text-center transition ${
                                isPast
                                  ? "border-gray-200 text-gray-300 cursor-not-allowed"
                                  : "border-[#4ABD5D] text-[#4ABD5D] hover:bg-[#4ABD5D]/5 cursor-pointer"
                              }`}
                            >
                              <span className="text-[13px] font-bold block">
                                {istTimeLabel(slot.starts_at)}
                              </span>
                              <span className="text-[10px] text-gray-400 font-medium">
                                {slot.screen_name}
                              </span>

                              {/* Tooltip on hover */}
                              {!isPast && (
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none">
                                  {slot.language} • {slot.format}
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
            </>
          )}
        </div>
      </div>

      <Footer />

      {/* ─── Ticket Selection Modal (BMS style) ─── */}
      {pendingSlot && (
        <div
          className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50"
          onClick={() => setPendingSlot(null)}
        >
          <div
            className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-[400px] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="bg-[#1A1A2E] px-6 pt-5 pb-4 relative">
              <button
                onClick={() => setPendingSlot(null)}
                className="absolute top-4 right-4 text-white/50 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
              <h3 className="text-white font-bold text-lg pr-8">
                {movie.title}
              </h3>
              <div className="flex items-center gap-2 text-white/60 text-xs mt-1.5">
                <span>{pendingVenue?.venue_name}</span>
              </div>
              <div className="flex items-center gap-2 text-white/60 text-xs mt-1">
                <span>
                  {activeDate &&
                    (() => {
                      const { weekday, day, month } = dateTabParts(activeDate);
                      return `${weekday}, ${day} ${month}`;
                    })()}
                </span>
                <span>•</span>
                <span>{istTimeLabel(pendingSlot.starts_at)}</span>
                <span>•</span>
                <span>{pendingSlot.screen_name}</span>
              </div>
              <div className="flex gap-1.5 mt-2">
                <span className="bg-white/10 text-white/70 text-[10px] font-medium px-2 py-0.5 rounded">
                  {pendingSlot.language}
                </span>
                <span className="bg-white/10 text-white/70 text-[10px] font-medium px-2 py-0.5 rounded">
                  {pendingSlot.format}
                </span>
              </div>
            </div>

            {/* Ticket count */}
            <div className="px-6 py-6">
              <p className="text-center text-gray-500 text-sm mb-5">
                How many seats?
              </p>

              <div className="flex items-center justify-center gap-0">
                {Array.from({ length: MAX_TICKETS }, (_, i) => i + 1).map(
                  (n) => (
                    <button
                      key={n}
                      onClick={() => setTicketCount(n)}
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition mx-0.5 ${
                        ticketCount === n
                          ? "bg-[#E8375A] text-white shadow-lg shadow-[#E8375A]/30"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {n}
                    </button>
                  )
                )}
              </div>

              <button
                onClick={confirmSeatSelection}
                className="w-full bg-[#E8375A] hover:bg-[#D42D4F] text-white font-bold rounded-lg py-3.5 mt-6 transition text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#E8375A]/20"
              >
                Select Seats
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close dropdown on outside click */}
      {openDropdown && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setOpenDropdown(null)}
        />
      )}
    </div>
  );
}