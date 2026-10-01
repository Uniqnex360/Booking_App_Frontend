import { useEffect, useRef } from "react";
import { Viewer } from "@photo-sphere-viewer/core";
import { GyroscopePlugin } from "@photo-sphere-viewer/gyroscope-plugin";
import { StereoPlugin } from "@photo-sphere-viewer/stereo-plugin";
import "@photo-sphere-viewer/core/index.css";
import { X } from "lucide-react";

export default function SeatView360({
  src,
  title,
  onClose,
}: {
  src: string;
  title: string;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const viewer = new Viewer({
      container: ref.current,
      panorama: src,
      navbar: ["zoom", "move", "gyroscope", "stereo", "fullscreen"],
      plugins: [GyroscopePlugin, StereoPlugin],
    });
    return () => viewer.destroy();
  }, [src]);

  return (
    <div className="fixed inset-0 z-[70] bg-black flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <span className="text-sm font-semibold">{title}</span>
        <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-full hover:bg-white/10">
          <X size={20} />
        </button>
      </div>
      <div ref={ref} className="flex-1" />
    </div>
  );
}