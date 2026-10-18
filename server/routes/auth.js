const express = require('express');
const { sql, getPool } = require('../db');
const { isValidTcKimlikNo, normalizeTc } = require('../utils/tcKimlik');
const { hashPassword, verifyPassword } = require('../utils/password');
const { signUserToken, requireAuth } = require('../middleware/auth');
const { emitWalletUpdate } = require('../socket');

const router = express.Router();

const GENDER_VALUES = new Set(['Kadın', 'Erkek', 'Belirtmek İstemiyorum']);
const DEMO_TC = '1';
const DEMO_HASH = '6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b';

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function mapUser(row) {
  return {
    id: Number(row.id),
    adSoyad: row.adSoyad,
    tcKimlikNo: row.tcKimlikNo != null ? String(row.tcKimlikNo).trim() : null,
    dogumTarihi: row.dogumTarihi,
    cinsiyet: row.cinsiyet,
    telefon: row.telefon,
    kayitTarihi: row.kayitTarihi,
    bakiye: Number(row.bakiye ?? 0),
    isVerified: Boolean(row.isVerified),
    verified: Boolean(row.isVerified),
    ortalamaPuan: row.ortalamaPuan == null ? 5 : Number(row.ortalamaPuan),
    toplamDegerlendirme: Number(row.toplamDegerlendirme ?? 0),
    email: row.email || null,
    bolge: row.bolge || null,
  };
}

const USER_SELECT = `
  SELECT
    Id AS id,
    AdSoyad AS adSoyad,
    TcKimlikNo AS tcKimlikNo,
    DogumTarihi AS dogumTarihi,
    Cinsiyet AS cinsiyet,
    Telefon AS telefon,
    KayitTarihi AS kayitTarihi,
    Bakiye AS bakiye,
    IsVerified AS isVerified,
    OrtalamaPuan AS ortalamaPuan,
    ToplamDegerlendirme AS toplamDegerlendirme,
    Email AS email,
    Bolge AS bolge,
    SifreHash AS sifreHash
  FROM dbo.Users
`;

