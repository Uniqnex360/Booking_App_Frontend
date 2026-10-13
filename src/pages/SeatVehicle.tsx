export function SeatVehicle({ count }: { count: number }) {
  const safeCount = Math.max(1, Math.min(10, count || 1));

  // Determine cinema seats based on count
  const renderCinemaSeats = () => {
    if (safeCount === 1) {
      // 1 Grand Luxury Cinema Recliner
      return (
        <g transform="translate(68, 16)">
          {/* Seat Shadow */}
          <ellipse cx="32" cy="78" rx="30" ry="5" fill="#000000" opacity="0.16" />

          {/* Base & Leg Pedestal */}
          <rect x="14" y="66" width="36" height="10" rx="3" fill="#1E293B" />
          <rect x="22" y="74" width="20" height="4" rx="2" fill="#0F172A" />

          {/* Seat Cushion (Plush) */}
          <rect x="8" y="52" width="48" height="18" rx="6" fill="url(#seatPlushGrad)" />
          <path d="M12 55 Q32 58 52 55" stroke="#F87171" strokeWidth="1" fill="none" opacity="0.6" />

          {/* Backrest (Tall luxury cinema seat) */}
          <rect x="10" y="16" width="44" height="42" rx="8" fill="url(#seatPlushGrad)" />
          <path d="M14 28 Q32 32 50 28" stroke="#EF4444" strokeWidth="1.2" fill="none" opacity="0.5" />
          <path d="M14 42 Q32 46 50 42" stroke="#EF4444" strokeWidth="1.2" fill="none" opacity="0.5" />
          <line x1="32" y1="20" x2="32" y2="52" stroke="#991B1B" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />

          {/* Headrest Cushion */}
          <rect x="14" y="4" width="36" height="16" rx="6" fill="url(#headrestGrad)" />
          <rect x="16" y="6" width="32" height="12" rx="4" fill="none" stroke="#FCA5A5" strokeWidth="0.8" opacity="0.4" />

          {/* Left Armrest with cup holder */}
          <rect x="3" y="38" width="10" height="26" rx="5" fill="#1E293B" />
          <ellipse cx="8" cy="42" rx="3.5" ry="2.5" fill="#334155" />

          {/* Right Armrest with cup holder */}
          <rect x="51" y="38" width="10" height="26" rx="5" fill="#1E293B" />
          <ellipse cx="56" cy="42" rx="3.5" ry="2.5" fill="#334155" />
        </g>
      );
    }

    if (safeCount === 2) {
      // 2 Cinema Recliner Seats (Pair / Couple)
      return (
        <g transform="translate(42, 16)">
          {/* Seat Shadows */}
          <ellipse cx="28" cy="78" rx="25" ry="5" fill="#000000" opacity="0.15" />
          <ellipse cx="76" cy="78" rx="25" ry="5" fill="#000000" opacity="0.15" />

          {/* Bases */}
          <rect x="10" y="66" width="36" height="10" rx="3" fill="#1E293B" />
          <rect x="58" y="66" width="36" height="10" rx="3" fill="#1E293B" />

          {/* Seat 1 Cushion */}
          <rect x="6" y="52" width="44" height="18" rx="6" fill="url(#seatPlushGrad)" />
          <path d="M10 55 Q28 58 46 55" stroke="#F87171" strokeWidth="1" fill="none" opacity="0.6" />

          {/* Seat 2 Cushion */}
          <rect x="54" y="52" width="44" height="18" rx="6" fill="url(#seatPlushGrad)" />
          <path d="M58 55 Q76 58 94 55" stroke="#F87171" strokeWidth="1" fill="none" opacity="0.6" />

          {/* Seat 1 Backrest */}
          <rect x="8" y="16" width="40" height="42" rx="7" fill="url(#seatPlushGrad)" />
          <path d="M12 28 Q28 32 44 28" stroke="#EF4444" strokeWidth="1.2" fill="none" opacity="0.5" />
          <path d="M12 42 Q28 46 44 42" stroke="#EF4444" strokeWidth="1.2" fill="none" opacity="0.5" />

          {/* Seat 2 Backrest */}
          <rect x="56" y="16" width="40" height="42" rx="7" fill="url(#seatPlushGrad)" />
          <path d="M60 28 Q76 32 92 28" stroke="#EF4444" strokeWidth="1.2" fill="none" opacity="0.5" />
          <path d="M60 42 Q76 46 92 42" stroke="#EF4444" strokeWidth="1.2" fill="none" opacity="0.5" />

          {/* Seat 1 Headrest */}
          <rect x="12" y="4" width="32" height="16" rx="5" fill="url(#headrestGrad)" />
          <rect x="14" y="6" width="28" height="12" rx="3.5" fill="none" stroke="#FCA5A5" strokeWidth="0.8" opacity="0.4" />

          {/* Seat 2 Headrest */}
          <rect x="60" y="4" width="32" height="16" rx="5" fill="url(#headrestGrad)" />
          <rect x="62" y="6" width="28" height="12" rx="3.5" fill="none" stroke="#FCA5A5" strokeWidth="0.8" opacity="0.4" />

          {/* Outer Left Armrest */}
          <rect x="2" y="38" width="9" height="26" rx="4.5" fill="#1E293B" />
          <ellipse cx="6.5" cy="42" rx="3" ry="2" fill="#334155" />

          {/* Center Shared Armrest (Classic Cinema Couple Seating) */}
          <rect x="47" y="38" width="10" height="26" rx="5" fill="#0F172A" />
          <ellipse cx="52" cy="42" rx="3.5" ry="2.5" fill="#334155" />

          {/* Outer Right Armrest */}
          <rect x="93" y="38" width="9" height="26" rx="4.5" fill="#1E293B" />
          <ellipse cx="97.5" cy="42" rx="3" ry="2" fill="#334155" />
        </g>
      );
    }

    // 3 or more: Cinema Group Row (3 seats with perspective)
    return (
      <g transform="translate(32, 16)">
        {/* Row Shadows */}
        <ellipse cx="64" cy="78" rx="60" ry="5" fill="#000000" opacity="0.15" />

        {/* Bases */}
        <rect x="8" y="66" width="30" height="10" rx="3" fill="#1E293B" />
        <rect x="48" y="66" width="30" height="10" rx="3" fill="#1E293B" />
        <rect x="88" y="66" width="30" height="10" rx="3" fill="#1E293B" />

        {/* Cushions */}
        <rect x="4" y="53" width="36" height="17" rx="5" fill="url(#seatPlushGrad)" />
        <rect x="44" y="53" width="36" height="17" rx="5" fill="url(#seatPlushGrad)" />
        <rect x="84" y="53" width="36" height="17" rx="5" fill="url(#seatPlushGrad)" />

        {/* Backrests */}
        <rect x="6" y="18" width="32" height="40" rx="6" fill="url(#seatPlushGrad)" />
        <rect x="46" y="18" width="32" height="40" rx="6" fill="url(#seatPlushGrad)" />
        <rect x="86" y="18" width="32" height="40" rx="6" fill="url(#seatPlushGrad)" />

        {/* Headrests */}
        <rect x="9" y="6" width="26" height="15" rx="5" fill="url(#headrestGrad)" />
        <rect x="49" y="6" width="26" height="15" rx="5" fill="url(#headrestGrad)" />
        <rect x="89" y="6" width="26" height="15" rx="5" fill="url(#headrestGrad)" />

        {/* Armrests */}
        <rect x="1" y="40" width="7" height="24" rx="3.5" fill="#1E293B" />
        <rect x="38" y="40" width="8" height="24" rx="4" fill="#0F172A" />
        <rect x="78" y="40" width="8" height="24" rx="4" fill="#0F172A" />
        <rect x="117" y="40" width="7" height="24" rx="3.5" fill="#1E293B" />
      </g>
    );
  };

  return (
    <div className="flex flex-col items-center justify-center w-full select-none pointer-events-none">
      <svg
        viewBox="0 0 256 108"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="max-h-24 sm:max-h-28 max-w-[250px] w-auto h-auto object-contain transition-all duration-300 drop-shadow-sm"
      >
        <defs>
          {/* Seat Plush Velvet Red Gradient */}
          <linearGradient id="seatPlushGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#EF4444" />
            <stop offset="40%" stopColor="#DC2626" />
            <stop offset="100%" stopColor="#881337" />
          </linearGradient>

          {/* Headrest Gradient */}
          <linearGradient id="headrestGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F87171" />
            <stop offset="60%" stopColor="#DC2626" />
            <stop offset="100%" stopColor="#991B1B" />
          </linearGradient>

          {/* Soda Cup Gradient */}
          <linearGradient id="sodaCupGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#4F46E5" />
            <stop offset="100%" stopColor="#7C3AED" />
          </linearGradient>

          {/* Golden Ticket Gradient */}
          <linearGradient id="ticketGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FDE68A" />
            <stop offset="50%" stopColor="#FCD34D" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>

          {/* Popcorn Bucket Clip Path */}
          <clipPath id="popcornClip">
            <polygon points="4,14 36,14 31,54 9,54" />
          </clipPath>

          {/* Clapperboard Striping Clip Path */}
          <clipPath id="clapperClip">
            <rect x="0" y="0" width="36" height="8" rx="2" />
          </clipPath>
        </defs>

        {/* Ambient Projector Light Beam Glow */}
        <ellipse cx="128" cy="98" rx="118" ry="7" fill="#000000" opacity="0.08" />

        {/* Dynamic Cinema Seats */}
        {renderCinemaSeats()}

        {/* Movie Clapperboard on Left Side */}
        <g transform="translate(10, 48) rotate(-7)">
          <rect x="2" y="34" width="34" height="4" rx="2" fill="#000000" opacity="0.12" />
          {/* Clapper Slate Body */}
          <rect x="0" y="10" width="36" height="25" rx="3" fill="#1E293B" />
          {/* Slate lines */}
          <rect x="4" y="14" width="28" height="1" fill="#475569" />
          <rect x="4" y="19" width="12" height="1" fill="#475569" />
          <rect x="20" y="19" width="12" height="1" fill="#475569" />
          <text
            x="18"
            y="29"
            textAnchor="middle"
            fontSize="4.5"
            fontWeight="bold"
            fill="#F8FAFC"
            letterSpacing="0.8"
            fontFamily="sans-serif"
          >
            CINEMA
          </text>
          {/* Top Angled Clapper Stick */}
          <g transform="rotate(-12 0 10)">
            <rect x="0" y="0" width="36" height="8" rx="2" fill="#0F172A" />
            <g clipPath="url(#clapperClip)">
              <polygon points="4,0 8,0 2,8 -2,8" fill="#FFFFFF" />
              <polygon points="12,0 16,0 10,8 6,8" fill="#FFFFFF" />
              <polygon points="20,0 24,0 18,8 14,8" fill="#FFFFFF" />
              <polygon points="28,0 32,0 26,8 22,8" fill="#FFFFFF" />
              <polygon points="36,0 40,0 34,8 30,8" fill="#FFFFFF" />
            </g>
            <circle cx="3" cy="4" r="1.5" fill="#94A3B8" />
          </g>
        </g>

        {/* Golden Movie Ticket Stub */}
        <g transform="translate(16, 82) rotate(6)">
          <rect
            x="0"
            y="0"
            width="32"
            height="15"
            rx="3"
            fill="url(#ticketGrad)"
            stroke="#D97706"
            strokeWidth="0.5"
          />
          <circle cx="0" cy="7.5" r="2.5" fill="#FFFFFF" />
          <circle cx="32" cy="7.5" r="2.5" fill="#FFFFFF" />
          <line
            x1="22"
            y1="1"
            x2="22"
            y2="14"
            stroke="#B45309"
            strokeWidth="0.8"
            strokeDasharray="1.5 1.5"
          />
          <path
            d="M9 4.5 L9.8 6.2 L11.7 6.4 L10.3 7.7 L10.7 9.5 L9 8.6 L7.3 9.5 L7.7 7.7 L6.3 6.4 L8.2 6.2 Z"
            fill="#78350F"
          />
          <text
            x="15"
            y="9.5"
            textAnchor="middle"
            fontSize="3.8"
            fontWeight="bold"
            fill="#78350F"
            fontFamily="sans-serif"
          >
            ADMIT
          </text>
        </g>

        {/* Popcorn Tub */}
        <g transform="translate(160, 36)">
          {/* Shadow */}
          <ellipse cx="20" cy="57" rx="16" ry="3" fill="#000000" opacity="0.14" />

          {/* Overflowing Butter Popcorn Kernels */}
          <circle cx="8" cy="11" r="5.5" fill="#FCD34D" />
          <circle cx="16" cy="8" r="6.5" fill="#F59E0B" />
          <circle cx="25" cy="9" r="6" fill="#FEF08A" />
          <circle cx="32" cy="12" r="5.5" fill="#FCD34D" />
          <circle cx="12" cy="5" r="5" fill="#FEF3C7" />
          <circle cx="21" cy="4" r="5.5" fill="#FDE047" />
          <circle cx="28" cy="6" r="4.5" fill="#F59E0B" />
          {/* Small popped pieces */}
          <circle cx="37" cy="18" r="3" fill="#FCD34D" />
          <circle cx="3" cy="20" r="2.5" fill="#FEF08A" />

          {/* Bucket Stripes */}
          <g clipPath="url(#popcornClip)">
            <polygon points="4,14 36,14 31,54 9,54" fill="#E11D48" />
            <polygon points="10,14 15,14 14,54 10,54" fill="#FFFFFF" />
            <polygon points="20,14 25,14 23,54 19,54" fill="#FFFFFF" />
            <polygon points="30,14 34,14 31,54 28,54" fill="#FFFFFF" />
          </g>

          {/* Golden Star Badge */}
          <circle cx="20" cy="34" r="7.5" fill="#F59E0B" stroke="#FEF3C7" strokeWidth="1" />
          <path
            d="M20 30 L21.3 32.7 L24.2 33 L22 35 L22.6 37.8 L20 36.3 L17.4 37.8 L18 35 L15.8 33 L18.7 32.7 Z"
            fill="#FFFFFF"
          />

          {/* Bucket Rim */}
          <path
            d="M3 14 Q20 17 37 14"
            stroke="#DC2626"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
          />
        </g>

        {/* Cinema Soda Drink Cup */}
        <g transform="translate(202, 42)">
          {/* Cup Shadow */}
          <ellipse cx="14" cy="51" rx="11" ry="2.5" fill="#000000" opacity="0.12" />

          {/* Striped Bent Straw */}
          <path
            d="M14 18 L16 3 Q17 0 21 1 L27 4"
            stroke="#EF4444"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M14 18 L16 3 Q17 0 21 1 L27 4"
            stroke="#FFFFFF"
            strokeWidth="3"
            strokeDasharray="3 3"
            fill="none"
            strokeLinecap="round"
          />

          {/* Cup Lid */}
          <ellipse
            cx="14"
            cy="18"
            rx="13"
            ry="3.8"
            fill="#F1F5F9"
            stroke="#CBD5E1"
            strokeWidth="0.8"
          />
          <ellipse cx="14" cy="17" rx="7.5" ry="1.8" fill="#E2E8F0" />

          {/* Cup Body */}
          <polygon points="3,18 25,18 21,49 7,49" fill="url(#sodaCupGrad)" />
          {/* Cup highlight reflection */}
          <polygon points="5,19 9,19 8,48 6,48" fill="#FFFFFF" opacity="0.25" />

          {/* ICE Text */}
          <circle cx="14" cy="33" r="4.5" fill="#FFFFFF" opacity="0.2" />
          <text
            x="14"
            y="35"
            textAnchor="middle"
            fontSize="5"
            fontWeight="bold"
            fill="#FFFFFF"
            fontFamily="sans-serif"
          >
            ICE
          </text>
        </g>

        {/* 3D Cinema Glasses in Foreground */}
        <g transform="translate(140, 76)">
          {/* Shadow */}
          <ellipse cx="22" cy="13" rx="20" ry="3" fill="#000000" opacity="0.18" />

          {/* Frame */}
          <path
            d="M2 3 C2 1, 5 0, 9 0 L18 0 C20 0, 21 2, 22 2 C23 2, 24 0, 26 0 L35 0 C39 0, 42 1, 42 3 L40 10 C40 12, 38 13, 34 13 L26 13 C23 13, 22 11, 22 11 C22 11, 21 13, 18 13 L10 13 C6 13, 4 12, 4 10 Z"
            fill="#0F172A"
          />

          {/* Left Lens (Cyan 3D) */}
          <rect x="6" y="2.5" width="12" height="8" rx="2" fill="#06B6D4" opacity="0.9" />
          <line x1="8" y1="3" x2="15" y2="9.5" stroke="#FFFFFF" strokeWidth="0.8" opacity="0.6" />

          {/* Right Lens (Red 3D) */}
          <rect x="26" y="2.5" width="12" height="8" rx="2" fill="#EF4444" opacity="0.9" />
          <line
            x1="28"
            y1="3"
            x2="35"
            y2="9.5"
            stroke="#FFFFFF"
            strokeWidth="0.8"
            opacity="0.6"
          />
        </g>
      </svg>

      {/* Subtle indicator tag */}
      <div className="flex items-center gap-1.5 mt-1 px-2.5 py-0.5 rounded-full bg-red-50 text-[#e11d48] border border-red-100 text-[11px] font-semibold tracking-wide">
        <span className="w-1.5 h-1.5 rounded-full bg-[#e11d48] animate-pulse" />
        <span>
          {safeCount} {safeCount === 1 ? "Cinema Seat" : "Cinema Seats"}
        </span>
      </div>
    </div>
  );
}
