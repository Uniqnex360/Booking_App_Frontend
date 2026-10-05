import { useEffect, useRef, useState, useMemo } from "react";
import { Viewer } from "@photo-sphere-viewer/core";
import { GyroscopePlugin } from "@photo-sphere-viewer/gyroscope-plugin";
import { StereoPlugin } from "@photo-sphere-viewer/stereo-plugin";
import "@photo-sphere-viewer/core/index.css";
import { X, Compass, RotateCcw, LayoutGrid } from "lucide-react";

export interface SeatPerspectiveItem {
  id: string;
  label: string;
  rowLabel: string;
  seatNumber: number;
  tierName?: string;
  distanceM?: number;
  positionType?: "silver" | "prime" | "recliner" | "front" | "mid" | "back" | "left" | "right";
  panoUrl?: string;
  yaw: number;
  pitch: number;
  zoom: number;
  angleLabel?: string;
}

export default function SeatView360({
  src,
  title,
  yaw = 0,
  pitch = 0,
  zoom = 40,
  seats = [],
  allAuditoriumSeats = [],
  activeSeatId,
  onClose,
}: {
  src: string;
  title: string;
  yaw?: number;
  pitch?: number;
  zoom?: number;
  seats?: SeatPerspectiveItem[];
  allAuditoriumSeats?: SeatPerspectiveItem[];
  activeSeatId?: string;
  onClose: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);

  // Pool of all available seat perspective definitions
  const allSeatPool = useMemo(() => {
    const map = new Map<string, SeatPerspectiveItem>();
    allAuditoriumSeats.forEach((s) => map.set(s.id, s));
    seats.forEach((s) => map.set(s.id, s));
    return map;
  }, [allAuditoriumSeats, seats]);

  // Selected seat state
  const [selectedSeatId, setSelectedSeatId] = useState<string | null>(
    activeSeatId || seats[0]?.id || null,
  );

  const [showAuditoriumPicker, setShowAuditoriumPicker] = useState(false);

  const currentSeat = selectedSeatId ? allSeatPool.get(selectedSeatId) || null : null;
  const initialPano = currentSeat?.panoUrl || src || "/panoramas/theatre-prime.jpg";
  const [currentPanoramaSrc, setCurrentPanoramaSrc] = useState(initialPano);
  const currentPanoRef = useRef(initialPano);

  const [activeZone, setActiveZone] = useState<"silver" | "prime" | "recliner">(
    currentSeat?.tierName?.toUpperCase().includes("RECLINER") ||
    currentSeat?.positionType === "back" ||
    currentSeat?.positionType === "recliner"
      ? "recliner"
      : currentSeat?.tierName?.toUpperCase().includes("SILVER") ||
        currentSeat?.positionType === "front" ||
        currentSeat?.positionType === "silver"
      ? "silver"
      : "prime",
  );

  const currentYaw = currentSeat ? currentSeat.yaw : yaw;
  const currentPitch = currentSeat ? currentSeat.pitch : pitch;
  const currentZoom = currentSeat ? currentSeat.zoom : zoom;

  // Group all auditorium seats by row for the interactive picker
  const rowGroups = useMemo(() => {
    const groups: Record<string, SeatPerspectiveItem[]> = {};
    allAuditoriumSeats.forEach((st) => {
      if (!groups[st.rowLabel]) groups[st.rowLabel] = [];
      groups[st.rowLabel].push(st);
    });
    return Object.keys(groups)
      .sort()
      .map((row) => ({
        row,
        seats: groups[row].sort((a, b) => a.seatNumber - b.seatNumber),
      }));
  }, [allAuditoriumSeats]);

  // Initialize Viewer once on mount
  useEffect(() => {
    if (!containerRef.current) return;

    const viewer = new Viewer({
      container: containerRef.current,
      panorama: initialPano,
      defaultYaw: currentYaw,
      defaultPitch: currentPitch,
      defaultZoomLvl: currentZoom,
      navbar: ["zoom", "move", "gyroscope", "stereo", "fullscreen"],
      plugins: [GyroscopePlugin, StereoPlugin],
    });

    viewerRef.current = viewer;

    return () => {
      viewerRef.current = null;
      viewer.destroy();
    };
  }, []);

  // Smoothly transition panorama and camera position
  const transitionToPanoAndAngle = (
    newPanoUrl: string,
    targetYaw: number,
    targetPitch: number,
    targetZoom: number,
  ) => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    if (currentPanoRef.current !== newPanoUrl) {
      currentPanoRef.current = newPanoUrl;
      setCurrentPanoramaSrc(newPanoUrl);
      viewer
        .setPanorama(newPanoUrl, {
          position: { yaw: targetYaw, pitch: targetPitch },
          zoom: targetZoom,
          transition: { speed: 800, effect: "fade" },
          showLoader: false,
        })
        .catch((err) => {
          console.warn("Panorama set error:", err);
        });
    } else {
      viewer.animate({
        yaw: targetYaw,
        pitch: targetPitch,
        zoom: targetZoom,
        speed: 800,
      });
    }
  };

  // Handle seat selection
  const handleSelectSeat = (seat: SeatPerspectiveItem) => {
    setSelectedSeatId(seat.id);
    const targetPano = seat.panoUrl || "/panoramas/theatre-prime.jpg";

    if (
      seat.tierName?.toUpperCase().includes("RECLINER") ||
      seat.positionType === "back" ||
      seat.positionType === "recliner"
    ) {
      setActiveZone("recliner");
    } else if (
      seat.tierName?.toUpperCase().includes("SILVER") ||
      seat.positionType === "front" ||
      seat.positionType === "silver"
    ) {
      setActiveZone("silver");
    } else {
      setActiveZone("prime");
    }

    transitionToPanoAndAngle(targetPano, seat.yaw, seat.pitch, seat.zoom);
  };

  // Sync when activeSeatId prop changes
  useEffect(() => {
    if (activeSeatId && activeSeatId !== selectedSeatId) {
      const st = allSeatPool.get(activeSeatId);
      if (st) {
        handleSelectSeat(st);
      }
    }
  }, [activeSeatId]);

  // Jump camera directly to Silver (Front), Prime Plus (Center), or Recliner (Back) tier
  const handleJumpToTier = (tier: "silver" | "prime" | "recliner") => {
    setActiveZone(tier);
    setSelectedSeatId(null);

    let targetPano = "/panoramas/theatre-prime.jpg";
    let targetYaw = 0;
    let targetPitch = 0.04;
    let targetZoom = 44;

    if (tier === "silver") {
      targetPano = "/panoramas/theatre-silver.jpg";
      targetPitch = 0.16;
      targetZoom = 52;
    } else if (tier === "recliner") {
      targetPano = "/panoramas/theatre-recliner.jpg";
      targetPitch = -0.05;
      targetZoom = 36;
    }

    transitionToPanoAndAngle(targetPano, targetYaw, targetPitch, targetZoom);
  };

  const handleResetToCenter = () => {
    if (viewerRef.current) {
      viewerRef.current.animate({
        yaw: currentSeat?.yaw ?? 0,
        pitch:
          currentSeat?.pitch ??
          (activeZone === "silver" ? 0.16 : activeZone === "recliner" ? -0.05 : 0.04),
        zoom:
          currentSeat?.zoom ??
          (activeZone === "silver" ? 52 : activeZone === "recliner" ? 36 : 44),
        speed: 800,
      });
    }
  };

  // Human-readable perspective description
  const getAngleDescription = () => {
    if (!currentSeat) {
      if (activeZone === "silver")
        return "Silver Tier • Screen towering close overhead • ~4.5m from screen";
      if (activeZone === "recliner")
        return "Recliner Tier • Elevated luxury back row wide overview • ~14.5m from screen";
      return "Prime Plus Tier • Eye-level sweet spot auditorium center • ~8.0m from screen";
    }

    const tier =
      currentSeat.tierName ||
      (currentSeat.positionType === "silver" || currentSeat.positionType === "front"
        ? "Silver"
        : currentSeat.positionType === "recliner" || currentSeat.positionType === "back"
        ? "Recliner"
        : "Prime Plus");

    const pos = currentSeat.positionType;
    let posText = `${tier} Tier`;
    if (pos === "left") posText = `${tier} • Left Wing Seat`;
    else if (pos === "right") posText = `${tier} • Right Wing Seat`;

    const degYaw = Math.round((currentSeat.yaw * 180) / Math.PI);
    const angleText =
      Math.abs(degYaw) > 4
        ? `${Math.abs(degYaw)}° ${degYaw > 0 ? "left" : "right"}`
        : "center facing";

    return `${posText} • ${angleText} • ~${currentSeat.distanceM ?? 7.5}m from screen`;
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black flex flex-col select-none">
      {/* Top Bar Header */}
      <div className="bg-black/90 backdrop-blur-md border-b border-white/10 text-white z-10 px-4 py-2.5 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 rounded-full bg-white/10 text-[#2dc492] shrink-0">
              <Compass className="h-4 w-4 animate-spin-slow" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs sm:text-sm font-semibold truncate leading-tight">
                {currentSeat
                  ? `View from Seat ${currentSeat.label} • Row ${currentSeat.rowLabel} (${currentSeat.tierName || "Seat"})`
                  : title}
              </span>
              <span className="text-[10px] sm:text-[11px] text-[#2dc492] font-medium leading-tight mt-0.5">
                {getAngleDescription()}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {allAuditoriumSeats.length > 0 && (
              <button
                onClick={() => setShowAuditoriumPicker(!showAuditoriumPicker)}
                title="Pick any seat in the auditorium"
                className={`p-1.5 rounded-full transition cursor-pointer flex items-center gap-1 text-xs px-2.5 sm:px-3 font-semibold ${
                  showAuditoriumPicker
                    ? "bg-[#2dc492] text-white shadow-md ring-1 ring-white/30"
                    : "bg-white/10 hover:bg-white/20 text-gray-200"
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Pick Any Seat</span>
                <span className="sm:hidden">Seats</span>
              </button>
            )}

            <button
              onClick={handleResetToCenter}
              title="Reset angle to screen"
              className="p-1.5 rounded-full hover:bg-white/15 text-gray-300 hover:text-white transition cursor-pointer flex items-center gap-1 text-[11px] px-2.5 bg-white/5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Center Screen</span>
            </button>

            <button
              onClick={onClose}
              aria-label="Close"
              className="p-1.5 rounded-full hover:bg-white/15 text-gray-300 hover:text-white transition cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Viewpoint Presets: Silver (Front) / Prime Plus (Center) / Recliner (Back) */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/10 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-gray-400 font-medium mr-1 hidden sm:inline">
              Auditorium Tier:
            </span>
            <button
              type="button"
              onClick={() => handleJumpToTier("silver")}
              className={`px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeZone === "silver" && !selectedSeatId
                  ? "bg-[#7B1E3D] text-white shadow-md ring-1 ring-white/50"
                  : "bg-white/10 hover:bg-white/20 text-gray-300"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-slate-300"></span>
              <span>Silver (Front)</span>
            </button>
            <button
              type="button"
              onClick={() => handleJumpToTier("prime")}
              className={`px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeZone === "prime" && !selectedSeatId
                  ? "bg-[#7B1E3D] text-white shadow-md ring-1 ring-white/50"
                  : "bg-white/10 hover:bg-white/20 text-gray-300"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span>Prime Plus (Center)</span>
            </button>
            <button
              type="button"
              onClick={() => handleJumpToTier("recliner")}
              className={`px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeZone === "recliner" && !selectedSeatId
                  ? "bg-[#7B1E3D] text-white shadow-md ring-1 ring-white/50"
                  : "bg-white/10 hover:bg-white/20 text-gray-300"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-purple-400"></span>
              <span>Recliner (Back)</span>
            </button>
          </div>

          {/* Selected Seats Pills (when user selects specific seats) */}
          {seats.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <span className="text-[11px] text-gray-400 font-medium shrink-0">
                Selected:
              </span>
              {seats.map((st) => (
                <button
                  key={st.id}
                  onClick={() => handleSelectSeat(st)}
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold transition cursor-pointer shrink-0 ${
                    st.id === selectedSeatId
                      ? "bg-[#2dc492] text-white shadow-md ring-1 ring-white/40"
                      : "bg-white/10 hover:bg-white/20 text-gray-300"
                  }`}
                >
                  {st.label} ({st.tierName ? st.tierName.split(" ")[0] : st.rowLabel})
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Auditorium Seat Map Picker Drawer */}
      {showAuditoriumPicker && rowGroups.length > 0 && (
        <div className="absolute inset-x-0 bottom-0 max-h-[55vh] bg-black/95 backdrop-blur-xl border-t border-white/20 z-20 flex flex-col p-4 shadow-2xl animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4 text-[#2dc492]" />
              <span className="text-sm font-bold text-white">
                Pick Any Seat in Theatre to View in 360°
              </span>
              <span className="text-xs text-gray-400">
                ({allAuditoriumSeats.length} seats)
              </span>
            </div>
            <button
              onClick={() => setShowAuditoriumPicker(false)}
              className="p-1 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          <div className="overflow-y-auto max-h-[42vh] py-3 space-y-2 no-scrollbar">
            {rowGroups.map(({ row, seats: rSeats }) => {
              const firstSeat = rSeats[0];
              const tierLabel = firstSeat?.tierName || "Standard";
              return (
                <div key={row} className="flex items-center gap-2">
                  <div className="w-16 flex flex-col items-start shrink-0">
                    <span className="text-[11px] font-bold text-gray-200">Row {row}</span>
                    <span className="text-[9px] text-gray-400 font-medium truncate max-w-[60px]">
                      {tierLabel}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap flex-1">
                    {rSeats.map((st) => {
                      const isCurrent = st.id === selectedSeatId;
                      return (
                        <button
                          key={st.id}
                          onClick={() => {
                            handleSelectSeat(st);
                            setShowAuditoriumPicker(false);
                          }}
                          className={`w-7 h-7 rounded text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center ${
                            isCurrent
                              ? "bg-[#2dc492] text-white ring-2 ring-white scale-110 shadow-md"
                              : "bg-white/10 hover:bg-white/25 text-gray-200"
                          }`}
                          title={`Seat ${st.label} • Row ${st.rowLabel} (${st.tierName || "Auditorium"}) • ~${st.distanceM}m from screen`}
                        >
                          {st.seatNumber}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 360 Viewer Canvas Container */}
      <div ref={containerRef} className="flex-1 w-full h-full" />
    </div>
  );
}
