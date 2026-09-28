import { useEffect, useState, useMemo, useRef } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import {
  Heart,
  Play,
  Share2,
  Star,
  X,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Check,
  ThumbsUp,
  ThumbsDown,
  PartyPopperIcon,
} from "lucide-react";
import { withCity } from "@/lib/cityLink";
import { toast } from "sonner";
import { getMovieById, getMovieReviews } from "@/api/movie.api";
import { api, unwrap } from "@/api/client";
import RatingModal from "./RatingModal";
import { AgeRestrictionModal } from "@/components/common/AgeRestrictionModal";
import { MovieDetail, CastCrewMember, MovieReview } from "@/types/movie.types";
import {
  formatDuration,
  formatReleaseDate,
  getEmbedTrailerUrl,
} from "@/utils/moviesHelper";
import { useAuth } from "@/hooks/useAuth";
import { LoadingPage } from "./LoadingPage";
import { isInWishlist, toggleWishlist } from "@/utils/wishlist";

function CastCrewCard({ member }: { member: CastCrewMember }) {
  return (
    <div className="flex flex-col items-start shrink-0 w-[112px] sm:w-[124px]">
      <div className="w-[104px] h-[104px] sm:w-[116px] sm:h-[116px] rounded-2xl overflow-hidden bg-gray-100 border border-gray-200 mb-2 shrink-0 shadow-2xs">
        {member.photo_url ? (
          <img
            src={member.photo_url}
            alt={member.name}
            className="w-full h-full object-cover object-top hover:scale-105 transition-transform duration-200"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=f3f4f6&color=6b7280&size=120`;
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400 font-bold text-xl">
            {member.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <p className="text-xs sm:text-sm font-semibold text-gray-900 leading-tight line-clamp-2">
        {member.name}
      </p>
      <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5 leading-tight line-clamp-1">
        {member.role}
      </p>
    </div>
  );
}

export default function MovieDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const city = searchParams.get("city") || "Kochi";

  const [movie, setMovie] = useState<MovieDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const [isSynopsisExpanded, setIsSynopsisExpanded] = useState(false);

  // Modal States
  const [showLangFormatModal, setShowLangFormatModal] = useState(false);
  const [showTrailerModal, setShowTrailerModal] = useState(false);
  const [showAgeWarningModal, setShowAgeWarningModal] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);

  const [selectedLang, setSelectedLang] = useState<string>("");
  const [selectedFormat, setSelectedFormat] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [inWishlist, setInWishlist] = useState(false);
  const [reviews, setReviews] = useState<MovieReview[]>([]);
  const [similarMovies, setSimilarMovies] = useState<any[]>([]);
  const similarMoviesRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
const [showStickyBar, setShowStickyBar] = useState(false);
  const scrollSimilarMovies = (direction: "left" | "right") => {
    if (similarMoviesRef.current) {
      const scrollAmount = similarMoviesRef.current.clientWidth * 0.75;
      similarMoviesRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  // User review reactions: { [reviewId]: 'like' | 'dislike' | null }
  const [reviewReactions, setReviewReactions] = useState<
    Record<string, "like" | "dislike" | null>
  >(() => {
    try {
      const saved = localStorage.getItem("vyhbz_review_reactions");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const handleReviewReaction = (reviewId: string, type: "like" | "dislike") => {
    setReviewReactions((prev) => {
      const current = prev[reviewId];
      const nextType = current === type ? null : type;
      const updated = { ...prev, [reviewId]: nextType };
      try {
        localStorage.setItem("vyhbz_review_reactions", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  useEffect(() => {
    if (movie) {
      setInWishlist(isInWishlist(movie.id));
    }
  }, [movie]);

  const location = useLocation();

  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);

  const fetchMovie = async () => {
    if (!id) return;
    try {
      const data = await getMovieById(id);
      setMovie(data);
    } catch (err) {
      console.error("Failed to load movie", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    setLoading(true);
    fetchMovie();
    if (id) {
      getMovieReviews(id)
        .then((res) => setReviews(Array.isArray(res) ? res : []))
        .catch(() => setReviews([]));

      unwrap<any[]>(api.get("/movies", { params: { city } }))
        .then((movies) => {
          const list = Array.isArray(movies) ? movies : [];
          setSimilarMovies(list.filter((m: any) => m.id !== id));
        })
        .catch(() => setSimilarMovies([]));
    }
  }, [id, city]);

  const topHashtags = useMemo(() => {
    const counts: Record<string, number> = {};
    reviews.forEach((review) => {
      review.hashtags?.forEach((tag) => {
        counts[tag] = (counts[tag] || 0) + 1;
      });
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0) return sorted;
    return [
      ["SuperDirection", 491],
      ["GreatActing", 487],
      ["Wellmade", 484],
      ["AwesomeStory", 460],
      ["Blockbuster", 450],
    ] as [string, number][];
  }, [reviews]);

  const handleRateNow = () => {
    if (!user) {
      navigate("/login", {
        state: { from: location.pathname + location.search },
      });
      return;
    }
    setIsRatingModalOpen(true);
  };

  const goToReviews = () => {
    navigate(`/movies/${id}/reviews${location.search}`);
  };

  const langFormatMap = useMemo(() => {
    const map: Record<string, Set<string>> = {};

    if (movie?.venues) {
      movie.venues.forEach((v) => {
        v.showtimes?.forEach((s: any) => {
          const lang = (
            s.language ||
            movie.language ||
            "ENGLISH"
          ).toUpperCase();
          const fmt = (s.format || "2D").toUpperCase();
          if (!map[lang]) map[lang] = new Set();
          map[lang].add(fmt);
        });
      });
    }

    if (Object.keys(map).length === 0 && movie) {
      const defaultLang = (movie.language || "ENGLISH").toUpperCase();
      map[defaultLang] = new Set(["2D", "IMAX 2D"]);
    }

    return Object.fromEntries(
      Object.entries(map).map(([lang, formats]) => [lang, Array.from(formats)]),
    );
  }, [movie]);
  useEffect(() => {
  const el = heroRef.current;
  if (!el) return;
  const obs = new IntersectionObserver(
    ([entry]) => setShowStickyBar(!entry.isIntersecting),
    { threshold: 0, rootMargin: "-64px 0px 0px 0px" },
  );
  obs.observe(el);
  return () => obs.disconnect();
}, [movie]);
  if (loading) {
    return <LoadingPage showFooter={false} />;
  }

  if (!movie) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Header />
        <div className="flex-grow flex justify-center items-center py-20 text-gray-500">
          Movie not found.
        </div>
        <Footer />
      </div>
    );
  }

  const genres = movie.genre.split(",").map((g) => g.trim());
  const embedTrailerUrl = getEmbedTrailerUrl(movie.trailer_url);

  const handleBookTicketsClick = () => {
    if (movie?.certificate?.toUpperCase() === "A" && !ageConfirmed) {
      setShowAgeWarningModal(true);
      return;
    }
    proceedWithBooking();
  };

  const proceedWithBooking = () => {
    if (!movie) return;
    const langCount = Object.keys(langFormatMap).length;
    const totalFormats = Object.values(langFormatMap).flat().length;

    if (langCount > 1 || totalFormats > 1) {
      setShowLangFormatModal(true);
    } else {
      const defaultLang = Object.keys(langFormatMap)[0] || movie.language;
      const defaultFormat = langFormatMap[defaultLang]?.[0] || "2D";
      const filterQuery = `${defaultLang} - ${defaultFormat}`;
      navigate(
        withCity(
          `/buytickets/${movie.id}?filter=${encodeURIComponent(filterQuery)}`,
          city,
        ),
      );
    }
  };

  const handleSelectLangFormat = (lang: string, format: string) => {
    setSelectedLang(lang);
    setSelectedFormat(format);
    setShowLangFormatModal(false);
    const filterQuery = `${lang} - ${format}`;
    navigate(
      withCity(
        `/buytickets/${movie.id}?filter=${encodeURIComponent(filterQuery)}`,
        city,
      ),
    );
  };

  const getShareUrl = () => {
    const path = withCity(`/movies/${id}`, city);
    return `${window.location.origin}${path.startsWith("/") ? path : `/${path}`}`;
  };

  const handleShare = async () => {
    const url = getShareUrl();
    const title = movie?.title ?? "Movie";
    const text = `Watch ${title} on Vyhbz`;

    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
        return;
      }
    } catch {}

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const synopsisText =
    movie.synopsis || "No synopsis available for this movie.";
  const shouldTruncate = synopsisText.length > 250;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
    <div
  className={`fixed left-0 right-0 top-0 lg:top-[104px] z-30 bg-white border-b border-gray-200 shadow-sm transition-transform duration-200 ${
    showStickyBar ? "translate-y-0" : "-translate-y-full pointer-events-none"
  }`}
>
  <div className="max-w-[1240px] mx-auto px-4 py-3 flex items-center justify-between gap-4">
    <h2 className="text-base sm:text-lg font-bold text-gray-900 truncate">
      {movie.title}
    </h2>
    <button
      onClick={handleBookTicketsClick}
      className="bg-[#7B1E3D] hover:bg-[#5C0F2A] text-white font-bold text-sm px-6 py-2 rounded-md transition shrink-0"
    >
      Book tickets
    </button>
  </div>
</div>
      <div
      ref={heroRef}
        className="relative pt-16 lg:pt-[104px] bg-[#1A1A2E] overflow-hidden"
        style={{
          backgroundImage: movie.banner_url
            ? `linear-gradient(90deg, #1A1A2E 0%, rgba(26,26,46,0.85) 45%, rgba(26,26,46,0.5) 100%), url(${movie.banner_url})`
            : movie.poster_url
              ? `linear-gradient(90deg, rgba(26,26,46,0.98) 0%, rgba(26,26,46,0.85) 50%, rgba(26,26,46,0.98) 100%)`
              : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {!movie.banner_url && movie.poster_url && (
          <div
            className="absolute inset-0 opacity-20 bg-cover bg-center blur-2xl pointer-events-none"
            style={{ backgroundImage: `url(${movie.poster_url})` }}
          />
        )}

        <div className="relative max-w-[1240px] mx-auto px-4 py-8 lg:py-10">
          <div className="flex items-center justify-between mb-5">
            <button
              type="button"
              onClick={() => navigate(withCity("/movies", city))}
              className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white transition group cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition" />
              Back to Movies
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/15 text-white text-sm font-medium transition cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98]"
              title="Share movie"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-400" />
              ) : (
                <Share2 className="h-4 w-4" />
              )}
              <span>{copied ? "Copied!" : "Share"}</span>
            </button>
          </div>

          <div className="flex gap-8 items-start">
            <div className="hidden sm:block w-[240px] shrink-0">
              <div className="w-full aspect-[2/3] rounded-xl overflow-hidden shadow-2xl relative group bg-slate-800">
                {movie.poster_url ? (
                  <img
                    src={movie.poster_url}
                    alt={movie.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                    No Poster
                  </div>
                )}

                <div
                  onClick={() => {
                    if (movie.trailer_url) {
                      setShowTrailerModal(true);
                    } else {
                      toast.info("Trailer coming soon!");
                    }
                  }}
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 hover:bg-black/90 backdrop-blur-md text-white text-xs font-semibold px-4 py-2 rounded-full flex items-center gap-2 border border-white/20 shadow-lg cursor-pointer transition transform hover:scale-105"
                >
                  <Play size={13} className="fill-white" />
                  <span>Trailers</span>
                </div>
              </div>
            </div>

            <div className="flex-1 min-w-0 text-white">
              <h1 className="text-[32px] lg:text-[40px] font-bold leading-tight drop-shadow-md">
                {movie.title}
              </h1>

              <div className="flex items-center justify-between bg-[#333338]/80 backdrop-blur-md rounded-lg px-4 py-3 mb-4 max-w-md gap-6">
                <div className="flex items-center gap-5">
                  {movie.external_rating != null && (
                    <div className="flex items-center gap-2">
                      <Star
                        className="text-[#F5C518]"
                        fill="#F5C518"
                        size={22}
                      />
                      <div>
                        <p className="text-white font-bold text-base leading-tight">
                          {movie.external_rating}/10
                        </p>
                        <p className="text-gray-400 text-[10px] tracking-wide uppercase">
                          TMDB
                        </p>
                      </div>
                    </div>
                  )}

                  {movie.rating_count != null && movie.rating_count > 0 && (
                    <button
                      type="button"
                      onClick={goToReviews}
                      className="flex items-center gap-2 text-left"
                    >
                      <Star
                        className="text-[#F5C518]"
                        fill="#F5C518"
                        size={22}
                      />
                      <div>
                        <p className="text-white font-bold text-base leading-tight">
                          {movie.rating}/10
                        </p>
                        <p className="text-gray-300 text-[10px] flex items-center gap-1">
                          {movie.rating_count} Votes <ChevronRight size={10} />
                        </p>
                      </div>
                    </button>
                  )}

                  {movie.external_rating == null &&
                    (!movie.rating_count || movie.rating_count === 0) && (
                      <p className="text-white text-sm">
                        Add your rating &amp; review
                      </p>
                    )}
                </div>

                <button
                  type="button"
                  onClick={handleRateNow}
                  className="bg-white text-black px-4 py-1.5 rounded-md text-sm font-semibold hover:bg-gray-200 transition shrink-0"
                >
                  Rate Now
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm text-white/90 mt-5">
                <span>{formatDuration(movie.duration_min)}</span>
                <span className="text-white/40">•</span>
                <span>{genres.join(", ")}</span>
                <span className="text-white/40">•</span>
                <span
                  className={
                    movie.certificate?.toUpperCase() === "A"
                      ? "bg-red-500/25 border border-red-500 text-red-200 font-bold px-2 py-0.5 rounded text-xs inline-flex items-center gap-1 shadow-xs"
                      : ""
                  }
                >
                  {movie.certificate?.toUpperCase() === "A" ? "A • 18+" : movie.certificate}
                </span>
                <span className="text-white/40">•</span>
                <span>{formatReleaseDate(movie.release_date)}</span>
              </div>
              <div className="flex flex-wrap gap-2 mt-5">
                {Object.values(langFormatMap)
                  .flat()
                  .map((fmt, idx) => (
                    <span
                      key={idx}
                      className="bg-white/10 backdrop-blur border border-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded"
                    >
                      {fmt}
                    </span>
                  ))}
                <span className="bg-white/10 backdrop-blur border border-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded">
                  {movie.language}
                </span>
              </div>

              

              <div className="flex items-center gap-3 mt-8">
                <button
                  onClick={handleBookTicketsClick}
                  className="bg-[#7B1E3D] hover:bg-[#5C0F2A] text-white font-bold text-sm px-12 py-3.5 rounded-lg transition shadow-lg shadow-[#7B1E3D]/30"
                >
                  Book tickets
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border-b border-gray-200">
        <div className="max-w-[1240px] mx-auto px-4 py-8 lg:py-10">
          <h2 className="text-xl font-bold text-gray-900 mb-3">
            About the movie
          </h2>
          <p className="text-gray-700 text-sm leading-relaxed max-w-4xl whitespace-pre-line">
            {shouldTruncate && !isSynopsisExpanded
              ? `${synopsisText.slice(0, 250)}...`
              : synopsisText}
          </p>
          {shouldTruncate && (
            <button
              onClick={() => setIsSynopsisExpanded(!isSynopsisExpanded)}
              className="text-[#7B1E3D] text-xs font-bold hover:underline mt-2 inline-block"
            >
              {isSynopsisExpanded ? "Show Less" : "Read More"}
            </button>
          )}
        </div>
      </div>

      {/* ─── Cast Section (BookMyShow Exact) ─── */}
      {movie.cast && movie.cast.length > 0 && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-[1240px] mx-auto px-4 py-8 lg:py-10">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">
              Cast
            </h2>
            <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-4 no-scrollbar">
              {movie.cast.map((member, idx) => (
                <CastCrewCard key={`${member.name}-${idx}`} member={member} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── Crew Section (BookMyShow Exact) ─── */}
      {movie.crew && movie.crew.length > 0 && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-[1240px] mx-auto px-4 py-8 lg:py-10">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">
              Crew
            </h2>
            <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-4 no-scrollbar">
              {movie.crew.map((member, idx) => (
                <CastCrewCard key={`${member.name}-${idx}`} member={member} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── Top Reviews Section (BookMyShow Exact) ─── */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-[1240px] mx-auto px-4 py-8 lg:py-10">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
              Top reviews
            </h2>
            <button
              type="button"
              onClick={goToReviews}
              className="text-[#f84464] hover:text-[#d63451] text-xs sm:text-sm font-semibold flex items-center gap-1 transition cursor-pointer"
            >
              {reviews.length > 0 ? `${reviews.length} reviews` : "672 reviews"}
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <p className="text-xs sm:text-sm text-gray-500 mb-4">
            Summary of {reviews.length > 0 ? reviews.length : 672} reviews.
          </p>

          {/* Hashtag Summary Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-4 no-scrollbar">
            {topHashtags.map(([tag, count]) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-gray-200 text-[#f84464] text-xs font-semibold bg-white whitespace-nowrap shadow-2xs hover:bg-gray-50 transition cursor-default"
              >
                #{tag}
                <span className="text-gray-400 font-normal">{count}</span>
              </span>
            ))}
          </div>

          {/* Review Cards Carousel */}
          <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-4 pt-2 no-scrollbar">
            {reviews.length > 0
              ? reviews.map((r, idx) => {
                  const rId = r.id || `review-${idx}`;
                  const reaction = reviewReactions[rId];
                  const isLiked = reaction === "like";
                  const currentLikes = (r.likes || 0) + (isLiked ? 1 : 0);

                  const reviewTime = (() => {
                    if (!r.created_at) return "Recently";
                    const d = new Date(r.created_at);
                    const diffSec = Math.floor(
                      (Date.now() - d.getTime()) / 1000,
                    );
                    if (diffSec < 60) return "Just now";
                    if (diffSec < 3600)
                      return `${Math.floor(diffSec / 60)}m ago`;
                    if (diffSec < 86400) return "Today";
                    if (diffSec < 172800) return "Yesterday";
                    return `${Math.floor(diffSec / 86400)} days ago`;
                  })();

                  return (
                    <div
                      key={r.id || idx}
                      className="w-[300px] sm:w-[360px] shrink-0 border border-gray-200 rounded-2xl p-5 bg-white shadow-2xs flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-600 font-bold text-xs uppercase">
                              {(r.user_name || "User").slice(0, 2)}
                            </div>
                            <div>
                              <p className="text-xs sm:text-sm font-bold text-gray-900 leading-tight">
                                {r.user_name || "Vyhbz User"}
                              </p>
                              <p className="text-[10px] text-gray-400 mt-0.5">
                                Booked on{" "}
                                <span className="font-semibold text-gray-600">
                                  vyhbz
                                </span>
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded text-amber-700 text-xs font-bold border border-amber-200">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            <span>{r.rating}/10</span>
                          </div>
                        </div>

                        <div className="mb-4">
                          {r.hashtags && r.hashtags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {r.hashtags.map((h) => (
                                <span
                                  key={h}
                                  className="text-xs font-bold text-gray-900"
                                >
                                  #{h}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-400 pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-4">
                          <button
                            type="button"
                            onClick={() => handleReviewReaction(rId, "like")}
                            className={`flex items-center gap-1.5 transition cursor-pointer ${
                              isLiked
                                ? "text-[#f84464] font-bold"
                                : "text-gray-400 hover:text-gray-700"
                            }`}
                            title={isLiked ? "Unlike" : "Helpful"}
                          >
                            <ThumbsUp
                              className={`h-3.5 w-3.5 ${isLiked ? "fill-current" : ""}`}
                            />
                            <span>{currentLikes}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleReviewReaction(rId, "dislike")}
                            className={`flex items-center gap-1 transition cursor-pointer ${
                              reaction === "dislike"
                                ? "text-[#f84464] font-bold"
                                : "text-gray-400 hover:text-gray-700"
                            }`}
                            title={
                              reaction === "dislike"
                                ? "Remove dislike"
                                : "Not helpful"
                            }
                          >
                            <ThumbsDown
                              className={`h-3.5 w-3.5 ${reaction === "dislike" ? "fill-current" : ""}`}
                            />
                          </button>
                        </div>

                        <div className="flex items-center gap-3">
                          <span>{reviewTime}</span>
                          <button
                            type="button"
                            onClick={handleShare}
                            className="hover:text-gray-700 cursor-pointer p-0.5"
                            title="Share review"
                          >
                            <Share2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              : [
                  {
                    name: "Sreekuttan",
                    rating: 10,
                    tags: ["SuperDirection", "GreatActing", "WowMusic"],
                    text: "Investigation thriller film. Engaging screenplay, tight direction, and a powerhouse performance that keeps you on the edge of your seat.",
                    likes: 221,
                  },
                  {
                    name: "Abhi Suresh",
                    rating: 10,
                    tags: ["SuperDirection", "GreatActing", "AwesomeStory"],
                    text: "Brilliant execution and top-notch cinematography. An absolute must-watch in theatres with friends and family!",
                    likes: 72,
                  },
                  {
                    name: "Rahul M",
                    rating: 9,
                    tags: ["Wellmade", "Blockbuster", "Rocking"],
                    text: "Fast-paced thriller with memorable soundtrack and crisp background score. Fully worth the hype!",
                    likes: 54,
                  },
                ].map((sample, sIdx) => {
                  const sId = `sample-${sIdx}`;
                  const reaction = reviewReactions[sId];
                  const isLiked = reaction === "like";
                  const currentLikes = sample.likes + (isLiked ? 1 : 0);

                  return (
                    <div
                      key={sIdx}
                      className="w-[300px] sm:w-[360px] shrink-0 border border-gray-200 rounded-2xl p-5 bg-white shadow-2xs flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-600 font-bold text-xs uppercase">
                              {sample.name.slice(0, 2)}
                            </div>
                            <div>
                              <p className="text-xs sm:text-sm font-bold text-gray-900 leading-tight">
                                {sample.name}
                              </p>
                              <p className="text-[10px] text-gray-400 mt-0.5">
                                Booked on{" "}
                                <span className="font-semibold text-gray-600">
                                  vyhbz
                                </span>
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded text-amber-700 text-xs font-bold border border-amber-200">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            <span>{sample.rating}/10</span>
                          </div>
                        </div>

                        <div className="mb-4">
                          <p className="text-xs font-bold text-gray-900 mb-1.5 line-clamp-1">
                            {sample.tags.map((h) => `#${h}`).join(" ")}
                          </p>
                          <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">
                            {sample.text}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-400 pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-4">
                          <button
                            type="button"
                            onClick={() => handleReviewReaction(sId, "like")}
                            className={`flex items-center gap-1.5 transition cursor-pointer ${
                              isLiked
                                ? "text-[#f84464] font-bold"
                                : "text-gray-400 hover:text-gray-700"
                            }`}
                            title={isLiked ? "Unlike" : "Helpful"}
                          >
                            <ThumbsUp
                              className={`h-3.5 w-3.5 ${isLiked ? "fill-current" : ""}`}
                            />
                            <span>{currentLikes}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleReviewReaction(sId, "dislike")}
                            className={`flex items-center gap-1 transition cursor-pointer ${
                              reaction === "dislike"
                                ? "text-[#f84464] font-bold"
                                : "text-gray-400 hover:text-gray-700"
                            }`}
                            title={
                              reaction === "dislike"
                                ? "Remove dislike"
                                : "Not helpful"
                            }
                          >
                            <ThumbsDown
                              className={`h-3.5 w-3.5 ${reaction === "dislike" ? "fill-current" : ""}`}
                            />
                          </button>
                        </div>

                        <div className="flex items-center gap-3">
                          <span>2 Days ago</span>
                          <button
                            type="button"
                            onClick={handleShare}
                            className="hover:text-gray-700 cursor-pointer p-0.5"
                            title="Share review"
                          >
                            <Share2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
          </div>
        </div>
      </div>

      {/* ─── You Might Also Like Section (BookMyShow Exact) ─── */}
      {similarMovies.length > 0 && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-[1240px] mx-auto px-4 py-8 lg:py-10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                You might also like
              </h2>
              <button
                type="button"
                onClick={() => navigate(withCity("/movies", city))}
                className="text-[#f84464] hover:text-[#d63451] text-xs sm:text-sm font-semibold flex items-center gap-1 transition cursor-pointer"
              >
                View All
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="relative group/similar">
              <button
                type="button"
                onClick={() => scrollSimilarMovies("left")}
                aria-label="Previous movies"
                className="flex absolute -left-2 sm:-left-5 top-[38%] -translate-y-1/2 z-10 h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-white shadow-md border border-gray-200 text-gray-700 hover:text-gray-900 hover:scale-105 transition cursor-pointer"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              <div
                ref={similarMoviesRef}
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                className="flex gap-4 sm:gap-6 overflow-x-auto pb-4 no-scrollbar scroll-smooth [&::-webkit-scrollbar]:hidden"
              >
                {similarMovies.map((m) => {
                  const ratingVal = m.rating || m.external_rating || 8.8;
                  const votesCount = m.rating_count
                    ? `${m.rating_count} votes`
                    : "20K+ votes";
                  return (
                    <Link
                      key={m.id}
                      to={withCity(`/movies/${m.id}`, city)}
                      onClick={() =>
                        window.scrollTo({ top: 0, left: 0, behavior: "instant" })
                      }
                      className="w-[150px] sm:w-[180px] shrink-0 cursor-pointer group flex flex-col no-underline text-inherit"
                    >
                      <div className="w-full aspect-[2/3] rounded-2xl overflow-hidden bg-gray-100 border border-gray-200 shadow-2xs mb-2.5 relative">
                        {m.poster_url ? (
                          <img
                            src={m.poster_url}
                            alt={m.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                            No Poster
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 mb-1">
                        <Star className="h-3.5 w-3.5 fill-[#f84464] text-[#f84464]" />
                        <span className="text-xs font-bold text-gray-900">
                          {ratingVal}
                        </span>
                        <span className="text-[11px] text-gray-500 font-normal">
                          {votesCount}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-gray-900 line-clamp-1 group-hover:text-[#f84464] transition">
                        {m.title}
                      </h3>
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {m.genre || m.language || "Action, Drama"}
                      </p>
                    </Link>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => scrollSimilarMovies("right")}
                aria-label="Next movies"
                className="flex absolute -right-2 sm:-right-5 top-[38%] -translate-y-1/2 z-10 h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-white shadow-md border border-gray-200 text-gray-700 hover:text-gray-900 hover:scale-105 transition cursor-pointer"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="w-full max-w-[1240px] mx-auto px-4 py-4">
  <div className="flex flex-wrap items-center justify-start gap-1.5 text-[11px] text-gray-500 font-normal">
    <Link to="/" className="hover:text-gray-900 transition">Home</Link>
    <span className="text-gray-400">→</span>
    <span className="hover:text-gray-900 cursor-pointer">Movies in {city}</span>
    <span className="text-gray-400">→</span>
    <span className="hover:text-gray-900 cursor-pointer">{movie.language} Movies</span>
    <span className="text-gray-400">→</span>
    <span className="text-gray-800 font-medium">{movie.title}</span>
  </div>
</div>

      {/* ─── List your Show Banner (Matching BMS Exact Reference) ─── */}
      <div className="bg-[#404046] text-white py-4 mt-4">
  <div className="max-w-[1240px] mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
              <PartyPopperIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                <span className="text-sm sm:text-base font-bold text-white whitespace-nowrap">
                  List your Show
                </span>
                <span className="text-xs text-gray-300">
                  Got a show, event, activity or a great experience? Partner
                  with us &amp; get listed on Vyhbhz
                </span>
              </div>
            </div>
          </div>
          <Link
            to="/partner/register"
            className="bg-[#EC5E71] hover:bg-[#e04a5e] text-white font-semibold text-xs px-5 py-2.5 rounded-md transition shrink-0 cursor-pointer shadow-xs whitespace-nowrap"
          >
            Contact today!
          </Link>
        </div>
      </div>
      <Footer />

      {showTrailerModal && movie.trailer_url && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowTrailerModal(false)}
        >
          <div
            className="relative w-full max-w-4xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowTrailerModal(false)}
              className="absolute top-4 right-4 z-20 p-2 text-white/80 hover:text-white bg-black/60 rounded-full transition"
            >
              <X size={20} />
            </button>

            {embedTrailerUrl &&
            (embedTrailerUrl.includes("youtube.com") ||
              embedTrailerUrl.includes("youtu.be")) ? (
              <iframe
                src={embedTrailerUrl}
                title={`${movie.title} Trailer`}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <video
                src={movie.trailer_url}
                controls
                autoPlay
                className="w-full h-full"
              />
            )}
          </div>
        </div>
      )}

      {showLangFormatModal && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
          onClick={() => setShowLangFormatModal(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-[420px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 pt-5 pb-4 flex items-start justify-between border-b border-gray-100">
              <div>
                <p className="text-xs text-gray-500 font-medium mb-0.5">
                  {movie.title}
                </p>
                <h3 className="text-lg font-bold text-gray-900">
                  Select language and format
                </h3>
              </div>
              <button
                onClick={() => setShowLangFormatModal(false)}
                className="text-gray-400 hover:text-gray-700 transition p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto divide-y divide-gray-100">
              {Object.entries(langFormatMap).map(([lang, formats]) => (
                <div key={lang} className="py-2">
                  <div className="bg-slate-100/70 px-6 py-2 text-[11px] font-bold text-slate-600 tracking-wider uppercase">
                    {lang}
                  </div>
                  <div className="p-4 px-6 flex flex-wrap gap-2.5">
                    {formats.map((fmt) => (
                      <button
                        key={fmt}
                        onClick={() => handleSelectLangFormat(lang, fmt)}
                        className="border border-slate-200 hover:border-[#7B1E3D] hover:bg-[#7B1E3D]/5 text-[#7B1E3D] font-semibold text-xs rounded-full px-5 py-2 transition-all shadow-sm"
                      >
                        {fmt}
                      </button>
                    ))}
                    {formats.length > 1 && (
                      <button
                        onClick={() => handleSelectLangFormat(lang, formats[0])}
                        className="text-xs font-semibold text-[#7B1E3D] hover:underline px-2 py-2"
                      >
                        Select all
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <RatingModal
        isOpen={isRatingModalOpen}
        onClose={() => setIsRatingModalOpen(false)}
        movieId={movie.id}
        onSubmitSuccess={fetchMovie}
      />

      <AgeRestrictionModal
        isOpen={showAgeWarningModal}
        movieTitle={movie.title}
        onClose={() => setShowAgeWarningModal(false)}
        onConfirm={() => {
          setAgeConfirmed(true);
          setShowAgeWarningModal(false);
          proceedWithBooking();
        }}
      />
    </div>
  );
}
