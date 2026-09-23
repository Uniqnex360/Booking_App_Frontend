import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Loader } from "@/components/common/Loader";
import { api, unwrap } from "@/api/client";
import { ChevronDown, Minus, Plus, X } from "lucide-react";
import { withCity } from "@/lib/cityLink";

interface ShowtimeSlot {
  id: string;
  screen_name: string;
  starts_at: string; // ISO UTC
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

// YYYY-MM-DD in Asia/Kolkata for a given ISO timestamp
function istDateKey(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });
}

function istTimeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function dateTabParts(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return {
    weekday: dt.toLocaleDateString("en-IN", { weekday: "short", timeZone: "UTC" }),
    day: dt.toLocaleDateString("en-IN", { day: "2-digit", timeZone: "UTC" }),
    month: dt.toLocaleDateString("en-IN", { month: "short", timeZone: "UTC" }),
  };
}

type PreferredTime = "any" | "morning" | "afternoon" | "evening" | "night";

const PREFERRED_TIME_LABELS: Record<PreferredTime, string> = {
  any: "Preferred Time",
  morning: "Morning (before 12PM)",
  afternoon: "Afternoon (12–4PM)",
  evening: "Evening (4–9PM)",
  night: "Night (after 9PM)",
};

function istHour(iso: string): number {
  return Number(
    new Date(iso).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      hour12: false,
    }),
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
  const [ticketCount, setTicketCount] = useState(2);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col">
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
      <div className="min-h-screen bg-neutral-50 flex flex-col">
        <Header />
        <div className="flex-grow flex justify-center items-center py-20 text-slate-500">
          Movie not found.
        </div>
        <Footer />
      </div>
    );
  }

  const now = Date.now();
  const todayKey = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });

  const venuesInCity = (movie.venues ?? []).filter((v) => v.city === city);

  const dateKeys = Array.from(
    new Set(
      venuesInCity.flatMap((v) =>
        v.showtimes
          .filter((s) => new Date(s.starts_at).getTime() > now)
          .map((s) => istDateKey(s.starts_at)),
      ),
    ),
  ).sort();

  const activeDate = selectedDate ?? dateKeys[0] ?? null;

  // Language·format combos available on the active date, for the filter dropdown
  const langFormatOptions = useMemo(() => {
    const set = new Set<string>();
    venuesInCity.forEach((v) =>
      v.showtimes
        .filter((s) => new Date(s.starts_at).getTime() > now)
        .filter((s) => !activeDate || istDateKey(s.starts_at) === activeDate)
        .forEach((s) => set.add(`${s.language} - ${s.format}`)),
    );
    return Array.from(set).sort();
  }, [venuesInCity, activeDate, now]);

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
                `${s.language} - ${s.format}` === langFormatFilter,
            )
            .filter((s) => matchesPreferredTime(s.starts_at, preferredTime))
            .sort(
              (a, b) =>
                new Date(a.starts_at).getTime() -
                new Date(b.starts_at).getTime(),
            ),
        }))
        .sort((a, b) =>
          sortBy === "name" ? a.venue_name.localeCompare(b.venue_name) : 0,
        )
    : [];

  const confirmSeatSelection = () => {
    if (!pendingSlot) return;
    navigate(
      withCity(
        `/showtimes/${pendingSlot.id}/seat-map?qty=${ticketCount}`,
        city,
      ),
    );
  };

  const toggleDropdown = (name: "langFormat" | "time" | "sort") =>
    setOpenDropdown((cur) => (cur === name ? null : name));

  return (
    <div className="min-h-screen bg-neutral-50 text-slate-900 flex flex-col">
      <Header />
      <main className="flex-grow max-w-[1280px] w-full mx-auto px-4 pt-16 lg:pt-[104px] pb-12">
        {/* Compact banner */}
        <div className="flex items-center gap-4 mt-6 mb-6">
          <div className="w-20 sm:w-24 shrink-0">
            <div className="aspect-[2/3] w-full bg-neutral-200 rounded-lg overflow-hidden">
              {movie.poster_url ? (
                <img
                  src={movie.poster_url}
                  alt={movie.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400 text-[10px] text-center px-1">
                  No Poster
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
              {movie.title}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Movie runtime: {formatDuration(movie.duration_min)}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="border border-slate-300 rounded-full px-2.5 py-0.5 text-xs font-semibold">
                {movie.certificate}
              </span>
              {movie.genre.split(",").map((g) => (
                <span
                  key={g.trim()}
                  className="border border-slate-300 rounded-full px-2.5 py-0.5 text-xs text-slate-600"
                >
                  {g.trim()}
                </span>
              ))}
            </div>
          </div>
        </div>

        {dateKeys.length === 0 ? (
          <div className="text-center py-16 text-slate-500 bg-white border border-slate-200 rounded-xl">
            This movie is currently not showing in {city}.
          </div>
        ) : (
          <>
            {/* Date tabs + filter dropdown row, BMS style */}
            <div className="flex flex-wrap items-stretch border-b border-slate-200 mb-6">
              <div className="flex overflow-x-auto">
                {dateKeys.map((dk) => {
                  const { weekday, day, month } = dateTabParts(dk);
                  const isToday = dk === todayKey;
                  const isActive = activeDate === dk;
                  return (
                    <button
                      key={dk}
                      onClick={() => setSelectedDate(dk)}
                      className={`shrink-0 flex flex-col items-center justify-center px-4 py-2 min-w-[64px] border-b-2 transition ${
                        isActive
                          ? "bg-[#7B1E3D] text-white border-[#7B1E3D]"
                          : "bg-white text-slate-700 border-transparent hover:bg-slate-50"
                      }`}
                    >
                      <span className="text-[10px] font-semibold uppercase">
                        {isToday ? "Today" : weekday}
                      </span>
                      <span className="text-base font-bold leading-tight">
                        {day}
                      </span>
                      <span className="text-[10px] uppercase">{month}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-1 ml-auto flex-wrap">
                {/* Language · Format filter */}
                <div className="relative">
                  <button
                    onClick={() => toggleDropdown("langFormat")}
                    className="flex items-center gap-1 px-3 py-2 text-sm text-slate-700 border-b-2 border-transparent hover:bg-slate-50"
                  >
                    {langFormatFilter === "all"
                      ? "Language - Format"
                      : langFormatFilter}
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                  {openDropdown === "langFormat" && (
                    <div className="absolute right-0 z-10 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[200px]">
                      <button
                        onClick={() => {
                          setLangFormatFilter("all");
                          setOpenDropdown(null);
                        }}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50"
                      >
                        All
                      </button>
                      {langFormatOptions.map((opt) => (
                        <button
                          key={opt}
                          onClick={() => {
                            setLangFormatFilter(opt);
                            setOpenDropdown(null);
                          }}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50"
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Preferred Time filter */}
                <div className="relative">
                  <button
                    onClick={() => toggleDropdown("time")}
                    className="flex items-center gap-1 px-3 py-2 text-sm text-slate-700 border-b-2 border-transparent hover:bg-slate-50"
                  >
                    {PREFERRED_TIME_LABELS[preferredTime]}
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                  {openDropdown === "time" && (
                    <div className="absolute right-0 z-10 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[220px]">
                      {(Object.keys(PREFERRED_TIME_LABELS) as PreferredTime[]).map(
                        (key) => (
                          <button
                            key={key}
                            onClick={() => {
                              setPreferredTime(key);
                              setOpenDropdown(null);
                            }}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50"
                          >
                            {PREFERRED_TIME_LABELS[key]}
                          </button>
                        ),
                      )}
                    </div>
                  )}
                </div>

                {/* Sort By */}
                <div className="relative">
                  <button
                    onClick={() => toggleDropdown("sort")}
                    className="flex items-center gap-1 px-3 py-2 text-sm text-slate-700 border-b-2 border-transparent hover:bg-slate-50"
                  >
                    Sort By
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                  {openDropdown === "sort" && (
                    <div className="absolute right-0 z-10 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[180px]">
                      <button
                        onClick={() => {
                          setSortBy("time");
                          setOpenDropdown(null);
                        }}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50"
                      >
                        Default
                      </button>
                      <button
                        onClick={() => {
                          setSortBy("name");
                          setOpenDropdown(null);
                        }}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50"
                      >
                        Cinema Name (A-Z)
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Availability legend */}
            <div className="flex items-center justify-end gap-4 text-xs text-slate-500 mb-4">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Available
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                Fast Filling
              </span>
            </div>

            {/* Venue list */}
            <div className="flex flex-col gap-4">
              {venuesForDate.map((venue) => (
                <div
                  key={venue.venue_id}
                  className="bg-white border border-slate-200 rounded-xl p-5"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-slate-900">
                        {venue.venue_name}
                      </h3>
                      {venue.address && (
                        <p className="text-xs text-slate-500 mt-1">
                          {venue.address}
                        </p>
                      )}
                    </div>
                  </div>

                  {venue.showtimes.length === 0 ? (
                    <p className="text-sm text-slate-400">
                      No shows on this date
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-3">
                      {venue.showtimes.map((slot) => (
                        <button
                          key={slot.id}
                          onClick={() => {
                            setTicketCount(2);
                            setPendingSlot(slot);
                          }}
                          className="flex flex-col items-center border border-emerald-500 text-emerald-700 rounded-md px-4 py-1.5 text-sm hover:bg-emerald-50 transition"
                        >
                          <span className="font-bold">
                            {istTimeLabel(slot.starts_at)}
                          </span>
                          <span className="text-[10px] text-slate-500 mt-0.5">
                            {slot.format}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Synopsis, pushed below the fold */}
        <div className="border-t border-slate-200 mt-10 pt-8 max-w-2xl">
          <h2 className="text-lg font-bold text-slate-900 mb-3">
            About the movie
          </h2>
          <p className="text-slate-700 leading-relaxed">{movie.synopsis}</p>
          <p className="text-sm text-slate-500 mt-3">
            Released {formatReleaseDate(movie.release_date)} · {movie.language}
          </p>
        </div>
      </main>
      <Footer />

      {/* Ticket-quantity picker */}
      {pendingSlot && (
        <div
          className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50"
          onClick={() => setPendingSlot(null)}
        >
          <div
            className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:w-96 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-lg text-slate-900">
                Select tickets
              </h3>
              <button
                onClick={() => setPendingSlot(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-6">
              {istTimeLabel(pendingSlot.starts_at)} · {pendingSlot.screen_name} ·{" "}
              {pendingSlot.format}
            </p>

            <div className="flex items-center justify-center gap-6 mb-6">
              <button
                onClick={() => setTicketCount((c) => Math.max(1, c - 1))}
                disabled={ticketCount <= 1}
                className="h-10 w-10 rounded-full border border-slate-300 flex items-center justify-center text-slate-700 disabled:opacity-30 hover:border-[#7B1E3D] transition"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="text-3xl font-extrabold text-slate-900 w-10 text-center">
                {ticketCount}
              </span>
              <button
                onClick={() =>
                  setTicketCount((c) => Math.min(MAX_TICKETS, c + 1))
                }
                disabled={ticketCount >= MAX_TICKETS}
                className="h-10 w-10 rounded-full border border-slate-300 flex items-center justify-center text-slate-700 disabled:opacity-30 hover:border-[#7B1E3D] transition"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <button
              onClick={confirmSeatSelection}
              className="w-full bg-[#7B1E3D] hover:bg-[#5C0F2A] text-white font-bold rounded-lg py-3 transition"
            >
              Select Seats
            </button>
          </div>
        </div>
      )}
    </div>
  );
}