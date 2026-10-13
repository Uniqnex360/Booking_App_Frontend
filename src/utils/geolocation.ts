export const SUPPORTED_CITIES = ['Kochi', 'Chennai', 'Bangalore'];

const CITY_STORAGE_KEY = "vyhbz_selected_city";

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

export async function detectCity(): Promise<string | null> {
  try {
    const res = await fetch('https://ipapi.co/json/');
    const data = await res.json();
    const detected = data.city;
    if (detected && SUPPORTED_CITIES.includes(detected)) {
      return detected;
    }
    return null;
  } catch (err) {
    console.error('IP geolocation failed', err);
    return null;
  }
}