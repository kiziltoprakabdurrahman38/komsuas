const express = require('express');
const { sql, getPool } = require('../db');
const { requireAuth, requireVerified } = require('../middleware/auth');
const { emitMealsChanged } = require('../socket');

const router = express.Router();

const MAX_RADIUS_METERS = 30000;

function buildAcikAdres(parts) {
  const {
    il,
    ilce,
    mahalle,
    sokak,
    binaNo,
    kat,
    daireNo,
    acikAdres,
  } = parts;

  if (acikAdres && String(acikAdres).trim()) return String(acikAdres).trim();

  return [
    mahalle,
    sokak,
    binaNo ? `No:${binaNo}` : null,
    kat ? `Kat:${kat}` : null,
    daireNo ? `Daire:${daireNo}` : null,
    ilce,
    il,
  ]
    .map((x) => (x == null ? '' : String(x).trim()))
    .filter(Boolean)
    .join(', ');
}

router.get('/', async (req, res) => {
  try {
    if (req.query.lat == null || req.query.lng == null) {
      return res.status(400).json({
        error: 'Yakınınızdaki yemekleri görebilmek için konum izni vermelisiniz.',
        code: 'LOCATION_REQUIRED',
      });
    }

    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({ error: 'Geçerli lat ve lng gerekli.' });
    }

    const pool = await getPool();
    const result = await pool
      .request()
      .input('lat', sql.Float, lat)
      .input('lng', sql.Float, lng)
      .input('radiusMeters', sql.Float, MAX_RADIUS_METERS)
      .query(`
        DECLARE @UserPoint GEOGRAPHY = geography::Point(@lat, @lng, 4326);

        SELECT
          m.Id              AS id,
          m.Baslik          AS title,
          m.Aciklama        AS description,
          m.PorsiyonFiyati  AS price,
          m.KalanPorsiyon   AS portions,
          m.Enlem           AS lat,
          m.Boylam          AS lng,
          m.AktifMi         AS isActive,
          m.EklenmeTarihi   AS createdAt,
          m.GorselUrl       AS imageUrl,
          m.KaporaOrani     AS depositRate,
          m.Il              AS il,
          m.Ilce            AS ilce,
          m.Mahalle         AS mahalle,
          m.Sokak           AS sokak,
          m.BinaNo          AS binaNo,
          m.Kat             AS kat,
          m.DaireNo         AS daireNo,
          m.AcikAdres       AS acikAdres,
          u.Id              AS chefId,
          u.AdSoyad         AS chef,
          u.Telefon         AS chefPhone,
          m.OrtalamaPuan    AS rating,
          m.ToplamDegerlendirme AS reviewCount,
          u.OrtalamaPuan    AS chefRating,
          u.ToplamDegerlendirme AS chefReviewCount,
          CAST(m.Konum.STDistance(@UserPoint) / 1000.0 AS DECIMAL(10,2)) AS distanceKm
        FROM dbo.Meals AS m
        INNER JOIN dbo.Users AS u ON u.Id = m.AsciId
        WHERE m.AktifMi = 1
          AND m.KalanPorsiyon > 0
          AND m.Konum.STDistance(@UserPoint) <= 30000
        ORDER BY m.Konum.STDistance(@UserPoint);
      `);

    res.json({
      origin: { lat, lng },
      radiusKm: 30,
      count: result.recordset.length,
      meals: result.recordset,
    });
  } catch (err) {
    console.error('GET /api/meals', err);
    res.status(500).json({ error: 'Yemekler getirilemedi.', detail: err.message });
  }
});

