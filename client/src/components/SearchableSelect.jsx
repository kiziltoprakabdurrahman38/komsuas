import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { ChevronDown, Loader2 } from 'lucide-react'
import { matchesTr, normalizeTr } from '../data/turkeyAddress.js'

/**
 * @param {{
 *   label: string
 *   value: string
 *   options: string[]
 *   onChange: (value: string) => void
 *   placeholder?: string
 *   disabled?: boolean
 *   loading?: boolean
 *   allowFreeText?: boolean
 *   emptyText?: string
 *   maxVisible?: number
 * }} props
 */
export default function SearchableSelect({
  label,
  value,
  options = [],
  onChange,
  placeholder = 'Ara veya seç…',
  disabled = false,
  loading = false,
  allowFreeText = false,
  emptyText = 'Sonuç yok',
  maxVisible = 50,
}) {
  const id = useId()
  const listId = `${id}-list`
  const wrapRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(value || '')
  const [highlight, setHighlight] = useState(0)

  useEffect(() => {
    setQuery(value || '')
  }, [value])

  useEffect(() => {
    const onDoc = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const filtered = useMemo(() => {
    const q = normalizeTr(query)
    const list = !q
      ? options
      : options.filter((opt) => matchesTr(opt, query))
    return list.slice(0, maxVisible)
  }, [options, query, maxVisible])

  useEffect(() => {
    setHighlight(0)
  }, [filtered.length, open])

  const select = (opt) => {
    onChange(opt)
    setQuery(opt)
    setOpen(false)
  }

  const commitTyped = () => {
    if (!allowFreeText) {
      const exact = options.find(
        (opt) => normalizeTr(opt) === normalizeTr(query),
      )
      if (exact) {
        select(exact)
        return
      }
      if (value) setQuery(value)
      else setQuery('')
      setOpen(false)
      return
    }
    const trimmed = query.trim()
    onChange(trimmed)
    setQuery(trimmed)
    setOpen(false)
  }

  const onKeyDown = (e) => {
    if (disabled) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setHighlight((h) => Math.min(filtered.length - 1, h + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => Math.max(0, h - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (open && filtered[highlight]) select(filtered[highlight])
      else commitTyped()
    } else if (e.key === 'Escape') {
      setOpen(false)
      setQuery(value || '')
    }
  }

  return (
    <label className={`searchable-select ${disabled ? 'is-disabled' : ''}`}>
      <span className="searchable-select-label">{label}</span>
      <div className="searchable-select-wrap" ref={wrapRef}>
        <input
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          disabled={disabled}
          placeholder={placeholder}
          value={query}
          autoComplete="off"
          onFocus={() => !disabled && setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
            if (allowFreeText) onChange(e.target.value)
          }}
          onBlur={() => {
            window.setTimeout(() => {
              if (!wrapRef.current?.contains(document.activeElement)) {
                commitTyped()
              }
            }, 120)
          }}
          onKeyDown={onKeyDown}
        />
        <span className="searchable-select-icon" aria-hidden>
          {loading ? <Loader2 size={16} className="spin" /> : <ChevronDown size={16} />}
        </span>

        {open && !disabled && (
          <ul id={listId} className="searchable-select-list" role="listbox">
            {loading && (
              <li className="searchable-select-empty">Aranıyor…</li>
            )}
            {!loading && filtered.length === 0 && (
              <li className="searchable-select-empty">
                {allowFreeText && query.trim()
                  ? 'Enter ile serbest metin kullan'
                  : emptyText}
              </li>
            )}
            {!loading &&
              filtered.map((opt, idx) => (
                <li key={opt}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={normalizeTr(opt) === normalizeTr(value)}
                    className={
                      idx === highlight ? 'is-highlight' : undefined
                    }
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => select(opt)}
                    onMouseEnter={() => setHighlight(idx)}
                  >
                    {opt}
                  </button>
                </li>
              ))}
          </ul>
        )}
      </div>
    </label>
  )
}
