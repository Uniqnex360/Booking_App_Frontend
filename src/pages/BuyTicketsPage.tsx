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
  Navigation,
  Accessibility,
  Car,
  Utensils,
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

function getCityState(city: string): string {
  const c = (city || "").toLowerCase();
  if (c.includes("bang") || c.includes("beng")) return "Karnataka";
  if (c.includes("chennai") || c.includes("madras")) return "Tamil Nadu";
  if (c.includes("kochi") || c.includes("cochin")) return "Kerala";
  return "India";
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

function matchesPriceRange(format: string, selectedRanges: string[]): boolean {
  if (selectedRanges.length === 0) return true;
  const fmt = (format || "").toUpperCase();
  const estPrice = fmt.includes("LUXE") ? 650 : fmt.includes("DOLBY") || fmt.includes("3D") ? 350 : 200;

  return selectedRanges.some((range) => {
    if (range.includes("0 - 200") && estPrice <= 200) return true;
    if (range.includes("201 - 300") && estPrice >= 201 && estPrice <= 300) return true;
    if (range.includes("301 - 400") && estPrice >= 301 && estPrice <= 400) return true;
    if (range.includes("401 - 500") && estPrice >= 401 && estPrice <= 500) return true;
    if (range.includes("501 - 600") && estPrice >= 501 && estPrice <= 600) return true;
    if (range.includes("601 - 700") && estPrice >= 601 && estPrice <= 700) return true;
    return false;
  });
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
  const [selectedPriceRanges, setSelectedPriceRanges] = useState<string[]>([]);
  const [selectedSpecialFormats, setSelectedSpecialFormats] = useState<string[]>([]);
  const [selectedOtherFilters, setSelectedOtherFilters] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<"relevance" | "popularity" | "distance">("relevance");
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [selectedCinemaInfo, setSelectedCinemaInfo] = useState<VenueGroup | null>(null);

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

  let venuesForDate = activeDate
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
            .filter((s) => {
              if (selectedSpecialFormats.length === 0) return true;
              return selectedSpecialFormats.some((fmt) =>
                s.format.toLowerCase().includes(fmt.toLowerCase())
              );
            })
            .filter((s) => matchesPriceRange(s.format, selectedPriceRanges))
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

  if (sortBy === "popularity") {
    venuesForDate = [...venuesForDate].sort(
      (a, b) => b.showtimes.length - a.showtimes.length
    );
  } else if (sortBy === "distance") {
    venuesForDate = [...venuesForDate].sort((a, b) =>
      a.venue_name.localeCompare(b.venue_name)
    );
  }

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
      <div className="bg-white border-b border-gray-200 pt-[128px] lg:pt-[144px] pb-6">
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
          {/* ─── Date Strip & Filter Bar (Exact BookMyShow Match with Spacing) ─── */}
          <div className="sticky top-[104px] lg:top-[112px] z-30 bg-white border-b border-gray-200 shadow-xs h-[60px]">
            <div className="max-w-[1240px] mx-auto px-4 flex items-center justify-between h-full overflow-hidden">
              
              {/* Left Side: Date Strip with spacious gap on the right before vertical divider */}
              <div className="flex items-center gap-1.5 h-full border-r border-gray-200 pr-12 md:pr-20 mr-4 md:mr-6 shrink-0">
                {dateKeys.map((dk) => {
                  const { weekday, day, month } = dateTabParts(dk);
                  const isActive = activeDate === dk;
                  return (
                    <button
                      key={dk}
                      onClick={() => setSelectedDate(dk)}
                      className={`w-[50px] sm:w-[54px] py-1.5 flex flex-col items-center justify-center rounded-md transition cursor-pointer shrink-0 ${
                        isActive
                          ? "bg-[#F84464] text-white shadow-xs"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider ${
                          isActive ? "text-white" : "text-gray-500"
                        }`}
                      >
                        {weekday}
                      </span>
                      <span
                        className={`text-base font-bold leading-tight my-0.5 ${
                          isActive ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {day}
                      </span>
                      <span
                        className={`text-[9px] font-bold uppercase tracking-wider ${
                          isActive ? "text-white" : "text-gray-500"
                        }`}
                      >
                        {month}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Right Side: Filter Cells spanning full 100% height */}
              <div className="flex items-center h-full shrink-0">
                
                {/* 1. Language - Format Active Tab */}
                <div className="relative h-full flex items-center border-r border-gray-200 px-5">
                  <button
                    onClick={() => toggleDropdown("langFormat")}
                    className="flex items-center gap-1 text-xs font-semibold text-gray-900 h-full whitespace-nowrap cursor-pointer"
                  >
                    <span>{activeFormatDisplay}</span>
                  </button>
                  {/* Active Red Bottom Line */}
                  <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#F84464]" />

                  {openDropdown === "langFormat" && (
                    <div className="absolute left-0 top-full z-50 bg-white border border-gray-200 rounded-b-md shadow-xl py-1 min-w-[180px]">
                      <button
                        onClick={() => {
                          setLangFormatFilter("all");
                          setOpenDropdown(null);
                        }}
                        className={`w-full text-left px-4 py-2 text-xs hover:bg-gray-50 ${
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
                          className={`w-full text-left px-4 py-2 text-xs hover:bg-gray-50 ${
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

                {/* 2. Price Range */}
                <div className="relative h-full flex items-center border-r border-gray-200 px-4 hover:bg-gray-50 transition">
                  <button
                    onClick={() => toggleDropdown("price")}
                    className={`flex items-center gap-1 text-xs text-gray-700 hover:text-gray-900 h-full whitespace-nowrap cursor-pointer font-normal ${
                      selectedPriceRanges.length > 0
                        ? "text-[#F84464] font-semibold"
                        : ""
                    }`}
                  >
                    <span>Price Range</span>
                    <ChevronDown
                      className={`h-3.5 w-3.5 text-gray-400 transition-transform ${
                        openDropdown === "price" ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {openDropdown === "price" && (
                    <div className="absolute left-0 top-full z-50 bg-white border border-gray-200 rounded-b-md shadow-xl py-2 min-w-[200px]">
                      {[
                        "₹0 - ₹200",
                        "₹201 - ₹300",
                        "₹301 - ₹400",
                        "₹401 - ₹500",
                        "₹501 - ₹600",
                        "₹601 - ₹700",
                      ].map((range) => {
                        const isChecked = selectedPriceRanges.includes(range);
                        return (
                          <label
                            key={range}
                            className="flex items-center justify-between px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 cursor-pointer select-none"
                          >
                            <span>{range}</span>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                setSelectedPriceRanges((prev) =>
                                  isChecked
                                    ? prev.filter((p) => p !== range)
                                    : [...prev, range]
                                );
                              }}
                              className="h-4 w-4 rounded border-gray-300 text-[#F84464] focus:ring-[#F84464] accent-[#F84464]"
                            />
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 3. Special Formats */}
                <div className="relative h-full flex items-center border-r border-gray-200 px-4 hover:bg-gray-50 transition">
                  <button
                    onClick={() => toggleDropdown("special")}
                    className={`flex items-center gap-1 text-xs text-gray-700 hover:text-gray-900 h-full whitespace-nowrap cursor-pointer font-normal ${
                      selectedSpecialFormats.length > 0
                        ? "text-[#F84464] font-semibold"
                        : ""
                    }`}
                  >
                    <span>Special Formats</span>
                    <ChevronDown
                      className={`h-3.5 w-3.5 text-gray-400 transition-transform ${
                        openDropdown === "special" ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {openDropdown === "special" && (
                    <div className="absolute left-0 top-full z-50 bg-white border border-gray-200 rounded-b-md shadow-xl py-2 min-w-[180px]">
                      {["Dolby", "Luxe"].map((fmt) => {
                        const isChecked = selectedSpecialFormats.includes(fmt);
                        return (
                          <label
                            key={fmt}
                            className="flex items-center justify-between px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 cursor-pointer select-none"
                          >
                            <span>{fmt}</span>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                setSelectedSpecialFormats((prev) =>
                                  isChecked
                                    ? prev.filter((s) => s !== fmt)
                                    : [...prev, fmt]
                                );
                              }}
                              className="h-4 w-4 rounded border-gray-300 text-[#F84464] focus:ring-[#F84464] accent-[#F84464]"
                            />
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 4. Other Filters */}
                <div className="relative h-full flex items-center border-r border-gray-200 px-4 hover:bg-gray-50 transition">
                  <button
                    onClick={() => toggleDropdown("other")}
                    className={`flex items-center gap-1 text-xs text-gray-700 hover:text-gray-900 h-full whitespace-nowrap cursor-pointer font-normal ${
                      selectedOtherFilters.length > 0
                        ? "text-[#F84464] font-semibold"
                        : ""
                    }`}
                  >
                    <span>Other Filters</span>
                    <ChevronDown
                      className={`h-3.5 w-3.5 text-gray-400 transition-transform ${
                        openDropdown === "other" ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {openDropdown === "other" && (
                    <div className="absolute left-0 top-full z-50 bg-white border border-gray-200 rounded-b-md shadow-xl py-2 min-w-[210px]">
                      {[
                        "Cancellation available",
                        "M-Ticket",
                        "Food & Beverage",
                      ].map((filterName) => {
                        const isChecked =
                          selectedOtherFilters.includes(filterName);
                        return (
                          <label
                            key={filterName}
                            className="flex items-center justify-between px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 cursor-pointer select-none"
                          >
                            <span>{filterName}</span>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                setSelectedOtherFilters((prev) =>
                                  isChecked
                                    ? prev.filter((o) => o !== filterName)
                                    : [...prev, filterName]
                                );
                              }}
                              className="h-4 w-4 rounded border-gray-300 text-[#F84464] focus:ring-[#F84464] accent-[#F84464]"
                            />
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 5. Preferred Time */}
                <div className="relative h-full flex items-center border-r border-gray-200 px-4 hover:bg-gray-50 transition">
                  <button
                    onClick={() => toggleDropdown("time")}
                    className={`flex items-center gap-1 text-xs text-gray-700 hover:text-gray-900 h-full whitespace-nowrap cursor-pointer font-normal ${
                      preferredTime !== "any"
                        ? "text-[#F84464] font-semibold"
                        : ""
                    }`}
                  >
                    <span>
                      {preferredTime === "any"
                        ? "Preferred Time"
                        : preferredTime.charAt(0).toUpperCase() +
                          preferredTime.slice(1)}
                    </span>
                    <ChevronDown
                      className={`h-3.5 w-3.5 text-gray-400 transition-transform ${
                        openDropdown === "time" ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {openDropdown === "time" && (
                    <div className="absolute right-0 top-full z-50 bg-white border border-gray-200 rounded-b-md shadow-xl py-1 min-w-[220px]">
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
                            className={`w-full text-left px-4 py-2.5 text-xs hover:bg-gray-50 ${
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

                {/* 6. Sort By (Exact BookMyShow Radio Popup) */}
                <div className="relative h-full flex items-center border-r border-gray-200 px-4 hover:bg-gray-50 transition">
                  <button
                    onClick={() => toggleDropdown("sort")}
                    className="flex items-center gap-1 text-xs text-gray-700 hover:text-gray-900 h-full whitespace-nowrap cursor-pointer font-normal"
                  >
                    <span>Sort By</span>
                    <ChevronDown
                      className={`h-3.5 w-3.5 text-gray-400 transition-transform ${
                        openDropdown === "sort" ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {openDropdown === "sort" && (
                    <div className="absolute right-0 top-full z-50 bg-white border border-gray-200 rounded-b-md shadow-xl py-3 min-w-[240px]">
                      {[
                        {
                          id: "relevance",
                          title: "Relevance",
                          subtitle: "Best options for you first",
                        },
                        {
                          id: "popularity",
                          title: "Popularity",
                          subtitle: "Show most popular first",
                        },
                        {
                          id: "distance",
                          title: "Distance",
                          subtitle: "Show nearest first",
                        },
                      ].map((opt) => {
                        const isSelected = sortBy === opt.id;
                        return (
                          <div
                            key={opt.id}
                            onClick={() => {
                              setSortBy(opt.id as any);
                              setOpenDropdown(null);
                            }}
                            className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 cursor-pointer transition"
                          >
                            <div>
                              <div className="text-xs font-bold text-gray-900">
                                {opt.title}
                              </div>
                              <div className="text-[11px] text-gray-400 mt-0.5">
                                {opt.subtitle}
                              </div>
                            </div>
                            <div
                              className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                isSelected
                                  ? "border-[#F84464] bg-[#F84464]"
                                  : "border-gray-300"
                              }`}
                            >
                              {isSelected && (
                                <div className="w-1.5 h-1.5 rounded-full bg-white" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 7. Search Toggle Icon */}
                <div className="relative h-full flex items-center px-4 hover:bg-gray-50 transition">
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
                      className="p-1 text-gray-600 hover:text-gray-900 cursor-pointer flex items-center"
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
                      className="p-4 sm:p-5 flex flex-col gap-3 hover:bg-gray-50/50 transition border-b border-gray-100 last:border-b-0"
                    >
                      {/* Top Row: Logo, Title & Info, and Heart Icon on Far Right */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 min-w-0">
                          {/* Logo badge */}
                          {isPVR ? (
                            <div className="w-10 h-10 rounded-lg border border-gray-200 bg-white flex items-center justify-center font-bold text-amber-500 font-serif text-xs shrink-0 shadow-2xs">
                              PVR
                            </div>
                          ) : isCinepolis ? (
                            <div className="w-10 h-10 rounded-lg border border-gray-200 bg-white flex items-center justify-center font-black text-blue-600 text-[10px] shrink-0 shadow-2xs">
                              cinépolis
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-lg border border-gray-200 bg-white flex items-center justify-center font-bold text-gray-600 text-[10px] shrink-0 shadow-2xs">
                              CINEMA
                            </div>
                          )}

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h3
                                onClick={() => setSelectedCinemaInfo(venue)}
                                className="text-sm sm:text-base font-bold text-gray-900 hover:text-[#F84464] transition leading-snug cursor-pointer truncate"
                              >
                                {venue.venue_name}
                              </h3>
                              <Info
                                onClick={() => setSelectedCinemaInfo(venue)}
                                className="h-4 w-4 text-gray-400 shrink-0 cursor-pointer hover:text-gray-600"
                              />
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">
                              Cancellation available
                            </p>
                          </div>
                        </div>

                        {/* Top Right: Favorite Heart Button */}
                        <button
                          type="button"
                          onClick={() => toggleFavorite(venue.venue_id)}
                          className="text-gray-300 hover:text-[#F84464] p-1 transition cursor-pointer shrink-0"
                          title="Bookmark Cinema"
                        >
                          <Heart
                            className={`h-5 w-5 ${
                              isFav ? "fill-[#F84464] text-[#F84464]" : ""
                            }`}
                          />
                        </button>
                      </div>

                      {/* Second Row: Square Icon Badges (F&B and M-Ticket) */}
                      <div className="flex items-center gap-2.5">
                        {/* Food & Beverage Badge */}
                        <div
                          className="w-7 h-7 rounded-md bg-[#FDF4EA] border border-[#FEEAD4] flex items-center justify-center text-[#F48F29]"
                          title="Food & Beverage Available"
                        >
                          <Coffee className="h-4 w-4" />
                        </div>

                        {/* M-Ticket Badge */}
                        <div
                          className="w-7 h-7 rounded-md bg-[#EDF7F2] border border-[#D5EFE1] flex items-center justify-center text-[#34A853]"
                          title="M-Ticket Available"
                        >
                          <Smartphone className="h-4 w-4" />
                        </div>
                      </div>

                      {/* Third Row: Showtime Slots (Positioned directly below the badges) */}
                      <div className="flex flex-wrap items-center gap-3 pt-1">
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
                              className={`relative rounded px-3 py-1.5 min-w-[105px] text-center transition cursor-pointer flex flex-col items-center justify-center ${
                                isPast
                                  ? "border border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50"
                                  : "border border-[#34A853] border-l-[4px] border-l-[#34A853] bg-white hover:bg-[#34A853]/5 shadow-2xs"
                              }`}
                            >
                              <div className="flex items-center justify-center gap-1">
                                <span
                                  className={`text-xs sm:text-[13px] font-bold ${
                                    isPast ? "text-gray-300" : "text-gray-800"
                                  }`}
                                >
                                  {istTimeLabel(slot.starts_at)}
                                </span>
                                <span className="text-[9px] font-semibold border border-gray-400 text-gray-600 px-1 rounded-xs leading-tight font-sans">
                                  ENG
                                </span>
                              </div>
                              <div className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mt-0.5">
                                {slot.format || "2D"}
                              </div>
                            </button>
                          );
                        })}
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
      {/* ─── Cinema Info Modal (BookMyShow exact clone) ─── */}
      {selectedCinemaInfo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedCinemaInfo(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-[460px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with Title & Close button */}
            <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100 bg-white">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 pr-4 truncate">
                {selectedCinemaInfo.venue_name}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedCinemaInfo(null)}
                className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-900 transition cursor-pointer shrink-0"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Map Preview */}
            <div className="relative w-full h-44 bg-slate-100 overflow-hidden border-b border-gray-100">
              <iframe
                title="Cinema Location Map"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                src={`https://maps.google.com/maps?q=${encodeURIComponent(
                  selectedCinemaInfo.venue_name + ", " + selectedCinemaInfo.city
                )}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
              />
            </div>

            {/* Modal Body */}
            <div className="p-5 bg-white">
              {/* Address Row */}
              <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-4">
                <div className="flex items-start gap-2.5 min-w-0">
                  <MapPin className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {selectedCinemaInfo.address ||
                      `${selectedCinemaInfo.venue_name}, M.G. Road, ${selectedCinemaInfo.city}, ${getCityState(selectedCinemaInfo.city)}, India`}
                  </p>
                </div>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    selectedCinemaInfo.venue_name + ", " + selectedCinemaInfo.city
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#129B9B] hover:text-[#0e7d7d] p-1.5 rounded-full hover:bg-teal-50 transition shrink-0"
                  title="Open Directions"
                >
                  <Navigation className="h-4 w-4" />
                </a>
              </div>

              {/* Favorites Row */}
              <div
                onClick={() => toggleFavorite(selectedCinemaInfo.venue_id)}
                className="flex items-center gap-2.5 py-3.5 border-b border-gray-100 cursor-pointer group select-none"
              >
                <Heart
                  className={`h-4 w-4 transition ${
                    favorites[selectedCinemaInfo.venue_id]
                      ? "fill-[#F84464] text-[#F84464]"
                      : "text-gray-400 group-hover:text-[#F84464]"
                  }`}
                />
                <span className="text-xs font-semibold text-gray-700 group-hover:text-gray-900">
                  {favorites[selectedCinemaInfo.venue_id]
                    ? "Added to your favorite cinemas"
                    : "Tap to add to your favorite cinemas"}
                </span>
              </div>

              {/* Available Facilities Section */}
              <div className="pt-4">
                <h4 className="text-xs font-bold text-gray-900 tracking-wide uppercase mb-3">
                  Available Facilities
                </h4>
                <div className="flex items-start gap-8">
                  {/* Wheel Chair */}
                  <div className="flex flex-col items-center text-center">
                    <div className="w-10 h-10 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center mb-1.5 text-gray-700">
                      <Accessibility className="h-5 w-5 text-gray-700" />
                    </div>
                    <span className="text-[10px] font-semibold text-gray-600 leading-tight">
                      Wheel Chair
                      <br />
                      Facility
                    </span>
                  </div>

                  {/* Parking */}
                  <div className="flex flex-col items-center text-center">
                    <div className="w-10 h-10 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center mb-1.5 text-gray-700">
                      <Car className="h-5 w-5 text-gray-700" />
                    </div>
                    <span className="text-[10px] font-semibold text-gray-600 leading-tight">
                      Parking
                      <br />
                      Facility
                    </span>
                  </div>

                  {/* Food Court */}
                  <div className="flex flex-col items-center text-center">
                    <div className="w-10 h-10 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center mb-1.5 text-gray-700">
                      <Utensils className="h-5 w-5 text-gray-700" />
                    </div>
                    <span className="text-[10px] font-semibold text-gray-600 leading-tight">
                      Food
                      <br />
                      Court
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <Footer />
    </div>
  );
}
