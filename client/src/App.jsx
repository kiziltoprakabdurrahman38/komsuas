import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import { io } from 'socket.io-client'
import {
  MapPin,
  UtensilsCrossed,
  Search,
  Plus,
  X,
} from 'lucide-react'
import AuthModal from './components/AuthModal.jsx'
import Toast from './components/Toast.jsx'
import OtpModal from './components/OtpModal.jsx'
import WalletTopupModal from './components/WalletTopupModal.jsx'
import ReserveModal from './components/ReserveModal.jsx'
import BrandLogo from './components/BrandLogo.jsx'
import ShareMealWizard from './components/ShareMealWizard.jsx'
import ReviewModal from './components/ReviewModal.jsx'
import RatingBadge from './components/RatingBadge.jsx'
import ProfileDrawer, { initials } from './components/ProfileDrawer.jsx'
import { apiBaseUrl, apiOrigin } from './apiConfig.js'
import {
  GEO_OPTIONS,
  movedMeters,
  pointFromPosition,
  reversePlaceLabel,
} from './locationGeo.js'
import { fallbackMealsNear, mealKind } from './fallbackMeals.js'

const MEAL_FILTERS = [
  { id: 'all', label: 'Tümü' },
  { id: 'ana', label: 'Ana Yemek' },
  { id: 'hamur', label: 'Hamur İşi' },
  { id: 'corba', label: 'Çorba' },
  { id: 'tatli', label: 'Tatlı' },
]

const KAYSERI_DEFAULT = { lat: 38.7205, lng: 35.4826 }
const KAYSERI_LABEL = 'Melikgazi, Kayseri'

const KAYSERI_DISTRICTS = [
  { id: 'melikgazi', label: 'Melikgazi', lat: 38.7205, lng: 35.4826 },
  { id: 'talas', label: 'Talas', lat: 38.6892, lng: 35.5464 },
  { id: 'kocasinan', label: 'Kocasinan', lat: 38.7462, lng: 35.4528 },
]

const KAYSERI_NEIGHBORHOODS = [
  { id: 'kicikapi', label: 'Kıçıkapı', lat: 38.7205, lng: 35.4882 },
  { id: 'sahabiye', label: 'Sahabiye', lat: 38.7264, lng: 35.4908 },
  { id: 'alpaslan', label: 'Alpaslan', lat: 38.7312, lng: 35.4786 },
  { id: 'mevlana', label: 'Mevlana', lat: 38.6905, lng: 35.5512 },
  { id: 'bahcelievler', label: 'Bahçelievler', lat: 38.7024, lng: 35.5388 },
  { id: 'yenidogan', label: 'Yenidoğan', lat: 38.7488, lng: 35.4562 },
  { id: 'erkilet', label: 'Erkilet', lat: 38.7412, lng: 35.4286 },
]

const KAYSERI_PLACES = [...KAYSERI_DISTRICTS, ...KAYSERI_NEIGHBORHOODS]

const AUTH_STORAGE_KEY = 'evyemegi_auth'
const api = axios.create({ baseURL: apiBaseUrl })

api.interceptors.request.use((config) => {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    if (raw) {
      const { token } = JSON.parse(raw)
      if (token) config.headers.Authorization = `Bearer ${token}`
    }
  } catch {
    /* ignore */
  }
  return config
})

function loadStoredAuth() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.token || !parsed?.user) return null
    return parsed
  } catch {
    return null
  }
}

