import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Loader } from "@/components/common/Loader";
import { api, unwrap } from "@/api/client";
import { formatRupees } from "@/utils/currencyFormatter";
import { ArrowLeft, RefreshCw, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface SeatItem {
  seat_ref: string;
  row_label: string;
  number: number;
  code: string;
  price_paise: number;
  is_available: boolean;
}

interface SeatMapDetail {
  showtime_id: string;
  movie_title: string;
  screen_name: string;
  cinema_name: string;
  starts_at: string;
  fetched_at: string;
  seats: SeatItem[];
  code?: string;
}

export default function SeatMapPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [mapData, setMapData] = useState<SeatMapDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSeats, setSelectedSeats] = useState<SeatItem[]>([]);
  const [isCommitLoading, setIsCommitLoading] = useState(false);

  const [holdId, setHoldId] = useState<string | null>(null);
  const [heldUntil, setHeldUntil] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState<number>(0);

  const idempotencyKeyRef = useRef<string>(crypto.randomUUID());

  const fetchSeatMap = async () => {
    setLoading(true);
    try {
      const data = await unwrap<SeatMapDetail>(api.get(`/showtimes/${id}/seat-map`));
      setMapData(data);
      setSelectedSeats([]);
    } catch (err) {
      console.error("Failed to load seat map", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSeatMap();
  }, [id]);

  useEffect(() => {
    if (!heldUntil) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((heldUntil.getTime() - Date.now()) / 1000));
      setCountdown(remaining);
      if (remaining === 0) {
        clearInterval(interval);
        toast.error("Hold expired! Please select seats again.");
        setHoldId(null);
        setHeldUntil(null);
        fetchSeatMap();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [heldUntil]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex flex-col">
        <Header />
        <div className="flex-grow flex items-center justify-center">
          <Loader />
        </div>
        <Footer />
      </div>
    );
  }

  const isSourceUnavailable = mapData?.code === "SOURCE_UNAVAILABLE" || !mapData;
  const isStale = mapData && (Date.now() - new Date(mapData.fetched_at).getTime()) > 60000;

  const handleSeatClick = (seat: SeatItem) => {
    if (!seat.is_available || holdId) return;

    const isSelected = selectedSeats.some((s) => s.seat_ref === seat.seat_ref);
    if (isSelected) {
      const nextSeats = selectedSeats.filter((s) => s.seat_ref !== seat.seat_ref);
      setSelectedSeats(nextSeats);
      idempotencyKeyRef.current = crypto.randomUUID();
    } else {
      if (selectedSeats.length >= 10) {
        toast.warning("Maximum 10 seats allowed per booking.");
        return;
      }
      setSelectedSeats([...selectedSeats, seat]);
    }
  };

  const handleCheckout = async () => {
    if (selectedSeats.length === 0) return;
    setIsCommitLoading(true);

    try {
      const res = await unwrap<any>(
        api.post(
          `/bookings/hold`,
          {
            showtime_id: id,
            seat_ids: selectedSeats.map((s) => s.seat_ref),
          },
          {
            headers: {
              "Idempotency-Key": idempotencyKeyRef.current,
            },
          }
        )
      );

      if (res.status === "HELD") {
        setHoldId(res.id);
        setHeldUntil(new Date(res.held_until));
        toast.success(`Seats held! Confirming ticket...`);
        const commitRes = await unwrap<any>(api.post(`/bookings/${res.id}/commit`, {}));
        toast.success(`Booking confirmed! Ref: ${commitRes.ref_code}`);
        navigate(`/profile`);
      } else {
        toast.success(`Booking confirmed successfully!`);
        navigate(`/profile`);
      }
    } catch (err: any) {
      if (err.code === "SEAT_UNAVAILABLE_REMOTE") {
        toast.error("One or more selected seats are unavailable. Refreshing...");
        fetchSeatMap();
      } else if (err.code === "HOLD_EXPIRED") {
        toast.error("Hold expired. Please select seats again.");
        fetchSeatMap();
      } else {
        toast.error(err.message || "Booking failed.");
      }
    } finally {
      setIsCommitLoading(false);
    }
  };

  const rows: Record<string, SeatItem[]> = {};
  mapData?.seats?.forEach((seat) => {
    if (!rows[seat.row_label]) rows[seat.row_label] = [];
    rows[seat.row_label].push(seat);
  });

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col">
      <Header />
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => navigate(-1)} className="text-sm text-neutral-400 hover:text-white flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          {isStale && !isSourceUnavailable && (
            <button onClick={fetchSeatMap} className="text-amber-500 flex items-center gap-1.5 text-sm font-semibold">
              <RefreshCw className="h-4 w-4 animate-spin" /> Seat Map is stale (click to refresh)
            </button>
          )}
        </div>

        {isSourceUnavailable ? (
          <div className="flex flex-col items-center justify-center py-20 bg-neutral-900 border border-neutral-800 rounded-xl max-w-2xl mx-auto">
            <AlertCircle className="h-12 w-12 text-neutral-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">Availability is temporarily unavailable</h2>
            <p className="text-neutral-400 text-sm text-center px-6">
              The external ticketing system is currently unreachable. Please try again.
            </p>
            <button onClick={fetchSeatMap} className="mt-6 bg-neutral-800 hover:bg-neutral-700 text-white font-bold py-2 px-6 rounded-lg text-sm transition">
              Retry Connection
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800 rounded-xl p-8 flex flex-col items-center">
              <div className="w-full max-w-md h-3 border-t-2 border-neutral-600 rounded-b-full text-center text-xs text-neutral-500 uppercase tracking-widest mb-16">
                Cinema Screen
              </div>

              <div className="space-y-3 w-full flex flex-col items-center">
                {Object.entries(rows).map(([label, seatList]) => (
                  <div key={label} className="flex items-center gap-4">
                    <span className="w-6 text-right text-xs font-bold text-neutral-500">{label}</span>
                    <div className="flex items-center gap-1.5">
                      {seatList.map((seat) => {
                        const isSelected = selectedSeats.some((s) => s.seat_ref === seat.seat_ref);
                        let bg = "bg-neutral-800 hover:bg-neutral-700 border-neutral-700";
                        if (!seat.is_available) bg = "bg-neutral-950 border-neutral-900 text-neutral-800 cursor-not-allowed";
                        if (isSelected) bg = "bg-amber-500 border-amber-600 text-black";

                        return (
                          <button
                            key={seat.seat_ref}
                            disabled={!seat.is_available}
                            onClick={() => handleSeatClick(seat)}
                            title={seat.is_available ? `Seat ${seat.code} (${formatRupees(seat.price_paise)})` : `Seat ${seat.code} (Unavailable)`}
                            className={`w-7 h-7 rounded border text-[10px] font-bold flex items-center justify-center transition ${bg}`}
                          >
                            {seat.number}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
              <h2 className="text-xl font-bold border-b border-neutral-800 pb-4 mb-4">{mapData.movie_title}</h2>
              <div className="text-neutral-400 text-sm space-y-1 mb-6">
                <p>{mapData.cinema_name} • {mapData.screen_name}</p>
                <p>{new Date(mapData.starts_at).toLocaleString()}</p>
              </div>

              {holdId && countdown > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-lg p-3 text-center text-sm font-bold mb-6 animate-pulse">
                  Seats held! Complete checkout in {countdown}s
                </div>
              )}

              <div className="space-y-4">
                <div className="flex justify-between text-sm text-neutral-400">
                  <span>Selected Seats:</span>
                  <span className="font-bold text-white">{selectedSeats.map((s) => s.code).join(", ") || "None"}</span>
                </div>
                <div className="flex justify-between text-sm text-neutral-400">
                  <span>Price total:</span>
                  <span className="font-bold text-amber-500 text-lg">
                    {formatRupees(selectedSeats.reduce((acc, s) => acc + s.price_paise, 0))}
                  </span>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={selectedSeats.length === 0 || isCommitLoading}
                  className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-neutral-800 disabled:text-neutral-500 disabled:cursor-not-allowed text-black font-bold py-3 rounded-lg transition flex items-center justify-center gap-2"
                >
                  {isCommitLoading ? <RefreshCw className="h-5 w-5 animate-spin" /> : "Confirm Seats"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
