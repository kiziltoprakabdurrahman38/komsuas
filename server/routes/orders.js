const express = require('express');
const { sql, getPool } = require('../db');
const { requireAuth, requireVerified } = require('../middleware/auth');
const {
  emitWalletUpdate,
  emitMealsChanged,
  emitOrderCreated,
  emitOrderDelivered,
  emitOrderChanged,
} = require('../socket');

const router = express.Router();

function generateDeliveryCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

router.post('/', requireAuth, requireVerified, async (req, res) => {
  const mealId = Number(req.body?.mealId);
  const porsiyonAdedi = Number(req.body?.porsiyonAdedi ?? 1);
  const odemeYontemi = String(req.body?.odemeYontemi || 'Cuzdan');
  const aliciId = req.user.id;

  if (!mealId || Number.isNaN(mealId)) {
    return res.status(400).json({ error: 'mealId zorunludur.' });
  }
  if (!porsiyonAdedi || porsiyonAdedi < 1) {
    return res.status(400).json({ error: 'porsiyonAdedi en az 1 olmalıdır.' });
  }
  if (!['Cuzdan', 'KartSimulasyon'].includes(odemeYontemi)) {
    return res.status(400).json({ error: 'Ödeme yöntemi Cuzdan veya KartSimulasyon olmalıdır.' });
  }

  try {
    const pool = await getPool();
    let lastError = null;

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const transaction = new sql.Transaction(pool);
      const onayKodu = generateDeliveryCode();

      try {
        await transaction.begin();

        const mealRes = await new sql.Request(transaction)
          .input('mealId', sql.Int, mealId)
          .query(`
            SELECT Id, AsciId, KalanPorsiyon, AktifMi, Baslik, PorsiyonFiyati, KaporaOrani
            FROM dbo.Meals WITH (UPDLOCK, ROWLOCK)
            WHERE Id = @mealId;
          `);

        const meal = mealRes.recordset[0];
        if (!meal || !meal.AktifMi) {
          await transaction.rollback();
          return res.status(404).json({ error: 'Yemek ilanı bulunamadı veya aktif değil.' });
        }
        if (Number(meal.AsciId) === Number(aliciId)) {
          await transaction.rollback();
          return res.status(400).json({ error: 'Kendi ilanınızı rezerve edemezsiniz.' });
        }
        if (meal.KalanPorsiyon < porsiyonAdedi) {
          await transaction.rollback();
          return res.status(409).json({
            error: 'Yetersiz porsiyon.',
            remaining: meal.KalanPorsiyon,
          });
        }

        const total = Number(meal.PorsiyonFiyati) * porsiyonAdedi;
        const rate = Number(meal.KaporaOrani || 30);
        const kaporaTutari = Math.round(total * (rate / 100) * 100) / 100;
        const kalanTutar = Math.round((total - kaporaTutari) * 100) / 100;
        const asciId = Number(meal.AsciId);

        const buyerRes = await new sql.Request(transaction)
          .input('aliciId', sql.Int, aliciId)
          .query(`
            SELECT Id, Bakiye FROM dbo.Users WITH (UPDLOCK, ROWLOCK) WHERE Id = @aliciId
          `);
        const buyer = buyerRes.recordset[0];
        if (!buyer) {
          await transaction.rollback();
          return res.status(404).json({ error: 'Alıcı bulunamadı.' });
        }

        await new sql.Request(transaction)
          .input('asciId', sql.Int, asciId)
          .query(`
            SELECT Id FROM dbo.Users WITH (UPDLOCK, ROWLOCK) WHERE Id = @asciId
          `);

        if (odemeYontemi === 'Cuzdan' && Number(buyer.Bakiye) < kaporaTutari) {
          await transaction.rollback();
          return res.status(402).json({
            error: 'YemekCüzdan bakiyesi kapora için yetersiz.',
            required: kaporaTutari,
            bakiye: Number(buyer.Bakiye),
          });
        }

        await new sql.Request(transaction)
          .input('mealId', sql.Int, mealId)
          .input('porsiyonAdedi', sql.Int, porsiyonAdedi)
          .query(`
            UPDATE dbo.Meals
            SET
              KalanPorsiyon = KalanPorsiyon - @porsiyonAdedi,
              AktifMi = CASE WHEN KalanPorsiyon - @porsiyonAdedi <= 0 THEN 0 ELSE AktifMi END
            WHERE Id = @mealId;
          `);

        if (odemeYontemi === 'Cuzdan') {
          await new sql.Request(transaction)
            .input('aliciId', sql.Int, aliciId)
            .input('asciId', sql.Int, asciId)
            .input('kaporaTutari', sql.Decimal(10, 2), kaporaTutari)
            .input('aciklamaAlici', sql.NVarChar(200), `Kapora ödeme · ${meal.Baslik}`)
            .input('aciklamaAsci', sql.NVarChar(200), `Kapora güvence · ${meal.Baslik}`)
            .query(`
              UPDATE dbo.Users SET Bakiye = Bakiye - @kaporaTutari WHERE Id = @aliciId;
              UPDATE dbo.Users SET Bakiye = Bakiye + @kaporaTutari WHERE Id = @asciId;

              INSERT INTO dbo.WalletTransactions (UserId, Tutar, IslemTipi, Aciklama)
              VALUES (@aliciId, -@kaporaTutari, N'KaporaOdeme', @aciklamaAlici);

              INSERT INTO dbo.WalletTransactions (UserId, Tutar, IslemTipi, Aciklama)
              VALUES (@asciId, @kaporaTutari, N'KaporaAktarim', @aciklamaAsci);
            `);
        } else {
          await new sql.Request(transaction)
            .input('asciId', sql.Int, asciId)
            .input('kaporaTutari', sql.Decimal(10, 2), kaporaTutari)
            .input('aciklamaAsci', sql.NVarChar(200), `Kapora güvence (kart) · ${meal.Baslik}`)
            .query(`
              UPDATE dbo.Users SET Bakiye = Bakiye + @kaporaTutari WHERE Id = @asciId;
              INSERT INTO dbo.WalletTransactions (UserId, Tutar, IslemTipi, Aciklama)
              VALUES (@asciId, @kaporaTutari, N'KaporaAktarim', @aciklamaAsci);
            `);
        }

        const orderRes = await new sql.Request(transaction)
          .input('mealId', sql.Int, mealId)
          .input('aliciId', sql.Int, aliciId)
          .input('porsiyonAdedi', sql.Int, porsiyonAdedi)
          .input('onayKodu', sql.Char(6), onayKodu)
          .input('kaporaTutari', sql.Decimal(10, 2), kaporaTutari)
          .input('kalanTutar', sql.Decimal(10, 2), kalanTutar)
          .input('odemeYontemi', sql.NVarChar(30), odemeYontemi)
          .query(`
            INSERT INTO dbo.Orders
              (MealId, AliciId, PorsiyonAdedi, OnayKodu, Durum, KaporaTutari, KalanTutar, OdemeYontemi, OdemeDurumu)
            OUTPUT
              INSERTED.Id AS id,
              INSERTED.MealId AS mealId,
              INSERTED.AliciId AS aliciId,
              INSERTED.PorsiyonAdedi AS portions,
              INSERTED.OnayKodu AS deliveryCode,
              INSERTED.Durum AS status,
              INSERTED.KaporaTutari AS depositAmount,
              INSERTED.KalanTutar AS remainingAmount,
              INSERTED.OdemeYontemi AS paymentMethod,
              INSERTED.OdemeDurumu AS paymentStatus
            VALUES
              (@mealId, @aliciId, @porsiyonAdedi, @onayKodu, N'Beklemede',
               @kaporaTutari, @kalanTutar, @odemeYontemi, N'KaporaAlindi');
          `);

        const balRes = await new sql.Request(transaction)
          .input('aliciId', sql.Int, aliciId)
          .query(`SELECT Bakiye AS bakiye FROM dbo.Users WHERE Id = @aliciId`);

        await transaction.commit();

        const orderRow = orderRes.recordset[0];
        const bakiye = Number(balRes.recordset[0].bakiye);

        emitWalletUpdate(aliciId, bakiye);
        emitMealsChanged({ reason: 'reserved', mealId });
        emitOrderCreated({
          orderId: orderRow.id,
          mealId,
          aliciId,
          asciId,
        });

        return res.status(201).json({
          order: orderRow,
          mealTitle: meal.Baslik,
          unitPrice: meal.PorsiyonFiyati,
          total,
          depositRate: rate,
          depositAmount: kaporaTutari,
          remainingCash: kalanTutar,
          bakiye,
          message:
            'Rezervasyon oluşturuldu. Kapora güvenceye alındı. Teslimatta kalan tutarı nakit ödeyin.',
        });
      } catch (err) {
        try {
          await transaction.rollback();
        } catch {
          /* ignore */
        }
        if (err.number === 2627 || err.number === 2601) {
          lastError = err;
          continue;
        }
        throw err;
      }
    }

    throw lastError || new Error('Teslimat kodu üretilemedi.');
  } catch (err) {
    console.error('POST /api/orders', err);
    res.status(500).json({ error: 'Sipariş oluşturulamadı.', detail: err.message });
  }
});

