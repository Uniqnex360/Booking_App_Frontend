import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { getTheatreVenues, TheatreVenueItem } from "@/api/theatre.api";
import { Building2, MapPin, Film, Loader2, ArrowRight, Search, X, RotateCcw, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { INDIAN_STATES, getStateForCity, getCitiesForState } from "@/utils/indiaGeography";

export default function TheatreVenuesPage() {
  const [venues, setVenues] = useState<TheatreVenueItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search states
  const [searchName, setSearchName] = useState("");
  const [selectedState, setSelectedState] = useState("ALL");
  const [selectedCity, setSelectedCity] = useState("ALL");

  useEffect(() => {
    async function load() {
      try {
        const data = await getTheatreVenues();
        setVenues(data || []);
      } catch (err) {
        console.error("Venues fetch error", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleStateChange = (state: string) => {
    setSelectedState(state);
    setSelectedCity("ALL");
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

  const filteredVenues = useMemo(() => {
    return venues.filter((v) => {
      // 1. Search by name or address
      if (searchName.trim()) {
        const q = searchName.toLowerCase().trim();
        const matchesName = v.name?.toLowerCase().includes(q);
        const matchesAddress = v.address?.toLowerCase().includes(q);
        if (!matchesName && !matchesAddress) return false;
      }

      // 2. Filter by state
      if (selectedState !== "ALL") {
        const venueState = getStateForCity(v.city);
        if (venueState !== selectedState) return false;
      }

      // 3. Filter by city
      if (selectedCity !== "ALL") {
        if (v.city.toLowerCase() !== selectedCity.toLowerCase()) return false;
      }

      return true;
    });
  }, [venues, searchName, selectedState, selectedCity]);

  const hasActiveFilters = searchName.trim() !== "" || selectedState !== "ALL" || selectedCity !== "ALL";

  const venueStats = useMemo(() => {
    const statesSet = new Set<string>();
    const citiesSet = new Set<string>();
    let totalScreens = 0;

    filteredVenues.forEach((v) => {
      const st = getStateForCity(v.city);
      if (st && st !== "Other") statesSet.add(st);
      if (v.city) citiesSet.add(v.city);
      totalScreens += v.screen_count || 0;
    });

    return {
      statesCount: statesSet.size,
      screensCount: totalScreens,
      venuesCount: filteredVenues.length,
      citiesCount: citiesSet.size,
    };
  }, [filteredVenues]);

  const handleResetFilters = () => {
    setSearchName("");
    setSelectedState("ALL");
    setSelectedCity("ALL");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Assigned Cinema Multiplexes</h1>
          <p className="text-xs text-slate-500 mt-1">
            Locations where your brand operates screens, receives customer admissions, and generates box office receipts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-semibold px-3 py-1 bg-slate-50 text-slate-800">
            {filteredVenues.length} of {venues.length} {venues.length === 1 ? "Location" : "Locations"}
          </Badge>
        </div>
      </div>

      {/* TOP STATS TILES ("no of state and no of screen in theatre admin") */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-indigo-50/70 p-3.5 rounded-2xl border border-indigo-100 flex flex-col justify-between">
          <div className="text-[10px] uppercase font-bold text-indigo-700 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-indigo-600" /> States
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {venueStats.statesCount}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Operational territories
          </div>
        </div>

        <div className="bg-purple-50/70 p-3.5 rounded-2xl border border-purple-100 flex flex-col justify-between">
          <div className="text-[10px] uppercase font-bold text-purple-700 flex items-center gap-1">
            <Layers className="w-3 h-3 text-purple-600" /> Total Screens
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {venueStats.screensCount}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Operating screens
          </div>
        </div>

        <div className="bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-100 flex flex-col justify-between">
          <div className="text-[10px] uppercase font-bold text-emerald-700 flex items-center gap-1">
            <Building2 className="w-3 h-3 text-emerald-600" /> Multiplexes
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {venueStats.venuesCount}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Theatres assigned
          </div>
        </div>

        <div className="bg-blue-50/70 p-3.5 rounded-2xl border border-blue-100 flex flex-col justify-between">
          <div className="text-[10px] uppercase font-bold text-blue-700 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-blue-600" /> Active Cities
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {venueStats.citiesCount}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Urban centres
          </div>
        </div>
      </div>

      {/* Search and Filters Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search by Name */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              placeholder="Search theatre / multiplex by name..."
              className="pl-9 pr-9 h-10 rounded-xl bg-slate-50 border-slate-200 focus:bg-white text-xs font-medium"
            />
            {searchName && (
              <button
                type="button"
                onClick={() => setSearchName("")}
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
                {INDIAN_STATES.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by City */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500 hidden lg:inline">City:</span>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="h-10 rounded-xl border border-slate-200 px-3 bg-slate-50 hover:bg-white focus:bg-white text-xs font-semibold text-slate-800 cursor-pointer transition"
              >
                <option value="ALL">All Cities {selectedState !== "ALL" ? `in ${selectedState}` : ""}</option>
                {availableCities.map((city) => (
                  <option key={city} value={city}>
                    {city}
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
              Showing <strong className="text-slate-800">{filteredVenues.length}</strong> of{" "}
              <strong>{venues.length}</strong> multiplexes
            </span>
            <span className="text-[11px] text-slate-400">
              {selectedState !== "ALL" && `State: ${selectedState} `}
              {selectedCity !== "ALL" && `• City: ${selectedCity} `}
              {searchName && `• Name: "${searchName}"`}
            </span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-24 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#7B1E3D]" />
        </div>
      ) : venues.length === 0 ? (
        <div className="py-20 bg-white rounded-2xl border border-slate-200 text-center text-sm text-slate-400">
          No cinema venues assigned to this partner account. Please contact central administration.
        </div>
      ) : filteredVenues.length === 0 ? (
        <div className="py-16 bg-white rounded-2xl border border-slate-200 text-center space-y-3">
          <p className="text-sm font-semibold text-slate-700">No multiplexes match the selected filters.</p>
          <p className="text-xs text-slate-400">Try adjusting your search name, state, or city filter.</p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVenues.map((v) => {
            const venueState = getStateForCity(v.city);
            return (
              <div
                key={v.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between hover:shadow-md transition"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="p-2 rounded-xl bg-orange-50 text-orange-600">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      {venueState !== "Other" && (
                        <Badge variant="outline" className="text-[10px] font-semibold bg-slate-50 text-slate-700 border-slate-200">
                          {venueState}
                        </Badge>
                      )}
                      <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                        ONLINE
                      </Badge>
                    </div>
                  </div>

                  <h3 className="font-bold text-base text-slate-900 leading-snug">{v.name}</h3>

                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{v.address || v.city}</span>
                    <span className="text-slate-400">•</span>
                    <span className="font-semibold text-slate-700">{v.city}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1 font-semibold">
                    <Film className="w-3.5 h-3.5 text-slate-400" />
                    <span>{v.screen_count} Screens / Auditoriums</span>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Payment Model:</span>
                      <span className="font-semibold text-slate-900">
                        {v.customer_payment_model === "THEATRE_DIRECT"
                          ? "Model A (Theatre Direct)"
                          : "Model B (Vyhbz Escrow)"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-600">
                      <span>Commercial Terms:</span>
                      <span className="font-semibold text-[#7B1E3D]">
                        {v.rate_type === "PERCENTAGE" ? `${v.rate_value}%` : `₹${v.rate_value}/ticket`} ({v.commission_model})
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <Link
                    to={`/theatre/showtimes?venue_id=${v.id}`}
                    className="text-xs font-semibold text-[#7B1E3D] hover:underline flex items-center gap-1"
                  >
                    View Showtimes <ArrowRight className="w-3.5 h-3.5" />
                  </Link>

                  <Link
                    to={`/theatre/bookings?venue_id=${v.id}`}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-900"
                  >
                    Bookings
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
