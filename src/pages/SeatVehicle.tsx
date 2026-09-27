export function SeatVehicle({ count }: { count: number }) {
  if (count <= 1) return <CycleSVG />;
  if (count === 2) return <ScooterBMS />;
  if (count === 3) return <AutoSVG />;
  if (count === 4) return <MiniCarSVG />;
  if (count === 5) return <SedanSVG />;
  if (count <= 7) return <SUVSVG />;
  return <BusSVG />;
}

/* 1 Ticket – Bicycle */
export function CycleSVG() {
  return (
    <svg viewBox="0 0 140 90" className="w-36 h-24" fill="none">
      {/* Wheels */}
      <circle cx="32" cy="62" r="16" stroke="#41474e" strokeWidth="3" fill="#fff" />
      <circle cx="32" cy="62" r="11" fill="#74cecc" />
      <circle cx="32" cy="62" r="3" fill="#41474e" />

      <circle cx="106" cy="62" r="16" stroke="#41474e" strokeWidth="3" fill="#fff" />
      <circle cx="106" cy="62" r="11" fill="#74cecc" />
      <circle cx="106" cy="62" r="3" fill="#41474e" />

      {/* Frame (Yellow #f0c229 with dark stroke) */}
      <path
        d="M32 62 L60 62 L82 38 L50 38 Z"
        stroke="#41474e"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="#f0c229"
      />
      <path
        d="M60 62 L82 38 M60 62 L50 38"
        stroke="#41474e"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Front fork & Handlebar */}
      <path
        d="M106 62 L82 38 L84 26 L76 26 M84 26 L92 26"
        stroke="#41474e"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Seat post & Seat */}
      <path d="M60 62 L48 30" stroke="#41474e" strokeWidth="3" strokeLinecap="round" />
      <path
        d="M40 30 C40 27 58 27 58 30 C58 32 40 32 40 30 Z"
        fill="#41474e"
      />
      {/* Pedals */}
      <circle cx="60" cy="62" r="5" stroke="#41474e" strokeWidth="2.5" fill="#bdbec0" />
    </svg>
  );
}

/* 2 Tickets – Exact BookMyShow Scooter */
export function ScooterBMS() {
  return (
    <div className="flex items-center justify-center">
      <img
        src="/vehicles/bms_scooter_2x.png"
        alt="Scooter"
        className="h-20 sm:h-22 w-auto object-contain select-none pointer-events-none"
        onError={(e) => {
          // If image fails, fallback to SVG
          e.currentTarget.style.display = "none";
        }}
      />
    </div>
  );
}

/* 3 Tickets – Auto Rickshaw */
export function AutoSVG() {
  return (
    <svg viewBox="0 0 140 90" className="w-38 h-24" fill="none">
      {/* Wheels */}
      <circle cx="34" cy="66" r="13" stroke="#41474e" strokeWidth="3" fill="#fff" />
      <circle cx="34" cy="66" r="8" fill="#74cecc" />
      <circle cx="34" cy="66" r="2.5" fill="#41474e" />

      <circle cx="104" cy="66" r="13" stroke="#41474e" strokeWidth="3" fill="#fff" />
      <circle cx="104" cy="66" r="8" fill="#74cecc" />
      <circle cx="104" cy="66" r="2.5" fill="#41474e" />

      {/* Body Cabin */}
      <path
        d="M22 66 L22 42 Q22 26 40 26 H88 Q114 26 116 46 L118 66 Z"
        fill="#f0c229"
        stroke="#41474e"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* Black Roof Top */}
      <path
        d="M20 40 Q22 24 40 24 H88 Q112 24 116 40 Z"
        fill="#41474e"
      />
      {/* Windshield */}
      <path
        d="M74 30 H94 Q108 30 110 44 H74 Z"
        fill="#e6e7e8"
        stroke="#41474e"
        strokeWidth="2"
      />
      {/* Passenger Opening */}
      <rect
        x="32"
        y="36"
        width="34"
        height="24"
        rx="3"
        fill="#ffffff"
        stroke="#41474e"
        strokeWidth="2"
      />
      {/* Headlight */}
      <circle cx="118" cy="54" r="3.5" fill="#f6de3a" stroke="#41474e" strokeWidth="1.5" />
    </svg>
  );
}

/* 4 Tickets – Hatchback / Mini Car */
export function MiniCarSVG() {
  return (
    <svg viewBox="0 0 150 90" className="w-40 h-24" fill="none">
      {/* Wheels */}
      <circle cx="38" cy="64" r="13" stroke="#41474e" strokeWidth="3" fill="#fff" />
      <circle cx="38" cy="64" r="8" fill="#74cecc" />
      <circle cx="38" cy="64" r="2.5" fill="#41474e" />

      <circle cx="112" cy="64" r="13" stroke="#41474e" strokeWidth="3" fill="#fff" />
      <circle cx="112" cy="64" r="8" fill="#74cecc" />
      <circle cx="112" cy="64" r="2.5" fill="#41474e" />

      {/* Car Body */}
      <path
        d="M18 64 V50 Q18 42 26 42 L42 26 H96 L124 42 Q134 42 134 50 V64 Z"
        fill="#f0c229"
        stroke="#41474e"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* Windows */}
      <path
        d="M45 29 H66 V42 H32 Z"
        fill="#e6e7e8"
        stroke="#41474e"
        strokeWidth="2"
      />
      <path
        d="M72 29 H92 L114 42 H72 Z"
        fill="#e6e7e8"
        stroke="#41474e"
        strokeWidth="2"
      />
      {/* Headlight & Tail Light */}
      <circle cx="132" cy="50" r="3" fill="#f6de3a" stroke="#41474e" strokeWidth="1.5" />
      <circle cx="20" cy="50" r="3" fill="#F84464" stroke="#41474e" strokeWidth="1.5" />
    </svg>
  );
}

