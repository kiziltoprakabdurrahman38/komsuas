/**
 * Türkiye geneli 20 ev yemeği ilanı.
 * Unvanlı aşçı adlarını gerçek ad-soyada çevirir, eski ilanları vitrinden alır.
 * Parola yazdırılmaz. Çalıştırma: node database/seed_nationwide.js
 */
require('dotenv').config()
const path = require('path')
const { sql, getPool } = require('../db')

const MEALS = require(path.join(__dirname, '../../client/src/data/nationwideMeals.json'))

const RENAMES = [
  ['Ayşe Teyze', 'Ayşe Korkmaz'],
  ['Fatma Hanım', 'Fatma Acar'],
  ['Mehmet Usta', 'Mehmet Aslan'],
  ['Zeynep Abla', 'Zeynep Polat'],
  ['Elif Sofrası', 'Elif Yıldız'],
  ['Hatice Nine', 'Hatice Yücel'],
]

function address(meal) {
  const mahalle = `${meal.ilce} Merkez`
  return {
    mahalle,
    sokak: 'Atatürk Caddesi',
    binaNo: '10',
    kat: '1',
    daireNo: '2',
    acikAdres: `${mahalle}, Atatürk Caddesi, No:10, ${meal.ilce}, ${meal.il}`,
  }
}

async function renameTitledChefs(pool) {
  for (const [from, to] of RENAMES) {
    const taken = await pool.request()
      .input('to', sql.NVarChar, to)
      .query('SELECT Id FROM dbo.Users WHERE AdSoyad = @to')
    if (taken.recordset.length) continue
    await pool.request()
      .input('from', sql.NVarChar, from)
      .input('to', sql.NVarChar, to)
      .query(`
        UPDATE dbo.Users
        SET AdSoyad = @to, Ad = @to
        WHERE AdSoyad = @from OR Ad = @from
      `)
  }
}

async function ensureChef(pool, name, index) {
  const existing = await pool.request()
    .input('name', sql.NVarChar, name)
    .query('SELECT Id FROM dbo.Users WHERE AdSoyad = @name')
  if (existing.recordset[0]) return existing.recordset[0].Id

  const phone = `0533${String(2000000 + index).padStart(7, '0')}`.slice(0, 11)
  const inserted = await pool.request()
    .input('name', sql.NVarChar, name)
    .input('phone', sql.NVarChar, phone)
    .query(`
      INSERT INTO dbo.Users (AdSoyad, Telefon, Rol, Ad, Bakiye, IsVerified)
      OUTPUT INSERTED.Id AS id
      VALUES (@name, @phone, N'Asci', @name, 0, 0)
    `)
  return inserted.recordset[0].id
}

