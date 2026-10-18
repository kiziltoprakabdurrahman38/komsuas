import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Camera,
  ImagePlus,
  RefreshCw,
  MapPin,
  UtensilsCrossed,
} from 'lucide-react'
import MealMap from './MealMap.jsx'
import AddressCascade from './AddressCascade.jsx'

const STEPS = [
  { id: 1, label: 'Bilgiler' },
  { id: 2, label: 'Fiyat & Porsiyon' },
  { id: 3, label: 'Fotoğraf' },
  { id: 4, label: 'Gel-Al Adresi' },
]

const EMPTY_FORM = {
  baslik: '',
  aciklama: '',
  porsiyonFiyati: '',
  kalanPorsiyon: '1',
  kaporaOrani: '30',
  gorselUrl: '',
  il: 'Kayseri',
  ilce: '',
  mahalle: '',
  sokak: '',
  binaNo: '',
  kat: '',
  daireNo: '',
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function ShareMealWizard({
  userName,
  mapCenter,
  gpsPosition,
  mapZoom,
  onPublished,
  onError,
  onUserPositionChange,
}) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(EMPTY_FORM)
  const [pickPosition, setPickPosition] = useState(
    gpsPosition || mapCenter || null,
  )
  const [stepError, setStepError] = useState(null)
  const [sharing, setSharing] = useState(false)
  const [flyToTarget, setFlyToTarget] = useState(null)

  const galleryRef = useRef(null)
  const cameraRef = useRef(null)

  useEffect(() => {
    if (gpsPosition && !pickPosition) setPickPosition(gpsPosition)
  }, [gpsPosition, pickPosition])

  const progress = useMemo(() => (step / STEPS.length) * 100, [step])

  const patch = (partial) => setForm((prev) => ({ ...prev, ...partial }))

  const validateStep = (n) => {
    if (n === 1) {
      if (!form.baslik.trim() || form.baslik.trim().length < 3) {
        return 'Yemek adı en az 3 karakter olmalı.'
      }
      if (!form.aciklama.trim() || form.aciklama.trim().length < 10) {
        return 'Açıklama en az 10 karakter olmalı (malzeme, alerjen vb.).'
      }
    }
    if (n === 2) {
      const price = Number(form.porsiyonFiyati)
      const portions = Number(form.kalanPorsiyon)
      const rate = Number(form.kaporaOrani)
      if (!(price >= 0) || Number.isNaN(price)) return 'Geçerli bir porsiyon fiyatı girin.'
      if (!portions || portions < 1) return 'Porsiyon adedi en az 1 olmalı.'
      if (Number.isNaN(rate) || rate < 10 || rate > 100) {
        return 'Kapora oranı 10–100 arasında olmalı.'
      }
    }
    if (n === 3) {
      if (!form.gorselUrl) return 'Gerçek bir yemek fotoğrafı yükleyin veya çekin.'
    }
    if (n === 4) {
      if (!form.il.trim()) return 'İl gerekli.'
      if (!form.ilce.trim()) return 'İlçe gerekli.'
      if (!form.mahalle.trim()) return 'Mahalle gerekli.'
      if (!form.sokak.trim()) return 'Sokak / cadde gerekli.'
      if (!form.binaNo.trim()) return 'Bina / kapı no gerekli.'
      if (!pickPosition?.lat || !pickPosition?.lng) {
        return 'Haritadan gel-al konumunu seçin.'
      }
    }
    return null
  }

  const goNext = () => {
    const err = validateStep(step)
    if (err) {
      setStepError(err)
      return
    }
    setStepError(null)
    setStep((s) => Math.min(4, s + 1))
  }

  const goBack = () => {
    setStepError(null)
    setStep((s) => Math.max(1, s - 1))
  }

  const onImagePicked = async (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setStepError('Lütfen bir görsel dosyası seçin.')
      return
    }
    try {
      const dataUrl = await readFileAsDataUrl(file)
      patch({ gorselUrl: dataUrl })
      setStepError(null)
    } catch {
      setStepError('Fotoğraf okunamadı.')
    }
  }

  const useGpsPin = () => {
    if (!gpsPosition) {
      setStepError('GPS konumu alınamadı. Haritayı kaydırarak pini hizalayın.')
      return
    }
    setPickPosition(gpsPosition)
    setFlyToTarget({
      id: `gps-${Date.now()}`,
      lat: gpsPosition.lat,
      lng: gpsPosition.lng,
      zoom: 18,
    })
    setStepError(null)
  }

  const publish = async () => {
    const err = validateStep(4)
    if (err) {
      setStepError(err)
      return
    }
    setSharing(true)
    setStepError(null)
    try {
      await onPublished?.({
        ...form,
        enlem: pickPosition.lat,
        boylam: pickPosition.lng,
      })
      setForm(EMPTY_FORM)
      setPickPosition(gpsPosition || mapCenter || null)
      setStep(1)
    } catch (e) {
      const message = e.response?.data?.error || e.message || 'İlan yayınlanamadı.'
      setStepError(message)
      onError?.(message)
    } finally {
      setSharing(false)
    }
  }

  return (
    <section className="share-wizard animate-fade-in">
      <div className="share-wizard-head">
        <h2>Yeni yemek ilanı</h2>
        <p>{userName ? `${userName} olarak paylaşıyorsun.` : 'Giriş gerekli.'}</p>
      </div>

      <div className="stepper" aria-label="İlan adımları">
        <div className="stepper-track">
          <div className="stepper-fill" style={{ width: `${progress}%` }} />
        </div>
        <ol className="stepper-steps">
          {STEPS.map((s) => (
            <li key={s.id} className={step === s.id ? 'is-active' : step > s.id ? 'is-done' : ''}>
              <span>{s.id}</span>
              {s.label}
            </li>
          ))}
        </ol>
      </div>

      <div className="share-wizard-body">
        {step === 1 && (
          <div className="wizard-pane">
            <h3>1. Yemek Bilgileri</h3>
            <label>
              Başlık (Yemek Adı)
              <input
                value={form.baslik}
                onChange={(e) => patch({ baslik: e.target.value })}
                placeholder='Örn. "Kayseri Mantısı (El Açması)"'
              />
            </label>
            <label>
              Açıklama
              <textarea
                rows={5}
                value={form.aciklama}
                onChange={(e) => patch({ aciklama: e.target.value })}
                placeholder="Malzemeler, porsiyon gramajı, acı/alerjen notu…"
              />
            </label>
          </div>
        )}

        {step === 2 && (
          <div className="wizard-pane">
            <h3>2. Fiyat, Porsiyon & Kapora</h3>
            <div className="form-row">
              <label>
                Porsiyon fiyatı (₺)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.porsiyonFiyati}
                  onChange={(e) => patch({ porsiyonFiyati: e.target.value })}
                />
              </label>
              <label>
                Satışa sunulan porsiyon
                <input
                  type="number"
                  min="1"
                  value={form.kalanPorsiyon}
                  onChange={(e) => patch({ kalanPorsiyon: e.target.value })}
                />
              </label>
            </div>
            <label>
              Güvence kaporası oranı (%)
              <input
                type="number"
                min="10"
                max="100"
                value={form.kaporaOrani}
                onChange={(e) => patch({ kaporaOrani: e.target.value })}
              />
            </label>
            <p className="wizard-hint">
              Varsayılan %30. Alıcı rezervasyonda bu oranı güvence olarak öder.
            </p>
          </div>
        )}

        {step === 3 && (
          <div className="wizard-pane">
            <h3>3. Gerçek Yemek Fotoğrafı</h3>
            <p className="wizard-hint">
              Hazır stok görsel yok — kendi sofranızın fotoğrafını yükleyin veya çekin.
            </p>

            <div className="photo-actions">
              <button
                type="button"
                className="photo-action-btn"
                onClick={() => galleryRef.current?.click()}
              >
                <ImagePlus size={18} aria-hidden />
                Galeriden / Dosyadan Seç
              </button>
              <button
                type="button"
                className="photo-action-btn"
                onClick={() => cameraRef.current?.click()}
              >
                <Camera size={18} aria-hidden />
                Kamerayı Aç / Fotoğraf Çek
              </button>
            </div>

            <input
              ref={galleryRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => onImagePicked(e.target.files?.[0])}
            />
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={(e) => onImagePicked(e.target.files?.[0])}
            />

            {form.gorselUrl ? (
              <div className="photo-preview-wrap">
                <img src={form.gorselUrl} alt="Yemek önizleme" className="preview-image" />
                <button
                  type="button"
                  className="logout-btn"
                  onClick={() => {
                    patch({ gorselUrl: '' })
                    if (galleryRef.current) galleryRef.current.value = ''
                    if (cameraRef.current) cameraRef.current.value = ''
                  }}
                >
                  <RefreshCw size={15} aria-hidden />
                  Fotoğrafı Değiştir
                </button>
              </div>
            ) : (
              <div className="photo-empty">Henüz fotoğraf yok</div>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="wizard-pane">
            <h3>4. Gel-Al Açık Adres ve Konum</h3>
            <p className="wizard-hint">
              Türkiye geneli il → ilçe → mahalle araması. Mahalle seçilince harita
              odaklanır; pini kapınıza hizalamak için haritayı kaydırın.
            </p>

            <AddressCascade
              value={form}
              defaultCity="Kayseri"
              onChange={(next) => {
                setForm((prev) => ({ ...prev, ...next }))
                setStepError(null)
              }}
              onLocationResolve={(place) => {
                if (!place?.lat || !place?.lng) return
                setPickPosition({ lat: place.lat, lng: place.lng })
                setFlyToTarget({
                  id: place.id,
                  lat: place.lat,
                  lng: place.lng,
                  zoom: place.zoom || 16,
                })
              }}
            />

            <div className="address-map-block">
              <div className="address-map-head">
                <MapPin size={16} aria-hidden />
                <span>Haritayı kaydırarak pini teslimat kapınıza hizalayın</span>
                <button type="button" className="logout-btn" onClick={useGpsPin}>
                  GPS ile eşle
                </button>
              </div>
              <div className="address-map-frame">
                <MealMap
                  userPosition={
                    pickPosition || mapCenter || { lat: 38.7312, lng: 35.4787 }
                  }
                  gpsPosition={gpsPosition}
                  zoom={mapZoom || 15}
                  pickMode
                  pickPosition={pickPosition}
                  onMapClick={(pos) => {
                    setPickPosition((prev) => {
                      if (
                        prev &&
                        Math.abs(prev.lat - pos.lat) < 1e-7 &&
                        Math.abs(prev.lng - pos.lng) < 1e-7
                      ) {
                        return prev
                      }
                      return pos
                    })
                    setStepError(null)
                  }}
                  followCenter={false}
                  flyToTarget={flyToTarget}
                  onUserPositionChange={onUserPositionChange}
                />
              </div>
              <p className="pick-coords">
                {pickPosition
                  ? `Pin: ${pickPosition.lat.toFixed(5)}, ${pickPosition.lng.toFixed(5)}`
                  : 'Henüz pin seçilmedi'}
              </p>
            </div>
          </div>
        )}

        {stepError && <p className="form-feedback is-error">{stepError}</p>}
      </div>

      <div className="wizard-nav">
        {step > 1 ? (
          <button type="button" className="logout-btn" onClick={goBack}>
            <ChevronLeft size={16} aria-hidden />
            Geri
          </button>
        ) : (
          <span />
        )}

        {step < 4 ? (
          <button type="button" className="primary-btn" onClick={goNext}>
            Devam Et
            <ChevronRight size={16} aria-hidden />
          </button>
        ) : (
          <button type="button" className="primary-btn" disabled={sharing} onClick={publish}>
            <UtensilsCrossed size={18} aria-hidden />
            {sharing ? 'Yayınlanıyor…' : 'İlanı Yayınla'}
          </button>
        )}
      </div>
    </section>
  )
}
