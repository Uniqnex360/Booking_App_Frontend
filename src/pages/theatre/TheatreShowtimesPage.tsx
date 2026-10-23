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
  Wifi,
  AlertTriangle,
  Check,
  Layers,
  ShieldAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { INDIAN_STATES, getStateForCity, getCitiesForState } from "@/utils/indiaGeography";

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

  // Seat Block / Inventory Inspector Modal (Spec Section 5)
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
      // Reload seats
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
            limit: 100,
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

  const filteredShowtimes = useMemo(() => {
    return showtimes.filter((sh) => {
      // 1. Search by movie or venue name
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesMovie = sh.movie.title.toLowerCase().includes(q);
        const matchesVenue = sh.venue.name.toLowerCase().includes(q);
        const matchesCity = sh.venue.city?.toLowerCase().includes(q);
        if (!matchesMovie && !matchesVenue && !matchesCity) return false;
      }

      // 2. Filter by state
      if (selectedState !== "ALL") {
        if (getStateForCity(sh.venue.city) !== selectedState) return false;
      }

      // 3. Filter by city
      if (selectedCity !== "ALL") {
        if (sh.venue.city.toLowerCase() !== selectedCity.toLowerCase()) return false;
      }

      return true;
    });
  }, [showtimes, searchQuery, selectedState, selectedCity]);

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    selectedState !== "ALL" ||
    selectedCity !== "ALL" ||
    selectedVenue !== "ALL";

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedState("ALL");
    setSelectedCity("ALL");
    setSelectedVenue("ALL");
    searchParams.delete("venue_id");
    setSearchParams(searchParams);
  };

  return (
    <div className="space-y-6">
      {/* Cinema Provider Sync Status Banner (Spec Section 5) */}
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

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Showtimes Schedule</h1>
          <p className="text-xs text-slate-500 mt-1">
            Browse upcoming screenings, audit auditorium capacity, and check titles playing across your screens.
          </p>
        </div>

        <Badge variant="outline" className="text-xs font-semibold px-3 py-1 bg-slate-50 text-slate-800">
          {filteredShowtimes.length} of {showtimes.length} Screenings
        </Badge>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search by movie title or venue */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by movie title or theatre name..."
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

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter by State */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500 hidden lg:inline">State:</span>
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

            {/* Filter by City (Cascading) */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500 hidden lg:inline">City:</span>
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

            {/* Filter by Venue */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500 hidden lg:inline">Venue:</span>
              <select
                className="h-10 rounded-xl border border-slate-200 px-3 bg-slate-50 hover:bg-white focus:bg-white text-xs font-semibold text-slate-800 cursor-pointer transition"
                value={selectedVenue}
                onChange={(e) => handleVenueChange(e.target.value)}
              >
                <option value="ALL">All Venues ({availableVenues.length})</option>
                {availableVenues.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.city})
                  </option>
                ))}
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

        {hasActiveFilters && (
          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>
              Showing <strong className="text-slate-800">{filteredShowtimes.length}</strong> of{" "}
              <strong>{showtimes.length}</strong> screenings
            </span>
            <span className="text-[11px] text-slate-400">
              {selectedState !== "ALL" && `State: ${selectedState} `}
              {selectedCity !== "ALL" && `• City: ${selectedCity} `}
              {selectedVenue !== "ALL" && `• Venue Filtered `}
              {searchQuery && `• Search: "${searchQuery}"`}
            </span>
          </div>
        )}
      </div>

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
          <p className="text-xs text-slate-400">Try adjusting your search query, state, city, or venue filter.</p>
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
                  return (
                    <tr key={sh.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{sh.movie.title}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 font-medium">
                        <div>{sh.venue.name}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <span>{sh.venue.city}</span>
                          {venueState !== "Other" && (
                            <>
                              <span>•</span>
                              <span className="text-[#7B1E3D] font-medium">{venueState}</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-800 font-semibold">
                        {sh.screen.name}
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant="outline" className="text-[10px] font-semibold bg-slate-50 text-slate-700">
                          {sh.movie.language} • {sh.movie.certificate}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">
                          {new Date(sh.starts_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {new Date(sh.starts_at).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
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
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 transition"
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

      {/* Seat Block & Hold Management Modal (Spec Section 5) */}
      {selectedShowtimeForSeats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                  <Layers className="w-5 h-5 text-[#7B1E3D]" />
                  Auditorium Capacity & Seat Block Control
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
                <div className="py-16 text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-[#7B1E3D] mx-auto mb-2" />
                  <p className="text-xs text-slate-500">Querying live seat availability from cinema engine...</p>
                </div>
              ) : seatsData ? (
                <>
                  {/* Status Pills */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                      <div className="text-xs font-semibold text-emerald-700">Available</div>
                      <div className="text-xl font-black text-emerald-900">{seatsData.showtime.available_count}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-100 border border-slate-300 text-center">
                      <div className="text-xs font-semibold text-slate-700">Booked</div>
                      <div className="text-xl font-black text-slate-900">{seatsData.showtime.booked_count}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-center">
                      <div className="text-xs font-semibold text-amber-700">Blocked / VIP Hold</div>
                      <div className="text-xl font-black text-amber-900">{seatsData.showtime.blocked_count}</div>
                    </div>
                  </div>

                  {actionSuccessMsg && (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600" />
                      {actionSuccessMsg}
                    </div>
                  )}

                  {/* Seat Grid */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-700">
                        Select Seats ({selectedSeatIds.length} selected)
                      </span>
                      <span className="text-[11px] text-slate-400">Click a seat to toggle selection</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 max-h-64 overflow-y-auto">
                      {seatsData.seats.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-6">No individual seat positions mapped for this auditorium.</p>
                      ) : (
                        <div className="grid grid-cols-6 sm:grid-cols-10 gap-2">
                          {seatsData.seats.map((seat) => {
                            const isSelected = selectedSeatIds.includes(seat.id);
                            const isBooked = seat.status === "BOOKED" || seat.status === "LOCKED";
                            const isBlocked = seat.status === "BLOCKED";

                            return (
                              <button
                                key={seat.id}
                                type="button"
                                disabled={isBooked}
                                onClick={() => handleToggleSeatSelect(seat.id)}
                                title={`${seat.code} (${seat.status}) ${seat.blocked_reason ? `- ${seat.blocked_reason}` : ""}`}
                                className={`h-8 rounded-lg text-xs font-bold transition flex items-center justify-center border ${
                                  isSelected
                                    ? "bg-[#7B1E3D] text-white border-[#7B1E3D] shadow-xs"
                                    : isBooked
                                    ? "bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed"
                                    : isBlocked
                                    ? "bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200"
                                    : "bg-white text-slate-700 border-slate-200 hover:border-[#7B1E3D]"
                                }`}
                              >
                                {seat.code}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Controls */}
                  <div className="pt-2 border-t border-slate-100 space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-700 shrink-0">Reason:</span>
                      <select
                        value={blockReason}
                        onChange={(e) => setBlockReason(e.target.value)}
                        className="h-9 rounded-xl border border-slate-200 px-3 bg-white text-xs font-medium text-slate-800 flex-1"
                      >
                        <option value="VIP Hold">VIP / Partner Hold</option>
                        <option value="Broken Armrest / Seat Damage">Broken Armrest / Seat Damage</option>
                        <option value="Sound / Projection Maintenance">Auditorium Maintenance</option>
                        <option value="Executive Reservation">Executive Reservation</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-end gap-2.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={selectedSeatIds.length === 0 || actionLoading}
                        onClick={() => handleSeatAction("UNBLOCK")}
                        className="h-9 text-xs rounded-xl gap-1 text-slate-700 hover:bg-slate-100"
                      >
                        <Unlock className="w-3.5 h-3.5" />
                        Unblock Selected
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        disabled={selectedSeatIds.length === 0 || actionLoading}
                        onClick={() => handleSeatAction("BLOCK")}
                        className="h-9 text-xs rounded-xl gap-1 bg-[#7B1E3D] hover:bg-[#601730] text-white"
                      >
                        {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                        Block Selected ({selectedSeatIds.length})
                      </Button>
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
