import cityList from './turkey/cityList.json'
import districtsByCityCode from './turkey/districtsByCityCode.json'
import neighbourhoodsByDistrictAndCityCode from './turkey/neighbourhoodsByDistrictAndCityCode.json'

/** Kaynak: turkey-neighbourhoods (PTT mahalle listesi) */

export function normalizeTr(value) {
  return String(value || '')
    .toLocaleLowerCase('tr-TR')
    .normalize('NFC')
    .trim()
}

export function matchesTr(haystack, needle) {
  const n = normalizeTr(needle)
  if (!n) return true
  return normalizeTr(haystack).includes(n)
}

const CITIES = [...cityList].sort((a, b) =>
  a.name.localeCompare(b.name, 'tr'),
)

const NAME_TO_CODE = Object.fromEntries(
  CITIES.map((c) => [normalizeTr(c.name), c.code]),
)

export function getCities() {
  return CITIES
}

export function findCityCode(cityName) {
  if (!cityName) return null
  return NAME_TO_CODE[normalizeTr(cityName)] || null
}

export function getDistricts(cityName) {
  const code = findCityCode(cityName)
  if (!code) return []
  return [...(districtsByCityCode[code] || [])].sort((a, b) =>
    a.localeCompare(b, 'tr'),
  )
}

export function getNeighbourhoods(cityName, districtName) {
  const code = findCityCode(cityName)
  if (!code || !districtName) return []
  const byDistrict = neighbourhoodsByDistrictAndCityCode[code] || {}
  const exact = byDistrict[districtName]
  if (exact) return [...exact].sort((a, b) => a.localeCompare(b, 'tr'))

  const key = Object.keys(byDistrict).find(
    (d) => normalizeTr(d) === normalizeTr(districtName),
  )
  if (!key) return []
  return [...(byDistrict[key] || [])].sort((a, b) => a.localeCompare(b, 'tr'))
}

export function filterOptions(options, query, limit = 40) {
  const list = options || []
  if (!normalizeTr(query)) return list.slice(0, limit)
  return list.filter((item) => matchesTr(item, query)).slice(0, limit)
}

export function filterCities(query, limit = 40) {
  const list = getCities()
  if (!normalizeTr(query)) return list.slice(0, limit)
  return list.filter((c) => matchesTr(c.name, query)).slice(0, limit)
}
