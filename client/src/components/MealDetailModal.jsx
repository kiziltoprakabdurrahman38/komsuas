import { useEffect, useRef, useState } from 'react'
import { Circle, CircleMarker, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import { BadgeCheck, LocateFixed, Map as MapIcon, MapPin, Navigation, Satellite, X } from 'lucide-react'
import { GEO_OPTIONS, pointFromPosition } from '../locationGeo.js'

const OSM_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const OSM_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
const SAT_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
const SAT_ATTR = 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'

const doorPin = L.divIcon({
  className: 'door-pin',
  html: '<span class="door-pin-dot"></span>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
})

const userDot = L.divIcon({
  className: 'user-pulse-icon',
  html: '<span class="user-pulse-ring"></span><span class="user-pulse-dot"></span>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})

function FocusMeal({ lat, lng }) {
  const map = useMap()

  useEffect(() => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined
    let placed = false
    const place = () => {
      map.invalidateSize()
      const size = map.getSize()
      if (!(size?.x && size?.y) || placed) return
      map.setView([lat, lng], 15, { animate: false })
      placed = true
    }
    place()
    const timer = window.setTimeout(place, 300)
    return () => window.clearTimeout(timer)
  }, [map, lat, lng])

  return null
}

function MapBridge({ mapRef }) {
  const map = useMap()
  useEffect(() => {
    mapRef.current = map
    return () => {
      if (mapRef.current === map) mapRef.current = null
    }
  }, [map, mapRef])
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

function guardMapButton(node) {
  if (!node || node.dataset.mapGuard === '1') return
  node.dataset.mapGuard = '1'
  L.DomEvent.disableClickPropagation(node)
  L.DomEvent.disableScrollPropagation(node)
}

function finitePoint(point) {
  const lat = Number(point?.lat)
  const lng = Number(point?.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return { lat, lng, accuracy: Number(point.accuracy) }
}

export default function MealDetailModal({ meal, kindLabel, onClose, onReserve }) {
  const onCloseRef = useRef(onClose)
  const mapRef = useRef(null)
  onCloseRef.current = onClose
  const [isSatellite, setIsSatellite] = useState(false)
  const [deviceRealGpsLocation, setDeviceRealGpsLocation] = useState(null)

  useEffect(() => {
    if (!meal || !navigator.geolocation) return undefined
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setDeviceRealGpsLocation(pointFromPosition(pos)),
      () => {},
      GEO_OPTIONS,
    )
    return () => navigator.geolocation.clearWatch(watchId)
  }, [meal])

  useEffect(() => {
    if (!meal) return undefined
    const timer = window.setTimeout(() => {
      mapRef.current?.invalidateSize()
    }, 300)
    return () => window.clearTimeout(timer)
  }, [meal])

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
  const accuracy = Number(deviceRealGpsLocation?.accuracy)
  const showAccuracy = Number.isFinite(accuracy) && accuracy >= 8 && accuracy <= 250

  const openDirections = () => {
    const destination = `${lat},${lng}`
    let mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`
    if (deviceRealGpsLocation?.lat && deviceRealGpsLocation?.lng) {
      mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${deviceRealGpsLocation.lat},${deviceRealGpsLocation.lng}&destination=${destination}&travelmode=driving`
    }
    window.open(mapsUrl, '_blank', 'noopener,noreferrer')
  }

  const flyToUser = () => {
    const go = (point) => {
      if (!point?.lat || !point?.lng) return
      setDeviceRealGpsLocation(point)
      mapRef.current?.flyTo([point.lat, point.lng], 18, { animate: true, duration: 1.2 })
    }
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => go(pointFromPosition(pos)),
      () => {},
      GEO_OPTIONS,
    )
  }

  return (
    <div
      className="fixed inset-0 z-[1800] flex items-end justify-center md:items-center md:p-4"
      onMouseDown={onClose}
    >
      <div className="absolute inset-0 bg-slate-900/60" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="meal-detail-title"
        className="sheet-panel relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-[32px] bg-white pb-[env(safe-area-inset-bottom,16px)] shadow-2xl md:max-h-[90vh] md:rounded-3xl md:pb-0"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="sheet-handle md:hidden" aria-hidden />
        <button
          type="button"
          className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-white text-slate-700 shadow-md"
          onClick={onClose}
          aria-label="Kapat"
        >
          <X size={18} />
        </button>

        <div className="min-h-0 flex-1 overflow-y-auto">
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
              <div
                id="meal-detail-map"
                className="meal-detail-map relative z-0 my-3 w-full overflow-hidden rounded-2xl border border-slate-200/90 shadow-inner"
              >
                <MapContainer
                  center={[lat, lng]}
                  zoom={15}
                  maxZoom={19}
                  dragging
                  touchZoom
                  scrollWheelZoom
                  className="h-full w-full"
                  attributionControl
                >
                  <TileLayer
                    key={isSatellite ? 'satellite' : 'streets'}
                    url={isSatellite ? SAT_URL : OSM_URL}
                    attribution={isSatellite ? SAT_ATTR : OSM_ATTR}
                    maxZoom={19}
                  />
                  <Marker position={[lat, lng]} icon={doorPin} />
                  {deviceRealGpsLocation && showAccuracy && (
                    <Circle
                      center={[deviceRealGpsLocation.lat, deviceRealGpsLocation.lng]}
                      radius={accuracy}
                      pathOptions={{ color: '#2563eb', weight: 0, fillColor: '#2563eb', fillOpacity: 0.18 }}
                    />
                  )}
                  {deviceRealGpsLocation && (
                    <>
                      <CircleMarker
                        center={[deviceRealGpsLocation.lat, deviceRealGpsLocation.lng]}
                        radius={8}
                        pathOptions={{ color: '#ffffff', weight: 2, fillColor: '#2563eb', fillOpacity: 1 }}
                      >
                        <Popup>📍 Sizin Konumunuz</Popup>
                      </CircleMarker>
                      <Marker position={[deviceRealGpsLocation.lat, deviceRealGpsLocation.lng]} icon={userDot} zIndexOffset={800} />
                    </>
                  )}
                  <FocusMeal lat={lat} lng={lng} />
                  <MapBridge mapRef={mapRef} />
                </MapContainer>
                <button
                  type="button"
                  ref={guardMapButton}
                  title="Uydu / Harita Görünümünü Değiştir"
                  aria-label="Uydu Harita Geçişi"
                  className={`absolute top-3 right-3 z-[500] flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border bg-white/95 text-slate-700 shadow-md transition-all duration-200 hover:scale-105 hover:bg-white hover:shadow-lg active:scale-95 ${
                    isSatellite
                      ? 'border-transparent text-emerald-600 ring-2 ring-emerald-500'
                      : 'border-slate-200/90'
                  }`}
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation()
                    setIsSatellite((prev) => !prev)
                  }}
                >
                  {isSatellite ? <MapIcon size={18} aria-hidden /> : <Satellite size={18} aria-hidden />}
                </button>
                <button
                  type="button"
                  ref={guardMapButton}
                  className="absolute bottom-10 right-3 z-[500] flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-md transition-all hover:bg-blue-50 hover:text-blue-600"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation()
                    flyToUser()
                  }}
                  aria-label="Konumuma git"
                >
                  <LocateFixed size={16} aria-hidden />
                </button>
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
            {hasPoint ? (
              <button
                type="button"
                className="mt-3 flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-blue-700 hover:shadow-lg"
                onClick={openDirections}
              >
                <Navigation size={16} aria-hidden />
                Google Haritalar&apos;da Yol Tarifi Al
              </button>
            ) : null}
          </div>
        </div>

        <footer className="z-10 flex shrink-0 flex-col gap-3 border-t border-slate-100 bg-white px-5 py-4 md:flex-row md:items-center md:justify-between">
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
