import meals from './data/nationwideMeals.json'

const KAYSERI = { lat: 38.7205, lng: 35.4826 }

function kmBetween(a, b) {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return Math.round(2 * R * Math.asin(Math.min(1, Math.sqrt(h))) * 10) / 10
}

const CATALOG = meals.map((meal, index) => ({
  id: `mock-${index + 1}`,
  title: meal.title,
  description: meal.description,
  price: meal.price,
  portions: meal.portions,
  lat: meal.lat,
  lng: meal.lng,
  chef: meal.chef,
  depositRate: 30,
  rating: 4.8,
  reviewCount: 6,
  chefRating: 4.8,
  chefReviewCount: 12,
  imageUrl: meal.image,
  kind: meal.kind,
  il: meal.il,
  ilce: meal.ilce,
  mahalle: `${meal.ilce} Merkez`,
}))

export function fallbackMealsNear(position) {
  const origin = position?.lat && position?.lng ? position : KAYSERI
  return CATALOG.map((meal) => ({
    ...meal,
    distanceKm: kmBetween(origin, meal),
  }))
    .filter((meal) => meal.distanceKm <= 30)
    .sort((a, b) => a.distanceKm - b.distanceKm)
}

export function mealKind(meal) {
  if (meal.kind) return meal.kind
  const text = `${meal.title || ''} ${meal.description || ''}`.toLocaleLowerCase('tr')
  if (text.includes('tatlı') || text.includes('nevzine')) return 'tatli'
  if (text.includes('çorba') || text.includes('kurşun') || text.includes('erişte') || text.includes('kuymak') || text.includes('mıhlama')) return 'corba'
  if (
    text.includes('börek') ||
    text.includes('mantı') ||
    text.includes('köfte') ||
    text.includes('yağla') ||
    text.includes('makarna') ||
    text.includes('pide')
  ) {
    return 'hamur'
  }
  return 'ana'
}
