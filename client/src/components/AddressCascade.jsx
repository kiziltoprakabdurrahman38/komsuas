import { useEffect, useMemo, useRef, useState } from 'react'
import SearchableSelect from './SearchableSelect.jsx'
import {
  getCities,
  getDistricts,
  getNeighbourhoods,
  normalizeTr,
} from '../data/turkeyAddress.js'

const NOMINATIM_HEADERS = {
  Accept: 'application/json',
  'Accept-Language': 'tr',
}

async function geocodePlace(query, { signal, zoomHint = 15 } = {}) {
  const url =
    'https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=1&countrycodes=tr&q=' +
    encodeURIComponent(query)
  const res = await fetch(url, { signal, headers: NOMINATIM_HEADERS })
  if (!res.ok) throw new Error('Nominatim hatası')
  const data = await res.json()
  const hit = data?.[0]
  if (!hit) return null
  return {
    lat: Number(hit.lat),
    lng: Number(hit.lon),
    zoom: zoomHint,
    label: hit.display_name,
  }
}

async function searchStreets({ street, mahalle, ilce, il, signal }) {
  const q = [street, mahalle, ilce, il, 'Türkiye'].filter(Boolean).join(', ')
  const url =
    'https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=8&countrycodes=tr&q=' +
    encodeURIComponent(q)
  const res = await fetch(url, { signal, headers: NOMINATIM_HEADERS })
  if (!res.ok) throw new Error('Sokak araması başarısız')
  const data = await res.json()
  const names = []
  const seen = new Set()
  for (const item of data || []) {
    const a = item.address || {}
    const road =
      a.road || a.pedestrian || a.footway || a.path || a.residential || null
    if (!road) continue
    const key = normalizeTr(road)
    if (seen.has(key)) continue
    seen.add(key)
    names.push(road)
  }
  return names
}

/**
 * Cascading İl → İlçe → Mahalle + Nominatim sokak önerileri.
 * onLocationResolve({ lat, lng, zoom, id, source }) — harita flyTo için.
 */
