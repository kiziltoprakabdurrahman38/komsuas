-- Yemek ilanı görsellerini yemeğin kendi fotoğrafıyla güncelle
USE EvYemegiDB;
GO

UPDATE dbo.Meals SET GorselUrl = N'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Nohut_yahni.jpg/960px-Nohut_yahni.jpg'
WHERE Baslik = N'Nohut Pilav';

UPDATE dbo.Meals SET GorselUrl = N'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Kayseri_mant%C4%B1s%C4%B1.jpg/960px-Kayseri_mant%C4%B1s%C4%B1.jpg'
WHERE Baslik = N'Kayseri Mantısı';

UPDATE dbo.Meals SET GorselUrl = N'https://upload.wikimedia.org/wikipedia/commons/thumb/6/61/Etli_kuru_fasulye.jpg/960px-Etli_kuru_fasulye.jpg'
WHERE Baslik = N'Kuru Fasulye';

UPDATE dbo.Meals SET GorselUrl = N'https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/%C4%B0%C3%A7li_k%C3%B6fte_20250205.jpg/960px-%C4%B0%C3%A7li_k%C3%B6fte_20250205.jpg'
WHERE Baslik = N'İçli Köfte';

UPDATE dbo.Meals SET GorselUrl = N'https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Pastitsio_homemade.jpg/960px-Pastitsio_homemade.jpg'
WHERE Baslik = N'Fırın Makarna';

UPDATE dbo.Meals SET GorselUrl = N'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Etli_kuru_bamya.jpg/960px-Etli_kuru_bamya.jpg'
WHERE Baslik = N'Etli Bamya';

UPDATE dbo.Meals SET GorselUrl = N'https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/Ya%C4%9Flama.jpg/960px-Ya%C4%9Flama.jpg'
WHERE Baslik = N'Kayseri Yağlaması';

UPDATE dbo.Meals SET GorselUrl = N'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Nevzine_tatl%C4%B1s%C4%B1_tabakta.jpg/960px-Nevzine_tatl%C4%B1s%C4%B1_tabakta.jpg'
WHERE Baslik = N'Nevzine Tatlısı';

UPDATE dbo.Meals SET GorselUrl = N'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Yuksuk_soup.jpg/960px-Yuksuk_soup.jpg'
WHERE Baslik = N'Kurşun Aşı';

UPDATE dbo.Meals SET
  GorselUrl = N'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Etli_g%C3%BCve%C3%A7.jpg/960px-Etli_g%C3%BCve%C3%A7.jpg',
  Aciklama = N'Kuzu eti, domates, biber ve sarımsak. Tepsi, fırın ağzında pişer.'
WHERE Baslik = N'Fırın Ağzı';

UPDATE dbo.Meals SET GorselUrl = N'https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/%C4%B0%C3%A7li_k%C3%B6fte_%28Oruk%29.jpg/960px-%C4%B0%C3%A7li_k%C3%B6fte_%28Oruk%29.jpg'
WHERE Baslik = N'İçli Köfte (Haşlama)';

UPDATE dbo.Meals SET GorselUrl = N'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Su_b%C3%B6re%C4%9Fi_and_tea.jpg/960px-Su_b%C3%B6re%C4%9Fi_and_tea.jpg'
WHERE Baslik = N'Su Böreği';

UPDATE dbo.Meals SET GorselUrl = N'https://upload.wikimedia.org/wikipedia/commons/thumb/3/39/Terbiyeli_tel_sehriye.jpg/960px-Terbiyeli_tel_sehriye.jpg'
WHERE Baslik = N'Kesme Çorba';
GO