router.post('/register', async (req, res) => {
  try {
    const {
      ad,
      soyad,
      adSoyad: adSoyadRaw,
      tcKimlikNo,
      dogumTarihi,
      cinsiyet,
      telefon,
      sifre,
      password,
    } = req.body || {};

    const adSoyad = String(adSoyadRaw || `${ad || ''} ${soyad || ''}`)
      .trim()
      .replace(/\s+/g, ' ');
    const tc = normalizeTc(tcKimlikNo);
    const phone = String(telefon || '').trim();
    const plainPassword = String(sifre || password || '');

    if (!adSoyad || adSoyad.length < 3) {
      return res.status(400).json({ error: 'Ad Soyad gerekli.' });
    }
    if (!isValidTcKimlikNo(tc)) {
      return res.status(400).json({ error: 'Geçersiz T.C. Kimlik Numarası.' });
    }
    if (!dogumTarihi) {
      return res.status(400).json({ error: 'Doğum tarihi gerekli.' });
    }
    if (!GENDER_VALUES.has(cinsiyet)) {
      return res.status(400).json({
        error: 'Cinsiyet Kadın, Erkek veya Belirtmek İstemiyorum olmalıdır.',
      });
    }
    if (!phone || phone.length < 10) {
      return res.status(400).json({ error: 'Geçerli bir telefon numarası girin.' });
    }
    if (plainPassword.length < 1) {
      return res.status(400).json({ error: 'Şifre gerekli.' });
    }

    const birth = new Date(dogumTarihi);
    if (Number.isNaN(birth.getTime()) || birth > new Date()) {
      return res.status(400).json({ error: 'Doğum tarihi geçersiz.' });
    }

    const pool = await getPool();
    const exists = await pool
      .request()
      .input('tc', sql.NVarChar(11), tc)
      .input('telefon', sql.NVarChar(20), phone)
      .query(`
        SELECT TOP 1 Id, TcKimlikNo, Telefon
        FROM dbo.Users
        WHERE LTRIM(RTRIM(TcKimlikNo)) = @tc OR Telefon = @telefon
      `);

    if (exists.recordset.length) {
      const hit = exists.recordset[0];
      if (String(hit.TcKimlikNo).trim() === tc) {
        return res.status(409).json({ error: 'Bu T.C. Kimlik No ile kayıt zaten var.' });
      }
      return res.status(409).json({ error: 'Bu telefon numarası ile kayıt zaten var.' });
    }

    const otp = generateOtp();
    const sifreHash = hashPassword(plainPassword);

    const insert = await pool
      .request()
      .input('adSoyad', sql.NVarChar(100), adSoyad)
      .input('tc', sql.NVarChar(11), tc)
      .input('dogumTarihi', sql.Date, birth)
      .input('cinsiyet', sql.NVarChar(30), cinsiyet)
      .input('telefon', sql.NVarChar(20), phone)
      .input('otp', sql.VarChar(6), otp)
      .input('sifreHash', sql.Char(64), sifreHash)
      .query(`
        INSERT INTO dbo.Users
          (AdSoyad, TcKimlikNo, DogumTarihi, Cinsiyet, Telefon, Rol, Ad, Bakiye, IsVerified, VerificationCode, SifreHash)
        OUTPUT
          INSERTED.Id AS id,
          INSERTED.AdSoyad AS adSoyad,
          INSERTED.TcKimlikNo AS tcKimlikNo,
          INSERTED.DogumTarihi AS dogumTarihi,
          INSERTED.Cinsiyet AS cinsiyet,
          INSERTED.Telefon AS telefon,
          INSERTED.KayitTarihi AS kayitTarihi,
          INSERTED.Bakiye AS bakiye,
          INSERTED.IsVerified AS isVerified
        VALUES
          (@adSoyad, @tc, @dogumTarihi, @cinsiyet, @telefon, N'Kullanici', @adSoyad, 500.00, 0, @otp, @sifreHash);
      `);

    let row = insert.recordset?.[0];
    if (!row) {
      const again = await pool
        .request()
        .input('tc', sql.NVarChar(11), tc)
        .query(`${USER_SELECT} WHERE LTRIM(RTRIM(TcKimlikNo)) = @tc`);
      row = again.recordset[0];
    }

    if (row?.id) {
      await pool
        .request()
        .input('uid', sql.Int, Number(row.id))
        .query(`
          INSERT INTO dbo.WalletTransactions (UserId, Tutar, IslemTipi, Aciklama)
          VALUES (@uid, 500.00, N'HosGeldin', N'Hos geldin bakiyesi');
        `);
    }

    const user = mapUser(row);
    const token = signUserToken(user);
    emitWalletUpdate(user.id, user.bakiye);

    res.status(201).json({
      message: 'Kayıt başarılı. SMS doğrulama kodunuz gönderildi (demo).',
      token,
      user,
      demoSmsCode: otp,
    });
  } catch (err) {
    console.error('POST /api/auth/register', err);
    res.status(500).json({ error: 'Kayıt oluşturulamadı.', detail: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const rawIdentifier = String(
      req.body?.identifier ||
        req.body?.tcKimlikNo ||
        req.body?.tc ||
        req.body?.telefon ||
        req.body?.phone ||
        '',
    ).trim();
    const plainPassword = String(req.body?.sifre || req.body?.password || '');

    if (!rawIdentifier) {
      return res.status(400).json({
        error: 'T.C. Kimlik No veya telefon ile giriş yapın.',
      });
    }
    if (!plainPassword) {
      return res.status(400).json({ error: 'Şifre gerekli.' });
    }

    const digits = rawIdentifier.replace(/\D/g, '');
    const isDemoLogin = rawIdentifier === DEMO_TC || digits === DEMO_TC;

    // Demo: TC/kullanıcı '1' + şifre '1'
    if (isDemoLogin) {
      if (!verifyPassword(plainPassword, DEMO_HASH) && plainPassword !== '1') {
        return res.status(401).json({ error: 'Şifre hatalı.' });
      }
    } else if (digits.length === 11 && !isValidTcKimlikNo(digits) && digits !== DEMO_TC) {
      // telefon da digits olabilir; 11 hane ve TC formatı değilse yine telefon dene
    }

    const pool = await getPool();
    let result;

    if (isDemoLogin) {
      result = await pool
        .request()
        .input('tc', sql.NVarChar(11), DEMO_TC)
        .query(`${USER_SELECT} WHERE LTRIM(RTRIM(TcKimlikNo)) = @tc`);
    } else if (digits.length === 11 && isValidTcKimlikNo(digits)) {
      result = await pool
        .request()
        .input('tc', sql.NVarChar(11), digits)
        .query(`${USER_SELECT} WHERE LTRIM(RTRIM(TcKimlikNo)) = @tc`);
    } else {
      result = await pool
        .request()
        .input('telefon', sql.NVarChar(20), rawIdentifier)
        .query(`${USER_SELECT} WHERE Telefon = @telefon`);
    }

    if (!result.recordset.length) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı. Önce kayıt olun.' });
    }

    const row = result.recordset[0];
    if (!isDemoLogin && !verifyPassword(plainPassword, row.sifreHash)) {
      return res.status(401).json({ error: 'Şifre hatalı.' });
    }
    // Demo için hash yoksa bile '1' kabul; hash varsa doğrula
    if (isDemoLogin && row.sifreHash && !verifyPassword(plainPassword, row.sifreHash) && plainPassword !== '1') {
      return res.status(401).json({ error: 'Şifre hatalı.' });
    }

    const user = mapUser(row);
    const token = signUserToken(user);

    let demoSmsCode = null;
    if (!user.isVerified) {
      const otp = generateOtp();
      await pool
        .request()
        .input('id', sql.Int, user.id)
        .input('otp', sql.VarChar(6), otp)
        .query(`UPDATE dbo.Users SET VerificationCode = @otp WHERE Id = @id`);
      demoSmsCode = otp;
    }

    res.json({
      message: 'Giriş başarılı.',
      token,
      user,
      ...(demoSmsCode ? { demoSmsCode } : {}),
    });
  } catch (err) {
    console.error('POST /api/auth/login', err);
    res.status(500).json({ error: 'Giriş yapılamadı.', detail: err.message });
  }
});

/** Tek tık demo giriş */
router.post('/demo-login', async (_req, res) => {
  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('tc', sql.NVarChar(11), DEMO_TC)
      .query(`${USER_SELECT} WHERE LTRIM(RTRIM(TcKimlikNo)) = @tc`);

    if (!result.recordset.length) {
      return res.status(404).json({ error: 'Demo kullanıcı bulunamadı. Migrasyonu çalıştırın.' });
    }

    const user = mapUser(result.recordset[0]);
    const token = signUserToken(user);
    res.json({
      message: 'Demo giriş başarılı.',
      token,
      user,
    });
  } catch (err) {
    console.error('POST /api/auth/demo-login', err);
    res.status(500).json({ error: 'Demo giriş başarısız.', detail: err.message });
  }
});

