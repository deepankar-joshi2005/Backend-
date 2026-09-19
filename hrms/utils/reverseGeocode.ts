/** @format */

// Resolves GPS coordinates into a short, human-readable address at the
// moment of punch-in/out, so the web app never has to re-geocode (or make a
// user wait) every time attendance history is viewed. Uses OpenStreetMap's
// free Nominatim service — no API key required. Best-effort only: a slow or
// failing geocoder must never block or fail a punch, so callers should
// treat `null` as "coordinates saved, address unavailable" rather than
// an error.
export const reverseGeocode = async (lat: number, lng: number): Promise<string | null> => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`,
      {
        signal: controller.signal,
        headers: {
          // Nominatim's usage policy requires an identifying User-Agent.
          "User-Agent": "TechizeHRMS/1.0 (attendance-punch-location)",
          "Accept-Language": "en",
        },
      }
    );
    clearTimeout(timeout);

    if (!res.ok) return null;

    const data: any = await res.json();
    return data?.display_name || null;
  } catch {
    return null;
  }
};
