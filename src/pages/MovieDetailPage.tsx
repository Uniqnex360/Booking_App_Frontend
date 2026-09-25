import { useEffect, useState, useMemo } from "react";
import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Loader } from "@/components/common/Loader";
import {
  Heart,
  Play,
  Share2,
  Star,
  X,
  ChevronRight,
  ArrowLeft,
  Check,
} from "lucide-react";
import { withCity } from "@/lib/cityLink";
import { SeatVehicle } from "./SeatVehicle";
import { toast } from "sonner";
import { getMovieById } from "@/api/movie.api";
import RatingModal from "./RatingModal";
import { MovieDetail } from "@/types/movie.types";
import {
  formatDuration,
  formatReleaseDate,
  getEmbedTrailerUrl,
} from "@/utils/moviesHelper";
import { useAuth } from "@/hooks/useAuth";
import { LoadingPage } from "./LoadingPage";

const MAX_TICKETS = 10;

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
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [showTrailerModal, setShowTrailerModal] = useState(false);

  const [selectedLang, setSelectedLang] = useState<string>("");
  const [selectedFormat, setSelectedFormat] = useState<string>("");
  const [ticketCount, setTicketCount] = useState(2);
  const [copied, setCopied] = useState(false);

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
    fetchMovie();
  }, [id]);

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
    const langCount = Object.keys(langFormatMap).length;
    const totalFormats = Object.values(langFormatMap).flat().length;

    if (langCount > 1 || totalFormats > 1) {
      setShowLangFormatModal(true);
    } else {
      const defaultLang = Object.keys(langFormatMap)[0] || movie.language;
      const defaultFormat = langFormatMap[defaultLang]?.[0] || "2D";
      setSelectedLang(defaultLang);
      setSelectedFormat(defaultFormat);
      setShowTicketModal(true);
    }
  };

  const handleSelectLangFormat = (lang: string, format: string) => {
    setSelectedLang(lang);
    setSelectedFormat(format);
    setShowLangFormatModal(false);
    setShowTicketModal(true);
  };

  const handleTicketConfirm = () => {
    setShowTicketModal(false);
    const filterQuery = `${selectedLang} - ${selectedFormat}`;
    navigate(
      withCity(
        `/buytickets/${movie.id}?qty=${ticketCount}&filter=${encodeURIComponent(filterQuery)}`,
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
          <button
            type="button"
            onClick={() => navigate(withCity("/movies", city))}
            className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white transition mb-5 group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition" />
            Back to Movies
          </button>

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

              <div className="flex flex-wrap items-center gap-2 text-sm text-white/90 mt-5">
                <span>{formatDuration(movie.duration_min)}</span>
                <span className="text-white/40">•</span>
                <span>{genres.join(", ")}</span>
                <span className="text-white/40">•</span>
                <span>{movie.certificate}</span>
                <span className="text-white/40">•</span>
                <span>{formatReleaseDate(movie.release_date)}</span>
              </div>

              <div className="flex items-center gap-3 mt-8">
                <button
                  onClick={handleBookTicketsClick}
                  className="bg-[#7B1E3D] hover:bg-[#5C0F2A] text-white font-bold text-sm px-12 py-3.5 rounded-lg transition shadow-lg shadow-[#7B1E3D]/30"
                >
                  Book tickets
                </button>

                <button
                  onClick={handleShare}
                  className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition"
                  title="Share movie"
                >
                  {copied ? (
                    <Check className="h-5 w-5 text-green-400" />
                  ) : (
                    <Share2 className="h-5 w-5" />
                  )}
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

      {showTicketModal && (
        <div
          className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-4 sm:p-0 animate-in fade-in duration-200"
          onClick={() => setShowTicketModal(false)}
        >
          <div
            className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-[420px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 pt-5 pb-3 flex items-center justify-between border-b border-gray-100">
              <h3 className="text-gray-900 font-bold text-lg">
                How many seats?
              </h3>
              <button
                onClick={() => setShowTicketModal(false)}
                className="text-gray-400 hover:text-gray-700 transition p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 pt-6 pb-8 bg-white">
              <div className="flex items-center justify-center h-28 mb-6">
                <SeatVehicle count={ticketCount} />
              </div>

              <div className="flex items-center justify-center gap-2 flex-wrap px-1">
                {Array.from({ length: MAX_TICKETS }, (_, i) => i + 1).map(
                  (n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setTicketCount(n)}
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold border transition-all ${
                        ticketCount === n
                          ? "bg-[#7B1E3D] text-white border-[#7B1E3D] scale-110 shadow-lg shadow-[#7B1E3D]/25"
                          : "bg-white text-gray-700 border-gray-300 hover:border-[#7B1E3D]/50 hover:text-[#7B1E3D]"
                      }`}
                    >
                      {n}
                    </button>
                  ),
                )}
              </div>

              <button
                type="button"
                onClick={handleTicketConfirm}
                className="w-full bg-[#7B1E3D] hover:bg-[#5C0F2A] text-white font-bold rounded-lg py-3.5 mt-8 transition flex items-center justify-center gap-2 shadow-lg shadow-[#7B1E3D]/20"
              >
                Select Seats
                <ChevronRight className="h-5 w-5" />
              </button>
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
    </div>
  );
}
