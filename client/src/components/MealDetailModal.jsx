import { useEffect, useRef } from 'react'
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import { BadgeCheck, MapPin, X } from 'lucide-react'

const doorPin = L.divIcon({
  className: 'door-pin',
  html: '<span class="door-pin-dot"></span>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
})

function FocusMeal({ lat, lng }) {
  const map = useMap()

  useEffect(() => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined
    const place = () => {
      map.invalidateSize()
      const size = map.getSize()
      if (size?.x && size?.y) map.setView([lat, lng], 15, { animate: false })
    }
    place()
    const timer = window.setTimeout(() => {
      map.invalidateSize()
      const size = map.getSize()
      if (size?.x && size?.y) map.setView([lat, lng], 15, { animate: false })
    }, 200)
    return () => window.clearTimeout(timer)
  }, [map, lat, lng])

  return null
}

function doorLabel(meal) {
  const district = meal.ilce || 'Kayseri'
  const raw = String(meal.mahalle || '').trim()
  const hood = raw && !/mah/i.test(raw) ? `${raw} Mahallesi` : raw
  const place = hood ? `${district}, ${hood}` : district
  return `${place} (Aşçının Kapı Konumu)`
}

function allergenNote(text) {
  if (!text) return ''
  const match = String(text).match(/[^.]*\b(gluten|alerjen|fındık|fıstık|süt|yumurta|laktoz)\b[^.]*/i)
  return match ? match[0].trim() : ''
}

export default function MealDetailModal({ meal, kindLabel, onClose, onReserve }) {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!meal) return undefined
    const onKey = (event) => {
      if (event.key === 'Escape') onCloseRef.current()
    }
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      document.removeEventListener('keydown', onKey)
    }
  }, [meal])

  if (!meal) return null

  const price = Number(meal.price) || 0
  const rate = Number(meal.depositRate ?? 30)
  const deposit = Math.round(price * (rate / 100) * 100) / 100
  const cash = Math.round((price - deposit) * 100) / 100
  const lat = Number(meal.lat)
  const lng = Number(meal.lng)
  const hasPoint = Number.isFinite(lat) && Number.isFinite(lng)
  const allergen = allergenNote(meal.description)
  const km = Number(meal.distanceKm)

  return (
    <div
      className="fixed inset-0 z-[1800] flex items-end justify-center p-0 sm:items-center sm:p-4"
      onMouseDown={onClose}
    >
      <div className="absolute inset-0 bg-slate-900/60" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="meal-detail-title"
        className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-white text-slate-700 shadow-md"
          onClick={onClose}
          aria-label="Kapat"
        >
          <X size={18} />
        </button>

        <div className="max-h-[90vh] min-h-0 flex-1 overflow-y-auto">
          <div className="grid md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="bg-slate-100">
              {meal.imageUrl ? (
                <img src={meal.imageUrl} alt={meal.title} className="h-64 w-full object-cover md:h-full" />
              ) : (
                <div className="grid h-64 place-items-center text-sm text-slate-500">Fotoğraf yok</div>
              )}
            </div>
            <div className="flex flex-col gap-3 p-5 pr-14">
              <span className="w-fit rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                {kindLabel}
              </span>
              <h2 id="meal-detail-title" className="text-2xl font-semibold tracking-tight text-slate-900">
                {meal.title}
              </h2>
              <div className="flex flex-wrap items-end justify-between gap-2">
                <p className="text-2xl font-semibold text-emerald-700">{price} ₺</p>
                <p className="text-sm font-medium text-slate-500">{meal.portions} porsiyon kaldı</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3">
                <p className="font-semibold text-slate-800">{meal.chef}</p>
                <div className="mt-1 flex flex-wrap gap-2 text-xs font-medium text-emerald-800">
                  <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1">
                    <BadgeCheck size={14} aria-hidden />
                    Onaylı Ev Aşçısı
                  </span>
                  <span className="rounded-full bg-white px-2 py-1">Kapıdan Sıcak Teslim</span>
                </div>
              </div>
              <p className="text-sm leading-6 text-slate-600">{meal.description || 'Açıklama eklenmemiş.'}</p>
              {allergen && (
                <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                  Alerjen notu: {allergen}
                </p>
              )}
            </div>
          </div>

          <div className="px-5 pb-5">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-800">Teslimat konumu</h3>
              {Number.isFinite(km) && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  <MapPin size={13} aria-hidden />
                  Size {km.toFixed(1)} km mesafede
                </span>
              )}
            </div>
            {hasPoint ? (
              <div className="h-[240px] overflow-hidden rounded-2xl border border-slate-100">
                <MapContainer
                  center={[lat, lng]}
                  zoom={15}
                  scrollWheelZoom={false}
                  className="h-full w-full"
                  attributionControl
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap'
                  />
                  <Marker position={[lat, lng]} icon={doorPin} />
                  <FocusMeal lat={lat} lng={lng} />
                </MapContainer>
              </div>
            ) : (
              <p className="rounded-2xl bg-slate-50 px-3 py-4 text-sm text-slate-500">
                Bu ilan için kapı koordinatı yok.
              </p>
            )}
            <p className="mt-2 flex items-start gap-1.5 text-sm font-medium text-slate-700">
              <MapPin size={16} className="mt-0.5 shrink-0 text-emerald-700" aria-hidden />
              {doorLabel(meal)}
            </p>
          </div>
        </div>

        <footer className="flex flex-col gap-3 border-t border-slate-100 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-600">
            <p>Kapora %{rate}: <strong className="text-slate-900">{deposit.toFixed(2)} ₺</strong></p>
            <p>Kapıda nakit: <strong className="text-slate-900">{cash.toFixed(2)} ₺</strong></p>
          </div>
          <button
            type="button"
            className="h-12 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={onReserve}
            disabled={meal.portions < 1}
          >
            Şimdi Rezerve Et
          </button>
        </footer>
      </div>
    </div>
  )
}
