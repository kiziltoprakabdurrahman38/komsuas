const express = require('express');
const { sql, getPool } = require('../db');
const { requireAuth, requireVerified } = require('../middleware/auth');
const { emitMealsChanged, emitRatingUpdate } = require('../socket');

const router = express.Router();

async function refreshAverages(transaction, mealId, cookId) {
  const mealStats = await new sql.Request(transaction)
    .input('mealId', sql.Int, mealId)
    .query(`
      SELECT
        CAST(AVG(CAST(Puan AS DECIMAL(6,2))) AS DECIMAL(2,1)) AS ortalama,
        COUNT(*) AS adet
      FROM dbo.Reviews
      WHERE MealId = @mealId;
    `);

  const cookStats = await new sql.Request(transaction)
    .input('cookId', sql.Int, cookId)
    .query(`
      SELECT
        CAST(AVG(CAST(Puan AS DECIMAL(6,2))) AS DECIMAL(2,1)) AS ortalama,
        COUNT(*) AS adet
      FROM dbo.Reviews
      WHERE CookId = @cookId;
    `);

  const meal = mealStats.recordset[0];
  const cook = cookStats.recordset[0];

  await new sql.Request(transaction)
    .input('mealId', sql.Int, mealId)
    .input('ortalama', sql.Decimal(2, 1), Number(meal.ortalama))
    .input('adet', sql.Int, Number(meal.adet))
    .query(`
      UPDATE dbo.Meals
      SET OrtalamaPuan = @ortalama, ToplamDegerlendirme = @adet
      WHERE Id = @mealId;
    `);

  await new sql.Request(transaction)
    .input('cookId', sql.Int, cookId)
    .input('ortalama', sql.Decimal(2, 1), Number(cook.ortalama))
    .input('adet', sql.Int, Number(cook.adet))
    .query(`
      UPDATE dbo.Users
      SET OrtalamaPuan = @ortalama, ToplamDegerlendirme = @adet
      WHERE Id = @cookId;
    `);

  return {
    mealRating: Number(meal.ortalama),
    mealReviewCount: Number(meal.adet),
    cookRating: Number(cook.ortalama),
    cookReviewCount: Number(cook.adet),
  };
}

router.post('/', requireAuth, requireVerified, async (req, res) => {
  const orderId = Number(req.body?.orderId);
  const puan = Number(req.body?.puan);
  const yorum = req.body?.yorum != null ? String(req.body.yorum).trim() : '';

  if (!orderId || Number.isNaN(orderId)) {
    return res.status(400).json({ error: 'orderId zorunludur.' });
  }
  if (!Number.isInteger(puan) || puan < 1 || puan > 5) {
    return res.status(400).json({ error: 'Puan 1 ile 5 arasında tam sayı olmalıdır.' });
  }
  if (yorum.length > 500) {
    return res.status(400).json({ error: 'Yorum en fazla 500 karakter olabilir.' });
  }

  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    const orderRes = await new sql.Request(transaction)
      .input('orderId', sql.Int, orderId)
      .input('buyerId', sql.Int, req.user.id)
      .query(`
        SELECT
          o.Id, o.MealId, o.AliciId, o.Durum,
          m.AsciId, m.Baslik
        FROM dbo.Orders o WITH (UPDLOCK, ROWLOCK)
        INNER JOIN dbo.Meals m ON m.Id = o.MealId
        WHERE o.Id = @orderId AND o.AliciId = @buyerId;
      `);

    const order = orderRes.recordset[0];
    if (!order) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Sipariş bulunamadı.' });
    }
    if (order.Durum !== 'TeslimEdildi') {
      await transaction.rollback();
      return res.status(409).json({ error: 'Yalnızca teslim edilmiş siparişler değerlendirilebilir.' });
    }

    const existing = await new sql.Request(transaction)
      .input('orderId', sql.Int, orderId)
      .query(`SELECT Id FROM dbo.Reviews WITH (UPDLOCK, ROWLOCK) WHERE OrderId = @orderId`);

    if (existing.recordset[0]) {
      await transaction.rollback();
      return res.status(409).json({ error: 'Bu sipariş zaten değerlendirildi.' });
    }

    const inserted = await new sql.Request(transaction)
      .input('orderId', sql.Int, orderId)
      .input('mealId', sql.Int, order.MealId)
      .input('buyerId', sql.Int, req.user.id)
      .input('cookId', sql.Int, order.AsciId)
      .input('puan', sql.Int, puan)
      .input('yorum', sql.NVarChar(500), yorum || null)
      .query(`
        INSERT INTO dbo.Reviews (OrderId, MealId, BuyerId, CookId, Puan, Yorum)
        OUTPUT
          INSERTED.Id AS id,
          INSERTED.OrderId AS orderId,
          INSERTED.MealId AS mealId,
          INSERTED.Puan AS puan,
          INSERTED.Yorum AS yorum,
          INSERTED.Tarih AS tarih
        VALUES (@orderId, @mealId, @buyerId, @cookId, @puan, @yorum);
      `);

    const averages = await refreshAverages(transaction, order.MealId, Number(order.AsciId));
    await transaction.commit();

    emitMealsChanged({ reason: 'reviewed', mealId: order.MealId });
    emitRatingUpdate({
      userId: Number(order.AsciId),
      ortalamaPuan: averages.cookRating,
      toplamDegerlendirme: averages.cookReviewCount,
    });

    res.status(201).json({
      review: inserted.recordset[0],
      mealTitle: order.Baslik,
      ...averages,
    });
  } catch (err) {
    try {
      await transaction.rollback();
    } catch {
      /* ignore */
    }
    console.error('POST /api/reviews', err);
    res.status(500).json({ error: 'Değerlendirme kaydedilemedi.', detail: err.message });
  }
});

module.exports = router;
