import { useEffect, useRef, useState } from "react";
import { Viewer } from "@photo-sphere-viewer/core";
import { GyroscopePlugin } from "@photo-sphere-viewer/gyroscope-plugin";
import { StereoPlugin } from "@photo-sphere-viewer/stereo-plugin";
import "@photo-sphere-viewer/core/index.css";
import { X, Compass, RotateCcw } from "lucide-react";

export interface SeatPerspectiveItem {
  id: string;
  label: string;
  rowLabel: string;
  seatNumber: number;
  distanceM?: number;
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
  activeSeatId,
  onClose,
}: {
  src: string;
  title: string;
  yaw?: number;
  pitch?: number;
  zoom?: number;
  seats?: SeatPerspectiveItem[];
  activeSeatId?: string;
  onClose: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);

  // Initialize selected seat
  const [selectedSeatId, setSelectedSeatId] = useState<string | null>(
    activeSeatId || seats[0]?.id || null,
  );

  const currentSeat = seats.find((s) => s.id === selectedSeatId) || null;

  const currentYaw = currentSeat ? currentSeat.yaw : yaw;
  const currentPitch = currentSeat ? currentSeat.pitch : pitch;
  const currentZoom = currentSeat ? currentSeat.zoom : zoom;

  // Initialize Viewer on container mount or src change
  useEffect(() => {
    if (!containerRef.current) return;

    const viewer = new Viewer({
      container: containerRef.current,
      panorama: src,
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
  }, [src]);

  // When selected seat changes, smoothly animate to the new seat perspective
  const handleSelectSeat = (seat: SeatPerspectiveItem) => {
    setSelectedSeatId(seat.id);
    if (viewerRef.current) {
      viewerRef.current.animate({
        yaw: seat.yaw,
        pitch: seat.pitch,
        zoom: seat.zoom,
        speed: 1200,
      });
    }
  };

  const handleResetToCenter = () => {
    if (viewerRef.current) {
      viewerRef.current.animate({
        yaw: currentYaw,
        pitch: currentPitch,
        zoom: currentZoom,
        speed: 1000,
      });
    }
  };

  // Human-readable angle description
  const getAngleDescription = () => {
    if (!currentSeat) {
      return "Central overview • Cinema screen centered";
    }
    const degYaw = Math.round((currentSeat.yaw * 180) / Math.PI);
    const degPitch = Math.round((currentSeat.pitch * 180) / Math.PI);

    let hText = "Center view";
    if (degYaw > 8) hText = `Left side (${Math.abs(degYaw)}° angle)`;
    else if (degYaw < -8) hText = `Right side (${Math.abs(degYaw)}° angle)`;

    let vText = "Eye-level";
    if (degPitch > 10) vText = `Looking up (${degPitch}° tilt)`;
    else if (degPitch < -4) vText = `Elevated view (${Math.abs(degPitch)}° down)`;

    return `${hText} • ${vText} • ~${currentSeat.distanceM ?? 5.5} m from screen`;
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

        {/* Seat Switcher Bar (when multiple seats are selected) */}
        {seats.length > 1 && (
          <div className="flex items-center gap-2 pt-1 border-t border-white/10 overflow-x-auto no-scrollbar">
            <span className="text-[11px] text-gray-400 font-medium shrink-0">
              Switch Seat View:
            </span>
            <div className="flex items-center gap-1.5">
              {seats.map((st) => {
                const isActive = st.id === selectedSeatId;
                return (
                  <button
                    key={st.id}
                    onClick={() => handleSelectSeat(st)}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                      isActive
                        ? "bg-[#2dc492] text-white shadow-md ring-2 ring-white/40 scale-105"
                        : "bg-white/10 hover:bg-white/20 text-gray-200"
                    }`}
                  >
                    <span>Seat {st.label}</span>
                    {st.distanceM && (
                      <span className="text-[10px] opacity-75 font-normal">
                        ({st.distanceM}m)
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 360 Viewer Canvas Container */}
      <div ref={containerRef} className="flex-1 w-full h-full" />
    </div>
  );
}
