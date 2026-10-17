import { useMemo, useState } from 'react'

export default function ReserveModal({ open, meal, bakiye, onClose, onConfirm }) {
  const [method, setMethod] = useState('Cuzdan')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const summary = useMemo(() => {
    if (!meal) return null
    const total = Number(meal.price)
    const rate = Number(meal.depositRate ?? 30)
    const deposit = Math.round(total * (rate / 100) * 100) / 100
    const remaining = Math.round((total - deposit) * 100) / 100
    return { total, rate, deposit, remaining }
  }, [meal])

  if (!open || !meal || !summary) return null

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await onConfirm?.({ odemeYontemi: method })
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Rezervasyon başarısız.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-overlay" role="presentation" onClick={onClose}>
      <div className="auth-modal reserve-modal animate-fade-in" role="dialog" onClick={(e) => e.stopPropagation()}>
        <h2>Rezervasyon & Güvence Özeti</h2>
        <p className="auth-lead">{meal.title} · {meal.chef}</p>

        {meal.imageUrl && (
          <img className="reserve-thumb" src={meal.imageUrl} alt={meal.title} />
        )}

        <div className="summary-box">
          <div><span>Toplam</span><strong>{summary.total.toFixed(2)} ₺</strong></div>
          <div>
            <span>Şimdi Güvence Kaporası (%{summary.rate})</span>
            <strong>{summary.deposit.toFixed(2)} ₺</strong>
          </div>
          <div>
            <span>Kapıda Teslimde Nakit</span>
            <strong>{summary.remaining.toFixed(2)} ₺</strong>
          </div>
        </div>

        <p className="reserve-note">
          Yemeği almaya gitmezseniz kapora tutarı aşçının ziyanını karşılamak üzere
          aşçıya aktarılır.
        </p>

        <form className="auth-form" onSubmit={submit}>
          <fieldset className="gender-fieldset">
            <legend>Ödeme seçenekleri</legend>
            <label className="gender-option">
              <input
                type="radio"
                name="pay"
                checked={method === 'Cuzdan'}
                onChange={() => setMethod('Cuzdan')}
              />
              YemekCüzdan Bakiyesi ile Öde (Mevcut: {Number(bakiye || 0).toFixed(2)} ₺)
            </label>
            <label className="gender-option">
              <input
                type="radio"
                name="pay"
                checked={method === 'KartSimulasyon'}
                onChange={() => setMethod('KartSimulasyon')}
              />
              Kredi/Banka Kartı ile Öde (Simülasyon)
            </label>
          </fieldset>

          {error && <p className="form-feedback is-error">{error}</p>}

          <button type="submit" className="primary-btn" disabled={busy}>
            {busy ? 'İşleniyor…' : 'Kaporayı Öde & Rezerve Et'}
          </button>
        </form>
      </div>
    </div>
  )
}