/**
 * GET /api/orders/mine — alıcının siparişleri
 */
router.get('/mine', requireAuth, async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('aliciId', sql.Int, req.user.id)
      .query(`
        SELECT
          o.Id AS id,
          o.MealId AS mealId,
          o.PorsiyonAdedi AS portions,
          o.OnayKodu AS deliveryCode,
          o.Durum AS status,
          o.KaporaTutari AS depositAmount,
          o.KalanTutar AS remainingAmount,
          o.OdemeYontemi AS paymentMethod,
          o.OdemeDurumu AS paymentStatus,
          m.Baslik AS mealTitle,
          m.GorselUrl AS imageUrl,
          m.PorsiyonFiyati AS unitPrice,
          m.Il AS il,
          m.Ilce AS ilce,
          m.Mahalle AS mahalle,
          m.Sokak AS sokak,
          m.BinaNo AS binaNo,
          m.Kat AS kat,
          m.DaireNo AS daireNo,
          m.AcikAdres AS acikAdres,
          m.Enlem AS lat,
          m.Boylam AS lng,
          chef.Id AS chefId,
          chef.AdSoyad AS chefName,
          chef.Telefon AS chefPhone,
          chef.OrtalamaPuan AS chefRating,
          chef.ToplamDegerlendirme AS chefReviewCount,
          CASE WHEN rv.Id IS NULL THEN 0 ELSE 1 END AS reviewed
        FROM dbo.Orders o
        INNER JOIN dbo.Meals m ON m.Id = o.MealId
        INNER JOIN dbo.Users chef ON chef.Id = m.AsciId
        LEFT JOIN dbo.Reviews rv ON rv.OrderId = o.Id
        WHERE o.AliciId = @aliciId
        ORDER BY o.Id DESC;
      `);

    res.json({ orders: result.recordset });
  } catch (err) {
    console.error('GET /api/orders/mine', err);
    res.status(500).json({ error: 'Siparişler getirilemedi.', detail: err.message });
  }
});

