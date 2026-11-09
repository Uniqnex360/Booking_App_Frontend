export const SUPPORTED_CITIES = ['Kochi', 'Chennai', 'Bangalore'] as const;
export type SupportedCityId = (typeof SUPPORTED_CITIES)[number];

const CITY_STORAGE_KEY = "vyhbz_selected_city";

export interface CityCoordinate {
  lat: number;
  lng: number;
  aliases: string[];
}

export const CITY_COORDINATES: Record<SupportedCityId, CityCoordinate> = {
  Kochi: {
    lat: 9.9312,
    lng: 76.2673,
    aliases: [
      'kochi', 'cochin', 'ernakulam', 'kerala', 'thodupuzha', 'aluva',
      'kalamassery', 'thrissur', 'kottayam', 'trivandrum', 'thiruvananthapuram',
      'calicut', 'kozhikode', 'palakkad', 'kannur', 'malappuram', 'kollam'
    ],
  },
  Chennai: {
    lat: 13.0827,
    lng: 80.2707,
    aliases: [
      'chennai', 'madras', 'tamil nadu', 'kumbakonam', 'thanjavur', 'trichy',
      'tiruchirappalli', 'madurai', 'salem', 'vellore', 'tirunelveli', 'coimbatore',
      'erode', 'tiruppur', 'pondicherry', 'puducherry', 'cuddalore', 'dindigul',
      'karur', 'nagapattinam', 'mayiladuthurai', 'thiruvarur', 'kanchipuram'
    ],
  },
  Bangalore: {
    lat: 12.9716,
    lng: 77.5946,
    aliases: [
      'bangalore', 'bengaluru', 'karnataka', 'mysore', 'mysuru', 'mangalore',
      'mangaluru', 'hubli', 'belgaum', 'tumkur'
    ],
  },
};

export function getStoredCity(): string | null {
  try {
    return localStorage.getItem(CITY_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function storeCity(city: string): void {
  try {
    localStorage.setItem(CITY_STORAGE_KEY, city);
  } catch {}
}

/**
 * Calculates distance between two coordinates in kilometers using Haversine formula
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Given latitude and longitude, finds the closest supported city
 */
export function findClosestCity(lat: number, lng: number): SupportedCityId {
  let closest: SupportedCityId = 'Kochi';
  let minDistance = Infinity;

  for (const cityId of SUPPORTED_CITIES) {
    const loc = CITY_COORDINATES[cityId];
    const distance = calculateDistance(lat, lng, loc.lat, loc.lng);
    if (distance < minDistance) {
      minDistance = distance;
      closest = cityId;
    }
  }

  return closest;
}

/**
 * Matches a city or region name string against supported city aliases
 */
export function matchCityFromText(text?: string | null): SupportedCityId | null {
  if (!text) return null;
  const lower = text.toLowerCase().trim();

  for (const cityId of SUPPORTED_CITIES) {
    if (cityId.toLowerCase() === lower) return cityId;
    const { aliases } = CITY_COORDINATES[cityId];
    if (aliases.some((alias) => lower.includes(alias) || alias.includes(lower))) {
      return cityId;
    }
  }
  return null;
}

/**
 * IP-based geolocation fallback using multiple reliable, CORS-enabled endpoints
 */
export async function detectCityFromIp(): Promise<SupportedCityId | null> {
  // Service 1: geojs.io (Free, HTTPS, CORS-enabled, reliable)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await fetch('https://get.geojs.io/v1/ip/geo.json', { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      const lat = parseFloat(data.latitude);
      const lng = parseFloat(data.longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        return findClosestCity(lat, lng);
      }
      const matched = matchCityFromText(data.city) || matchCityFromText(data.region);
      if (matched) return matched;
    }
  } catch (err) {
    console.warn('GeoJS IP detection failed, trying fallback', err);
  }

  // Service 2: ipwho.is (Free, HTTPS, CORS-enabled)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await fetch('https://ipwho.is/', { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (data.success !== false) {
        if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
          return findClosestCity(data.latitude, data.longitude);
        }
        const matched = matchCityFromText(data.city) || matchCityFromText(data.region);
        if (matched) return matched;
      }
    }
  } catch (err) {
    console.warn('IPWho.is detection failed, trying fallback', err);
  }

  // Service 3: ipapi.co
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const res = await fetch('https://ipapi.co/json/', { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (!data.error) {
        if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
          return findClosestCity(data.latitude, data.longitude);
        }
        const matched = matchCityFromText(data.city) || matchCityFromText(data.region);
        if (matched) return matched;
      }
    }
  } catch (err) {
    console.warn('ipapi.co detection failed', err);
  }

  return null;
}

/**
 * Reverse geocodes coordinates to town/city and state name using free client endpoint
 */
export async function reverseGeocodeCoordinates(
  lat: number,
  lng: number
): Promise<{ locality?: string; city?: string; state?: string } | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      return {
        locality: data.locality || data.city,
        city: data.city || data.locality,
        state: data.principalSubdivision || data.countrySubdivisionName,
      };
    }
  } catch (err) {
    console.warn("Reverse geocode failed", err);
  }
  return null;
}

export function getLastDetectedLocality(): string | null {
  try {
    return sessionStorage.getItem("vyhbz_detected_locality");
  } catch {
    return null;
  }
}

/**
 * Detects user location via browser navigator.geolocation first (with high accuracy & generous timeout),
 * reverse-geocodes the exact locality (e.g. Kumbakonam), then maps to the correct regional hub.
 * Smoothly falls back to IP geolocation if permissions are denied.
 */
export async function detectUserLocation(): Promise<SupportedCityId | null> {
  if (typeof window !== "undefined" && "geolocation" in navigator) {
    try {
      const browserResult = await new Promise<{ city: SupportedCityId; locality?: string }>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            let resolvedCity: SupportedCityId = findClosestCity(latitude, longitude);
            let localityName: string | undefined = undefined;

            try {
              const geo = await reverseGeocodeCoordinates(latitude, longitude);
              if (geo) {
                localityName = geo.locality || geo.city;
                if (localityName) {
                  try {
                    sessionStorage.setItem("vyhbz_detected_locality", localityName);
                  } catch {}
                }

                // If reverse geocoding confirms Tamil Nadu / Chennai aliases
                const matchedFromText =
                  matchCityFromText(geo.locality) ||
                  matchCityFromText(geo.city) ||
                  matchCityFromText(geo.state);

                if (matchedFromText) {
                  resolvedCity = matchedFromText;
                }
              }
            } catch {}

            resolve({ city: resolvedCity, locality: localityName });
          },
          (err) => reject(err),
          { timeout: 10000, enableHighAccuracy: true, maximumAge: 120000 }
        );
      });

      if (browserResult?.city) {
        return browserResult.city;
      }
    } catch {
      // Permission denied, timeout, or location unavailable -> smoothly fallback to IP
    }
  }

  return await detectCityFromIp();
}

/**
 * Standard detectCity function (defaults to IP detection to avoid unwanted permission prompts on load)
 */
export async function detectCity(): Promise<SupportedCityId | null> {
  return await detectCityFromIp();
}