router.post('/', requireAuth, requireVerified, async (req, res) => {
  try {
    const {
      baslik,
      aciklama = null,
      porsiyonFiyati,
      kalanPorsiyon,
      enlem,
      boylam,
      gorselUrl = null,
      kaporaOrani = 30,
      il,
      ilce,
      mahalle,
      sokak,
      binaNo,
      kat,
      daireNo,
      acikAdres,
    } = req.body || {};

    if (!baslik || porsiyonFiyati == null || kalanPorsiyon == null) {
      return res.status(400).json({
        error: 'baslik, porsiyonFiyati ve kalanPorsiyon zorunludur.',
      });
    }
    if (!gorselUrl) {
      return res.status(400).json({ error: 'Yemek fotoğrafı zorunludur.' });
    }
    if (!il || !ilce || !mahalle || !sokak || !binaNo) {
      return res.status(400).json({
        error: 'İl, ilçe, mahalle, sokak ve bina no zorunludur.',
      });
    }

    const lat = Number(enlem);
    const lng = Number(boylam);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({ error: 'Geçerli enlem ve boylam gerekli.' });
    }

    const rate = Number(kaporaOrani);
    if (Number.isNaN(rate) || rate < 10 || rate > 100) {
      return res.status(400).json({ error: 'Kapora oranı 10–100 arası olmalıdır.' });
    }

    const fullAddress = buildAcikAdres({
      il,
      ilce,
      mahalle,
      sokak,
      binaNo,
      kat,
      daireNo,
      acikAdres,
    });

    const pool = await getPool();
    const result = await pool
      .request()
      .input('asciId', sql.Int, req.user.id)
      .input('baslik', sql.NVarChar(200), String(baslik).trim())
      .input('aciklama', sql.NVarChar(1000), aciklama)
      .input('porsiyonFiyati', sql.Decimal(10, 2), Number(porsiyonFiyati))
      .input('kalanPorsiyon', sql.Int, Number(kalanPorsiyon))
      .input('enlem', sql.Float, lat)
      .input('boylam', sql.Float, lng)
      .input('gorselUrl', sql.NVarChar(sql.MAX), gorselUrl)
      .input('kaporaOrani', sql.Int, rate)
      .input('il', sql.NVarChar(80), String(il).trim())
      .input('ilce', sql.NVarChar(80), String(ilce).trim())
      .input('mahalle', sql.NVarChar(120), String(mahalle).trim())
      .input('sokak', sql.NVarChar(160), String(sokak).trim())
      .input('binaNo', sql.NVarChar(40), String(binaNo).trim())
      .input('kat', sql.NVarChar(20), kat ? String(kat).trim() : null)
      .input('daireNo', sql.NVarChar(20), daireNo ? String(daireNo).trim() : null)
      .input('acikAdres', sql.NVarChar(500), fullAddress)
      .query(`
        INSERT INTO dbo.Meals
          (AsciId, Baslik, Aciklama, PorsiyonFiyati, KalanPorsiyon, Konum, Enlem, Boylam,
           AktifMi, GorselUrl, KaporaOrani, Il, Ilce, Mahalle, Sokak, BinaNo, Kat, DaireNo, AcikAdres)
        OUTPUT
          INSERTED.Id AS id,
          INSERTED.Baslik AS title,
          INSERTED.Aciklama AS description,
          INSERTED.PorsiyonFiyati AS price,
          INSERTED.KalanPorsiyon AS portions,
          INSERTED.Enlem AS lat,
          INSERTED.Boylam AS lng,
          INSERTED.AktifMi AS isActive,
          INSERTED.GorselUrl AS imageUrl,
          INSERTED.KaporaOrani AS depositRate,
          INSERTED.Il AS il,
          INSERTED.Ilce AS ilce,
          INSERTED.Mahalle AS mahalle,
          INSERTED.Sokak AS sokak,
          INSERTED.BinaNo AS binaNo,
          INSERTED.Kat AS kat,
          INSERTED.DaireNo AS daireNo,
          INSERTED.AcikAdres AS acikAdres,
          INSERTED.EklenmeTarihi AS createdAt
        VALUES (
          @asciId, @baslik, @aciklama, @porsiyonFiyati, @kalanPorsiyon,
          geography::Point(@enlem, @boylam, 4326),
          @enlem, @boylam, 1, @gorselUrl, @kaporaOrani,
          @il, @ilce, @mahalle, @sokak, @binaNo, @kat, @daireNo, @acikAdres
        );
      `);

    emitMealsChanged({ reason: 'created', mealId: result.recordset[0]?.id });

    res.status(201).json({ meal: result.recordset[0] });
  } catch (err) {
    console.error('POST /api/meals', err);
    res.status(500).json({ error: 'Yemek ilanı eklenemedi.', detail: err.message });
  }
});

router.get('/mine', requireAuth, async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('asciId', sql.Int, req.user.id)
      .query(`
        SELECT
          Id AS id,
          Baslik AS title,
          KalanPorsiyon AS portions,
          AktifMi AS isActive,
          PorsiyonFiyati AS price,
          Ilce AS ilce,
          GorselUrl AS imageUrl
        FROM dbo.Meals
        WHERE AsciId = @asciId
        ORDER BY Id DESC
      `);
    res.json({ meals: result.recordset });
  } catch (err) {
    res.status(500).json({ error: 'İlanlar getirilemedi.', detail: err.message });
  }
});

router.patch('/:id', requireAuth, requireVerified, async (req, res) => {
  const id = Number(req.params.id);
  const portions = req.body?.kalanPorsiyon ?? req.body?.portions;
  const active = req.body?.aktifMi ?? req.body?.isActive;
  if (!id) return res.status(400).json({ error: 'İlan bulunamadı.' });

  try {
    const pool = await getPool();
    const request = pool.request().input('id', sql.Int, id).input('asciId', sql.Int, req.user.id);
    const sets = [];
    if (portions != null) {
      const next = Number(portions);
      if (!Number.isInteger(next) || next < 0 || next > 200) {
        return res.status(400).json({ error: 'Porsiyon 0–200 arasında olmalı.' });
      }
      request.input('portions', sql.Int, next);
      sets.push('KalanPorsiyon = @portions');
      sets.push('AktifMi = CASE WHEN @portions <= 0 THEN 0 ELSE AktifMi END');
    }
    if (active != null && portions == null) {
      request.input('active', sql.Bit, active ? 1 : 0);
      sets.push('AktifMi = @active');
    }
    if (!sets.length) return res.status(400).json({ error: 'Güncellenecek alan yok.' });

    const result = await request.query(`
      UPDATE dbo.Meals
      SET ${sets.join(', ')}
      OUTPUT INSERTED.Id AS id, INSERTED.KalanPorsiyon AS portions, INSERTED.AktifMi AS isActive
      WHERE Id = @id AND AsciId = @asciId
    `);
    if (!result.recordset.length) {
      return res.status(404).json({ error: 'İlan bulunamadı.' });
    }
    emitMealsChanged({ reason: 'updated', mealId: id });
    res.json({ meal: result.recordset[0], message: 'İlan güncellendi.' });
  } catch (err) {
    res.status(500).json({ error: 'İlan güncellenemedi.', detail: err.message });
  }
});

module.exports = router;
