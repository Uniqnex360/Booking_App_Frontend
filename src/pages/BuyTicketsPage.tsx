import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useParams, useSearchParams, Link } from "react-router-dom";

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { api, unwrap } from "@/api/client";
import {
  ChevronDown,
  Heart,
  MapPin,
  Search,
  X,
  Info,
  Coffee,
  Smartphone,
  Navigation,
  Accessibility,
  Car,
  Utensils,
  PartyPopper,
} from "lucide-react";
import { withCity } from "@/lib/cityLink";
import { LoadingPage } from "./LoadingPage";
import { SeatVehicle } from "./SeatVehicle";
import { AgeRestrictionModal } from "@/components/common/AgeRestrictionModal";

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
const PRICE_RANGES = [
  { label: "₹0 - ₹200", min: 0, max: 200 },
  { label: "₹201 - ₹300", min: 201, max: 300 },
  { label: "₹301 - ₹400", min: 301, max: 400 },
  { label: "₹401 - ₹500", min: 401, max: 500 },
  { label: "₹501 - ₹600", min: 501, max: 600 },
  { label: "₹601 - ₹700", min: 601, max: 700 },
];
function matchesPriceRange(
  tiers: Array<{ price: string }> | undefined,
  selectedRanges: { min: number; max: number }[]
): boolean {
  if (selectedRanges.length === 0) return true;
  if (!tiers || tiers.length === 0) return true; // pricing not fetched yet, don't hide
  return tiers.some((t) => {
    const price = parseFloat(t.price.replace(/[^0-9.]/g, ""));
    return selectedRanges.some((r) => price >= r.min && price <= r.max);
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
  const [selectedPriceRanges, setSelectedPriceRanges] = useState<{ min: number; max: number }[]>([]);
  const [selectedSpecialFormats, setSelectedSpecialFormats] = useState<string[]>([]);
  const [selectedOtherFilters, setSelectedOtherFilters] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<"relevance" | "popularity" | "distance">("relevance");
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [selectedCinemaInfo, setSelectedCinemaInfo] = useState<VenueGroup | null>(null);

  const [showtimePricingMap, setShowtimePricingMap] = useState<
    Record<string, Array<{ price: string; tier: string; status: string; statusColor: string }>>
  >({});

  const now = Date.now();

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

  const venuesForDate = useMemo(() => {
    if (!activeDate) return [];
    let list = venuesInCity
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
          .filter((s) => matchesPriceRange(showtimePricingMap[s.id], selectedPriceRanges))
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
      .filter((v) => v.showtimes.length > 0);

    if (sortBy === "popularity") {
      list = [...list].sort(
        (a, b) => b.showtimes.length - a.showtimes.length
      );
    } else if (sortBy === "distance") {
      list = [...list].sort((a, b) =>
        a.venue_name.localeCompare(b.venue_name)
      );
    }
    return list;
  }, [
    activeDate,
    venuesInCity,
    now,
    langFormatFilter,
    selectedSpecialFormats,
    selectedPriceRanges,
    preferredTime,
    searchQuery,
    sortBy,
    showtimePricingMap
  ]);

  const fetchShowtimePricing = useCallback(async (slotId: string) => {
    if (showtimePricingMap[slotId]) return;
    try {
      const data = await unwrap<any>(api.get(`/showtimes/${slotId}/seat-map`));
      if (data) {
        const allSeats: any[] = [];
        if (data.seats && Array.isArray(data.seats) && data.seats.length > 0) {
          allSeats.push(...data.seats);
        } else if (data.rows && Array.isArray(data.rows)) {
          data.rows.forEach((r: any) => {
            if (r.seats && Array.isArray(r.seats)) {
              r.seats.forEach((s: any) => {
                allSeats.push({
                  row_label: r.label,
                  price_paise: s.price_paise || r.price_paise || 25000,
                  is_available: s.status === "AVAILABLE",
                });
              });
            }
          });
        }

        const rawRows: Record<string, { price_paise: number; seats: any[] }> = {};
        allSeats.forEach((seat) => {
          if (!rawRows[seat.row_label]) {
            rawRows[seat.row_label] = { price_paise: seat.price_paise, seats: [] };
          }
          rawRows[seat.row_label].seats.push(seat);
        });

        const tiers: { name: string; price_paise: number; totalSeats: number; availSeats: number }[] = [];
        Object.entries(rawRows).forEach(([_, rowData]) => {
          let tierName = "CLASSIC";
          const priceRupees = rowData.price_paise / 100;
          if (priceRupees >= 350) tierName = "RECLINER";
          else if (priceRupees >= 250) tierName = "PRIME PLUS";
          else if (priceRupees >= 200) tierName = "PRIME";

          let existing = tiers.find((t) => t.price_paise === rowData.price_paise);
          if (!existing) {
            existing = { name: tierName, price_paise: rowData.price_paise, totalSeats: 0, availSeats: 0 };
            tiers.push(existing);
          }
          existing.totalSeats += rowData.seats.length;
          existing.availSeats += rowData.seats.filter((s) => s.is_available).length;
        });

        tiers.sort((a, b) => b.price_paise - a.price_paise);

        const parsedTiers = tiers.map((t) => {
          const isFillingFast = t.totalSeats > 0 && t.availSeats / t.totalSeats < 0.4;
          return {
            price: `₹ ${(t.price_paise / 100).toFixed(2)}`,
            tier: t.name,
            status: isFillingFast ? "Filling Fast" : "Available",
            statusColor: isFillingFast ? "text-[#FFB000]" : "text-[#34A853]",
          };
        });

        if (parsedTiers.length > 0) {
          setShowtimePricingMap((prev) => ({ ...prev, [slotId]: parsedTiers }));
        }
      }
    } catch (err) {
      console.error("Failed to fetch showtime pricing", err);
    }
  }, [showtimePricingMap]);

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

  useEffect(() => {
    if (!venuesForDate || venuesForDate.length === 0) return;
    venuesForDate.forEach((v) => {
      v.showtimes.forEach((slot) => {
        if (!showtimePricingMap[slot.id]) {
          fetchShowtimePricing(slot.id);
        }
      });
    });
  }, [venuesForDate, fetchShowtimePricing, showtimePricingMap]);

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

  const handleTicketChangeConfirm = () => {
    setShowTicketModal(false);
    const p = new URLSearchParams(searchParams);
    p.set("qty", tempTicketCount.toString());
    setSearchParams(p, { replace: true });

    if (selectedSlotId) {
      try {
        const parentVenue = venuesInCity.find((v) =>
          v.showtimes.some((s) => s.id === selectedSlotId)
        );
        if (parentVenue) {
          sessionStorage.setItem(
            "vyhbz_venue_showtimes",
            JSON.stringify({
              venue_name: parentVenue.venue_name,
              movie_title: movie?.title,
              showtimes: parentVenue.showtimes.map((s) => ({
                id: s.id,
                starts_at: s.starts_at,
                format: s.format,
                screen_name: s.screen_name,
                language: s.language,
              })),
            })
          );
        }
      } catch (err) {
        console.error("Failed to cache venue showtimes", err);
      }

      navigate(
        withCity(
          `/showtimes/${selectedSlotId}/seat-map?qty=${tempTicketCount}`,
          city
        )
      );
    }
  };

  const [showAgeWarningModal, setShowAgeWarningModal] = useState(false);
  const [pendingSlotId, setPendingSlotId] = useState<string | null>(null);
  const [ageVerified, setAgeVerified] = useState(false);
  const selectedSlot = useMemo(() => {
    if (!selectedSlotId || !movie?.venues) return null;
    for (const v of movie.venues) {
      const s = v.showtimes.find((st) => st.id === selectedSlotId);
      if (s) return s;
    }
    return null;
  }, [selectedSlotId, movie]);

  const isSelectedSlotCouple = useMemo(() => {
    if (!selectedSlot) return false;
    const sName = (selectedSlot.screen_name || "").toLowerCase();
    const fmt = (selectedSlot.format || "").toLowerCase();
    return sName.includes("couple") || fmt.includes("couple");
  }, [selectedSlot]);

  const proceedWithSlot = (slotId: string) => {
    setSelectedSlotId(slotId);
    let initialCount = ticketCount;
    if (movie?.venues) {
      for (const v of movie.venues) {
        const s = v.showtimes.find((st) => st.id === slotId);
        if (s) {
          const sName = (s.screen_name || "").toLowerCase();
          const fmt = (s.format || "").toLowerCase();
          if (sName.includes("couple") || fmt.includes("couple")) {
            if (initialCount % 2 !== 0 || initialCount < 2) {
              initialCount = 2;
            }
          }
          break;
        }
      }
    }
    setTempTicketCount(initialCount);
    setShowTicketModal(true);
    if (!showtimePricingMap[slotId]) {
      fetchShowtimePricing(slotId);
    }
  };

  const handleShowtimeClick = (slotId: string) => {
    if (movie?.certificate?.toUpperCase() === "A" && !ageVerified) {
      setPendingSlotId(slotId);
      setShowAgeWarningModal(true);
      return;
    }
    proceedWithSlot(slotId);
  };

  const currentSlotTiers = useMemo(() => {
    if (selectedSlotId && showtimePricingMap[selectedSlotId]?.length) {
      return showtimePricingMap[selectedSlotId];
    }
    return [
      { tier: "RECLINER", price: "₹500", status: "FILLING FAST", statusColor: "text-[#E5A100]" },
      { tier: "ELITE", price: "₹210", status: "AVAILABLE", statusColor: "text-[#34A853]" },
      { tier: "CLASSIC", price: "₹170", status: "AVAILABLE", statusColor: "text-[#34A853]" },
    ];
  }, [selectedSlotId, showtimePricingMap]);

  const toggleDropdown = (
    name: "langFormat" | "time" | "price" | "special" | "other" | "sort"
  ) => setOpenDropdown((cur) => (cur === name ? null : name));

  const handleOpenCityModal = () => {
    window.dispatchEvent(new CustomEvent("open-city-modal"));
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
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium border ${
                  movie.certificate?.toUpperCase() === "A"
                    ? "border-red-500 bg-red-50 text-red-600 font-bold"
                    : "border-gray-300 text-gray-600"
                }`}
              >
                {movie.certificate?.toUpperCase() === "A" ? "A • 18+" : movie.certificate}
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
          {movie.certificate?.toUpperCase() === "A" && (
            <div className="mt-3 inline-flex items-center gap-2 bg-red-50 border border-red-200 text-red-800 text-xs px-3 py-1.5 rounded-md font-medium">
              <span className="font-bold">Age Restriction:</span>
              <span>This movie is rated 'A' (Adults Only) and strictly for viewers aged 18 and above. Please carry valid government ID.</span>
            </div>
          )}
        </div>
      </div>

      {dateKeys.length === 0 ? (
        <div className="max-w-[1240px] mx-auto px-4">
          <div className="text-center py-16 text-gray-500">
            <MapPin className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="text-lg font-medium text-gray-800">
              No showtimes available in {city}
            </p>
            <p className="text-sm text-gray-400 mt-1 mb-6">
              Try selecting a different city
            </p>

            {/* ─── Unable to find prompt / Change Location button ─── */}
            <div className="text-center py-4 bg-white rounded-xl border border-gray-100 shadow-2xs max-w-md mx-auto">
              <button
                type="button"
                onClick={handleOpenCityModal}
                className="text-xs text-gray-500 hover:text-[#7B1E3D] font-medium mb-3 transition cursor-pointer block mx-auto"
              >
                Unable to find what you are looking for?
              </button>
              <button
                type="button"
                onClick={handleOpenCityModal}
                className="border border-[#7B1E3D] text-[#7B1E3D] hover:bg-[#7B1E3D] hover:text-white px-5 py-2 rounded-md text-xs font-semibold transition cursor-pointer"
              >
                Change Location
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* ─── Date Strip & Filter Bar (Exact BookMyShow Match with Spacing) ─── */}

 <div className="sticky top-[104px] lg:top-[112px] z-40 bg-white border-b border-gray-200 shadow-xs h-[72px] sm:h-[74px]">
            <div className="max-w-[1240px] mx-auto px-4 flex items-center justify-between h-full">
              
              {/* Left Side: Date Strip with spacious gap on the right before vertical divider */}
              <div className="flex items-center gap-2 h-full border-r border-gray-200 pr-12 md:pr-20 mr-4 md:mr-6 shrink-0 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden py-1.5">
                {dateKeys.map((dk) => {
                  const { weekday, day, month } = dateTabParts(dk);
                  const isActive = activeDate === dk;
                  return (
                    <button
                      key={dk}
                      onClick={() => setSelectedDate(dk)}
                      className={`w-[52px] sm:w-[58px] h-[52px] sm:h-[56px] py-1 flex flex-col items-center justify-center rounded-md transition cursor-pointer shrink-0 ${
                        isActive
                          ? "bg-[#7B1E3D] text-white shadow-xs"
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
                  <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#7B1E3D]" />

                  {openDropdown === "langFormat" && (
                    <div className="absolute left-0 top-full z-50 bg-white border border-gray-200 rounded-b-md shadow-xl py-1 min-w-[180px]">
                      <button
                        onClick={() => {
                          setLangFormatFilter("all");
                          setOpenDropdown(null);
                        }}
                        className={`w-full text-left px-4 py-2 text-xs hover:bg-gray-50 ${
                          langFormatFilter === "all"
                            ? "text-[#7B1E3D] font-semibold"
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
                              ? "text-[#7B1E3D] font-semibold"
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
                        ? "text-[#7B1E3D] font-semibold"
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
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute left-0 top-full z-50 bg-white border border-gray-200 rounded-b-md shadow-xl py-2 min-w-[200px]"
                    >
                      {PRICE_RANGES.map((range) => {
  const isChecked = selectedPriceRanges.some(
    (r) => r.min === range.min && r.max === range.max
  );
  return (
    <div
      key={range.label}
      onClick={() => {
        setSelectedPriceRanges((prev) =>
          prev.some((r) => r.min === range.min && r.max === range.max)
            ? prev.filter(
                (r) => !(r.min === range.min && r.max === range.max)
              )
            : [...prev, range]
        );
      }}
      className="flex items-center justify-between px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 cursor-pointer select-none"
    >
      <span>{range.label}</span>
      <input
        type="checkbox"
        checked={isChecked}
        readOnly
        className="h-4 w-4 rounded border-gray-300 text-[#7B1E3D] focus:ring-[#7B1E3D] accent-[#7B1E3D] pointer-events-none cursor-pointer"
      />
    </div>
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
                        ? "text-[#7B1E3D] font-semibold"
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
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute left-0 top-full z-50 bg-white border border-gray-200 rounded-b-md shadow-xl py-2 min-w-[180px]"
                    >
                      {["Dolby", "Luxe"].map((fmt) => {
                        const isChecked = selectedSpecialFormats.includes(fmt);
                        return (
                          <div
                            key={fmt}
                            onClick={() => {
                              setSelectedSpecialFormats((prev) =>
                                prev.includes(fmt)
                                  ? prev.filter((s) => s !== fmt)
                                  : [...prev, fmt]
                              );
                            }}
                            className="flex items-center justify-between px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 cursor-pointer select-none"
                          >
                            <span>{fmt}</span>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              readOnly
                              className="h-4 w-4 rounded border-gray-300 text-[#7B1E3D] focus:ring-[#7B1E3D] accent-[#7B1E3D] pointer-events-none cursor-pointer"
                            />
                          </div>
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
                        ? "text-[#7B1E3D] font-semibold"
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
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute left-0 top-full z-50 bg-white border border-gray-200 rounded-b-md shadow-xl py-2 min-w-[210px]"
                    >
                      {[
                        "Cancellation available",
                        "M-Ticket",
                        "Food & Beverage",
                      ].map((filterName) => {
                        const isChecked =
                          selectedOtherFilters.includes(filterName);
                        return (
                          <div
                            key={filterName}
                            onClick={() => {
                              setSelectedOtherFilters((prev) =>
                                prev.includes(filterName)
                                  ? prev.filter((o) => o !== filterName)
                                  : [...prev, filterName]
                              );
                            }}
                            className="flex items-center justify-between px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 cursor-pointer select-none"
                          >
                            <span>{filterName}</span>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              readOnly
                              className="h-4 w-4 rounded border-gray-300 text-[#7B1E3D] focus:ring-[#7B1E3D] accent-[#7B1E3D] pointer-events-none cursor-pointer"
                            />
                          </div>
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
                        ? "text-[#7B1E3D] font-semibold"
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
                                ? "text-[#7B1E3D] font-semibold"
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
                                  ? "border-[#7B1E3D] bg-[#7B1E3D]"
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
                      className="p-5 flex flex-col gap-3 hover:bg-gray-50/50 transition"
                    >
                      {/* Top Row: Cinema Details & Bookmark */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-2.5 min-w-0">
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

                          <div>
                            <div className="flex items-center gap-1.5">
                              <h3
                                onClick={() => setSelectedCinemaInfo(venue)}
                                className="text-sm sm:text-base font-bold text-gray-900 hover:text-[#7B1E3D] transition leading-snug cursor-pointer"
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
                          className="text-gray-300 hover:text-[#7B1E3D] p-1 transition cursor-pointer shrink-0"
                          title="Bookmark Cinema"
                        >
                          <Heart
                            className={`h-5 w-5 ${
                              isFav ? "fill-[#7B1E3D] text-[#7B1E3D]" : ""
                            }`}
                          />
                        </button>
                      </div>

                      {/* Second Row: Square Icon Badges (F&B and M-Ticket with hover text expanding to the right) */}
                      <div className="flex items-center gap-2.5">
                        {/* Food & Beverage Badge */}
                        <div
                          className="group flex items-center gap-1.5 bg-[#FFF8E7] text-[#FF9800] border border-[#FFE8B3] rounded-md px-2 py-1.5 text-xs font-semibold cursor-pointer transition-all duration-200"
                          title="Food & Beverage Available"
                        >
                          <Coffee className="h-3.5 w-3.5 shrink-0" />
                          <span className="max-w-0 overflow-hidden group-hover:max-w-[120px] opacity-0 group-hover:opacity-100 transition-all duration-300 ease-out whitespace-nowrap text-[11px] font-bold">
                            Food &amp; Beverage
                          </span>
                        </div>

                        {/* M-Ticket Badge */}
                        <div
                          className="group flex items-center gap-1.5 bg-[#E8F8EE] text-[#1EA83C] border border-[#C5F0D5] rounded-md px-2 py-1.5 text-xs font-semibold cursor-pointer transition-all duration-200"
                          title="M-Ticket Available"
                        >
                          <Smartphone className="h-3.5 w-3.5 shrink-0" />
                          <span className="max-w-0 overflow-hidden group-hover:max-w-[80px] opacity-0 group-hover:opacity-100 transition-all duration-300 ease-out whitespace-nowrap text-[11px] font-bold">
                            M-Ticket
                          </span>
                        </div>
                      </div>

                      {/* Third Row: Showtime Slots with Live Dynamic Pricing Tooltip from API */}
                      <div className="flex flex-wrap items-center gap-3 pt-1">
                        {venue.showtimes.map((slot) => {
                          const isPast =
                            new Date(slot.starts_at).getTime() < now;
                          const fmt = (slot.format || "").toUpperCase();
                          const fallbackPricing = fmt.includes("LUXE")
                            ? [
                                { price: "₹ 650.00", tier: "LUXE PRIME", status: "Filling Fast", statusColor: "text-[#FFB000]" },
                                { price: "₹ 500.00", tier: "LUXE", status: "Available", statusColor: "text-[#34A853]" },
                              ]
                            : [
                                { price: "₹ 390.00", tier: "RECLINER", status: "Available", statusColor: "text-[#34A853]" },
                                { price: "₹ 290.00", tier: "PRIME PLUS", status: "Available", statusColor: "text-[#34A853]" },
                                { price: "₹ 190.00", tier: "CLASSIC", status: "Available", statusColor: "text-[#34A853]" },
                              ];
                          const pricingTiers =
                            showtimePricingMap[slot.id] || fallbackPricing;

                          return (
                            <div
                              key={slot.id}
                              className="relative group"
                              onMouseEnter={() =>
                                fetchShowtimePricing(slot.id)
                              }
                            >
                              {/* Price Tooltip on Hover (Fetched dynamically from API) */}
                              {!isPast && (
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col bg-white rounded-xl shadow-2xl border border-gray-100 p-3 min-w-[210px] z-50 pointer-events-none animate-in fade-in zoom-in-95 duration-150">
                                  <div className="flex items-center justify-around gap-4 text-center">
                                    {pricingTiers.map((tierItem, idx) => (
                                      <div
                                        key={idx}
                                        className="flex flex-col items-center"
                                      >
                                        <span className="font-bold text-xs sm:text-[13px] text-gray-900 tracking-tight">
                                          {tierItem.price}
                                        </span>
                                        <span className="text-[9px] font-semibold text-gray-700 uppercase mt-0.5 whitespace-nowrap">
                                          {tierItem.tier}
                                        </span>
                                        <span
                                          className={`text-[9px] font-semibold mt-0.5 whitespace-nowrap ${tierItem.statusColor}`}
                                        >
                                          {tierItem.status}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                  {/* Tooltip Downward Caret */}
                                  <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rotate-45 border-r border-b border-gray-100" />
                                </div>
                              )}

                              <button
                                onClick={() => {
                                  if (!isPast) handleShowtimeClick(slot.id);
                                }}
                                disabled={isPast}
                                className={`relative rounded px-3 py-1 min-w-[100px] h-[38px] sm:h-[40px] text-center transition cursor-pointer flex flex-col items-center justify-center leading-none ${
                                  isPast
                                    ? "border border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50"
                                    : "border border-[#34A853] border-l-[4px] border-l-[#34A853] bg-white hover:bg-[#34A853]/5 shadow-2xs"
                                }`}
                              >
                                <div className="flex items-center justify-center gap-1 leading-none">
                                  <span
                                    className={`text-xs sm:text-[13px] font-bold leading-none ${
                                      isPast ? "text-gray-300" : "text-gray-800"
                                    }`}
                                  >
                                    {istTimeLabel(slot.starts_at)}
                                  </span>
                                  <span className="text-[8px] font-semibold border border-gray-400 text-gray-600 px-1 rounded-xs leading-none font-sans">
                                    ENG
                                  </span>
                                </div>
                                <div className="text-[8px] font-semibold text-gray-400 uppercase tracking-wider leading-none mt-1">
                                  {slot.format || "2D"}
                                </div>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ─── Unable to find prompt / Change Location button ─── */}
          <div className="text-center py-6 bg-white border-t border-gray-100 mt-6">
            <button
              type="button"
              onClick={handleOpenCityModal}
              className="text-xs text-gray-500 hover:text-[#7B1E3D] font-medium mb-3 transition cursor-pointer block mx-auto"
            >
              Unable to find what you are looking for?
            </button>
            <button
              type="button"
              onClick={handleOpenCityModal}
              className="border border-[#7B1E3D] text-[#7B1E3D] hover:bg-[#7B1E3D] hover:text-white px-5 py-2 rounded-md text-xs font-semibold transition cursor-pointer"
            >
              Change Location
            </button>
          </div>

          {/* ─── Breadcrumb Trail (Matching BMS Exact Reference) ─── */}
          <div className="max-w-[1240px] mx-auto px-4 py-4">
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-gray-500 font-normal">
              <Link to="/" className="hover:text-gray-900 transition">
                Home
              </Link>
              <span className="text-gray-400">→</span>
              <span className="hover:text-gray-900 cursor-pointer">
                Movies in {city}
              </span>
              <span className="text-gray-400">→</span>
              <span className="hover:text-gray-900 cursor-pointer">
                {movie.language} Movies
              </span>
              <span className="text-gray-400">→</span>
              <span className="text-gray-800 font-medium">{movie.title}</span>
            </div>
          </div>

          {/* ─── List your Show Banner (Matching BMS Exact Reference) ─── */}
          <div className="bg-[#404046] text-white py-4 px-4 sm:px-8 mt-4">
            <div className="max-w-[1240px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                  <PartyPopper className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                    <span className="text-sm sm:text-base font-bold text-white whitespace-nowrap">
                      List your Show
                    </span>
                    <span className="text-xs text-gray-300">
                      Got a show, event, activity or a great experience? Partner with us &amp; get listed on Vyhbhz
                    </span>
                  </div>
                </div>
              </div>
              <Link
                to="/partner/register"
                className="bg-[#7B1E3D] hover:bg-[#5C0F2A] text-white font-semibold text-xs px-5 py-2.5 rounded-md transition shrink-0 cursor-pointer shadow-xs whitespace-nowrap"
              >
                Contact today!
              </Link>
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
            className="bg-white rounded-xl shadow-2xl w-full max-w-[420px] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pt-6 pb-2 text-center">
              <h2 className="text-lg font-bold text-gray-900">
                How many seats?
              </h2>
              {isSelectedSlotCouple && (
                <p className="text-xs text-[#7B1E3D] font-semibold mt-1">
                  Couple Recliner: Select 2, 4, 6, 8, or 10 seats (Pairs of 2)
                </p>
              )}
            </div>

            <div className="flex items-center justify-center py-4">
              <SeatVehicle count={tempTicketCount} />
            </div>

            <div
              className={`flex items-center pt-2 pb-5 overflow-hidden select-none ${
                isSelectedSlotCouple
                  ? "justify-center gap-3 sm:gap-4 px-4"
                  : "justify-between px-6"
              }`}
            >
              {(isSelectedSlotCouple
                ? [2, 4, 6, 8, 10]
                : Array.from({ length: MAX_TICKETS }, (_, i) => i + 1)
              ).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setTempTicketCount(n)}
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold transition cursor-pointer shrink-0 ${
                    tempTicketCount === n
                      ? "bg-[#7B1E3D] text-white shadow-md font-bold"
                      : "text-gray-700 hover:bg-gray-100 border border-gray-200"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>

            {/* Tiers & Seat Pricing Breakdown */}
            <div className="border-t border-gray-100 px-6 py-4">
              <div className="flex items-center justify-around text-center gap-3">
                {currentSlotTiers.map((t, idx) => {
                  const displayPrice = t.price.startsWith("₹")
                    ? t.price.replace("₹ ", "₹").split(".")[0]
                    : `₹${t.price}`;
                  const isFillingFast = t.status.toLowerCase().includes("filling");
                  return (
                    <div key={idx} className="flex flex-col items-center">
                      <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                        {t.tier}
                      </span>
                      <span className="text-sm sm:text-base font-bold text-gray-900 mt-0.5">
                        {displayPrice}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase mt-0.5 ${
                          isFillingFast ? "text-[#E5A100]" : "text-[#34A853]"
                        }`}
                      >
                        {t.status.toUpperCase()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bestseller seats banner */}
            <div className="bg-[#F8F9FA] border-t border-gray-100 py-2.5 px-4 text-center text-xs text-gray-600 flex items-center justify-center flex-wrap gap-1">
              <span>Book the</span>
              <span className="inline-block w-3.5 h-3.5 border-2 border-[#E5A100] rounded-xs bg-[#FFF8E7] mx-0.5" />
              <span className="font-bold text-gray-800">Bestseller Seats</span>
              <span>in this cinema at no extra cost!</span>
            </div>

            <div className="p-4 bg-white">
              <button
                type="button"
                onClick={handleTicketChangeConfirm}
                className="w-full bg-[#D6445B] hover:bg-[#c33a4f] text-white font-bold rounded-lg py-3 text-sm sm:text-base transition cursor-pointer shadow-xs"
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
                      ? "fill-[#7B1E3D] text-[#7B1E3D]"
                      : "text-gray-400 group-hover:text-[#7B1E3D]"
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
      <AgeRestrictionModal
        isOpen={showAgeWarningModal}
        movieTitle={movie?.title}
        onClose={() => {
          setShowAgeWarningModal(false);
          setPendingSlotId(null);
        }}
        onConfirm={() => {
          setAgeVerified(true);
          setShowAgeWarningModal(false);
          if (pendingSlotId) {
            proceedWithSlot(pendingSlotId);
            setPendingSlotId(null);
          }
        }}
      />
      <Footer />
    </div>
  );
}
