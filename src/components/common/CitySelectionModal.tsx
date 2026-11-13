import React, { useState, useMemo, useEffect } from "react";
import { Search, X, Crosshair, Loader2, MapPin, Check } from "lucide-react";
import { toast } from "sonner";
import {
  detectUserLocation,
  getLastDetectedLocality,
  searchPlaceGlobally,
  DynamicPlaceSearchResult,
  SupportedCityId,
} from "@/utils/geolocation";

export interface CitySelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCity: string;
  onSelectCity: (cityId: string) => void;
}

interface CityData {
  id: SupportedCityId;
  name: string;
  icon: string;
  selectedIcon: string;
  aliases: string[];
  lat: number;
  lng: number;
}

/**
 * Primary exhibition hubs.
 * Sub-towns and districts are resolved dynamically on demand via administrative boundaries and geometry.
 */
const CITIES: CityData[] = [
  {
    id: "Bangalore",
    name: "Bengaluru",
    icon: "/cities/bang.png",
    selectedIcon: "/cities/bang-selected.png",
    aliases: ["bangalore", "bengaluru", "blr"],
    lat: 12.9716,
    lng: 77.5946,
  },
  {
    id: "Chennai",
    name: "Chennai",
    icon: "/cities/chen.png",
    selectedIcon: "/cities/chen-selected.png",
    aliases: ["chennai", "madras", "maa"],
    lat: 13.0827,
    lng: 80.2707,
  },
  {
    id: "Kochi",
    name: "Kochi",
    icon: "/cities/koch.png",
    selectedIcon: "/cities/koch-selected.png",
    aliases: ["kochi", "cochin", "cok", "ernakulam"],
    lat: 9.9312,
    lng: 76.2673,
  },
];

