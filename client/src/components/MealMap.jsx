import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  CircleMarker,
  ZoomControl,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import L from 'leaflet'
import { Crosshair, Map as MapIcon, Satellite } from 'lucide-react'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

const SERVICE_RADIUS_M = 30000

const OSM_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const OSM_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
const SAT_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
const SAT_ATTR =
  'Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics'

function Recenter({ position, zoom, enabled }) {
  const map = useMap()

  useEffect(() => {
    if (!enabled || !position) return
    map.setView(position, zoom ?? map.getZoom(), { animate: true })
  }, [map, position, zoom, enabled])

  return null
}

function FlyToTarget({ target }) {
  const map = useMap()

  useEffect(() => {
    if (!target?.lat || !target?.lng) return
    map.flyTo([target.lat, target.lng], target.zoom ?? 15, {
      duration: 1.1,
      easeLinearity: 0.25,
    })
  }, [map, target?.id, target?.lat, target?.lng, target?.zoom])

  return null
}

function CenterPinReporter({ enabled, onCenter }) {
  const onCenterRef = useRef(onCenter)
  onCenterRef.current = onCenter
  const map = useMapEvents({
    moveend() {
      if (!enabled) return
      const c = map.getCenter()
      onCenterRef.current?.({ lat: c.lat, lng: c.lng })
    },
  })

  useEffect(() => {
    if (!enabled) return
    const c = map.getCenter()
    onCenterRef.current?.({ lat: c.lat, lng: c.lng })
  }, [map, enabled])

  return null
}

function CenterPin() {
  return (
    <div
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full pointer-events-none z-[1000]"
      aria-hidden
    >
      <div className="center-pin">
        <svg width="36" height="48" viewBox="0 0 36 48" fill="none">
          <path
            d="M18 47c.4 0 8.2-9.2 12.4-16.2C34.2 24.6 36 20.4 36 16.2 36 7.3 28 0 18 0S0 7.3 0 16.2c0 4.2 1.8 8.4 5.6 14.6C9.8 37.8 17.6 47 18 47Z"
            fill="#c4452f"
          />
          <circle cx="18" cy="16" r="6.5" fill="#fff" />
        </svg>
        <span className="center-pin-shadow" />
      </div>
    </div>
  )
}

function MapApiBinder({ onMap }) {
  const map = useMap()
  useEffect(() => {
    onMap?.(map)
  }, [map, onMap])
  return null
}