/**
 * GET /api/orders/selling — aşçının ilanlarına gelen rezervasyonlar
 */
router.get('/selling', requireAuth, async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('asciId', sql.Int, req.user.id)
      .query(`
        SELECT
          o.Id AS id,
          o.MealId AS mealId,
          o.PorsiyonAdedi AS portions,
          o.Durum AS status,
          o.KaporaTutari AS depositAmount,
          o.KalanTutar AS remainingAmount,
          o.OdemeYontemi AS paymentMethod,
          m.Baslik AS mealTitle,
          m.GorselUrl AS imageUrl,
          buyer.Id AS buyerId,
          buyer.AdSoyad AS buyerName,
          buyer.Telefon AS buyerPhone
        FROM dbo.Orders o
        INNER JOIN dbo.Meals m ON m.Id = o.MealId
        INNER JOIN dbo.Users buyer ON buyer.Id = o.AliciId
        WHERE m.AsciId = @asciId
        ORDER BY o.Id DESC;
      `);

    res.json({ orders: result.recordset });
  } catch (err) {
    console.error('GET /api/orders/selling', err);
    res.status(500).json({ error: 'Satış siparişleri getirilemedi.', detail: err.message });
  }
});

/**
 * POST /api/orders/verify
 * Body: { orderId, code }
 * Aşçı doğru teslimat kodunu girince Durum = TeslimEdildi
 */
