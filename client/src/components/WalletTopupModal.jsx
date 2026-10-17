import { useEffect, useRef, useState } from 'react'

const AMOUNTS = [50, 100, 200, 500]

function formatCardNumber(digits) {
  return digits.replace(/(.{4})/g, '$1 ').trim()
}

function formatExpiry(digits) {
  const d = digits.slice(0, 4)
  if (d.length <= 2) return d
  return `${d.slice(0, 2)}/${d.slice(2)}`
}

export default function WalletTopupModal({ open, onClose, onTopup }) {
  const [amount, setAmount] = useState(100)
  const [customAmount, setCustomAmount] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvv, setCvv] = useState('')
  const [phase, setPhase] = useState('form') // form | secure | done
  const [error, setError] = useState(null)

  const cardRef = useRef(null)
  const expiryRef = useRef(null)
  const cvvRef = useRef(null)

  useEffect(() => {
    if (!open) return
    setPhase('form')
    setError(null)
    // Modal açılınca kart alanına odaklan
    const t = setTimeout(() => cardRef.current?.focus(), 50)
    return () => clearTimeout(t)
  }, [open])

  if (!open) return null

  const effectiveAmount = (() => {
    const custom = Number(customAmount)
    if (customAmount !== '' && !Number.isNaN(custom) && custom > 0) return custom
    return Number(amount) || 0
  })()

  const reset = () => {
    setPhase('form')
    setError(null)
    setCardNumber('')
    setExpiry('')
    setCvv('')
    setCustomAmount('')
    setAmount(100)
  }

  const handleCardChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 16)
    setCardNumber(formatCardNumber(digits))
    if (digits.length === 16) {
      expiryRef.current?.focus()
    }
  }

  const handleExpiryChange = (e) => {
    const input = e.target
    const prevDigits = expiry.replace(/\D/g, '')
    let digits = input.value.replace(/\D/g, '').slice(0, 4)

    // Backspace: görünen "01/" iken silinince ay'ın son rakamı da temizlensin
    if (
      e.nativeEvent?.inputType === 'deleteContentBackward' &&
      prevDigits.length === 2 &&
      digits.length === 2 &&
      expiry.endsWith('/')
    ) {
      digits = digits.slice(0, 1)
    }

    const next = formatExpiry(digits)
    setExpiry(next)

    if (digits.length === 4) {
      cvvRef.current?.focus()
    }
  }

  const handleExpiryKeyDown = (e) => {
    if (e.key !== 'Backspace') return
    const digits = expiry.replace(/\D/g, '')
    // "01/" konumunda backspace → slash + son rakamı birlikte sil
    if (expiry.endsWith('/') && digits.length === 2) {
      e.preventDefault()
      setExpiry(digits.slice(0, 1))
    }
  }

  const selectPreset = (value) => {
    setAmount(value)
    setCustomAmount('')
  }

  const handleCustomAmount = (e) => {
    const raw = e.target.value.replace(/[^\d.]/g, '')
    setCustomAmount(raw)
    const n = Number(raw)
    if (!Number.isNaN(n) && n > 0) setAmount(n)
  }

  const submit = async (e) => {
    e.preventDefault()
    setError(null)

    if (!effectiveAmount || effectiveAmount < 10) {
      setError('En az 10 ₺ yükleyebilirsiniz.')
      return
    }

    setPhase('secure')
    try {
      await new Promise((r) => setTimeout(r, 1500))
      await onTopup?.({
        amount: effectiveAmount,
        cardNumber: cardNumber.replace(/\s/g, ''),
        expiry,
        cvv,
      })
      setPhase('done')
      setTimeout(() => {
        reset()
        onClose?.()
      }, 900)
    } catch (err) {
      setPhase('form')
      setError(err.response?.data?.error || err.message || 'Yükleme başarısız.')
    }
  }

  return (
    <div
      className="auth-overlay"
      role="presentation"
      onClick={() => {
        reset()
        onClose?.()
      }}
    >
      <div
        className="auth-modal animate-fade-in"
        role="dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <h2>Bakiye Yükle</h2>
        <p className="auth-lead">YemekCüzdan · kart simülasyonu</p>

        {phase === 'secure' ? (
          <div className="secure-panel">
            <div className="secure-spinner" aria-hidden />
            <p>3D Secure Banka Doğrulaması Yapılıyor...</p>
          </div>
        ) : phase === 'done' ? (
          <p className="form-feedback is-ok">Bakiye başarıyla yüklendi.</p>
        ) : (
          <form className="auth-form" onSubmit={submit}>
            <div className="amount-pills">
              {AMOUNTS.map((a) => (
                <button
                  key={a}
                  type="button"
                  className={customAmount === '' && amount === a ? 'is-active' : ''}
                  onClick={() => selectPreset(a)}
                >
                  {a} ₺
                </button>
              ))}
            </div>

            <label>
              Özel Tutar (₺)
              <input
                type="number"
                min="10"
                step="1"
                inputMode="decimal"
                value={customAmount}
                onChange={handleCustomAmount}
                placeholder="Örn. 75, 250"
              />
            </label>

            <label>
              Kart No
              <input
                ref={cardRef}
                required
                inputMode="numeric"
                maxLength={19}
                value={cardNumber}
                onChange={handleCardChange}
                placeholder="XXXX XXXX XXXX XXXX"
                autoComplete="cc-number"
              />
            </label>

            <div className="form-row">
              <label>
                SKT
                <input
                  ref={expiryRef}
                  required
                  inputMode="numeric"
                  maxLength={5}
                  value={expiry}
                  onChange={handleExpiryChange}
                  onKeyDown={handleExpiryKeyDown}
                  placeholder="AA/YY"
                  autoComplete="cc-exp"
                />
              </label>
              <label>
                CVV
                <input
                  ref={cvvRef}
                  required
                  inputMode="numeric"
                  maxLength={4}
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="***"
                  autoComplete="cc-csc"
                />
              </label>
            </div>

            {error && <p className="form-feedback is-error">{error}</p>}
            <button type="submit" className="primary-btn" disabled={!effectiveAmount}>
              {effectiveAmount > 0 ? `${effectiveAmount} ₺ Yükle` : 'Tutar seçin'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
