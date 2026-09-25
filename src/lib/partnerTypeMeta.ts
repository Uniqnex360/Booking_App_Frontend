import { Store, CalendarDays, Film } from "lucide-react";
import type { PartnerType } from "@/types/partner.types";

export const partnerTypeMeta: Partial<
  Record<PartnerType, { label: string; icon: typeof Store; desc?: string }>
> = {
  restaurant: {
    label: "Restaurant",
    icon: Store,
    desc: "List your dining venue",
  },
  event_organiser: {
    label: "Event Organizer",
    icon: CalendarDays,
    desc: "Host live events",
  },
};

export function getPartnerTypeMeta(type: PartnerType | undefined | null) {
  if (!type) return { label: "Partner", icon: Store, desc: "" };
  return partnerTypeMeta[type] ?? { label: type, icon: Store, desc: "" };
}