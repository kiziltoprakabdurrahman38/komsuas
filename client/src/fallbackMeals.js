const KAYSERI = { lat: 38.722, lng: 35.487 }

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

const CATALOG = [
  {
    id: 'mock-bamya',
    title: 'Etli Bamya',
    description: 'Limonlu, salçalı ev usulü etli bamya.',
    price: 120,
    portions: 4,
    lat: 38.7228,
    lng: 35.4659,
    chef: 'Hatice Nine',
    depositRate: 30,
    rating: 4.8,
    reviewCount: 12,
    chefRating: 4.9,
    chefReviewCount: 28,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Etli_kuru_bamya.jpg/960px-Etli_kuru_bamya.jpg',
    kind: 'ana',
  },
  {
    id: 'mock-manti',
    title: 'Kayseri Mantısı',
    description: 'El açması, yoğurt, sumak ve tereyağlı sos ile.',
    price: 140,
    portions: 6,
    lat: 38.7285,
    lng: 35.4718,
    chef: 'Fatma Hanım',
    depositRate: 30,
    rating: 4.9,
    reviewCount: 21,
    chefRating: 4.8,
    chefReviewCount: 34,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Kayseri_mant%C4%B1s%C4%B1.jpg/960px-Kayseri_mant%C4%B1s%C4%B1.jpg',
    kind: 'hamur',
  },
  {
    id: 'mock-yaglama',
    title: 'Kayseri Yağlaması',
    description: 'İnce yufka üzerinde kuşbaşı et, domates ve biber.',
    price: 135,
    portions: 6,
    lat: 38.6905,
    lng: 35.5512,
    chef: 'Ayşe Teyze',
    depositRate: 30,
    rating: 4.7,
    reviewCount: 9,
    chefRating: 4.8,
    chefReviewCount: 19,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/Ya%C4%9Flama.jpg/960px-Ya%C4%9Flama.jpg',
    kind: 'hamur',
  },
  {
    id: 'mock-kursun',
    title: 'Kurşun Aşı',
    description: 'Nohutlu hamur çorbası, üstü kırmızı biberli yağ.',
    price: 110,
    portions: 5,
    lat: 38.7488,
    lng: 35.4562,
    chef: 'Mehmet Usta',
    depositRate: 30,
    rating: 4.6,
    reviewCount: 7,
    chefRating: 4.7,
    chefReviewCount: 16,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Yuksuk_soup.jpg/960px-Yuksuk_soup.jpg',
    kind: 'corba',
  },
  {
    id: 'mock-boregi',
    title: 'Su Böreği',
    description: 'El açması yufka, peynirli ve maydanozlu tepsi dilimi.',
    price: 150,
    portions: 5,
    lat: 38.7412,
    lng: 35.4286,
    chef: 'Hatice Nine',
    depositRate: 30,
    rating: 4.8,
    reviewCount: 11,
    chefRating: 4.9,
    chefReviewCount: 28,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Su_b%C3%B6re%C4%9Fi_and_tea.jpg/960px-Su_b%C3%B6re%C4%9Fi_and_tea.jpg',
    kind: 'hamur',
  },
  {
    id: 'mock-fasulye',
    title: 'Kuru Fasulye',
    description: 'Salçalı, etli kuru fasulye. Yanında pilav düşünülerek.',
    price: 95,
    portions: 8,
    lat: 38.7358,
    lng: 35.4695,
    chef: 'Mehmet Usta',
    depositRate: 30,
    rating: 4.7,
    reviewCount: 15,
    chefRating: 4.7,
    chefReviewCount: 16,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/61/Etli_kuru_fasulye.jpg/960px-Etli_kuru_fasulye.jpg',
    kind: 'ana',
  },
  {
    id: 'mock-nevzine',
    title: 'Nevzine Tatlısı',
    description: 'Cevizli, pekmezli ve şerbetli tepsi tatlısı.',
    price: 90,
    portions: 8,
    lat: 38.7198,
    lng: 35.4855,
    chef: 'Fatma Hanım',
    depositRate: 30,
    rating: 4.9,
    reviewCount: 8,
    chefRating: 4.8,
    chefReviewCount: 34,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Nevzine_tatl%C4%B1s%C4%B1_tabakta.jpg/960px-Nevzine_tatl%C4%B1s%C4%B1_tabakta.jpg',
    kind: 'tatli',
  },
  {
    id: 'mock-icli',
    title: 'İçli Köfte',
    description: 'Kızartma içli köfte, adet fiyatı.',
    price: 45,
    portions: 12,
    lat: 38.7252,
    lng: 35.4851,
    chef: 'Zeynep Abla',
    depositRate: 30,
    rating: 4.6,
    reviewCount: 6,
    chefRating: 4.5,
    chefReviewCount: 11,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/%C4%B0%C3%A7li_k%C3%B6fte_20250205.jpg/960px-%C4%B0%C3%A7li_k%C3%B6fte_20250205.jpg',
    kind: 'hamur',
  },
  {
    id: 'mock-firin',
    title: 'Fırın Ağzı',
    description: 'Kuzu eti, domates, biber ve sarımsak. Tepside.',
    price: 120,
    portions: 4,
    lat: 38.7316,
    lng: 35.4974,
    chef: 'Zeynep Abla',
    depositRate: 30,
    rating: 4.5,
    reviewCount: 4,
    chefRating: 4.5,
    chefReviewCount: 11,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Etli_g%C3%BCve%C3%A7.jpg/960px-Etli_g%C3%BCve%C3%A7.jpg',
    kind: 'ana',
  },
  {
    id: 'mock-kesme',
    title: 'Kesme Çorba',
    description: 'Ev eriştesi, nohut ve naneli yağ.',
    price: 85,
    portions: 7,
    lat: 38.7264,
    lng: 35.4908,
    chef: 'Ayşe Teyze',
    depositRate: 30,
    rating: 4.4,
    reviewCount: 5,
    chefRating: 4.8,
    chefReviewCount: 19,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/39/Terbiyeli_tel_sehriye.jpg/960px-Terbiyeli_tel_sehriye.jpg',
    kind: 'corba',
  },
]

export function fallbackMealsNear(position) {
  const origin = position?.lat && position?.lng ? position : KAYSERI
  return CATALOG.map((meal) => ({
    ...meal,
    distanceKm: kmBetween(origin, meal),
  })).sort((a, b) => a.distanceKm - b.distanceKm)
}

export function mealKind(meal) {
  if (meal.kind) return meal.kind
  const text = `${meal.title || ''} ${meal.description || ''}`.toLocaleLowerCase('tr')
  if (text.includes('tatlı') || text.includes('nevzine')) return 'tatli'
  if (text.includes('çorba') || text.includes('kurşun') || text.includes('erişte')) return 'corba'
  if (
    text.includes('börek') ||
    text.includes('mantı') ||
    text.includes('köfte') ||
    text.includes('yağla') ||
    text.includes('makarna')
  ) {
    return 'hamur'
  }
  return 'ana'
}
