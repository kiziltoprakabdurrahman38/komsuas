import { useEffect, useMemo, useState } from 'react'
import { BadgeCheck, LogOut, Wallet, X } from 'lucide-react'

const SECTIONS = [
  { id: 'ozet', label: 'Hesabım' },
  { id: 'siparis', label: 'Siparişler' },
  { id: 'ilan', label: 'İlanlarım' },
  { id: 'bilgi', label: 'Bilgiler' },
  { id: 'sifre', label: 'Şifre' },
]

const TX_LABELS = {
  BakiyeYukleme: 'Bakiye yükleme',
  KaporaOdeme: 'Kapora ödemesi',
  KaporaAktarim: 'Kapora güvence',
  KaporaIade: 'Kapora iadesi',
  KaporaKesinti: 'Kapora kesintisi',
  HosGeldin: 'Hoş geldin',
}

function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || 'K'
}

function splitName(full) {
  const parts = String(full || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length < 2) return { ad: parts[0] || '', soyad: '' }
  return { ad: parts.slice(0, -1).join(' '), soyad: parts[parts.length - 1] }
}

function orderLabel(status) {
  if (status === 'Beklemede' || status === 'Onaylandi') return 'Teslim edilecek'
  if (status === 'TeslimEdildi') return 'Teslim edildi'
  if (status === 'Iptal' || status === 'AsciIptal') return 'İptal'
  if (status === 'AliciGelmedi') return 'Alıcı gelmedi'
  return status || 'Sipariş'
}

