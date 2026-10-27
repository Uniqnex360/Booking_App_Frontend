import React, { useState, useEffect, useMemo } from "react";
import { format, parseISO, isToday, isTomorrow, addDays } from "date-fns";
import { getMovieById } from "@/api/movie.api";
import { getShowtimeSeats, ShowtimeSeatsData } from "@/api/theatre.api";
import { CinemaSeatMapLayout } from "@/components/seats/CinemaSeatMapLayout";
import { AdminMovieItem } from "@/api/admin.api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

  // Filter states
  const [selectedDate, setSelectedDate] = useState("ALL");
  const [customDate, setCustomDate] = useState("");
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
          shows.forEach((st: any) => {
            const dt = parseISO(st.starts_at);
            flattened.push({
              showtimeId: st.id,
              startsAt: st.starts_at,
              dateStr: format(dt, "yyyy-MM-dd"),
              timeStr: format(dt, "hh:mm a"),
              venueId: v.venue_id,
              venueName: v.venue_name,
              city: v.city || "Unknown City",
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

  // Derived filter options
  const availableCities = useMemo(() => {
    const set = new Set<string>();
    showtimesList.forEach((s) => s.city && set.add(s.city));
    return Array.from(set).sort();
  }, [showtimesList]);

  const availableVenues = useMemo(() => {
    const map = new Map<string, string>();
    showtimesList.forEach((s) => {
      if (selectedCity === "ALL" || s.city.toLowerCase() === selectedCity.toLowerCase()) {
        map.set(s.venueId, s.venueName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [showtimesList, selectedCity]);

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
      // Search query (venue or screen)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesVenue = st.venueName.toLowerCase().includes(q);
        const matchesScreen = st.screenName.toLowerCase().includes(q);
        const matchesCity = st.city.toLowerCase().includes(q);
        if (!matchesVenue && !matchesScreen && !matchesCity) return false;
      }
      return true;
    });
  }, [
    showtimesList,
    effectiveDate,
    selectedCity,
    selectedVenue,
    selectedDivision,
    selectedLanguage,
    searchQuery,
  ]);

  // Group filtered showtimes by City -> Venue
  const groupedShowtimes = useMemo(() => {
    const map = new Map<string, Map<string, FlattenedShowtime[]>>();

    filteredShowtimes.forEach((st) => {
      if (!map.has(st.city)) {
        map.set(st.city, new Map());
      }
      const venueMap = map.get(st.city)!;
      if (!venueMap.has(st.venueName)) {
        venueMap.set(st.venueName, []);
      }
      venueMap.get(st.venueName)!.push(st);
    });

    return map;
  }, [filteredShowtimes]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (effectiveDate !== "ALL") count++;
    if (selectedCity !== "ALL") count++;
    if (selectedVenue !== "ALL") count++;
    if (selectedDivision !== "ALL") count++;
    if (selectedLanguage !== "ALL") count++;
    if (searchQuery.trim() !== "") count++;
    return count;
  }, [effectiveDate, selectedCity, selectedVenue, selectedDivision, selectedLanguage, searchQuery]);

  const resetAllFilters = () => {
    setSelectedDate("ALL");
    setCustomDate("");
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
              <div className="text-[11px] text-orange-600 font-semibold mt-1">
                Super Admin Screening & Division Inspector
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STATS TILES BAR */}
        <div className="px-6 py-3 bg-white border-b border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
          <div className="bg-orange-50/60 p-2.5 rounded-xl border border-orange-100">
            <div className="text-[10px] uppercase font-bold text-orange-700 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Filtered Showtimes
            </div>
            <div className="text-lg font-bold text-gray-900 mt-0.5">
              {filteredShowtimes.length} <span className="text-xs font-normal text-gray-500">shows</span>
            </div>
          </div>

          <div className="bg-blue-50/60 p-2.5 rounded-xl border border-blue-100">
            <div className="text-[10px] uppercase font-bold text-blue-700 flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Active Cities
            </div>
            <div className="text-lg font-bold text-gray-900 mt-0.5">
              {groupedShowtimes.size} <span className="text-xs font-normal text-gray-500">cities</span>
            </div>
          </div>

          <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-100">
            <div className="text-[10px] uppercase font-bold text-emerald-700 flex items-center gap-1">
              <Building2 className="w-3 h-3" /> Participating Theatres
            </div>
            <div className="text-lg font-bold text-gray-900 mt-0.5">
              {Array.from(groupedShowtimes.values()).reduce((acc, map) => acc + map.size, 0)}{" "}
              <span className="text-xs font-normal text-gray-500">theatres</span>
            </div>
          </div>

          <div className="bg-purple-50/60 p-2.5 rounded-xl border border-purple-100">
            <div className="text-[10px] uppercase font-bold text-purple-700 flex items-center gap-1">
              <Languages className="w-3 h-3" /> Languages
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

          {/* Location, Division, Language Dropdowns + Search */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 pt-1">
            
            {/* 1. Location / City */}
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

            {/* 2. Venue / Cinema */}
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

            {/* 3. Division / Screen / Format */}
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

            {/* 4. Language */}
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

            {/* Search + Reset */}
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search venue..."
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

        {/* SHOWTIMES CONTENT AREA */}
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
                No showtimes found for the selected date, city, division, or language. Try resetting your filters.
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
            <div className="space-y-6">
              {Array.from(groupedShowtimes.entries()).map(([city, venueMap]) => (
                <div key={city} className="space-y-3">
                  <div className="flex items-center gap-2 pb-1 border-b border-gray-200">
                    <MapPin className="w-4 h-4 text-orange-600" />
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                      {city}
                    </h3>
                    <Badge variant="outline" className="text-[10px] font-semibold text-gray-500 bg-gray-50">
                      {Array.from(venueMap.values()).flat().length} screenings
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
                                className="w-full h-7 text-[11px] font-medium bg-white hover:bg-orange-50 hover:text-orange-700 hover:border-orange-200 text-gray-700 gap-1.5 shadow-2xs"
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
            className="bg-white border-gray-300 text-gray-700 hover:bg-gray-100"
          >
            Close Inspector
          </Button>
        </div>
      </div>

      {/* SEAT MAP INSPECTOR SUB-MODAL */}
      {inspectingShowtime && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-orange-600" />
                  Live Seat Map: {inspectingShowtime.venueName} &bull; {inspectingShowtime.screenName}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {inspectingShowtime.timeStr} on {format(parseISO(inspectingShowtime.startsAt), "EEE, d MMM yyyy")} &bull; {inspectingShowtime.language} {inspectingShowtime.format}
                </p>
              </div>
              <button
                onClick={() => setInspectingShowtime(null)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 flex flex-col items-center justify-center">
              {loadingSeats ? (
                <div className="py-20 flex flex-col items-center justify-center gap-2 text-gray-400">
                  <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
                  <p className="text-xs">Loading seating matrix...</p>
                </div>
              ) : seatsData ? (
                <div className="w-full flex flex-col items-center">
                  {seatsData.showtime && (
                    <div className="flex items-center justify-center gap-6 text-xs text-gray-600 mb-6 bg-gray-50 px-4 py-2 rounded-xl border border-gray-200">
                      <span className="flex items-center gap-1.5">
                        <span className="w-3.5 h-3.5 rounded-sm bg-white border border-gray-300" /> Available ({seatsData.showtime.available_count})
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-3.5 h-3.5 rounded-sm bg-emerald-500 text-white" /> Booked ({seatsData.showtime.booked_count})
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-3.5 h-3.5 rounded-sm bg-rose-500 text-white" /> Blocked ({seatsData.showtime.blocked_count})
                      </span>
                      <span className="flex items-center gap-1.5">
                        <strong className="text-gray-900">Total:</strong> {seatsData.showtime.total_seats} seats
                      </span>
                    </div>
                  )}

                  <CinemaSeatMapLayout
                    seats={seatsData.seats.map((s) => ({
                      id: s.id,
                      row_label: s.row_label,
                      number: s.number,
                      code: s.code,
                      price_paise: s.price_paise,
                      status: s.status as any,
                      blocked_reason: s.blocked_reason,
                    }))}
                    selectedSeatIds={[]}
                    onToggleSeat={() => {}}
                    screenText={inspectingShowtime.screenName}
                  />
                </div>
              ) : (
                <div className="text-center text-gray-400 py-12">
                  <p className="text-sm">No seat matrix available for this screening.</p>
                </div>
              )}
            </div>

            <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex justify-end">
              <Button
                onClick={() => setInspectingShowtime(null)}
                variant="outline"
                size="sm"
                className="bg-white"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