function App() {
  const [activeTab, setActiveTab] = useState('search')
  const [mapCenter, setMapCenter] = useState(KAYSERI_DEFAULT)
  const [mapZoom, setMapZoom] = useState(14)
  const [flyToTarget, setFlyToTarget] = useState(null)
  const [userGps, setUserGps] = useState(KAYSERI_DEFAULT)
  const [locationLabel, setLocationLabel] = useState(KAYSERI_LABEL)
  const [selectedPlace, setSelectedPlace] = useState('melikgazi')
  const [locationOpen, setLocationOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [profileOpen, setProfileOpen] = useState(false)
  const locationRef = useRef(null)

  const [meals, setMeals] = useState([])
  const [loadingMeals, setLoadingMeals] = useState(true)
  const [mealsError, setMealsError] = useState(null)
  const [usingFallback, setUsingFallback] = useState(false)
  const [mealFilter, setMealFilter] = useState('all')
  const [selectedId, setSelectedId] = useState(null)

  const [auth, setAuth] = useState(() => loadStoredAuth())
  const [authOpen, setAuthOpen] = useState(false)
  const [authTab, setAuthTab] = useState('login')
  const [pendingAction, setPendingAction] = useState(null)

  const [toast, setToast] = useState(null)
  const [otpOpen, setOtpOpen] = useState(false)
  const [walletOpen, setWalletOpen] = useState(false)
  const [reserveMeal, setReserveMeal] = useState(null)
  const [deliveryInfo, setDeliveryInfo] = useState(null)
  const [ordersKey, setOrdersKey] = useState(0)
  const [reviewOrder, setReviewOrder] = useState(null)

  const user = auth?.user || null

  const persistAuth = (next) => {
    setAuth(next)
    if (next) localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(next))
    else localStorage.removeItem(AUTH_STORAGE_KEY)
  }

  const patchUser = (partial) => {
    setAuth((prev) => {
      if (!prev) return prev
      const next = { ...prev, user: { ...prev.user, ...partial } }
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  const openAuth = (tab = 'login', action = null) => {
    setAuthTab(tab)
    setPendingAction(action)
    setAuthOpen(true)
  }

  const ensureVerified = () => {
    if (!user) {
      openAuth('login')
      return false
    }
    if (!user.isVerified) {
      setOtpOpen(true)
      return false
    }
    return true
  }

  const showFallbackMeals = useCallback((position) => {
    setMeals(fallbackMealsNear(position))
    setUsingFallback(true)
    setMealsError(null)
  }, [])

  const fetchMeals = useCallback(async (position) => {
    if (!position?.lat || !position?.lng) {
      showFallbackMeals(null)
      setLoadingMeals(false)
      return
    }
    setLoadingMeals(true)
    setMealsError(null)
    try {
      const { data } = await api.get('/meals', {
        params: {
          lat: position.lat,
          lng: position.lng,
        },
        timeout: 8000,
      })
      setMeals(data.meals || [])
      setUsingFallback(false)
    } catch {
      showFallbackMeals(position)
    } finally {
      setLoadingMeals(false)
    }
  }, [showFallbackMeals])

  const labelAnchorRef = useRef(null)
  const labelSeqRef = useRef(0)
  const manualLockRef = useRef(false)

  const applyUserPoint = useCallback((next, { fly = false, manual = false, zoom = 16, label, placeId } = {}) => {
    if (manual) manualLockRef.current = true
    const point = { lat: next.lat, lng: next.lng }
    setUserGps(point)
    setMapCenter(point)
    setMapZoom(zoom)
    if (fly) {
      setFlyToTarget({ id: Date.now(), ...point, zoom })
    }
    setMealsError(null)
    fetchMeals(point)
    if (placeId) setSelectedPlace(placeId)
    else if (!manual) setSelectedPlace(null)

    if (label) {
      setLocationLabel(label)
      labelAnchorRef.current = point
      return
    }

    const dist = movedMeters(labelAnchorRef.current, point)
    if (labelAnchorRef.current && dist < 80) return
    labelAnchorRef.current = point
    const seq = labelSeqRef.current + 1
    labelSeqRef.current = seq
    reversePlaceLabel(point.lat, point.lng)
      .then((found) => {
        if (seq === labelSeqRef.current && found) setLocationLabel(found)
      })
      .catch(() => {})
  }, [fetchMeals])

  useEffect(() => {
    fetchMeals(KAYSERI_DEFAULT)

    if (!navigator.geolocation) return undefined

    const seen = { point: null, accuracy: Infinity }
    const onFix = (pos) => {
      if (manualLockRef.current) return
      const next = pointFromPosition(pos)
      const accuracy = Number.isFinite(next.accuracy) ? next.accuracy : 99999
      const dist = movedMeters(seen.point, next)
      const first = !seen.point
      const sharper = accuracy + 25 < seen.accuracy
      if (!first && dist < 15 && !sharper) return
      const fly = first || (seen.accuracy > 250 && accuracy < 80)
      if (accuracy < seen.accuracy) seen.accuracy = accuracy
      seen.point = next
      applyUserPoint(next, { fly })
    }

    navigator.geolocation.getCurrentPosition(onFix, () => {}, GEO_OPTIONS)
    const watchId = navigator.geolocation.watchPosition(onFix, () => {}, GEO_OPTIONS)
    return () => navigator.geolocation.clearWatch(watchId)
  }, [applyUserPoint, fetchMeals])

  useEffect(() => {
    if (!user) return undefined
    api.get('/auth/me').then(({ data }) => {
      patchUser(data.user)
      if (!data.user.isVerified) setOtpOpen(true)
    }).catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const socket = apiOrigin
      ? io(apiOrigin, { path: '/socket.io', transports: ['websocket', 'polling'] })
      : io({ path: '/socket.io', transports: ['websocket', 'polling'] })

    socket.on('wallet:update', (payload) => {
      if (user && Number(payload.userId) === Number(user.id)) {
        patchUser({ bakiye: payload.bakiye })
      }
    })

    socket.on('meals:changed', () => {
      if (userGps) fetchMeals(userGps)
    })

    socket.on('order:delivered', (payload) => {
      setToast({
        title: 'Teslimat',
        message: payload?.message || 'Sipariş başarıyla teslim edildi!',
      })
      setOrdersKey((k) => k + 1)
      if (user && Number(payload?.aliciId) === Number(user.id)) {
        setReviewOrder(payload)
      }
      if (userGps) fetchMeals(userGps)
    })

    socket.on('order:changed', () => {
      setOrdersKey((k) => k + 1)
      if (userGps) fetchMeals(userGps)
    })

    socket.on('rating:update', (payload) => {
      if (user && Number(payload?.userId) === Number(user.id)) {
        patchUser({
          ortalamaPuan: payload.ortalamaPuan,
          toplamDegerlendirme: payload.toplamDegerlendirme,
        })
      }
    })

    if (user?.id) socket.emit('join:user', user.id)

    return () => socket.disconnect()
  }, [user?.id, userGps, fetchMeals])

  const choosePlace = (place) => {
    applyUserPoint(
      { lat: place.lat, lng: place.lng },
      {
        manual: true,
        zoom: 15,
        label: `${place.label}, Kayseri`,
        placeId: place.id,
      },
    )
  }

  const handleReserveClick = (meal) => {
    if (usingFallback || String(meal.id).startsWith('mock-')) {
      setToast({
        title: 'Örnek vitrin',
        message: 'Canlı liste bağlanınca bu ilanı rezerve edebilirsin.',
      })
      return
    }
    if (!user) {
      openAuth('login', { type: 'reserve', meal })
      return
    }
    if (!user.isVerified) {
      setPendingAction({ type: 'reserve', meal })
      setOtpOpen(true)
      return
    }
    setReserveMeal(meal)
  }

  const handleShareTab = () => {
    if (!user) {
      openAuth('register', { type: 'share' })
      return
    }
    if (!user.isVerified) {
      setPendingAction({ type: 'share' })
      setOtpOpen(true)
      return
    }
    setActiveTab('share')
  }

  const confirmReserve = async ({ odemeYontemi }) => {
    const { data } = await api.post('/orders', {
      mealId: reserveMeal.id,
      porsiyonAdedi: 1,
      odemeYontemi,
    })
    setDeliveryInfo({
      mealTitle: data.mealTitle || reserveMeal.title,
      code: data.order?.deliveryCode,
      deposit: data.depositAmount,
      remaining: data.remainingCash,
    })
    if (data.bakiye != null) patchUser({ bakiye: data.bakiye })
    setReserveMeal(null)
    setSelectedId(reserveMeal.id)
    setOrdersKey((k) => k + 1)
    if (userGps) await fetchMeals(userGps)
  }

  const handleSharePublish = async (payload) => {
    if (!ensureVerified()) {
      throw new Error('Doğrulanmış giriş gerekli.')
    }
    try {
      await api.post('/meals', {
        baslik: payload.baslik,
        aciklama: payload.aciklama,
        porsiyonFiyati: Number(payload.porsiyonFiyati),
        kalanPorsiyon: Number(payload.kalanPorsiyon),
        kaporaOrani: Number(payload.kaporaOrani),
        gorselUrl: payload.gorselUrl,
        enlem: payload.enlem,
        boylam: payload.boylam,
        il: payload.il,
        ilce: payload.ilce,
        mahalle: payload.mahalle,
        sokak: payload.sokak,
        binaNo: payload.binaNo,
        kat: payload.kat,
        daireNo: payload.daireNo,
      })
      setToast({ title: 'İlan', message: 'Yemek ilanın yayınlandı.' })
      if (userGps) await fetchMeals(userGps)
      setActiveTab('search')
    } catch (err) {
      if (err.response?.data?.code === 'UNVERIFIED') {
        setOtpOpen(true)
      }
      throw err
    }
  }

  const handleAuthSuccess = async (data) => {
    persistAuth({ token: data.token, user: data.user })
    setAuthOpen(false)

    if (data.demoSmsCode) {
      setToast({
        title: 'Demo SMS',
        message: 'Doğrulama kodunuz:',
        code: data.demoSmsCode,
      })
      setOtpOpen(true)
    }

    const action = pendingAction
    setPendingAction(null)

    if (!data.user.isVerified) {
      if (action) setPendingAction(action)
      return
    }

    if (action?.type === 'reserve' && action.meal) setReserveMeal(action.meal)
    if (action?.type === 'share') setActiveTab('share')
  }

  const handleVerifyOtp = async (code) => {
    const { data } = await api.post('/auth/verify-otp', { code })
    persistAuth({ token: data.token, user: data.user })
    setOtpOpen(false)
    setToast(null)

    const action = pendingAction
    setPendingAction(null)
    if (action?.type === 'reserve' && action.meal) setReserveMeal(action.meal)
    if (action?.type === 'share') setActiveTab('share')
  }

  useEffect(() => {
    if (!locationOpen) return undefined
    const close = (event) => {
      if (!locationRef.current?.contains(event.target)) setLocationOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [locationOpen])

  const visibleMeals = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('tr')
    return meals
      .filter((meal) => mealFilter === 'all' || mealKind(meal) === mealFilter)
      .filter((meal) => {
        if (!needle) return true
        const kindLabel = MEAL_FILTERS.find((item) => item.id === mealKind(meal))?.label || ''
        const haystack = [meal.title, meal.description, meal.chef, kindLabel, meal.ilce, meal.mahalle]
          .filter(Boolean)
          .join(' ')
          .toLocaleLowerCase('tr')
        return haystack.includes(needle)
      })
      .sort((a, b) => Number(a.distanceKm) - Number(b.distanceKm))
  }, [meals, mealFilter, query])

  const matchedPlace = KAYSERI_PLACES.find((place) => (locationLabel || '').includes(place.label))
  const headerPlace = `Kayseri, ${
    KAYSERI_PLACES.find((place) => place.id === selectedPlace)?.label
    || matchedPlace?.label
    || 'Melikgazi'
  }`

  return (
    <div className="app-shell">
      <header className="site-header market-header animate-fade-down">
        <div className="header-brand">
          <button
            type="button"
            className="brand-block brand-hit"
            onClick={() => setActiveTab('search')}
            aria-label="KomşuAş ana sayfa"
          >
            <BrandLogo size={44} />
            <div className="brand-text">
              <p className="brand-mark">KomşuAş</p>
              <p className="brand-sub">Kapıdan Sıcak Ev Yemeği</p>
            </div>
          </button>
          <div className="loc-wrap" ref={locationRef}>
            <button
              type="button"
              className="loc-chip"
              onClick={() => setLocationOpen((open) => !open)}
              aria-expanded={locationOpen}
            >
              <MapPin size={15} aria-hidden />
              {headerPlace}
              <span aria-hidden>▾</span>
            </button>
            {locationOpen && (
              <div className="loc-popover" role="listbox" aria-label="Konum seç">
                {KAYSERI_PLACES.map((place) => (
                  <button
                    key={place.id}
                    type="button"
                    role="option"
                    aria-selected={selectedPlace === place.id}
                    className={selectedPlace === place.id ? 'is-active' : ''}
                    onClick={() => {
                      choosePlace(place)
                      setLocationOpen(false)
                    }}
                  >
                    {place.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <form className="search-bar" role="search" onSubmit={(event) => event.preventDefault()}>
          <Search size={18} aria-hidden />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Yemek adı, malzeme, tatlı veya aşçı ara... (örn: Mantı, Yağlama)"
            aria-label="Yemek ara"
          />
          {query && (
            <button type="button" className="icon-x" onClick={() => setQuery('')} aria-label="Aramayı temizle">
              <X size={16} />
            </button>
          )}
        </form>

        <div className="header-actions">
          <button type="button" className="share-cta" onClick={handleShareTab}>
            <Plus size={16} aria-hidden />
            <span className="share-label">Aşçı Ol / Yemek Paylaş</span>
          </button>
          {user ? (
            <button type="button" className="profile-btn" onClick={() => setProfileOpen(true)}>
              <span className="avatar">{initials(user.adSoyad)}</span>
              <span className="profile-name">{user.adSoyad}</span>
              <span aria-hidden>▾</span>
            </button>
          ) : (
            <button type="button" className="auth-trigger" onClick={() => openAuth('login')}>
              Giriş Yap / Kayıt Ol
            </button>
          )}
        </div>
      </header>

      {deliveryInfo?.code && (
        <div className="delivery-banner animate-fade-in" role="status">
          <strong>{deliveryInfo.mealTitle}</strong> rezerve edildi.
          Kapora: {Number(deliveryInfo.deposit).toFixed(2)} ₺ · Kapıda:{' '}
          {Number(deliveryInfo.remaining).toFixed(2)} ₺ · Kod:{' '}
          <span className="delivery-code">{deliveryInfo.code}</span>
        </div>
      )}

      <main className="main-stage">
        {activeTab === 'share' ? (
          <div className="share-layout">
            <ShareMealWizard
              userName={user?.adSoyad}
              mapCenter={mapCenter}
              gpsPosition={userGps}
              mapZoom={mapZoom || 15}
              onPublished={handleSharePublish}
              onUserPositionChange={(point, meta) => {
                if (meta?.gps) manualLockRef.current = false
                applyUserPoint(point, { manual: Boolean(meta?.manual) })
              }}
            />
          </div>
        ) : (
          <section className="meals-panel">
              <div className="meal-filters" role="tablist" aria-label="Yemek türü">
                {MEAL_FILTERS.map((filter) => (
                  <button
                    key={filter.id}
                    type="button"
                    className={`meal-filter ${mealFilter === filter.id ? 'is-active' : ''}`}
                    onClick={() => setMealFilter(filter.id)}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              <div className="meals-heading animate-fade-in">
                <h2>Yakınınızdaki Ev Yemekleri</h2>
                <p>
                  {loadingMeals
                    ? 'Yemekler yükleniyor…'
                    : `${visibleMeals.length} aktif ilan`}
                </p>
              </div>

              {usingFallback && (
                <p className="meal-fallback-note">
                  Örnek Kayseri vitrini gösteriliyor. Canlı liste bağlanınca kendiliğinden güncellenir.
                </p>
              )}
              {mealsError && <p className="form-feedback is-error">{mealsError}</p>}
              {!loadingMeals && visibleMeals.length === 0 && query.trim() && (
                <div className="empty-card">
                  <p>Aradığınız yemek bulunamadı</p>
                  <button type="button" className="share-cta" onClick={() => setQuery('')}>
                    Aramayı Temizle
                  </button>
                </div>
              )}
              {!loadingMeals && !mealsError && visibleMeals.length === 0 && !query.trim() && (
                <p className="empty-state">Bu türde yakın ilan yok.</p>
              )}

              <ul className="meal-grid">
                {visibleMeals.map((meal, index) => (
                  <li
                    key={meal.id}
                    className={`meal-card animate-rise ${selectedId === meal.id ? 'is-selected' : ''}`}
                    style={{ animationDelay: `${0.05 + index * 0.05}s` }}
                  >
                    {meal.imageUrl && (
                      <img className="meal-cover" src={meal.imageUrl} alt={meal.title} />
                    )}
                    <button
                      type="button"
                      className="meal-card-hit"
                      onClick={() => setSelectedId(meal.id)}
                    >
                      <div className="meal-card-top">
                        <h3>{meal.title}</h3>
                        <span className="meal-price">{Number(meal.price)} ₺</span>
                      </div>
                      <p className="meal-chef">
                        {meal.chef}{' '}
                        <RatingBadge score={meal.chefRating} count={meal.chefReviewCount} />
                      </p>
                      <RatingBadge score={meal.rating} count={meal.reviewCount} />
                      <p className="meal-note">{meal.description}</p>
                      <div className="meal-meta">
                        <span>
                          <UtensilsCrossed size={14} aria-hidden />
                          {meal.portions} porsiyon
                        </span>
                        <span className="distance-badge">
                          <MapPin size={14} aria-hidden />
                          {Number(meal.distanceKm).toFixed(1)} km
                          {meal.ilce ? ` • ${meal.ilce}` : ''}
                        </span>
                        <span>Kapora %{meal.depositRate ?? 30}</span>
                      </div>
                    </button>
                    <button
                      type="button"
                      className="reserve-btn"
                      onClick={() => handleReserveClick(meal)}
                      disabled={meal.portions < 1}
                    >
                      Rezerve Et
                    </button>
                  </li>
                ))}
              </ul>
            </section>
        )}
      </main>

      <ProfileDrawer
        open={profileOpen}
        user={user}
        api={api}
        onClose={() => setProfileOpen(false)}
        onTopup={() => {
          if (!ensureVerified()) return
          setWalletOpen(true)
        }}
        onLogout={() => {
          persistAuth(null)
          setDeliveryInfo(null)
          setProfileOpen(false)
          setActiveTab('search')
        }}
        onUserSaved={(nextUser) => patchUser(nextUser)}
        onReview={(order) => {
          setProfileOpen(false)
          setReviewOrder({
            orderId: order.id,
            mealTitle: order.mealTitle,
            aliciId: user?.id,
          })
        }}
        onNotify={(payload) => setToast(payload)}
        onMealsChanged={() => {
          if (userGps) fetchMeals(userGps)
        }}
      />

      <AuthModal
        open={authOpen}
        initialTab={authTab}
        onClose={() => {
          setAuthOpen(false)
          setPendingAction(null)
        }}
        onSubmitLogin={async (payload) => {
          const { data } = await api.post('/auth/login', payload)
          await handleAuthSuccess(data)
        }}
        onSubmitRegister={async (payload) => {
          const { data } = await api.post('/auth/register', payload)
          await handleAuthSuccess(data)
        }}
        onDemoLogin={async () => {
          const { data } = await api.post('/auth/demo-login')
          await handleAuthSuccess(data)
        }}
      />

      <OtpModal
        open={otpOpen}
        phoneHint={user?.telefon}
        onClose={() => setOtpOpen(false)}
        onVerify={handleVerifyOtp}
      />

      <WalletTopupModal
        open={walletOpen}
        onClose={() => setWalletOpen(false)}
        onTopup={async (payload) => {
          const { data } = await api.post('/wallet/topup', payload)
          patchUser({ bakiye: data.bakiye })
        }}
      />

      <ReserveModal
        open={Boolean(reserveMeal)}
        meal={reserveMeal}
        bakiye={user?.bakiye}
        onClose={() => setReserveMeal(null)}
        onConfirm={confirmReserve}
      />

      <ReviewModal
        open={Boolean(reviewOrder)}
        order={reviewOrder}
        onClose={() => setReviewOrder(null)}
        onSubmit={async (payload) => {
          await api.post('/reviews', payload)
          setReviewOrder(null)
          setToast({ title: 'Teşekkürler', message: 'Değerlendirmen kaydedildi.' })
          setOrdersKey((k) => k + 1)
          if (userGps) fetchMeals(userGps)
        }}
      />

      <Toast
        open={Boolean(toast)}
        title={toast?.title}
        message={toast?.message}
        code={toast?.code}
        onClose={() => setToast(null)}
      />
    </div>
  )
}

export default App
