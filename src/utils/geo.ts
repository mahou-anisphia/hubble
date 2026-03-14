export const AQI_PRECISION = 0.05; // ~5 km
export const OPENWEATHER_PRECISION = 0.2; // ~20 km

export function roundCoord(
  lat: number,
  lon: number,
  precision: number
): { lat: number; lon: number } {
  return {
    lat: Math.round(lat / precision) * precision,
    lon: Math.round(lon / precision) * precision,
  };
}

export function makeCacheKey(
  prefix: string,
  lat: number,
  lon: number,
  precision: number
): string {
  const r = roundCoord(lat, lon, precision);
  return `${prefix}:${r.lat}:${r.lon}`;
}
