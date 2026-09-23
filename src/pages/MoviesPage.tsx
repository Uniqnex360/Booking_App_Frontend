import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Loader } from "@/components/common/Loader";
import { api, unwrap } from "@/api/client";
import {
  ChevronDown,
  ChevronUp,
  MapPin,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Star,
  X,
} from "lucide-react";
import { detectCity, SUPPORTED_CITIES } from "@/utils/geolocation";
import { withCity } from "@/lib/cityLink";

interface MovieItem {
  id: string;
  title: string;
  language: string;
  duration_min: number;
  certificate: string;
  poster_url: string | null;
  genre?: string;
  rating?: number;
  votes_count?: number;
}

function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

export default function MoviesPage() {
  const navigate = useNavigate();
  const [movies, setMovies] = useState<MovieItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();

  const city = searchParams.get("city") || "Kochi";
  const search = searchParams.get("search") || "";

  // Filter states
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Accordion collapse state
  const [openSections, setOpenSections] = useState({
    languages: true,
    genres: true,
  });

  const toggleSection = (section: "languages" | "genres") => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const setCity = (next: string) => {
    const p = new URLSearchParams(searchParams);
    p.set("city", next);
    setSearchParams(p);
  };

  const setSearch = (next: string) => {
    const p = new URLSearchParams(searchParams);
    if (next) p.set("search", next);
    else p.delete("search");
    setSearchParams(p);
  };

  useEffect(() => {
    if (searchParams.get("city")) return;
    detectCity().then((c) => {
      if (c) setCity(c);
    });
  }, []);

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        setLoading(true);
        const today = new Date().toISOString().split("T")[0];
        const data = await unwrap<MovieItem[]>(
          api.get(`/movies`, { params: { city, date: today } })
        );
        setMovies(data);
      } catch (err) {
        console.error("Failed to load movies", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMovies();
  }, [city]);

  // Derive unique languages and genres for filter lists
  const availableLanguages = useMemo(() => {
    return Array.from(new Set(movies.map((m) => m.language))).filter(Boolean);
  }, [movies]);

  const availableGenres = useMemo(() => {
    const set = new Set<string>();
    movies.forEach((m) => {
      if (m.genre) {
        m.genre.split(",").forEach((g) => set.add(g.trim()));
      }
    });
    return Array.from(set).sort();
  }, [movies]);

  // Filter logic
  const filteredMovies = useMemo(() => {
    return movies.filter((m) => {
      // Search
      if (search && !m.title.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      // Languages
      if (
        selectedLanguages.length > 0 &&
        !selectedLanguages.includes(m.language)
      ) {
        return false;
      }
      // Genres
      if (selectedGenres.length > 0) {
        const movieGenres = m.genre?.split(",").map((g) => g.trim()) || [];
        const hasMatchingGenre = selectedGenres.some((g) =>
          movieGenres.includes(g)
        );
        if (!hasMatchingGenre) return false;
      }
      return true;
    });
  }, [movies, search, selectedLanguages, selectedGenres]);

  const toggleLanguageFilter = (lang: string) => {
    setSelectedLanguages((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
    );
  };

  const toggleGenreFilter = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  const clearAllFilters = () => {
    setSelectedLanguages([]);
    setSelectedGenres([]);
    setSearch("");
  };

  const hasActiveFilters =
    selectedLanguages.length > 0 || selectedGenres.length > 0 || search !== "";

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#333333] flex flex-col font-sans">
      <Header />

      <main className="flex-grow max-w-[1240px] w-full mx-auto px-4 pt-20 lg:pt-[88px] pb-16">
        {/* ─── Top Filter / Subheader Strip ─── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-4 mb-4 border-b border-gray-200">
          <div>
            <h1 className="text-2xl font-bold text-[#1A1A2E] tracking-tight">
              Movies in {city}
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Explore upcoming & currently running movies in your cinemas
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search for Movies..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-white border border-gray-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:border-[#F84464] focus:ring-1 focus:ring-[#F84464]/30"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* City Selector */}
            <div className="relative">
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="bg-white border border-gray-200 text-gray-700 font-medium rounded-lg py-2 pl-3 pr-8 text-xs sm:text-sm focus:outline-none focus:border-[#F84464] appearance-none cursor-pointer"
              >
                {SUPPORTED_CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500 pointer-events-none" />
            </div>

            {/* Mobile Filter Toggle */}
            <button
              onClick={() => setIsMobileFilterOpen(true)}
              className="lg:hidden flex items-center gap-1.5 bg-white border border-gray-200 px-3 py-2 rounded-lg text-xs font-semibold text-gray-700 shadow-sm"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-[#F84464]" />
              Filters
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-[#F84464]" />
              )}
            </button>
          </div>
        </div>

        {/* ─── Main Content Container (Sidebar + Grid) ─── */}
        <div className="flex gap-8 items-start">
          {/* ─── Left Filters Sidebar (Desktop) ─── */}
          <aside className="hidden lg:block w-[240px] shrink-0 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-bold text-[#1A1A2E]">Filters</h2>
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="text-xs text-[#F84464] font-medium flex items-center gap-1 hover:underline"
                >
                  <RotateCcw className="h-3 w-3" />
                  Clear All
                </button>
              )}
            </div>

            {/* Languages Accordion */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
              <button
                onClick={() => toggleSection("languages")}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50 transition"
              >
                <span className="flex items-center gap-2">
                  <ChevronDown
                    className={`h-4 w-4 text-[#F84464] transition-transform duration-200 ${
                      openSections.languages ? "rotate-0" : "-rotate-90"
                    }`}
                  />
                  Languages
                </span>
                {selectedLanguages.length > 0 && (
                  <span className="text-[11px] font-bold text-[#F84464] bg-[#F84464]/10 px-2 py-0.5 rounded-full">
                    {selectedLanguages.length}
                  </span>
                )}
              </button>

              {openSections.languages && (
                <div className="px-4 pb-4 pt-1 flex flex-wrap gap-2">
                  {availableLanguages.map((lang) => {
                    const isSelected = selectedLanguages.includes(lang);
                    return (
                      <button
                        key={lang}
                        onClick={() => toggleLanguageFilter(lang)}
                        className={`text-xs px-3 py-1.5 rounded-md border transition ${
                          isSelected
                            ? "bg-[#F84464] border-[#F84464] text-white font-medium"
                            : "bg-white border-gray-200 text-gray-700 hover:border-[#F84464] hover:text-[#F84464]"
                        }`}
                      >
                        {lang}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Genres Accordion */}
            {availableGenres.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                <button
                  onClick={() => toggleSection("genres")}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50 transition"
                >
                  <span className="flex items-center gap-2">
                    <ChevronDown
                      className={`h-4 w-4 text-[#F84464] transition-transform duration-200 ${
                        openSections.genres ? "rotate-0" : "-rotate-90"
                      }`}
                    />
                    Genres
                  </span>
                  {selectedGenres.length > 0 && (
                    <span className="text-[11px] font-bold text-[#F84464] bg-[#F84464]/10 px-2 py-0.5 rounded-full">
                      {selectedGenres.length}
                    </span>
                  )}
                </button>

                {openSections.genres && (
                  <div className="px-4 pb-4 pt-1 flex flex-wrap gap-2">
                    {availableGenres.map((g) => {
                      const isSelected = selectedGenres.includes(g);
                      return (
                        <button
                          key={g}
                          onClick={() => toggleGenreFilter(g)}
                          className={`text-xs px-3 py-1.5 rounded-md border transition ${
                            isSelected
                              ? "bg-[#F84464] border-[#F84464] text-white font-medium"
                              : "bg-white border-gray-200 text-gray-700 hover:border-[#F84464] hover:text-[#F84464]"
                          }`}
                        >
                          {g}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </aside>

          {/* ─── Right Movie Grid Section ─── */}
          <div className="flex-1 min-w-0">
            {/* Quick Horizontal Language Filter Bar (BMS Style) */}
            <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-4 scrollbar-none">
              <button
                onClick={() => setSelectedLanguages([])}
                className={`shrink-0 text-xs px-3.5 py-1.5 rounded-full font-medium transition ${
                  selectedLanguages.length === 0
                    ? "bg-[#F84464] text-white"
                    : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
                }`}
              >
                All
              </button>
              {availableLanguages.map((lang) => {
                const isSelected = selectedLanguages.includes(lang);
                return (
                  <button
                    key={lang}
                    onClick={() => toggleLanguageFilter(lang)}
                    className={`shrink-0 text-xs px-3.5 py-1.5 rounded-full font-medium transition ${
                      isSelected
                        ? "bg-[#F84464] text-white shadow-sm"
                        : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {lang}
                  </button>
                );
              })}
            </div>

            {/* Movies List */}
            {loading ? (
              <div className="flex justify-center items-center py-28">
                <Loader />
              </div>
            ) : filteredMovies.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <MapPin className="h-10 w-10 mx-auto text-gray-300 mb-3" />
                <h3 className="text-base font-bold text-gray-800">
                  No Movies Found
                </h3>
                <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                  We couldn't find any movies matching your active search or
                  filter criteria in {city}.
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={clearAllFilters}
                    className="mt-4 bg-[#F84464] text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-[#d83552] transition"
                  >
                    Reset All Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {filteredMovies.map((movie) => (
                  <div
                    key={movie.id}
                    onClick={() => navigate(withCity(`/movies/${movie.id}`, city))}
                    className="group cursor-pointer flex flex-col"
                  >
                    {/* Poster Card */}
                    <div className="aspect-[2/3] w-full bg-gray-200 rounded-lg overflow-hidden relative shadow-sm group-hover:shadow-md transition duration-200">
                      {movie.poster_url ? (
                        <img
                          src={movie.poster_url}
                          alt={movie.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300 ease-out"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                          No Poster
                        </div>
                      )}

                      {/* BMS Bottom Rating Bar Overlay */}
                      <div className="absolute bottom-0 inset-x-0 bg-black/80 px-2.5 py-1.5 flex items-center justify-between text-white text-[11px]">
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-[#F84464] fill-[#F84464]" />
                          <span className="font-bold">
                            {movie.rating ? `${movie.rating}/10` : "8.5/10"}
                          </span>
                        </div>
                        <span className="text-[10px] text-gray-300">
                          {movie.votes_count
                            ? `${(movie.votes_count / 1000).toFixed(1)}k votes`
                            : "1.2k votes"}
                        </span>
                      </div>
                    </div>

                    {/* Movie Info */}
                    <div className="pt-2.5 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="font-bold text-sm sm:text-base text-gray-900 line-clamp-1 group-hover:text-[#F84464] transition leading-snug">
                          {movie.title}
                        </h3>
                        <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5">
                          {movie.certificate} • {movie.language}
                        </p>
                        {movie.genre && (
                          <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1">
                            {movie.genre}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ─── Mobile Filters Drawer Modal ─── */}
      {isMobileFilterOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
          onClick={() => setIsMobileFilterOpen(false)}
        >
          <div
            className="bg-white w-full rounded-t-2xl max-h-[85vh] overflow-y-auto p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h3 className="font-bold text-base text-gray-900">Filters</h3>
              <button
                onClick={() => setIsMobileFilterOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="py-4 space-y-5">
              {/* Languages */}
              <div>
                <h4 className="text-xs font-bold text-gray-700 uppercase mb-2">
                  Languages
                </h4>
                <div className="flex flex-wrap gap-2">
                  {availableLanguages.map((lang) => {
                    const isSelected = selectedLanguages.includes(lang);
                    return (
                      <button
                        key={lang}
                        onClick={() => toggleLanguageFilter(lang)}
                        className={`text-xs px-3 py-1.5 rounded-md border ${
                          isSelected
                            ? "bg-[#F84464] border-[#F84464] text-white"
                            : "bg-white border-gray-200 text-gray-700"
                        }`}
                      >
                        {lang}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Genres */}
              {availableGenres.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-gray-700 uppercase mb-2">
                    Genres
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {availableGenres.map((g) => {
                      const isSelected = selectedGenres.includes(g);
                      return (
                        <button
                          key={g}
                          onClick={() => toggleGenreFilter(g)}
                          className={`text-xs px-3 py-1.5 rounded-md border ${
                            isSelected
                              ? "bg-[#F84464] border-[#F84464] text-white"
                              : "bg-white border-gray-200 text-gray-700"
                          }`}
                        >
                          {g}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-gray-100 flex gap-3">
              <button
                onClick={clearAllFilters}
                className="flex-1 py-3 text-xs font-bold text-gray-700 border border-gray-300 rounded-lg"
              >
                Clear Filters
              </button>
              <button
                onClick={() => setIsMobileFilterOpen(false)}
                className="flex-1 py-3 text-xs font-bold text-white bg-[#F84464] rounded-lg shadow-sm"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}