export default function AddressCascade({
  value,
  onChange,
  onLocationResolve,
  defaultCity = 'Kayseri',
}) {
  const cities = useMemo(() => getCities().map((c) => c.name), [])
  const [streetSuggestions, setStreetSuggestions] = useState([])
  const [streetLoading, setStreetLoading] = useState(false)
  const streetAbort = useRef(null)
  const geoAbort = useRef(null)
  const flySeq = useRef(0)

  const il = value.il || ''
  const ilce = value.ilce || ''
  const mahalle = value.mahalle || ''
  const sokak = value.sokak || ''

  const districts = useMemo(() => (il ? getDistricts(il) : []), [il])
  const neighbourhoods = useMemo(
    () => (il && ilce ? getNeighbourhoods(il, ilce) : []),
    [il, ilce],
  )

  // İlk yüklemede varsayılan il
  useEffect(() => {
    if (!value.il && defaultCity) {
      onChange({ ...value, il: defaultCity })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const patch = (partial) => onChange({ ...value, ...partial })

  const resolveAndFly = async (parts, zoom) => {
    const query = [...parts, 'Türkiye'].filter(Boolean).join(', ')
    if (geoAbort.current) geoAbort.current.abort()
    const controller = new AbortController()
    geoAbort.current = controller
    const seq = ++flySeq.current
    try {
      const place = await geocodePlace(query, {
        signal: controller.signal,
        zoomHint: zoom,
      })
      if (!place || seq !== flySeq.current) return
      onLocationResolve?.({
        ...place,
        zoom,
        id: `addr-${seq}-${Date.now()}`,
        source: 'cascade',
      })
    } catch (err) {
      if (err.name === 'AbortError') return
    }
  }

  const onCitySelect = (nextIl) => {
    patch({
      il: nextIl,
      ilce: '',
      mahalle: '',
      sokak: value.sokak || '',
    })
    setStreetSuggestions([])
    if (nextIl) resolveAndFly([nextIl], 11)
  }

  const onDistrictSelect = (nextIlce) => {
    patch({
      ilce: nextIlce,
      mahalle: '',
      sokak: value.sokak || '',
    })
    setStreetSuggestions([])
    if (il && nextIlce) resolveAndFly([nextIlce, il], 13)
  }

  const onNeighbourhoodSelect = (nextMahalle) => {
    patch({ mahalle: nextMahalle })
    if (il && ilce && nextMahalle) {
      resolveAndFly([nextMahalle, ilce, il], 16)
    }
  }

  // Sokak Nominatim önerileri (serbest metin + öneri)
  useEffect(() => {
    const q = String(sokak || '').trim()
    if (q.length < 2 || !il || !ilce) {
      setStreetSuggestions([])
      setStreetLoading(false)
      if (streetAbort.current) streetAbort.current.abort()
      return undefined
    }

    setStreetLoading(true)
    const timer = window.setTimeout(async () => {
      if (streetAbort.current) streetAbort.current.abort()
      const controller = new AbortController()
      streetAbort.current = controller
      try {
        const names = await searchStreets({
          street: q,
          mahalle,
          ilce,
          il,
          signal: controller.signal,
        })
        setStreetSuggestions(names)
      } catch (err) {
        if (err.name !== 'AbortError') setStreetSuggestions([])
      } finally {
        setStreetLoading(false)
      }
    }, 400)

    return () => {
      window.clearTimeout(timer)
    }
  }, [sokak, mahalle, ilce, il])

  return (
    <div className="address-cascade">
      <div className="form-row">
        <SearchableSelect
          label="İl"
          value={il}
          options={cities}
          onChange={onCitySelect}
          placeholder="İl ara… (ör. Kayseri)"
        />
        <SearchableSelect
          label="İlçe"
          value={ilce}
          options={districts}
          onChange={onDistrictSelect}
          disabled={!il}
          placeholder={il ? 'İlçe ara…' : 'Önce il seçin'}
          emptyText="Bu il için ilçe bulunamadı"
        />
      </div>

      <SearchableSelect
        label="Mahalle"
        value={mahalle}
        options={neighbourhoods}
        onChange={onNeighbourhoodSelect}
        disabled={!ilce}
        placeholder={ilce ? 'Mahalle ara…' : 'Önce ilçe seçin'}
        emptyText="Bu ilçe için mahalle bulunamadı"
      />

      <SearchableSelect
        label="Sokak / Bulvar / Cadde"
        value={sokak}
        options={streetSuggestions}
        onChange={(next) => {
          patch({ sokak: next })
          const isSuggestion = streetSuggestions.some(
            (s) => normalizeTr(s) === normalizeTr(next),
          )
          if (isSuggestion && next.trim() && il && ilce) {
            resolveAndFly([next, mahalle, ilce, il].filter(Boolean), 17)
          }
        }}
        disabled={!mahalle}
        allowFreeText
        loading={streetLoading}
        placeholder={
          mahalle
            ? 'Sokak yazın veya öneriden seçin'
            : 'Önce mahalle seçin'
        }
        emptyText="Öneri yok — serbest yazabilirsiniz"
      />

      <div className="form-row form-row-3">
        <label>
          Bina / Kapı No
          <input
            value={value.binaNo || ''}
            onChange={(e) => patch({ binaNo: e.target.value })}
            disabled={!mahalle}
          />
        </label>
        <label>
          Kat
          <input
            value={value.kat || ''}
            onChange={(e) => patch({ kat: e.target.value })}
            disabled={!mahalle}
          />
        </label>
        <label>
          Daire No
          <input
            value={value.daireNo || ''}
            onChange={(e) => patch({ daireNo: e.target.value })}
            disabled={!mahalle}
          />
        </label>
      </div>
    </div>
  )
}
