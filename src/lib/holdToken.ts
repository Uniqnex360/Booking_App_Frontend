const PENDING = "vybhz_hold_pending";

export function safeUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    try {
      return crypto.randomUUID();
    } catch {}
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const makeHoldToken = (): string => {
  return safeUUID().replace(/-/g, "") + safeUUID().replace(/-/g, "");
};
// 64 chars — safely above the 43-char backend minimum

export const getPendingHoldToken = (): string | null =>
  sessionStorage.getItem(PENDING) || sessionStorage.getItem("vyhbz_hold_pending");

export const setPendingHoldToken = (t: string) =>
  sessionStorage.setItem(PENDING, t);

export const clearPendingHoldToken = () =>
  sessionStorage.removeItem(PENDING);

export const ensureHoldToken = (): string => {
  const existing = getPendingHoldToken();
  if (existing) return existing;
  const t = makeHoldToken();
  setPendingHoldToken(t);
  return t;
};