router.post('/verify', requireAuth, requireVerified, async (req, res) => {
  const orderId = Number(req.body?.orderId);
  const code = String(req.body?.code || req.body?.onayKodu || '').replace(/\D/g, '');

  if (!orderId || Number.isNaN(orderId)) {
    return res.status(400).json({ error: 'orderId zorunludur.' });
  }
  if (!/^\d{6}$/.test(code)) {
    return res.status(400).json({ error: '6 haneli teslimat kodu girin.' });
  }

  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    const lockRes = await new sql.Request(transaction)
      .input('orderId', sql.Int, orderId)
      .input('asciId', sql.Int, req.user.id)
      .query(`
        SELECT
          o.Id, o.AliciId, o.OnayKodu, o.Durum, o.MealId,
          m.AsciId, m.Baslik
        FROM dbo.Orders o WITH (UPDLOCK, ROWLOCK)
        INNER JOIN dbo.Meals m ON m.Id = o.MealId
        WHERE o.Id = @orderId AND m.AsciId = @asciId;
      `);

    const order = lockRes.recordset[0];
    if (!order) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Sipariş bulunamadı veya bu ilan size ait değil.' });
    }
    if (order.Durum === 'TeslimEdildi') {
      await transaction.rollback();
      return res.status(409).json({ error: 'Bu sipariş zaten teslim edilmiş.' });
    }
    if (['Iptal', 'AliciGelmedi', 'AsciIptal'].includes(order.Durum)) {
      await transaction.rollback();
      return res.status(409).json({ error: 'Kapanmış sipariş teslim edilemez.' });
    }
    if (String(order.OnayKodu).trim() !== code) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Teslimat kodu hatalı.' });
    }

    await new sql.Request(transaction)
      .input('orderId', sql.Int, orderId)
      .query(`
        UPDATE dbo.Orders
        SET Durum = N'TeslimEdildi', OdemeDurumu = N'Tamamlandi'
        WHERE Id = @orderId;
      `);

    await transaction.commit();

    const payload = {
      orderId,
      mealId: order.MealId,
      mealTitle: order.Baslik,
      aliciId: Number(order.AliciId),
      asciId: Number(order.AsciId),
      status: 'TeslimEdildi',
    };

    emitOrderDelivered(payload);

    res.json({
      message: 'Sipariş başarıyla teslim edildi!',
      order: payload,
    });
  } catch (err) {
    try {
      await transaction.rollback();
    } catch {
      /* ignore */
    }
    console.error('POST /api/orders/verify', err);
    res.status(500).json({ error: 'Teslimat doğrulanamadı.', detail: err.message });
  }
});

const OPEN_STATUSES = new Set(['Beklemede', 'Onaylandi']);

/**
 * POST /api/orders/resolve
 * Body: { orderId, action: 'AliciGelmedi' | 'AsciIptal' }
 * AliciGelmedi: kapora aşçıda kalır, porsiyon ilana döner.
 * AsciIptal: kapora alıcıya tam iade edilir, porsiyon ilana döner.
 */
