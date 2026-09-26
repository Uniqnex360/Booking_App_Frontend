export interface WishlistItem {
  id: string;
  type: "MOVIE" | "EVENT";
  title: string;
  image_url?: string | null;
  subtitle?: string;
  badge?: string;
  link: string;
  addedAt: string;
}

const WISHLIST_STORAGE_KEY = "vyhbz_wishlist";

export function getWishlist(): WishlistItem[] {
  try {
    const raw = localStorage.getItem(WISHLIST_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function addToWishlist(item: WishlistItem): void {
  try {
    const current = getWishlist();
    if (!current.some((i) => i.id === item.id)) {
      const updated = [item, ...current];
      localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event("wishlist-updated"));
    }
  } catch (e) {
    console.error("Failed to add to wishlist", e);
  }
}

export function removeFromWishlist(id: string): void {
  try {
    const current = getWishlist();
    const updated = current.filter((i) => i.id !== id);
    localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event("wishlist-updated"));
  } catch (e) {
    console.error("Failed to remove from wishlist", e);
  }
}

export function isInWishlist(id: string): boolean {
  try {
    const current = getWishlist();
    return current.some((i) => i.id === id);
  } catch {
    return false;
  }
}

export function toggleWishlist(item: WishlistItem): boolean {
  if (isInWishlist(item.id)) {
    removeFromWishlist(item.id);
    return false;
  } else {
    addToWishlist(item);
    return true;
  }
}
