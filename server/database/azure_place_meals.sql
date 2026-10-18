-- Temel ilanları Kayseri mahallelerine yerleştir (idempotent)
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

UPDATE dbo.Meals SET
  Enlem = 38.7205, Boylam = 35.4882,
  Konum = geography::Point(38.7205, 35.4882, 4326),
  Il = N'Kayseri', Ilce = N'Melikgazi', Mahalle = N'Kıçikapı Mah.',
  Sokak = N'Hastane Caddesi', BinaNo = N'4', Kat = N'1', DaireNo = N'2',
  AcikAdres = N'Kıçikapı Mah., Hastane Caddesi, No:4, Kat:1, Daire:2, Melikgazi, Kayseri'
WHERE Baslik = N'Kayseri Mantısı';

UPDATE dbo.Meals SET
  Enlem = 38.7024, Boylam = 35.5388,
  Konum = geography::Point(38.7024, 35.5388, 4326),
  Il = N'Kayseri', Ilce = N'Talas', Mahalle = N'Bahçelievler Mah.',
  Sokak = N'Mehmet Özhaseki Bulvarı', BinaNo = N'14', Kat = N'2', DaireNo = N'5',
  AcikAdres = N'Bahçelievler Mah., Mehmet Özhaseki Bulvarı, No:14, Kat:2, Daire:5, Talas, Kayseri'
WHERE Baslik = N'İçli Köfte';

UPDATE dbo.Meals SET
  Enlem = 38.7462, Boylam = 35.4528,
  Konum = geography::Point(38.7462, 35.4528, 4326),
  Il = N'Kayseri', Ilce = N'Kocasinan', Mahalle = N'Yenidoğan Mah.',
  Sokak = N'Sivas Caddesi', BinaNo = N'18', Kat = N'3', DaireNo = N'1',
  AcikAdres = N'Yenidoğan Mah., Sivas Caddesi, No:18, Kat:3, Daire:1, Kocasinan, Kayseri'
WHERE Baslik = N'Kuru Fasulye';

UPDATE dbo.Meals SET
  Enlem = 38.7312, Boylam = 35.4786,
  Konum = geography::Point(38.7312, 35.4786, 4326),
  Il = N'Kayseri', Ilce = N'Melikgazi', Mahalle = N'Alpaslan Mah.',
  Sokak = N'Alpaslan Caddesi', BinaNo = N'9', Kat = N'1', DaireNo = N'4',
  AcikAdres = N'Alpaslan Mah., Alpaslan Caddesi, No:9, Kat:1, Daire:4, Melikgazi, Kayseri'
WHERE Baslik = N'Etli Bamya';

UPDATE dbo.Meals SET
  Enlem = 38.6892, Boylam = 35.5464,
  Konum = geography::Point(38.6892, 35.5464, 4326),
  Il = N'Kayseri', Ilce = N'Talas', Mahalle = N'Mevlana Mah.',
  Sokak = N'Nuh Naci Yazgan Bulvarı', BinaNo = N'22', Kat = N'2', DaireNo = N'3',
  AcikAdres = N'Mevlana Mah., Nuh Naci Yazgan Bulvarı, No:22, Kat:2, Daire:3, Talas, Kayseri'
WHERE Baslik = N'Nohut Pilav';

UPDATE dbo.Meals SET
  Enlem = 38.7394, Boylam = 35.4312,
  Konum = geography::Point(38.7394, 35.4312, 4326),
  Il = N'Kayseri', Ilce = N'Kocasinan', Mahalle = N'Erkilet Mah.',
  Sokak = N'Erkilet Caddesi', BinaNo = N'7', Kat = N'1', DaireNo = N'6',
  AcikAdres = N'Erkilet Mah., Erkilet Caddesi, No:7, Kat:1, Daire:6, Kocasinan, Kayseri'
WHERE Baslik = N'Fırın Makarna';
GO
