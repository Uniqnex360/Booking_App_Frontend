export function SeatVehicle({ count }: { count: number }) {
  const safeCount = Math.max(1, Math.min(10, count || 1));

  return (
    <div className="flex items-center justify-center w-full h-full">
      <img
        key={safeCount}
        src={`/vehicles/vehicle-${safeCount}.svg`}
        alt={`Vehicle for ${safeCount} seats`}
        className="max-h-24 sm:max-h-28 max-w-[240px] w-auto h-auto object-contain select-none pointer-events-none transition-all duration-200"
      />
    </div>
  );
}
