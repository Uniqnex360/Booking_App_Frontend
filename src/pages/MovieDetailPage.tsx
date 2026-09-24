import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Loader } from "@/components/common/Loader";
import { api, unwrap } from "@/api/client";
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

interface MovieDetail {
  id: string;
  title: string;
  language: string;
  duration_min: number;
  certificate: string;
  poster_url: string | null;
  banner_url?: string | null;
  trailer_url?: string | null;
  synopsis: string;
  genre: string;
  release_date: string;
  venues?: any[];
}

const MAX_TICKETS = 10;

function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

function formatReleaseDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Helper to convert YouTube links into embed URLs for the iframe player
function getEmbedTrailerUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.includes("youtube.com/watch")) {
    const v = new URLSearchParams(url.split("?")[1]).get("v");
    return v ? `https://www.youtube.com/embed/${v}?autoplay=1` : url;
  }
  if (url.includes("youtu.be/")) {
    const id = url.split("youtu.be/")[1]?.split("?")[0];
    return id ? `https://www.youtube.com/embed/${id}?autoplay=1` : url;
  }
  if (url.includes("youtube.com/embed/")) {
    return url.includes("autoplay=1") ? url : `${url}?autoplay=1`;
  }
  return url;
}

export default function MovieDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const city = searchParams.get("city") || "Kochi";

  const [movie, setMovie] = useState<MovieDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [showLangFormatModal, setShowLangFormatModal] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [showTrailerModal, setShowTrailerModal] = useState(false);
  
  const [selectedLang, setSelectedLang] = useState<string>("");
  const [selectedFormat, setSelectedFormat] = useState<string>("");
  const [ticketCount, setTicketCount] = useState(2);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchMovie = async () => {
      try {
        setLoading(true);
        const data = await unwrap<MovieDetail>(api.get(`/movies/${id}`));
        setMovie(data);
      } catch (err) {
        console.error("Failed to load movie", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMovie();
  }, [id]);

  // Group showtime formats by language (BMS Style)
  const langFormatMap = useMemo(() => {
    const map: Record<string, Set<string>> = {};

    if (movie?.venues) {
      movie.venues.forEach((v) => {
        v.showtimes?.forEach((s: any) => {
          const lang = (s.language || movie.language || "ENGLISH").toUpperCase();
          const fmt = (s.format || "2D").toUpperCase();
          if (!map[lang]) map[lang] = new Set();
          map[lang].add(fmt);
        });
      });
    }

    // Fallback if no venues / default language
    if (Object.keys(map).length === 0 && movie) {
      const defaultLang = (movie.language || "ENGLISH").toUpperCase();
      map[defaultLang] = new Set(["2D", "IMAX 2D"]);
    }

    return Object.fromEntries(
      Object.entries(map).map(([lang, formats]) => [lang, Array.from(formats)])
    );
  }, [movie]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Header />
        <div className="flex-grow flex justify-center items-center py-20">
          <Loader />
        </div>
        <Footer />
      </div>
    );
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

  // Handle "Book tickets" click
  const handleBookTicketsClick = () => {
    const langCount = Object.keys(langFormatMap).length;
    const totalFormats = Object.values(langFormatMap).flat().length;

    // If multiple options exist, show Language & Format modal first
    if (langCount > 1 || totalFormats > 1) {
      setShowLangFormatModal(true);
    } else {
      // Otherwise skip directly to seat selection
      const defaultLang = Object.keys(langFormatMap)[0] || movie.language;
      const defaultFormat = langFormatMap[defaultLang]?.[0] || "2D";
      setSelectedLang(defaultLang);
      setSelectedFormat(defaultFormat);
      setShowTicketModal(true);
    }
  };

  // When user selects a format pill in the language modal
  const handleSelectLangFormat = (lang: string, format: string) => {
    setSelectedLang(lang);
    setSelectedFormat(format);
    setShowLangFormatModal(false);
    setShowTicketModal(true); // Open "How many seats?" modal
  };

  // Final confirmation to view showtimes
  const handleTicketConfirm = () => {
    setShowTicketModal(false);
    const filterQuery = `${selectedLang} - ${selectedFormat}`;
    navigate(
      withCity(
        `/buytickets/${movie.id}?qty=${ticketCount}&filter=${encodeURIComponent(filterQuery)}`,
        city
      )
    );
  };

  // Share functionality
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
    } catch {
      // User cancelled, fall through to copy
    }

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

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />

      {/* ─── Hero Banner ─── */}
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
        {/* Soft background glow if banner is missing */}
        {!movie.banner_url && movie.poster_url && (
          <div
            className="absolute inset-0 opacity-20 bg-cover bg-center blur-2xl pointer-events-none"
            style={{ backgroundImage: `url(${movie.poster_url})` }}
          />
        )}

        <div className="relative max-w-[1240px] mx-auto px-4 py-8 lg:py-10">
          {/* Back to Movies */}
          <button
            type="button"
            onClick={() => navigate(withCity("/movies", city))}
            className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white transition mb-5 group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition" />
            Back to Movies
          </button>

          <div className="flex gap-8 items-start">
            {/* Poster & Trailer Button */}
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
                
                {/* BMS Style "Trailers" Pill Overlay */}
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

            {/* Movie Details */}
            <div className="flex-1 min-w-0 text-white">
              <h1 className="text-[32px] lg:text-[40px] font-bold leading-tight drop-shadow-md">
                {movie.title}
              </h1>

              {/* Rating Card */}
              <div className="mt-4 bg-[#333338]/90 backdrop-blur rounded-xl px-5 py-3 inline-flex items-center gap-4 shadow-lg border border-white/10">
                <div className="flex items-center gap-2">
                  <Star className="h-6 w-6 text-[#F5C518] fill-[#F5C518]" />
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="font-bold text-xl">8.5</span>
                      <span className="text-sm text-gray-400">/10</span>
                    </div>
                    <div className="text-[11px] text-gray-400">
                      142.5K Votes
                    </div>
                  </div>
                </div>
                <button className="bg-white/10 hover:bg-white/20 border border-white/20 rounded-md px-4 py-2 text-xs font-medium transition">
                  Rate now
                </button>
              </div>

              {/* Language & Formats */}
              <div className="flex flex-wrap gap-2 mt-5">
                {Object.values(langFormatMap).flat().map((fmt, idx) => (
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

              {/* Meta Info */}
              <div className="flex flex-wrap items-center gap-2 text-sm text-white/90 mt-5">
                <span>{formatDuration(movie.duration_min)}</span>
                <span className="text-white/40">•</span>
                <span>{genres.join(", ")}</span>
                <span className="text-white/40">•</span>
                <span>{movie.certificate}</span>
                <span className="text-white/40">•</span>
                <span>{formatReleaseDate(movie.release_date)}</span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 mt-8">
                <button
                  onClick={handleBookTicketsClick}
                  className="bg-[#7B1E3D] hover:bg-[#5C0F2A] text-white font-bold text-sm px-12 py-3.5 rounded-lg transition shadow-lg shadow-[#7B1E3D]/30"
                >
                  Book tickets
                </button>
                <button className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition ml-2">
                  <Heart className="h-5 w-5" />
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

      {/* ─── About Section ─── */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-[1240px] mx-auto px-4 py-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            About the movie
          </h2>
          <p className="text-gray-700 text-sm leading-relaxed max-w-4xl">
            {movie.synopsis}
          </p>
        </div>
      </div>

      <Footer />

      {/* ─── TRAILER VIDEO MODAL ─── */}
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

            {embedTrailerUrl && (embedTrailerUrl.includes("youtube.com") || embedTrailerUrl.includes("youtu.be")) ? (
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

      {/* ─── BMS SELECT LANGUAGE AND FORMAT MODAL ─── */}
      {showLangFormatModal && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
          onClick={() => setShowLangFormatModal(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-[420px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
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

            {/* Body */}
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

      {/* ─── BMS HOW MANY SEATS MODAL (With Vehicle Animation) ─── */}
      {showTicketModal && (
        <div
          className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-4 sm:p-0 animate-in fade-in duration-200"
          onClick={() => setShowTicketModal(false)}
        >
          <div
            className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-[420px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
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
              {/* Vehicle SVG based on count */}
              <div className="flex items-center justify-center h-28 mb-6">
                <SeatVehicle count={ticketCount} />
              </div>

              {/* Number pills */}
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
                  )
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
    </div>
  );
}