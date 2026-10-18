import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, MapPin, Search } from 'lucide-react'
import { POPULAR_CITIES, districtPoint, searchPlaces } from '../data/turkeyPlaces.js'

function PlaceResults({ query, cityFilter, city, district, onPickCity, onPickDistrict }) {
  const rows = useMemo(() => searchPlaces(query, cityFilter), [query, cityFilter])

  if (!rows.length) {
    return <p className="px-3 py-6 text-center text-sm text-slate-500">Eşleşen il veya ilçe yok.</p>
  }

  return rows.map((row) => {
    if (row.type === 'city') {
      return (
        <button
          key={`city-${row.city}`}
          type="button"
          className="flex min-h-11 w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-800"
          onClick={() => onPickCity(row.city)}
        >
          <span>{row.city}</span>
          <span className="text-xs text-slate-400">İlçeler</span>
        </button>
      )
    }

    const active = row.city === city && row.district === district
    return (
      <button
        key={`${row.city}-${row.district}`}
        type="button"
        role="option"
        aria-selected={active}
        className={`flex min-h-11 w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-sm font-medium ${
          active
            ? 'bg-emerald-600 font-semibold text-white'
            : 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-800'
        }`}
        onClick={() => onPickDistrict(row.city, row.district)}
      >
        <span>
          {row.district}
          <span className={active ? 'text-emerald-100' : 'text-slate-400'}> · {row.city}</span>
        </span>
        {active ? <Check size={16} aria-hidden /> : null}
      </button>
    )
  })
}

function PlacePanel({
  query,
  setQuery,
  cityFilter,
  setCityFilter,
  city,
  district,
  onPickDistrict,
  sheet,
}) {
  return (
    <div className={sheet ? 'px-3 pb-[max(0.75rem,env(safe-area-inset-bottom,16px))]' : 'p-3'}>
      {sheet ? <div className="sheet-handle" aria-hidden /> : null}
      <label className="mb-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3">
        <Search size={16} className="text-slate-400" aria-hidden />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="İl veya ilçe ara... (Örn: Kadıköy, Çankaya, Nilüfer)"
          aria-label="İl veya ilçe ara"
          className="h-11 w-full bg-transparent text-base text-slate-800 outline-none md:text-sm"
        />
      </label>
      <div className="scrollbar-none mb-2 flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Popüler şehirler">
        {POPULAR_CITIES.map((name) => {
          const active = name === 'Tümü' ? !cityFilter && !query : cityFilter === name && !query
          return (
            <button
              key={name}
              type="button"
              role="tab"
              aria-selected={active}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
                active ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-800'
              }`}
              onClick={() => {
                setQuery('')
                setCityFilter(name === 'Tümü' ? '' : name)
              }}
            >
              {name}
            </button>
          )
        })}
      </div>
      {cityFilter && !query ? (
        <p className="px-1 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{cityFilter} ilçeleri</p>
      ) : null}
      <div className="max-h-[46vh] overflow-y-auto md:max-h-72" role="listbox" aria-label="İl ve ilçe seç">
        <PlaceResults
          query={query}
          cityFilter={cityFilter}
          city={city}
          district={district}
          onPickCity={(next) => {
            setQuery('')
            setCityFilter(next)
          }}
          onPickDistrict={onPickDistrict}
        />
      </div>
    </div>
  )
}

export default function LocationSelector({ city, district, onSelect }) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [cityFilter, setCityFilter] = useState(city || '')
  const rootRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return undefined
    setCityFilter(city || '')
    setQuery('')

    const onPointerDown = (event) => {
      if (rootRef.current?.contains(event.target)) return
      if (event.target.closest?.('.loc-sheet')) return
      setIsOpen(false)
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [isOpen, city])

  const pickDistrict = (nextCity, nextDistrict) => {
    const point = districtPoint(nextCity, nextDistrict)
    onSelect({ city: nextCity, district: nextDistrict, ...point })
    setIsOpen(false)
  }

  const panelProps = {
    query,
    setQuery,
    cityFilter,
    setCityFilter,
    city,
    district,
    onPickDistrict: pickDistrict,
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className="flex min-h-11 max-w-[58vw] cursor-pointer items-center gap-1.5 rounded-full border border-emerald-950/10 bg-white/70 px-3.5 py-1.5 text-xs font-semibold text-slate-800 shadow-sm transition hover:bg-white md:max-w-none md:text-sm"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <MapPin size={15} className="shrink-0 text-emerald-700" aria-hidden />
        <span className="truncate">{city}, {district}</span>
        <span aria-hidden>▾</span>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-2 hidden w-[22rem] overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl md:block">
          <PlacePanel {...panelProps} />
        </div>
      )}

      {isOpen && createPortal(
        <div className="loc-sheet md:hidden">
          <button
            type="button"
            className="fixed inset-0 z-[1400] bg-slate-900/40"
            aria-label="Konum listesini kapat"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed inset-x-0 bottom-0 z-[1500] max-h-[92vh] overflow-hidden rounded-t-[32px] bg-white shadow-2xl">
            <PlacePanel {...panelProps} sheet />
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}
