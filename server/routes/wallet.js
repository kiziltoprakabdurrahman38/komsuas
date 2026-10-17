const express = require('express');
const { sql, getPool } = require('../db');
const { requireAuth, requireVerified } = require('../middleware/auth');
const { emitWalletUpdate } = require('../socket');

const router = express.Router();

router.get('/me', requireAuth, async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('id', sql.Int, req.user.id)
      .query(`SELECT Bakiye AS bakiye, IsVerified AS isVerified FROM dbo.Users WHERE Id = @id`);

    if (!result.recordset.length) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    }

    res.json({
      bakiye: Number(result.recordset[0].bakiye),
      isVerified: Boolean(result.recordset[0].isVerified),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/wallet/topup
 * Sahte kart ile bakiye yükleme simülasyonu
 */
router.post('/topup', requireAuth, requireVerified, async (req, res) => {
  const amount = Number(req.body?.amount ?? req.body?.tutar);
  const cardNumber = String(req.body?.cardNumber || '').replace(/\s/g, '');
  const expiry = String(req.body?.expiry || req.body?.skt || '');
  const cvv = String(req.body?.cvv || '');

  if (!amount || amount < 10 || amount > 5000) {
    return res.status(400).json({ error: 'Yüklenecek tutar 10–5000 TL arası olmalıdır.' });
  }
  if (!/^\d{16}$/.test(cardNumber)) {
    return res.status(400).json({ error: 'Kart numarası 16 haneli olmalıdır.' });
  }
  if (!/^\d{2}\/\d{2}$/.test(expiry)) {
    return res.status(400).json({ error: 'SKT formatı AA/YY olmalıdır.' });
  }
  if (!/^\d{3,4}$/.test(cvv)) {
    return res.status(400).json({ error: 'CVV geçersiz.' });
  }

  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    const lockReq = new sql.Request(transaction);
    lockReq.input('id', sql.Int, req.user.id);
    const userRes = await lockReq.query(`
      SELECT Id, Bakiye FROM dbo.Users WITH (UPDLOCK, ROWLOCK) WHERE Id = @id
    `);
    if (!userRes.recordset.length) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    }

    const writeReq = new sql.Request(transaction);
    writeReq.input('id', sql.Int, req.user.id);
    writeReq.input('tutar', sql.Decimal(10, 2), amount);
    writeReq.input(
      'aciklama',
      sql.NVarChar(200),
      `Kart simülasyonu ile ${amount.toFixed(2)} TL yükleme`,
    );

    const updated = await writeReq.query(`
      UPDATE dbo.Users
      SET Bakiye = Bakiye + @tutar
      OUTPUT INSERTED.Bakiye AS bakiye
      WHERE Id = @id;

      INSERT INTO dbo.WalletTransactions (UserId, Tutar, IslemTipi, Aciklama)
      VALUES (@id, @tutar, N'BakiyeYukleme', @aciklama);
    `);

    await transaction.commit();

    const bakiye = Number(updated.recordset[0].bakiye);
    emitWalletUpdate(req.user.id, bakiye);

    res.json({
      message: 'Bakiye yüklendi.',
      bakiye,
      loaded: amount,
    });
  } catch (err) {
    try {
      await transaction.rollback();
    } catch {
      /* ignore */
    }
    console.error('POST /api/wallet/topup', err);
    res.status(500).json({ error: 'Bakiye yüklenemedi.', detail: err.message });
  }
});

module.exports = router;
