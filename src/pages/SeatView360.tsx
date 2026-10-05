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
  distanceM?: number;
  positionType?: "front" | "mid" | "back" | "left" | "right";
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

  // Initialize selected seat
  const [selectedSeatId, setSelectedSeatId] = useState<string | null>(
    activeSeatId || seats[0]?.id || allAuditoriumSeats[0]?.id || null,
  );

  const [showAuditoriumPicker, setShowAuditoriumPicker] = useState(false);

  // Pool of all available seat perspective definitions
  const allSeatPool = useMemo(() => {
    const map = new Map<string, SeatPerspectiveItem>();
    allAuditoriumSeats.forEach((s) => map.set(s.id, s));
    seats.forEach((s) => map.set(s.id, s));
    return map;
  }, [allAuditoriumSeats, seats]);

  const currentSeat = selectedSeatId ? allSeatPool.get(selectedSeatId) || null : null;
  const initialPano = currentSeat?.panoUrl || src;
  const [currentPanoramaSrc, setCurrentPanoramaSrc] = useState(initialPano);

  const [activeZone, setActiveZone] = useState<"front" | "center" | "back">(
    currentSeat?.positionType === "front"
      ? "front"
      : currentSeat?.positionType === "back"
      ? "back"
      : "center",
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

  // Initialize Viewer on container mount or initialPano change
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
  }, [initialPano]);

  // When selected seat changes, smoothly animate camera to that seat's exact angle
  const handleSelectSeat = (seat: SeatPerspectiveItem) => {
    setSelectedSeatId(seat.id);
    if (seat.positionType === "front") setActiveZone("front");
    else if (seat.positionType === "back") setActiveZone("back");
    else setActiveZone("center");

    if (viewerRef.current) {
      viewerRef.current.animate({
        yaw: seat.yaw,
        pitch: seat.pitch,
        zoom: seat.zoom,
        speed: 1000,
      });
    }
  };

  // Jump camera directly to Front, Center, or Back view of screen
  const handleJumpToZone = (zone: "front" | "center" | "back") => {
    setActiveZone(zone);
    setSelectedSeatId(null);
    let targetPitch = 0.04;
    let targetZoom = 50;

    if (zone === "front") {
      targetPitch = 0.18;
      targetZoom = 82;
    } else if (zone === "back") {
      targetPitch = -0.06;
      targetZoom = 22;
    }

    if (viewerRef.current) {
      viewerRef.current.animate({
        yaw: 0,
        pitch: targetPitch,
        zoom: targetZoom,
        speed: 1000,
      });
    }
  };

  const handleResetToCenter = () => {
    if (viewerRef.current) {
      viewerRef.current.animate({
        yaw: currentYaw,
        pitch: currentPitch,
        zoom: currentZoom,
        speed: 800,
      });
    }
  };

  // Human-readable perspective description
  const getAngleDescription = () => {
    if (!currentSeat) {
      if (activeZone === "front") return "Front Row View • Screen towering close overhead • ~3.5m from screen";
      if (activeZone === "back") return "Back Row View • Elevated full auditorium wide overview • ~14.0m from screen";
      return "Center Row View • Prime eye-level sweet spot • ~7.5m from screen";
    }

    const pos = currentSeat.positionType;
    let posText = "Center Row (Prime View)";
    if (pos === "front") posText = "Front Row (Close-up Screen View)";
    else if (pos === "back") posText = "Back Row (Full Hall Overview)";
    else if (pos === "left") posText = "Left Wing Seat (Side Screen View)";
    else if (pos === "right") posText = "Right Wing Seat (Side Screen View)";

    const degYaw = Math.round((currentSeat.yaw * 180) / Math.PI);
    const angleText =
      Math.abs(degYaw) > 5
        ? `${Math.abs(degYaw)}° ${degYaw > 0 ? "left" : "right"}`
        : "center";

    return `${posText} • ${angleText} • ~${currentSeat.distanceM ?? 6.5}m from screen`;
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
                  ? `View from Seat ${currentSeat.label} • Row ${currentSeat.rowLabel}`
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

        {/* Viewpoint Presets: Front / Center / Back View of Screen */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/10 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-gray-400 font-medium mr-1 hidden sm:inline">
              Auditorium View:
            </span>
            <button
              type="button"
              onClick={() => handleJumpToZone("front")}
              className={`px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                activeZone === "front" && !selectedSeatId
                  ? "bg-[#7B1E3D] text-white shadow-md ring-1 ring-white/50"
                  : "bg-white/10 hover:bg-white/20 text-gray-300"
              }`}
            >
              <span>Front View (Close)</span>
            </button>
            <button
              type="button"
              onClick={() => handleJumpToZone("center")}
              className={`px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                activeZone === "center" && !selectedSeatId
                  ? "bg-[#7B1E3D] text-white shadow-md ring-1 ring-white/50"
                  : "bg-white/10 hover:bg-white/20 text-gray-300"
              }`}
            >
              <span>Center View (Prime)</span>
            </button>
            <button
              type="button"
              onClick={() => handleJumpToZone("back")}
              className={`px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                activeZone === "back" && !selectedSeatId
                  ? "bg-[#7B1E3D] text-white shadow-md ring-1 ring-white/50"
                  : "bg-white/10 hover:bg-white/20 text-gray-300"
              }`}
            >
              <span>Back View (Wide)</span>
            </button>
          </div>

          {/* Selected Seats Pills (when user selects specific seats) */}
          {seats.length > 1 && (
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
                  {st.label}
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
            {rowGroups.map(({ row, seats: rSeats }) => (
              <div key={row} className="flex items-center gap-2">
                <span className="w-5 text-[11px] font-bold text-gray-400 text-center shrink-0">
                  {row}
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {rSeats.map((st) => {
                    const isCurrent = st.id === selectedSeatId;
                    return (
                      <button
                        key={st.id}
                        onClick={() => handleSelectSeat(st)}
                        className={`w-7 h-7 rounded text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center ${
                          isCurrent
                            ? "bg-[#2dc492] text-white ring-2 ring-white scale-110 shadow-md"
                            : "bg-white/10 hover:bg-white/25 text-gray-200"
                        }`}
                        title={`Seat ${st.label} • Row ${st.rowLabel} • ~${st.distanceM}m from screen`}
                      >
                        {st.seatNumber}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 360 Viewer Canvas Container */}
      <div ref={containerRef} className="flex-1 w-full h-full" />
    </div>
  );
}
