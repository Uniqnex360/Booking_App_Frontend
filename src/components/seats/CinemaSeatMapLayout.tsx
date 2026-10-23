import React, { useState } from "react";
import { formatRupees } from "@/utils/currencyFormatter";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

export interface CinemaSeat {
  id: string;
  row_label: string;
  seat_number?: number;
  number?: number;
  code?: string;
  price_paise?: number;
  status: "AVAILABLE" | "BOOKED" | "BLOCKED" | "LOCKED";
  blocked_reason?: string;
  is_couple?: boolean;
}

interface CinemaSeatMapLayoutProps {
  seats: CinemaSeat[];
  selectedSeatIds: string[];
  onToggleSeat: (seatId: string) => void;
  screenText?: string;
  className?: string;
  isCoupleScreen?: boolean;
}

export function CinemaSeatMapLayout({
  seats,
  selectedSeatIds,
  onToggleSeat,
  screenText = "All eyes this way please",
  className = "",
  isCoupleScreen = false,
}: CinemaSeatMapLayoutProps) {
  const [zoom, setZoom] = useState(1.0);

  const getTierName = (pricePaise?: number) => {
    if (!pricePaise) return "CLASSIC";
    const priceRupees = pricePaise / 100;
    if (priceRupees >= 350) return "RECLINER";
    if (priceRupees >= 250) return "PRIME PLUS";
    if (priceRupees >= 200) return "GOLD";
    if (priceRupees >= 150) return "SILVER";
    return "CLASSIC";
  };

  const splitIntoBlocks = (seatList: CinemaSeat[]) => {
    const len = seatList.length;
    if (len <= 8) return [seatList];
    if (len <= 14) {
      const left = Math.ceil(len / 2);
      return [seatList.slice(0, left), seatList.slice(left)];
    }
    const edge = Math.min(8, Math.floor(len / 4));
    const rightStart = len - edge;
    return [
      seatList.slice(0, edge),
      seatList.slice(edge, rightStart),
      seatList.slice(rightStart),
    ];
  };

  // Group seats by tier and row
  const rawRows: Record<string, { price_paise: number; seats: CinemaSeat[] }> = {};
  seats.forEach((seat) => {
    const price = seat.price_paise || 25000;
    if (!rawRows[seat.row_label]) {
      rawRows[seat.row_label] = { price_paise: price, seats: [] };
    }
    rawRows[seat.row_label].seats.push(seat);
  });

  const tiers: {
    name: string;
    price_paise: number;
    rows: Record<string, CinemaSeat[]>;
  }[] = [];

  Object.entries(rawRows).forEach(([rowLabel, rowData]) => {
    const tierName = isCoupleScreen
      ? (rowData.price_paise / 100 >= 480 ? "COUPLE ROYAL LOUNGER" : "COUPLE RECLINER")
      : getTierName(rowData.price_paise);

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
      (a, b) => (a.number ?? a.seat_number ?? 0) - (b.number ?? b.seat_number ?? 0)
    );
  });

  tiers.sort((a, b) => b.price_paise - a.price_paise);

  return (
    <div className={`w-full flex flex-col items-center bg-white rounded-2xl p-4 sm:p-6 select-none ${className}`}>
      {/* Zoom Controls Bar */}
      <div className="w-full flex items-center justify-between pb-4 border-b border-gray-100 mb-6">
        <span className="text-xs font-semibold text-gray-500">
          Auditorium View ({seats.length} total seats)
        </span>
        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-full px-2 py-1 shadow-xs">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.6, Number((z - 0.1).toFixed(1))))}
            className="w-6 h-6 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-200 transition cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-bold text-slate-700 w-10 text-center select-none">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(1.4, Number((z + 0.1).toFixed(1))))}
            className="w-6 h-6 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-200 transition cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoom(1.0)}
            className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-slate-200 transition cursor-pointer ml-1"
            title="Reset Zoom"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Main Seat Map Container with Zoom Scale */}
      <div className="w-full overflow-x-auto overflow-y-visible py-4 flex justify-center">
        <div
          className="w-max min-w-[540px] px-4 flex flex-col items-center transition-transform duration-150 origin-top"
          style={{ transform: `scale(${zoom})` }}
        >
          {tiers.length === 0 ? (
            <p className="text-xs text-gray-400 py-12">No seat arrangements configured for this auditorium.</p>
          ) : (
            tiers.map((tier) => (
              <div key={tier.price_paise} className="w-full flex flex-col items-start my-3">
                {/* Tier Name & Price Divider */}
                <div className="w-full flex items-center my-4 select-none">
                  <div className="flex-grow h-px bg-gray-200" />
                  <span className="px-4 text-[11px] sm:text-xs font-semibold text-gray-500 tracking-wider uppercase flex items-center gap-2">
                    {formatRupees(tier.price_paise)} {tier.name}
                  </span>
                  <div className="flex-grow h-px bg-gray-200" />
                </div>

                {/* Rows Grid */}
                <div className="space-y-2 flex flex-col items-center w-full">
                  {Object.entries(tier.rows)
                    .sort(([rowA], [rowB]) =>
                      rowB.localeCompare(rowA, undefined, { numeric: true })
                    )
                    .map(([rowLabel, seatList]) => {
                      const blocks = splitIntoBlocks(seatList);
                      return (
                        <div
                          key={rowLabel}
                          className="grid select-none"
                          style={{
                            gridTemplateColumns: "28px 1px 1fr",
                            columnGap: "16px",
                            width: "100%",
                            maxWidth: "1050px",
                          }}
                        >
                          {/* Row Letter */}
                          <div className="flex items-center justify-center cursor-default">
                            <span className="text-gray-400 font-semibold text-[10px] sm:text-xs select-none">
                              {rowLabel}
                            </span>
                          </div>

                          {/* Thin Divider Line */}
                          <div className="bg-gray-100 self-stretch" />

                          {/* Seat Blocks with Aisles */}
                          <div className="flex items-center justify-center">
                            {blocks.map((block, bIdx) => (
                              <div key={bIdx} className="flex items-center">
                                {bIdx > 0 && <div className="w-4 sm:w-6 shrink-0" />}
                                <div className="flex items-center gap-1 sm:gap-1.5">
                                  {block.map((seat) => {
                                    const isSelected = selectedSeatIds.includes(seat.id);
                                    const isBooked = seat.status === "BOOKED" || seat.status === "LOCKED";
                                    const isBlocked = seat.status === "BLOCKED";

                                    let seatStyle = "";
                                    if (isBooked) {
                                      seatStyle = "bg-[#EEEEEE] border border-[#EEEEEE] text-gray-400 cursor-not-allowed";
                                    } else if (isSelected) {
                                      seatStyle = "bg-[#1ea83c] border border-[#1ea83c] text-white font-bold shadow-xs scale-105 z-10 cursor-pointer";
                                    } else if (isBlocked) {
                                      seatStyle = "bg-amber-100 border border-amber-400 text-amber-800 font-bold hover:bg-amber-200 cursor-pointer";
                                    } else {
                                      seatStyle = "bg-white border border-[#1ea83c] text-[#1ea83c] hover:bg-[#1ea83c]/15 cursor-pointer";
                                    }

                                    return (
                                      <button
                                        key={seat.id}
                                        type="button"
                                        disabled={isBooked}
                                        onClick={() => onToggleSeat(seat.id)}
                                        title={`Seat ${seat.code || `${seat.row_label}${seat.number ?? seat.seat_number ?? ""}`} • Status: ${seat.status}${
                                          seat.blocked_reason ? ` (${seat.blocked_reason})` : ""
                                        }${isBooked ? " (Booked by customer - cannot modify)" : ""}`}
                                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-[3px] text-[9px] sm:text-[10px] font-medium flex items-center justify-center transition-all focus:outline-none touch-manipulation select-none active:scale-95 ${seatStyle}`}
                                      >
                                        {String(seat.number ?? seat.seat_number ?? "").padStart(2, "0")}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            ))
          )}

          {/* Authentic BookMyShow-Style Trapezoid Screen SVG */}
          <div className="w-full flex flex-col items-center mt-12 mb-6 select-none">
            <div className="w-72 sm:w-96 md:w-[440px] h-8 sm:h-9 relative flex items-center justify-center">
              <svg
                viewBox="0 0 320 28"
                className="w-full h-full drop-shadow-[0_4px_12px_rgba(144,202,249,0.35)]"
              >
                <defs>
                  <linearGradient id="bmsScreenGradCinema" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#dff0fc" stopOpacity="0.95" />
                    <stop offset="100%" stopColor="#f3f8fd" stopOpacity="0.4" />
                  </linearGradient>
                </defs>
                <polygon
                  points="15,2 305,2 280,26 40,26"
                  fill="url(#bmsScreenGradCinema)"
                  stroke="#90caf9"
                  strokeWidth="1.5"
                />
              </svg>
            </div>
            <div className="text-sm sm:text-base text-gray-500 font-medium mt-3.5 tracking-wide select-none">
              {screenText}
            </div>
          </div>
        </div>
      </div>

      {/* Customer-Perspective Seating Legend */}
      <div className="w-full flex flex-wrap items-center justify-center gap-4 sm:gap-6 pt-5 mt-4 border-t border-gray-100 text-xs">
        <div className="flex items-center gap-2 text-gray-600 font-medium">
          <div className="w-4 h-4 rounded-[3px] bg-white border border-[#1ea83c]" />
          <span>Available (Live on User App)</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600 font-medium">
          <div className="w-4 h-4 rounded-[3px] bg-[#1ea83c] border border-[#1ea83c]" />
          <span>Selected for Action</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600 font-medium">
          <div className="w-4 h-4 rounded-[3px] bg-[#EEEEEE] border border-[#EEEEEE]" />
          <span>Booked by Customers</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600 font-medium">
          <div className="w-4 h-4 rounded-[3px] bg-amber-100 border border-amber-400" />
          <span>Blocked / VIP Hold (Hidden from Users)</span>
        </div>
      </div>
    </div>
  );
}

