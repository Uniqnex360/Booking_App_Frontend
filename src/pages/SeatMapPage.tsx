import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Loader } from "@/components/common/Loader";
import { api, unwrap } from "@/api/client";
import { formatRupees } from "@/utils/currencyFormatter";
import {
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  Clock,
  ChevronRight,
  Ticket,
  Tv,
} from "lucide-react";
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
  cinema_name?: string;
  venue_name?: string;
  starts_at: string;
  fetched_at?: string;
  seats?: SeatItem[];
  rows?: any[];
  code?: string;
  format?: string;
  language?: string;
}

function loadScript(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
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
      <div className="min-h-screen bg-neutral-50 text-slate-900 flex flex-col">
        <Header />
        <div className="flex-grow flex items-center justify-center">
          <Loader />
        </div>
        <Footer />
      </div>
    );
  }

  const isSourceUnavailable = mapData?.code === "SOURCE_UNAVAILABLE" || !mapData;
  const isStale = mapData?.fetched_at && (Date.now() - new Date(mapData.fetched_at).getTime()) > 60000;

  // Flatten seats across both provider format and self-hosted nested rows format
  const allSeats: SeatItem[] = [];
  if (mapData?.seats && Array.isArray(mapData.seats) && mapData.seats.length > 0) {
    allSeats.push(...mapData.seats);
  } else if (mapData?.rows && Array.isArray(mapData.rows)) {
    mapData.rows.forEach((r: any) => {
      if (r.seats && Array.isArray(r.seats)) {
        r.seats.forEach((s: any) => {
          allSeats.push({
            seat_ref: s.seat_id || s.id,
            row_label: r.label,
            number: s.number,
            code: s.code,
            price_paise: s.price_paise || r.price_paise || 25000,
            is_available: s.status === "AVAILABLE",
          });
        });
      }
    });
  }

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

  const startRazorpayPayment = async (booking: any) => {
    const isLoaded = await loadScript("https://checkout.razorpay.com/v1/checkout.js");
    if (!isLoaded) {
      toast.error("Failed to load payment gateway. Check your connection.");
      setIsCommitLoading(false);
      return;
    }

    const options = {
      key: import.meta.env.VITE_RAZORPAY_KEY || "rzp_test_VyBhZExTMTk5",
      amount: booking.total_paise,
      currency: booking.currency || "INR",
      name: "Vyhbz Cinemas",
      description: `${mapData?.movie_title || "Movie Ticket"} (${selectedSeats.length} Seats)`,
      handler: async function (response: any) {
        toast.info("Payment verified! Confirming seats...");
        try {
          const commitRes = await unwrap<any>(
            api.post(`/bookings/${booking.id}/commit`, {
              payment_ref: response.razorpay_payment_id,
            })
          );
          toast.success(`Booking confirmed! Ref: ${commitRes.ref_code}`);
          navigate(`/profile`);
        } catch (err: any) {
          toast.error(err.message || "Commitment failed after payment.");
        } finally {
          setIsCommitLoading(false);
        }
      },
      prefill: {
        name: "Customer",
        email: "customer@vybhz.com",
        contact: "9876543210",
      },
      theme: {
        color: "#f59e0b",
      },
      modal: {
        ondismiss: function () {
          toast.warning("Payment cancelled.");
          setIsCommitLoading(false);
        },
      },
    };

    const rzp = new (window as any).Razorpay(options);
    rzp.open();
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

      // Commit immediately — no payment gateway
      const commitRes = await unwrap<any>(
        api.post(`/bookings/${res.id}/commit`, {
          payment_ref: `no-payment-${crypto.randomUUID()}`, // or omit if backend allows
        })
      );

      toast.success(`Booking confirmed! Ref: ${commitRes.ref_code}`);
      navigate(`/profile`);
    } else {
      // Backend returned something other than HELD (e.g. immediately CONFIRMED)
      toast.success(`Booking confirmed successfully!`);
      navigate(`/profile`);
    }
  } catch (err: any) {
    if (err.code === "SEAT_UNAVAILABLE_REMOTE") {
      toast.error("One or more selected seats were just taken. Refreshing...");
      fetchSeatMap();
    } else if (err.code === "HOLD_EXPIRED") {
      toast.error("Hold expired. Please select seats again.");
      fetchSeatMap();
    } else {
      toast.error(err.message || "Booking failed.");
    }
    setIsCommitLoading(false);
  }
};

  // Organize seats into BookMyShow-style Price Tiers
  const tiers: { name: string; price_paise: number; rows: Record<string, SeatItem[]> }[] = [];
  
  const rawRows: Record<string, { price_paise: number; seats: SeatItem[] }> = {};
  allSeats.forEach((seat) => {
    if (!rawRows[seat.row_label]) {
      rawRows[seat.row_label] = { price_paise: seat.price_paise, seats: [] };
    }
    rawRows[seat.row_label].seats.push(seat);
  });

  Object.entries(rawRows).forEach(([rowLabel, rowData]) => {
    let tierName = "CLASSIC";
    const priceRupees = rowData.price_paise / 100;
    if (priceRupees >= 350) tierName = "RECLINER / VIP";
    else if (priceRupees >= 250) tierName = "PRIME PLUS";
    else if (priceRupees >= 200) tierName = "PREMIUM";

    let existingTier = tiers.find((t) => t.price_paise === rowData.price_paise);
    if (!existingTier) {
      existingTier = { name: tierName, price_paise: rowData.price_paise, rows: {} };
      tiers.push(existingTier);
    }
    existingTier.rows[rowLabel] = rowData.seats.sort((a, b) => a.number - b.number);
  });

  tiers.sort((a, b) => a.price_paise - b.price_paise);

  const totalPricePaise = selectedSeats.reduce((acc, s) => acc + (s.price_paise || 0), 0);

  return (
    <div className="min-h-screen bg-neutral-50 text-slate-900 flex flex-col font-sans select-none pb-28 overflow-x-hidden">
      <Header />

      {/* TOP BMS SUB-HEADER BAR */}
      <div className="bg-white border-b border-slate-200 pt-20 pb-4 sticky top-0 z-20 backdrop-blur-md bg-white/90 shadow-md">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-neutral-100 rounded-full text-slate-500 hover:text-slate-900 transition"
              title="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-tight flex items-center gap-2">
                {mapData?.movie_title || "Select Seats"}
                {mapData?.format && (
                  <span className="text-[10px] bg-neutral-100 text-slate-500 font-bold px-2 py-0.5 rounded border border-slate-200">
                    {mapData.format}
                  </span>
                )}
              </h1>
              {mapData && (
                <p className="text-xs text-slate-500 mt-0.5">
                  {mapData.cinema_name || mapData.venue_name} • {mapData.screen_name} |{" "}
                  <span className="text-amber-400 font-semibold">
                    {new Date(mapData.starts_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  {", "}
                  {new Date(mapData.starts_at).toLocaleDateString([], { month: "short", day: "numeric" })}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isStale && !isSourceUnavailable && (
              <button
                onClick={fetchSeatMap}
                className="text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-amber-500/20 transition"
              >
                <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Stale (Refresh)
              </button>
            )}
            {holdId && countdown > 0 && (
              <div className="bg-amber-500 text-black px-3 py-1 rounded-full text-xs font-extrabold flex items-center gap-1 shadow-lg animate-pulse">
                <Clock className="h-3.5 w-3.5" /> {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
              </div>
            )}
          </div>
        </div>
      </div>

      <main className="flex-grow max-w-7xl w-full mx-auto px-4 py-8 flex flex-col items-center">
        {isSourceUnavailable ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-2xl max-w-lg mx-auto text-center px-6 mt-8">
            <AlertCircle className="h-12 w-12 text-rose-500 mb-3" />
            <h2 className="text-xl font-bold mb-2">Availability is temporarily unavailable</h2>
            <p className="text-slate-500 text-sm">
              The external ticketing system is currently unreachable. Please try again.
            </p>
            <button
              onClick={fetchSeatMap}
              className="mt-6 bg-neutral-100 hover:bg-slate-200 text-slate-900 font-bold py-2.5 px-6 rounded-xl text-sm transition"
            >
              Retry Connection
            </button>
          </div>
        ) : (
          <div className="w-full max-w-4xl flex flex-col items-center">
            
            {/* BMS CINEMA SCREEN ARC */}
            <div className="w-full max-w-xl flex flex-col items-center mb-14 mt-4">
              <div className="w-full h-3 border-t-[3px] border-amber-400/80 rounded-t-[100%] shadow-[0_-8px_20px_rgba(245,158,11,0.25)] mb-3" />
              <div className="text-[11px] font-bold tracking-[0.25em] text-slate-500 uppercase flex items-center gap-1.5">
                <Tv className="h-3.5 w-3.5" /> All Eyes This Way Please (Screen)
              </div>
            </div>

            {/* SEAT TIERS */}
           <div className="w-full space-y-10 pb-6 flex flex-col items-center px-2">
              {tiers.map((tier) => (
                <div key={tier.price_paise} className="w-full max-w-3xl">
                  {/* Tier Title Header */}
                  <div className="border-b border-slate-200/80 pb-2 mb-4 flex items-center justify-between text-xs font-bold text-slate-500 tracking-wider">
                    <span>{tier.name}</span>
                    <span className="text-amber-400 font-extrabold">{formatRupees(tier.price_paise)}</span>
                  </div>

                  {/* Rows in this tier */}
                  <div className="space-y-2.5 flex flex-col items-center">
                    {Object.entries(tier.rows).map(([rowLabel, seatList]) => {
                      const midIndex = Math.floor(seatList.length / 2);

                      return (
                       <div key={rowLabel} className="flex items-center gap-1 sm:gap-2 flex-wrap justify-center max-w-full">
                          <span className="w-5 text-right text-xs font-bold text-slate-500 select-none">
                            {rowLabel}
                          </span>

                          <div className="flex items-center gap-1.5">
                            {seatList.map((seat, idx) => {
                              const isSelected = selectedSeats.some((s) => s.seat_ref === seat.seat_ref);
                              const isAisle = idx === midIndex && seatList.length > 8;

                              let seatStyle = "bg-white border-slate-200 text-slate-700 hover:border-amber-400 hover:bg-neutral-100";
                              if (!seat.is_available) {
                                seatStyle = "bg-white/40 border-slate-200/50 text-slate-700 cursor-not-allowed";
                              } else if (isSelected) {
                                seatStyle = "bg-amber-500 border-amber-400 text-black font-extrabold shadow-[0_0_12px_rgba(245,158,11,0.5)] scale-105";
                              }

                              return (
                                <div key={seat.seat_ref} className="flex items-center">
                                  {isAisle && <div className="w-6" />}
                                  <button
                                    disabled={!seat.is_available}
                                    onClick={() => handleSeatClick(seat)}
                                    title={
                                      seat.is_available
                                        ? `Seat ${seat.code} • ${formatRupees(seat.price_paise)}`
                                        : `Seat ${seat.code} (Unavailable)`
                                    }
                                   className={`w-6 h-6 sm:w-7 sm:h-7 shrink-0 rounded-lg border text-[9px] sm:text-[10px] font-bold flex items-center justify-center transition-all duration-150 ${seatStyle}`}
                                  >
                                    {seat.number}
                                  </button>
                                </div>
                              );
                            })}
                          </div>

                         
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* SEAT STATUS LEGEND */}
            <div className="flex items-center justify-center gap-6 mt-8 py-3 px-6 bg-white/80 border border-slate-200 rounded-full text-xs font-medium text-slate-500">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border border-neutral-600 bg-white" />
                <span>Available</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-amber-500 border border-amber-400 shadow-sm" />
                <span className="text-slate-900 font-semibold">Selected</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-white/40 border border-slate-200 text-slate-700" />
                <span>Sold / Unavailable</span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* BMS FLOATING BOTTOM CHECKOUT BAR */}
      {selectedSeats.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 border-t border-slate-200 backdrop-blur-lg p-4 z-40 shadow-2xl transition-transform duration-300">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
            <div>
              <div className="text-xs text-slate-500 flex items-center gap-1.5">
                <Ticket className="h-3.5 w-3.5 text-amber-500" />
                <span>{selectedSeats.length} {selectedSeats.length === 1 ? 'Seat' : 'Seats'}:</span>
                <span className="font-extrabold text-slate-900">{selectedSeats.map((s) => s.code).join(", ")}</span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-amber-400 mt-0.5">
                {formatRupees(totalPricePaise)}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={handleCheckout}
                disabled={isCommitLoading}
                className="bg-amber-500 hover:bg-amber-600 active:scale-95 disabled:bg-neutral-100 disabled:text-slate-500 text-black font-extrabold px-8 py-3.5 rounded-xl transition shadow-[0_0_20px_rgba(245,158,11,0.3)] flex items-center gap-2 text-sm sm:text-base cursor-pointer"
              >
                {isCommitLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" /> Processing...
                  </>
                ) : (
                  <>
                    Pay {formatRupees(totalPricePaise)} <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
