import { useEffect, useState } from "react";

export function PageLoader() {
  const [dots, setDots] = useState("");

  // Animate loading dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-6">
      {/* Film Reel Animation */}
      <div className="relative">
        <div className="w-16 h-16 border-4 border-[#7B1E3D]/30 rounded-full animate-spin" />
        <div className="absolute inset-0 w-16 h-16 border-4 border-t-[#7B1E3D] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
        
        {/* Center Logo/Icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-6 h-6 bg-[#7B1E3D] rounded-lg animate-pulse" />
        </div>
      </div>

      {/* Loading Text */}
      <div className="text-center">
        <p className="text-[#7B1E3D] font-semibold text-lg tracking-wide">
          Loading
        </p>
        <p className="text-gray-400 text-sm">
          Please wait{dots}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="w-48 h-1 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-[#7B1E3D] to-[#9B2E5D] rounded-full animate-[progress_1.5s_ease-in-out_infinite]" />
      </div>

      <style>{`
        @keyframes progress {
          0% { width: 0%; margin-left: 0%; }
          50% { width: 70%; margin-left: 15%; }
          100% { width: 0%; margin-left: 100%; }
        }
      `}</style>
    </div>
  );
}