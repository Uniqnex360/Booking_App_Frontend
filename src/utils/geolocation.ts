export const SUPPORTED_CITIES = ['Kochi', 'Chennai', 'Bangalore'] as const;
export type SupportedCityId = (typeof SUPPORTED_CITIES)[number];

const CITY_STORAGE_KEY = "vybhz_selected_city";

export interface CityCoordinate {
  lat: number;
  lng: number;
  aliases: string[];
}

/**
 * Standard supported cinema exhibition hubs.
 * Aliases only contain direct metropolitan identifiers and official city abbreviations.
 * Sub-towns and districts are resolved dynamically via administrative state mapping and geometry.
 */
export const CITY_COORDINATES: Record<SupportedCityId, CityCoordinate> = {
  Kochi: {
    lat: 9.9312,
    lng: 76.2673,
    aliases: ['kochi', 'cochin', 'cok', 'ernakulam'],
  },
  Chennai: {
    lat: 13.0827,
    lng: 80.2707,
    aliases: ['chennai', 'madras', 'maa'],
  },
  Bangalore: {
    lat: 12.9716,
    lng: 77.5946,
    aliases: ['bangalore', 'bengaluru', 'blr'],
  },
};

/**
 * Standard Indian State / Union Territory administrative codes (ISO 3166-2:IN)
 * and state names mapped to their primary theatrical distribution circuit hub.
 * This dynamically covers all towns, villages, and districts in the state without hardcoding.
 */
export const STATE_TO_REGIONAL_HUB: Record<string, SupportedCityId> = {
  // Tamil Nadu & Puducherry Circuit -> Chennai Hub
  'in-tn': 'Chennai',
  'tamil nadu': 'Chennai',
  'in-py': 'Chennai',
  'puducherry': 'Chennai',
  'pondicherry': 'Chennai',

  // Kerala Circuit -> Kochi Hub
  'in-kl': 'Kochi',
  'kerala': 'Kochi',

  // Karnataka Circuit -> Bangalore Hub
  'in-ka': 'Bangalore',
  'karnataka': 'Bangalore',
};

export function resolveRegionalHubFromState(stateOrCode?: string | null): SupportedCityId | null {
  if (!stateOrCode) return null;
  const key = stateOrCode.trim().toLowerCase();
  return STATE_TO_REGIONAL_HUB[key] || null;
}

export function getStoredCity(): string | null {
  try {
    return (
      localStorage.getItem(CITY_STORAGE_KEY) ||
      localStorage.getItem("vyhbz_selected_city")
    );
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
 * Given latitude and longitude, finds the closest supported city mathematically
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

export interface GeocodeResult {
  locality?: string;
  city?: string;
  state?: string;
  stateCode?: string;
  country?: string;
  countryCode?: string;
}

/**
 * Reverse geocodes coordinates to town/city and state name using reliable client endpoints
 */
export async function reverseGeocodeCoordinates(
  lat: number,
  lng: number
): Promise<GeocodeResult | null> {
  // Primary: BigDataCloud Client Reverse Geocode (free, high-speed, CORS-enabled)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
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
        state: data.principalSubdivision,
        stateCode: data.principalSubdivisionCode,
        country: data.countryName,
        countryCode: data.countryCode,
      };
    }
  } catch (err) {
    console.warn("BigDataCloud reverse geocode failed, trying fallback", err);
  }

  // Secondary Fallback: OpenStreetMap Nominatim
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      return {
        locality: addr.town || addr.city || addr.suburb || addr.village || addr.county,
        city: addr.city || addr.town || addr.county,
        state: addr.state,
        country: addr.country,
        countryCode: addr.country_code ? addr.country_code.toUpperCase() : undefined,
      };
    }
  } catch (err) {
    console.warn("Nominatim reverse geocode failed", err);
  }

  return null;
}

export function getLastDetectedLocality(): string | null {
  try {
    return sessionStorage.getItem("vybhz_detected_locality");
  } catch {
    return null;
  }
}

/**
 * Resolves any physical coordinates and geographic metadata to a supported cinema hub:
 * 1. Matches administrative state / distribution circuit (e.g. any place in Tamil Nadu -> Chennai)
 * 2. Matches city / text alias if exact metropolitan match
 * 3. Uses geometric Haversine spherical distance to find the closest active cinema center
 */
export function resolveLocationToCity(
  lat: number,
  lng: number,
  geo?: GeocodeResult | null
): SupportedCityId {
  if (geo) {
    // 1. Direct state circuit resolution (works dynamically for all towns in the state)
    const stateHub =
      resolveRegionalHubFromState(geo.stateCode) ||
      resolveRegionalHubFromState(geo.state);
    if (stateHub) return stateHub;

    // 2. Direct city / locality text match
    const textHub =
      matchCityFromText(geo.locality) ||
      matchCityFromText(geo.city);
    if (textHub) return textHub;
  }

  // 3. Mathematical geometric closest distance for any other coordinates on Earth
  return findClosestCity(lat, lng);
}

export interface DynamicPlaceSearchResult {
  name: string;
  state?: string;
  regionalHub: SupportedCityId;
  lat: number;
  lng: number;
}

/**
 * Dynamically resolves any searched town, city, or district name (e.g. 'Kumbakonam', 'Thrissur', 'Udupi')
 * into its geographical coordinates and regional cinema hub without hardcoding.
 */
export async function searchPlaceGlobally(query: string): Promise<DynamicPlaceSearchResult | null> {
  const q = query.trim();
  if (q.length < 2) return null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&countrycodes=in&format=json&addressdetails=1&limit=1`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const item = data[0];
        const lat = parseFloat(item.lat);
        const lng = parseFloat(item.lon);
        const addr = item.address || {};
        const state = addr.state;
        const placeName = addr.city || addr.town || addr.village || addr.county || item.name;

        const regionalHub = resolveLocationToCity(lat, lng, {
          locality: placeName,
          state,
          country: addr.country,
        });

        return {
          name: placeName,
          state,
          regionalHub,
          lat,
          lng,
        };
      }
    }
  } catch (err) {
    console.warn("Place search failed", err);
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
      const stateHub = resolveRegionalHubFromState(data.region);
      if (stateHub) return stateHub;

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
        const stateHub = resolveRegionalHubFromState(data.region);
        if (stateHub) return stateHub;

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
        const stateHub = resolveRegionalHubFromState(data.region);
        if (stateHub) return stateHub;

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
 * Detects user location via browser navigator.geolocation first (with high accuracy & generous timeout),
 * reverse-geocodes the exact locality, and dynamically resolves to the regional cinema hub.
 * Smoothly falls back to IP geolocation if GPS permissions are denied.
 */
export async function detectUserLocation(): Promise<SupportedCityId | null> {
  if (typeof window !== "undefined" && "geolocation" in navigator) {
    try {
      const browserResult = await new Promise<{ city: SupportedCityId; locality?: string }>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            let localityName: string | undefined = undefined;

            try {
              const geo = await reverseGeocodeCoordinates(latitude, longitude);
              if (geo) {
                localityName = geo.locality || geo.city;
                if (localityName) {
                  try {
                    sessionStorage.setItem("vybhz_detected_locality", localityName);
                  } catch {}
                }
              }
              const resolvedCity = resolveLocationToCity(latitude, longitude, geo);
              resolve({ city: resolvedCity, locality: localityName });
            } catch {
              resolve({ city: findClosestCity(latitude, longitude) });
            }
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
