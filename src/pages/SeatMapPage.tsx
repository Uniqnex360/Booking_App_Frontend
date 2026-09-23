import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
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
  Info,
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
  const [searchParams] = useSearchParams();

  // ─── Strict seat count enforcement from URL param ───
  const requiredSeatCount = Math.min(
    10,
    Math.max(1, parseInt(searchParams.get("qty") || "1", 10) || 1)
  );

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
      const data = await unwrap<SeatMapDetail>(
        api.get(`/showtimes/${id}/seat-map`)
      );
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
      const remaining = Math.max(
        0,
        Math.floor((heldUntil.getTime() - Date.now()) / 1000)
      );
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
      <div className="min-h-screen bg-white text-slate-900 flex flex-col">
        <Header />
        <div className="flex-grow flex items-center justify-center">
          <Loader />
        </div>
        <Footer />
      </div>
    );
  }

  const isSourceUnavailable = mapData?.code === "SOURCE_UNAVAILABLE" || !mapData;
  const isStale =
    mapData?.fetched_at &&
    Date.now() - new Date(mapData.fetched_at).getTime() > 60000;

  // Flatten seats
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
      const nextSeats = selectedSeats.filter(
        (s) => s.seat_ref !== seat.seat_ref
      );
      setSelectedSeats(nextSeats);
      idempotencyKeyRef.current = crypto.randomUUID();
    } else {
      // ─── ENFORCE EXACT SEAT COUNT ───
      if (selectedSeats.length >= requiredSeatCount) {
        toast.warning(
          `You can only select ${requiredSeatCount} ${requiredSeatCount === 1 ? "seat" : "seats"}. Deselect one to change.`
        );
        return;
      }
      setSelectedSeats([...selectedSeats, seat]);
    }
  };

  const handleCheckout = async () => {
    if (selectedSeats.length !== requiredSeatCount) {
      toast.warning(
        `Please select exactly ${requiredSeatCount} ${requiredSeatCount === 1 ? "seat" : "seats"} to continue.`
      );
      return;
    }
    setIsCommitLoading(true);

    try {
      const res = await unwrap<any>(
        api.post(
          `/bookings/hold`,
          {
            showtime_id: id,
            seat_ids: selectedSeats.map((s) => s.seat_ref),
            seat_codes: selectedSeats.map(
              (s) => s.code || `${s.row_label}${s.number}`
            ),
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

        const commitRes = await unwrap<any>(
          api.post(`/bookings/${res.id}/commit`, {
            payment_ref: `no-payment-${crypto.randomUUID()}`,
          })
        );

        toast.success(`Booking confirmed! Ref: ${commitRes.ref_code}`);
        navigate(`/profile`);
      } else {
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

  // Organize into BMS-style price tiers
  const tiers: {
    name: string;
    price_paise: number;
    rows: Record<string, SeatItem[]>;
  }[] = [];

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
    if (priceRupees >= 350) tierName = "RECLINER";
    else if (priceRupees >= 250) tierName = "PRIME PLUS";
    else if (priceRupees >= 200) tierName = "PRIME";

    let existingTier = tiers.find((t) => t.price_paise === rowData.price_paise);
    if (!existingTier) {
      existingTier = {
        name: tierName,
        price_paise: rowData.price_paise,
        rows: {},
      };
      tiers.push(existingTier);
    }
    existingTier.rows[rowLabel] = rowData.seats.sort(
      (a, b) => a.number - b.number
    );
  });

  tiers.sort((a, b) => b.price_paise - a.price_paise); // BMS: expensive on top

  // Find max seat count for aligning rows
  const maxSeatsInRow = Math.max(
    ...Object.values(rawRows).map((r) => r.seats.length),
    0
  );

  const totalPricePaise = selectedSeats.reduce(
    (acc, s) => acc + (s.price_paise || 0),
    0
  );

  const canProceed = selectedSeats.length === requiredSeatCount;

  return (
    <div className="min-h-screen bg-[#F5F5FA] text-slate-900 flex flex-col font-sans select-none pb-32 overflow-x-hidden">
      <Header />

      {/* ─── BMS SUB-HEADER ─── */}
      <div className="bg-[#333338] text-white pt-16 lg:pt-[72px] sticky top-0 z-20 shadow-md">
        <div className="max-w-[1240px] mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition shrink-0"
              title="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-white truncate">
                {mapData?.movie_title || "Select Seats"}
              </h1>
              {mapData && (
                <p className="text-[11px] text-white/60 mt-0.5 truncate">
                  {mapData.cinema_name || mapData.venue_name} •{" "}
                  {mapData.screen_name} •{" "}
                  {new Date(mapData.starts_at).toLocaleDateString([], {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                  ,{" "}
                  {new Date(mapData.starts_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {mapData.format && ` • ${mapData.format}`}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isStale && !isSourceUnavailable && (
              <button
                onClick={fetchSeatMap}
                className="text-[#F84464] bg-white/10 border border-white/20 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-white/20 transition"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Refresh
              </button>
            )}
            {holdId && countdown > 0 && (
              <div className="bg-[#F84464] text-white px-3 py-1.5 rounded-full text-xs font-extrabold flex items-center gap-1 shadow-lg animate-pulse">
                <Clock className="h-3.5 w-3.5" /> {Math.floor(countdown / 60)}:
                {(countdown % 60).toString().padStart(2, "0")}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── SELECTION INSTRUCTION BANNER ─── */}
      <div className="bg-[#F84464]/10 border-b border-[#F84464]/20">
        <div className="max-w-[1240px] mx-auto px-4 py-2.5 flex items-center justify-center gap-2 text-xs sm:text-sm text-[#F84464] font-semibold">
          <Info className="h-4 w-4 shrink-0" />
          <span>
            Please select{" "}
            <span className="font-extrabold">
              {requiredSeatCount} {requiredSeatCount === 1 ? "seat" : "seats"}
            </span>
            {selectedSeats.length > 0 &&
              ` — ${selectedSeats.length}/${requiredSeatCount} selected`}
          </span>
        </div>
      </div>

      <main className="flex-grow max-w-[1240px] w-full mx-auto px-4 py-8 flex flex-col items-center">
        {isSourceUnavailable ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-2xl max-w-lg mx-auto text-center px-6 mt-8">
            <AlertCircle className="h-12 w-12 text-[#F84464] mb-3" />
            <h2 className="text-xl font-bold mb-2">
              Availability temporarily unavailable
            </h2>
            <p className="text-slate-500 text-sm">
              The external ticketing system is unreachable. Please try again.
            </p>
            <button
              onClick={fetchSeatMap}
              className="mt-6 bg-[#F84464] hover:bg-[#E8375A] text-white font-bold py-2.5 px-6 rounded-lg text-sm transition"
            >
              Retry Connection
            </button>
          </div>
        ) : (
          <div className="w-full max-w-4xl flex flex-col items-center">
            {/* SEAT TIERS */}
            <div className="w-full space-y-10 pb-6 flex flex-col items-center px-2">
              {tiers.map((tier) => (
                <div key={tier.price_paise} className="w-full">
                  {/* Tier Title Header */}
                  <div className="text-center mb-4">
                    <div className="text-[11px] font-semibold text-slate-500 tracking-widest">
                      {tier.name} - {formatRupees(tier.price_paise)}
                    </div>
                  </div>

                  {/* Rows in this tier */}
                  <div className="space-y-2 flex flex-col items-center">
                    {Object.entries(tier.rows).map(([rowLabel, seatList]) => {
                      const midIndex = Math.floor(seatList.length / 2);

                      return (
                        <div
                          key={rowLabel}
                          className="flex items-center gap-2 sm:gap-3 justify-center"
                        >
                          {/* Row label left */}
                          <span className="w-4 text-right text-[11px] font-semibold text-slate-500 select-none">
                            {rowLabel}
                          </span>

                          {/* Seats */}
                          <div className="flex items-center gap-1 sm:gap-1.5">
                            {seatList.map((seat, idx) => {
                              const isSelected = selectedSeats.some(
                                (s) => s.seat_ref === seat.seat_ref
                              );
                              const isAisle =
                                idx === midIndex && seatList.length > 8;

                              // BMS seat styling: green outlined available, filled green selected, gray sold
                              let seatStyle = "";
                              if (!seat.is_available) {
                                seatStyle =
                                  "bg-slate-200 border-slate-200 text-slate-400 cursor-not-allowed";
                              } else if (isSelected) {
                                seatStyle =
                                  "bg-[#1EA83C] border-[#1EA83C] text-white font-bold";
                              } else {
                                seatStyle =
                                  "bg-white border-[#1EA83C] text-slate-700 hover:bg-[#1EA83C] hover:text-white cursor-pointer";
                              }

                              return (
                                <div
                                  key={seat.seat_ref}
                                  className="flex items-center"
                                >
                                  {isAisle && <div className="w-4 sm:w-6" />}
                                  <button
                                    disabled={!seat.is_available}
                                    onClick={() => handleSeatClick(seat)}
                                    title={
                                      seat.is_available
                                        ? `Seat ${seat.code} • ${formatRupees(seat.price_paise)}`
                                        : `Seat ${seat.code} (Sold)`
                                    }
                                    className={`w-5 h-5 sm:w-6 sm:h-6 shrink-0 rounded-sm border text-[8px] sm:text-[9px] font-semibold flex items-center justify-center transition-all ${seatStyle}`}
                                  >
                                    {seat.number}
                                  </button>
                                </div>
                              );
                            })}
                          </div>

                          {/* Row label right */}
                          <span className="w-4 text-left text-[11px] font-semibold text-slate-500 select-none">
                            {rowLabel}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* ─── SCREEN AT BOTTOM (BMS style) ─── */}
            <div className="w-full max-w-2xl flex flex-col items-center mt-12 mb-6">
              <div
                className="w-full h-4 relative"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(200,200,210,0.6) 0%, rgba(200,200,210,0) 100%)",
                  borderRadius: "50% 50% 0 0 / 100% 100% 0 0",
                  transform: "perspective(200px) rotateX(-30deg)",
                  boxShadow: "0 -6px 20px rgba(0,0,0,0.08)",
                }}
              />
              <div className="text-[11px] font-semibold tracking-[0.25em] text-slate-400 uppercase mt-4">
                All eyes this way please!
              </div>
            </div>

            {/* SEAT STATUS LEGEND */}
            <div className="flex items-center justify-center gap-6 mt-4 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-sm border border-[#1EA83C] bg-white" />
                <span>Available</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-sm bg-[#1EA83C] border border-[#1EA83C]" />
                <span>Selected</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-sm bg-slate-200 border border-slate-200" />
                <span>Sold</span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ─── BMS FLOATING BOTTOM CHECKOUT BAR ─── */}
      {selectedSeats.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] p-4 z-40">
          <div className="max-w-[1240px] mx-auto flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-xs text-slate-500 truncate">
                <span className="font-semibold text-slate-800">
                  {selectedSeats.length}{" "}
                  {selectedSeats.length === 1 ? "Seat" : "Seats"}:
                </span>{" "}
                <span className="font-bold text-slate-900">
                  {selectedSeats.map((s) => s.code).join(", ")}
                </span>
              </div>
              <div className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5">
                Total: {formatRupees(totalPricePaise)}
              </div>
              {!canProceed && (
                <div className="text-[11px] text-[#F84464] font-semibold mt-0.5">
                  Select {requiredSeatCount - selectedSeats.length} more{" "}
                  {requiredSeatCount - selectedSeats.length === 1
                    ? "seat"
                    : "seats"}{" "}
                  to continue
                </div>
              )}
            </div>

            <button
              onClick={handleCheckout}
              disabled={isCommitLoading || !canProceed}
              className={`font-bold px-8 sm:px-12 py-3.5 rounded-md transition text-sm sm:text-base flex items-center gap-2 shrink-0 ${
                canProceed && !isCommitLoading
                  ? "bg-[#F84464] hover:bg-[#E8375A] text-white cursor-pointer shadow-lg shadow-[#F84464]/20"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              }`}
            >
              {isCommitLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" /> Processing...
                </>
              ) : (
                <>Pay {formatRupees(totalPricePaise)}</>
              )}
            </button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}