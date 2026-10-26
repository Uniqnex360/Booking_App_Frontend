import { Store, CalendarDays, Film, Sparkles } from "lucide-react";
import type { PartnerType } from "@/types/partner.types";

export const partnerTypeMeta: Partial<
  Record<PartnerType, { label: string; icon: typeof Sparkles; desc?: string }>
> = {
  experience_partner: {
    label: "Experience & Dining Partner",
    icon: Sparkles,
    desc: "Host live events, brunches, dining and experiences",
  },
  restaurant: {
    label: "Experience & Dining Partner",
    icon: Store,
    desc: "Host live events, brunches, dining and experiences",
  },
  event_organiser: {
    label: "Experience & Dining Partner",
    icon: CalendarDays,
    desc: "Host live events, brunches, dining and experiences",
  },
};

export function getPartnerTypeMeta(type: PartnerType | undefined | null) {
  if (!type) return { label: "Experience & Dining Partner", icon: Sparkles, desc: "" };
  return partnerTypeMeta[type] ?? { label: "Experience & Dining Partner", icon: Sparkles, desc: "" };
}