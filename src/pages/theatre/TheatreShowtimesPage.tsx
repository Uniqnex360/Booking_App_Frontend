import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { getTheatreShowtimes, getTheatreVenues, TheatreShowtimeItem, TheatreVenueItem } from "@/api/theatre.api";
import { Calendar, Clock, Film, Building2, Loader2, Filter, Eye, ExternalLink, Search, X, RotateCcw } from "lucide-react";
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
                  <th className="py-3.5 px-4 text-right">Customer View</th>
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
                        <a
                          href={`/showtimes/${sh.id}/seat-map`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition"
                          title="View customer interactive seat layout & availability"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Seat Map</span>
                          <ExternalLink className="w-3 h-3 text-emerald-500" />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