export function CitySelectionModal({
  isOpen,
  onClose,
  currentCity,
  onSelectCity,
}: CitySelectionModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [detecting, setDetecting] = useState(false);
  const [dynamicPlace, setDynamicPlace] = useState<DynamicPlaceSearchResult | null>(null);
  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Filter primary cities by search query
  const filteredCities = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return CITIES;
    return CITIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        c.aliases.some((a) => a.includes(q))
    );
  }, [searchQuery]);

  // When no primary city matches, dynamically geocode ANY searched town or locality
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 3 || filteredCities.length > 0) {
      setDynamicPlace(null);
      setIsSearchingGlobal(false);
      return;
    }

    let active = true;
    const timer = setTimeout(async () => {
      setIsSearchingGlobal(true);
      try {
        const place = await searchPlaceGlobally(q);
        if (active) {
          setDynamicPlace(place);
        }
      } catch {
        if (active) setDynamicPlace(null);
      } finally {
        if (active) setIsSearchingGlobal(false);
      }
    }, 350);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [searchQuery, filteredCities.length]);

  if (!isOpen) return null;

  const handleSelect = (cityId: string, customLocalityName?: string) => {
    if (customLocalityName) {
      try {
        sessionStorage.setItem("vybhz_detected_locality", customLocalityName);
      } catch {}
    }
    onSelectCity(cityId);
    onClose();
  };

  const handleDetectLocation = async () => {
    setDetecting(true);
    try {
      const detectedCityId = await detectUserLocation();
      setDetecting(false);
      if (detectedCityId) {
        const matched = CITIES.find(
          (c) => c.id.toLowerCase() === detectedCityId.toLowerCase()
        );
        const displayName = matched ? matched.name : detectedCityId;
        const locality = getLastDetectedLocality();
        const toastMsg =
          locality && locality.toLowerCase() !== displayName.toLowerCase()
            ? `Location detected: ${locality} (Region: ${displayName})`
            : `Location detected: ${displayName}`;

        onSelectCity(detectedCityId);
        toast.success(toastMsg);
        onClose();
        return;
      }
      toast.info("Please select your city from the list.");
    } catch {
      setDetecting(false);
      toast.error("Could not detect location. Please select manually.");
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-start justify-center pt-[72px] sm:pt-[84px] px-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-[1px] transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Card - BookMyShow Standard Layout */}
      <div className="relative w-full max-w-[840px] bg-white rounded-md shadow-2xl p-5 sm:px-8 sm:py-5 z-10 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Search Input Bar */}
        <div className="relative flex items-center border border-gray-300 rounded px-3.5 py-2.5 bg-white focus-within:border-gray-400 transition-colors">
          <Search className="w-4 h-4 text-gray-400 shrink-0 mr-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for your city or town"
            autoFocus
            className="w-full text-sm text-gray-800 placeholder:text-gray-400 outline-none bg-transparent"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="text-gray-400 hover:text-gray-600 p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Detect My Location */}
        <div className="mt-2.5 mb-4 flex items-center">
          <button
            type="button"
            onClick={handleDetectLocation}
            disabled={detecting}
            className="flex items-center gap-1.5 text-[#7B1E3D] hover:text-[#5C0F2A] text-xs sm:text-[13px] font-medium transition-colors cursor-pointer group"
          >
            {detecting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#7B1E3D]" />
            ) : (
              <Crosshair className="w-3.5 h-3.5 text-[#7B1E3D] group-hover:scale-110 transition-transform" />
            )}
            <span>{detecting ? "Detecting location..." : "Detect my location"}</span>
          </button>
        </div>

        {/* Dynamic Global Place Match (if user searched any town or village) */}
        {dynamicPlace && (
          <div className="mb-4 p-3 bg-red-50/50 border border-[#7B1E3D]/20 rounded-lg flex items-center justify-between gap-3 animate-in fade-in duration-150">
            <div className="flex items-center gap-2.5 min-w-0">
              <MapPin className="w-4 h-4 text-[#7B1E3D] shrink-0" />
              <div className="truncate">
                <span className="text-xs sm:text-sm font-bold text-gray-900">{dynamicPlace.name}</span>
                {dynamicPlace.state && (
                  <span className="text-xs text-gray-500 ml-1.5 font-normal">({dynamicPlace.state})</span>
                )}
                <p className="text-[11px] text-gray-600">
                  Covered under <strong className="text-[#7B1E3D]">{CITIES.find(c => c.id === dynamicPlace.regionalHub)?.name || dynamicPlace.regionalHub}</strong> cinema region
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleSelect(dynamicPlace.regionalHub, dynamicPlace.name)}
              className="shrink-0 bg-[#7B1E3D] hover:bg-[#5C0F2A] text-white text-xs font-semibold px-3 py-1.5 rounded transition shadow-xs cursor-pointer"
            >
              Select
            </button>
          </div>
        )}

        {isSearchingGlobal && (
          <div className="mb-3 flex items-center justify-center gap-2 text-xs text-gray-400 py-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Searching across India...</span>
          </div>
        )}

        {/* Section Title */}
        <div className="text-center my-3">
          <span className="text-xs text-gray-600 font-medium tracking-wide">
            Popular Cities
          </span>
        </div>

        {/* Popular Cities Row */}
        {filteredCities.length > 0 ? (
          <div className="flex items-center justify-center gap-10 sm:gap-16 py-2">
            {filteredCities.map((c) => {
              const isSelected =
                currentCity.toLowerCase() === c.id.toLowerCase() ||
                currentCity.toLowerCase() === c.name.toLowerCase();

              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleSelect(c.id)}
                  className="flex flex-col items-center group cursor-pointer focus:outline-none transition-transform"
                >
                  <div className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center transition-transform duration-150 group-hover:scale-105">
                    <img
                      src={isSelected ? c.selectedIcon : c.icon}
                      alt={c.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <span
                    className={`text-[11px] sm:text-xs mt-1.5 transition-colors ${
                      isSelected
                        ? "text-[#7B1E3D] font-bold"
                        : "text-gray-700 group-hover:text-[#7B1E3D] font-medium"
                    }`}
                  >
                    {c.name}
                  </span>
                </button>
              );
            })}
          </div>
        ) : !dynamicPlace && !isSearchingGlobal ? (
          <div className="py-6 text-center text-xs text-gray-500">
            No cities found matching &quot;{searchQuery}&quot;
          </div>
        ) : null}
      </div>
    </div>
  );
}
