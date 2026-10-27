import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { getTheatreBookings, getTheatreVenues, TheatreBookingItem, TheatreVenueItem } from "@/api/theatre.api";
import {
  Ticket,
  Search,
  Filter,
  Loader2,
  CheckCircle2,
  Download,
  RotateCcw,
  Building2,
  MapPin,
  Film,
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SearchableTheatreSelect } from "@/components/common/SearchableTheatreSelect";
import { useDebounce } from "@/hooks/useDebounce";
import { INDIAN_STATES, getStateForCity, getCitiesForState } from "@/utils/indiaGeography";
import { format, parseISO, subDays, addDays, startOfDay, isAfter } from "date-fns";
import { toast } from "sonner";

function formatSeatCodes(seatCodes?: string): string {
  if (!seatCodes) return "General / Unreserved";
  try {
    const parsed = JSON.parse(seatCodes);
    if (Array.isArray(parsed)) return parsed.join(", ");
    return String(parsed);
  } catch {
    return seatCodes;
  }
}

export default function TheatreBookingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const venueIdFromUrl = searchParams.get("venue_id") || "ALL";

  const [bookings, setBookings] = useState<TheatreBookingItem[]>([]);
  const [allBookings, setAllBookings] = useState<TheatreBookingItem[]>([]);
  const [venues, setVenues] = useState<TheatreVenueItem[]>([]);
  const [selectedState, setSelectedState] = useState<string>("ALL");
  const [selectedCity, setSelectedCity] = useState<string>("ALL");
  const [selectedVenue, setSelectedVenue] = useState(venueIdFromUrl);
  const [selectedMovie, setSelectedMovie] = useState<string>("ALL");
  const [selectedScreen, setSelectedScreen] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [dateRange, setDateRange] = useState<string>("ALL");
  const [exactDate, setExactDate] = useState<string>("");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [loading, setLoading] = useState(true);

  const todayStr = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);
  const yesterdayStr = useMemo(() => format(subDays(new Date(), 1), "yyyy-MM-dd"), []);

  useEffect(() => {
    async function load() {
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

        const [b, v] = await Promise.all([
          getTheatreBookings({
            venue_id: selectedVenue !== "ALL" ? selectedVenue : undefined,
            status: selectedStatus !== "ALL" ? selectedStatus : undefined,
            city: selectedCity !== "ALL" ? selectedCity : undefined,
            date_from: dateFromParam,
            date_to: dateToParam,
            search: debouncedSearch.trim() || undefined,
            limit: 100,
          }),
          getTheatreVenues(),
        ]);
        const list = b || [];
        setBookings(list);
        if (!exactDate && dateRange === "ALL") {
          setAllBookings(list);
        }
        setVenues(v || []);
      } catch (err) {
        console.error("Bookings error", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [selectedVenue, selectedStatus, selectedCity, exactDate, dateRange, debouncedSearch, todayStr, yesterdayStr]);

  const handleStateChange = (state: string) => {
    setSelectedState(state);
    setSelectedCity("ALL");
    setSelectedVenue("ALL");
    searchParams.delete("venue_id");
    setSearchParams(searchParams);
  };

  const handleCityChange = (city: string) => {
    setSelectedCity(city);
    setSelectedVenue("ALL");
    searchParams.delete("venue_id");
    setSearchParams(searchParams);
  };

  const handleVenueChange = (venueId: string) => {
    setSelectedVenue(venueId);
    if (venueId === "ALL") {
      searchParams.delete("venue_id");
      setSearchParams(searchParams);
    } else {
      setSearchParams({ venue_id: venueId });
    }
  };

  const availableCities = useMemo(() => {
    if (selectedState === "ALL") {
      const cities = Array.from(new Set(venues.map((v) => v.city).filter(Boolean)));
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
  }, [venues, selectedState]);

  const availableVenues = useMemo(() => {
    return venues.filter((v) => {
      if (selectedState !== "ALL" && getStateForCity(v.city) !== selectedState) return false;
      if (selectedCity !== "ALL" && v.city.toLowerCase() !== selectedCity.toLowerCase()) return false;
      return true;
    });
  }, [venues, selectedState, selectedCity]);

  const availableMovies = useMemo(() => {
    const set = new Set<string>();
    bookings.forEach((b) => b.movie_title && set.add(b.movie_title));
    return Array.from(set).sort();
  }, [bookings]);

  const availableScreens = useMemo(() => {
    const set = new Set<string>();
    bookings.forEach((b) => b.screen_name && set.add(b.screen_name));
    return Array.from(set).sort();
  }, [bookings]);

  const dateCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const dataset = allBookings.length > 0 ? allBookings : bookings;
    dataset.forEach((b) => {
      const dt = b.showtime || b.created_at;
      if (dt) {
        try {
          const k = format(parseISO(dt), "yyyy-MM-dd");
          if (k <= todayStr) {
            counts[k] = (counts[k] || 0) + 1;
          }
        } catch {}
      }
    });
    return counts;
  }, [allBookings, bookings, todayStr]);

  const recentActiveDates = useMemo(() => {
    const dates = Object.keys(dateCounts)
      .filter((d) => d <= todayStr)
      .sort((a, b) => b.localeCompare(a));
    return dates.slice(0, 6);
  }, [dateCounts, todayStr]);

  // Client-side filtering by state/city/movie/date if selected
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const matchedVenue = venues.find((v) => v.name.toLowerCase() === b.venue_name.toLowerCase());
      if (selectedState !== "ALL" && matchedVenue) {
        if (getStateForCity(matchedVenue.city) !== selectedState) return false;
      }
      if (selectedCity !== "ALL" && matchedVenue) {
        if (matchedVenue.city.toLowerCase() !== selectedCity.toLowerCase()) return false;
      }
      if (selectedMovie !== "ALL") {
        if (b.movie_title.toLowerCase() !== selectedMovie.toLowerCase()) return false;
      }
      if (selectedScreen !== "ALL") {
        if (!b.screen_name || b.screen_name.toLowerCase() !== selectedScreen.toLowerCase()) return false;
      }
      if (exactDate) {
        if (exactDate > todayStr) return false;
        try {
          const bDateStr = format(parseISO(b.showtime || b.created_at), "yyyy-MM-dd");
          if (bDateStr !== exactDate) return false;
        } catch {
          return false;
        }
      } else if (dateRange !== "ALL") {
        try {
          const bDate = parseISO(b.showtime || b.created_at);
          const bDateStr = format(bDate, "yyyy-MM-dd");
          const now = new Date();
          if (dateRange === "TODAY") {
            if (bDateStr !== todayStr) return false;
          } else if (dateRange === "YESTERDAY") {
            if (bDateStr !== yesterdayStr) return false;
          } else if (dateRange === "7D") {
            if (!isAfter(bDate, subDays(startOfDay(now), 7))) return false;
          } else if (dateRange === "30D") {
            if (!isAfter(bDate, subDays(startOfDay(now), 30))) return false;
          }
        } catch {
          return true;
        }
      }
      return true;
    });
  }, [bookings, venues, selectedState, selectedCity, selectedMovie, exactDate, dateRange, todayStr, yesterdayStr]);

  // Summary Metrics
  const summary = useMemo(() => {
    const totalTickets = filteredBookings.reduce((acc, b) => acc + (b.quantity || 1), 0);
    const totalGross = filteredBookings.reduce((acc, b) => acc + (b.total_paise || 0), 0);
    return {
      orderCount: filteredBookings.length,
      ticketCount: totalTickets,
      grossPaise: totalGross,
    };
  }, [filteredBookings]);

  // CSV Export Function
  const handleExportCSV = () => {
    if (filteredBookings.length === 0) {
      toast.error("No bookings available to export");
      return;
    }

    const headers = [
      "Booking ID",
      "Reference Code",
      "Movie Title",
      "Multiplex Venue",
      "Auditorium / Screen",
      "Show Date & Time",
      "Ticket Quantity",
      "Allocated Seats",
      "Customer Email",
      "Customer Phone",
      "Gross Total (₹)",
      "Booking Status",
      "Created At",
    ];

    const rows = filteredBookings.map((b) => [
      `"${b.id}"`,
      `"${b.ref_code}"`,
      `"${b.movie_title.replace(/"/g, '""')}"`,
      `"${b.venue_name.replace(/"/g, '""')}"`,
      `"${b.screen_name.replace(/"/g, '""')}"`,
      `"${new Date(b.showtime).toLocaleString()}"`,
      b.quantity || 1,
      `"${formatSeatCodes(b.seat_codes).replace(/"/g, '""')}"`,
      `"${b.contact_email || ""}"`,
      `"${b.contact_phone || ""}"`,
      ((b.total_paise || 0) / 100).toFixed(2),
      b.status,
      `"${new Date(b.created_at).toLocaleString()}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `vybhz_daily_bookings_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Daily Bookings CSV Report exported successfully!");
  };

  const handleResetFilters = () => {
    setSearch("");
    setSelectedState("ALL");
    setSelectedCity("ALL");
    setSelectedVenue("ALL");
    setSelectedMovie("ALL");
    setSelectedScreen("ALL");
    setSelectedStatus("ALL");
    setExactDate("");
    setDateRange("ALL");
    searchParams.delete("venue_id");
    setSearchParams(searchParams);
  };

  const hasActiveFilters =
    search.trim() !== "" ||
    selectedState !== "ALL" ||
    selectedCity !== "ALL" ||
    selectedVenue !== "ALL" ||
    selectedMovie !== "ALL" ||
    selectedScreen !== "ALL" ||
    selectedStatus !== "ALL" ||
    exactDate !== "" ||
    dateRange !== "ALL";

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Customer Admissions & Bookings</h1>
          <p className="text-xs text-slate-500 mt-1">
            Audit customer ticket admissions, seat allocations, ref codes, and gross collections across your screens.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="h-9 gap-1.5 text-xs text-slate-700 bg-white hover:bg-slate-50"
            title="Download CSV Report"
          >
            <Download className="w-3.5 h-3.5 text-[#7B1E3D]" />
            Export CSV
          </Button>

          <Badge variant="outline" className="text-xs font-semibold px-3 py-1 bg-slate-50 text-slate-800">
            {summary.orderCount} Orders ({summary.ticketCount} Tickets)
          </Badge>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Admissions & Orders
          </span>
          <div className="text-xl font-black text-slate-900 mt-1">{summary.orderCount} Orders</div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">{summary.ticketCount} Total Admissions</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Gross Box Office Value
          </span>
          <div className="text-xl font-black text-slate-900 mt-1">
            ₹{(summary.grossPaise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </div>
          <span className="text-[11px] text-emerald-600 font-semibold mt-0.5 block">Customer Ticket Proceeds</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Active Multiplex Scope
          </span>
          <div className="text-xl font-black text-slate-900 mt-1">
            {selectedVenue !== "ALL" ? "1 Selected Venue" : `${venues.length} Facilities`}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            {selectedState !== "ALL" ? `State: ${selectedState}` : "All Assigned Territories"}
          </span>
        </div>
      </div>

      {/* Filter toolbar (Unified Filter, Location, Movies, By Date) */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        {/* Row 1: Search & Dropdowns */}
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search bookings by reference, movie, customer phone, or email..."
              className="pl-10 h-10 rounded-xl bg-slate-50 border-slate-200 focus:bg-white text-xs font-medium"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Movie Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500 hidden xl:inline">Movie:</span>
              <select
                className="h-10 rounded-xl border border-slate-200 px-3 bg-slate-50 hover:bg-white focus:bg-white text-xs font-semibold text-slate-800 cursor-pointer transition truncate max-w-[180px]"
                value={selectedMovie}
                onChange={(e) => setSelectedMovie(e.target.value)}
              >
                <option value="ALL">All Movies ({availableMovies.length})</option>
                {availableMovies.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* State Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500 hidden xl:inline">State:</span>
              <select
                value={selectedState}
                onChange={(e) => handleStateChange(e.target.value)}
                className="h-10 rounded-xl border border-slate-200 px-3 bg-slate-50 hover:bg-white focus:bg-white text-xs font-semibold text-slate-800 cursor-pointer transition"
              >
                <option value="ALL">All States</option>
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* City Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500 hidden xl:inline">City:</span>
              <select
                value={selectedCity}
                onChange={(e) => handleCityChange(e.target.value)}
                className="h-10 rounded-xl border border-slate-200 px-3 bg-slate-50 hover:bg-white focus:bg-white text-xs font-semibold text-slate-800 cursor-pointer transition"
              >
                <option value="ALL">All Cities {selectedState !== "ALL" ? `in ${selectedState}` : ""}</option>
                {availableCities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Venue Filter */}
            {/* Venue Filter with Search */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500 hidden xl:inline">Venue:</span>
              <SearchableTheatreSelect
                value={selectedVenue}
                onChange={handleVenueChange}
                theatres={availableVenues}
                allOptionLabel={`All Venues (${availableVenues.length})`}
                allOptionValue="ALL"
                buttonClassName="bg-slate-50 hover:bg-white focus:bg-white text-slate-800 border-slate-200"
              />
            </div>

            {/* Screen Filter ("22.Location movies filter,date,screen filter in theatre admin") */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500 hidden xl:inline">Screen:</span>
              <select
                className="h-10 rounded-xl border border-slate-200 px-3 bg-slate-50 hover:bg-white focus:bg-white text-xs font-semibold text-slate-800 cursor-pointer transition truncate max-w-[150px]"
                value={selectedScreen}
                onChange={(e) => setSelectedScreen(e.target.value)}
              >
                <option value="ALL">All Screens ({availableScreens.length})</option>
                {availableScreens.map((sc) => (
                  <option key={sc} value={sc}>
                    {sc}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500 hidden xl:inline">Status:</span>
              <select
                className="h-10 rounded-xl border border-slate-200 px-3 bg-slate-50 hover:bg-white focus:bg-white text-xs font-semibold text-slate-800 cursor-pointer transition"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="ALL">All Statuses</option>
                <option value="CONFIRMED">CONFIRMED</option>
                <option value="CANCELLED">CANCELLED</option>
                <option value="REFUNDED">REFUNDED</option>
              </select>
            </div>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-10 px-3 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 gap-1 rounded-xl"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* Row 2: 📅 Date Filter Toolbar */}
        <div className="bg-slate-50/90 p-3 rounded-xl border border-slate-200/90 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-[#7B1E3D]" />
              <span className="text-xs font-bold text-slate-900 tracking-tight">
                Date-wise Tickets Filter
              </span>
              <span className="text-[11px] text-slate-500 hidden md:inline">
                • Select an active date tab or exact show day
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
                className="h-7 w-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-600 hover:text-slate-900 transition shadow-2xs cursor-pointer"
                title="Previous Day"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center gap-1.5 bg-white px-2.5 py-0.5 rounded-lg border border-slate-200 shadow-2xs">
                <Calendar className="w-3.5 h-3.5 text-[#7B1E3D]" />
                <input
                  type="date"
                  max={todayStr}
                  value={exactDate}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val && val > todayStr) {
                      toast.error("Future dates cannot be selected for tickets");
                      setExactDate(todayStr);
                    } else {
                      setExactDate(val);
                    }
                    setDateRange("CUSTOM");
                  }}
                  className="h-6 text-xs font-semibold bg-transparent text-slate-800 focus:outline-hidden cursor-pointer"
                  title={`Pick date (up to today: ${todayStr})`}
                />
                {exactDate && (
                  <button
                    type="button"
                    onClick={() => {
                      setExactDate("");
                      setDateRange("ALL");
                    }}
                    className="text-slate-400 hover:text-slate-600 ml-1 cursor-pointer"
                    title="Clear date (view all dates)"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <button
                type="button"
                disabled={!exactDate || exactDate >= todayStr}
                onClick={() => {
                  if (!exactDate || exactDate >= todayStr) return;
                  const current = parseISO(exactDate);
                  const next = format(addDays(current, 1), "yyyy-MM-dd");
                  if (next > todayStr) {
                    setExactDate(todayStr);
                  } else {
                    setExactDate(next);
                  }
                  setDateRange("CUSTOM");
                }}
                className={`h-7 w-7 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-600 transition shadow-2xs ${
                  !exactDate || exactDate >= todayStr
                    ? "opacity-40 cursor-not-allowed text-slate-300"
                    : "hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                }`}
                title={!exactDate || exactDate >= todayStr ? "Cannot navigate to future dates" : "Next Day"}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Date Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none">
            <button
              onClick={() => {
                setExactDate("");
                setDateRange("ALL");
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                !exactDate && dateRange === "ALL"
                  ? "bg-[#7B1E3D] text-white shadow-2xs font-bold"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              <span>All Dates</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                !exactDate && dateRange === "ALL" ? "bg-[#5c162e] text-white" : "bg-slate-100 text-slate-600"
              }`}>
                {allBookings.length || bookings.length}
              </span>
            </button>

            <button
              onClick={() => {
                setExactDate(todayStr);
                setDateRange("CUSTOM");
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                exactDate === todayStr
                  ? "bg-[#7B1E3D] text-white shadow-2xs font-bold"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              <span>Today</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                exactDate === todayStr ? "bg-[#5c162e] text-white" : "bg-slate-100 text-slate-600"
              }`}>
                {dateCounts[todayStr] || 0}
              </span>
            </button>

            <button
              onClick={() => {
                setExactDate(yesterdayStr);
                setDateRange("CUSTOM");
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                exactDate === yesterdayStr
                  ? "bg-[#7B1E3D] text-white shadow-2xs font-bold"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              <span>Yesterday</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                exactDate === yesterdayStr ? "bg-[#5c162e] text-white" : "bg-slate-100 text-slate-600"
              }`}>
                {dateCounts[yesterdayStr] || 0}
              </span>
            </button>

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
                        ? "bg-[#7B1E3D] text-white shadow-2xs font-bold"
                        : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <span>{label}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                      isSelected ? "bg-[#5c162e] text-white" : "bg-slate-100 text-slate-600"
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}

            <button
              onClick={() => {
                setExactDate("");
                setDateRange("7D");
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                !exactDate && dateRange === "7D"
                  ? "bg-[#7B1E3D] text-white shadow-2xs font-bold"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              Last 7 Days
            </button>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 gap-2">
            <span>
              Showing <strong className="text-slate-800">{filteredBookings.length}</strong> of{" "}
              <strong>{bookings.length}</strong> orders
            </span>
            <span className="text-[11px] text-slate-400">
              {selectedMovie !== "ALL" && `Movie: "${selectedMovie}" • `}
              {selectedState !== "ALL" && `State: ${selectedState} • `}
              {selectedCity !== "ALL" && `City: ${selectedCity} • `}
              {selectedVenue !== "ALL" && `Venue Filtered • `}
              {(exactDate || dateRange !== "ALL") && `Date: ${exactDate || dateRange} • `}
              {search && `Search: "${search}"`}
            </span>
          </div>
        )}
      </div>

      {/* Bookings Table */}
      {loading ? (
        <div className="py-24 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#7B1E3D]" />
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="py-20 bg-white rounded-2xl border border-slate-200 text-center text-sm text-slate-400">
          No bookings found matching criteria.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Ref Code</th>
                  <th className="py-3.5 px-4">Movie & Showtime</th>
                  <th className="py-3.5 px-4">Multiplex / Screen</th>
                  <th className="py-3.5 px-4">Tickets & Seats</th>
                  <th className="py-3.5 px-4">Customer Contact</th>
                  <th className="py-3.5 px-4">Total Amount</th>
                  <th className="py-3.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-bold text-slate-900">{b.ref_code}</div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(b.created_at).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{b.movie_title}</div>
                      <div className="text-[11px] text-slate-500">
                        {new Date(b.showtime).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">
                      <div className="font-medium">{b.venue_name}</div>
                      <div className="text-[11px] text-slate-400">{b.screen_name}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">
                        {b.quantity || 1} {(b.quantity || 1) === 1 ? "Ticket" : "Tickets"}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {formatSeatCodes(b.seat_codes)}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {b.contact_email && <div className="truncate">{b.contact_email}</div>}
                      {b.contact_phone && <div className="text-[11px] text-slate-400">{b.contact_phone}</div>}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      ₹{((b.total_paise || 0) / 100).toFixed(0)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          b.status === "CONFIRMED"
                            ? "text-emerald-700 bg-emerald-50 border border-emerald-200"
                            : b.status === "CANCELLED"
                            ? "text-rose-700 bg-rose-50 border border-rose-200"
                            : "text-amber-700 bg-amber-50 border border-amber-200"
                        }`}
                      >
                        <CheckCircle2 className="w-3 h-3" /> {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
