export const GEO_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 0,
}

export function pointFromPosition(pos) {
  return {
    lat: pos.coords.latitude,
    lng: pos.coords.longitude,
    accuracy: pos.coords.accuracy,
  }
}

export function movedMeters(a, b) {
  if (!a || !b) return Infinity
  const R = 6371000
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

export async function reversePlaceLabel(lat, lng) {
  const url =
    'https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=18' +
    `&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'Accept-Language': 'tr',
    },
  })
  if (!res.ok) return ''
  const data = await res.json()
  const address = data.address || {}
  const neighbourhood =
    address.neighbourhood ||
    address.suburb ||
    address.quarter ||
    address.residential ||
    address.hamlet
  const district =
    address.city_district ||
    address.town ||
    address.county ||
    address.municipality ||
    address.city
  const parts = [...new Set([neighbourhood, district].filter(Boolean))]
  if (parts.length) return parts.join(', ')
  return data.display_name || ''
}
