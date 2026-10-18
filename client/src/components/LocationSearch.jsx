import { useEffect, useRef, useState } from 'react'
import { Search, History, Trash2, MapPin, Loader2 } from 'lucide-react'

const HISTORY_KEY = 'komsuas_search_history'
const MAX_HISTORY = 5
const DEBOUNCE_MS = 350

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.slice(0, MAX_HISTORY) : []
  } catch {
    return []
  }
}

function saveHistory(items) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, MAX_HISTORY)))
}

function pushHistory(place) {
  const prev = loadHistory().filter(
    (item) =>
      !(
        item.name === place.name &&
        Math.abs(item.lat - place.lat) < 1e-5 &&
        Math.abs(item.lng - place.lng) < 1e-5
      ),
  )
  const next = [
    {
      name: place.name,
      lat: Number(place.lat),
      lng: Number(place.lng),
      zoom: place.zoom || 15,
    },
    ...prev,
  ].slice(0, MAX_HISTORY)
  saveHistory(next)
  return next
}

function formatNominatimLabel(item) {
  const a = item.address || {}
  const parts = [
    a.road || a.pedestrian || a.footway || a.path,
    a.neighbourhood || a.suburb || a.quarter || a.residential,
    a.city_district || a.town || a.village || a.municipality,
    a.city || a.state,
  ].filter(Boolean)
  if (parts.length) return [...new Set(parts)].join(', ')
  return item.display_name
}

export default function LocationSearch({ onSelect, locationLabel = '' }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [history, setHistory] = useState(() => loadHistory())
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const wrapRef = useRef(null)
  const abortRef = useRef(null)
  const focusedRef = useRef(false)

  useEffect(() => {
    if (!locationLabel || focusedRef.current) return
    setQuery(locationLabel)
  }, [locationLabel])

  useEffect(() => {
    const onDoc = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      setLoading(false)
      setError(null)
      if (abortRef.current) abortRef.current.abort()
      return undefined
    }

    setLoading(true)
    setError(null)
    const timer = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort()
      const controller = new AbortController()
      abortRef.current = controller

      try {
        const url =
          'https://nominatim.openstreetmap.org/search?format=json&q=' +
          encodeURIComponent(q) +
          '&countrycodes=tr&limit=5&addressdetails=1'

        const res = await fetch(url, {
          signal: controller.signal,
          headers: {
            Accept: 'application/json',
            'Accept-Language': 'tr',
          },
        })
        if (!res.ok) throw new Error('Arama başarısız')
        const data = await res.json()
        const mapped = (data || []).map((item) => ({
          id: item.place_id,
          name: formatNominatimLabel(item),
          fullName: item.display_name,
          lat: Number(item.lat),
          lng: Number(item.lon),
          zoom: 15,
        }))
        setResults(mapped)
      } catch (err) {
        if (err.name === 'AbortError') return
        setResults([])
        setError('Sonuç alınamadı. Tekrar deneyin.')
      } finally {
        setLoading(false)
      }
    }, DEBOUNCE_MS)

    return () => {
      clearTimeout(timer)
    }
  }, [query])

  const pickPlace = (place) => {
    const nextHistory = pushHistory(place)
    setHistory(nextHistory)
    setQuery(place.name)
    setOpen(false)
    setResults([])
    onSelect?.(place)
  }

  const clearHistory = () => {
    saveHistory([])
    setHistory([])
  }

  const showHistory = open && query.trim().length === 0 && history.length > 0
  const showResults = open && query.trim().length >= 2

  return (
    <div className="location-search" ref={wrapRef}>
      <div className="location-search-input">
        <Search size={15} aria-hidden />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => {
            focusedRef.current = true
            setOpen(true)
          }}
          onBlur={() => {
            focusedRef.current = false
          }}
          placeholder="Mahalle, sokak veya ilçe ara…"
          autoComplete="off"
        />
        {loading && <Loader2 size={14} className="location-spinner" aria-hidden />}
      </div>

      {showHistory && (
        <div className="location-results">
          <p className="location-results-title">Son Aramalar</p>
          <ul>
            {history.map((place) => (
              <li key={`${place.name}-${place.lat}-${place.lng}`}>
                <button type="button" onClick={() => pickPlace(place)}>
                  <History size={14} aria-hidden />
                  <span>{place.name}</span>
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="location-clear-history" onClick={clearHistory}>
            <Trash2 size={13} aria-hidden />
            Geçmişi Temizle
          </button>
        </div>
      )}

      {showResults && (
        <div className="location-results">
          {error && <p className="location-results-empty">{error}</p>}
          {!error && !loading && results.length === 0 && (
            <p className="location-results-empty">Sonuç bulunamadı</p>
          )}
          {results.length > 0 && (
            <ul>
              {results.map((place) => (
                <li key={place.id}>
                  <button type="button" onClick={() => pickPlace(place)}>
                    <MapPin size={14} aria-hidden />
                    <span>
                      <strong>{place.name}</strong>
                      {place.fullName && place.fullName !== place.name && (
                        <small>{place.fullName}</small>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
