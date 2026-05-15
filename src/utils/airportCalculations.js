const R_NM = 3440.065; // Earth radius in nautical miles

export function distanceNm(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R_NM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function bearingDeg(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

export function etaMinutes(distNm, speedKnots) {
  if (!speedKnots || speedKnots < 10) return null;
  return (distNm / speedKnots) * 60;
}

export function msToKnots(ms) {
  return ms * 1.94384;
}

export function mToFt(m) {
  return m * 3.28084;
}

export function detectTheater(lat, lng) {
  if (lat == null || lng == null) return null;
  if (lat >= 38 && lat <= 48 && lng >= 35 && lng <= 50) return "Caucasus";
  if (lat >= 22 && lat <= 29 && lng >= 50 && lng <= 63) return "PersianGulf";
  if (lat >= 30 && lat <= 38 && lng >= 34 && lng <= 44) return "Syria";
  if (lat >= 34 && lat <= 39 && lng >= -119 && lng <= -113) return "Nevada";
  if (lat >= -55 && lat <= -49 && lng >= -62 && lng <= -55) return "SouthAtlantic";
  if (lat >= 27 && lat <= 33 && lng >= 30 && lng <= 38) return "Sinai";
  return null;
}
