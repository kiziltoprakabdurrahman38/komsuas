import { useState } from 'react'

export default function OtpModal({ open, phoneHint, onClose, onVerify }) {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  if (!open) return null

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await onVerify?.(code)
      setCode('')
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Doğrulama başarısız.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-overlay" role="presentation" onClick={onClose}>
      <div className="auth-modal animate-fade-in" role="dialog" onClick={(e) => e.stopPropagation()}>
        <h2>SMS Doğrulama</h2>
        <p className="auth-lead">
          {phoneHint
            ? `${phoneHint} numarasına gönderilen 6 haneli kodu girin.`
            : 'Telefonunuza gelen 6 haneli kodu girin.'}
        </p>
        <form className="auth-form" onSubmit={submit}>
          <label>
            Doğrulama kodu
            <input
              required
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="XXXXXX"
            />
          </label>
          {error && <p className="form-feedback is-error">{error}</p>}
          <button type="submit" className="primary-btn" disabled={busy || code.length !== 6}>
            {busy ? 'Doğrulanıyor…' : 'Hesabı Doğrula'}
          </button>
        </form>
      </div>
    </div>
  )
}