router.post('/verify-otp', requireAuth, async (req, res) => {
  try {
    const code = String(req.body?.code || req.body?.otp || '').replace(/\D/g, '');
    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: '6 haneli doğrulama kodu girin.' });
    }

    const pool = await getPool();
    const check = await pool
      .request()
      .input('id', sql.Int, req.user.id)
      .query(`
        SELECT Id, VerificationCode, IsVerified, Bakiye, AdSoyad, Telefon,
               TcKimlikNo, DogumTarihi, Cinsiyet, KayitTarihi
        FROM dbo.Users WHERE Id = @id
      `);

    const row = check.recordset[0];
    if (!row) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    if (row.IsVerified) {
      const user = mapUser({
        id: row.Id,
        adSoyad: row.AdSoyad,
        tcKimlikNo: row.TcKimlikNo,
        dogumTarihi: row.DogumTarihi,
        cinsiyet: row.Cinsiyet,
        telefon: row.Telefon,
        kayitTarihi: row.KayitTarihi,
        bakiye: row.Bakiye,
        isVerified: true,
      });
      return res.json({
        message: 'Hesap zaten doğrulanmış.',
        token: signUserToken(user),
        user,
      });
    }

    if (String(row.VerificationCode) !== code) {
      return res.status(400).json({ error: 'Doğrulama kodu hatalı.' });
    }

    await pool
      .request()
      .input('id', sql.Int, req.user.id)
      .query(`
        UPDATE dbo.Users
        SET IsVerified = 1, VerificationCode = NULL
        WHERE Id = @id
      `);

    const refreshed = await pool
      .request()
      .input('id', sql.Int, req.user.id)
      .query(`${USER_SELECT} WHERE Id = @id`);

    const user = mapUser(refreshed.recordset[0]);
    res.json({
      message: 'Hesap doğrulandı.',
      token: signUserToken(user),
      user,
    });
  } catch (err) {
    console.error('POST /api/auth/verify-otp', err);
    res.status(500).json({ error: 'Doğrulama başarısız.', detail: err.message });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('id', sql.Int, req.user.id)
      .query(`${USER_SELECT} WHERE Id = @id`);

    if (!result.recordset.length) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    }

    res.json({ user: mapUser(result.recordset[0]) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/profile', requireAuth, async (req, res) => {
  try {
    const ad = String(req.body?.ad || '').trim();
    const soyad = String(req.body?.soyad || '').trim();
    const adSoyad = `${ad} ${soyad}`.trim().replace(/\s+/g, ' ');
    const telefon = String(req.body?.telefon || '').trim();
    const email = String(req.body?.email || '').trim();
    const bolge = String(req.body?.bolge || '').trim();

    if (adSoyad.length < 3) {
      return res.status(400).json({ error: 'Ad ve soyad gerekli.' });
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'E-posta formatı geçersiz.' });
    }

    const pool = await getPool();
    if (telefon) {
      const clash = await pool
        .request()
        .input('telefon', sql.NVarChar(20), telefon)
        .input('id', sql.Int, req.user.id)
        .query(`
          SELECT Id FROM dbo.Users
          WHERE Telefon = @telefon AND Id <> @id
        `);
      if (clash.recordset.length) {
        return res.status(409).json({ error: 'Bu telefon başka bir hesapta kayıtlı.' });
      }
    }

    await pool
      .request()
      .input('id', sql.Int, req.user.id)
      .input('adSoyad', sql.NVarChar(100), adSoyad)
      .input('ad', sql.NVarChar(120), adSoyad)
      .input('telefon', sql.NVarChar(20), telefon || null)
      .input('email', sql.NVarChar(120), email || null)
      .input('bolge', sql.NVarChar(80), bolge || null)
      .query(`
        UPDATE dbo.Users
        SET
          AdSoyad = @adSoyad,
          Ad = @ad,
          Telefon = @telefon,
          Email = @email,
          Bolge = @bolge
        WHERE Id = @id
      `);

    const refreshed = await pool
      .request()
      .input('id', sql.Int, req.user.id)
      .query(`${USER_SELECT} WHERE Id = @id`);

    res.json({ message: 'Profil güncellendi.', user: mapUser(refreshed.recordset[0]) });
  } catch (err) {
    console.error('PATCH /api/auth/profile', err);
    res.status(500).json({ error: 'Profil güncellenemedi.', detail: err.message });
  }
});