async function upsertMeal(pool, meal, chefId) {
  const place = address(meal)
  const found = await pool.request()
    .input('title', sql.NVarChar, meal.title)
    .query('SELECT TOP 1 Id FROM dbo.Meals WHERE Baslik = @title ORDER BY Id')

  const request = pool.request()
    .input('chefId', sql.Int, chefId)
    .input('title', sql.NVarChar, meal.title)
    .input('description', sql.NVarChar, meal.description)
    .input('price', sql.Decimal(10, 2), meal.price)
    .input('portions', sql.Int, meal.portions)
    .input('lat', sql.Float, meal.lat)
    .input('lng', sql.Float, meal.lng)
    .input('image', sql.NVarChar, meal.image)
    .input('il', sql.NVarChar, meal.il)
    .input('ilce', sql.NVarChar, meal.ilce)
    .input('mahalle', sql.NVarChar, place.mahalle)
    .input('sokak', sql.NVarChar, place.sokak)
    .input('binaNo', sql.NVarChar, place.binaNo)
    .input('kat', sql.NVarChar, place.kat)
    .input('daireNo', sql.NVarChar, place.daireNo)
    .input('acikAdres', sql.NVarChar, place.acikAdres)

  if (found.recordset[0]) {
    request.input('id', sql.Int, found.recordset[0].Id)
    await request.query(`
      UPDATE dbo.Meals
      SET AsciId = @chefId,
          Aciklama = @description,
          PorsiyonFiyati = @price,
          KalanPorsiyon = @portions,
          Konum = geography::Point(@lat, @lng, 4326),
          Enlem = @lat,
          Boylam = @lng,
          AktifMi = 1,
          GorselUrl = @image,
          KaporaOrani = 30,
          Il = @il,
          Ilce = @ilce,
          Mahalle = @mahalle,
          Sokak = @sokak,
          BinaNo = @binaNo,
          Kat = @kat,
          DaireNo = @daireNo,
          AcikAdres = @acikAdres
      WHERE Id = @id
    `)
    return 'updated'
  }

  await request.query(`
    INSERT INTO dbo.Meals
      (AsciId, Baslik, Aciklama, PorsiyonFiyati, KalanPorsiyon, Konum, Enlem, Boylam,
       AktifMi, GorselUrl, KaporaOrani, Il, Ilce, Mahalle, Sokak, BinaNo, Kat, DaireNo, AcikAdres)
    VALUES
      (@chefId, @title, @description, @price, @portions, geography::Point(@lat, @lng, 4326), @lat, @lng,
       1, @image, 30, @il, @ilce, @mahalle, @sokak, @binaNo, @kat, @daireNo, @acikAdres)
  `)
  return 'inserted'
}

async function nearest(pool, lat, lng) {
  const result = await pool.request()
    .input('lat', sql.Float, lat)
    .input('lng', sql.Float, lng)
    .query(`
      DECLARE @UserPoint GEOGRAPHY = geography::Point(@lat, @lng, 4326);
      SELECT TOP 3
        m.Baslik AS title,
        u.AdSoyad AS chef,
        m.Ilce AS ilce,
        CAST(m.Konum.STDistance(@UserPoint) / 1000.0 AS DECIMAL(10,2)) AS km
      FROM dbo.Meals m
      INNER JOIN dbo.Users u ON u.Id = m.AsciId
      WHERE m.AktifMi = 1 AND m.KalanPorsiyon > 0
        AND m.Konum.STDistance(@UserPoint) <= 30000
      ORDER BY m.Konum.STDistance(@UserPoint)
    `)
  return result.recordset
}

async function main() {
  const pool = await getPool()
  await renameTitledChefs(pool)
  await pool.request().query('UPDATE dbo.Meals SET AktifMi = 0')

  for (let i = 0; i < MEALS.length; i += 1) {
    const meal = MEALS[i]
    const chefId = await ensureChef(pool, meal.chef, i)
    const action = await upsertMeal(pool, meal, chefId)
    console.log(`${action}: ${meal.ilce} / ${meal.title} / ${meal.chef}`)
  }

  const titled = await pool.request().query(`
    SELECT AdSoyad FROM dbo.Users
    WHERE AdSoyad LIKE N'%Teyze%' OR AdSoyad LIKE N'%Hanım%' OR AdSoyad LIKE N'%Usta%'
       OR AdSoyad LIKE N'%Abla%' OR AdSoyad LIKE N'%Nine%' OR AdSoyad LIKE N'%Sofrası%'
  `)
  const active = await pool.request().query(`
    SELECT COUNT(*) AS total FROM dbo.Meals WHERE AktifMi = 1 AND KalanPorsiyon > 0
  `)
  console.log('aktif ilan', active.recordset[0].total)
  console.log('kalan unvanlı kullanıcı', titled.recordset.length)
  console.log('Beşiktaş', JSON.stringify(await nearest(pool, 41.0428, 29.0077)))
  console.log('Kadıköy', JSON.stringify(await nearest(pool, 40.992, 29.025)))
  console.log('Melikgazi', JSON.stringify(await nearest(pool, 38.7205, 35.4826)))
  await pool.close()
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
