import { useState } from 'react'
import { Star, X } from 'lucide-react'

export default function ReviewModal({ open, order, onClose, onSubmit }) {
  const [puan, setPuan] = useState(0)
  const [hover, setHover] = useState(0)
  const [yorum, setYorum] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  if (!open || !order) return null

  const active = hover || puan

  const submit = async (e) => {
    e.preventDefault()
    if (puan < 1) {
      setError('1 ile 5 arasında bir yıldız seçin.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await onSubmit?.({
        orderId: order.orderId || order.id,
        puan,
        yorum: yorum.trim(),
      })
      setPuan(0)
      setYorum('')
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Değerlendirme gönderilemedi.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-overlay" role="presentation" onClick={onClose}>
      <form
        className="auth-modal review-modal"
        role="dialog"
        aria-labelledby="review-title"
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
      >
        <button type="button" className="auth-close" onClick={onClose} aria-label="Kapat">
          <X size={18} />
        </button>
        <h2 id="review-title">Yemeği Değerlendir</h2>
        <p className="wizard-hint">
          {order.mealTitle ? `${order.mealTitle} teslim edildi.` : 'Teslimat tamamlandı.'}{' '}
          Aşçına 1–5 yıldız ver.
        </p>

        <div className="star-row" role="radiogroup" aria-label="Puan">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={puan === n}
              aria-label={`${n} yıldız`}
              className={n <= active ? 'is-on' : ''}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setPuan(n)}
            >
              <Star size={28} aria-hidden />
            </button>
          ))}
        </div>

        <label>
          Yorum (isteğe bağlı)
          <textarea
            rows={4}
            maxLength={500}
            value={yorum}
            onChange={(e) => setYorum(e.target.value)}
            placeholder="Lezzet, porsiyon, teslimat…"
          />
        </label>

        {error && <p className="form-feedback is-error">{error}</p>}

        <button type="submit" className="primary-btn" disabled={busy}>
          {busy ? 'Gönderiliyor…' : 'Değerlendirmeyi Gönder'}
        </button>
      </form>
    </div>
  )
}
