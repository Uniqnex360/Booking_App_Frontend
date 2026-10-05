import { useEffect, useRef } from "react";
import { Viewer } from "@photo-sphere-viewer/core";
import { GyroscopePlugin } from "@photo-sphere-viewer/gyroscope-plugin";
import { StereoPlugin } from "@photo-sphere-viewer/stereo-plugin";
import "@photo-sphere-viewer/core/index.css";
import { X, Compass } from "lucide-react";

export default function SeatView360({
  src,
  title,
  yaw = 0,
  pitch = 0,
  zoom = 40,
  onClose,
}: {
  src: string;
  title: string;
  yaw?: number;
  pitch?: number;
  zoom?: number;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const viewer = new Viewer({
      container: ref.current,
      panorama: src,
      defaultYaw: yaw,
      defaultPitch: pitch,
      defaultZoomLvl: zoom,
      navbar: ["zoom", "move", "gyroscope", "stereo", "fullscreen"],
      plugins: [GyroscopePlugin, StereoPlugin],
    });
    return () => {
      viewer.destroy();
    };
  }, [src, yaw, pitch, zoom]);

  return (
    <div className="fixed inset-0 z-[70] bg-black flex flex-col">
      <div className="flex items-center justify-between px-4 py-2.5 bg-black/85 backdrop-blur-md border-b border-white/10 text-white z-10">
        <div className="flex items-center gap-2.5 min-w-0 pr-3">
          <div className="p-1.5 rounded-full bg-white/10 text-[#2dc492] shrink-0">
            <Compass className="h-4 w-4 animate-spin-slow" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs sm:text-sm font-semibold truncate leading-tight">
              {title}
            </span>
            <span className="text-[10px] sm:text-[11px] text-gray-400 font-normal leading-tight mt-0.5">
              Drag to rotate 360° • Pinch / scroll to zoom
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="p-1.5 rounded-full hover:bg-white/15 transition cursor-pointer text-gray-300 hover:text-white shrink-0"
        >
          <X size={20} />
        </button>
      </div>
      <div ref={ref} className="flex-1" />
    </div>
  );
}
