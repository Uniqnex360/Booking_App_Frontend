import { Store, CalendarDays, Film, Sparkles, Utensils } from "lucide-react";
import type { PartnerType } from "@/types/partner.types";

export const partnerTypeMeta: Record<
  string,
  { label: string; icon: typeof Sparkles; desc?: string; badgeClass?: string }
> = {
  cinema: {
    label: "Theatre / Cinema Exhibitor",
    icon: Film,
    desc: "Movie theatres, multiplexes & single screens",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
  },
  theatre: {
    label: "Theatre / Cinema Exhibitor",
    icon: Film,
    desc: "Movie theatres, multiplexes & single screens",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
  },
  event_organiser: {
    label: "Live Events Organiser",
    icon: CalendarDays,
    desc: "Concerts, standup, theatre plays, festivals & activities",
    badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
  restaurant: {
    label: "Dining & Restaurant Partner",
    icon: Utensils,
    desc: "Restaurants, cafes, bistros, brunches & fine dining",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  experience_partner: {
    label: "Dining & Experience Partner",
    icon: Utensils,
    desc: "Dining, culinary workshops & culinary experiences",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
  },
};

export function getPartnerTypeMeta(type: string | undefined | null) {
  if (!type) {
    return {
      label: "General Partner",
      icon: Store,
      desc: "Registered business partner",
      badgeClass: "bg-gray-100 text-gray-700 border-gray-200",
    };
  }
  const key = type.toLowerCase();
  return (
    partnerTypeMeta[key] ?? {
      label: type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      icon: Store,
      desc: "Business partner",
      badgeClass: "bg-gray-100 text-gray-700 border-gray-200",
    }
  );
}