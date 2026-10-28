import { useCallback, useEffect, useMemo, useState } from "react";
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
import { CitySelectionModal } from "@/components/common/CitySelectionModal";
import { withCity } from "@/lib/cityLink";

interface MovieItem {
  id: string;
  title: string;
  original_title?: string | null;
  language: string;
  duration_min: number;
  certificate: string;
  poster_url: string | null;
  genre?: string;
  release_date?: string | null;
  rating?: number;
  external_rating?: number;
  votes_count?: number;
  is_trending?: boolean;
  booking_velocity_score?: number;
}

const splitLangs = (s?: string) =>
  (s || "")
    .split(/[,/&]/)
    .map((l) => l.trim())
    .filter(Boolean);

const isReRelease = (movie: MovieItem): boolean => {
  const lowerTitle = movie.title.toLowerCase();
  if (lowerTitle.includes("re-release") || lowerTitle.includes("rerelease")) {
    return true;
  }
  if (movie.release_date) {
    const releaseYear = new Date(movie.release_date).getFullYear();
    const currentYear = new Date().getFullYear();
    if (currentYear - releaseYear >= 1) return true;
  }
  return false;
};

export default function MoviesPage() {
  const navigate = useNavigate();
  const [movies, setMovies] = useState<MovieItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbFacets, setDbFacets] = useState<{
    languages: { name: string; count: number }[];
    genres: { name: string; count: number }[];
    certificates: { name: string; count: number }[];
    release_types: { all: number; new: number; re_release: number };
  } | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const city = searchParams.get("city") || "Kochi";
  const search = searchParams.get("search") || "";

  // Filter states
  const [selectedTag, setSelectedTag] = useState<"all" | "new" | "re-release">("all");
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedCertificates, setSelectedCertificates] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<"popularity" | "rating" | "latest">("popularity");

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
  }, [selectedTag]);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [isCityModalOpen, setIsCityModalOpen] = useState(false);

  // Accordion collapse state
  const [openSections, setOpenSections] = useState({
    tags: true,
    languages: true,
    genres: true,
    certificates: true,
  });

  const toggleSection = (section: "tags" | "languages" | "genres" | "certificates") => {
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
    const fetchMoviesAndFilters = async () => {
      try {
        setLoading(true);
        // Fetch movies and dynamic database facets in parallel
        const [moviesData, filtersRes] = await Promise.allSettled([
          unwrap<MovieItem[]>(api.get(`/movies`, { params: { city, limit: 100, sort_by: sortBy } })),
          api.get(`/movies/filters`, { params: { city } }),
        ]);

        if (moviesData.status === "fulfilled") {
          setMovies(moviesData.value);
        }
        if (filtersRes.status === "fulfilled" && filtersRes.value.data) {
          const payload = filtersRes.value.data?.data || filtersRes.value.data;
          if (payload?.languages || payload?.genres) {
            setDbFacets(payload);
          }
        }
      } catch (err) {
        console.error("Failed to load movies or DB filters", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMoviesAndFilters();
  }, [city, sortBy]);

  // Matcher helpers for each filter dimension
  const matchesSearch = useCallback((m: MovieItem) => {
    if (!search) return true;
    const query = search.toLowerCase().trim();
    const matchesTitle = m.title.toLowerCase().includes(query);
    const matchesOrig = m.original_title ? m.original_title.toLowerCase().includes(query) : false;
    const matchesGenre = m.genre ? m.genre.toLowerCase().includes(query) : false;
    return matchesTitle || matchesOrig || matchesGenre;
  }, [search]);

  const matchesTag = useCallback((m: MovieItem) => {
    if (selectedTag === "all") return true;
    if (selectedTag === "new") return !isReRelease(m);
    if (selectedTag === "re-release") return isReRelease(m);
    return true;
  }, [selectedTag]);

  const matchesLanguage = useCallback((m: MovieItem) => {
    if (selectedLanguages.length === 0) return true;
    const langs = splitLangs(m.language);
    return langs.some((l) => selectedLanguages.includes(l));
  }, [selectedLanguages]);

  const matchesGenre = useCallback((m: MovieItem) => {
    if (selectedGenres.length === 0) return true;
    if (!m.genre) return false;
    const movieGenres = m.genre.split(/[,/&]/).map((g) => g.trim().toLowerCase());
    return selectedGenres.some((g) => movieGenres.includes(g.toLowerCase()));
  }, [selectedGenres]);

  const matchesCertificate = useCallback((m: MovieItem) => {
    if (selectedCertificates.length === 0) return true;
    const movieCert = m.certificate?.trim().toUpperCase();
    return Boolean(movieCert && selectedCertificates.includes(movieCert));
  }, [selectedCertificates]);

  // Dynamic Languages: candidate movies match Search, Tag, Genre, Certificate
  const dynamicLanguages = useMemo(() => {
    const counts = new Map<string, number>();
    movies.forEach((m) => {
      if (matchesSearch(m) && matchesTag(m) && matchesGenre(m) && matchesCertificate(m)) {
        splitLangs(m.language).forEach((l) => {
          counts.set(l, (counts.get(l) || 0) + 1);
        });
      }
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([lang, count]) => ({ lang, count }));
  }, [movies, matchesSearch, matchesTag, matchesGenre, matchesCertificate]);

  // Dynamic Genres: candidate movies match Search, Tag, Language, Certificate
  // e.g. selecting Malayalam narrows genres strictly to Malayalam movies!
  const dynamicGenres = useMemo(() => {
    const counts = new Map<string, number>();
    movies.forEach((m) => {
      if (matchesSearch(m) && matchesTag(m) && matchesLanguage(m) && matchesCertificate(m)) {
        if (m.genre) {
          m.genre.split(/[,/&]/).forEach((g) => {
            const clean = g.trim();
            if (clean) {
              const formatted = clean.charAt(0).toUpperCase() + clean.slice(1);
              counts.set(formatted, (counts.get(formatted) || 0) + 1);
            }
          });
        }
      }
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([genre, count]) => ({ genre, count }));
  }, [movies, matchesSearch, matchesTag, matchesLanguage, matchesCertificate]);

  // Dynamic Certificates: candidate movies match Search, Tag, Language, Genre
  const dynamicCertificates = useMemo(() => {
    const counts = new Map<string, number>();
    movies.forEach((m) => {
      if (matchesSearch(m) && matchesTag(m) && matchesLanguage(m) && matchesGenre(m)) {
        if (m.certificate) {
          const c = m.certificate.trim().toUpperCase();
          counts.set(c, (counts.get(c) || 0) + 1);
        }
      }
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([cert, count]) => ({ cert, count }));
  }, [movies, matchesSearch, matchesTag, matchesLanguage, matchesGenre]);

  // Dynamic Release Counts: candidate movies match Search, Language, Genre, Certificate
  const releaseCounts = useMemo(() => {
    let totalCount = 0;
    let newCount = 0;
    let reReleaseCount = 0;
    movies.forEach((m) => {
      if (matchesSearch(m) && matchesLanguage(m) && matchesGenre(m) && matchesCertificate(m)) {
        totalCount++;
        if (isReRelease(m)) reReleaseCount++;
        else newCount++;
      }
    });
    return { all: totalCount, new: newCount, reRelease: reReleaseCount };
  }, [movies, matchesSearch, matchesLanguage, matchesGenre, matchesCertificate]);

  // Auto-prune active genre filters that are no longer valid for the selected language
  useEffect(() => {
    if (selectedGenres.length > 0 && dynamicGenres.length > 0) {
      const validGenreNames = new Set(dynamicGenres.map((dg) => dg.genre.toLowerCase()));
      const validSelected = selectedGenres.filter((sg) => validGenreNames.has(sg.toLowerCase()));
      if (validSelected.length !== selectedGenres.length) {
        setSelectedGenres(validSelected);
      }
    }
  }, [dynamicGenres, selectedGenres]);

  // Auto-prune active certificate filters that are no longer valid
  useEffect(() => {
    if (selectedCertificates.length > 0 && dynamicCertificates.length > 0) {
      const validCertNames = new Set(dynamicCertificates.map((dc) => dc.cert));
      const validSelected = selectedCertificates.filter((sc) => validCertNames.has(sc));
      if (validSelected.length !== selectedCertificates.length) {
        setSelectedCertificates(validSelected);
      }
    }
  }, [dynamicCertificates, selectedCertificates]);

  // Filter logic (applies all dimensions to the final grid)
  const filteredMovies = useMemo(() => {
    return movies.filter((m) =>
      matchesSearch(m) &&
      matchesTag(m) &&
      matchesLanguage(m) &&
      matchesGenre(m) &&
      matchesCertificate(m)
    );
  }, [movies, matchesSearch, matchesTag, matchesLanguage, matchesGenre, matchesCertificate]);

  const toggleLanguageFilter = (lang: string) => {
    setSelectedLanguages((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang],
    );
  };

  const toggleGenreFilter = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre],
    );
  };

  const toggleCertificateFilter = (cert: string) => {
    setSelectedCertificates((prev) =>
      prev.includes(cert) ? prev.filter((c) => c !== cert) : [...prev, cert],
    );
  };

  const clearAllFilters = () => {
    setSelectedTag("all");
    setSelectedLanguages([]);
    setSelectedGenres([]);
    setSelectedCertificates([]);
    setSearch("");
  };

  const hasActiveFilters =
    selectedTag !== "all" ||
    selectedLanguages.length > 0 ||
    selectedGenres.length > 0 ||
    selectedCertificates.length > 0 ||
    search !== "";

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#333333] flex flex-col font-sans">
      <Header />

      <main className="flex-grow max-w-[1240px] w-full mx-auto px-4 pt-28 lg:pt-[120px] pb-16">
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
                className="w-full pl-9 pr-8 py-2 bg-white border border-gray-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:border-[#7B1E3D] focus:ring-1 focus:ring-[#7B1E3D]/30"
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
            <button
              type="button"
              onClick={() => setIsCityModalOpen(true)}
              className="bg-white border border-gray-200 text-gray-700 font-medium rounded-lg py-2 px-3 text-xs sm:text-sm hover:border-[#7B1E3D] flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <span>{city?.toLowerCase() === "bangalore" || city?.toLowerCase() === "bengaluru" ? "Bengaluru" : city}</span>
              <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
            </button>

            {/* Mobile Filter Toggle */}
            <button
              onClick={() => setIsMobileFilterOpen(true)}
              className="lg:hidden flex items-center gap-1.5 bg-white border border-gray-200 px-3 py-2 rounded-lg text-xs font-semibold text-gray-700 shadow-sm"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-[#7B1E3D]" />
              Filters
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-[#7B1E3D]" />
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
                  className="text-xs text-[#7B1E3D] font-medium flex items-center gap-1 hover:underline"
                >
                  <RotateCcw className="h-3 w-3" />
                  Clear All
                </button>
              )}
            </div>

            {/* Release Tags Accordion (New Releases, Re-release) */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
              <button
                onClick={() => toggleSection("tags")}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50 transition"
              >
                <span className="flex items-center gap-2">
                  <ChevronDown
                    className={`h-4 w-4 text-[#7B1E3D] transition-transform duration-200 ${
                      openSections.tags ? "rotate-0" : "-rotate-90"
                    }`}
                  />
                  Release Type
                </span>
                {selectedTag !== "all" && (
                  <span className="text-[11px] font-bold text-[#7B1E3D] bg-[#7B1E3D]/10 px-2 py-0.5 rounded-full">
                    1
                  </span>
                )}
              </button>

              {openSections.tags && (
                <div className="px-4 pb-4 pt-1 flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedTag("all")}
                    className={`text-xs px-3 py-1.5 rounded-md border transition ${
                      selectedTag === "all"
                        ? "bg-[#7B1E3D] border-[#7B1E3D] text-white font-medium"
                        : "bg-white border-gray-200 text-gray-700 hover:border-[#7B1E3D] hover:text-[#7B1E3D]"
                    }`}
                  >
                    All Movies <span className="opacity-75 text-[10px]">({releaseCounts.all})</span>
                  </button>
                  <button
                    onClick={() => setSelectedTag(selectedTag === "new" ? "all" : "new")}
                    className={`text-xs px-3 py-1.5 rounded-md border transition ${
                      selectedTag === "new"
                        ? "bg-[#7B1E3D] border-[#7B1E3D] text-white font-medium"
                        : "bg-white border-gray-200 text-gray-700 hover:border-[#7B1E3D] hover:text-[#7B1E3D]"
                    }`}
                  >
                    New Releases <span className="opacity-75 text-[10px]">({releaseCounts.new})</span>
                  </button>
                  <button
                    onClick={() =>
                      setSelectedTag(selectedTag === "re-release" ? "all" : "re-release")
                    }
                    className={`text-xs px-3 py-1.5 rounded-md border transition ${
                      selectedTag === "re-release"
                        ? "bg-[#7B1E3D] border-[#7B1E3D] text-white font-medium"
                        : "bg-white border-gray-200 text-gray-700 hover:border-[#7B1E3D] hover:text-[#7B1E3D]"
                    }`}
                  >
                    Re-Release <span className="opacity-75 text-[10px]">({releaseCounts.reRelease})</span>
                  </button>
                </div>
              )}
            </div>

            {/* Languages Accordion */}
            {dynamicLanguages.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                <button
                  onClick={() => toggleSection("languages")}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50 transition"
                >
                  <span className="flex items-center gap-2">
                    <ChevronDown
                      className={`h-4 w-4 text-[#7B1E3D] transition-transform duration-200 ${
                        openSections.languages ? "rotate-0" : "-rotate-90"
                      }`}
                    />
                    Languages
                  </span>
                  {selectedLanguages.length > 0 && (
                    <span className="text-[11px] font-bold text-[#7B1E3D] bg-[#7B1E3D]/10 px-2 py-0.5 rounded-full">
                      {selectedLanguages.length}
                    </span>
                  )}
                </button>

                {openSections.languages && (
                  <div className="px-4 pb-4 pt-1 flex flex-wrap gap-2">
                    {dynamicLanguages.map(({ lang, count }) => {
                      const isSelected = selectedLanguages.includes(lang);
                      return (
                        <button
                          key={lang}
                          onClick={() => toggleLanguageFilter(lang)}
                          className={`text-xs px-2.5 py-1.5 rounded-md border transition flex items-center gap-1.5 ${
                            isSelected
                              ? "bg-[#7B1E3D] border-[#7B1E3D] text-white font-medium shadow-xs"
                              : "bg-white border-gray-200 text-gray-700 hover:border-[#7B1E3D] hover:text-[#7B1E3D]"
                          }`}
                        >
                          <span>{lang}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                              isSelected
                                ? "bg-white/20 text-white font-bold"
                                : "bg-gray-100 text-gray-500 font-medium"
                            }`}
                          >
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Genres Accordion */}
            {dynamicGenres.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                <button
                  onClick={() => toggleSection("genres")}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50 transition"
                >
                  <span className="flex items-center gap-2">
                    <ChevronDown
                      className={`h-4 w-4 text-[#7B1E3D] transition-transform duration-200 ${
                        openSections.genres ? "rotate-0" : "-rotate-90"
                      }`}
                    />
                    Genres
                  </span>
                  {selectedGenres.length > 0 && (
                    <span className="text-[11px] font-bold text-[#7B1E3D] bg-[#7B1E3D]/10 px-2 py-0.5 rounded-full">
                      {selectedGenres.length}
                    </span>
                  )}
                </button>

                {openSections.genres && (
                  <div className="px-4 pb-4 pt-1 flex flex-wrap gap-2">
                    {dynamicGenres.map(({ genre, count }) => {
                      const isSelected = selectedGenres.includes(genre);
                      return (
                        <button
                          key={genre}
                          onClick={() => toggleGenreFilter(genre)}
                          className={`text-xs px-2.5 py-1.5 rounded-md border transition flex items-center gap-1.5 ${
                            isSelected
                              ? "bg-[#7B1E3D] border-[#7B1E3D] text-white font-medium shadow-xs"
                              : "bg-white border-gray-200 text-gray-700 hover:border-[#7B1E3D] hover:text-[#7B1E3D]"
                          }`}
                        >
                          <span>{genre}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                              isSelected
                                ? "bg-white/20 text-white font-bold"
                                : "bg-gray-100 text-gray-500 font-medium"
                            }`}
                          >
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Certificate Accordion */}
            {dynamicCertificates.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                <button
                  onClick={() => toggleSection("certificates")}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50 transition"
                >
                  <span className="flex items-center gap-2">
                    <ChevronDown
                      className={`h-4 w-4 text-[#7B1E3D] transition-transform duration-200 ${
                        openSections.certificates ? "rotate-0" : "-rotate-90"
                      }`}
                    />
                    Certification
                  </span>
                  {selectedCertificates.length > 0 && (
                    <span className="text-[11px] font-bold text-[#7B1E3D] bg-[#7B1E3D]/10 px-2 py-0.5 rounded-full">
                      {selectedCertificates.length}
                    </span>
                  )}
                </button>

                {openSections.certificates && (
                  <div className="px-4 pb-4 pt-1 flex flex-wrap gap-2">
                    {dynamicCertificates.map(({ cert, count }) => {
                      const isSelected = selectedCertificates.includes(cert);
                      return (
                        <button
                          key={cert}
                          onClick={() => toggleCertificateFilter(cert)}
                          className={`text-xs px-2.5 py-1.5 rounded-md border transition flex items-center gap-1.5 ${
                            isSelected
                              ? "bg-[#7B1E3D] border-[#7B1E3D] text-white font-medium shadow-xs"
                              : "bg-white border-gray-200 text-gray-700 hover:border-[#7B1E3D] hover:text-[#7B1E3D]"
                          }`}
                        >
                          <span>{cert}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                              isSelected
                                ? "bg-white/20 text-white font-bold"
                                : "bg-gray-100 text-gray-500 font-medium"
                            }`}
                          >
                            {count}
                          </span>
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
            {/* ─── Direct Filter Strip for Mobile (Release Tags + Languages + Genres) ─── */}
            <div className="lg:hidden space-y-2.5 mb-5">
              {/* Release Type Tags */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                <span className="text-[11px] font-bold text-gray-400 uppercase shrink-0 mr-1">
                  Type:
                </span>
                <button
                  onClick={() => setSelectedTag("all")}
                  className={`shrink-0 text-xs px-3 py-1 rounded-full font-medium transition ${
                    selectedTag === "all"
                      ? "bg-[#7B1E3D] text-white shadow-sm font-semibold"
                      : "bg-white text-gray-700 border border-gray-200 hover:border-gray-300"
                  }`}
                >
                  All ({releaseCounts.all})
                </button>
                <button
                  onClick={() => setSelectedTag(selectedTag === "new" ? "all" : "new")}
                  className={`shrink-0 text-xs px-3 py-1 rounded-full font-medium transition ${
                    selectedTag === "new"
                      ? "bg-[#7B1E3D] text-white shadow-sm font-bold"
                      : "bg-white text-gray-700 border border-gray-200 hover:border-[#7B1E3D] hover:text-[#7B1E3D]"
                  }`}
                >
                  ✨ New ({releaseCounts.new})
                </button>
                <button
                  onClick={() =>
                    setSelectedTag(selectedTag === "re-release" ? "all" : "re-release")
                  }
                  className={`shrink-0 text-xs px-3 py-1 rounded-full font-medium transition ${
                    selectedTag === "re-release"
                      ? "bg-[#7B1E3D] text-white shadow-sm font-bold"
                      : "bg-white text-gray-700 border border-gray-200 hover:border-[#7B1E3D] hover:text-[#7B1E3D]"
                  }`}
                >
                  🔁 Re-Release ({releaseCounts.reRelease})
                </button>
              </div>

              {/* Discovery Sort By (BookMyShow Style) */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                <span className="text-[11px] font-bold text-gray-400 uppercase shrink-0 mr-1">
                  Sort:
                </span>
                <button
                  onClick={() => setSortBy("popularity")}
                  className={`shrink-0 text-xs px-2.5 py-1 rounded-full font-medium transition flex items-center gap-1 ${
                    sortBy === "popularity"
                      ? "bg-[#7B1E3D] text-white shadow-sm font-semibold"
                      : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <span>🔥</span>
                  <span>Popular in {city}</span>
                </button>
                <button
                  onClick={() => setSortBy("rating")}
                  className={`shrink-0 text-xs px-2.5 py-1 rounded-full font-medium transition flex items-center gap-1 ${
                    sortBy === "rating"
                      ? "bg-[#7B1E3D] text-white shadow-sm font-semibold"
                      : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <span>⭐</span>
                  <span>Top Rated</span>
                </button>
                <button
                  onClick={() => setSortBy("latest")}
                  className={`shrink-0 text-xs px-2.5 py-1 rounded-full font-medium transition flex items-center gap-1 ${
                    sortBy === "latest"
                      ? "bg-[#7B1E3D] text-white shadow-sm font-semibold"
                      : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <span>🕒</span>
                  <span>Release Date</span>
                </button>
              </div>

              {/* Languages Bar */}
              {dynamicLanguages.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  <span className="text-[11px] font-bold text-gray-400 uppercase shrink-0 mr-1">
                    Lang:
                  </span>
                  <button
                    onClick={() => setSelectedLanguages([])}
                    className={`shrink-0 text-xs px-2.5 py-1 rounded-full font-medium transition ${
                      selectedLanguages.length === 0
                        ? "bg-gray-900 text-white"
                        : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    All
                  </button>
                  {dynamicLanguages.map(({ lang, count }) => {
                    const isSelected = selectedLanguages.includes(lang);
                    return (
                      <button
                        key={lang}
                        onClick={() => toggleLanguageFilter(lang)}
                        className={`shrink-0 text-xs px-2.5 py-1 rounded-full font-medium transition flex items-center gap-1 ${
                          isSelected
                            ? "bg-[#7B1E3D] text-white shadow-sm font-semibold"
                            : "bg-white text-gray-600 border border-gray-200 hover:border-[#7B1E3D] hover:text-[#7B1E3D]"
                        }`}
                      >
                        <span>{lang}</span>
                        <span className={`text-[10px] px-1 py-0.2 rounded-full ${isSelected ? "bg-white/20" : "bg-gray-100 text-gray-400"}`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Dynamic Genres Bar */}
              {dynamicGenres.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none">
                  <span className="text-[11px] font-bold text-gray-400 uppercase shrink-0 mr-1">
                    Genre:
                  </span>
                  <button
                    onClick={() => setSelectedGenres([])}
                    className={`shrink-0 text-xs px-2.5 py-1 rounded-full font-medium transition ${
                      selectedGenres.length === 0
                        ? "bg-gray-900 text-white"
                        : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    All
                  </button>
                  {dynamicGenres.map(({ genre, count }) => {
                    const isSelected = selectedGenres.includes(genre);
                    return (
                      <button
                        key={genre}
                        onClick={() => toggleGenreFilter(genre)}
                        className={`shrink-0 text-xs px-2.5 py-1 rounded-full font-medium transition flex items-center gap-1 ${
                          isSelected
                            ? "bg-[#7B1E3D] text-white shadow-sm font-semibold"
                            : "bg-white text-gray-600 border border-gray-200 hover:border-[#7B1E3D] hover:text-[#7B1E3D]"
                        }`}
                      >
                        <span>{genre}</span>
                        <span className={`text-[10px] px-1 py-0.2 rounded-full ${isSelected ? "bg-white/20" : "bg-gray-100 text-gray-400"}`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Certification Bar */}
              {dynamicCertificates.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  <span className="text-[11px] font-bold text-gray-400 uppercase shrink-0 mr-1">
                    Cert:
                  </span>
                  <button
                    onClick={() => setSelectedCertificates([])}
                    className={`shrink-0 text-xs px-2.5 py-1 rounded-full font-medium transition ${
                      selectedCertificates.length === 0
                        ? "bg-gray-900 text-white"
                        : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    All
                  </button>
                  {dynamicCertificates.map(({ cert, count }) => {
                    const isSelected = selectedCertificates.includes(cert);
                    return (
                      <button
                        key={cert}
                        onClick={() => toggleCertificateFilter(cert)}
                        className={`shrink-0 text-xs px-2.5 py-1 rounded-full font-medium transition flex items-center gap-1 ${
                          isSelected
                            ? "bg-[#7B1E3D] text-white shadow-sm font-semibold"
                            : "bg-white text-gray-600 border border-gray-200 hover:border-[#7B1E3D] hover:text-[#7B1E3D]"
                        }`}
                      >
                        <span>{cert}</span>
                        <span className={`text-[10px] px-1 py-0.2 rounded-full ${isSelected ? "bg-white/20" : "bg-gray-100 text-gray-400"}`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
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
                    className="mt-4 bg-[#7B1E3D] text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-[#d83552] transition"
                  >
                    Reset All Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                {filteredMovies.map((movie) => (
                  <div
                    key={movie.id}
                    onClick={() =>
                      navigate(withCity(`/movies/${movie.id}`, city))
                    }
                    className="group cursor-pointer flex flex-col"
                  >
                    {/* Poster Card */}
                    <div className="aspect-[2/3] w-full bg-gray-200 rounded-lg overflow-hidden relative shadow-sm group-hover:shadow-md transition duration-200">
                      {movie.is_trending && (
                        <div className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-[#7B1E3D] text-white text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded shadow-md backdrop-blur-xs">
                          <span>🔥</span>
                          <span>Trending</span>
                        </div>
                      )}
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

                      {(movie.rating != null || movie.external_rating != null) && (
                        <div className="absolute bottom-0 inset-x-0 bg-black/80 px-2.5 py-1.5 flex items-center justify-between text-white text-[11px]">
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 text-[#7B1E3D] fill-[#7B1E3D]" />
                            <span className="font-bold">
                              {movie.rating != null
                                ? `${movie.rating}/10`
                                : `${movie.external_rating}/10`}
                            </span>
                            {movie.rating == null && movie.external_rating != null && (
                              <span className="text-[10px] text-gray-400">TMDB</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Movie Info */}
                    <div className="pt-2.5 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="font-bold text-sm sm:text-base text-gray-900 line-clamp-1 group-hover:text-[#7B1E3D] transition leading-snug">
                          {movie.title}
                        </h3>
                        <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
                          {movie.certificate?.toUpperCase() === "A" ? (
                            <span className="bg-red-50 text-red-600 border border-red-200 text-[10px] font-bold px-1.5 py-0.2 rounded">
                              A (18+)
                            </span>
                          ) : (
                            <span>{movie.certificate}</span>
                          )}
                          <span>•</span>
                          <span>{movie.language}</span>
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
              {/* Release Type (New Releases, Re-Release) */}
              <div>
                <h4 className="text-xs font-bold text-gray-700 uppercase mb-2">
                  Release Type
                </h4>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedTag("all")}
                    className={`text-xs px-3 py-1.5 rounded-md border flex items-center gap-1.5 ${
                      selectedTag === "all"
                        ? "bg-[#7B1E3D] border-[#7B1E3D] text-white font-medium"
                        : "bg-white border-gray-200 text-gray-700"
                    }`}
                  >
                    <span>All Movies</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${selectedTag === "all" ? "bg-white/20" : "bg-gray-100 text-gray-500"}`}>
                      {releaseCounts.all}
                    </span>
                  </button>
                  <button
                    onClick={() => setSelectedTag(selectedTag === "new" ? "all" : "new")}
                    className={`text-xs px-3 py-1.5 rounded-md border flex items-center gap-1.5 ${
                      selectedTag === "new"
                        ? "bg-[#7B1E3D] border-[#7B1E3D] text-white font-medium"
                        : "bg-white border-gray-200 text-gray-700"
                    }`}
                  >
                    <span>✨ New Releases</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${selectedTag === "new" ? "bg-white/20" : "bg-gray-100 text-gray-500"}`}>
                      {releaseCounts.new}
                    </span>
                  </button>
                  <button
                    onClick={() =>
                      setSelectedTag(selectedTag === "re-release" ? "all" : "re-release")
                    }
                    className={`text-xs px-3 py-1.5 rounded-md border flex items-center gap-1.5 ${
                      selectedTag === "re-release"
                        ? "bg-[#7B1E3D] border-[#7B1E3D] text-white font-medium"
                        : "bg-white border-gray-200 text-gray-700"
                    }`}
                  >
                    <span>🔁 Re-Release</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${selectedTag === "re-release" ? "bg-white/20" : "bg-gray-100 text-gray-500"}`}>
                      {releaseCounts.reRelease}
                    </span>
                  </button>
                </div>
              </div>

              {/* Dynamic Languages */}
              {dynamicLanguages.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-gray-700 uppercase mb-2">
                    Languages
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {dynamicLanguages.map(({ lang, count }) => {
                      const isSelected = selectedLanguages.includes(lang);
                      return (
                        <button
                          key={lang}
                          onClick={() => toggleLanguageFilter(lang)}
                          className={`text-xs px-3 py-1.5 rounded-md border flex items-center gap-1.5 ${
                            isSelected
                              ? "bg-[#7B1E3D] border-[#7B1E3D] text-white font-medium"
                              : "bg-white border-gray-200 text-gray-700"
                          }`}
                        >
                          <span>{lang}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isSelected ? "bg-white/20" : "bg-gray-100 text-gray-500"}`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Dynamic Genres */}
              {dynamicGenres.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-gray-700 uppercase mb-2">
                    Genres
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {dynamicGenres.map(({ genre, count }) => {
                      const isSelected = selectedGenres.includes(genre);
                      return (
                        <button
                          key={genre}
                          onClick={() => toggleGenreFilter(genre)}
                          className={`text-xs px-3 py-1.5 rounded-md border flex items-center gap-1.5 ${
                            isSelected
                              ? "bg-[#7B1E3D] border-[#7B1E3D] text-white font-medium"
                              : "bg-white border-gray-200 text-gray-700"
                          }`}
                        >
                          <span>{genre}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isSelected ? "bg-white/20" : "bg-gray-100 text-gray-500"}`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Dynamic Certification */}
              {dynamicCertificates.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-gray-700 uppercase mb-2">
                    Certification
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {dynamicCertificates.map(({ cert, count }) => {
                      const isSelected = selectedCertificates.includes(cert);
                      return (
                        <button
                          key={cert}
                          onClick={() => toggleCertificateFilter(cert)}
                          className={`text-xs px-3 py-1.5 rounded-md border flex items-center gap-1.5 ${
                            isSelected
                              ? "bg-[#7B1E3D] border-[#7B1E3D] text-white font-medium"
                              : "bg-white border-gray-200 text-gray-700"
                          }`}
                        >
                          <span>{cert}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isSelected ? "bg-white/20" : "bg-gray-100 text-gray-500"}`}>
                            {count}
                          </span>
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
                className="flex-1 py-3 text-xs font-bold text-white bg-[#7B1E3D] rounded-lg shadow-sm"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {!loading && <Footer />}
      <CitySelectionModal
        isOpen={isCityModalOpen}
        onClose={() => setIsCityModalOpen(false)}
        currentCity={city}
        onSelectCity={setCity}
      />
    </div>
  );
}
