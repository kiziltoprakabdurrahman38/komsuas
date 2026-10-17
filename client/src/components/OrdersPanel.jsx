import { useEffect, useState } from 'react'
import { ClipboardList, KeyRound } from 'lucide-react'
import RatingBadge from './RatingBadge.jsx'

export default function OrdersPanel({ api, onNotify, onReview }) {
  const [subTab, setSubTab] = useState('bought')
  const [bought, setBought] = useState([])
  const [selling, setSelling] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [codes, setCodes] = useState({})
  const [busyId, setBusyId] = useState(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [mine, sold] = await Promise.all([
        api.get('/orders/mine'),
        api.get('/orders/selling'),
      ])
      setBought(mine.data.orders || [])
      setSelling(sold.data.orders || [])
    } catch (err) {
      setError(err.response?.data?.error || 'Siparişler yüklenemedi.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const verifyDelivery = async (orderId) => {
    const code = String(codes[orderId] || '').replace(/\D/g, '')
    if (code.length !== 6) {
      onNotify?.({ title: 'Eksik kod', message: '6 haneli teslimat kodunu girin.' })
      return
    }
    setBusyId(orderId)
    try {
      const { data } = await api.post('/orders/verify', { orderId, code })
      onNotify?.({
        title: 'Teslimat',
        message: data.message || 'Sipariş başarıyla teslim edildi!',
      })
      setCodes((prev) => ({ ...prev, [orderId]: '' }))
      await load()
    } catch (err) {
      onNotify?.({
        title: 'Hata',
        message: err.response?.data?.error || 'Doğrulama başarısız.',
      })
    } finally {
      setBusyId(null)
    }
  }

  const statusLabel = (status) => {
    if (status === 'TeslimEdildi') return 'Teslim edildi'
    if (status === 'Beklemede') return 'Aktif rezervasyon'
    if (status === 'Iptal') return 'İptal'
    if (status === 'AliciGelmedi') return 'Alıcı gelmedi'
    if (status === 'AsciIptal') return 'Aşçı iptal etti'
    return status
  }

  const resolveOrder = async (orderId, action) => {
    setBusyId(orderId)
    try {
      const { data } = await api.post('/orders/resolve', { orderId, action })
      onNotify?.({
        title: action === 'AsciIptal' ? 'Kapora iadesi' : 'Alıcı gelmedi',
        message: data.message,
      })
      await load()
    } catch (err) {
      onNotify?.({
        title: 'Hata',
        message: err.response?.data?.error || 'İşlem tamamlanamadı.',
      })
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="orders-panel animate-fade-in">
      <div className="orders-heading">
        <ClipboardList size={22} aria-hidden />
        <div>
          <h2>Siparişlerim & İlanlarım</h2>
          <p>Alıcı ve aşçı panellerini tek yerden yönet</p>
        </div>
      </div>

      <div className="orders-tabs">
        <button
          type="button"
          className={subTab === 'bought' ? 'is-active' : ''}
          onClick={() => setSubTab('bought')}
        >
          Aldıklarım (Alıcı)
        </button>
        <button
          type="button"
          className={subTab === 'selling' ? 'is-active' : ''}
          onClick={() => setSubTab('selling')}
        >
          Sattıklarım (Aşçı)
        </button>
      </div>

      {loading && <p className="empty-state">Yükleniyor…</p>}
      {error && <p className="form-feedback is-error">{error}</p>}

      {!loading && subTab === 'bought' && (
        <ul className="orders-list">
          {bought.length === 0 && (
            <li className="empty-state">Henüz rezervasyonun yok.</li>
          )}
          {bought.map((order) => (
            <li key={order.id} className="order-card">
              {order.imageUrl && (
                <img src={order.imageUrl} alt={order.mealTitle} className="order-cover" />
              )}
              <div className="order-body">
                <div className="order-top">
                  <h3>{order.mealTitle}</h3>
                  <span className={`status-pill status-${order.status}`}>{statusLabel(order.status)}</span>
                </div>
                <p className="meal-chef">
                  Aşçı: {order.chefName}{' '}
                  <RatingBadge score={order.chefRating} count={order.chefReviewCount} />
                </p>
                <div className="order-meta-grid">
                  <div>
                    <span>Kapora</span>
                    <strong>{Number(order.depositAmount || 0).toFixed(2)} ₺</strong>
                  </div>
                  <div>
                    <span>Kapıda nakit</span>
                    <strong>{Number(order.remainingAmount || 0).toFixed(2)} ₺</strong>
                  </div>
                  <div>
                    <span>Porsiyon</span>
                    <strong>{order.portions}</strong>
                  </div>
                </div>
                {(order.acikAdres || order.il) && (
                  <div className="pickup-address-box">
                    <span>Gel-al açık adres</span>
                    <strong>
                      {order.acikAdres ||
                        [
                          order.mahalle,
                          order.sokak,
                          order.binaNo ? `No:${order.binaNo}` : null,
                          order.kat ? `Kat:${order.kat}` : null,
                          order.daireNo ? `Daire:${order.daireNo}` : null,
                          order.ilce,
                          order.il,
                        ]
                          .filter(Boolean)
                          .join(', ')}
                    </strong>
                  </div>
                )}
                {order.status === 'TeslimEdildi' && !order.reviewed && (
                  <button
                    type="button"
                    className="primary-btn"
                    onClick={() => onReview?.(order)}
                  >
                    Yemeği Değerlendir
                  </button>
                )}
                {['Beklemede', 'Onaylandi'].includes(order.status) && (
                  <div className="delivery-code-box">
                    <KeyRound size={16} aria-hidden />
                    <div>
                      <span>Aşçıya göstereceğin teslimat kodu</span>
                      <strong className="delivery-code">{order.deliveryCode}</strong>
                    </div>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {!loading && subTab === 'selling' && (
        <ul className="orders-list">
          {selling.length === 0 && (
            <li className="empty-state">İlanlarına henüz rezervasyon gelmedi.</li>
          )}
          {selling.map((order) => (
            <li key={order.id} className="order-card">
              {order.imageUrl && (
                <img src={order.imageUrl} alt={order.mealTitle} className="order-cover" />
              )}
              <div className="order-body">
                <div className="order-top">
                  <h3>{order.mealTitle}</h3>
                  <span className={`status-pill status-${order.status}`}>{statusLabel(order.status)}</span>
                </div>
                <p className="meal-chef">Alıcı: {order.buyerName}</p>
                <div className="order-meta-grid">
                  <div>
                    <span>Kapora</span>
                    <strong>{Number(order.depositAmount || 0).toFixed(2)} ₺</strong>
                  </div>
                  <div>
                    <span>Kapıda nakit</span>
                    <strong>{Number(order.remainingAmount || 0).toFixed(2)} ₺</strong>
                  </div>
                </div>

                {['Beklemede', 'Onaylandi'].includes(order.status) ? (
                  <>
                  <div className="verify-row">
                    <input
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="Teslimat kodunu gir"
                      value={codes[order.id] || ''}
                      onChange={(e) =>
                        setCodes((prev) => ({
                          ...prev,
                          [order.id]: e.target.value.replace(/\D/g, '').slice(0, 6),
                        }))
                      }
                    />
                    <button
                      type="button"
                      className="primary-btn"
                      disabled={busyId === order.id}
                      onClick={() => verifyDelivery(order.id)}
                    >
                      {busyId === order.id ? 'Onaylanıyor…' : 'Onayla ve Teslim Et'}
                    </button>
                  </div>
                  <div className="resolve-row">
                    <button
                      type="button"
                      className="logout-btn"
                      disabled={busyId === order.id}
                      onClick={() => resolveOrder(order.id, 'AliciGelmedi')}
                    >
                      Alıcı gelmedi
                    </button>
                    <button
                      type="button"
                      className="logout-btn is-danger"
                      disabled={busyId === order.id}
                      onClick={() => resolveOrder(order.id, 'AsciIptal')}
                    >
                      İptal et · kaporayı iade et
                    </button>
                  </div>
                  <p className="wizard-hint">
                    Alıcı gelmezse kapora sizde kalır. Siz iptal ederseniz kapora alıcıya tam iade edilir.
                  </p>
                  </>
                ) : order.status === 'TeslimEdildi' ? (
                  <p className="form-feedback is-ok">Teslimat tamamlandı.</p>
                ) : (
                  <p className="wizard-hint">{statusLabel(order.status)}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
