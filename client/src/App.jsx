import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import { io } from 'socket.io-client'
import {
  ChefHat,
  Home,
  MapPin,
  ShoppingBag,
  User,
  UtensilsCrossed,
  Search,
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
import LocationSelector from './components/LocationSelector.jsx'
import MealDetailModal from './components/MealDetailModal.jsx'
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
  const [selectedCity, setSelectedCity] = useState('Kayseri')
  const [selectedDistrict, setSelectedDistrict] = useState('Melikgazi')
  const [query, setQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [profileSection, setProfileSection] = useState('ozet')
  const searchRef = useRef(null)

  const [meals, setMeals] = useState([])
  const [loadingMeals, setLoadingMeals] = useState(true)
  const [mealsError, setMealsError] = useState(null)
  const [usingFallback, setUsingFallback] = useState(false)
  const [mealFilter, setMealFilter] = useState('all')
  const [selectedId, setSelectedId] = useState(null)
  const [detailMeal, setDetailMeal] = useState(null)

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

  const applyUserPoint = useCallback((next, { fly = false, manual = false, zoom = 16, label } = {}) => {
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
    setSelectedCity(place.city)
    setSelectedDistrict(place.district)
    applyUserPoint(
      { lat: place.lat, lng: place.lng },
      {
        manual: true,
        zoom: 14,
        label: `${place.district}, ${place.city}`,
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

  const openProfile = (section) => {
    if (!user) {
      openAuth('login')
      return
    }
    setProfileSection(section)
    setProfileOpen(true)
  }

  const goHome = () => {
    setActiveTab('search')
    setProfileOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const focusSearch = () => {
    setActiveTab('search')
    setProfileOpen(false)
    window.requestAnimationFrame(() => searchRef.current?.focus())
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

  const mobileTab =
    activeTab === 'share'
      ? 'share'
      : profileOpen && profileSection === 'siparis'
        ? 'orders'
        : profileOpen
          ? 'profile'
          : searchFocused
            ? 'search'
            : 'home'

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

  return (
    <div className="app-shell">
      <header className="site-header market-header sticky top-0 z-40 border-b border-emerald-900/5 bg-gradient-to-b from-[#eef4f0]/95 via-[#f2f7f3]/90 to-transparent backdrop-blur-md transition-all animate-fade-down">
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
          <LocationSelector city={selectedCity} district={selectedDistrict} onSelect={choosePlace} />
        </div>

        <form className="search-bar rounded-2xl border border-emerald-950/10 bg-white/80 px-4 py-2.5 text-sm text-slate-800 shadow-sm transition-all hover:bg-white focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-500/20" role="search" onSubmit={(event) => event.preventDefault()}>
          <Search size={18} aria-hidden />
          <input
            ref={searchRef}
            className="text-base md:text-sm"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
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
          <button
            type="button"
            className="share-chef h-11 shrink-0 whitespace-nowrap rounded-xl bg-emerald-600 px-4 text-sm font-medium text-white shadow-sm transition-all hover:bg-emerald-700 hover:shadow-md flex items-center gap-2"
            onClick={handleShareTab}
            aria-label="Yemek Paylaş"
          >
            <ChefHat size={16} aria-hidden />
            <span className="share-label">Yemek Paylaş</span>
            <span className="share-plus" aria-hidden>+</span>
          </button>
          {user ? (
            <button type="button" className="profile-btn" onClick={() => openProfile('ozet')}>
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
                {visibleMeals.map((meal, index) => {
                  const kindLabel = MEAL_FILTERS.find((item) => item.id === mealKind(meal))?.label || 'Ev Yemeği'
                  return (
                  <li
                    key={meal.id}
                    className="flex min-w-0 flex-col"
                    style={{ animationDelay: `${0.05 + index * 0.05}s` }}
                  >
                    <article
                      className={`meal-card flex h-full w-full flex-1 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:shadow-xl ${selectedId === meal.id ? 'ring-2 ring-emerald-600' : ''}`}
                    >
                      <button
                        type="button"
                        className="meal-card-hit"
                        onClick={() => {
                          setSelectedId(meal.id)
                          setDetailMeal(meal)
                        }}
                      >
                        <div className="relative">
                          {meal.imageUrl ? (
                            <img className="h-[190px] w-full object-cover md:h-40" src={meal.imageUrl} alt="" />
                          ) : (
                            <div className="h-[190px] w-full bg-slate-100 md:h-40" />
                          )}
                          <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-slate-700">
                            {kindLabel}
                          </span>
                          <span className="absolute right-3 top-3 rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white">
                            {Number(meal.price)} ₺
                          </span>
                        </div>
                        <div className="px-4 pb-3 pt-3 text-left">
                          <h3 className="line-clamp-2 text-base font-semibold text-slate-900 md:min-h-[2.75rem]">{meal.title}</h3>
                          <p className="mt-1 flex flex-wrap items-center gap-1 text-sm font-medium text-slate-600">
                            {meal.chef}
                            <RatingBadge score={meal.chefRating} count={meal.chefReviewCount} />
                          </p>
                          <p className="mt-1 line-clamp-2 text-xs text-slate-500 md:min-h-[2.5rem]">{meal.description}</p>
                        </div>
                      </button>
                      <div className="mt-auto flex flex-col gap-2.5 border-t border-slate-100 px-4 pb-4 pt-3">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-slate-600">
                          <span className="inline-flex items-center gap-1">
                            <UtensilsCrossed size={14} aria-hidden />
                            {meal.portions} porsiyon
                          </span>
                          <span className="inline-flex items-center gap-1 text-emerald-700">
                            <MapPin size={14} aria-hidden />
                            {Number(meal.distanceKm).toFixed(1)} km
                            {meal.ilce ? ` • ${meal.ilce}` : ''}
                          </span>
                          <span>Kapora %{meal.depositRate ?? 30}</span>
                        </div>
                        <button
                          type="button"
                          className="reserve-btn"
                          onClick={() => handleReserveClick(meal)}
                          disabled={meal.portions < 1}
                        >
                          Rezerve Et
                        </button>
                      </div>
                    </article>
                  </li>
                  )
                })}
              </ul>
            </section>
        )}
      </main>

      <nav className="mobile-tabbar flex md:hidden" aria-label="Mobil menü">
        {[
          { id: 'home', label: 'Ana Sayfa', icon: Home, onClick: goHome },
          { id: 'search', label: 'Ara', icon: Search, onClick: focusSearch },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            className={`mobile-tab ${mobileTab === item.id ? 'is-active' : ''}`}
            onClick={item.onClick}
            aria-current={mobileTab === item.id ? 'page' : undefined}
          >
            <item.icon size={20} aria-hidden />
            <span>{item.label}</span>
          </button>
        ))}
        <button
          type="button"
          className="mobile-tab mobile-tab-share"
          onClick={handleShareTab}
          aria-label="Yemek Paylaş"
          aria-current={mobileTab === 'share' ? 'page' : undefined}
        >
          <span className="mobile-share-fab">
            <ChefHat size={22} aria-hidden />
          </span>
          <span>Paylaş</span>
        </button>
        <button
          type="button"
          className={`mobile-tab ${mobileTab === 'orders' ? 'is-active' : ''}`}
          onClick={() => openProfile('siparis')}
          aria-current={mobileTab === 'orders' ? 'page' : undefined}
        >
          <ShoppingBag size={20} aria-hidden />
          <span>Siparişlerim</span>
        </button>
        <button
          type="button"
          className={`mobile-tab ${mobileTab === 'profile' ? 'is-active' : ''}`}
          onClick={() => openProfile('ozet')}
          aria-current={mobileTab === 'profile' ? 'page' : undefined}
        >
          <User size={20} aria-hidden />
          <span>Profilim</span>
        </button>
      </nav>

      <ProfileDrawer
        open={profileOpen}
        initialSection={profileSection}
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

      <MealDetailModal
        meal={detailMeal}
        kindLabel={detailMeal ? (MEAL_FILTERS.find((item) => item.id === mealKind(detailMeal))?.label || 'Ev Yemeği') : ''}
        onClose={() => setDetailMeal(null)}
        onReserve={() => {
          const meal = detailMeal
          setDetailMeal(null)
          if (meal) handleReserveClick(meal)
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
