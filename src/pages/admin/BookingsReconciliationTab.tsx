import React, { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { format, parseISO, isAfter, subDays, addDays, startOfDay, isToday } from "date-fns";
import {
  searchDetailedBookings,
  getAdminTheatres,
  getAdminMovies,
  AdminDetailedBooking,
  TheatreListItem,
  AdminMovieItem,
} from "@/api/admin.api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AdminSearchBar } from "@/components/admin/AdminSearchBar";
import { useDebounce } from "@/hooks/useDebounce";
import { INDIAN_STATES, getStateForCity, STATE_CITIES } from "@/utils/indiaGeography";
import {
  RefreshCw,
  Loader2,
  Ticket,
  Calendar,
  CreditCard,
  Building,
  Building2,
  CheckCircle2,
  AlertCircle,
  X,
  Filter,
  Film,
  MapPin,
  Languages,
  Layers,
  IndianRupee,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Clock,
  RotateCcw,
} from "lucide-react";

export function BookingsReconciliationTab() {
  const [bookings, setBookings] = useState<AdminDetailedBooking[]>([]);
  const [theatres, setTheatres] = useState<TheatreListItem[]>([]);
  const [moviesList, setMoviesList] = useState<AdminMovieItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);

  // Filters
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedState, setSelectedState] = useState("ALL");
  const [selectedCity, setSelectedCity] = useState("ALL");
  const [selectedVenue, setSelectedVenue] = useState("ALL");
  const [selectedMovieId, setSelectedMovieId] = useState("ALL");
  const [selectedLanguage, setSelectedLanguage] = useState("ALL");
  const [selectedDivision, setSelectedDivision] = useState("ALL");
  const [dateRange, setDateRange] = useState("ALL");
  const [exactDate, setExactDate] = useState("");

  const todayStr = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);
  const yesterdayStr = useMemo(() => format(subDays(new Date(), 1), "yyyy-MM-dd"), []);

  const [selectedBooking, setSelectedBooking] = useState<AdminDetailedBooking | null>(null);

  // Fetch theatres & movies for filter dropdowns
  useEffect(() => {
    Promise.allSettled([
      getAdminTheatres({ limit: 100 }),
      getAdminMovies({ limit: 100 }),
    ]).then(([theatresRes, moviesRes]) => {
      if (theatresRes.status === "fulfilled") {
        setTheatres(theatresRes.value.theatres || []);
      }
      if (moviesRes.status === "fulfilled") {
        setMoviesList(moviesRes.value.movies || []);
      }
    });
  }, []);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      let dateFromParam: string | undefined = undefined;
      let dateToParam: string | undefined = undefined;

      if (exactDate) {
        dateFromParam = `${exactDate}T00:00:00`;
        dateToParam = `${exactDate}T23:59:59`;
      } else if (dateRange === "TODAY") {
        dateFromParam = `${todayStr}T00:00:00`;
        dateToParam = `${todayStr}T23:59:59`;
      } else if (dateRange === "YESTERDAY") {
        dateFromParam = `${yesterdayStr}T00:00:00`;
        dateToParam = `${yesterdayStr}T23:59:59`;
      } else if (dateRange === "7D") {
        dateFromParam = format(subDays(startOfDay(new Date()), 7), "yyyy-MM-dd'T'00:00:00");
        dateToParam = format(new Date(), "yyyy-MM-dd'T'23:59:59");
      } else if (dateRange === "30D") {
        dateFromParam = format(subDays(startOfDay(new Date()), 30), "yyyy-MM-dd'T'00:00:00");
        dateToParam = format(new Date(), "yyyy-MM-dd'T'23:59:59");
      }

      const res = await searchDetailedBookings({
        query: debouncedQuery.trim() || undefined,
        venue_id: selectedVenue !== "ALL" ? selectedVenue : undefined,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        movie_id: selectedMovieId !== "ALL" ? selectedMovieId : undefined,
        city: selectedCity !== "ALL" ? selectedCity : undefined,
        language: selectedLanguage !== "ALL" ? selectedLanguage : undefined,
        date_from: dateFromParam,
        date_to: dateToParam,
        limit: 100,
      });
      setBookings(res.bookings || []);
    } catch {
      toast.error("Failed to load booking transactions");
    } finally {
      setLoading(false);
    }
  }, [
    debouncedQuery,
    statusFilter,
    selectedVenue,
    selectedMovieId,
    selectedCity,
    selectedLanguage,
    exactDate,
    dateRange,
    todayStr,
    yesterdayStr,
  ]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Derived unique lists for filters
  const availableCities = useMemo(() => {
    if (selectedState === "ALL") {
      const set = new Set<string>();
      theatres.forEach((t) => t.city && set.add(t.city));
      bookings.forEach((b) => b.city && set.add(b.city));
      return Array.from(set).filter((c): c is string => Boolean(c)).sort();
    }
    const stateCities = STATE_CITIES[selectedState] || [];
    const venueCities = theatres
      .filter((t) => getStateForCity(t.city) === selectedState)
      .map((t) => t.city)
      .filter((c): c is string => Boolean(c));
    const bookingCities = bookings
      .filter((b) => getStateForCity(b.city) === selectedState)
      .map((b) => b.city)
      .filter((c): c is string => Boolean(c));
    return Array.from(new Set([...stateCities, ...venueCities, ...bookingCities])).filter((c): c is string => Boolean(c)).sort();
  }, [theatres, bookings, selectedState]);

  const availableTheatres = useMemo(() => {
    return theatres.filter((t) => {
      if (selectedState !== "ALL" && getStateForCity(t.city) !== selectedState) return false;
      if (selectedCity !== "ALL" && t.city?.toLowerCase() !== selectedCity.toLowerCase()) return false;
      return true;
    });
  }, [theatres, selectedState, selectedCity]);

  const uniqueLanguages = useMemo(() => {
    const set = new Set<string>();
    if (selectedMovieId !== "ALL") {
      const selMovie = moviesList.find((m) => m.id === selectedMovieId);
      if (selMovie?.language) {
        selMovie.language.split(/[,/&|]+/).forEach((l) => {
          const clean = l.trim();
          if (clean) set.add(clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase());
        });
      }
      bookings
        .filter((b) => b.movie_id === selectedMovieId)
        .forEach((b) => {
          if (b.language) {
            b.language.split(/[,/&|]+/).forEach((l) => {
              const clean = l.trim();
              if (clean) set.add(clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase());
            });
          }
        });
    } else {
      moviesList.forEach((m) => {
        if (m.language) {
          m.language.split(/[,/&|]+/).forEach((l) => {
            const clean = l.trim();
            if (clean) set.add(clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase());
          });
        }
      });
      bookings.forEach((b) => {
        if (b.language) {
          b.language.split(/[,/&|]+/).forEach((l) => {
            const clean = l.trim();
            if (clean) set.add(clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase());
          });
        }
      });
    }
    return Array.from(set).sort();
  }, [moviesList, bookings, selectedMovieId]);

  const dateCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    bookings.forEach((b) => {
      const dt = b.showtime_at || b.created_at;
      if (dt) {
        try {
          const k = format(parseISO(dt), "yyyy-MM-dd");
          counts[k] = (counts[k] || 0) + 1;
        } catch {}
      }
    });
    return counts;
  }, [bookings]);

  const recentActiveDates = useMemo(() => {
    const dates = Object.keys(dateCounts).sort((a, b) => b.localeCompare(a));
    return dates.slice(0, 6);
  }, [dateCounts]);

  const uniqueDivisions = useMemo(() => {
    const set = new Set<string>();
    bookings.forEach((b) => b.screen_name && set.add(b.screen_name));
    return Array.from(set).sort();
  }, [bookings]);

  // Client-side date and secondary filters
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      // 0. State filter
      if (selectedState !== "ALL") {
        const bState = getStateForCity(b.city);
        if (bState !== selectedState) return false;
      }

      // 1. Movie filter
      if (selectedMovieId !== "ALL") {
        if (b.movie_id && b.movie_id !== selectedMovieId) return false;
        if (!b.movie_id) {
          const selMovie = moviesList.find((m) => m.id === selectedMovieId);
          if (selMovie && !b.movie_or_event_title.toLowerCase().includes(selMovie.title.toLowerCase())) {
            return false;
          }
        }
      }

      // 2. City filter
      if (selectedCity !== "ALL" && b.city && b.city.toLowerCase() !== selectedCity.toLowerCase()) {
        return false;
      }

      // 3. Venue filter
      if (selectedVenue !== "ALL" && b.venue_id && b.venue_id !== selectedVenue) {
        return false;
      }

      // 4. Language filter
      if (selectedLanguage !== "ALL") {
        const selLower = selectedLanguage.toLowerCase().trim();
        const bLang = (b.language || "").toLowerCase();
        let matches = bLang.includes(selLower);
        if (!matches && b.movie_id) {
          const m = moviesList.find((mov) => mov.id === b.movie_id);
          if (m?.language && m.language.toLowerCase().includes(selLower)) {
            matches = true;
          }
        }
        if (!matches) return false;
      }

      // 5. Division / Screen filter
      if (selectedDivision !== "ALL" && b.screen_name && !b.screen_name.toLowerCase().includes(selectedDivision.toLowerCase())) {
        return false;
      }

      // 6. Exact date filter (checks showtime_at or created_at)
      if (exactDate) {
        try {
          const bDateStr = format(parseISO(b.showtime_at || b.created_at), "yyyy-MM-dd");
          if (bDateStr !== exactDate) return false;
        } catch {
          return false;
        }
      } else if (dateRange !== "ALL") {
        // Preset date range
        try {
          const bookingDate = parseISO(b.showtime_at || b.created_at);
          const now = new Date();
          const bDateStr = format(bookingDate, "yyyy-MM-dd");
          if (dateRange === "TODAY") {
            if (bDateStr !== todayStr) return false;
          } else if (dateRange === "YESTERDAY") {
            if (bDateStr !== yesterdayStr) return false;
          } else if (dateRange === "7D") {
            if (!isAfter(bookingDate, subDays(startOfDay(now), 7))) return false;
          } else if (dateRange === "30D") {
            if (!isAfter(bookingDate, subDays(startOfDay(now), 30))) return false;
          }
        } catch {
          return true;
        }
      }

      return true;
    });
  }, [
    bookings,
    selectedState,
    selectedMovieId,
    selectedCity,
    selectedVenue,
    selectedLanguage,
    selectedDivision,
    exactDate,
    dateRange,
    moviesList,
    todayStr,
    yesterdayStr,
  ]);

  // Selected Movie Financial Analytics
  const selectedMovieObject = useMemo(() => {
    if (selectedMovieId === "ALL") return null;
    return moviesList.find((m) => m.id === selectedMovieId) || null;
  }, [selectedMovieId, moviesList]);

  const movieStats = useMemo(() => {
    if (!selectedMovieObject && selectedMovieId === "ALL") return null;

    const totalRevenue = filteredBookings.reduce((sum, b) => sum + (b.total_paise || 0), 0);
    const totalCommission = filteredBookings.reduce((sum, b) => sum + (b.commission_earned_paise || 0), 0);
    const totalTickets = filteredBookings.reduce((sum, b) => sum + (b.quantity || 1), 0);
    const citiesSet = new Set(filteredBookings.map((b) => b.city).filter(Boolean));
    const venuesSet = new Set(filteredBookings.map((b) => b.venue_name).filter(Boolean));

    return {
      totalBookings: filteredBookings.length,
      totalTickets,
      totalRevenuePaise: totalRevenue,
      totalCommissionPaise: totalCommission,
      citiesCount: citiesSet.size,
      venuesCount: venuesSet.size,
      cities: Array.from(citiesSet),
    };
  }, [selectedMovieObject, selectedMovieId, filteredBookings]);

  const hasActiveFilters =
    query.trim() !== "" ||
    statusFilter !== "ALL" ||
    selectedState !== "ALL" ||
    selectedVenue !== "ALL" ||
    selectedMovieId !== "ALL" ||
    selectedCity !== "ALL" ||
    selectedLanguage !== "ALL" ||
    selectedDivision !== "ALL" ||
    dateRange !== "ALL" ||
    exactDate !== "";

  const handleResetFilters = () => {
    setQuery("");
    setStatusFilter("ALL");
    setSelectedState("ALL");
    setSelectedVenue("ALL");
    setSelectedMovieId("ALL");
    setSelectedCity("ALL");
    setSelectedLanguage("ALL");
    setSelectedDivision("ALL");
    setDateRange("ALL");
    setExactDate("");
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-100 rounded-lg text-blue-600">
            <Ticket className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">Bookings & Financial Settlement Audit</h2>
            <p className="text-xs text-gray-500">
              Audit ticket sales, collections, and commissions filtered date-wise, location-wise, by movie, division & language.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchBookings}
          disabled={loading}
          className="h-9 gap-1.5 text-xs self-start sm:self-auto bg-white border-gray-200 text-gray-700 hover:bg-gray-50 shadow-2xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* FILTER TOOLBAR (Unified 4-Section Governance: Filter, Location, Movies, By Date) */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-2xs space-y-4">
        
        {/* ROW 1: 🔍 GENERAL FILTER (Search & Order Status) */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <div className="flex-1">
            <AdminSearchBar
              value={query}
              onChange={setQuery}
              placeholder="Search bookings by reference, customer email, phone, movie, or venue..."
              isSearching={loading && query !== debouncedQuery}
              className="w-full"
            />
          </div>

          {/* Quick Order Status Pills */}
          <div className="flex items-center gap-1 bg-gray-50/90 p-1 rounded-xl border border-gray-200 shadow-2xs self-start lg:self-auto shrink-0">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-2 hidden sm:inline">
              Status:
            </span>
            {["ALL", "CONFIRMED", "CANCELLED", "HELD"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  statusFilter === st
                    ? st === "CONFIRMED"
                      ? "bg-emerald-600 text-white shadow-2xs"
                      : st === "CANCELLED"
                      ? "bg-rose-600 text-white shadow-2xs"
                      : "bg-blue-600 text-white shadow-2xs"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-200/50"
                }`}
              >
                {st === "ALL" ? "All Status" : st}
              </button>
            ))}
          </div>
        </div>

        {/* ROW 2: 📍 LOCATION & 🎬 MOVIES FILTER GROUPS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pt-3 border-t border-gray-100">
          
          {/* 📍 LOCATION FILTER GROUP */}
          <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-rose-500" />
                Location Scope
              </span>
              <span className="text-[11px] text-gray-500 font-medium truncate max-w-[200px]">
                {selectedVenue !== "ALL"
                  ? theatres.find((t) => t.id === selectedVenue)?.name || "Venue Selected"
                  : selectedCity !== "ALL"
                  ? `City: ${selectedCity}`
                  : selectedState !== "ALL"
                  ? `State: ${selectedState}`
                  : "All Locations"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* State Filter */}
              <div>
                <select
                  value={selectedState}
                  onChange={(e) => {
                    setSelectedState(e.target.value);
                    setSelectedCity("ALL");
                    setSelectedVenue("ALL");
                  }}
                  className="w-full h-9 rounded-lg border border-gray-200 px-2.5 bg-white text-xs font-semibold text-gray-700 cursor-pointer shadow-2xs"
                >
                  <option value="ALL">All States</option>
                  {INDIAN_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* City Filter */}
              <div>
                <select
                  value={selectedCity}
                  onChange={(e) => {
                    setSelectedCity(e.target.value);
                    setSelectedVenue("ALL");
                  }}
                  className="w-full h-9 rounded-lg border border-gray-200 px-2.5 bg-white text-xs font-semibold text-gray-700 cursor-pointer shadow-2xs truncate"
                >
                  <option value="ALL">All Cities ({availableCities.length})</option>
                  {availableCities.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Theatre / Venue Filter */}
              <div>
                <select
                  value={selectedVenue}
                  onChange={(e) => setSelectedVenue(e.target.value)}
                  className="w-full h-9 rounded-lg border border-gray-200 px-2.5 bg-white text-xs font-semibold text-gray-700 cursor-pointer shadow-2xs truncate"
                >
                  <option value="ALL">All Theatres ({availableTheatres.length})</option>
                  {availableTheatres.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.city})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 🎬 MOVIES & CONTENT FILTER GROUP */}
          <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                <Film className="w-3.5 h-3.5 text-indigo-600" />
                Movies & Content
              </span>
              <span className="text-[11px] text-gray-500 font-medium truncate max-w-[200px]">
                {selectedMovieId !== "ALL"
                  ? moviesList.find((m) => m.id === selectedMovieId)?.title || "1 Movie Selected"
                  : "All Movies"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Movie Title */}
              <div className="sm:col-span-2">
                <select
                  value={selectedMovieId}
                  onChange={(e) => {
                    setSelectedMovieId(e.target.value);
                    setSelectedLanguage("ALL");
                  }}
                  className="w-full h-9 rounded-lg border border-gray-200 px-2.5 bg-white text-xs font-semibold text-gray-700 cursor-pointer shadow-2xs truncate"
                >
                  <option value="ALL">All Movies ({moviesList.length})</option>
                  {moviesList.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title} {m.language ? `(${m.language})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Language Filter */}
              <div>
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="w-full h-9 rounded-lg border border-gray-200 px-2.5 bg-white text-xs font-semibold text-gray-700 cursor-pointer shadow-2xs truncate"
                >
                  <option value="ALL">All Languages ({uniqueLanguages.length})</option>
                  {uniqueLanguages.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ROW 3: 📅 BY DATE FILTER (Dedicated Stepper, Picker & Quick Tabs) */}
        <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-200 space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold text-gray-900 tracking-tight">
                Date-wise Tickets Filter
              </span>
              <span className="text-[11px] text-gray-500 hidden md:inline">
                • Select an active date tab, preset, or custom day
              </span>
            </div>

            {/* Stepper + Exact Date Picker */}
            <div className="flex items-center gap-1.5 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => {
                  const current = exactDate ? parseISO(exactDate) : new Date();
                  const prev = format(subDays(current, 1), "yyyy-MM-dd");
                  setExactDate(prev);
                  setDateRange("CUSTOM");
                }}
                className="h-7 w-7 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 flex items-center justify-center text-gray-600 hover:text-gray-900 transition shadow-2xs cursor-pointer"
                title="Previous Day"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center gap-1.5 bg-white px-2.5 py-0.5 rounded-lg border border-gray-200 shadow-2xs">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <input
                  type="date"
                  value={exactDate}
                  onChange={(e) => {
                    setExactDate(e.target.value);
                    setDateRange("CUSTOM");
                  }}
                  className="h-6 text-xs font-semibold bg-transparent text-gray-800 focus:outline-hidden cursor-pointer"
                  title="Pick exact date"
                />
                {exactDate && (
                  <button
                    type="button"
                    onClick={() => {
                      setExactDate("");
                      setDateRange("ALL");
                    }}
                    className="text-gray-400 hover:text-gray-600 ml-1 cursor-pointer"
                    title="Clear date"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  const current = exactDate ? parseISO(exactDate) : new Date();
                  const next = format(addDays(current, 1), "yyyy-MM-dd");
                  setExactDate(next);
                  setDateRange("CUSTOM");
                }}
                className="h-7 w-7 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 flex items-center justify-center text-gray-600 hover:text-gray-900 transition shadow-2xs cursor-pointer"
                title="Next Day"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Date Pills & Dynamic Day Tabs Strip */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none">
            {/* All Time */}
            <button
              onClick={() => {
                setExactDate("");
                setDateRange("ALL");
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                !exactDate && dateRange === "ALL"
                  ? "bg-blue-600 text-white shadow-2xs font-bold"
                  : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <span>All Dates</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                !exactDate && dateRange === "ALL" ? "bg-blue-700 text-white" : "bg-gray-100 text-gray-600"
              }`}>
                {bookings.length}
              </span>
            </button>

            {/* Today */}
            <button
              onClick={() => {
                setExactDate(todayStr);
                setDateRange("CUSTOM");
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                exactDate === todayStr
                  ? "bg-blue-600 text-white shadow-2xs font-bold"
                  : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <span>Today</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                exactDate === todayStr ? "bg-blue-700 text-white" : "bg-gray-100 text-gray-600"
              }`}>
                {dateCounts[todayStr] || 0}
              </span>
            </button>

            {/* Yesterday */}
            <button
              onClick={() => {
                setExactDate(yesterdayStr);
                setDateRange("CUSTOM");
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                exactDate === yesterdayStr
                  ? "bg-blue-600 text-white shadow-2xs font-bold"
                  : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <span>Yesterday</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                exactDate === yesterdayStr ? "bg-blue-700 text-white" : "bg-gray-100 text-gray-600"
              }`}>
                {dateCounts[yesterdayStr] || 0}
              </span>
            </button>

            {/* Recent active dates from real booking history */}
            {recentActiveDates
              .filter((d) => d !== todayStr && d !== yesterdayStr)
              .map((d) => {
                const count = dateCounts[d] || 0;
                const isSelected = exactDate === d;
                let label = d;
                try {
                  label = format(parseISO(d), "dd MMM (EEE)");
                } catch {}

                return (
                  <button
                    key={d}
                    onClick={() => {
                      setExactDate(d);
                      setDateRange("CUSTOM");
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-blue-600 text-white shadow-2xs font-bold"
                        : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                  >
                    <span>{label}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                      isSelected ? "bg-blue-700 text-white" : "bg-gray-100 text-gray-600"
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}

            {/* Presets: Last 7 Days */}
            <button
              onClick={() => {
                setExactDate("");
                setDateRange("7D");
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                !exactDate && dateRange === "7D"
                  ? "bg-blue-600 text-white shadow-2xs font-bold"
                  : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              Last 7 Days
            </button>

            {/* Presets: Last 30 Days */}
            <button
              onClick={() => {
                setExactDate("");
                setDateRange("30D");
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                !exactDate && dateRange === "30D"
                  ? "bg-blue-600 text-white shadow-2xs font-bold"
                  : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              Last 30 Days
            </button>
          </div>
        </div>

        {/* ROW 4: ACTIVE FILTER CHIPS & RESET */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-gray-400 text-[11px] font-bold uppercase tracking-wider">
                Active Filters:
              </span>

              {statusFilter !== "ALL" && (
                <Badge
                  variant="outline"
                  className="bg-gray-100 text-gray-700 gap-1 border-gray-300 text-xs font-semibold"
                >
                  Status: {statusFilter}
                  <X
                    className="w-3 h-3 cursor-pointer hover:text-rose-600"
                    onClick={() => setStatusFilter("ALL")}
                  />
                </Badge>
              )}

              {selectedState !== "ALL" && (
                <Badge
                  variant="outline"
                  className="bg-rose-50 text-rose-700 gap-1 border-rose-200 text-xs font-semibold"
                >
                  State: {selectedState}
                  <X
                    className="w-3 h-3 cursor-pointer hover:text-rose-900"
                    onClick={() => {
                      setSelectedState("ALL");
                      setSelectedCity("ALL");
                      setSelectedVenue("ALL");
                    }}
                  />
                </Badge>
              )}

              {selectedCity !== "ALL" && (
                <Badge
                  variant="outline"
                  className="bg-rose-50 text-rose-700 gap-1 border-rose-200 text-xs font-semibold"
                >
                  City: {selectedCity}
                  <X
                    className="w-3 h-3 cursor-pointer hover:text-rose-900"
                    onClick={() => {
                      setSelectedCity("ALL");
                      setSelectedVenue("ALL");
                    }}
                  />
                </Badge>
              )}

              {selectedVenue !== "ALL" && (
                <Badge
                  variant="outline"
                  className="bg-rose-50 text-rose-700 gap-1 border-rose-200 text-xs font-semibold"
                >
                  Theatre: {theatres.find((t) => t.id === selectedVenue)?.name || selectedVenue}
                  <X
                    className="w-3 h-3 cursor-pointer hover:text-rose-900"
                    onClick={() => setSelectedVenue("ALL")}
                  />
                </Badge>
              )}

              {selectedMovieId !== "ALL" && (
                <Badge
                  variant="outline"
                  className="bg-indigo-50 text-indigo-700 gap-1 border-indigo-200 text-xs font-semibold"
                >
                  Movie: {moviesList.find((m) => m.id === selectedMovieId)?.title || selectedMovieId}
                  <X
                    className="w-3 h-3 cursor-pointer hover:text-indigo-900"
                    onClick={() => {
                      setSelectedMovieId("ALL");
                      setSelectedLanguage("ALL");
                    }}
                  />
                </Badge>
              )}

              {selectedLanguage !== "ALL" && (
                <Badge
                  variant="outline"
                  className="bg-indigo-50 text-indigo-700 gap-1 border-indigo-200 text-xs font-semibold"
                >
                  Language: {selectedLanguage}
                  <X
                    className="w-3 h-3 cursor-pointer hover:text-indigo-900"
                    onClick={() => setSelectedLanguage("ALL")}
                  />
                </Badge>
              )}

              {(exactDate || dateRange !== "ALL") && (
                <Badge
                  variant="outline"
                  className="bg-blue-50 text-blue-700 gap-1 border-blue-200 text-xs font-semibold"
                >
                  Date: {exactDate || dateRange}
                  <X
                    className="w-3 h-3 cursor-pointer hover:text-blue-900"
                    onClick={() => {
                      setExactDate("");
                      setDateRange("ALL");
                    }}
                  />
                </Badge>
              )}

              {query.trim() !== "" && (
                <Badge
                  variant="outline"
                  className="bg-amber-50 text-amber-700 gap-1 border-amber-200 text-xs font-semibold"
                >
                  Search: &quot;{query}&quot;
                  <X
                    className="w-3 h-3 cursor-pointer hover:text-amber-900"
                    onClick={() => setQuery("")}
                  />
                </Badge>
              )}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="h-7 px-2.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg gap-1.5 cursor-pointer shrink-0"
              title="Reset all filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset All Filters
            </Button>
          </div>
        )}

        {/* Filter Summary */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-1 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <span>
              Showing <strong className="text-gray-900">{filteredBookings.length}</strong> bookings
              {selectedMovieObject && (
                <span>
                  {" "}for <strong className="text-blue-600">{selectedMovieObject.title}</strong>
                </span>
              )}
            </span>
          </div>
          {loading && (
            <span className="inline-flex items-center gap-1.5 text-blue-600 font-medium">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Searching transactions...
            </span>
          )}
        </div>
      </div>

      {/* MOVIE SPECIFIC FINANCIAL AUDIT BANNER (Active when a specific movie is filtered) */}
      {movieStats && (
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-5 rounded-2xl shadow-md border border-blue-800 space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div className="flex items-center gap-3">
              {selectedMovieObject?.poster_url && (
                <img
                  src={selectedMovieObject.poster_url}
                  alt={selectedMovieObject.title}
                  className="w-10 h-14 object-cover rounded-lg bg-white/10 border border-white/20 shrink-0"
                />
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">
                    {selectedMovieObject ? selectedMovieObject.title : "Movie Performance"}
                  </h3>
                  {selectedMovieObject?.certificate && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/20 text-white font-bold">
                      {selectedMovieObject.certificate}
                    </span>
                  )}
                  {selectedMovieObject?.language && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-orange-500/80 text-white font-bold">
                      {selectedMovieObject.language}
                    </span>
                  )}
                </div>
                <p className="text-xs text-blue-200 mt-0.5">
                  Filtered Box Office, Admissions & Commission Breakdown
                </p>
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedMovieId("ALL")}
              className="h-8 text-xs bg-white/10 hover:bg-white/20 text-white border-white/20 self-start sm:self-auto gap-1"
            >
              <X className="w-3 h-3" />
              Clear Movie Filter
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white/5 p-3 rounded-xl border border-white/10">
              <div className="text-[10px] uppercase font-bold text-blue-200">Gross Ticket Volume</div>
              <div className="text-xl font-bold text-white mt-0.5">
                ₹{((movieStats.totalRevenuePaise || 0) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-blue-300 mt-0.5">
                {movieStats.totalTickets} tickets sold
              </div>
            </div>

            <div className="bg-white/5 p-3 rounded-xl border border-white/10">
              <div className="text-[10px] uppercase font-bold text-emerald-300">Platform Commission</div>
              <div className="text-xl font-bold text-emerald-400 mt-0.5">
                ₹{((movieStats.totalCommissionPaise || 0) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-blue-300 mt-0.5">
                {movieStats.totalBookings} orders
              </div>
            </div>

            <div className="bg-white/5 p-3 rounded-xl border border-white/10">
              <div className="text-[10px] uppercase font-bold text-blue-200">Active Cities</div>
              <div className="text-xl font-bold text-white mt-0.5">
                {movieStats.citiesCount} <span className="text-xs font-normal text-blue-200">cities</span>
              </div>
              <div className="text-[11px] text-blue-300 mt-0.5 truncate">
                {movieStats.cities.slice(0, 3).join(", ") || "All Regions"}
              </div>
            </div>

            <div className="bg-white/5 p-3 rounded-xl border border-white/10">
              <div className="text-[10px] uppercase font-bold text-blue-200">Venues Screening</div>
              <div className="text-xl font-bold text-white mt-0.5">
                {movieStats.venuesCount} <span className="text-xs font-normal text-blue-200">theatres</span>
              </div>
              <div className="text-[11px] text-blue-300 mt-0.5">Participating in selection</div>
            </div>
          </div>
        </div>
      )}

      {/* BOOKINGS TABLE */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
        {loading && bookings.length === 0 ? (
          <div className="py-20 flex justify-center items-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-500">
            No booking records found matching your date, location, division, or movie filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Booking Ref</th>
                  <th className="py-3 px-4">Movie & Showtime</th>
                  <th className="py-3 px-4">Location & Division</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Gross Total</th>
                  <th className="py-3 px-4">Commission</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-blue-50/20 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-gray-900">
                      <div>{b.ref_code}</div>
                      <div className="text-[10px] text-gray-400 font-normal">
                        {format(parseISO(b.created_at), "dd MMM yyyy, hh:mm a")}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-gray-900">{b.movie_or_event_title}</div>
                      <div className="text-[11px] text-gray-500 flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {b.showtime_at && (
                          <span>
                            {format(parseISO(b.showtime_at), "EEE, d MMM • hh:mm a")}
                          </span>
                        )}
                        {b.language && (
                          <Badge className="text-[9px] px-1.5 py-0 bg-orange-100 text-orange-800 border-none font-bold">
                            {b.language}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-gray-600">
                      <div className="font-medium text-gray-900 flex items-center gap-1">
                        <Building className="w-3 h-3 text-gray-400" />
                        {b.venue_name}
                      </div>
                      <div className="text-[11px] text-gray-500 flex items-center gap-1.5 mt-0.5">
                        {b.city && <span className="font-semibold text-gray-700">{b.city}</span>}
                        {b.screen_name && <span>&bull; {b.screen_name}</span>}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-gray-600">
                      <div>{b.customer_email || "Guest"}</div>
                      <div className="text-[11px] text-gray-400">{b.customer_phone || "-"}</div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-gray-900">
                      ₹{(b.total_paise / 100).toFixed(2)}
                      <div className="text-[10px] font-normal text-gray-400">
                        {b.quantity || 1} tickets
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-emerald-600">
                      ₹{(b.commission_earned_paise / 100).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                        {b.booking_status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedBooking(b)}
                        className="h-8 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        Inspect
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Drilldown Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto border border-gray-100">
            <div className="flex justify-between items-start border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Transaction Audit: {selectedBooking.ref_code}
                </h3>
                <p className="text-xs text-gray-500">
                  {selectedBooking.movie_or_event_title} &bull; {selectedBooking.venue_name}
                </p>
              </div>
              <button
                onClick={() => setSelectedBooking(null)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 grid grid-cols-2 gap-2">
                <div>
                  <span className="text-gray-500 font-medium">Location:</span>{" "}
                  <strong className="text-gray-900">{selectedBooking.city || "N/A"}</strong>
                </div>
                <div>
                  <span className="text-gray-500 font-medium">Division / Screen:</span>{" "}
                  <strong className="text-gray-900">{selectedBooking.screen_name || "N/A"}</strong>
                </div>
                <div>
                  <span className="text-gray-500 font-medium">Language:</span>{" "}
                  <strong className="text-gray-900">{selectedBooking.language || "N/A"}</strong>
                </div>
                <div>
                  <span className="text-gray-500 font-medium">Showtime:</span>{" "}
                  <strong className="text-gray-900">
                    {format(parseISO(selectedBooking.showtime_at || selectedBooking.created_at), "dd MMM, hh:mm a")}
                  </strong>
                </div>
              </div>

              <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 space-y-2">
                <div className="flex justify-between text-gray-700">
                  <span>Seats Assigned:</span>
                  <span className="font-mono font-bold text-gray-900">
                    {selectedBooking.seats?.length ? selectedBooking.seats.join(", ") : "General Admission"}
                  </span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Gross Ticket Total:</span>
                  <span className="font-bold text-gray-900">
                    ₹{(selectedBooking.total_paise / 100).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-emerald-700 font-semibold border-t border-gray-200 pt-2">
                  <span>Net Commission Realized:</span>
                  <span>₹{(selectedBooking.commission_earned_paise / 100).toFixed(2)}</span>
                </div>
              </div>

              <div className="border border-gray-100 p-3 rounded-xl space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-gray-500">Customer Email:</span>
                  <span className="font-medium text-gray-900">{selectedBooking.customer_email || "Guest"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Customer Phone:</span>
                  <span className="font-medium text-gray-900">{selectedBooking.customer_phone || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Payment Status:</span>
                  <Badge className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                    {selectedBooking.payment_status}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Invoice Status:</span>
                  <Badge variant="outline" className="text-[10px]">
                    {selectedBooking.commission_invoice_status}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedBooking(null)}
                className="bg-white border-gray-200"
              >
                Close Audit
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
