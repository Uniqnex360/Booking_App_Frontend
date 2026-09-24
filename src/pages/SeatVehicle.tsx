export function SeatVehicle({ count }: { count: number }) {
  if (count <= 1) return <BikeSVG />;
  if (count === 2) return <ScooterSVG />;
  if (count === 3) return <AutoSVG />;
  if (count <= 5) return <CarSVG />;
  return <VanSVG />;
}


export function BikeSVG() {
  return (
    <svg viewBox="0 0 120 80" className="w-36 h-24" fill="none">
      <circle cx="28" cy="58" r="14" stroke="#7B1E3D" strokeWidth="3" fill="#fff" />
      <circle cx="28" cy="58" r="5" fill="#7B1E3D" />
      <circle cx="92" cy="58" r="14" stroke="#7B1E3D" strokeWidth="3" fill="#fff" />
      <circle cx="92" cy="58" r="5" fill="#7B1E3D" />
      <path
        d="M28 58 L50 30 L75 30 L92 58 M50 30 L55 58 M75 30 L55 58"
        stroke="#7B1E3D"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M48 28 h12" stroke="#5C0F2A" strokeWidth="4" strokeLinecap="round" />
      <path d="M75 30 L82 22" stroke="#7B1E3D" strokeWidth="3" strokeLinecap="round" />
      <circle cx="60" cy="18" r="6" fill="#FDBB9C" /> 
    </svg>
  );
}

export function ScooterSVG() {
  return (
    <svg viewBox="0 0 120 80" className="w-36 h-24" fill="none">
      <circle cx="30" cy="58" r="13" stroke="#7B1E3D" strokeWidth="3" fill="#fff" />
      <circle cx="30" cy="58" r="4" fill="#7B1E3D" />
      <circle cx="95" cy="58" r="13" stroke="#7B1E3D" strokeWidth="3" fill="#fff" />
      <circle cx="95" cy="58" r="4" fill="#7B1E3D" />
      <path
        d="M30 58 L42 58 L48 40 H78 L88 58 H95"
        stroke="#7B1E3D"
        strokeWidth="3"
        strokeLinejoin="round"
        fill="none"
      />
      <rect x="50" y="28" width="28" height="14" rx="3" fill="#7B1E3D" />
      <path d="M48 40 L48 22 L58 18" stroke="#7B1E3D" strokeWidth="3" strokeLinecap="round" />
      <circle cx="62" cy="14" r="5" fill="#FDBB9C" />
      <circle cx="78" cy="14" r="5" fill="#FDBB9C" />
    </svg>
  );
}

export function AutoSVG() {
  return (
    <svg viewBox="0 0 130 80" className="w-40 h-24" fill="none">
      <circle cx="32" cy="60" r="12" stroke="#7B1E3D" strokeWidth="3" fill="#fff" />
      <circle cx="98" cy="60" r="12" stroke="#7B1E3D" strokeWidth="3" fill="#fff" />
      <path
        d="M20 60 V36 Q20 24 36 24 H78 Q100 24 108 40 V60"
        fill="#7B1E3D"
        opacity="0.9"
      />
      <path d="M36 24 L48 12 H70 L78 24" fill="#5C0F2A" />
      <rect x="40" y="30" width="28" height="16" rx="2" fill="#E8F4FC" />
      <circle cx="55" cy="18" r="4" fill="#FDBB9C" />
      <circle cx="68" cy="18" r="4" fill="#FDBB9C" />
      <circle cx="81" cy="20" r="4" fill="#FDBB9C" />
    </svg>
  );
}

export function CarSVG() {
  return (
    <svg viewBox="0 0 140 80" className="w-44 h-24" fill="none">
      <circle cx="36" cy="58" r="12" stroke="#7B1E3D" strokeWidth="3" fill="#fff" />
      <circle cx="108" cy="58" r="12" stroke="#7B1E3D" strokeWidth="3" fill="#fff" />
      <path
        d="M18 58 V42 Q18 34 28 34 L40 20 H100 L118 34 Q128 34 128 42 V58"
        fill="#7B1E3D"
      />
      <path d="M42 22 H98 L110 34 H36 Z" fill="#5C0F2A" />
      <rect x="44" y="26" width="22" height="12" rx="2" fill="#E8F4FC" />
      <rect x="72" y="26" width="22" height="12" rx="2" fill="#E8F4FC" />
      {[48, 62, 78, 92].slice(0, 4).map((x, i) => (
        <circle key={i} cx={x} cy="16" r="4" fill="#FDBB9C" />
      ))}
    </svg>
  );
}

export function VanSVG() {
  return (
    <svg viewBox="0 0 150 80" className="w-48 h-24" fill="none">
      <circle cx="34" cy="60" r="11" stroke="#7B1E3D" strokeWidth="3" fill="#fff" />
      <circle cx="120" cy="60" r="11" stroke="#7B1E3D" strokeWidth="3" fill="#fff" />
      <rect x="16" y="28" width="120" height="32" rx="6" fill="#7B1E3D" />
      <rect x="16" y="22" width="70" height="14" rx="4" fill="#5C0F2A" />
      <rect x="24" y="32" width="18" height="12" rx="2" fill="#E8F4FC" />
      <rect x="48" y="32" width="18" height="12" rx="2" fill="#E8F4FC" />
      <rect x="72" y="32" width="18" height="12" rx="2" fill="#E8F4FC" />
      {[30, 46, 62, 78, 94, 110].map((x, i) => (
        <circle key={i} cx={x} cy="16" r="3.5" fill="#FDBB9C" />
      ))}
    </svg>
  );
}