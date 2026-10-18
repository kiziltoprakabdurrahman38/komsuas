import centers from './turkey/districtCenters.json'
import { findCityCode, getCities, getDistricts, matchesTr, normalizeTr } from './turkeyAddress.js'

export const POPULAR_CITIES = [
  'Tümü',
  'İstanbul',
  'Ankara',
  'İzmir',
  'Bursa',
  'Antalya',
  'Kayseri',
  'Gaziantep',
  'Trabzon',
  'Adana',
]

export function districtPoint(city, district) {
  const code = findCityCode(city)
  const table = code ? centers[code] : null
  const hit = table?.[district]
  if (hit) return { lat: hit[0], lng: hit[1] }
  const points = Object.values(table || {})
  if (!points.length) return { lat: 39.0, lng: 35.0 }
  const lat = points.reduce((sum, point) => sum + point[0], 0) / points.length
  const lng = points.reduce((sum, point) => sum + point[1], 0) / points.length
  return { lat, lng }
}

export function searchPlaces(query, cityFilter, limit = 40) {
  const needle = normalizeTr(query)
  if (needle) {
    const hits = []
    for (const city of getCities()) {
      if (matchesTr(city.name, needle)) {
        hits.push({ type: 'city', city: city.name })
      }
      for (const district of getDistricts(city.name)) {
        if (matchesTr(district, needle) || matchesTr(`${district} ${city.name}`, needle)) {
          hits.push({ type: 'district', city: city.name, district })
        }
      }
      if (hits.length >= limit) break
    }
    return hits.slice(0, limit)
  }

  if (!cityFilter) {
    return getCities().map((city) => ({ type: 'city', city: city.name }))
  }

  return getDistricts(cityFilter).map((district) => ({
    type: 'district',
    city: cityFilter,
    district,
  }))
}
