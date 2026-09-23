import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Loader } from "@/components/common/Loader";
import { api, unwrap } from "@/api/client";
import { MapPin } from "lucide-react";
import { withCity } from "@/lib/cityLink";

interface ShowtimeSlot {
  id: string;
  screen_name: string;
  starts_at: string; // ISO UTC
  language: string;
  format: string;
}

interface VenueGroup {
  venue_id: string;
  venue_name: string;
  city: string;
  address: string | null;
  showtimes: ShowtimeSlot[];
}

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
  venues?: VenueGroup[];
}

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

// YYYY-MM-DD in Asia/Kolkata for a given ISO timestamp
function istDateKey(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });
}

function istTimeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function datePillLabel(dateKey: string, todayKey: string): string {
  if (dateKey === todayKey) return "Today";
  // dateKey is YYYY-MM-DD; parse as IST-local by constructing a date at noon UTC
  // to avoid rolling back a day in negative-offset environments.
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const weekday = dt.toLocaleDateString("en-IN", {
    weekday: "short",
    timeZone: "UTC",
  });
  const day = dt.toLocaleDateString("en-IN", {
    day: "numeric",
    timeZone: "UTC",
  });
  const month = dt.toLocaleDateString("en-IN", {
    month: "short",
    timeZone: "UTC",
  });
  return `${weekday} ${day} ${month}`;
}

export default function MovieDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const city = searchParams.get("city") || "Kochi";

  const [movie, setMovie] = useState<MovieDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

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
      <div className="min-h-screen bg-neutral-50 flex flex-col">
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
      <div className="min-h-screen bg-neutral-50 flex flex-col">
        <Header />
        <div className="flex-grow flex justify-center items-center py-20 text-slate-500">
          Movie not found.
        </div>
        <Footer />
      </div>
    );
  }

  const now = Date.now();
  const todayKey = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });

  const venuesInCity = (movie.venues ?? []).filter((v) => v.city === city);

  // Unique future dates across all venues in this city, ascending.
  const dateKeys = Array.from(
    new Set(
      venuesInCity.flatMap((v) =>
        v.showtimes
          .filter((s) => new Date(s.starts_at).getTime() > now)
          .map((s) => istDateKey(s.starts_at)),
      ),
    ),
  ).sort();

  const activeDate = selectedDate ?? dateKeys[0] ?? null;

  // Venues with at least one future showtime on the active date.
  const venuesForDate = activeDate
    ? venuesInCity
        .map((v) => ({
          ...v,
          showtimes: v.showtimes
            .filter((s) => new Date(s.starts_at).getTime() > now)
            .filter((s) => istDateKey(s.starts_at) === activeDate)
            .sort(
              (a, b) =>
                new Date(a.starts_at).getTime() -
                new Date(b.starts_at).getTime(),
            ),
        }))
        .filter((v) => v.showtimes.length > 0 || venuesInCity.length > 0)
    : [];

  return (
    <div className="min-h-screen bg-neutral-50 text-slate-900 flex flex-col">
      <Header />
      <main className="flex-grow max-w-[1280px] w-full mx-auto px-4 pt-16 lg:pt-[104px] pb-12">
        {/* Banner */}
        <div className="flex flex-col sm:flex-row gap-6 mt-6 mb-10">
          <div className="w-full sm:w-64 shrink-0">
            <div className="aspect-[2/3] w-full bg-neutral-200 rounded-xl overflow-hidden">
              {movie.poster_url ? (
                <img
                  src={movie.poster_url}
                  alt={movie.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500 text-sm">
                  No Poster
                </div>
              )}
            </div>
          </div>

          <div className="flex-1">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
              {movie.title}
            </h1>

            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600 mt-3">
              <span className="border border-slate-300 rounded px-1.5 py-0.5 text-xs font-semibold">
                {movie.certificate}
              </span>
              <span>{movie.genre}</span>
              <span>•</span>
              <span>{formatDuration(movie.duration_min)}</span>
              <span>•</span>
              <span>{movie.language}</span>
              <span>•</span>
              <span>Released {formatReleaseDate(movie.release_date)}</span>
            </div>

            <p className="text-slate-700 mt-5 leading-relaxed max-w-2xl">
              {movie.synopsis}
            </p>
          </div>
        </div>

        {/* Showtimes */}
        <div className="border-t border-slate-200 pt-8">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Showtimes</h2>

          {dateKeys.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              This movie is currently not showing in {city}.
            </div>
          ) : (
            <>
              {/* Date pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6">
                {dateKeys.map((dk) => (
                  <button
                    key={dk}
                    onClick={() => setSelectedDate(dk)}
                    className={`shrink-0 px-4 py-2 rounded-lg text-sm font-semibold border transition ${
                      activeDate === dk
                        ? "bg-[#7B1E3D] border-[#7B1E3D] text-white"
                        : "bg-white border-slate-200 text-slate-700 hover:border-[#7B1E3D]/40"
                    }`}
                  >
                    {datePillLabel(dk, todayKey)}
                  </button>
                ))}
              </div>

              {/* Venue list */}
              <div className="flex flex-col gap-5">
                {venuesForDate.map((venue) => (
                  <div
                    key={venue.venue_id}
                    className="bg-white border border-slate-200 rounded-xl p-5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 mb-4">
                      <div>
                        <h3 className="font-bold text-slate-900">
                          {venue.venue_name}
                        </h3>
                        {venue.address && (
                          <p className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {venue.address}
                          </p>
                        )}
                      </div>
                    </div>

                    {venue.showtimes.length === 0 ? (
                      <p className="text-sm text-slate-400">
                        No shows on this date
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-3">
                        {venue.showtimes.map((slot) => (
                          <button
                            key={slot.id}
                            onClick={() =>
                              navigate(
                                withCity(
                                  `/showtimes/${slot.id}/seat-map`,
                                  city,
                                ),
                              )
                            }
                            className="flex flex-col items-center border border-slate-200 rounded-lg px-4 py-2 text-sm hover:border-[#7B1E3D] hover:bg-[#7B1E3D]/5 transition"
                          >
                            <span className="font-bold text-slate-900">
                              {istTimeLabel(slot.starts_at)}
                            </span>
                            <span className="text-[11px] text-slate-500 mt-0.5">
                              {slot.screen_name} · {slot.format} ·{" "}
                              {slot.language}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}