export const SUPPORTED_CITIES = ['Kochi', 'Chennai', 'Bangalore'];

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