import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

const GENDERS = ['Kadın', 'Erkek', 'Belirtmek İstemiyorum']

export default function AuthModal({
  open,
  initialTab = 'login',
  onClose,
  onSubmitLogin,
  onSubmitRegister,
  onDemoLogin,
}) {
  const [tab, setTab] = useState(initialTab)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const [loginForm, setLoginForm] = useState({ identifier: '', sifre: '' })
  const [registerForm, setRegisterForm] = useState({
    ad: '',
    soyad: '',
    tcKimlikNo: '',
    dogumTarihi: '',
    cinsiyet: 'Kadın',
    telefon: '',
    sifre: '',
  })

  useEffect(() => {
    if (!open) return
    setTab(initialTab)
    setError(null)
    setBusy(false)
  }, [open, initialTab])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const handleLogin = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await onSubmitLogin?.({
        identifier: loginForm.identifier.trim(),
        sifre: loginForm.sifre,
      })
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Giriş başarısız.')
    } finally {
      setBusy(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await onSubmitRegister?.({
        ad: registerForm.ad.trim(),
        soyad: registerForm.soyad.trim(),
        tcKimlikNo: registerForm.tcKimlikNo.replace(/\D/g, ''),
        dogumTarihi: registerForm.dogumTarihi,
        cinsiyet: registerForm.cinsiyet,
        telefon: registerForm.telefon.trim(),
        sifre: registerForm.sifre,
      })
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Kayıt başarısız.')
    } finally {
      setBusy(false)
    }
  }

  const handleDemo = async () => {
    setBusy(true)
    setError(null)
    try {
      await onDemoLogin?.()
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Demo giriş başarısız.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-overlay" role="presentation" onClick={onClose}>
      <div
        className="auth-modal animate-fade-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="auth-close" onClick={onClose} aria-label="Kapat">
          <X size={18} />
        </button>

        <h2 id="auth-title">KomşuAş</h2>
        <p className="auth-lead">Kapıdan Sıcak Ev Yemeği — hesabını aç ve sofraya katıl</p>

        <div className="auth-tabs">
          <button
            type="button"
            className={tab === 'login' ? 'is-active' : ''}
            onClick={() => {
              setTab('login')
              setError(null)
            }}
          >
            Giriş Yap
          </button>
          <button
            type="button"
            className={tab === 'register' ? 'is-active' : ''}
            onClick={() => {
              setTab('register')
              setError(null)
            }}
          >
            Kayıt Ol
          </button>
        </div>

        {tab === 'login' ? (
          <>
            <form className="auth-form" onSubmit={handleLogin}>
              <label>
                T.C. Kimlik No / Kullanıcı
                <input
                  required
                  value={loginForm.identifier}
                  onChange={(e) =>
                    setLoginForm((prev) => ({ ...prev, identifier: e.target.value }))
                  }
                  placeholder="TC, telefon veya 1"
                  autoComplete="username"
                />
              </label>
              <label>
                Şifre
                <input
                  required
                  type="password"
                  value={loginForm.sifre}
                  onChange={(e) =>
                    setLoginForm((prev) => ({ ...prev, sifre: e.target.value }))
                  }
                  placeholder="Şifreniz"
                  autoComplete="current-password"
                />
              </label>
              {error && <p className="form-feedback is-error">{error}</p>}
              <button type="submit" className="primary-btn" disabled={busy}>
                {busy ? 'Giriş yapılıyor…' : 'Giriş Yap'}
              </button>
            </form>

            <div className="demo-login-wrap">
              <button
                type="button"
                className="demo-login-btn"
                disabled={busy}
                onClick={handleDemo}
              >
                Demo Giriş Yap (Abdurrahman Kızıltoprak)
              </button>
            </div>
          </>
        ) : (
          <form className="auth-form" onSubmit={handleRegister}>
            <div className="form-row">
              <label>
                Ad
                <input
                  required
                  value={registerForm.ad}
                  onChange={(e) =>
                    setRegisterForm((prev) => ({ ...prev, ad: e.target.value }))
                  }
                />
              </label>
              <label>
                Soyad
                <input
                  required
                  value={registerForm.soyad}
                  onChange={(e) =>
                    setRegisterForm((prev) => ({ ...prev, soyad: e.target.value }))
                  }
                />
              </label>
            </div>

            <label>
              T.C. Kimlik No
              <input
                required
                inputMode="numeric"
                maxLength={11}
                value={registerForm.tcKimlikNo}
                onChange={(e) =>
                  setRegisterForm((prev) => ({
                    ...prev,
                    tcKimlikNo: e.target.value.replace(/\D/g, '').slice(0, 11),
                  }))
                }
                placeholder="11 hane"
              />
            </label>

            <label>
              Doğum Tarihi
              <input
                required
                type="date"
                value={registerForm.dogumTarihi}
                onChange={(e) =>
                  setRegisterForm((prev) => ({ ...prev, dogumTarihi: e.target.value }))
                }
              />
            </label>

            <fieldset className="gender-fieldset">
              <legend>Cinsiyet</legend>
              {GENDERS.map((g) => (
                <label key={g} className="gender-option">
                  <input
                    type="radio"
                    name="cinsiyet"
                    value={g}
                    checked={registerForm.cinsiyet === g}
                    onChange={() =>
                      setRegisterForm((prev) => ({ ...prev, cinsiyet: g }))
                    }
                  />
                  {g}
                </label>
              ))}
            </fieldset>

            <label>
              Telefon
              <input
                required
                value={registerForm.telefon}
                onChange={(e) =>
                  setRegisterForm((prev) => ({ ...prev, telefon: e.target.value }))
                }
                placeholder="05xxxxxxxxx"
              />
            </label>

            <label>
              Şifre
              <input
                required
                type="password"
                value={registerForm.sifre}
                onChange={(e) =>
                  setRegisterForm((prev) => ({ ...prev, sifre: e.target.value }))
                }
                placeholder="En az 1 karakter"
                autoComplete="new-password"
              />
            </label>

            {error && <p className="form-feedback is-error">{error}</p>}
            <button type="submit" className="primary-btn" disabled={busy}>
              {busy ? 'Kaydediliyor…' : 'Kayıt Ol'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
