import { useEffect, useState, useRef, useMemo, lazy, Suspense } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
const SeatView360 = lazy(() => import("./SeatView360"));
const PANOS = {
  front: "/panoramas/front.jpg",
  mid: "/panoramas/mid.jpg",
  back: "/panoramas/back.jpg",
};
import { api, unwrap } from "@/api/client";
import { formatRupees } from "@/utils/currencyFormatter";
import {
  ChevronLeft,
  Edit2,
  RefreshCw,
  AlertCircle,
  Clock,
  ZoomIn,
  ZoomOut,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { LoadingPage } from "./LoadingPage";
import { SeatVehicle } from "./SeatVehicle";
import {
  SeatItem,
  SeatMapDetail,
  VenueShowtimeItem,
} from "@/types/movie.types";
import { ensureHoldToken } from "@/lib/holdToken";
export default function SeatMapPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const city = searchParams.get("city") || "";
  const requiredSeatCount = Math.min(
    10,
    Math.max(1, parseInt(searchParams.get("qty") || "2", 10) || 2),
  );
  const [mapData, setMapData] = useState<SeatMapDetail | null>(null);
  const isCoupleScreen = useMemo(() => {
    const sName = (mapData?.screen_name || "").toLowerCase();
    const fmt = (mapData?.format || "").toLowerCase();
    return sName.includes("couple") || fmt.includes("couple");
  }, [mapData]);
  const isCoupleSeat = (seat: SeatItem) =>
    isCoupleScreen || Boolean(seat.is_couple);
  const [loading, setLoading] = useState(true);
  const [selectedSeats, setSelectedSeats] = useState<SeatItem[]>([]);
  const [isCommitLoading, setIsCommitLoading] = useState(false);
  const [viewSrc, setViewSrc] = useState<string | null>(null);
  const [viewOpts, setViewOpts] = useState({ yaw: 0, pitch: 0, zoom: 40 });
  const [holdId, setHoldId] = useState<string | null>(null);
  const [heldUntil, setHeldUntil] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState<number>(0);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [tempTicketCount, setTempTicketCount] =
    useState<number>(requiredSeatCount);
  const [zoom, setZoom] = useState<number>(
  typeof window !== "undefined" && window.innerWidth < 640 ? 0.55 : 1.0,
);
  const idempotencyKeyRef = useRef<string>(crypto.randomUUID());
  const venueShowtimes = useMemo<VenueShowtimeItem[]>(() => {
    try {
      const cached = sessionStorage.getItem("vyhbz_venue_showtimes");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed.showtimes)) {
          return parsed.showtimes;
        }
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  }, [id]);
  const allShowtimes = useMemo(() => {
    if (!mapData) return venueShowtimes;
    const merged = venueShowtimes.some((s) => s.id === id)
      ? venueShowtimes
      : [
          {
            id: id || mapData.showtime_id,
            starts_at: mapData.starts_at,
            format: mapData.format || "4K LASER ATMOS",
            screen_name: mapData.screen_name,
            language: mapData.language,
          },
          ...venueShowtimes,
        ];
    const currentDay = new Date(mapData.starts_at).toDateString();
    const sameDay = merged.filter(
      (s) => new Date(s.starts_at).toDateString() === currentDay,
    );
    return sameDay.sort(
      (a, b) =>
        new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
    );
  }, [venueShowtimes, mapData, id]);
  const fetchSeatMap = async () => {
    setLoading(true);
    try {
      const data = await unwrap<SeatMapDetail>(
        api.get(`/showtimes/${id}/seat-map`),
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
    setTempTicketCount(requiredSeatCount);
  }, [requiredSeatCount]);
  useEffect(() => {
    if (isCoupleScreen && requiredSeatCount % 2 !== 0) {
      const evenQty = Math.max(2, requiredSeatCount + 1);
      const params = new URLSearchParams(searchParams);
      params.set("qty", String(evenQty));
      setSearchParams(params, { replace: true });
      setTempTicketCount(evenQty);
    }
  }, [isCoupleScreen, requiredSeatCount, searchParams, setSearchParams]);
  useEffect(() => {
    if (!heldUntil) return;
    const interval = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.floor((heldUntil.getTime() - Date.now()) / 1000),
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
    return <LoadingPage showFooter={false} />;
  }
  const isSourceUnavailable =
    mapData?.code === "SOURCE_UNAVAILABLE" || !mapData;
  const isStale =
    mapData?.fetched_at &&
    Date.now() - new Date(mapData.fetched_at).getTime() > 60000;
  const allSeats: SeatItem[] = [];
  if (
    mapData?.seats &&
    Array.isArray(mapData.seats) &&
    mapData.seats.length > 0
  ) {
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
  const handleSeatClick = (clickedSeat: SeatItem, rowSeats: SeatItem[]) => {
    if (!clickedSeat.is_available || holdId) return;
    if (isCoupleSeat(clickedSeat)) {
      const partnerNum =
        clickedSeat.number % 2 === 1
          ? clickedSeat.number + 1
          : clickedSeat.number - 1;
      const partnerSeat = rowSeats.find((s) => s.number === partnerNum);
      if (!partnerSeat || !partnerSeat.is_available) {
        toast.error(
          "Both seats of a couple recliner must be available to book.",
        );
        return;
      }
      // If clicked seat or partner is already selected, deselect
      const isAlreadySelected = selectedSeats.some(
        (s) =>
          s.seat_ref === clickedSeat.seat_ref ||
          s.seat_ref === partnerSeat.seat_ref,
      );
      if (isAlreadySelected) {
        setSelectedSeats([]);
        idempotencyKeyRef.current = crypto.randomUUID();
        return;
      }
      // Ensure requiredSeatCount is an even number >= 2
      let effectiveQty = requiredSeatCount;
      if (effectiveQty % 2 !== 0 || effectiveQty < 2) {
        effectiveQty = Math.max(
          2,
          effectiveQty % 2 === 1 ? effectiveQty + 1 : 2,
        );
        const params = new URLSearchParams(searchParams);
        params.set("qty", String(effectiveQty));
        setSearchParams(params, { replace: true });
        setTempTicketCount(effectiveQty);
        toast.info(
          `Couple seats can only be booked in pairs of 2. Quantity updated to ${effectiveQty}.`,
        );
      }
      const pairsNeeded = Math.floor(effectiveQty / 2);
      // Build sorted pairs in this row
      const sortedRow = [...rowSeats].sort((a, b) => a.number - b.number);
      const rowPairs: SeatItem[][] = [];
      for (let i = 0; i < sortedRow.length; i++) {
        const s1 = sortedRow[i];
        if (s1.number % 2 === 1) {
          const s2 = sortedRow.find((s) => s.number === s1.number + 1);
          if (s2) {
            rowPairs.push([s1, s2]);
          }
        }
      }
      const clickedPairIdx = rowPairs.findIndex((p) =>
        p.some((s) => s.seat_ref === clickedSeat.seat_ref),
      );
      if (clickedPairIdx === -1) return;
      // Try contiguous window of pairs
      for (let shift = 0; shift < pairsNeeded; shift++) {
        const startIdx = clickedPairIdx - shift;
        const endIdx = startIdx + pairsNeeded;
        if (startIdx >= 0 && endIdx <= rowPairs.length) {
          const candidatePairs = rowPairs.slice(startIdx, endIdx);
          const allAvailable = candidatePairs.every((pair) =>
            pair.every((s) => s.is_available),
          );
          if (allAvailable) {
            setSelectedSeats(candidatePairs.flat());
            idempotencyKeyRef.current = crypto.randomUUID();
            return;
          }
        }
      }
      // Fallback: select just the clicked pair
      setSelectedSeats([clickedSeat, partnerSeat]);
      idempotencyKeyRef.current = crypto.randomUUID();
      return;
    }
    const isAlreadySelected = selectedSeats.some(
      (s) => s.seat_ref === clickedSeat.seat_ref,
    );
    if (isAlreadySelected) {
      setSelectedSeats([]);
      idempotencyKeyRef.current = crypto.randomUUID();
      return;
    }
    const sortedRow = [...rowSeats].sort((a, b) => a.number - b.number);
    const clickedIdx = sortedRow.findIndex(
      (s) => s.seat_ref === clickedSeat.seat_ref,
    );
    if (clickedIdx === -1) return;
    if (
      selectedSeats.length === requiredSeatCount &&
      selectedSeats.every((s) => s.row_label === clickedSeat.row_label)
    ) {
      const selIdxs = selectedSeats
        .map((s) => sortedRow.findIndex((r) => r.seat_ref === s.seat_ref))
        .filter((i) => i !== -1)
        .sort((a, b) => a - b);
      if (selIdxs.length === requiredSeatCount) {
        const firstIdx = selIdxs[0];
        const lastIdx = selIdxs[selIdxs.length - 1];
        let start = -1;
        if (clickedIdx === lastIdx + 1) {
          start = clickedIdx - requiredSeatCount + 1;
        } else if (clickedIdx === firstIdx - 1) {
          start = clickedIdx;
        }
        if (start >= 0 && start + requiredSeatCount <= sortedRow.length) {
          const win = sortedRow.slice(start, start + requiredSeatCount);
          const ok =
            win.every((s) => s.is_available) &&
            win.every((s, i) => i === 0 || s.number === win[i - 1].number + 1);
          if (ok) {
            setSelectedSeats(win);
            idempotencyKeyRef.current = crypto.randomUUID();
            return;
          }
        }
      }
    }
    for (let shift = 0; shift < requiredSeatCount; shift++) {
      const startIdx = clickedIdx - shift;
      const endIdx = startIdx + requiredSeatCount;
      if (startIdx >= 0 && endIdx <= sortedRow.length) {
        const candidateWindow = sortedRow.slice(startIdx, endIdx);
        const allAvailable = candidateWindow.every((s) => s.is_available);
        const isContiguous = candidateWindow.every((s, i) => {
          if (i === 0) return true;
          return s.number === candidateWindow[i - 1].number + 1;
        });
        if (allAvailable && isContiguous) {
          setSelectedSeats(candidateWindow);
          idempotencyKeyRef.current = crypto.randomUUID();
          return;
        }
      }
    }
    setSelectedSeats([clickedSeat]);
    idempotencyKeyRef.current = crypto.randomUUID();
  };
  const handlePayClick = () => {
    if (selectedSeats.length !== requiredSeatCount) {
      toast.warning(
        `Please select exactly ${requiredSeatCount} contiguous seats.`,
      );
      return;
    }
    handleProceed(); // hold seats, go to food page
  };
  const handleProceed = async () => {
    const saved = JSON.parse(
      localStorage.getItem("vyhbz_contact_details") || "{}",
    );
    const headers: Record<string, string> = {
      "Idempotency-Key": idempotencyKeyRef.current,
    };
    if (!user) {
      headers["X-Hold-Token"] = ensureHoldToken();
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
              (s) => s.code || `${s.row_label}${s.number}`,
            ),
            contact_email: saved.email ?? user?.email ?? null,
            contact_phone: saved.phone ?? (user as any)?.phone ?? null,
          },
          { headers },
        ),
      );
      navigate(
        `/bookings/${res.id}/food${city ? `?city=${encodeURIComponent(city)}` : ""}`,
      );
    } catch (err: any) {
      if (err.code === "SEAT_UNAVAILABLE_REMOTE") {
        toast.error(
          "One or more selected seats were just taken. Refreshing...",
        );
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
  const handleSeatCountConfirm = (newCount: number) => {
    setShowTicketModal(false);
    setSelectedSeats([]);
    const params = new URLSearchParams(searchParams);
    params.set("qty", String(newCount));
    setSearchParams(params, { replace: true });
  };
  const tiers: {
    name: string;
    price_paise: number;
    rows: Record<string, SeatItem[]>;
  }[] = [];
  const rawRows: Record<string, { price_paise: number; seats: SeatItem[] }> =
    {};
  allSeats.forEach((seat) => {
    if (!rawRows[seat.row_label]) {
      rawRows[seat.row_label] = { price_paise: seat.price_paise, seats: [] };
    }
    rawRows[seat.row_label].seats.push(seat);
  });
  Object.entries(rawRows).forEach(([rowLabel, rowData]) => {
    let tierName = "CLASSIC";
    const priceRupees = rowData.price_paise / 100;
    if (isCoupleScreen) {
      tierName =
        priceRupees >= 480 ? "COUPLE ROYAL LOUNGER" : "COUPLE RECLINER";
    } else {
      if (priceRupees >= 350) tierName = "RECLINER";
      else if (priceRupees >= 250) tierName = "PRIME PLUS";
      else if (priceRupees >= 200) tierName = "GOLD";
      else if (priceRupees >= 150) tierName = "SILVER";
    }
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
      (a, b) => a.number - b.number,
    );
  });
  if (isCoupleScreen) {
    tiers.sort((a, b) => {
      const aFirst = Object.keys(a.rows).sort()[0];
      const bFirst = Object.keys(b.rows).sort()[0];
      return aFirst.localeCompare(bFirst);
    });
  } else {
    tiers.sort((a, b) => b.price_paise - a.price_paise);
  }
  const totalPricePaise = selectedSeats.reduce(
    (acc, s) => acc + (s.price_paise || 0),
    0,
  );
  const rowOrder = Object.keys(rawRows).sort();
  const FRONT_M = 4.5;
  const PITCH_M = isCoupleScreen ? 1.4 : 1.1;
  const rowDistances: Record<string, number> = {};
  rowOrder.forEach((r, i) => {
    rowDistances[r] = Number((FRONT_M + i * PITCH_M).toFixed(1));
  });
  const distVals = Object.values(rowDistances);
  const frontDist = distVals.length ? Math.min(...distVals) : null;
  const backDist = distVals.length ? Math.max(...distVals) : null;
  const selRow = selectedSeats[0]?.row_label;
  const selDist = selRow ? rowDistances[selRow] : undefined;
  const panoForRow = (row?: string) => {
    const i = row ? rowOrder.indexOf(row) : -1;
    const f = rowOrder.length > 1 && i >= 0 ? i / (rowOrder.length - 1) : 0.5;
    return f < 0.34 ? PANOS.front : f < 0.67 ? PANOS.mid : PANOS.back;
  };

  const buildViewOpts = () => {
    if (selectedSeats.length === 0) return { yaw: 0, pitch: 0, zoom: 40 };
    const row = selectedSeats[0].row_label;
    const nums = (rawRows[row]?.seats || []).map((s) => s.number);
    const minN = Math.min(...nums);
    const maxN = Math.max(...nums);
    const avgNum =
      selectedSeats.reduce((a, s) => a + s.number, 0) / selectedSeats.length;
    const colFrac = maxN > minN ? (avgNum - minN) / (maxN - minN) : 0.5;
    return { yaw: (0.5 - colFrac) * 0.8, pitch: 0, zoom: 40 };
  };
  const canProceed = selectedSeats.length === requiredSeatCount;
  const splitIntoBlocks = (seats: SeatItem[]) => {
    const len = seats.length;
    if (len <= 8) return [seats];
    if (len <= 14) {
      const left = Math.ceil(len / 2);
      return [seats.slice(0, left), seats.slice(left)];
    }
    const edge = Math.min(8, Math.floor(len / 4));
    const rightStart = len - edge;
    return [
      seats.slice(0, edge),
      seats.slice(edge, rightStart),
      seats.slice(rightStart),
    ];
  };
  const formattedDate = mapData?.starts_at
    ? new Date(mapData.starts_at).toLocaleDateString("en-US", {
        weekday: "short",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";
  const formattedTime = mapData?.starts_at
    ? new Date(mapData.starts_at).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : "";
  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col font-sans select-none overflow-x-hidden">
      <header className="bg-white border-b border-gray-200 py-2.5 sticky top-0 z-30 shadow-xs">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate(-1)}
              className="p-1 text-gray-700 hover:text-black hover:bg-gray-100 rounded-full transition cursor-pointer shrink-0"
              title="Back"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <div className="min-w-0">
              <p className="text-sm sm:text-base text-gray-900 font-bold truncate leading-tight">
                {mapData?.movie_title}
              </p>
              <p className="text-[11px] sm:text-xs text-gray-500 font-normal mt-0.5 truncate leading-tight">
                {mapData?.cinema_name || mapData?.venue_name}
                {city ? `: ${city}` : ""} | {formattedDate} | {formattedTime}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {isStale && !isSourceUnavailable && (
              <button
                onClick={fetchSeatMap}
                className="text-[#7B1E3D] hover:bg-[#7B1E3D]/10 border border-[#7B1E3D]/30 px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Refresh
              </button>
            )}
            {holdId && countdown > 0 && (
              <div className="bg-[#7B1E3D] text-white px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-sm animate-pulse">
                <Clock className="h-3 w-3" /> {Math.floor(countdown / 60)}:
                {(countdown % 60).toString().padStart(2, "0")}
              </div>
            )}
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-gray-500 font-semibold shrink-0 px-2.5 py-1 border border-gray-200 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
              {allSeats.length} seats
            </div>
            <button
              onClick={() => setShowTicketModal(true)}
              className="border border-[#7B1E3D] text-[#7B1E3D] hover:bg-[#7B1E3D]/5 px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
              title="Change seat count"
            >
              <Edit2 className="h-3 w-3" />
              <span>
                {requiredSeatCount}{" "}
                {requiredSeatCount === 1 ? "Ticket" : "Tickets"}
              </span>
            </button>
          </div>
        </div>
      </header>
      {allShowtimes.length > 1 && (
        <div className="bg-gray-50 border-b border-gray-100 shadow-2xs">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-2.5 flex items-center gap-2.5 overflow-x-auto no-scrollbar">
            {allShowtimes.map((s) => {
              const isCurrent = s.id === id;
              const hasStarted = new Date(s.starts_at).getTime() <= Date.now();
              const timeLabel = new Date(s.starts_at).toLocaleTimeString(
                "en-US",
                {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                },
              );
              const subLabel = s.format || mapData?.format || "4K LASER ATMOS";
              if (isCurrent) {
                return (
                  <div
                    key={s.id}
                    className="bg-[#2dc492] text-white rounded px-3.5 py-1 text-center shadow-xs shrink-0 cursor-default"
                  >
                    <div className="text-xs font-bold leading-tight">
                      {timeLabel}
                    </div>
                    <div className="text-[9px] font-medium text-white/90 uppercase tracking-wide leading-tight">
                      {subLabel}
                    </div>
                  </div>
                );
              }
              if (hasStarted) {
                return (
                  <button
                    key={s.id}
                    disabled
                    title="Show has already started"
                    className="bg-amber-50 border border-amber-200 text-amber-600 rounded px-3.5 py-1 text-center cursor-not-allowed shrink-0"
                  >
                    <div className="text-xs font-bold leading-tight">
                      {timeLabel}
                    </div>
                    <div className="text-[9px] font-medium text-amber-500 uppercase tracking-wide leading-tight">
                      {subLabel}
                    </div>
                  </button>
                );
              }
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    navigate(
                      `/showtimes/${s.id}/seat-map?qty=${requiredSeatCount}${
                        city ? `&city=${encodeURIComponent(city)}` : ""
                      }`,
                    );
                  }}
                  className="bg-white border border-gray-300 hover:border-[#2dc492] text-gray-800 rounded px-3.5 py-1 text-center cursor-pointer transition shrink-0 hover:shadow-xs"
                >
                  <div className="text-xs font-bold text-gray-800 leading-tight">
                    {timeLabel}
                  </div>
                  <div className="text-[9px] font-medium text-[#2dc492] uppercase tracking-wide leading-tight">
                    {subLabel}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
      <main
        className={`flex-grow bg-white flex flex-col items-center justify-start py-8 overflow-auto relative ${
          selectedSeats.length > 0 ? "pb-40" : "pb-12"
        }`}
      >
        {isSourceUnavailable ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white border border-gray-200 rounded-2xl max-w-lg mx-auto text-center px-6 mt-8 shadow-xs">
            <AlertCircle className="h-12 w-12 text-[#7B1E3D] mb-3" />
            <h2 className="text-xl font-bold mb-2 text-gray-900">
              Availability temporarily unavailable
            </h2>
            <p className="text-gray-500 text-sm">
              The external ticketing system is unreachable. Please try again.
            </p>
            <button
              onClick={fetchSeatMap}
              className="mt-6 bg-[#7B1E3D] hover:bg-[#5C0F2A] text-white font-bold py-2.5 px-6 rounded-lg text-sm transition cursor-pointer"
            >
              Retry Connection
            </button>
          </div>
        ) : (
          <div
            className="w-max min-w-full mx-auto px-4 sm:px-6 flex flex-col items-center transition-transform duration-150 origin-top-left lg:origin-top"
            style={{ transform: `scale(${zoom})` }}
          >
            <div className="flex items-start">
              <div className="w-full flex flex-col items-center">
                {tiers.map((tier) => (
                  <div
                    key={tier.price_paise}
                    className="w-full flex flex-col items-start my-3"
                  >
                    <div className="w-full flex items-center my-5 select-none">
                      <div className="flex-grow h-px bg-gray-200" />
                      <span className="px-4 text-xs font-semibold text-gray-500 tracking-wider uppercase flex items-center gap-2">
                        {formatRupees(tier.price_paise)} {tier.name}
                        {isCoupleScreen && (
                          <span className="text-[10px] font-bold text-[#7B1E3D] bg-[#7B1E3D]/10 border border-[#7B1E3D]/25 px-2 py-0.5 rounded-full normal-case">
                            Booked in pairs of 2 •{" "}
                            {formatRupees(tier.price_paise * 2)}/pair
                          </span>
                        )}
                      </span>
                      <div className="flex-grow h-px bg-gray-200" />
                    </div>
                    <div className="space-y-1.5 flex flex-col items-center w-full">
                      {Object.entries(tier.rows).map(([rowLabel, seatList]) => {
                        const blocks = splitIntoBlocks(seatList);
                        const rowIsCouple =
                          seatList.some((s) => s.is_couple) || isCoupleScreen;
                        return (
                          <div
                            key={rowLabel}
                            className="grid select-none"
                            style={{
                              gridTemplateColumns: "28px 1px 1fr",
                              columnGap: "16px",
                              width: "100%",
                              maxWidth: "1180px",
                            }}
                          >
                            <div className="flex items-center justify-center">
                              <span className="text-gray-400 font-semibold text-[10px] sm:text-xs select-none">
                                {rowLabel}
                              </span>
                            </div>
                            <div className="bg-gray-100 self-stretch" />
                            <div className="flex items-center justify-center">
                              {rowIsCouple ? (
                                <div className="flex items-center gap-3 sm:gap-4 flex-wrap justify-center">
                                  {(() => {
                                    const sorted = [...seatList].sort(
                                      (a, b) => a.number - b.number,
                                    );
                                    const pairs: SeatItem[][] = [];
                                    for (let i = 0; i < sorted.length; i += 2) {
                                      if (
                                        i + 1 < sorted.length &&
                                        sorted[i].number % 2 === 1 &&
                                        sorted[i + 1].number ===
                                          sorted[i].number + 1
                                      ) {
                                        pairs.push([sorted[i], sorted[i + 1]]);
                                      } else {
                                        pairs.push([sorted[i]]);
                                      }
                                    }
                                    return pairs.map((pair, pIdx) => {
                                      const isPairSelected = pair.every((s) =>
                                        selectedSeats.some(
                                          (sel) => sel.seat_ref === s.seat_ref,
                                        ),
                                      );
                                      const isPairSold = pair.some(
                                        (s) => !s.is_available,
                                      );
                                      return (
                                        <div
                                          key={pIdx}
                                          className={`group/pair relative flex items-center rounded-[5px] transition-all ${
                                            isPairSelected
                                              ? "ring-2 ring-[#1ea83c] shadow-xs"
                                              : isPairSold
                                                ? "opacity-60 cursor-not-allowed"
                                                : "hover:ring-1 hover:ring-[#1ea83c]"
                                          }`}
                                        >
                                          {pair.map((seat, sIdx) => {
                                            const isSelected =
                                              selectedSeats.some(
                                                (s) =>
                                                  s.seat_ref === seat.seat_ref,
                                              );
                                            const isLeft = sIdx === 0;
                                            const isRight = sIdx === 1;
                                            let seatStyle = "";
                                            if (
                                              !seat.is_available ||
                                              isPairSold
                                            ) {
                                              seatStyle =
                                                "bg-[#EEEEEE] border border-[#EEEEEE] text-transparent cursor-not-allowed";
                                            } else if (isSelected) {
                                              seatStyle =
                                                "bg-[#1ea83c] border border-[#1ea83c] text-white font-bold shadow-2xs";
                                            } else if (seat.is_bestseller) {
                                              seatStyle =
                                                "bg-white border border-[#f5a623] text-[#f5a623] hover:bg-[#f5a623] hover:text-white cursor-pointer";
                                            } else {
                                              seatStyle =
                                                "bg-white border border-[#1ea83c] text-[#1ea83c] group-hover/pair:bg-[#1ea83c] group-hover/pair:text-white cursor-pointer";
                                            }
                                            const rounding =
                                              pair.length === 2
                                                ? isLeft
                                                  ? "rounded-l-[5px] rounded-r-none border-r-0"
                                                  : "rounded-r-[5px] rounded-l-none border-l-0"
                                                : "rounded-[3px]";
                                            return (
                                              <button
                                                key={seat.seat_ref}
                                                disabled={
                                                  !seat.is_available ||
                                                  isPairSold ||
                                                  Boolean(holdId)
                                                }
                                                onClick={() =>
                                                  handleSeatClick(
                                                    seat,
                                                    seatList,
                                                  )
                                                }
                                                title={
                                                  seat.is_available &&
                                                  !isPairSold
                                                    ? `Couple Seat ${seat.code || `${seat.row_label}${seat.number}`} • ${formatRupees(
                                                        seat.price_paise,
                                                      )} (Booked in pairs of 2)`
                                                    : `Couple Seat ${seat.code || `${seat.row_label}${seat.number}`} (Sold)`
                                                }
                                                className={`w-7 h-7 sm:w-8 sm:h-8 text-[9px] sm:text-[10px] font-medium flex items-center justify-center transition-all ${rounding} ${seatStyle}`}
                                              >
                                                {String(seat.number).padStart(
                                                  2,
                                                  "0",
                                                )}
                                              </button>
                                            );
                                          })}
                                        </div>
                                      );
                                    });
                                  })()}
                                </div>
                              ) : (
                                blocks.map((block, bIdx) => (
                                  <div key={bIdx} className="flex items-center">
                                    {bIdx > 0 && (
                                      <div className="w-4 sm:w-6 shrink-0" />
                                    )}
                                    <div className="flex items-center gap-1 sm:gap-1.5">
                                      {block.map((seat) => {
                                        const isSelected = selectedSeats.some(
                                          (s) => s.seat_ref === seat.seat_ref,
                                        );
                                        let seatStyle = "";
                                        if (!seat.is_available) {
                                          seatStyle =
                                            "bg-[#EEEEEE] border border-[#EEEEEE] text-transparent cursor-not-allowed";
                                        } else if (isSelected) {
                                          seatStyle =
                                            "bg-[#1ea83c] border border-[#1ea83c] text-white font-bold shadow-2xs";
                                        } else if (seat.is_bestseller) {
                                          seatStyle =
                                            "bg-white border border-[#f5a623] text-[#f5a623] hover:bg-[#f5a623] hover:text-white cursor-pointer";
                                        } else {
                                          seatStyle =
                                            "bg-white border border-[#1ea83c] text-[#1ea83c] hover:bg-[#1ea83c] hover:text-white cursor-pointer";
                                        }
                                        return (
                                          <button
                                            key={seat.seat_ref}
                                            disabled={
                                              !seat.is_available ||
                                              Boolean(holdId)
                                            }
                                            onClick={() =>
                                              handleSeatClick(seat, seatList)
                                            }
                                            title={
                                              seat.is_available
                                                ? `Seat ${seat.code || `${seat.row_label}${seat.number}`} • ${formatRupees(
                                                    seat.price_paise,
                                                  )}`
                                                : `Seat ${seat.code || `${seat.row_label}${seat.number}`} (Sold)`
                                            }
                                            className={`w-6 h-6 sm:w-7 sm:h-7 rounded-[3px] text-[9px] sm:text-[10px] font-medium flex items-center justify-center transition-all ${seatStyle}`}
                                          >
                                            {String(seat.number).padStart(
                                              2,
                                              "0",
                                            )}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                <div className="w-full flex flex-col items-center mt-12 mb-8 select-none">
                  <div className="w-64 sm:w-80 h-7 relative flex items-center justify-center">
                    <svg
                      viewBox="0 0 320 28"
                      className="w-full h-full drop-shadow-[0_4px_12px_rgba(144,202,249,0.35)]"
                    >
                      <defs>
                        <linearGradient
                          id="bmsScreenGrad"
                          x1="0%"
                          y1="0%"
                          x2="0%"
                          y2="100%"
                        >
                          <stop
                            offset="0%"
                            stopColor="#dff0fc"
                            stopOpacity="0.95"
                          />
                          <stop
                            offset="100%"
                            stopColor="#f3f8fd"
                            stopOpacity="0.4"
                          />
                        </linearGradient>
                      </defs>
                      <polygon
                        points="15,2 305,2 280,26 40,26"
                        fill="url(#bmsScreenGrad)"
                        stroke="#90caf9"
                        strokeWidth="1.5"
                      />
                    </svg>
                  </div>
                  <div className="text-xs text-gray-400 font-normal mt-3 tracking-normal select-none">
                    All eyes this way please
                  </div>
                  {frontDist !== null && backDist !== null && (
                    <div className="mt-2 flex items-center gap-4 text-[11px] text-gray-500">
                      <span>
                        Screen → front row:{" "}
                        <b className="text-gray-800">~{frontDist} m</b>
                      </span>
                      <span>
                        Screen → back row:{" "}
                        <b className="text-gray-800">~{backDist} m</b>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        {!isSourceUnavailable && (
          <button
            onClick={() => {
              setViewOpts({ yaw: 0, pitch: 0, zoom: 40 });
              setViewSrc(PANOS.mid);
            }}
            className="mt-3 text-xs font-semibold text-[#7B1E3D] border border-[#7B1E3D]/30 px-3 py-1.5 rounded-full hover:bg-[#7B1E3D]/5 cursor-pointer"
          >
            Explore theatre in 360°
          </button>
        )}
      </main>
      <div className="fixed bottom-40 right-4 sm:right-6 flex flex-col gap-2 z-20">
        <button
          onClick={() =>
            setZoom((z) => Math.min(1.4, Number((z + 0.1).toFixed(1))))
          }
          className="w-8 h-8 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-50 active:scale-95 transition cursor-pointer"
          title="Zoom In"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          onClick={() =>
            setZoom((z) => Math.max(0.4, Number((z - 0.1).toFixed(1))))
          }
          className="w-8 h-8 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-50 active:scale-95 transition cursor-pointer"
          title="Zoom Out"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
      </div>
      {selectedSeats.length > 0 && (
<div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 pt-3 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] z-40 flex flex-col items-center justify-center shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">          <div className="flex items-center gap-3 text-xs text-gray-600 mb-2">
            {selDist !== undefined && (
              <span>
                Row {selRow}: <b>~{selDist} m</b> from screen
              </span>
            )}
            <button
              onClick={() => {
                setViewOpts(buildViewOpts());
                setViewSrc(panoForRow(selRow));
              }}
              className="text-[#7B1E3D] font-semibold underline cursor-pointer"
            >
              View from your seat
            </button>
          </div>
          <button
            onClick={handlePayClick}
            disabled={isCommitLoading || !canProceed}
            className={`w-full max-w-sm sm:max-w-md font-bold py-3.5 px-8 rounded-lg transition text-sm sm:text-base flex items-center justify-center gap-2 shadow-md ${
              canProceed && !isCommitLoading
                ? "bg-[#7B1E3D] hover:bg-[#5C0F2A] text-white cursor-pointer shadow-[#7B1E3D]/25 active:scale-[0.99]"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            {isCommitLoading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" /> Processing...
              </>
            ) : (
              <>Proceed • {formatRupees(totalPricePaise)}</>
            )}
          </button>
        </div>
      )}
      <footer
        className={`sticky bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30 shadow-[0_-2px_8px_rgba(0,0,0,0.04)] select-none transition-all ${
          selectedSeats.length > 0 ? "mb-28 sm:mb-28" : ""
        }`}
      >
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-2 flex items-center justify-center gap-5 sm:gap-8 text-xs text-gray-600 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded-[2px] border border-[#1ea83c] bg-white" />
            <span>Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded-[2px] bg-[#EEEEEE] border border-[#EEEEEE]" />
            <span>Sold</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded-[2px] border border-[#f5a623] bg-white flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-[#f5a623]" />
            </div>
            <span className="flex items-center gap-1">
              Bestseller
              <Info className="h-3 w-3 text-gray-400" />
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded-[2px] bg-[#1ea83c] border border-[#1ea83c]" />
            <span>Selected</span>
          </div>
          {isCoupleScreen && (
            <div className="flex items-center gap-2 bg-[#7B1E3D]/5 border border-[#7B1E3D]/25 px-2.5 py-0.5 rounded-full">
              <div className="flex items-center">
                <span className="w-2.5 h-3 rounded-l-[2px] border border-[#7B1E3D] bg-white" />
                <span className="w-2.5 h-3 rounded-r-[2px] border border-l-0 border-[#7B1E3D] bg-white" />
              </div>
              <span className="text-[#7B1E3D] font-bold text-[11px]">
                Couple Seats (Pairs of 2)
              </span>
            </div>
          )}
        </div>
        <div className="border-t border-gray-100 py-1.5 px-4 sm:px-8 flex items-center justify-between text-[11px] text-gray-500 bg-[#FAFAFA]">
          <span className="hidden sm:inline text-gray-400 font-mono text-[10px]">
            1/3
          </span>
        </div>
      </footer>
      {showTicketModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowTicketModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-[420px] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pt-6 pb-2 text-center">
              <h2 className="text-lg font-bold text-gray-900">
                How many seats?
              </h2>
              {isCoupleScreen && (
                <p className="text-xs text-[#7B1E3D] font-semibold mt-1">
                  Couple Recliner: Select tickets in pairs of 2 (2, 4, 6, 8, 10)
                </p>
              )}
            </div>
            <div className="flex items-center justify-center py-4">
              <SeatVehicle count={tempTicketCount} />
            </div>
            <div className="flex items-center justify-between px-6 pt-2 pb-5 overflow-hidden select-none">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
                const isOddOnCouple = isCoupleScreen && n % 2 !== 0;
                return (
                  <button
                    key={n}
                    type="button"
                    disabled={isOddOnCouple}
                    onClick={() => {
                      if (isOddOnCouple) {
                        toast.info(
                          "Couple seats can only be booked in pairs of 2.",
                        );
                        return;
                      }
                      setTempTicketCount(n);
                    }}
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold transition shrink-0 ${
                      isOddOnCouple
                        ? "text-gray-300 bg-gray-50 cursor-not-allowed line-through opacity-50"
                        : tempTicketCount === n
                          ? "bg-[#7B1E3D] text-white shadow-md font-bold cursor-pointer"
                          : "text-gray-700 hover:bg-gray-100 cursor-pointer"
                    }`}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
            <div className="border-t border-gray-100 px-6 py-4">
              <div className="flex items-center justify-around text-center gap-3">
                {tiers.map((t, idx) => (
                  <div key={idx} className="flex flex-col items-center">
                    <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                      {t.name}
                    </span>
                    <span className="text-sm sm:text-base font-bold text-gray-900 mt-0.5">
                      {formatRupees(t.price_paise)}
                    </span>
                    <span className="text-[10px] font-bold uppercase mt-0.5 text-[#34A853]">
                      AVAILABLE
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 bg-white border-t border-gray-100">
              <button
                type="button"
                onClick={() => handleSeatCountConfirm(tempTicketCount)}
                className="w-full bg-[#7B1E3D] hover:bg-[#5C0F2A] text-white font-bold py-3 rounded-lg text-sm transition cursor-pointer shadow-md"
              >
                Select Seats
              </button>
            </div>
          </div>
        </div>
      )}
      {viewSrc && (
        <Suspense fallback={null}>
          <SeatView360
            src={viewSrc}
            title={`${mapData?.screen_name || "Theatre"} • Demo view (approx)`}
            yaw={viewOpts.yaw}
            pitch={viewOpts.pitch}
            zoom={viewOpts.zoom}
            onClose={() => setViewSrc(null)}
          />
        </Suspense>
      )}
    </div>
  );
}
