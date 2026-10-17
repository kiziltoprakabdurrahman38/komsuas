-- ============================================================
-- Ev Yemeği BTU — MS SQL Server Schema
-- Veritabanı: EvYemegiDB
-- ============================================================

IF DB_ID(N'EvYemegiDB') IS NULL
BEGIN
    CREATE DATABASE EvYemegiDB;
END
GO

USE EvYemegiDB;
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
GO

-- ------------------------------------------------------------
-- Users
-- ------------------------------------------------------------
IF OBJECT_ID(N'dbo.Users', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Users (
        Id            INT            IDENTITY(1,1) NOT NULL CONSTRAINT PK_Users PRIMARY KEY,
        AdSoyad       NVARCHAR(100)  NOT NULL,
        TcKimlikNo    CHAR(11)       NULL,
        DogumTarihi   DATE           NULL,
        Cinsiyet      NVARCHAR(30)   NULL,
        Telefon       NVARCHAR(20)   NULL,
        KayitTarihi   DATETIME       NOT NULL CONSTRAINT DF_Users_KayitTarihi DEFAULT (GETDATE()),
        -- Geriye uyumluluk / rol etiketi (rol bağımsız kullanım)
        Rol           NVARCHAR(20)   NOT NULL CONSTRAINT DF_Users_Rol DEFAULT (N'Kullanici'),
        Ad            NVARCHAR(120)  NULL,
        CONSTRAINT CK_Users_Rol CHECK (Rol IN (N'Asci', N'Alici', N'Kullanici')),
        CONSTRAINT CK_Users_Cinsiyet CHECK (
            Cinsiyet IS NULL OR Cinsiyet IN (N'Kadın', N'Erkek', N'Belirtmek İstemiyorum')
        )
    );
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'UQ_Users_TcKimlikNo' AND object_id = OBJECT_ID(N'dbo.Users')
)
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX UQ_Users_TcKimlikNo
        ON dbo.Users (TcKimlikNo)
        WHERE TcKimlikNo IS NOT NULL;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'UQ_Users_Telefon' AND object_id = OBJECT_ID(N'dbo.Users')
)
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX UQ_Users_Telefon
        ON dbo.Users (Telefon)
        WHERE Telefon IS NOT NULL;
END
GO

-- ------------------------------------------------------------
-- Meals
-- ------------------------------------------------------------
IF OBJECT_ID(N'dbo.Meals', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Meals (
        Id              INT             IDENTITY(1,1) NOT NULL CONSTRAINT PK_Meals PRIMARY KEY,
        AsciId          INT             NOT NULL,
        Baslik          NVARCHAR(200)   NOT NULL,
        Aciklama        NVARCHAR(1000)  NULL,
        PorsiyonFiyati  DECIMAL(10,2)   NOT NULL,
        KalanPorsiyon   INT             NOT NULL CONSTRAINT DF_Meals_KalanPorsiyon DEFAULT (0),
        Konum           GEOGRAPHY       NOT NULL,
        Enlem           FLOAT           NOT NULL,
        Boylam          FLOAT           NOT NULL,
        AktifMi         BIT             NOT NULL CONSTRAINT DF_Meals_AktifMi DEFAULT (1),
        EklenmeTarihi   DATETIME2(3)    NOT NULL CONSTRAINT DF_Meals_EklenmeTarihi DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_Meals_Asci FOREIGN KEY (AsciId) REFERENCES dbo.Users (Id),
        CONSTRAINT CK_Meals_PorsiyonFiyati CHECK (PorsiyonFiyati >= 0),
        CONSTRAINT CK_Meals_KalanPorsiyon CHECK (KalanPorsiyon >= 0)
    );
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_Meals_Konum' AND object_id = OBJECT_ID(N'dbo.Meals')
)
BEGIN
    CREATE SPATIAL INDEX IX_Meals_Konum
        ON dbo.Meals (Konum)
        USING GEOGRAPHY_GRID
        WITH (
            GRIDS = (LEVEL_1 = MEDIUM, LEVEL_2 = MEDIUM, LEVEL_3 = MEDIUM, LEVEL_4 = MEDIUM),
            CELLS_PER_OBJECT = 16
        );
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_Meals_AktifStok' AND object_id = OBJECT_ID(N'dbo.Meals')
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_Meals_AktifStok
        ON dbo.Meals (AktifMi, KalanPorsiyon)
        WHERE AktifMi = 1 AND KalanPorsiyon > 0;
END
GO

