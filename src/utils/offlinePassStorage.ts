/**
 * Offline ticket pass and admission queue storage for zero-connectivity environments.
 * Inspired by BookMyShow's offline gate admission architecture.
 */

const PASS_STORAGE_KEY = "vybhz_offline_passes";
const ADMISSION_QUEUE_KEY = "vybhz_pending_admissions";

export interface PendingAdmission {
  id: string;
  code: string;
  venue_id?: string;
  gate_device: string;
  timestamp: string;
  ref_code?: string;
  movie_title?: string;
  screen_name?: string;
}

export function saveOfflinePass(booking: any): void {
  if (!booking || !booking.id) return;
  try {
    const raw = localStorage.getItem(PASS_STORAGE_KEY);
    const passes = raw ? JSON.parse(raw) : {};
    passes[booking.id] = {
      ...booking,
      _cached_at: new Date().toISOString(),
    };
    localStorage.setItem(PASS_STORAGE_KEY, JSON.stringify(passes));
  } catch (err) {
    console.warn("Failed to cache ticket pass offline", err);
  }
}

export function getOfflinePass(id: string): any | null {
  try {
    const raw = localStorage.getItem(PASS_STORAGE_KEY);
    if (!raw) return null;
    const passes = JSON.parse(raw);
    return passes[id] || null;
  } catch {
    return null;
  }
}

export function getAllOfflinePasses(): any[] {
  try {
    const raw = localStorage.getItem(PASS_STORAGE_KEY);
    if (!raw) return [];
    const passes = JSON.parse(raw);
    return Object.values(passes);
  } catch {
    return [];
  }
}

export function savePendingAdmission(adm: Omit<PendingAdmission, "id" | "timestamp">): PendingAdmission {
  const record: PendingAdmission = {
    ...adm,
    id: `offline-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
  };
  try {
    const raw = localStorage.getItem(ADMISSION_QUEUE_KEY);
    const queue: PendingAdmission[] = raw ? JSON.parse(raw) : [];
    queue.unshift(record);
    localStorage.setItem(ADMISSION_QUEUE_KEY, JSON.stringify(queue.slice(0, 100)));
  } catch (err) {
    console.warn("Failed to save pending admission", err);
  }
  return record;
}

export function getPendingAdmissions(): PendingAdmission[] {
  try {
    const raw = localStorage.getItem(ADMISSION_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function removePendingAdmission(id: string): void {
  try {
    const raw = localStorage.getItem(ADMISSION_QUEUE_KEY);
    if (!raw) return;
    const queue: PendingAdmission[] = JSON.parse(raw);
    const filtered = queue.filter((item) => item.id !== id);
    localStorage.setItem(ADMISSION_QUEUE_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.warn("Failed to remove pending admission", err);
  }
}

export function parseSignedTicketCode(code: string): {
  isSigned: boolean;
  refCode: string;
  showtimeIdShort?: string;
  seatCodes?: string[];
  epoch?: number;
} {
  const clean = (code || "").trim();
  if (clean.startsWith("VYB1:")) {
    const parts = clean.split(":");
    if (parts.length === 6) {
      const [, refCode, shortSt, seatsStr, epochStr] = parts;
      const seats = seatsStr && seatsStr !== "GENERAL" ? seatsStr.split(",") : [];
      return {
        isSigned: true,
        refCode,
        showtimeIdShort: shortSt,
        seatCodes: seats,
        epoch: Number(epochStr) || 0,
      };
    }
  }
  return {
    isSigned: false,
    refCode: clean,
  };
}