router.post('/resolve', requireAuth, requireVerified, async (req, res) => {
  const orderId = Number(req.body?.orderId);
  const action = String(req.body?.action || '');

  if (!orderId || Number.isNaN(orderId)) {
    return res.status(400).json({ error: 'orderId zorunludur.' });
  }
  if (!['AliciGelmedi', 'AsciIptal'].includes(action)) {
    return res.status(400).json({ error: 'action AliciGelmedi veya AsciIptal olmalıdır.' });
  }

  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    const lockRes = await new sql.Request(transaction)
      .input('orderId', sql.Int, orderId)
      .input('asciId', sql.Int, req.user.id)
      .query(`
        SELECT
          o.Id, o.AliciId, o.Durum, o.MealId, o.PorsiyonAdedi,
          o.KaporaTutari, o.OdemeYontemi,
          m.AsciId, m.Baslik
        FROM dbo.Orders o WITH (UPDLOCK, ROWLOCK)
        INNER JOIN dbo.Meals m ON m.Id = o.MealId
        WHERE o.Id = @orderId AND m.AsciId = @asciId;
      `);

    const order = lockRes.recordset[0];
    if (!order) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Sipariş bulunamadı veya bu ilan size ait değil.' });
    }
    if (!OPEN_STATUSES.has(order.Durum)) {
      await transaction.rollback();
      return res.status(409).json({ error: 'Bu sipariş artık kapatılamaz.' });
    }

    const deposit = Number(order.KaporaTutari || 0);
    const aliciId = Number(order.AliciId);
    const asciId = Number(order.AsciId);

    await new sql.Request(transaction)
      .input('mealId', sql.Int, order.MealId)
      .query(`
        SELECT Id FROM dbo.Meals WITH (UPDLOCK, ROWLOCK) WHERE Id = @mealId
      `);

    if (action === 'AsciIptal' && deposit > 0) {
      const cookBal = await new sql.Request(transaction)
        .input('asciId', sql.Int, asciId)
        .query(`
          SELECT Bakiye FROM dbo.Users WITH (UPDLOCK, ROWLOCK) WHERE Id = @asciId
        `);
      await new sql.Request(transaction)
        .input('aliciId', sql.Int, aliciId)
        .query(`
          SELECT Id FROM dbo.Users WITH (UPDLOCK, ROWLOCK) WHERE Id = @aliciId
        `);

      if (Number(cookBal.recordset[0]?.Bakiye || 0) < deposit) {
        await transaction.rollback();
        return res.status(409).json({
          error: 'Kapora iadesi için aşçı bakiyesi yetersiz.',
        });
      }

      await new sql.Request(transaction)
        .input('aliciId', sql.Int, aliciId)
        .input('asciId', sql.Int, asciId)
        .input('deposit', sql.Decimal(10, 2), deposit)
        .input('aciklamaAlici', sql.NVarChar(200), `Kapora iadesi · ${order.Baslik}`)
        .input('aciklamaAsci', sql.NVarChar(200), `Kapora iade kesintisi · ${order.Baslik}`)
        .query(`
          UPDATE dbo.Users SET Bakiye = Bakiye - @deposit WHERE Id = @asciId;
          UPDATE dbo.Users SET Bakiye = Bakiye + @deposit WHERE Id = @aliciId;

          INSERT INTO dbo.WalletTransactions (UserId, Tutar, IslemTipi, Aciklama)
          VALUES (@asciId, -@deposit, N'KaporaKesinti', @aciklamaAsci);

          INSERT INTO dbo.WalletTransactions (UserId, Tutar, IslemTipi, Aciklama)
          VALUES (@aliciId, @deposit, N'KaporaIade', @aciklamaAlici);
        `);
    }

    await new sql.Request(transaction)
      .input('mealId', sql.Int, order.MealId)
      .input('portions', sql.Int, order.PorsiyonAdedi)
      .query(`
        UPDATE dbo.Meals
        SET
          KalanPorsiyon = KalanPorsiyon + @portions,
          AktifMi = 1
        WHERE Id = @mealId;
      `);

    const paymentStatus = action === 'AsciIptal' ? 'IadeEdildi' : 'KaporaAsciyaKaldi';
    await new sql.Request(transaction)
      .input('orderId', sql.Int, orderId)
      .input('durum', sql.NVarChar(30), action)
      .input('odemeDurumu', sql.NVarChar(30), paymentStatus)
      .query(`
        UPDATE dbo.Orders
        SET Durum = @durum, OdemeDurumu = @odemeDurumu
        WHERE Id = @orderId;
      `);

    const balances = await new sql.Request(transaction)
      .input('aliciId', sql.Int, aliciId)
      .input('asciId', sql.Int, asciId)
      .query(`
        SELECT Id AS id, Bakiye AS bakiye FROM dbo.Users
        WHERE Id IN (@aliciId, @asciId);
      `);

    await transaction.commit();

    for (const row of balances.recordset) {
      emitWalletUpdate(row.id, Number(row.bakiye));
    }
    emitMealsChanged({ reason: action, mealId: order.MealId });
    emitOrderChanged({
      orderId,
      mealId: order.MealId,
      mealTitle: order.Baslik,
      aliciId,
      asciId,
      status: action,
      depositAmount: deposit,
    });

    const message = action === 'AsciIptal'
      ? 'İptal edildi. Kapora alıcının cüzdanına iade edildi.'
      : 'Alıcı gelmedi olarak işaretlendi. Kapora aşçıda kaldı, porsiyon yeniden satışa açıldı.';

    res.json({ message, status: action, depositAmount: deposit });
  } catch (err) {
    try {
      await transaction.rollback();
    } catch {
      /* ignore */
    }
    console.error('POST /api/orders/resolve', err);
    res.status(500).json({ error: 'Sipariş kapatılamadı.', detail: err.message });
  }
});

module.exports = router;
