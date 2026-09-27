import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, Loader2, Film, Calendar, ClipboardList } from "lucide-react";
import api, { unwrap } from "@/api/client";
import { withCity } from "@/lib/cityLink";

const RECENT_SEARCHES_STORAGE_KEY = "vyhbz_recent_searches";

export type SearchCategoryTab =
  | "All"
  | "Movies"
  | "STREAM"
  | "Events"
  | "Plays"
  | "Sports"
  | "Activities";

const TABS: SearchCategoryTab[] = [
  "All",
  "Movies",
  "STREAM",
  "Events",
  "Plays",
  "Sports",
  "Activities",
];

export interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  city: string;
  initialQuery?: string;
}

interface UnifiedItem {
  id: string;
  type: "movie" | "event";
  tabCategory: SearchCategoryTab;
  title: string;
  subtitle: string;
  image?: string;
  link: string;
}

export function GlobalSearchModal({
  isOpen,
  onClose,
  city,
  initialQuery = "",
}: GlobalSearchModalProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<SearchCategoryTab>("All");
  const [loading, setLoading] = useState(false);
  const [allItems, setAllItems] = useState<UnifiedItem[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Load recent searches from localStorage & focus input
  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery);
      try {
        const stored = localStorage.getItem(RECENT_SEARCHES_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setRecentSearches(
              parsed.filter((item): item is string => typeof item === "string")
            );
          }
        }
      } catch {
        // Ignore parse error
      }
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, initialQuery]);

  const saveRecentSearch = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed || trimmed.length < 2) return;
    setRecentSearches((prev) => {
      const next = [
        trimmed,
        ...prev.filter((s) => s.toLowerCase() !== trimmed.toLowerCase()),
      ].slice(0, 8);
      try {
        localStorage.setItem(
          RECENT_SEARCHES_STORAGE_KEY,
          JSON.stringify(next)
        );
      } catch {
        // Storage full or unavailable
      }
      return next;
    });
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(RECENT_SEARCHES_STORAGE_KEY);
    } catch {}
  };

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

  // Fetch movies and events data
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoading(true);

    const fetchData = async () => {
      try {
        const today = new Date().toISOString().split("T")[0];
        const [moviesRes, eventsRes] = await Promise.all([
          unwrap<any[]>(
            api.get("/movies", { params: { city, date: today } })
          ).catch(() => []),
          unwrap<any>(api.get("/events")).catch(() => []),
        ]);

        if (!isMounted) return;

        const rawEvents = Array.isArray(eventsRes)
          ? eventsRes
          : eventsRes.items || [];
        const unified: UnifiedItem[] = [];

        // Map Movies
        (moviesRes || []).forEach((m: any) => {
          const lang = m.languages?.join(", ") || m.language || "English";
          const genres = Array.isArray(m.genre) ? m.genre.join(", ") : m.genre || "";
          unified.push({
            id: m.id,
            type: "movie",
            tabCategory: "Movies",
            title: m.title,
            subtitle: `In Movies | ${lang}${genres ? " | " + genres : ""}`,
            image: m.poster_url || m.backdrop_url,
            link: withCity(`/movies/${m.id}`, city),
          });
        });

        // Map Events
        rawEvents.forEach((e: any) => {
          let tabCat: SearchCategoryTab = "Events";
          const catLower = (e.category || "").toLowerCase();
          if (catLower === "theatre" || catLower === "plays") {
            tabCat = "Plays";
          } else if (catLower === "sports") {
            tabCat = "Sports";
          } else if (catLower === "workshop" || catLower === "exhibition") {
            tabCat = "Activities";
          }

          const venue = e.venue_name ? `${e.venue_name}` : e.city || city;
          unified.push({
            id: e.id,
            type: "event",
            tabCategory: tabCat,
            title: e.title,
            subtitle: `In ${e.category || "Events"} | ${venue}`,
            image: e.poster_image_url,
            link: withCity(`/booking/event/${e.id}`, city),
          });
        });

        setAllItems(unified);
      } catch (err) {
        console.error("Failed to load search data", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, city]);

  // Filter items by search query and active tab (only when query is present)
  const filteredResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    return allItems.filter((item) => {
      if (activeTab === "STREAM") {
        if (item.tabCategory !== "Movies" && item.tabCategory !== "STREAM")
          return false;
      } else if (activeTab !== "All" && item.tabCategory !== activeTab) {
        return false;
      }

      return (
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q)
      );
    });
  }, [allItems, query, activeTab]);

  if (!isOpen) return null;

  const handleNavigate = (link: string) => {
    onClose();
    navigate(link);
  };

  const handleSelectRecent = (term: string) => {
    setQuery(term);
    saveRecentSearch(term);
    inputRef.current?.focus();
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && query.trim()) {
      saveRecentSearch(query.trim());
    }
  };

  const handleItemClick = (item: UnifiedItem) => {
    saveRecentSearch(query.trim() || item.title);
    handleNavigate(item.link);
  };

  const handleViewAll = () => {
    if (query.trim()) {
      saveRecentSearch(query.trim());
    }
    onClose();
    if (activeTab === "Movies") {
      navigate(withCity("/movies", city));
    } else if (
      activeTab === "Events" ||
      activeTab === "Plays" ||
      activeTab === "Sports"
    ) {
      navigate(withCity("/events", city));
    } else {
      navigate(withCity("/movies", city));
    }
  };

  const hasQuery = query.trim().length > 0;

  return (
    <div className="fixed inset-0 z-[160] bg-[#F5F5FA] overflow-y-auto animate-in fade-in duration-150">
      <div className="w-full max-w-[780px] mx-auto pt-4 sm:pt-6 px-4">
        {/* Top Search Bar & Close Button */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 flex items-center bg-white border-b border-gray-300 px-2 py-3">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Search for latest movies"
              className="w-full text-sm sm:text-base text-gray-900 placeholder:text-gray-400 outline-none bg-transparent"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="text-gray-400 hover:text-gray-600 p-1 shrink-0 cursor-pointer"
                aria-label="Clear"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 p-2 cursor-pointer shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* When NO query: Show only Recent Searches */}
        {!hasQuery ? (
          <div className="mt-6 animate-in fade-in duration-150">
            {recentSearches.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm sm:text-base font-bold text-gray-900">
                    Recent Searches
                  </h3>
                  <button
                    type="button"
                    onClick={clearRecentSearches}
                    className="text-sm text-[#F84464] hover:text-[#d63351] font-semibold cursor-pointer transition"
                  >
                    Clear
                  </button>
                </div>
                <div className="divide-y divide-gray-100">
                  {recentSearches.map((term) => (
                    <div
                      key={term}
                      onClick={() => handleSelectRecent(term)}
                      className="flex items-center justify-between py-3 px-1 hover:bg-gray-50 cursor-pointer transition group"
                    >
                      <span className="text-sm text-gray-700 group-hover:text-gray-900">
                        {term}
                      </span>
                      <ClipboardList className="w-[18px] h-[18px] text-gray-400 shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* When Query IS entered: Show Category Tabs & Filtered Results */
          <div className="animate-in fade-in duration-150">
            {/* Category Tabs */}
            <div className="flex items-center gap-5 sm:gap-7 border-b border-gray-200 mt-5 overflow-x-auto scrollbar-none">
              {TABS.map((tab) => {
                const isActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`pb-2.5 text-xs sm:text-sm font-semibold transition-all relative shrink-0 cursor-pointer ${
                      isActive
                        ? "text-[#F84464] border-b-2 border-[#F84464]"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>

            {/* Results Header */}
            <div className="my-3 text-xs text-gray-500 font-medium">
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#F84464]" />
                  Searching experiences...
                </span>
              ) : (
                <span>Showing {filteredResults.length} results</span>
              )}
            </div>

            {/* Results List Card */}
            {filteredResults.length > 0 ? (
              <div className="bg-white rounded-md border border-gray-200 divide-y divide-gray-100 shadow-sm overflow-hidden mb-6">
                {filteredResults.map((item) => (
                  <div
                    key={`${item.type}-${item.id}`}
                    onClick={() => handleItemClick(item)}
                    className="flex items-center gap-3 sm:gap-4 p-3.5 hover:bg-gray-50 transition cursor-pointer group"
                  >
                    {/* Thumbnail */}
                    <div className="w-12 h-16 sm:w-14 sm:h-18 rounded overflow-hidden bg-gray-100 shrink-0 border border-gray-100">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-50">
                          {item.type === "movie" ? (
                            <Film className="w-5 h-5 text-gray-400" />
                          ) : (
                            <Calendar className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-gray-900 group-hover:text-[#F84464] transition-colors truncate">
                        {item.title}
                      </h4>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : !loading ? (
              <div className="bg-white rounded-md border border-gray-200 p-8 text-center text-gray-500 text-sm shadow-sm mb-6">
                <p className="font-semibold text-gray-700">
                  No results found for &quot;{query}&quot;
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Try searching with another keyword or explore different
                  categories.
                </p>
              </div>
            ) : null}

            {/* View All Results Button */}
            {filteredResults.length > 0 && (
              <div className="text-center pb-12">
                <button
                  type="button"
                  onClick={handleViewAll}
                  className="border border-[#F84464] text-[#F84464] hover:bg-[#F84464]/5 font-semibold text-xs sm:text-sm rounded-md px-10 py-2.5 transition cursor-pointer"
                >
                  View All Results
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
