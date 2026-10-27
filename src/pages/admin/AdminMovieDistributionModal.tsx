import React, { useState, useEffect, useMemo } from "react";
import { format, parseISO, isToday, isTomorrow, addDays } from "date-fns";
import { getMovieById } from "@/api/movie.api";
import { getShowtimeSeats, ShowtimeSeatsData } from "@/api/theatre.api";
import { CinemaSeatMapLayout } from "@/components/seats/CinemaSeatMapLayout";
import { AdminMovieItem } from "@/api/admin.api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { INDIAN_STATES, getStateForCity, getCitiesForState } from "@/utils/indiaGeography";
import {
  Film,
  Calendar,
  MapPin,
  Building2,
  Languages,
  Layers,
  Clock,
  X,
  Search,
  RotateCcw,
  Loader2,
  ExternalLink,
  Eye,
  CheckCircle2,
  Ticket,
  ChevronRight,
  Sparkles,
} from "lucide-react";

interface AdminMovieDistributionModalProps {
  movie: AdminMovieItem;
  onClose: () => void;
}

interface FlattenedShowtime {
  showtimeId: string;
  startsAt: string;
  dateStr: string; // YYYY-MM-DD
  timeStr: string; // hh:mm a
  venueId: string;
  venueName: string;
  city: string;
  state: string;
  address?: string;
  screenId: string;
  screenName: string;
  language: string;
  format: string;
  status: string;
}

function matchesCity(vCity?: string | null, targetCity?: string | null): boolean {
  if (!vCity || !targetCity) return false;
  const a = vCity.toLowerCase().trim();
  const b = targetCity.toLowerCase().trim();
  if (a === b) return true;
  if ((a === "bangalore" || a === "bengaluru") && (b === "bangalore" || b === "bengaluru")) return true;
  if ((a === "kochi" || a === "cochin") && (b === "kochi" || b === "cochin")) return true;
  if ((a === "chennai" || a === "madras") && (b === "chennai" || b === "madras")) return true;
  return false;
}

