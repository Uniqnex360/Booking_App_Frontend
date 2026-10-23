export const INDIAN_STATES: string[] = [
  "Karnataka",
  "Tamil Nadu",
  "Kerala",
  "Telangana",
  "Maharashtra",
  "Delhi-NCR",
  "Andhra Pradesh",
  "Gujarat",
  "West Bengal",
];

export const STATE_CITIES: Record<string, string[]> = {
  "Karnataka": ["Bangalore", "Mysore", "Mangalore", "Hubli"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Salem"],
  "Kerala": ["Kochi", "Trivandrum", "Kozhikode", "Thrissur"],
  "Telangana": ["Hyderabad", "Warangal"],
  "Maharashtra": ["Mumbai", "Pune", "Nagpur"],
  "Delhi-NCR": ["Delhi", "Noida", "Gurgaon"],
  "Andhra Pradesh": ["Visakhapatnam", "Vijayawada"],
  "Gujarat": ["Ahmedabad", "Surat", "Vadodara"],
  "West Bengal": ["Kolkata"],
};

export const ALL_SUPPORTED_CITIES: string[] = [
  "Bangalore",
  "Chennai",
  "Kochi",
  "Hyderabad",
  "Mumbai",
  "Pune",
  "Delhi",
  "Noida",
  "Gurgaon",
  "Trivandrum",
  "Kozhikode",
  "Coimbatore",
  "Madurai",
];

export function getStateForCity(city?: string | null): string {
  if (!city) return "Other";
  const c = city.toLowerCase().trim();
  if (c.includes("bang") || c.includes("beng") || c.includes("myso") || c.includes("manga")) return "Karnataka";
  if (c.includes("chenn") || c.includes("madr") || c.includes("coimb") || c.includes("madu") || c.includes("salem")) return "Tamil Nadu";
  if (c.includes("koch") || c.includes("coch") || c.includes("triv") || c.includes("thiru") || c.includes("kozh") || c.includes("cali") || c.includes("thri")) return "Kerala";
  if (c.includes("hyde") || c.includes("secu") || c.includes("wara")) return "Telangana";
  if (c.includes("mumb") || c.includes("bomb") || c.includes("pune") || c.includes("nagp")) return "Maharashtra";
  if (c.includes("delh") || c.includes("noid") || c.includes("gurg") || c.includes("gurug")) return "Delhi-NCR";
  if (c.includes("visa") || c.includes("vija")) return "Andhra Pradesh";
  if (c.includes("ahme") || c.includes("sura") || c.includes("vado")) return "Gujarat";
  if (c.includes("kolk") || c.includes("calc")) return "West Bengal";
  return "Other";
}

export function getCitiesForState(state: string): string[] {
  if (!state || state === "ALL") {
    return ALL_SUPPORTED_CITIES;
  }
  return STATE_CITIES[state] || [];
}