-- ------------------------------------------------------------
-- Orders
-- ------------------------------------------------------------
IF OBJECT_ID(N'dbo.Orders', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Orders (
        Id             INT            IDENTITY(1,1) NOT NULL CONSTRAINT PK_Orders PRIMARY KEY,
        MealId         INT            NOT NULL,
        AliciId        INT            NOT NULL,
        PorsiyonAdedi  INT            NOT NULL,
        OnayKodu       CHAR(6)        NOT NULL,
        Durum          NVARCHAR(30)   NOT NULL CONSTRAINT DF_Orders_Durum DEFAULT (N'Beklemede'),
        CONSTRAINT FK_Orders_Meal  FOREIGN KEY (MealId)  REFERENCES dbo.Meals  (Id),
        CONSTRAINT FK_Orders_Alici FOREIGN KEY (AliciId) REFERENCES dbo.Users  (Id),
        CONSTRAINT CK_Orders_PorsiyonAdedi CHECK (PorsiyonAdedi > 0),
        CONSTRAINT CK_Orders_Durum CHECK (
            Durum IN (
                N'Beklemede', N'Onaylandi', N'TeslimEdildi', N'Iptal',
                N'AliciGelmedi', N'AsciIptal'
            )
        ),
        CONSTRAINT UQ_Orders_OnayKodu UNIQUE (OnayKodu)
    );
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_Orders_MealId' AND object_id = OBJECT_ID(N'dbo.Orders')
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_Orders_MealId ON dbo.Orders (MealId);
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_Orders_AliciId' AND object_id = OBJECT_ID(N'dbo.Orders')
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_Orders_AliciId ON dbo.Orders (AliciId);
END
GO

-- ------------------------------------------------------------
-- Örnek kullanıcılar (yalnızca tablo boşsa)
-- Geçerli örnek T.C. Kimlik No'lar (algoritma uyumlu demo)
-- ------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM dbo.Users)
BEGIN
    INSERT INTO dbo.Users (AdSoyad, TcKimlikNo, DogumTarihi, Cinsiyet, Telefon, Rol, Ad)
    VALUES
        (N'Ayşe Teyze',   '10000997354', '1968-03-12', N'Kadın',  N'05321110001', N'Asci', N'Ayşe Teyze'),
        (N'Fatma Hanım',  '10001994666', '1972-07-21', N'Kadın',  N'05321110002', N'Asci', N'Fatma Hanım'),
        (N'Mehmet Usta',  '10002991978', '1965-11-05', N'Erkek',  N'05321110003', N'Asci', N'Mehmet Usta'),
        (N'Zeynep Abla',  '10003989202', '1980-01-18', N'Kadın',  N'05321110004', N'Asci', N'Zeynep Abla'),
        (N'Elif Sofrası', '10004986514', '1988-09-30', N'Kadın',  N'05321110005', N'Asci', N'Elif Sofrası'),
        (N'Hatice Nine',  '10005983826', '1959-04-02', N'Kadın',  N'05321110006', N'Asci', N'Hatice Nine'),
        (N'Demo Alıcı',   '10006981128', '1995-06-15', N'Erkek',  N'05329990001', N'Alici', N'Demo Alıcı');
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Meals)
BEGIN
    DECLARE @Asci1 INT = (SELECT Id FROM dbo.Users WHERE AdSoyad = N'Ayşe Teyze');
    DECLARE @Asci2 INT = (SELECT Id FROM dbo.Users WHERE AdSoyad = N'Fatma Hanım');
    DECLARE @Asci3 INT = (SELECT Id FROM dbo.Users WHERE AdSoyad = N'Mehmet Usta');
    DECLARE @Asci4 INT = (SELECT Id FROM dbo.Users WHERE AdSoyad = N'Zeynep Abla');
    DECLARE @Asci5 INT = (SELECT Id FROM dbo.Users WHERE AdSoyad = N'Elif Sofrası');
    DECLARE @Asci6 INT = (SELECT Id FROM dbo.Users WHERE AdSoyad = N'Hatice Nine');

    INSERT INTO dbo.Meals
        (AsciId, Baslik, Aciklama, PorsiyonFiyati, KalanPorsiyon, Konum, Enlem, Boylam, AktifMi)
    VALUES
        (@Asci1, N'Nohut Pilav', N'Tereyağlı, taze nohut ile ev usulü', 85.00, 6, geography::Point(38.7341, 35.4822, 4326), 38.7341, 35.4822, 1),
        (@Asci2, N'Kayseri Mantısı', N'El açması, yoğurt ve tereyağlı sos ile', 140.00, 4, geography::Point(38.7285, 35.4718, 4326), 38.7285, 35.4718, 1),
        (@Asci3, N'Kuru Fasulye', N'Ev yapımı turşu yanında, pideli', 95.00, 8, geography::Point(38.7358, 35.4695, 4326), 38.7358, 35.4695, 1),
        (@Asci4, N'İçli Köfte', N'Kızartma, adet fiyatı', 45.00, 10, geography::Point(38.7252, 35.4851, 4326), 38.7252, 35.4851, 1),
        (@Asci5, N'Fırın Makarna', N'Beşamel soslu, fırından sıcak', 110.00, 5, geography::Point(38.7389, 35.4764, 4326), 38.7389, 35.4764, 1),
        (@Asci6, N'Etli Bamya', N'Limonlu, taze bamya', 120.00, 3, geography::Point(38.7228, 35.4659, 4326), 38.7228, 35.4659, 1);
END
GO
