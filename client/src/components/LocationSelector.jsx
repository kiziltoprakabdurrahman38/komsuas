import { useEffect, useRef, useState } from 'react'
import { Check, MapPin } from 'lucide-react'

export const KAYSERI_DISTRICTS = [
  { id: 'melikgazi', label: 'Melikgazi', lat: 38.7205, lng: 35.4826 },
  { id: 'talas', label: 'Talas', lat: 38.692, lng: 35.553 },
  { id: 'kocasinan', label: 'Kocasinan', lat: 38.74, lng: 35.47 },
  { id: 'hacilar', label: 'Hacılar', lat: 38.645, lng: 35.452 },
  { id: 'incesu', label: 'İncesu', lat: 38.7167, lng: 35.1833 },
]

export default function LocationSelector({ selectedDistrict, onSelect }) {
  const [isOpen, setIsOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return undefined

    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setIsOpen(false)
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
  }, [isOpen])

  return (
    <div className="relative z-[9999]" ref={rootRef}>
      <button
        type="button"
        className="bg-white/90 hover:bg-white text-slate-800 text-sm font-semibold px-3.5 py-2 min-h-11 rounded-full border border-slate-200/80 shadow-sm transition-all duration-200 hover:shadow-md flex items-center gap-1.5 cursor-pointer"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <MapPin size={15} aria-hidden />
        <span>Kayseri, {selectedDistrict}</span>
        <span aria-hidden>▾</span>
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label="İlçe seç"
          className="absolute top-full left-0 origin-top-left mt-2 z-[9999] w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 p-1.5 overflow-hidden ring-1 ring-black/5"
        >
          {KAYSERI_DISTRICTS.map((district) => {
            const active = district.label === selectedDistrict
            return (
              <button
                key={district.id}
                type="button"
                role="option"
                aria-selected={active}
                className={`w-full min-h-11 px-3.5 py-2.5 rounded-xl text-left text-sm font-medium transition-all duration-150 flex items-center justify-between cursor-pointer ${
                  active
                    ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                    : 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-700'
                }`}
                onClick={() => {
                  onSelect(district)
                  setIsOpen(false)
                }}
              >
                <span>{district.label}</span>
                {active ? <Check size={16} aria-hidden /> : null}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