/* 5 Tickets – Sedan */
export function SedanSVG() {
  return (
    <svg viewBox="0 0 160 90" className="w-44 h-24" fill="none">
      {/* Wheels */}
      <circle cx="36" cy="64" r="13" stroke="#41474e" strokeWidth="3" fill="#fff" />
      <circle cx="36" cy="64" r="8" fill="#74cecc" />
      <circle cx="36" cy="64" r="2.5" fill="#41474e" />

      <circle cx="122" cy="64" r="13" stroke="#41474e" strokeWidth="3" fill="#fff" />
      <circle cx="122" cy="64" r="8" fill="#74cecc" />
      <circle cx="122" cy="64" r="2.5" fill="#41474e" />

      {/* Sedan Body */}
      <path
        d="M14 64 V52 Q14 46 22 46 L38 46 L54 28 H104 L126 46 L144 46 Q150 46 150 52 V64 Z"
        fill="#f0c229"
        stroke="#41474e"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* Front & Rear Windows */}
      <path
        d="M56 31 H78 V44 H42 Z"
        fill="#e6e7e8"
        stroke="#41474e"
        strokeWidth="2"
      />
      <path
        d="M84 31 H102 L120 44 H84 Z"
        fill="#e6e7e8"
        stroke="#41474e"
        strokeWidth="2"
      />
      {/* Lights */}
      <circle cx="148" cy="52" r="3" fill="#f6de3a" stroke="#41474e" strokeWidth="1.5" />
      <circle cx="16" cy="52" r="3" fill="#F84464" stroke="#41474e" strokeWidth="1.5" />
    </svg>
  );
}

/* 6-7 Tickets – SUV */
export function SUVSVG() {
  return (
    <svg viewBox="0 0 160 90" className="w-44 h-24" fill="none">
      {/* Wheels */}
      <circle cx="38" cy="64" r="14" stroke="#41474e" strokeWidth="3" fill="#fff" />
      <circle cx="38" cy="64" r="9" fill="#74cecc" />
      <circle cx="38" cy="64" r="3" fill="#41474e" />

      <circle cx="122" cy="64" r="14" stroke="#41474e" strokeWidth="3" fill="#fff" />
      <circle cx="122" cy="64" r="9" fill="#74cecc" />
      <circle cx="122" cy="64" r="3" fill="#41474e" />

      {/* Roof Rail */}
      <path d="M48 20 H108" stroke="#41474e" strokeWidth="3" strokeLinecap="round" />
      <path d="M56 20 V24 M100 20 V24" stroke="#41474e" strokeWidth="2.5" />

      {/* SUV Body */}
      <path
        d="M16 64 V44 Q16 26 34 24 H108 L134 42 H144 Q148 42 148 48 V64 Z"
        fill="#f0c229"
        stroke="#41474e"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* 3 Windows */}
      <rect x="30" y="28" width="22" height="14" rx="2" fill="#e6e7e8" stroke="#41474e" strokeWidth="2" />
      <rect x="58" y="28" width="22" height="14" rx="2" fill="#e6e7e8" stroke="#41474e" strokeWidth="2" />
      <path d="M86 28 H104 L122 42 H86 Z" fill="#e6e7e8" stroke="#41474e" strokeWidth="2" />

      <circle cx="146" cy="48" r="3" fill="#f6de3a" stroke="#41474e" strokeWidth="1.5" />
    </svg>
  );
}

/* 8-10 Tickets – Van / Bus */
export function BusSVG() {
  return (
    <svg viewBox="0 0 170 90" className="w-48 h-24" fill="none">
      {/* Wheels */}
      <circle cx="42" cy="66" r="13" stroke="#41474e" strokeWidth="3" fill="#fff" />
      <circle cx="42" cy="66" r="8" fill="#74cecc" />
      <circle cx="42" cy="66" r="2.5" fill="#41474e" />

      <circle cx="132" cy="66" r="13" stroke="#41474e" strokeWidth="3" fill="#fff" />
      <circle cx="132" cy="66" r="8" fill="#74cecc" />
      <circle cx="132" cy="66" r="2.5" fill="#41474e" />

      {/* Bus Body */}
      <rect
        x="18"
        y="22"
        width="138"
        height="44"
        rx="7"
        fill="#f0c229"
        stroke="#41474e"
        strokeWidth="3"
      />
      {/* Windows */}
      <rect x="28" y="28" width="22" height="16" rx="2" fill="#e6e7e8" stroke="#41474e" strokeWidth="2" />
      <rect x="56" y="28" width="22" height="16" rx="2" fill="#e6e7e8" stroke="#41474e" strokeWidth="2" />
      <rect x="84" y="28" width="22" height="16" rx="2" fill="#e6e7e8" stroke="#41474e" strokeWidth="2" />
      <rect x="112" y="28" width="28" height="16" rx="2" fill="#e6e7e8" stroke="#41474e" strokeWidth="2" />

      {/* Headlight */}
      <circle cx="154" cy="52" r="3.5" fill="#f6de3a" stroke="#41474e" strokeWidth="1.5" />
    </svg>
  );
}
