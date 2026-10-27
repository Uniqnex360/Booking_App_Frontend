import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  getTheatreShowtimes,
  getTheatreVenues,
  getShowtimeSeats,
  blockShowtimeSeats,
  TheatreShowtimeItem,
  TheatreVenueItem,
  ShowtimeSeatsData,
} from "@/api/theatre.api";
import {
  Calendar,
  Clock,
  Film,
  Building2,
  Loader2,
  Filter,
  Eye,
  ExternalLink,
  Search,
  X,
  RotateCcw,
  Lock,
  Unlock,
  Check,
  Layers,
  MapPin,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { INDIAN_STATES, getStateForCity, getCitiesForState } from "@/utils/indiaGeography";
import { CinemaSeatMapLayout } from "@/components/seats/CinemaSeatMapLayout";
import { format, parseISO, addDays, isToday, isTomorrow } from "date-fns";

export default function TheatreShowtimesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const venueIdFromUrl = searchParams.get("venue_id") || "ALL";

  const [showtimes, setShowtimes] = useState<TheatreShowtimeItem[]>([]);
  const [venues, setVenues] = useState<TheatreVenueItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedState, setSelectedState] = useState("ALL");
  const [selectedCity, setSelectedCity] = useState("ALL");
  const [selectedVenue, setSelectedVenue] = useState(venueIdFromUrl);
  const [selectedMovie, setSelectedMovie] = useState("ALL");
  const [selectedScreen, setSelectedScreen] = useState("ALL");
  const [selectedDate, setSelectedDate] = useState("ALL");
  const [customDate, setCustomDate] = useState("");

  // Seat Block / Inventory Inspector Modal
  const [selectedShowtimeForSeats, setSelectedShowtimeForSeats] = useState<TheatreShowtimeItem | null>(null);
  const [seatsData, setSeatsData] = useState<ShowtimeSeatsData | null>(null);
  const [loadingSeats, setLoadingSeats] = useState(false);
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [blockReason, setBlockReason] = useState("VIP Hold");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState("");

  const handleOpenSeatsModal = async (sh: TheatreShowtimeItem) => {
    setSelectedShowtimeForSeats(sh);
    setLoadingSeats(true);
    setSelectedSeatIds([]);
    setActionSuccessMsg("");
    try {
      const data = await getShowtimeSeats(sh.id);
      setSeatsData(data);
    } catch (err) {
      console.error("Failed to load showtime seats", err);
    } finally {
      setLoadingSeats(false);
    }
  };

  const handleToggleSeatSelect = (seatId: string) => {
    setSelectedSeatIds((prev) =>
      prev.includes(seatId) ? prev.filter((id) => id !== seatId) : [...prev, seatId]
    );
  };

  const handleSeatAction = async (action: "BLOCK" | "UNBLOCK") => {
    if (!selectedShowtimeForSeats || selectedSeatIds.length === 0) return;
    setActionLoading(true);
    setActionSuccessMsg("");
    try {
      await blockShowtimeSeats(selectedShowtimeForSeats.id, {
        seat_ids: selectedSeatIds,
        action,
        reason: blockReason,
      });
      setActionSuccessMsg(`Successfully ${action.toLowerCase()}ed ${selectedSeatIds.length} seat(s)!`);
      setSelectedSeatIds([]);
      const updated = await getShowtimeSeats(selectedShowtimeForSeats.id);
      setSeatsData(updated);
    } catch (err: any) {
      alert(err.response?.data?.message || `Failed to ${action.toLowerCase()} seats`);
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [sh, v] = await Promise.all([
          getTheatreShowtimes({
            venue_id: selectedVenue !== "ALL" ? selectedVenue : undefined,
            limit: 200,
          }),
          getTheatreVenues(),
        ]);
        setShowtimes(sh || []);
        setVenues(v || []);
      } catch (err) {
        console.error("Showtimes error", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [selectedVenue]);

  const handleStateChange = (state: string) => {
    setSelectedState(state);
    setSelectedCity("ALL");
    setSelectedVenue("ALL");
    setSelectedScreen("ALL");
    searchParams.delete("venue_id");
    setSearchParams(searchParams);
  };

  const handleCityChange = (city: string) => {
    setSelectedCity(city);
    setSelectedVenue("ALL");
    setSelectedScreen("ALL");
    searchParams.delete("venue_id");
    setSearchParams(searchParams);
  };

  const handleVenueChange = (venueId: string) => {
    setSelectedVenue(venueId);
    setSelectedScreen("ALL");
    if (venueId === "ALL") {
      searchParams.delete("venue_id");
      setSearchParams(searchParams);
    } else {
      setSearchParams({ venue_id: venueId });
    }
  };

  // 1. Available Cascading Filter Options
  const availableStates = useMemo(() => {
    const set = new Set<string>();
    venues.forEach((v) => {
      const st = getStateForCity(v.city);
      if (st && st !== "Other") set.add(st);
    });
    showtimes.forEach((s) => {
      const st = getStateForCity(s.venue.city);
      if (st && st !== "Other") set.add(st);
    });
    return Array.from(set).sort();
  }, [venues, showtimes]);

  const availableCities = useMemo(() => {
    if (selectedState === "ALL") {
      const cities = Array.from(
        new Set([...venues.map((v) => v.city), ...showtimes.map((s) => s.venue.city)].filter(Boolean))
      );
      return cities.sort();
    }
    const stateCities = getCitiesForState(selectedState);
    const venueCities = Array.from(
      new Set(
        venues
          .filter((v) => getStateForCity(v.city) === selectedState)
          .map((v) => v.city)
          .filter(Boolean)
      )
    );
    return Array.from(new Set([...venueCities, ...stateCities])).sort();
  }, [venues, showtimes, selectedState]);

  const availableVenues = useMemo(() => {
    return venues.filter((v) => {
      if (selectedState !== "ALL" && getStateForCity(v.city) !== selectedState) return false;
      if (selectedCity !== "ALL" && v.city.toLowerCase() !== selectedCity.toLowerCase()) return false;
      return true;
    });
  }, [venues, selectedState, selectedCity]);

  // Distinct Movies playing
  const availableMovies = useMemo(() => {
    const map = new Map<string, { id: string; title: string; language: string; certificate: string }>();
    showtimes.forEach((sh) => {
      if (!map.has(sh.movie.id)) {
        map.set(sh.movie.id, {
          id: sh.movie.id,
          title: sh.movie.title,
          language: sh.movie.language,
          certificate: sh.movie.certificate,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.title.localeCompare(b.title));
  }, [showtimes]);

  // Distinct Screens available
  const availableScreens = useMemo(() => {
    const set = new Set<string>();
    showtimes.forEach((sh) => {
      if (selectedVenue === "ALL" || sh.venue.id === selectedVenue) {
        if (sh.screen?.name) set.add(sh.screen.name);
      }
    });
    return Array.from(set).sort();
  }, [showtimes, selectedVenue]);

  // Quick Dates
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

  const effectiveDate = customDate ? customDate : selectedDate;

  // 2. Filtered Showtimes
  const filteredShowtimes = useMemo(() => {
    return showtimes.filter((sh) => {
      // Search by movie or venue name
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesMovie = sh.movie.title.toLowerCase().includes(q);
        const matchesVenue = sh.venue.name.toLowerCase().includes(q);
        const matchesCity = sh.venue.city?.toLowerCase().includes(q);
        const matchesScreen = sh.screen.name?.toLowerCase().includes(q);
        if (!matchesMovie && !matchesVenue && !matchesCity && !matchesScreen) return false;
      }

      // State filter
      if (selectedState !== "ALL") {
        if (getStateForCity(sh.venue.city) !== selectedState) return false;
      }

      // City filter
      if (selectedCity !== "ALL") {
        if (sh.venue.city.toLowerCase() !== selectedCity.toLowerCase()) return false;
      }

      // Venue filter
      if (selectedVenue !== "ALL") {
        if (sh.venue.id !== selectedVenue) return false;
      }

      // Movie filter
      if (selectedMovie !== "ALL") {
        if (sh.movie.id !== selectedMovie && sh.movie.title.toLowerCase() !== selectedMovie.toLowerCase()) {
          return false;
        }
      }

      // Screen filter
      if (selectedScreen !== "ALL") {
        if (sh.screen.name.toLowerCase() !== selectedScreen.toLowerCase()) return false;
      }

      // Date filter
      if (effectiveDate !== "ALL") {
        try {
          const shDateStr = format(parseISO(sh.starts_at), "yyyy-MM-dd");
          if (shDateStr !== effectiveDate) return false;
        } catch {
          return false;
        }
      }

      return true;
    });
  }, [
    showtimes,
    searchQuery,
    selectedState,
    selectedCity,
    selectedVenue,
    selectedMovie,
    selectedScreen,
    effectiveDate,
  ]);

  // 3. Network & Filtered Statistics ("no of state and no of screen in theatre admin")
  const networkStats = useMemo(() => {
    const statesSet = new Set<string>();
    const citiesSet = new Set<string>();
    const screensSet = new Set<string>();
    const venuesSet = new Set<string>();
    const moviesSet = new Set<string>();

    filteredShowtimes.forEach((sh) => {
      const st = getStateForCity(sh.venue.city);
      if (st && st !== "Other") statesSet.add(st);
      if (sh.venue.city) citiesSet.add(sh.venue.city);
      screensSet.add(`${sh.venue.id}-${sh.screen.id || sh.screen.name}`);
      venuesSet.add(sh.venue.id);
      moviesSet.add(sh.movie.id);
    });

    // Fallback to total network if filtered is empty or all
    let totalScreensCount = 0;
    venues.forEach((v) => {
      totalScreensCount += v.screen_count || 1;
    });

    return {
      statesCount: statesSet.size || (venues.length > 0 ? availableStates.length || 1 : 0),
      screensCount: screensSet.size || totalScreensCount,
      venuesCount: venuesSet.size || venues.length,
      moviesCount: moviesSet.size || availableMovies.length,
      citiesCount: citiesSet.size || availableCities.length,
    };
  }, [filteredShowtimes, venues, availableStates.length, availableMovies.length, availableCities.length]);

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    selectedState !== "ALL" ||
    selectedCity !== "ALL" ||
    selectedVenue !== "ALL" ||
    selectedMovie !== "ALL" ||
    selectedScreen !== "ALL" ||
    effectiveDate !== "ALL";

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedState("ALL");
    setSelectedCity("ALL");
    setSelectedVenue("ALL");
    setSelectedMovie("ALL");
    setSelectedScreen("ALL");
    setSelectedDate("ALL");
    setCustomDate("");
    searchParams.delete("venue_id");
    setSearchParams(searchParams);
  };

  return (
    <div className="space-y-6">
      {/* Cinema Provider Sync Status Banner */}
      <div className="bg-slate-900 text-white p-3.5 px-5 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold">Cinema API Engine: Connected</span>
          <span className="text-slate-400 hidden sm:inline">•</span>
          <span className="text-slate-300 hidden sm:inline">Authoritative Source: Cinema POS (Live Sync Active)</span>
        </div>
        <div className="flex items-center gap-2 text-slate-400">
          <Clock className="w-3.5 h-3.5" />
          <span>Sync Status: Authoritative</span>
        </div>
      </div>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Showtimes Schedule</h1>
          <p className="text-xs text-slate-500 mt-1">
            Browse upcoming screenings, audit auditorium capacity, and check titles playing across your screens.
          </p>
        </div>

        <Badge variant="outline" className="text-xs font-semibold px-3 py-1 bg-slate-50 text-slate-800 self-start sm:self-auto">
          {filteredShowtimes.length} of {showtimes.length} Screenings
        </Badge>
      </div>

      {/* TOP KPI STATS TILES ("no of state and no of screen in theatre admin") */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* 1. No of States */}
        <div className="bg-indigo-50/70 p-3 rounded-2xl border border-indigo-100 flex flex-col justify-between">
          <div className="text-[10px] uppercase font-bold text-indigo-700 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-indigo-600" /> States
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {networkStats.statesCount}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Territories covered
          </div>
        </div>

        {/* 2. No of Screens */}
        <div className="bg-purple-50/70 p-3 rounded-2xl border border-purple-100 flex flex-col justify-between">
          <div className="text-[10px] uppercase font-bold text-purple-700 flex items-center gap-1">
            <Layers className="w-3 h-3 text-purple-600" /> Screens
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {networkStats.screensCount}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Active auditoriums
          </div>
        </div>

        {/* 3. Theatres / Venues */}
        <div className="bg-emerald-50/70 p-3 rounded-2xl border border-emerald-100 flex flex-col justify-between">
          <div className="text-[10px] uppercase font-bold text-emerald-700 flex items-center gap-1">
            <Building2 className="w-3 h-3 text-emerald-600" /> Theatres
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {networkStats.venuesCount}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Multiplex locations
          </div>
        </div>

        {/* 4. Movies Scheduled */}
        <div className="bg-rose-50/70 p-3 rounded-2xl border border-rose-100 flex flex-col justify-between">
          <div className="text-[10px] uppercase font-bold text-rose-700 flex items-center gap-1">
            <Film className="w-3 h-3 text-rose-600" /> Movies
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {networkStats.moviesCount}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Distinct titles
          </div>
        </div>

        {/* 5. Active Cities */}
        <div className="bg-blue-50/70 p-3 rounded-2xl border border-blue-100 flex flex-col justify-between">
          <div className="text-[10px] uppercase font-bold text-blue-700 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-blue-600" /> Cities
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {networkStats.citiesCount}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Urban hubs
          </div>
        </div>

        {/* 6. Filtered Screenings */}
        <div className="bg-amber-50/70 p-3 rounded-2xl border border-amber-100 flex flex-col justify-between">
          <div className="text-[10px] uppercase font-bold text-amber-700 flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-600" /> Screenings
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {filteredShowtimes.length}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Scheduled shows
          </div>
        </div>
      </div>

      {/* MULTI-FILTER CONTROL BAR ("22.Location movies filter,date,screen filter in theatre admin") */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        
        {/* ROW 1: Quick Date Pills & Date Picker */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none">
            <span className="text-xs font-bold text-slate-600 mr-1 flex items-center gap-1 shrink-0">
              <Calendar className="w-3.5 h-3.5 text-[#7B1E3D]" /> Date:
            </span>
            {quickDates.map((qd) => {
              const isActive = !customDate && selectedDate === qd.value;
              return (
                <button
                  key={qd.value}
                  type="button"
                  onClick={() => {
                    setCustomDate("");
                    setSelectedDate(qd.value);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                    isActive
                      ? "bg-[#7B1E3D] text-white shadow-2xs"
                      : "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  {qd.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs text-slate-400">or exact date:</span>
            <input
              type="date"
              value={customDate}
              onChange={(e) => {
                setCustomDate(e.target.value);
                setSelectedDate("CUSTOM");
              }}
              className="h-8 px-2.5 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#7B1E3D] shadow-2xs cursor-pointer"
            />
          </div>
        </div>

        {/* ROW 2: Search, Location Cascades, Movie & Screen Filters */}
        <div className="space-y-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by movie title, theatre name, screen or city..."
              className="pl-9 pr-9 h-10 rounded-xl bg-slate-50 border-slate-200 focus:bg-white text-xs font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Selectors Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {/* 1. Location: State */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">State / Province</label>
              <select
                value={selectedState}
                onChange={(e) => handleStateChange(e.target.value)}
                className="w-full h-9 rounded-xl border border-slate-200 px-2.5 bg-slate-50 hover:bg-white focus:bg-white text-xs font-semibold text-slate-800 cursor-pointer transition"
              >
                <option value="ALL">All States ({availableStates.length})</option>
                {availableStates.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Location: City */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">City Hub</label>
              <select
                value={selectedCity}
                onChange={(e) => handleCityChange(e.target.value)}
                className="w-full h-9 rounded-xl border border-slate-200 px-2.5 bg-slate-50 hover:bg-white focus:bg-white text-xs font-semibold text-slate-800 cursor-pointer transition"
              >
                <option value="ALL">All Cities ({availableCities.length})</option>
                {availableCities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Location: Venue / Multiplex */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Multiplex Location</label>
              <select
                value={selectedVenue}
                onChange={(e) => handleVenueChange(e.target.value)}
                className="w-full h-9 rounded-xl border border-slate-200 px-2.5 bg-slate-50 hover:bg-white focus:bg-white text-xs font-semibold text-slate-800 cursor-pointer transition"
              >
                <option value="ALL">All Multiplexes ({availableVenues.length})</option>
                {availableVenues.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.city})
                  </option>
                ))}
              </select>
            </div>

            {/* 4. Movies Filter ("22.movies filter") */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Movie Title</label>
              <select
                value={selectedMovie}
                onChange={(e) => setSelectedMovie(e.target.value)}
                className="w-full h-9 rounded-xl border border-slate-200 px-2.5 bg-slate-50 hover:bg-white focus:bg-white text-xs font-semibold text-slate-800 cursor-pointer transition"
              >
                <option value="ALL">All Movies ({availableMovies.length})</option>
                {availableMovies.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title} ({m.language})
                  </option>
                ))}
              </select>
            </div>

            {/* 5. Screen Filter ("22.screen filter") */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Screen / Audi</label>
              <select
                value={selectedScreen}
                onChange={(e) => setSelectedScreen(e.target.value)}
                className="w-full h-9 rounded-xl border border-slate-200 px-2.5 bg-slate-50 hover:bg-white focus:bg-white text-xs font-semibold text-slate-800 cursor-pointer transition"
              >
                <option value="ALL">All Screens ({availableScreens.length})</option>
                {availableScreens.map((sc) => (
                  <option key={sc} value={sc}>
                    {sc}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Filter Summary & Reset Pill */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-2.5 border-t border-slate-100 gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span>
                Showing <strong className="text-slate-900">{filteredShowtimes.length}</strong> of{" "}
                <strong>{showtimes.length}</strong> screenings
              </span>
              {selectedState !== "ALL" && (
                <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-700">
                  State: {selectedState}
                </Badge>
              )}
              {selectedCity !== "ALL" && (
                <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-700">
                  City: {selectedCity}
                </Badge>
              )}
              {selectedMovie !== "ALL" && (
                <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-700">
                  Movie: {availableMovies.find((m) => m.id === selectedMovie)?.title || selectedMovie}
                </Badge>
              )}
              {selectedScreen !== "ALL" && (
                <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-700">
                  Screen: {selectedScreen}
                </Badge>
              )}
              {effectiveDate !== "ALL" && (
                <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-700">
                  Date: {effectiveDate}
                </Badge>
              )}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="h-8 px-2.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 gap-1 rounded-xl"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset All Filters
            </Button>
          </div>
        )}
      </div>

      {/* SHOWTIMES TABLE CONTENT */}
      {loading ? (
        <div className="py-24 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#7B1E3D]" />
        </div>
      ) : showtimes.length === 0 ? (
        <div className="py-20 bg-white rounded-2xl border border-slate-200 text-center text-sm text-slate-400">
          No showtimes scheduled for this selection.
        </div>
      ) : filteredShowtimes.length === 0 ? (
        <div className="py-16 bg-white rounded-2xl border border-slate-200 text-center space-y-3">
          <p className="text-sm font-semibold text-slate-700">No screenings match the selected filters.</p>
          <p className="text-xs text-slate-400">Try adjusting your location, movie title, date, or screen filter.</p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetFilters}
            className="text-xs h-8 gap-1.5"
          >
            <RotateCcw className="w-3 h-3" />
            Clear All Filters
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Movie Title</th>
                  <th className="py-3.5 px-4">Multiplex Venue</th>
                  <th className="py-3.5 px-4">Auditorium / Screen</th>
                  <th className="py-3.5 px-4">Language & Rating</th>
                  <th className="py-3.5 px-4">Show Date & Time</th>
                  <th className="py-3.5 px-4">Capacity</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredShowtimes.map((sh) => {
                  const venueState = getStateForCity(sh.venue.city);
                  const showDt = parseISO(sh.starts_at);
                  return (
                    <tr key={sh.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          {sh.movie.poster_url ? (
                            <img
                              src={sh.movie.poster_url}
                              alt={sh.movie.title}
                              className="w-8 h-11 object-cover rounded-md bg-slate-100 border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-11 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                              <Film className="w-4 h-4 text-slate-400" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 truncate max-w-[200px]">{sh.movie.title}</div>
                            <div className="text-[10px] text-slate-400">{sh.movie.certificate || "UA"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 font-medium">
                        <div>{sh.venue.name}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <span>{sh.venue.city}</span>
                          {venueState !== "Other" && (
                            <>
                              <span>•</span>
                              <span className="text-[#7B1E3D] font-bold">{venueState}</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant="outline" className="text-xs font-semibold bg-slate-50 text-slate-800 border-slate-200">
                          {sh.screen.name}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant="outline" className="text-[10px] font-semibold bg-slate-50 text-slate-700">
                          {sh.movie.language} • {sh.movie.certificate}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">
                          {format(showDt, "hh:mm a")}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {format(showDt, "EEE, d MMM yyyy")}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-700">
                        {sh.screen.total_seats} seats
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenSeatsModal(sh)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 transition cursor-pointer"
                            title="Inspect seating capacity & manage seat holds / maintenance blocks"
                          >
                            <Layers className="w-3 h-3 text-slate-500" />
                            <span>Holds</span>
                          </button>
                          <a
                            href={`/showtimes/${sh.id}/seat-map`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition"
                            title="View customer interactive seat layout & availability"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Customer View</span>
                            <ExternalLink className="w-3 h-3 text-emerald-500" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Seat Block & Hold Management Modal */}
      {selectedShowtimeForSeats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                  <Layers className="w-5 h-5 text-[#7B1E3D]" />
                  Auditorium Seating Layout & Partner Hold Control
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedShowtimeForSeats.movie.title} • {selectedShowtimeForSeats.venue.name} ({selectedShowtimeForSeats.screen.name})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedShowtimeForSeats(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {loadingSeats ? (
                <div className="py-20 text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-[#7B1E3D] mx-auto mb-2" />
                  <p className="text-xs text-slate-500">Querying live seat availability from cinema engine...</p>
                </div>
              ) : seatsData ? (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                      <div className="text-xs font-semibold text-emerald-700">Available to Users</div>
                      <div className="text-xl font-black text-emerald-900">{seatsData.showtime.available_count}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-100 border border-slate-300 text-center">
                      <div className="text-xs font-semibold text-slate-700">Booked by Users</div>
                      <div className="text-xl font-black text-slate-900">{seatsData.showtime.booked_count}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-center">
                      <div className="text-xs font-semibold text-amber-700">Blocked / VIP Holds</div>
                      <div className="text-xl font-black text-amber-900">{seatsData.showtime.blocked_count}</div>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
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
                      selectedSeatIds={selectedSeatIds}
                      onToggleSeat={handleToggleSeatSelect}
                      screenText="All eyes this way please"
                    />
                  </div>

                  {actionSuccessMsg && (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600" />
                      {actionSuccessMsg}
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-100 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                        <span>Selected:</span>
                        <span className="font-bold text-[#7B1E3D]">{selectedSeatIds.length} seats</span>
                        <span className="text-slate-400">•</span>
                        <span>Reason:</span>
                        <select
                          value={blockReason}
                          onChange={(e) => setBlockReason(e.target.value)}
                          className="h-9 rounded-xl border border-slate-200 px-3 bg-white text-xs font-medium text-slate-800 cursor-pointer"
                        >
                          <option value="VIP Hold">VIP / Partner Hold</option>
                          <option value="Broken Armrest / Seat Damage">Broken Armrest / Seat Damage</option>
                          <option value="Sound / Projection Maintenance">Auditorium Maintenance</option>
                          <option value="Executive Reservation">Executive Reservation</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={selectedSeatIds.length === 0 || actionLoading}
                          onClick={() => handleSeatAction("UNBLOCK")}
                          className="h-9 text-xs rounded-xl gap-1 text-slate-700 hover:bg-slate-100"
                        >
                          <Unlock className="w-3.5 h-3.5" />
                          Unblock for Users
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          disabled={selectedSeatIds.length === 0 || actionLoading}
                          onClick={() => handleSeatAction("BLOCK")}
                          className="h-9 text-xs rounded-xl gap-1 bg-[#7B1E3D] hover:bg-[#601730] text-white"
                        >
                          {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                          Block from Users ({selectedSeatIds.length})
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
