const PENDING = "vyhbz_hold_pending";

export const makeHoldToken = () =>
  crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
// 64 chars — safely above the 43-char backend minimum

export const getPendingHoldToken = (): string | null =>
  sessionStorage.getItem(PENDING);

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