router.post('/password', requireAuth, async (req, res) => {
  try {
    const current = String(req.body?.currentPassword || req.body?.mevcutSifre || '');
    const next = String(req.body?.newPassword || req.body?.yeniSifre || '');
    const again = String(req.body?.confirmPassword || req.body?.yeniSifreTekrar || '');

    if (!current || !next) {
      return res.status(400).json({ error: 'Mevcut şifre ve yeni şifre gerekli.' });
    }
    if (next.length < 4) {
      return res.status(400).json({ error: 'Yeni şifre en az 4 karakter olmalı.' });
    }
    if (next !== again) {
      return res.status(400).json({ error: 'Yeni şifre tekrarı eşleşmiyor.' });
    }

    const pool = await getPool();
    const found = await pool
      .request()
      .input('id', sql.Int, req.user.id)
      .query(`${USER_SELECT} WHERE Id = @id`);
    const row = found.recordset[0];
    if (!row) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    if (!verifyPassword(current, row.sifreHash)) {
      return res.status(401).json({ error: 'Mevcut şifre hatalı.' });
    }

    await pool
      .request()
      .input('id', sql.Int, req.user.id)
      .input('hash', sql.Char(64), hashPassword(next))
      .query(`UPDATE dbo.Users SET SifreHash = @hash WHERE Id = @id`);

    res.json({ message: 'Şifre güncellendi.' });
  } catch (err) {
    console.error('POST /api/auth/password', err);
    res.status(500).json({ error: 'Şifre güncellenemedi.', detail: err.message });
  }
});

module.exports = router;