export function AdminMovieDistributionModal({
  movie,
  onClose,
}: AdminMovieDistributionModalProps) {
  const [loading, setLoading] = useState(true);
  const [movieDetail, setMovieDetail] = useState<any>(null);
  const [showtimesList, setShowtimesList] = useState<FlattenedShowtime[]>([]);

  // Filter states ("22.Location movies filter,date,screen filter" & "23.By state wise in the filter in the movie")
  const [selectedDate, setSelectedDate] = useState("ALL");
  const [customDate, setCustomDate] = useState("");
  const [selectedState, setSelectedState] = useState("ALL");
  const [selectedCity, setSelectedCity] = useState("ALL");
  const [selectedVenue, setSelectedVenue] = useState("ALL");
  const [selectedDivision, setSelectedDivision] = useState("ALL");
  const [selectedLanguage, setSelectedLanguage] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Seat map inspection modal
  const [inspectingShowtime, setInspectingShowtime] = useState<FlattenedShowtime | null>(null);
  const [seatsData, setSeatsData] = useState<ShowtimeSeatsData | null>(null);
  const [loadingSeats, setLoadingSeats] = useState(false);

  // Fetch full movie details with venues and showtimes
  useEffect(() => {
    setLoading(true);
    getMovieById(movie.id)
      .then((data: any) => {
        setMovieDetail(data);
        const flattened: FlattenedShowtime[] = [];
        const venues = data.venues || [];

        venues.forEach((v: any) => {
          const shows = v.showtimes || [];
          const vCity = v.city || "Unknown City";
          const vState = getStateForCity(vCity);

          shows.forEach((st: any) => {
            const dt = parseISO(st.starts_at);
            flattened.push({
              showtimeId: st.id,
              startsAt: st.starts_at,
              dateStr: format(dt, "yyyy-MM-dd"),
              timeStr: format(dt, "hh:mm a"),
              venueId: v.venue_id,
              venueName: v.venue_name,
              city: vCity,
              state: vState,
              address: v.address,
              screenId: st.screen_id,
              screenName: st.screen_name || "Main Screen",
              language: st.language || data.language || "Original",
              format: st.format || "2D",
              status: st.status || "ACTIVE",
            });
          });
        });

        setShowtimesList(flattened);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [movie.id]);

  // Handle seat map loading
  useEffect(() => {
    if (!inspectingShowtime) {
      setSeatsData(null);
      return;
    }
    setLoadingSeats(true);
    getShowtimeSeats(inspectingShowtime.showtimeId)
      .then((data) => setSeatsData(data))
      .catch(() => {})
      .finally(() => setLoadingSeats(false));
  }, [inspectingShowtime]);

  // Derived filter options: States
  const availableStates = useMemo(() => {
    const set = new Set<string>();
    showtimesList.forEach((s) => {
      if (s.state && s.state !== "Other") set.add(s.state);
    });
    return Array.from(set).sort();
  }, [showtimesList]);

  // Derived filter options: Cities cascading from selectedState
  const availableCities = useMemo(() => {
    const set = new Set<string>();
    showtimesList.forEach((s) => {
      if (selectedState === "ALL" || s.state === selectedState) {
        if (s.city) set.add(s.city);
      }
    });
    return Array.from(set).sort();
  }, [showtimesList, selectedState]);

  // Derived filter options: Venues cascading from state & city
  const availableVenues = useMemo(() => {
    const map = new Map<string, string>();
    showtimesList.forEach((s) => {
      if (
        (selectedState === "ALL" || s.state === selectedState) &&
        (selectedCity === "ALL" || matchesCity(s.city, selectedCity))
      ) {
        map.set(s.venueId, s.venueName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [showtimesList, selectedState, selectedCity]);

  const availableDivisions = useMemo(() => {
    const set = new Set<string>();
    showtimesList.forEach((s) => {
      if (s.screenName) set.add(s.screenName);
      if (s.format) set.add(s.format);
    });
    return Array.from(set).sort();
  }, [showtimesList]);

  const availableLanguages = useMemo(() => {
    const set = new Set<string>();
    if (movie?.language) {
      movie.language.split(/[,/&|]+/).forEach((l) => {
        const clean = l.trim();
        if (clean) set.add(clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase());
      });
    }
    showtimesList.forEach((s) => {
      if (s.language) {
        s.language.split(/[,/&|]+/).forEach((l) => {
          const clean = l.trim();
          if (clean) set.add(clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase());
        });
      }
    });
    return Array.from(set).sort();
  }, [showtimesList, movie?.language]);

  const quickDates = useMemo(() => {
    const today = new Date();
    const todayStr = format(today, "yyyy-MM-dd");
    const tomorrowStr = format(addDays(today, 1), "yyyy-MM-dd");
    const dayAfterStr = format(addDays(today, 2), "yyyy-MM-dd");

    return [
      { label: "All Dates", value: "ALL" },
      { label: `Today (${format(today, "d MMM")})`, value: todayStr },
      { label: `Tomorrow (${format(addDays(today, 1), "d MMM")})`, value: tomorrowStr },
      { label: format(addDays(today, 2), "EEE, d MMM"), value: dayAfterStr },
    ];
  }, []);

  // Filtered showtimes
  const effectiveDate = customDate ? customDate : selectedDate;

  const filteredShowtimes = useMemo(() => {
    return showtimesList.filter((st) => {
      // Date filter
      if (effectiveDate !== "ALL" && st.dateStr !== effectiveDate) {
        return false;
      }
      // State filter ("23.By state wise in the filter in the movie")
      if (selectedState !== "ALL" && st.state !== selectedState) {
        return false;
      }
      // City filter
      if (selectedCity !== "ALL" && !matchesCity(st.city, selectedCity)) {
        return false;
      }
      // Venue filter
      if (selectedVenue !== "ALL" && st.venueId !== selectedVenue) {
        return false;
      }
      // Division filter (matches screen name or format)
      if (
        selectedDivision !== "ALL" &&
        !st.screenName.toLowerCase().includes(selectedDivision.toLowerCase()) &&
        st.format.toLowerCase() !== selectedDivision.toLowerCase()
      ) {
        return false;
      }
      // Language filter
      if (selectedLanguage !== "ALL") {
        const selLower = selectedLanguage.toLowerCase().trim();
        const stLangLower = (st.language || "").toLowerCase();
        if (!stLangLower.includes(selLower)) {
          return false;
        }
      }
      // Search query (venue or screen or city)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesVenue = st.venueName.toLowerCase().includes(q);
        const matchesScreen = st.screenName.toLowerCase().includes(q);
        const matchesCityName = st.city.toLowerCase().includes(q);
        const matchesStateName = st.state.toLowerCase().includes(q);
        if (!matchesVenue && !matchesScreen && !matchesCityName && !matchesStateName) return false;
      }
      return true;
    });
  }, [
    showtimesList,
    effectiveDate,
    selectedState,
    selectedCity,
    selectedVenue,
    selectedDivision,
    selectedLanguage,
    searchQuery,
  ]);

  // Derived Reach Metrics: Unique States, Screens, Venues, Cities
  const uniqueStates = useMemo(() => {
    const set = new Set<string>();
    filteredShowtimes.forEach((s) => {
      if (s.state && s.state !== "Other") set.add(s.state);
    });
    return set;
  }, [filteredShowtimes]);

  const uniqueScreens = useMemo(() => {
    const set = new Set<string>();
    filteredShowtimes.forEach((s) => {
      set.add(`${s.venueId}-${s.screenId || s.screenName}`);
    });
    return set;
  }, [filteredShowtimes]);

  const uniqueVenues = useMemo(() => {
    const set = new Set<string>();
    filteredShowtimes.forEach((s) => set.add(s.venueId));
    return set;
  }, [filteredShowtimes]);

  const uniqueCities = useMemo(() => {
    const set = new Set<string>();
    filteredShowtimes.forEach((s) => set.add(s.city));
    return set;
  }, [filteredShowtimes]);

  // Group filtered showtimes by State -> City -> Venue
  const groupedShowtimes = useMemo(() => {
    const stateMap = new Map<string, Map<string, Map<string, FlattenedShowtime[]>>>();

    filteredShowtimes.forEach((st) => {
      const stateKey = st.state && st.state !== "Other" ? st.state : "Other Regions";
      if (!stateMap.has(stateKey)) {
        stateMap.set(stateKey, new Map());
      }
      const cityMap = stateMap.get(stateKey)!;
      if (!cityMap.has(st.city)) {
        cityMap.set(st.city, new Map());
      }
      const venueMap = cityMap.get(st.city)!;
      if (!venueMap.has(st.venueName)) {
        venueMap.set(st.venueName, []);
      }
      venueMap.get(st.venueName)!.push(st);
    });

    return stateMap;
  }, [filteredShowtimes]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (effectiveDate !== "ALL") count++;
    if (selectedState !== "ALL") count++;
    if (selectedCity !== "ALL") count++;
    if (selectedVenue !== "ALL") count++;
    if (selectedDivision !== "ALL") count++;
    if (selectedLanguage !== "ALL") count++;
    if (searchQuery.trim() !== "") count++;
    return count;
  }, [effectiveDate, selectedState, selectedCity, selectedVenue, selectedDivision, selectedLanguage, searchQuery]);

  const resetAllFilters = () => {
    setSelectedDate("ALL");
    setCustomDate("");
    setSelectedState("ALL");
    setSelectedCity("ALL");
    setSelectedVenue("ALL");
    setSelectedDivision("ALL");
    setSelectedLanguage("ALL");
    setSearchQuery("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden">
        
        {/* MODAL HEADER */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-start justify-between gap-4 shrink-0">
          <div className="flex items-center gap-4 min-w-0">
            {movie.poster_url ? (
              <img
                src={movie.poster_url}
                alt={movie.title}
                className="w-14 h-20 object-cover rounded-xl bg-gray-200 border border-gray-300 shadow-xs shrink-0"
              />
            ) : (
              <div className="w-14 h-20 rounded-xl bg-gray-200 border border-gray-300 flex items-center justify-center shrink-0">
                <Film className="w-7 h-7 text-gray-400" />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                  {movie.title}
                </h2>
                {movie.certificate && (
                  <Badge variant="outline" className="text-[10px] font-bold border-gray-300 bg-white">
                    {movie.certificate}
                  </Badge>
                )}
                <Badge
                  className={`text-[10px] font-bold ${
                    movie.status === "PUBLISHED"
                      ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                      : "bg-gray-200 text-gray-700"
                  }`}
                >
                  {movie.status === "PUBLISHED" ? "Showing" : movie.status}
                </Badge>
              </div>
              <p className="text-xs text-gray-500 mt-1 flex items-center gap-2 flex-wrap">
                <span>{movie.genre || "Cinema"}</span>
                <span>&bull;</span>
                <span>{movie.language || "All Languages"}</span>
                {movie.duration_min && (
                  <>
                    <span>&bull;</span>
                    <span>{movie.duration_min} mins</span>
                  </>
                )}
                {movieDetail?.rating && (
                  <>
                    <span>&bull;</span>
                    <span className="text-amber-600 font-semibold">★ {movieDetail.rating}/10</span>
                  </>
                )}
              </p>
              <div className="text-[11px] text-orange-600 font-semibold mt-1 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-orange-600" />
                State-Wise Movie Release, Screen & Distribution Inspector
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 rounded-full transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STATS TILES BAR ("no of state and no of screen in theatre admin") */}
        <div className="px-6 py-3 bg-white border-b border-gray-100 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 shrink-0">
          {/* 1. No of States */}
          <div className="bg-indigo-50/70 p-2.5 rounded-xl border border-indigo-100">
            <div className="text-[10px] uppercase font-bold text-indigo-700 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-indigo-600" /> States
            </div>
            <div className="text-lg font-bold text-gray-900 mt-0.5">
              {uniqueStates.size} <span className="text-xs font-normal text-gray-500">states</span>
            </div>
          </div>

          {/* 2. No of Screens */}
          <div className="bg-purple-50/70 p-2.5 rounded-xl border border-purple-100">
            <div className="text-[10px] uppercase font-bold text-purple-700 flex items-center gap-1">
              <Layers className="w-3 h-3 text-purple-600" /> Screens
            </div>
            <div className="text-lg font-bold text-gray-900 mt-0.5">
              {uniqueScreens.size} <span className="text-xs font-normal text-gray-500">screens</span>
            </div>
          </div>

          {/* 3. Participating Theatres */}
          <div className="bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-100">
            <div className="text-[10px] uppercase font-bold text-emerald-700 flex items-center gap-1">
              <Building2 className="w-3 h-3 text-emerald-600" /> Theatres
            </div>
            <div className="text-lg font-bold text-gray-900 mt-0.5">
              {uniqueVenues.size} <span className="text-xs font-normal text-gray-500">theatres</span>
            </div>
          </div>

          {/* 4. Active Cities */}
          <div className="bg-blue-50/70 p-2.5 rounded-xl border border-blue-100">
            <div className="text-[10px] uppercase font-bold text-blue-700 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-blue-600" /> Cities
            </div>
            <div className="text-lg font-bold text-gray-900 mt-0.5">
              {uniqueCities.size} <span className="text-xs font-normal text-gray-500">cities</span>
            </div>
          </div>

          {/* 5. Filtered Showtimes */}
          <div className="bg-orange-50/70 p-2.5 rounded-xl border border-orange-100">
            <div className="text-[10px] uppercase font-bold text-orange-700 flex items-center gap-1">
              <Clock className="w-3 h-3 text-orange-600" /> Showtimes
            </div>
            <div className="text-lg font-bold text-gray-900 mt-0.5">
              {filteredShowtimes.length} <span className="text-xs font-normal text-gray-500">shows</span>
            </div>
          </div>

          {/* 6. Languages */}
          <div className="bg-pink-50/70 p-2.5 rounded-xl border border-pink-100">
            <div className="text-[10px] uppercase font-bold text-pink-700 flex items-center gap-1">
              <Languages className="w-3 h-3 text-pink-600" /> Languages
            </div>
            <div className="text-lg font-bold text-gray-900 mt-0.5">
              {availableLanguages.length} <span className="text-xs font-normal text-gray-500">options</span>
            </div>
          </div>
        </div>

        {/* MULTI-FILTER CONTROL BAR */}
        <div className="px-6 py-3.5 bg-gray-50/90 border-b border-gray-200 space-y-2.5 shrink-0">
          
          {/* Quick Date Pills & Custom Date Picker */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none">
              <span className="text-xs font-bold text-gray-500 mr-1 flex items-center gap-1 shrink-0">
                <Calendar className="w-3.5 h-3.5 text-orange-600" /> Date:
              </span>
              {quickDates.map((qd) => {
                const isActive = !customDate && selectedDate === qd.value;
                return (
                  <button
                    key={qd.value}
                    onClick={() => {
                      setCustomDate("");
                      setSelectedDate(qd.value);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                      isActive
                        ? "bg-orange-600 text-white shadow-2xs font-bold"
                        : "bg-white text-gray-600 hover:bg-gray-200/70 border border-gray-200"
                    }`}
                  >
                    {qd.label}
                  </button>
                );
              })}
            </div>

            {/* Calendar input for specific date */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs text-gray-400">or exact date:</span>
              <input
                type="date"
                value={customDate}
                onChange={(e) => {
                  setCustomDate(e.target.value);
                  setSelectedDate("CUSTOM");
                }}
                className="h-8 px-2.5 text-xs font-semibold rounded-lg border border-gray-300 bg-white text-gray-700 focus:outline-hidden focus:ring-1 focus:ring-orange-500 shadow-2xs cursor-pointer"
              />
            </div>
          </div>

          {/* State Wise, City, Venue, Division, Language Dropdowns + Search */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 pt-1">
            
            {/* 1. State Wise Filter ("23.By state wise in the filter in the movie") */}
            <div className="relative">
              <select
                value={selectedState}
                onChange={(e) => {
                  setSelectedState(e.target.value);
                  setSelectedCity("ALL");
                  setSelectedVenue("ALL");
                }}
                className="w-full h-9 rounded-xl border border-gray-200 px-3 bg-white text-xs font-semibold text-gray-700 cursor-pointer shadow-2xs focus:ring-1 focus:ring-orange-500"
              >
                <option value="ALL">All States ({availableStates.length})</option>
                {availableStates.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Location / City (Cascading from State) */}
            <div className="relative">
              <select
                value={selectedCity}
                onChange={(e) => {
                  setSelectedCity(e.target.value);
                  setSelectedVenue("ALL");
                }}
                className="w-full h-9 rounded-xl border border-gray-200 px-3 bg-white text-xs font-semibold text-gray-700 cursor-pointer shadow-2xs focus:ring-1 focus:ring-orange-500"
              >
                <option value="ALL">All Cities ({availableCities.length})</option>
                {availableCities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Venue / Cinema */}
            <div className="relative">
              <select
                value={selectedVenue}
                onChange={(e) => setSelectedVenue(e.target.value)}
                className="w-full h-9 rounded-xl border border-gray-200 px-3 bg-white text-xs font-semibold text-gray-700 cursor-pointer shadow-2xs focus:ring-1 focus:ring-orange-500"
              >
                <option value="ALL">All Venues ({availableVenues.length})</option>
                {availableVenues.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. Division / Screen / Format */}
            <div className="relative">
              <select
                value={selectedDivision}
                onChange={(e) => setSelectedDivision(e.target.value)}
                className="w-full h-9 rounded-xl border border-gray-200 px-3 bg-white text-xs font-semibold text-gray-700 cursor-pointer shadow-2xs focus:ring-1 focus:ring-orange-500"
              >
                <option value="ALL">All Divisions / Screens</option>
                {availableDivisions.map((div) => (
                  <option key={div} value={div}>
                    {div}
                  </option>
                ))}
              </select>
            </div>

            {/* 5. Language */}
            <div className="relative">
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="w-full h-9 rounded-xl border border-gray-200 px-3 bg-white text-xs font-semibold text-gray-700 cursor-pointer shadow-2xs focus:ring-1 focus:ring-orange-500"
              >
                <option value="ALL">All Languages ({availableLanguages.length})</option>
                {availableLanguages.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            </div>

            {/* 6. Search + Reset */}
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search theatre..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 pl-8 pr-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-hidden focus:ring-1 focus:ring-orange-500 shadow-2xs"
                />
              </div>

              {activeFiltersCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetAllFilters}
                  className="h-9 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl shrink-0"
                  title="Reset all filters"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* SHOWTIMES CONTENT AREA WITH STATE-WISE GROUPING */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
              <p className="text-sm font-medium">Loading movie showtimes & divisions...</p>
            </div>
          ) : filteredShowtimes.length === 0 ? (
            <div className="py-16 text-center text-gray-400 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
              <Film className="w-10 h-10 mx-auto text-gray-300 mb-2" />
              <p className="text-base font-semibold text-gray-700">No screenings match filters</p>
              <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                No showtimes found for the selected state, city, division, or date. Try resetting your filters.
              </p>
              <Button
                onClick={resetAllFilters}
                variant="outline"
                size="sm"
                className="mt-4 text-xs font-semibold bg-white border-gray-200"
              >
                Reset Filters
              </Button>
            </div>
          ) : (
            <div className="space-y-8">
              {Array.from(groupedShowtimes.entries()).map(([stateName, cityMap]) => {
                const totalStateShows = Array.from(cityMap.values()).reduce(
                  (acc, vMap) => acc + Array.from(vMap.values()).flat().length,
                  0
                );
                const totalStateTheatres = Array.from(cityMap.values()).reduce(
                  (acc, vMap) => acc + vMap.size,
                  0
                );

                return (
                  <div key={stateName} className="space-y-4">
                    {/* STATE BANNER */}
                    <div className="bg-gradient-to-r from-orange-50/80 to-amber-50/40 p-3 px-4 rounded-2xl border border-orange-200/80 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-orange-600" />
                        <span className="font-extrabold text-gray-900 text-sm tracking-wide uppercase">
                          {stateName}
                        </span>
                        <Badge className="bg-orange-100 text-orange-800 text-[10px] font-bold border-none">
                          {totalStateTheatres} {totalStateTheatres === 1 ? "Theatre" : "Theatres"}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] font-semibold text-gray-600 bg-white">
                          {cityMap.size} {cityMap.size === 1 ? "City" : "Cities"}
                        </Badge>
                      </div>
                      <span className="text-xs font-bold text-orange-700">
                        {totalStateShows} {totalStateShows === 1 ? "Show" : "Shows"} Scheduled
                      </span>
                    </div>

                    {/* CITIES UNDER STATE */}
                    <div className="space-y-5 pl-1 sm:pl-3">
                      {Array.from(cityMap.entries()).map(([city, venueMap]) => (
                        <div key={city} className="space-y-3">
                          <div className="flex items-center gap-2 pb-1 border-b border-gray-200">
                            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                              {city} Hub
                            </h4>
                            <span className="text-gray-300">•</span>
                            <Badge variant="outline" className="text-[10px] font-medium text-gray-500 bg-gray-50">
                              {venueMap.size} {venueMap.size === 1 ? "cinema" : "cinemas"}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-1 gap-3">
                            {Array.from(venueMap.entries()).map(([venueName, shows]) => (
                              <div
                                key={venueName}
                                className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs hover:border-gray-300 transition"
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-100">
                                  <div>
                                    <h4 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                                      <Building2 className="w-4 h-4 text-gray-400" />
                                      {venueName}
                                    </h4>
                                    {shows[0]?.address && (
                                      <p className="text-xs text-gray-500 mt-0.5 truncate max-w-md">
                                        {shows[0].address}
                                      </p>
                                    )}
                                  </div>
                                  <Badge variant="outline" className="text-xs text-gray-600 self-start sm:self-auto">
                                    {shows.length} shows
                                  </Badge>
                                </div>

                                {/* SHOWTIMES PILLS */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 pt-3">
                                  {shows.map((st) => (
                                    <div
                                      key={st.showtimeId}
                                      className="bg-gray-50/80 hover:bg-white p-3 rounded-xl border border-gray-200 hover:border-orange-300 transition group flex flex-col justify-between gap-2 shadow-2xs"
                                    >
                                      <div className="flex items-start justify-between gap-1">
                                        <div>
                                          <div className="text-sm font-bold text-gray-900 flex items-center gap-1">
                                            <Clock className="w-3.5 h-3.5 text-orange-600" />
                                            {st.timeStr}
                                          </div>
                                          <div className="text-[11px] text-gray-500 mt-0.5">
                                            {format(parseISO(st.startsAt), "EEE, d MMM")}
                                          </div>
                                        </div>
                                        <Badge className="text-[10px] font-bold bg-orange-100 text-orange-800 border-none">
                                          {st.language}
                                        </Badge>
                                      </div>

                                      <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-200/60">
                                        <span className="font-medium text-gray-600 truncate max-w-[110px]" title={st.screenName}>
                                          {st.screenName}
                                        </span>
                                        <Badge variant="outline" className="text-[10px] text-gray-500">
                                          {st.format}
                                        </Badge>
                                      </div>

                                      <Button
                                        onClick={() => setInspectingShowtime(st)}
                                        variant="outline"
                                        size="sm"
                                        className="w-full h-7 text-[11px] font-medium bg-white hover:bg-orange-50 hover:text-orange-700 hover:border-orange-200 text-gray-700 gap-1.5 shadow-2xs cursor-pointer"
                                      >
                                        <Eye className="w-3 h-3" />
                                        Inspect Seat Map
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500 shrink-0">
          <span>
            Showing <strong className="text-gray-900">{filteredShowtimes.length}</strong> of{" "}
            {showtimesList.length} total scheduled showtimes
          </span>
          <Button
            onClick={onClose}
            variant="outline"
            size="sm"
            className="text-xs h-8 bg-white border-gray-300 text-gray-700 cursor-pointer"
          >
            Close Inspector
          </Button>
        </div>

        {/* SEAT MAP INSPECTION MODAL */}
        {inspectingShowtime && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
            <div className="bg-white rounded-3xl max-w-4xl w-full border border-gray-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <div>
                  <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                    <Layers className="w-4 h-4 text-orange-600" />
                    Seat Map: {inspectingShowtime.screenName}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {movie.title} • {inspectingShowtime.venueName} ({inspectingShowtime.city}) • {inspectingShowtime.timeStr} ({inspectingShowtime.dateStr})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setInspectingShowtime(null)}
                  className="w-8 h-8 rounded-full bg-white hover:bg-gray-200 text-gray-500 flex items-center justify-center cursor-pointer transition border border-gray-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-4 flex-1">
                {loadingSeats ? (
                  <div className="py-20 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-orange-600 mx-auto mb-2" />
                    <p className="text-xs text-gray-500">Querying live seat map layout...</p>
                  </div>
                ) : seatsData ? (
                  <>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                        <div className="text-xs font-semibold text-emerald-700">Available</div>
                        <div className="text-xl font-bold text-emerald-900">{seatsData.showtime.available_count}</div>
                      </div>
                      <div className="p-3 rounded-xl bg-gray-100 border border-gray-300 text-center">
                        <div className="text-xs font-semibold text-gray-700">Booked</div>
                        <div className="text-xl font-bold text-gray-900">{seatsData.showtime.booked_count}</div>
                      </div>
                      <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-center">
                        <div className="text-xs font-semibold text-amber-700">Holds / Blocked</div>
                        <div className="text-xl font-bold text-amber-900">{seatsData.showtime.blocked_count}</div>
                      </div>
                    </div>

                    <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
                      <CinemaSeatMapLayout
                        seats={seatsData.seats.map((s) => ({
                          id: s.id,
                          row_label: s.row_label,
                          number: s.number,
                          code: s.code,
                          price_paise: s.price_paise,
                          status: s.status,
                          blocked_reason: s.blocked_reason,
                        }))}
                        selectedSeatIds={[]}
                        onToggleSeat={() => {}}
                        screenText="Auditorium Screen"
                      />
                    </div>
                  </>
                ) : (
                  <div className="py-12 text-center text-xs text-gray-400">
                    Seat map layout currently unavailable for this show.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
