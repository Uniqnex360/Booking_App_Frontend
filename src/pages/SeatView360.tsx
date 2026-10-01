import { useEffect, useRef } from "react";
import { Viewer } from "@photo-sphere-viewer/core";
import { GyroscopePlugin } from "@photo-sphere-viewer/gyroscope-plugin";
import { StereoPlugin } from "@photo-sphere-viewer/stereo-plugin";
import "@photo-sphere-viewer/core/index.css";
import { X } from "lucide-react";

const FOV_DEG = 100;

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
    let viewer: Viewer | null = null;
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled || !ref.current) return;
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const fullWidth = Math.round(w * (360 / FOV_DEG));
      const fullHeight = Math.round(fullWidth / 2);
      viewer = new Viewer({
        container: ref.current,
        panorama: src,
        panoData: {
          fullWidth,
          fullHeight,
          croppedWidth: w,
          croppedHeight: h,
          croppedX: Math.round((fullWidth - w) / 2),
          croppedY: Math.round((fullHeight - h) / 2),
        },
        defaultYaw: yaw,
        defaultPitch: pitch,
        defaultZoomLvl: zoom,
        navbar: ["zoom", "move", "gyroscope", "stereo", "fullscreen"],
        plugins: [GyroscopePlugin, StereoPlugin],
      });
    };
    img.src = src;
    return () => {
      cancelled = true;
      viewer?.destroy();
    };
  }, [src, yaw, pitch, zoom]);

  return (
    <div className="fixed inset-0 z-[70] bg-black flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <span className="text-sm font-semibold">{title}</span>
        <button
          onClick={onClose}
          aria-label="Close"
          className="p-1.5 rounded-full hover:bg-white/10"
        >
          <X size={20} />
        </button>
      </div>
      <div ref={ref} className="flex-1" />
    </div>
  );
}
