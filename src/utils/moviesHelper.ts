export function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

export function formatReleaseDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function getEmbedTrailerUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.includes("youtube.com/watch")) {
    const v = new URLSearchParams(url.split("?")[1]).get("v");
    return v ? `https://www.youtube.com/embed/${v}?autoplay=1` : url;
  }
  if (url.includes("youtu.be/")) {
    const id = url.split("youtu.be/")[1]?.split("?")[0];
    return id ? `https://www.youtube.com/embed/${id}?autoplay=1` : url;
  }
  if (url.includes("youtube.com/embed/")) {
    return url.includes("autoplay=1") ? url : `${url}?autoplay=1`;
  }
  return url;
}