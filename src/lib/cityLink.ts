import { useSearchParams } from "react-router-dom";

export function useCity(): string {
  const [searchParams] = useSearchParams();
  return searchParams.get("city") || "Kochi";
}

export function withCity(path: string, city: string): string {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}city=${encodeURIComponent(city)}`;
}
