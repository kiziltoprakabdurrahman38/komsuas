-- Kayseri mahallelerine konumlanmış ek ev yemeği ilanları (idempotent)
USE EvYemegiDB;
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

DECLARE @Asci1 INT = (SELECT Id FROM dbo.Users WHERE AdSoyad = N'Ayşe Teyze');
DECLARE @Asci2 INT = (SELECT Id FROM dbo.Users WHERE AdSoyad = N'Fatma Hanım');
DECLARE @Asci3 INT = (SELECT Id FROM dbo.Users WHERE AdSoyad = N'Mehmet Usta');
DECLARE @Asci4 INT = (SELECT Id FROM dbo.Users WHERE AdSoyad = N'Zeynep Abla');
DECLARE @Asci5 INT = (SELECT Id FROM dbo.Users WHERE AdSoyad = N'Elif Sofrası');
DECLARE @Asci6 INT = (SELECT Id FROM dbo.Users WHERE AdSoyad = N'Hatice Nine');

INSERT INTO dbo.Meals
  (AsciId, Baslik, Aciklama, PorsiyonFiyati, KalanPorsiyon, Konum, Enlem, Boylam,
   AktifMi, GorselUrl, KaporaOrani, Il, Ilce, Mahalle, Sokak, BinaNo, Kat, DaireNo, AcikAdres)
SELECT
  v.AsciId, v.Baslik, v.Aciklama, v.Fiyat, v.Porsiyon,
  geography::Point(v.Enlem, v.Boylam, 4326), v.Enlem, v.Boylam,
  1, v.Gorsel, 30, v.Il, v.Ilce, v.Mahalle, v.Sokak, v.BinaNo, v.Kat, v.DaireNo, v.AcikAdres
FROM (VALUES
  (@Asci1, N'Kayseri Yağlaması',
   N'İnce yufka üzerinde kuşbaşı et, domates ve biber. Porsiyon yaklaşık 350 gram.',
   CAST(135.00 AS DECIMAL(10,2)), 6, 38.6905, 35.5512,
   N'https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/Ya%C4%9Flama.jpg/960px-Ya%C4%9Flama.jpg',
   N'Kayseri', N'Talas', N'Mevlana Mah.', N'Nuh Naci Yazgan Bulvarı', N'12', N'2', N'5',
   N'Mevlana Mah., Nuh Naci Yazgan Bulvarı, No:12, Kat:2, Daire:5, Talas, Kayseri'),
  (@Asci2, N'Nevzine Tatlısı',
   N'Cevizli, pekmezli ve şerbetli tepsi tatlısı. Dilim yaklaşık 180 gram. Gluten içerir.',
   CAST(90.00 AS DECIMAL(10,2)), 8, 38.7198, 35.4855,
   N'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Nevzine_tatl%C4%B1s%C4%B1_tabakta.jpg/960px-Nevzine_tatl%C4%B1s%C4%B1_tabakta.jpg',
   N'Kayseri', N'Melikgazi', N'Kıçikapı Mah.', N'Hastane Caddesi', N'8', N'1', N'3',
   N'Kıçikapı Mah., Hastane Caddesi, No:8, Kat:1, Daire:3, Melikgazi, Kayseri'),
  (@Asci3, N'Kurşun Aşı',
   N'Nohutlu hamur çorbası, üstü kırmızı biberli yağ. Kâse yaklaşık 400 ml.',
   CAST(110.00 AS DECIMAL(10,2)), 5, 38.7488, 35.4562,
   N'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Yuksuk_soup.jpg/960px-Yuksuk_soup.jpg',
   N'Kayseri', N'Kocasinan', N'Yenidoğan Mah.', N'Sivas Caddesi', N'27', N'3', N'7',
   N'Yenidoğan Mah., Sivas Caddesi, No:27, Kat:3, Daire:7, Kocasinan, Kayseri'),
  (@Asci4, N'Fırın Ağzı',
   N'Kuzu eti, domates, biber ve sarımsak. Tepsi, fırın ağzında pişer.',
   CAST(120.00 AS DECIMAL(10,2)), 4, 38.7316, 35.4974,
   N'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Etli_g%C3%BCve%C3%A7.jpg/960px-Etli_g%C3%BCve%C3%A7.jpg',
   N'Kayseri', N'Melikgazi', N'Alpaslan Mah.', N'Alpaslan Caddesi', N'19', N'1', N'2',
   N'Alpaslan Mah., Alpaslan Caddesi, No:19, Kat:1, Daire:2, Melikgazi, Kayseri'),
  (@Asci5, N'İçli Köfte (Haşlama)',
   N'İnce bulgur kabuk, içi cevizli kıyma. Adet fiyatı, haşlama. Gluten içerir.',
   CAST(55.00 AS DECIMAL(10,2)), 12, 38.7024, 35.5388,
   N'https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/%C4%B0%C3%A7li_k%C3%B6fte_%28Oruk%29.jpg/960px-%C4%B0%C3%A7li_k%C3%B6fte_%28Oruk%29.jpg',
   N'Kayseri', N'Talas', N'Bahçelievler Mah.', N'Mehmet Özhaseki Bulvarı', N'6', N'2', N'4',
   N'Bahçelievler Mah., Mehmet Özhaseki Bulvarı, No:6, Kat:2, Daire:4, Talas, Kayseri'),
  (@Asci6, N'Su Böreği',
   N'El açması yufka, peynirli ve maydanozlu. Tepsi dilimi yaklaşık 250 gram.',
   CAST(150.00 AS DECIMAL(10,2)), 5, 38.7412, 35.4286,
   N'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Su_b%C3%B6re%C4%9Fi_and_tea.jpg/960px-Su_b%C3%B6re%C4%9Fi_and_tea.jpg',
   N'Kayseri', N'Kocasinan', N'Erkilet Mah.', N'Erkilet Caddesi', N'41', N'2', N'6',
   N'Erkilet Mah., Erkilet Caddesi, No:41, Kat:2, Daire:6, Kocasinan, Kayseri'),
  (@Asci1, N'Kesme Çorba',
   N'Ev eriştesi, nohut ve naneli yağ. Kışlık ev usulü, kâse yaklaşık 400 ml.',
   CAST(85.00 AS DECIMAL(10,2)), 7, 38.7264, 35.4908,
   N'https://upload.wikimedia.org/wikipedia/commons/thumb/3/39/Terbiyeli_tel_sehriye.jpg/960px-Terbiyeli_tel_sehriye.jpg',
   N'Kayseri', N'Melikgazi', N'Sahabiye Mah.', N'Sivas Caddesi', N'15', N'4', N'8',
   N'Sahabiye Mah., Sivas Caddesi, No:15, Kat:4, Daire:8, Melikgazi, Kayseri')
) AS v(AsciId, Baslik, Aciklama, Fiyat, Porsiyon, Enlem, Boylam, Gorsel, Il, Ilce, Mahalle, Sokak, BinaNo, Kat, DaireNo, AcikAdres)
WHERE NOT EXISTS (
  SELECT 1 FROM dbo.Meals m WHERE m.Baslik = v.Baslik
);
GO
