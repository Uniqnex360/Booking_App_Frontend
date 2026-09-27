import React, { useState, useMemo } from "react";
import { Search, X, Crosshair, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { detectCity } from "@/utils/geolocation";

export interface CitySelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCity: string;
  onSelectCity: (cityId: string) => void;
}

interface CityData {
  id: string;
  name: string;
  icon: string;
  selectedIcon: string;
  aliases: string[];
  lat: number;
  lng: number;
}

const CITIES: CityData[] = [
  {
    id: "Bangalore",
    name: "Bengaluru",
    icon: "/cities/bang.png",
    selectedIcon: "/cities/bang-selected.png",
    aliases: ["bangalore", "bengaluru", "blr", "karnataka"],
    lat: 12.9716,
    lng: 77.5946,
  },
  {
    id: "Chennai",
    name: "Chennai",
    icon: "/cities/chen.png",
    selectedIcon: "/cities/chen-selected.png",
    aliases: ["chennai", "madras", "maa", "tamil nadu"],
    lat: 13.0827,
    lng: 80.2707,
  },
  {
    id: "Kochi",
    name: "Kochi",
    icon: "/cities/koch.png",
    selectedIcon: "/cities/koch-selected.png",
    aliases: ["kochi", "cochin", "cok", "ernakulam", "kerala"],
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

  // Filter cities by search query
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

  if (!isOpen) return null;

  const handleSelect = (cityId: string) => {
    onSelectCity(cityId);
    onClose();
  };

  const handleDetectLocation = async () => {
    setDetecting(true);
    try {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;

            // Find closest supported city using Euclidean distance
            let closest = CITIES[0];
            let minDistance = Infinity;

            for (const c of CITIES) {
              const d = Math.hypot(c.lat - userLat, c.lng - userLng);
              if (d < minDistance) {
                minDistance = d;
                closest = c;
              }
            }

            setDetecting(false);
            onSelectCity(closest.id);
            toast.success(`Location detected: ${closest.name}`);
            onClose();
          },
          async () => {
            // Geolocation permission denied or failed, fallback to IP detection
            const ipCity = await detectCity();
            setDetecting(false);
            if (ipCity) {
              const matched = CITIES.find(
                (c) => c.id.toLowerCase() === ipCity.toLowerCase()
              );
              if (matched) {
                onSelectCity(matched.id);
                toast.success(`Location detected: ${matched.name}`);
                onClose();
                return;
              }
            }
            toast.info("Please select your city from the list.");
          },
          { timeout: 7000 }
        );
      } else {
        const ipCity = await detectCity();
        setDetecting(false);
        if (ipCity) {
          const matched = CITIES.find(
            (c) => c.id.toLowerCase() === ipCity.toLowerCase()
          );
          if (matched) {
            onSelectCity(matched.id);
            toast.success(`Location detected: ${matched.name}`);
            onClose();
            return;
          }
        }
        toast.info("Please select your city from the list.");
      }
    } catch {
      setDetecting(false);
      toast.error("Could not detect location. Please select manually.");
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-[2px] transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-[640px] bg-white rounded-lg shadow-2xl overflow-hidden p-6 sm:p-8 z-10 animate-in zoom-in-95 duration-200">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 p-1.5 rounded-full hover:bg-gray-100 transition"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Search input */}
        <div className="relative flex items-center border border-gray-300 rounded-md px-3.5 py-2.5 bg-white focus-within:border-gray-500 transition-colors">
          <Search className="w-4 h-4 text-gray-400 shrink-0 mr-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for your city"
            autoFocus
            className="w-full text-sm text-gray-800 placeholder:text-gray-400 outline-none bg-transparent"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Detect my location button */}
        <div className="mt-3.5 mb-5 flex items-center">
          <button
            type="button"
            onClick={handleDetectLocation}
            disabled={detecting}
            className="flex items-center gap-2 text-[#F84464] hover:text-[#d63351] text-xs sm:text-sm font-medium transition-colors cursor-pointer group"
          >
            {detecting ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#F84464]" />
            ) : (
              <Crosshair className="w-4 h-4 text-[#F84464] group-hover:scale-110 transition-transform" />
            )}
            <span>{detecting ? "Detecting location..." : "Detect my location"}</span>
          </button>
        </div>

        {/* Section title */}
        <div className="text-center my-6">
          <span className="text-xs sm:text-sm font-medium text-gray-700 tracking-wide">
            Popular Cities
          </span>
        </div>

        {/* City Icons List */}
        {filteredCities.length > 0 ? (
          <div className="flex items-center justify-center gap-8 sm:gap-14 flex-wrap py-2">
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
                  <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center p-1 transition-transform duration-200 group-hover:scale-105">
                    <img
                      src={isSelected ? c.selectedIcon : c.icon}
                      alt={c.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <span
                    className={`text-xs sm:text-sm mt-2.5 transition-colors ${
                      isSelected
                        ? "text-[#F84464] font-bold"
                        : "text-gray-700 group-hover:text-[#F84464] font-medium"
                    }`}
                  >
                    {c.name}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-gray-500">
            No cities found matching &quot;{searchQuery}&quot;
          </div>
        )}

        {/* View All Cities button */}
        <div className="text-center mt-8">
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="text-xs font-semibold text-[#F84464] hover:underline cursor-pointer"
          >
            View All Cities
          </button>
        </div>
      </div>
    </div>
  );
}