export default function ProfileDrawer({
  open,
  initialSection = 'ozet',
  user,
  api,
  onClose,
  onTopup,
  onLogout,
  onUserSaved,
  onReview,
  onNotify,
  onMealsChanged,
}) {
  const [section, setSection] = useState('ozet')
  const [transactions, setTransactions] = useState([])
  const [orders, setOrders] = useState([])
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(false)
  const [profileMsg, setProfileMsg] = useState(null)
  const [passwordMsg, setPasswordMsg] = useState(null)
  const [busy, setBusy] = useState(false)
  const seed = splitName(user?.adSoyad)
  const [profile, setProfile] = useState({
    ad: seed.ad,
    soyad: seed.soyad,
    telefon: user?.telefon || '',
    email: user?.email || '',
    bolge: user?.bolge || '',
  })
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [portionDraft, setPortionDraft] = useState({})

  useEffect(() => {
    if (!open) return undefined
    setSection(initialSection || 'ozet')
    const next = splitName(user?.adSoyad)
    setProfile({
      ad: next.ad,
      soyad: next.soyad,
      telefon: user?.telefon || '',
      email: user?.email || '',
      bolge: user?.bolge || '',
    })
    setPasswordMsg(null)
    setProfileMsg(null)
    let cancelled = false
    setLoading(true)
    Promise.all([
      api.get('/wallet/transactions'),
      api.get('/orders/mine'),
      api.get('/meals/mine'),
    ])
      .then(([wallet, mine, meals]) => {
        if (cancelled) return
        setTransactions(wallet.data.transactions || [])
        setOrders(mine.data.orders || [])
        setListings(meals.data.meals || [])
      })
      .catch(() => {
        if (!cancelled) onNotify?.({ title: 'Hesap', message: 'Hesap bilgileri yüklenemedi.' })
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, initialSection, user?.id, user?.bakiye])

  const activeOrders = useMemo(
    () => orders.filter((order) => order.status === 'Beklemede' || order.status === 'Onaylandi'),
    [orders],
  )
  const pastOrders = useMemo(
    () => orders.filter((order) => order.status !== 'Beklemede' && order.status !== 'Onaylandi'),
    [orders],
  )

  if (!open || !user) return null

  const saveProfile = async (event) => {
    event.preventDefault()
    setBusy(true)
    setProfileMsg(null)
    try {
      const { data } = await api.patch('/auth/profile', profile)
      onUserSaved?.(data.user)
      setProfileMsg('Profil bilgilerin kaydedildi.')
    } catch (err) {
      setProfileMsg(err.response?.data?.error || 'Profil kaydedilemedi.')
    } finally {
      setBusy(false)
    }
  }

  const savePassword = async (event) => {
    event.preventDefault()
    setBusy(true)
    setPasswordMsg(null)
    try {
      const { data } = await api.post('/auth/password', passwords)
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setPasswordMsg(data.message || 'Şifre güncellendi.')
    } catch (err) {
      setPasswordMsg(err.response?.data?.error || 'Şifre güncellenemedi.')
    } finally {
      setBusy(false)
    }
  }

  const updateListing = async (meal, patch) => {
    setBusy(true)
    try {
      await api.patch(`/meals/${meal.id}`, patch)
      const { data } = await api.get('/meals/mine')
      setListings(data.meals || [])
      onMealsChanged?.()
      onNotify?.({ title: 'İlan', message: 'İlan güncellendi.' })
    } catch (err) {
      onNotify?.({ title: 'İlan', message: err.response?.data?.error || 'İlan güncellenemedi.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="drawer-root">
      <button type="button" className="drawer-backdrop" aria-label="Kapat" onClick={onClose} />
      <aside className="profile-drawer" role="dialog" aria-modal="true" aria-label="Hesabım">
        <div className="sheet-handle md:hidden" aria-hidden />
        <header className="drawer-head">
          <strong>Hesabım</strong>
          <button type="button" className="icon-x" onClick={onClose} aria-label="Kapat">
            <X size={18} />
          </button>
        </header>

        <div className="profile-summary">
          <span className="avatar avatar-lg">{initials(user.adSoyad)}</span>
          <div>
            <strong>{user.adSoyad}</strong>
            <p>{user.telefon || 'Telefon yok'}</p>
            <p>{user.email || 'E-posta eklenmedi'}</p>
            {user.isVerified && (
              <span className="verified-badge">
                <BadgeCheck size={14} aria-hidden />
                Doğrulanmış Komşu
              </span>
            )}
          </div>
        </div>

        <nav className="drawer-tabs" aria-label="Hesap bölümleri">
          {SECTIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={section === item.id ? 'is-active' : ''}
              onClick={() => setSection(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="drawer-body">
          {loading && <p className="empty-state">Yükleniyor…</p>}

          {section === 'ozet' && (
            <section>
              <div className="wallet-hero">
                <span>Mevcut bakiye</span>
                <strong>{Number(user.bakiye ?? 0).toFixed(0)} ₺</strong>
                <button type="button" className="share-cta" onClick={onTopup}>
                  <Wallet size={16} aria-hidden />
                  + Bakiye Yükle
                </button>
              </div>
              <h3>Son hareketler</h3>
              <ul className="tx-list">
                {transactions.length === 0 && <li>Henüz cüzdan hareketi yok.</li>}
                {transactions.map((tx) => (
                  <li key={tx.id}>
                    <span>{TX_LABELS[tx.type] || tx.note || tx.type}</span>
                    <strong className={Number(tx.amount) < 0 ? 'is-out' : 'is-in'}>
                      {Number(tx.amount) > 0 ? '+' : ''}
                      {Number(tx.amount).toFixed(2)} ₺
                    </strong>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {section === 'siparis' && (
            <section>
              <h3>Aktif rezervasyonlar</h3>
              <ul className="account-list">
                {activeOrders.length === 0 && <li>Aktif sipariş yok.</li>}
                {activeOrders.map((order) => (
                  <li key={order.id}>
                    <strong>{order.mealTitle}</strong>
                    <p>{orderLabel(order.status)} · {order.portions} porsiyon</p>
                    <p className="delivery-code">Teslim kodu {order.deliveryCode}</p>
                  </li>
                ))}
              </ul>
              <h3>Geçmiş</h3>
              <ul className="account-list">
                {pastOrders.length === 0 && <li>Geçmiş sipariş yok.</li>}
                {pastOrders.map((order) => (
                  <li key={order.id}>
                    <strong>{order.mealTitle}</strong>
                    <p>{orderLabel(order.status)}</p>
                    {order.status === 'TeslimEdildi' && !order.reviewed && (
                      <button type="button" className="text-link" onClick={() => onReview?.(order)}>
                        Değerlendir
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {section === 'ilan' && (
            <section>
              <h3>Paylaştığın yemekler</h3>
              <ul className="account-list">
                {listings.length === 0 && <li>Henüz ilanın yok.</li>}
                {listings.map((meal) => (
                  <li key={meal.id}>
                    <strong>{meal.title}</strong>
                    <p>{meal.isActive ? 'Yayında' : 'Yayında değil'} · {meal.ilce || 'Kayseri'}</p>
                    <label className="inline-field">
                      Kalan porsiyon
                      <input
                        type="number"
                        min="0"
                        max="200"
                        value={portionDraft[meal.id] ?? meal.portions}
                        onChange={(event) =>
                          setPortionDraft((prev) => ({ ...prev, [meal.id]: event.target.value }))
                        }
                      />
                    </label>
                    <div className="inline-actions">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          updateListing(meal, {
                            kalanPorsiyon: Number(portionDraft[meal.id] ?? meal.portions),
                          })
                        }
                      >
                        Porsiyonu kaydet
                      </button>
                      <button
                        type="button"
                        disabled={busy || !meal.isActive}
                        onClick={() => updateListing(meal, { aktifMi: false })}
                      >
                        Yayından kaldır
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {section === 'bilgi' && (
            <form className="account-form" onSubmit={saveProfile}>
              <label>
                Ad
                <input value={profile.ad} onChange={(e) => setProfile({ ...profile, ad: e.target.value })} required />
              </label>
              <label>
                Soyad
                <input value={profile.soyad} onChange={(e) => setProfile({ ...profile, soyad: e.target.value })} required />
              </label>
              <label>
                Telefon
                <input value={profile.telefon} onChange={(e) => setProfile({ ...profile, telefon: e.target.value })} />
              </label>
              <label>
                E-posta
                <input type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
              </label>
              <label>
                Adres / bölge
                <input value={profile.bolge} onChange={(e) => setProfile({ ...profile, bolge: e.target.value })} placeholder="Talas, Mevlana Mah." />
              </label>
              {profileMsg && <p className="form-note">{profileMsg}</p>}
              <button type="submit" className="share-cta" disabled={busy}>Profili kaydet</button>
            </form>
          )}

          {section === 'sifre' && (
            <form className="account-form" onSubmit={savePassword}>
              <label>
                Mevcut şifre
                <input type="password" value={passwords.currentPassword} onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })} required />
              </label>
              <label>
                Yeni şifre
                <input type="password" value={passwords.newPassword} onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })} required />
              </label>
              <label>
                Yeni şifre tekrar
                <input type="password" value={passwords.confirmPassword} onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })} required />
              </label>
              {passwordMsg && <p className="form-note">{passwordMsg}</p>}
              <button type="submit" className="share-cta" disabled={busy}>Şifreyi güncelle</button>
            </form>
          )}
        </div>

        <button type="button" className="logout-danger" onClick={onLogout}>
          <LogOut size={16} aria-hidden />
          Çıkış Yap
        </button>
      </aside>
    </div>
  )
}

export { initials }
