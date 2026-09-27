import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { api, unwrap } from "@/api/client";
import {
  ChevronDown,
  Heart,
  MapPin,
  Search,
  Users,
  X,
  Info,
  Coffee,
  Smartphone,
} from "lucide-react";
import { withCity } from "@/lib/cityLink";
import { LoadingPage } from "./LoadingPage";
import { SeatVehicle } from "./SeatVehicle";

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
    .toUpperCase();
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

  const ticketCount = Math.min(
    10,
    Math.max(1, parseInt(searchParams.get("qty") || "2", 10))
  );

  const [movie, setMovie] = useState<MovieDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const [showTicketModal, setShowTicketModal] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [tempTicketCount, setTempTicketCount] = useState(ticketCount);

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [langFormatFilter, setLangFormatFilter] = useState<string>("all");
  const [preferredTime, setPreferredTime] = useState<PreferredTime>("any");
  const [openDropdown, setOpenDropdown] = useState<
    "langFormat" | "time" | "price" | "special" | "other" | "sort" | null
  >(null);
  const [showSubtitleNotice, setShowSubtitleNotice] = useState(true);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

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

  const genres = useMemo(() => {
    if (!movie?.genre) return ["Action", "Thriller"];
    if (Array.isArray(movie.genre)) return movie.genre;
    return movie.genre
      .split(",")
      .map((g) => g.trim())
      .filter(Boolean);
  }, [movie?.genre]);

  const formatRuntime = (mins?: number) => {
    if (!mins) return "2h 17m";
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  const toggleFavorite = (venueId: string) => {
    setFavorites((prev) => ({
      ...prev,
      [venueId]: !prev[venueId],
    }));
  };

  if (loading) {
    return <LoadingPage showFooter={false} />;
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

  const handleTicketChangeConfirm = () => {
    setShowTicketModal(false);
    const p = new URLSearchParams(searchParams);
    p.set("qty", tempTicketCount.toString());
    setSearchParams(p, { replace: true });

    if (selectedSlotId) {
      navigate(
        withCity(
          `/showtimes/${selectedSlotId}/seat-map?qty=${tempTicketCount}`,
          city
        )
      );
    }
  };

  const handleShowtimeClick = (slotId: string) => {
    setSelectedSlotId(slotId);
    setTempTicketCount(ticketCount);
    setShowTicketModal(true);
  };

  const toggleDropdown = (
    name: "langFormat" | "time" | "price" | "special" | "other" | "sort"
  ) => setOpenDropdown((cur) => (cur === name ? null : name));

  const activeFormatDisplay =
    langFormatFilter === "all"
      ? `${movie.language} - 2D`
      : langFormatFilter;

  return (
    <div className="min-h-screen bg-[#F5F5FA] flex flex-col font-sans">
      <Header />

      {/* ─── Movie Title & Metadata Header (White background matching BookMyShow) ─── */}
      <div className="bg-white border-b border-gray-200 pt-[104px] lg:pt-[116px] pb-4">
        <div className="max-w-[1240px] mx-auto px-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
            {movie.title} - ({movie.language})
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className="border border-gray-300 rounded-full px-3 py-0.5 text-xs text-gray-600 font-medium">
              Movie runtime: {formatRuntime(movie.duration_min)}
            </span>
            {movie.certificate && (
              <span className="border border-gray-300 rounded-full px-2.5 py-0.5 text-xs text-gray-600 font-medium">
                {movie.certificate}
              </span>
            )}
            {genres.map((g) => (
              <span
                key={g}
                className="border border-gray-300 rounded-full px-2.5 py-0.5 text-xs text-gray-600 font-medium"
              >
                {g}
              </span>
            ))}
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
          {/* ─── Date Strip & Filter Bar (White background, BookMyShow layout) ─── */}
          <div className="sticky top-[104px] lg:top-[112px] z-30 bg-white border-b border-gray-200 shadow-xs">
            <div className="max-w-[1240px] mx-auto px-4 flex items-center justify-between gap-2 overflow-x-auto scrollbar-none">
              
              {/* Date Cards */}
              <div className="flex items-center gap-1.5 py-2 shrink-0">
                {dateKeys.map((dk) => {
                  const { weekday, day, month } = dateTabParts(dk);
                  const isActive = activeDate === dk;
                  return (
                    <button
                      key={dk}
                      onClick={() => setSelectedDate(dk)}
                      className={`w-[52px] sm:w-[56px] py-1.5 flex flex-col items-center justify-center rounded-md transition cursor-pointer shrink-0 ${
                        isActive
                          ? "bg-[#F84464] text-white shadow-xs"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      <span
                        className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wider ${
                          isActive ? "text-white" : "text-gray-500"
                        }`}
                      >
                        {weekday}
                      </span>
                      <span
                        className={`text-base sm:text-lg font-bold leading-tight my-0.5 ${
                          isActive ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {day}
                      </span>
                      <span
                        className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wider ${
                          isActive ? "text-white" : "text-gray-500"
                        }`}
                      >
                        {month}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Vertical divider */}
              <div className="h-10 w-px bg-gray-200 shrink-0 hidden md:block" />

              {/* Filter Tabs & Dropdowns */}
              <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                {/* Active Format Tab */}
                <div className="relative">
                  <button
                    onClick={() => toggleDropdown("langFormat")}
                    className="flex items-center gap-1 text-xs sm:text-sm font-semibold text-gray-900 border-b-2 border-[#F84464] py-3.5 px-3 whitespace-nowrap cursor-pointer"
                  >
                    <span>{activeFormatDisplay}</span>
                  </button>
                  {openDropdown === "langFormat" && (
                    <div className="absolute left-0 z-40 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl py-1 min-w-[200px]">
                      <button
                        onClick={() => {
                          setLangFormatFilter("all");
                          setOpenDropdown(null);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-xs sm:text-sm hover:bg-gray-50 ${
                          langFormatFilter === "all"
                            ? "text-[#F84464] font-semibold"
                            : "text-gray-700"
                        }`}
                      >
                        All Formats
                      </button>
                      {langFormatOptions.map((opt) => (
                        <button
                          key={opt}
                          onClick={() => {
                            setLangFormatFilter(opt);
                            setOpenDropdown(null);
                          }}
                          className={`w-full text-left px-4 py-2.5 text-xs sm:text-sm hover:bg-gray-50 ${
                            langFormatFilter === opt
                              ? "text-[#F84464] font-semibold"
                              : "text-gray-700"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Price Range */}
                <div className="relative hidden lg:block">
                  <button
                    onClick={() => toggleDropdown("price")}
                    className="flex items-center gap-1 text-xs text-gray-700 hover:text-gray-900 py-3.5 px-2.5 whitespace-nowrap cursor-pointer font-medium"
                  >
                    <span>Price Range</span>
                    <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                  </button>
                  {openDropdown === "price" && (
                    <div className="absolute left-0 z-40 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl py-2 px-3 min-w-[180px] text-xs text-gray-600">
                      <div className="py-1.5 hover:text-gray-900 cursor-pointer">Rs. 0 - 200</div>
                      <div className="py-1.5 hover:text-gray-900 cursor-pointer">Rs. 201 - 350</div>
                      <div className="py-1.5 hover:text-gray-900 cursor-pointer">Rs. 351+</div>
                    </div>
                  )}
                </div>

                {/* Preferred Time */}
                <div className="relative">
                  <button
                    onClick={() => toggleDropdown("time")}
                    className="flex items-center gap-1 text-xs text-gray-700 hover:text-gray-900 py-3.5 px-2.5 whitespace-nowrap cursor-pointer font-medium"
                  >
                    <span>
                      {preferredTime === "any"
                        ? "Preferred Time"
                        : preferredTime.charAt(0).toUpperCase() + preferredTime.slice(1)}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                  </button>
                  {openDropdown === "time" && (
                    <div className="absolute right-0 z-40 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl py-1 min-w-[210px]">
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
                            className={`w-full text-left px-4 py-2 text-xs hover:bg-gray-50 ${
                              preferredTime === key
                                ? "text-[#F84464] font-semibold"
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

                {/* Search Toggle */}
                <div className="relative pl-1">
                  {isSearchOpen ? (
                    <div className="flex items-center bg-gray-100 rounded-full px-2.5 py-1">
                      <Search className="h-3.5 w-3.5 text-gray-400 mr-1.5" />
                      <input
                        type="text"
                        placeholder="Search cinema..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        autoFocus
                        className="bg-transparent text-xs text-gray-900 placeholder:text-gray-400 outline-none w-32 sm:w-40"
                      />
                      <button
                        onClick={() => {
                          setSearchQuery("");
                          setIsSearchOpen(false);
                        }}
                        className="text-gray-400 hover:text-gray-600 p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsSearchOpen(true)}
                      className="p-2 text-gray-600 hover:text-gray-900 cursor-pointer"
                      title="Search Cinema"
                    >
                      <Search className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ─── Subtitle Notice & Availability Legend Bar ─── */}
          <div className="bg-[#F5F5FA] border-b border-gray-200">
            <div className="max-w-[1240px] mx-auto px-4 py-2 flex items-center justify-between gap-4 text-xs text-gray-500">
              {showSubtitleNotice ? (
                <div className="flex items-center gap-1.5">
                  <span className="border border-gray-300 rounded px-1 text-[10px] font-bold text-gray-500 bg-white">
                    SUB
                  </span>
                  <span className="text-[11px] sm:text-xs text-gray-500">
                    indicates subtitle language, if available
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowSubtitleNotice(false)}
                    className="text-gray-400 hover:text-gray-600 ml-1 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-4 text-[11px] font-semibold ml-auto">
                <span className="flex items-center gap-1.5 text-gray-600">
                  <span className="w-2 h-2 rounded-full bg-[#1EA83C]" />
                  AVAILABLE
                </span>
                <span className="flex items-center gap-1.5 text-gray-600">
                  <span className="w-2 h-2 rounded-full bg-[#FFB000]" />
                  FAST FILLING
                </span>
              </div>
            </div>
          </div>

          {/* ─── Cinema Venue List ─── */}
          <div className="max-w-[1240px] mx-auto px-4 py-4 w-full">
            <div className="flex flex-col bg-white rounded-lg border border-gray-200 divide-y divide-gray-100 shadow-xs">
              {venuesForDate.length === 0 ? (
                <div className="text-center py-16 text-gray-500">
                  <p className="font-semibold text-base">
                    No shows available for selected filters
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Try changing date, language, or preferred time.
                  </p>
                </div>
              ) : (
                venuesForDate.map((venue) => {
                  const isPVR = venue.venue_name.toLowerCase().includes("pvr");
                  const isCinepolis = venue.venue_name
                    .toLowerCase()
                    .includes("cinepolis");
                  const isFav = Boolean(favorites[venue.venue_id]);

                  return (
                    <div
                      key={venue.venue_id}
                      className="p-5 flex flex-col md:flex-row md:items-start gap-4 hover:bg-gray-50/50 transition"
                    >
                      {/* Cinema details */}
                      <div className="w-full md:w-[280px] shrink-0">
                        <div className="flex items-start gap-2.5">
                          {/* Logo badge */}
                          {isPVR ? (
                            <div className="text-[11px] font-black text-amber-500 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded font-serif shrink-0 mt-0.5">
                              PVR
                            </div>
                          ) : isCinepolis ? (
                            <div className="text-[10px] font-black text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded shrink-0 mt-0.5">
                              cinépolis
                            </div>
                          ) : (
                            <div className="text-[10px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded shrink-0 mt-0.5">
                              CINEMA
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <h3 className="text-sm sm:text-[15px] font-bold text-gray-900 hover:text-[#F84464] transition leading-snug">
                                {venue.venue_name}
                              </h3>
                              <Info className="h-3.5 w-3.5 text-gray-400 shrink-0 cursor-pointer hover:text-gray-600" />
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">
                              Cancellation available
                            </p>
                            
                            {/* Amenities / Features */}
                            <div className="flex items-center gap-2.5 mt-2 text-[11px] text-gray-500 font-medium">
                              <span className="flex items-center gap-1 text-amber-600">
                                <Coffee className="h-3 w-3" />
                                F&amp;B
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1 text-[#1EA83C]">
                                <Smartphone className="h-3 w-3" />
                                M-Ticket
                              </span>
                            </div>
                          </div>

                          {/* Favorite Heart button */}
                          <button
                            type="button"
                            onClick={() => toggleFavorite(venue.venue_id)}
                            className="text-gray-300 hover:text-[#F84464] p-1 transition cursor-pointer md:hidden"
                          >
                            <Heart
                              className={`h-4 w-4 ${
                                isFav ? "fill-[#F84464] text-[#F84464]" : ""
                              }`}
                            />
                          </button>
                        </div>
                      </div>

                      {/* Showtimes Grid */}
                      <div className="flex-1 flex flex-wrap items-center gap-3">
                        {venue.showtimes.map((slot) => {
                          const isPast =
                            new Date(slot.starts_at).getTime() < now;
                          return (
                            <button
                              key={slot.id}
                              onClick={() => {
                                if (!isPast) handleShowtimeClick(slot.id);
                              }}
                              disabled={isPast}
                              className={`relative border rounded px-3.5 py-2 min-w-[96px] text-center transition cursor-pointer group ${
                                isPast
                                  ? "border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50"
                                  : "border-[#1EA83C] bg-white hover:bg-[#1EA83C]/5"
                              }`}
                            >
                              <div
                                className={`text-xs sm:text-[13px] font-bold ${
                                  isPast ? "text-gray-300" : "text-[#1EA83C]"
                                }`}
                              >
                                {istTimeLabel(slot.starts_at)}
                                <span className="text-[9px] text-gray-400 font-normal ml-1">
                                  [ENG]
                                </span>
                              </div>
                              <div className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mt-0.5">
                                {slot.format || "DOLBY 7.1"}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Desktop Favorite Heart button */}
                      <div className="hidden md:block shrink-0 pt-1">
                        <button
                          type="button"
                          onClick={() => toggleFavorite(venue.venue_id)}
                          className="text-gray-300 hover:text-[#F84464] p-1.5 transition cursor-pointer"
                          title="Bookmark Cinema"
                        >
                          <Heart
                            className={`h-4 w-4 ${
                              isFav ? "fill-[#F84464] text-[#F84464]" : ""
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}

      {/* ─── Seat Count Change Modal (Matching BMS exact vehicle illustrations) ─── */}
      {showTicketModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowTicketModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-2xl w-full max-w-[400px] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pt-6 pb-2 text-center">
              <h2 className="text-lg font-bold text-gray-900">
                How many seats?
              </h2>
            </div>

            <div className="flex items-center justify-center py-4">
              <SeatVehicle count={tempTicketCount} />
            </div>

            <div className="flex items-center justify-between px-6 pt-2 pb-5 overflow-hidden select-none">
              {Array.from({ length: MAX_TICKETS }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setTempTicketCount(n)}
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold transition cursor-pointer shrink-0 ${
                    tempTicketCount === n
                      ? "bg-[#F84464] text-white shadow-md font-bold"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>

            <div className="px-6 pt-3 pb-6">
              <button
                type="button"
                onClick={handleTicketChangeConfirm}
                className="w-full bg-[#F84464] hover:bg-[#e03555] text-white font-bold rounded-lg py-3 text-sm transition cursor-pointer"
              >
                Select Seats
              </button>
            </div>
          </div>
        </div>
      )}

      {openDropdown && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setOpenDropdown(null)}
        />
      )}
      <Footer />
    </div>
  );
}
