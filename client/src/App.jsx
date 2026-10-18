import { useCallback, useEffect, useState } from 'react'
import axios from 'axios'
import { io } from 'socket.io-client'
import {
  MapPin,
  UtensilsCrossed,
  Search,
  ChefHat,
  BadgeCheck,
  LogOut,
  Wallet,
  ClipboardList,
} from 'lucide-react'
import MealMap from './components/MealMap.jsx'
import AuthModal from './components/AuthModal.jsx'
import Toast from './components/Toast.jsx'
import OtpModal from './components/OtpModal.jsx'
import WalletTopupModal from './components/WalletTopupModal.jsx'
import ReserveModal from './components/ReserveModal.jsx'
import LocationSearch from './components/LocationSearch.jsx'
import OrdersPanel from './components/OrdersPanel.jsx'
import BrandLogo from './components/BrandLogo.jsx'
import ShareMealWizard from './components/ShareMealWizard.jsx'
import ReviewModal from './components/ReviewModal.jsx'
import RatingBadge from './components/RatingBadge.jsx'
import { TURKEY_CENTER } from './data/cities.js'
import { apiBaseUrl, apiOrigin } from './apiConfig.js'

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
  const [mapCenter, setMapCenter] = useState(TURKEY_CENTER)
  const [mapZoom, setMapZoom] = useState(TURKEY_CENTER.zoom)
  const [flyToTarget, setFlyToTarget] = useState(null)
  const [userGps, setUserGps] = useState(null)
  const [locationDenied, setLocationDenied] = useState(false)

  const [meals, setMeals] = useState([])
  const [loadingMeals, setLoadingMeals] = useState(false)
  const [mealsError, setMealsError] = useState(null)
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

  const fetchMeals = useCallback(async (position) => {
    if (!position?.lat || !position?.lng) {
      setMeals([])
      setMealsError('Yakınınızdaki yemekleri görebilmek için konum izni vermelisiniz')
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
      })
      setMeals(data.meals || [])
    } catch (err) {
      setMeals([])
      setMealsError(
        err.response?.data?.error ||
          err.message ||
          'Yakınınızdaki yemekleri görebilmek için konum izni vermelisiniz',
      )
    } finally {
      setLoadingMeals(false)
    }
  }, [])

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationDenied(true)
      setMeals([])
      setMealsError('Yakınınızdaki yemekleri görebilmek için konum izni vermelisiniz')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setUserGps(next)
        setMapCenter(next)
        setMapZoom(13)
        setFlyToTarget({ id: Date.now(), ...next, zoom: 13 })
        setLocationDenied(false)
        fetchMeals(next)
      },
      () => {
        setUserGps(null)
        setLocationDenied(true)
        setMeals([])
        setMealsError('Yakınınızdaki yemekleri görebilmek için konum izni vermelisiniz')
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }, [fetchMeals])

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

  const handlePlaceSelect = (place) => {
    // Harita aranan noktaya uçar; yemek listesi canlı GPS + 30 km ile kalır
    setMapCenter({ lat: place.lat, lng: place.lng })
    setMapZoom(place.zoom || 15)
    setFlyToTarget({
      id: Date.now(),
      lat: place.lat,
      lng: place.lng,
      zoom: place.zoom || 15,
    })
    if (userGps) fetchMeals(userGps)
  }

  const retryLocation = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setUserGps(next)
        setMapCenter(next)
        setMapZoom(13)
        setFlyToTarget({ id: Date.now(), ...next, zoom: 13 })
        setLocationDenied(false)
        fetchMeals(next)
      },
      () => {
        setLocationDenied(true)
        setMealsError('Yakınınızdaki yemekleri görebilmek için konum izni vermelisiniz')
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  const handleReserveClick = (meal) => {
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

  return (
    <div className="app-shell">
      <header className="site-header animate-fade-down">
        <button
          type="button"
          className="brand-block brand-hit"
          onClick={() => setActiveTab('search')}
          aria-label="KomşuAş ana sayfa"
        >
          <BrandLogo size={48} />
          <div className="brand-text">
            <p className="brand-mark">KomşuAş</p>
            <p className="brand-sub">Kapıdan Sıcak Ev Yemeği</p>
          </div>
        </button>

        <div className="header-right">
          <nav className="tab-nav" aria-label="Ana sekmeler">
            <button
              type="button"
              className={`tab-btn ${activeTab === 'share' ? 'is-active' : ''}`}
              onClick={handleShareTab}
            >
              <ChefHat size={18} aria-hidden />
              Aşçı mısın? Yemek Paylaş
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'search' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('search')}
            >
              <Search size={18} aria-hidden />
              Yemek Ara
            </button>
            {user && (
              <button
                type="button"
                className={`tab-btn ${activeTab === 'orders' ? 'is-active' : ''}`}
                onClick={() => {
                  if (!ensureVerified()) return
                  setActiveTab('orders')
                  setOrdersKey((k) => k + 1)
                }}
              >
                <ClipboardList size={18} aria-hidden />
                Siparişlerim & İlanlarım
              </button>
            )}
          </nav>

          {user ? (
            <div className="user-chip">
              <div className="user-chip-text">
                <strong>{user.adSoyad}</strong>
                <span className={`verified-badge ${user.isVerified ? '' : 'is-pending'}`}>
                  <BadgeCheck size={14} aria-hidden />
                  {user.isVerified ? 'Doğrulanmış Profil' : 'Doğrulama bekliyor'}
                </span>
                <RatingBadge score={user.ortalamaPuan} count={user.toplamDegerlendirme} />
              </div>
              <button type="button" className="wallet-chip" onClick={() => {
                if (!ensureVerified()) return
                setWalletOpen(true)
              }}>
                <Wallet size={15} aria-hidden />
                Cüzdan: {Number(user.bakiye ?? 0).toFixed(0)} ₺
              </button>
              <button
                type="button"
                className="logout-btn"
                onClick={() => {
                  if (!ensureVerified()) return
                  setWalletOpen(true)
                }}
              >
                + Bakiye Yükle
              </button>
              <button
                type="button"
                className="logout-btn"
                onClick={() => {
                  persistAuth(null)
                  setDeliveryInfo(null)
                  setActiveTab('search')
                }}
              >
                <LogOut size={16} aria-hidden />
                Çıkış Yap
              </button>
            </div>
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

      {locationDenied && (
        <div className="delivery-banner is-error animate-fade-in" role="alert">
          Yakınınızdaki yemekleri görebilmek için konum izni vermelisiniz.{' '}
          <button type="button" className="linkish-btn" onClick={retryLocation}>
            Konumu yeniden dene
          </button>
        </div>
      )}

      <main className="main-stage">
        {activeTab === 'orders' ? (
          <OrdersPanel
            key={ordersKey}
            api={api}
            onNotify={(payload) => setToast(payload)}
            onReview={(order) =>
              setReviewOrder({
                orderId: order.id,
                mealTitle: order.mealTitle,
                aliciId: user?.id,
              })
            }
          />
        ) : activeTab === 'share' ? (
          <div className="share-layout">
            <ShareMealWizard
              userName={user?.adSoyad}
              mapCenter={mapCenter}
              gpsPosition={userGps}
              mapZoom={mapZoom || 15}
              onPublished={handleSharePublish}
            />
          </div>
        ) : (
          <>
            <section className="map-panel animate-fade-in">
              <div className="map-frame">
                <LocationSearch onSelect={handlePlaceSelect} />
                <MealMap
                  userPosition={mapCenter}
                  gpsPosition={userGps}
                  zoom={mapZoom}
                  meals={meals}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  followCenter={false}
                  flyToTarget={flyToTarget}
                />
              </div>
            </section>

            <section className="meals-panel">
              <div className="meals-heading animate-fade-in">
                <h2>Yakınındaki sofralar</h2>
                <p>
                  {loadingMeals
                    ? 'Yemekler yükleniyor…'
                    : `${meals.length} aktif ilan · gerçek aşçı adlarıyla`}
                </p>
              </div>

              {mealsError && <p className="form-feedback is-error">{mealsError}</p>}
              {!loadingMeals && !mealsError && meals.length === 0 && (
                <p className="empty-state">Bu bölgede aktif ilan yok. Şehir arayın.</p>
              )}

              <ul className="meal-grid">
                {meals.map((meal, index) => (
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
                        <span>
                          <MapPin size={14} aria-hidden />
                          {Number(meal.distanceKm).toFixed(1)} km
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
          </>
        )}
      </main>

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