export default function MealMap({
  userPosition,
  gpsPosition = null,
  zoom = 14,
  meals = [],
  selectedId,
  onSelect,
  pickMode = false,
  onMapClick,
  followCenter = true,
  flyToTarget = null,
}) {
  const [baseLayer, setBaseLayer] = useState('streets') // streets | satellite
  const [showServiceCircle, setShowServiceCircle] = useState(true)
  const [mapInstance, setMapInstance] = useState(null)

  const center = useMemo(
    () => [userPosition.lat, userPosition.lng],
    [userPosition.lat, userPosition.lng],
  )

  const locateTarget = useMemo(() => {
    const src = gpsPosition || userPosition
    if (!src?.lat || !src?.lng) return null
    return { lat: src.lat, lng: src.lng }
  }, [gpsPosition, userPosition])

  const onMapReady = useCallback((map) => {
    setMapInstance(map)
  }, [])

  const goToMyLocation = () => {
    if (!mapInstance || !locateTarget) return

    if (pickMode) {
      mapInstance.flyTo([locateTarget.lat, locateTarget.lng], 18, {
        animate: true,
        duration: 1.2,
      })
      return
    }

    const latlng = L.latLng(locateTarget.lat, locateTarget.lng)
    const bounds = latlng.toBounds(SERVICE_RADIUS_M)
    const circle = L.circle(latlng, { radius: SERVICE_RADIUS_M })

    setShowServiceCircle(true)

    mapInstance.flyTo(latlng, Math.max(mapInstance.getZoom(), 11), {
      duration: 0.85,
      easeLinearity: 0.25,
    })

    window.setTimeout(() => {
      mapInstance.flyToBounds(circle.getBounds?.() || bounds, {
        padding: [48, 48],
        maxZoom: 12,
        duration: 0.9,
      })
    }, 400)
  }

  return (
    <div className="meal-map-shell">
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom
        zoomControl={false}
        className="meal-map"
      >
        {baseLayer === 'streets' ? (
          <TileLayer attribution={OSM_ATTR} url={OSM_URL} />
        ) : (
          <TileLayer attribution={SAT_ATTR} url={SAT_URL} maxZoom={19} />
        )}

        <ZoomControl position="bottomleft" />
        <MapApiBinder onMap={onMapReady} />
        <Recenter position={center} zoom={zoom} enabled={followCenter && !flyToTarget} />
        <FlyToTarget target={flyToTarget} />
        <CenterPinReporter enabled={pickMode} onCenter={onMapClick} />

        {!pickMode && locateTarget && showServiceCircle && (
          <Circle
            center={[locateTarget.lat, locateTarget.lng]}
            radius={SERVICE_RADIUS_M}
            pathOptions={{
              color: '#0f4c45',
              weight: 2,
              fillColor: '#1f7a6e',
              fillOpacity: 0.12,
              dashArray: '6 8',
            }}
          />
        )}

        {!pickMode && (
          <CircleMarker
            center={
              locateTarget
                ? [locateTarget.lat, locateTarget.lng]
                : center
            }
            radius={10}
            pathOptions={{
              color: '#0f4c45',
              fillColor: '#1f7a6e',
              fillOpacity: 0.9,
              weight: 3,
            }}
          >
            <Popup>Konumunuz · 30 km hizmet bölgesi</Popup>
          </CircleMarker>
        )}

        {!pickMode &&
          meals.map((meal) => (
            <Marker
              key={meal.id}
              position={[meal.lat, meal.lng]}
              eventHandlers={{
                click: () => onSelect?.(meal.id),
              }}
              opacity={selectedId && selectedId !== meal.id ? 0.55 : 1}
            >
              <Popup>
                <div className="map-popup">
                  {meal.imageUrl && (
                    <img src={meal.imageUrl} alt={meal.title} />
                  )}
                  <strong>{meal.title}</strong>
                  <br />
                  {meal.chef}
                  <br />
                  {Number(meal.chefReviewCount) > 0
                    ? `★ ${Number(meal.chefRating).toFixed(1)} (${meal.chefReviewCount} Değerlendirme)`
                    : 'Yeni aşçı'}
                  <br />
                  {meal.price} ₺ · {meal.portions} porsiyon
                </div>
              </Popup>
            </Marker>
          ))}
      </MapContainer>

      {pickMode && <CenterPin />}

      <button
        type="button"
        className="map-layer-toggle"
        onClick={() =>
          setBaseLayer((prev) => (prev === 'streets' ? 'satellite' : 'streets'))
        }
        title={baseLayer === 'streets' ? 'Uydu görünümüne geç' : 'Standart haritaya geç'}
        aria-label={baseLayer === 'streets' ? 'Uydu görünümüne geç' : 'Standart haritaya geç'}
      >
        {baseLayer === 'streets' ? (
          <Satellite size={18} aria-hidden />
        ) : (
          <MapIcon size={18} aria-hidden />
        )}
      </button>

      <button
        type="button"
        className="map-locate-btn"
        onClick={goToMyLocation}
        disabled={!locateTarget}
        title={pickMode ? 'Konumuma git · sokak seviyesi' : 'Konumumu göster · 30 km bölge'}
        aria-label={pickMode ? 'Konumuma git' : 'Konumumu göster'}
      >
        <Crosshair size={20} aria-hidden />
      </button>
    </div>
  )
}
