import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Loader } from "@/components/common/Loader";
import { api, unwrap } from "@/api/client";
import { Heart, Play, Share2, Star, X, ChevronRight, ArrowLeft, Check } from "lucide-react";
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

export default function MovieDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const city = searchParams.get("city") || "Kochi";
    const [copied, setCopied] = useState(false);

  const [movie, setMovie] = useState<MovieDetail | null>(null);
  const [loading, setLoading] = useState(true);
  

  
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [ticketCount, setTicketCount] = useState(2);
const getShareUrl = () => {
    const path = withCity(`/movies/${id}`, city);
    
    if (path.startsWith("http")) return path;
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
      
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast?.success?.("Link copied!") ?? console.log("Copied", url);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      toast?.success?.("Link copied!") ?? alert("Link copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };
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

  const allFormats = movie.venues
    ? Array.from(
        new Set(
          movie.venues.flatMap((v) => v.showtimes.map((s: any) => s.format)),
        ),
      )
    : ["2D"];

  const handleTicketConfirm = () => {
    setShowTicketModal(false);
    navigate(withCity(`/buytickets/${movie.id}?qty=${ticketCount}`, city));
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />

      <div
        className="relative pt-16 lg:pt-[72px]"
        style={{
          background:
            "linear-gradient(90deg, rgba(26,26,46,0.98) 0%, rgba(26,26,46,0.85) 50%, rgba(26,26,46,0.98) 100%)",
        }}
      >
        {movie.poster_url && (
          <div
            className="absolute inset-0 opacity-20 bg-cover bg-center blur-2xl"
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
              <div className="w-full aspect-[2/3] rounded-xl overflow-hidden shadow-2xl relative group cursor-pointer">
                {movie.poster_url ? (
                  <img
                    src={movie.poster_url}
                    alt={movie.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-700 flex items-center justify-center text-gray-400 text-sm">
                    No Poster
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                      <Play className="h-6 w-6 text-white fill-white ml-0.5" />
                    </div>
                    <span className="text-white text-xs font-medium">
                      Watch Trailer
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 min-w-0 text-white">
              <h1 className="text-[32px] lg:text-[40px] font-bold leading-tight">
                {movie.title}
              </h1>

              <div className="mt-4 bg-[#333338] rounded-xl px-5 py-3 inline-flex items-center gap-4 shadow-lg">
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

              <div className="flex flex-wrap gap-2 mt-5">
                {allFormats.map((fmt) => (
                  <span
                    key={fmt}
                    className="bg-white/10 backdrop-blur border border-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded"
                  >
                    {fmt}
                  </span>
                ))}
                <span className="bg-white/10 backdrop-blur border border-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded">
                  {movie.language}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-sm text-white mt-5">
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
                  onClick={() => setShowTicketModal(true)}
                  className="bg-[#7B1E3D] hover:bg-[#5C0F2A] text-white font-bold text-sm px-12 py-3.5 rounded-lg transition shadow-lg shadow-[#7B1E3D]/20"
                >
                  Book tickets
                </button>
                <button className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition ml-2">
                  <Heart className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={handleShare}
                  className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition relative"
                  title="Copy movie link"
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

      {showTicketModal && (
        <div
          className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-4 sm:p-0"
          onClick={() => setShowTicketModal(false)}
        >
          <div
            className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-[420px] overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200"
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
    </div>
  );
}
