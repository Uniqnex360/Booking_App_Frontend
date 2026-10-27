/**
 * Utility functions and standard templates for Event Terms & Conditions
 */

export const STANDARD_EVENT_TERMS: string[] = [
  "Entry is permitted only upon presenting a valid booking confirmation or digital QR ticket.",
  "Please carry a valid government-issued photo ID (Aadhaar, Passport, Driving License, or Voter ID) for entry verification.",
  "Tickets once confirmed are non-refundable and cannot be exchanged, transferred, or rescheduled.",
  "Please arrive at the venue at least 15 to 30 minutes prior to the scheduled showtime. Late entries may be denied or delayed until a suitable break.",
  "Outside food, beverages, alcohol, cigarettes, and banned substances are strictly prohibited inside the venue premises.",
  "Professional cameras, DSLR lenses, audio/video recording equipment, and selfie sticks are disallowed without prior media accreditation.",
  "Venue management and event organizers reserve the right of admission and security frisking at the gates.",
  "For age-restricted events (A / 18+ / 21+), patrons below the stipulated age limit will not be admitted, and tickets will be forfeited.",
  "Organizers are not responsible for any personal injury, loss, or damage to personal belongings during the event.",
  "In the unforeseen event of artist cancellation or venue force majeure, refund procedures will follow the organizer's official policy."
];

/**
 * Normalizes any format of terms (strings, arrays with newlines, bullet points, numbers)
 * into a clean array of bullet points without redundant bullet characters.
 */
export function normalizeTermsToBullets(rawTerms: any): string[] {
  if (!rawTerms) return [];

  const rawList: string[] = Array.isArray(rawTerms)
    ? rawTerms
    : typeof rawTerms === "string"
    ? rawTerms.split("\n")
    : [];

  const bullets: string[] = [];

  for (const item of rawList) {
    if (!item || typeof item !== "string") continue;

    // In case an item itself contains newlines
    const lines = item.split(/\r?\n/);
    for (const line of lines) {
      let cleaned = line.trim();
      if (!cleaned) continue;

      // Strip leading bullet characters (•, -, *, —, –, ◦, ▪, etc.) or numbering (1., 1), (1), etc.)
      cleaned = cleaned.replace(/^([•\-\*—–◦▪\u2022\u2023\u25E6\u2043\u2219]+|\(?\d+[\.\)\-:]?\s*)/i, "").trim();

      // If there's still a leading dash or bullet after stripping numbering
      cleaned = cleaned.replace(/^[•\-\*—–◦▪]\s*/, "").trim();

      if (cleaned.length > 0) {
        bullets.push(cleaned);
      }
    }
  }

  return bullets;
}

