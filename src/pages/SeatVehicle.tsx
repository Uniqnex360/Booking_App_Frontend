export function SeatVehicle({ count }: { count: number }) {
  if (count <= 1) return <BikeSVG />;
  if (count === 2) return <ScooterSVG />;
  if (count === 3) return <AutoSVG />;
  if (count <= 5) return <CarSVG />;
  return <VanSVG />;
}

/* 1 person – Bicycle */
export function BikeSVG() {
  return (
    <svg viewBox="0 0 120 80" className="w-36 h-24" fill="none">
      <circle cx="28" cy="58" r="14" stroke="#12A4A4" strokeWidth="3" fill="#fff" />
      <circle cx="28" cy="58" r="5" fill="#12A4A4" />
      <circle cx="92" cy="58" r="14" stroke="#12A4A4" strokeWidth="3" fill="#fff" />
      <circle cx="92" cy="58" r="5" fill="#12A4A4" />
      <path
        d="M28 58 L50 30 L75 30 L92 58 M50 30 L55 58 M75 30 L55 58"
        stroke="#12A4A4"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M48 28 h12" stroke="#0E8585" strokeWidth="4" strokeLinecap="round" />
      <path d="M75 30 L82 22" stroke="#12A4A4" strokeWidth="3" strokeLinecap="round" />
      <circle cx="60" cy="18" r="6" fill="#FDBB9C" />
    </svg>
  );
}

/* 2 people – Scooter (BMS-style yellow/teal) */
export function ScooterSVG() {
  return (
    <svg viewBox="0 0 130 85" className="w-40 h-28" fill="none">
      {/* Wheels */}
      <circle cx="30" cy="62" r="14" stroke="#12A4A4" strokeWidth="3" fill="#fff" />
      <circle cx="30" cy="62" r="5" fill="#12A4A4" />
      <circle cx="100" cy="62" r="14" stroke="#12A4A4" strokeWidth="3" fill="#fff" />
      <circle cx="100" cy="62" r="5" fill="#12A4A4" />
      {/* Body */}
      <path
        d="M30 62 L42 62 L48 44 H82 L92 62 H100"
        stroke="#12A4A4"
        strokeWidth="3"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Seat / Mudguard */}
      <rect x="48" y="32" width="34" height="14" rx="4" fill="#F5C518" />
      {/* Handlebar */}
      <path d="M48 44 L46 24 L56 20" stroke="#12A4A4" strokeWidth="3" strokeLinecap="round" />
      {/* Headlight */}
      <circle cx="46" cy="22" r="3" fill="#F5C518" />
      {/* People heads */}
      <circle cx="58" cy="18" r="6" fill="#FDBB9C" />
      <circle cx="76" cy="18" r="6" fill="#FDBB9C" />
    </svg>
  );
}

/* 3 people – Auto rickshaw */
export function AutoSVG() {
  return (
    <svg viewBox="0 0 130 80" className="w-40 h-24" fill="none">
      <circle cx="32" cy="60" r="12" stroke="#12A4A4" strokeWidth="3" fill="#fff" />
      <circle cx="98" cy="60" r="12" stroke="#12A4A4" strokeWidth="3" fill="#fff" />
      <path
        d="M20 60 V36 Q20 24 36 24 H78 Q100 24 108 40 V60"
        fill="#F5C518"
        opacity="0.95"
      />
      <path d="M36 24 L48 12 H70 L78 24" fill="#E5B000" />
      <rect x="40" y="30" width="28" height="16" rx="2" fill="#E8F4FC" />
      <circle cx="55" cy="18" r="5" fill="#FDBB9C" />
      <circle cx="68" cy="18" r="5" fill="#FDBB9C" />
      <circle cx="81" cy="20" r="5" fill="#FDBB9C" />
    </svg>
  );
}

/* 4-5 people – Car */
export function CarSVG() {
  return (
    <svg viewBox="0 0 140 80" className="w-44 h-24" fill="none">
      <circle cx="36" cy="58" r="12" stroke="#12A4A4" strokeWidth="3" fill="#fff" />
      <circle cx="108" cy="58" r="12" stroke="#12A4A4" strokeWidth="3" fill="#fff" />
      <path
        d="M18 58 V42 Q18 34 28 34 L40 20 H100 L118 34 Q128 34 128 42 V58"
        fill="#F5C518"
      />
      <path d="M42 22 H98 L110 34 H36 Z" fill="#E5B000" />
      <rect x="44" y="26" width="22" height="12" rx="2" fill="#E8F4FC" />
      <rect x="72" y="26" width="22" height="12" rx="2" fill="#E8F4FC" />
      {[48, 62, 78, 92].map((x, i) => (
        <circle key={i} cx={x} cy="16" r="4" fill="#FDBB9C" />
      ))}
    </svg>
  );
}

/* 6+ people – Van / Bus */
export function VanSVG() {
  return (
    <svg viewBox="0 0 150 80" className="w-48 h-24" fill="none">
      <circle cx="34" cy="60" r="11" stroke="#12A4A4" strokeWidth="3" fill="#fff" />
      <circle cx="120" cy="60" r="11" stroke="#12A4A4" strokeWidth="3" fill="#fff" />
      <rect x="16" y="28" width="120" height="32" rx="6" fill="#F5C518" />
      <rect x="16" y="22" width="70" height="14" rx="4" fill="#E5B000" />
      <rect x="24" y="32" width="18" height="12" rx="2" fill="#E8F4FC" />
      <rect x="48" y="32" width="18" height="12" rx="2" fill="#E8F4FC" />
      <rect x="72" y="32" width="18" height="12" rx="2" fill="#E8F4FC" />
      {[30, 46, 62, 78, 94, 110].map((x, i) => (
        <circle key={i} cx={x} cy="16" r="3.5" fill="#FDBB9C" />
      ))}
    </svg>
  );
}
