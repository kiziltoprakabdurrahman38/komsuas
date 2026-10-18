-- ============================================================
-- YemekCüzdan + OTP + Kapora + Görsel (idempotent)
-- ============================================================
USE EvYemegiDB;
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- Users.Bakiye
IF COL_LENGTH('dbo.Users', 'Bakiye') IS NULL
BEGIN
    ALTER TABLE dbo.Users ADD Bakiye DECIMAL(10,2) NOT NULL
        CONSTRAINT DF_Users_Bakiye DEFAULT (500.00);
END
GO

-- Users.IsVerified
IF COL_LENGTH('dbo.Users', 'IsVerified') IS NULL
BEGIN
    ALTER TABLE dbo.Users ADD IsVerified BIT NOT NULL
        CONSTRAINT DF_Users_IsVerified DEFAULT (0);
END
GO

-- Users.VerificationCode
IF COL_LENGTH('dbo.Users', 'VerificationCode') IS NULL
BEGIN
    ALTER TABLE dbo.Users ADD VerificationCode VARCHAR(6) NULL;
END
GO

-- Meals.GorselUrl
IF COL_LENGTH('dbo.Meals', 'GorselUrl') IS NULL
BEGIN
    ALTER TABLE dbo.Meals ADD GorselUrl NVARCHAR(MAX) NULL;
END
GO

-- Meals.KaporaOrani
IF COL_LENGTH('dbo.Meals', 'KaporaOrani') IS NULL
BEGIN
    ALTER TABLE dbo.Meals ADD KaporaOrani INT NOT NULL
        CONSTRAINT DF_Meals_KaporaOrani DEFAULT (30);
END
GO

-- Orders.KaporaTutari
IF COL_LENGTH('dbo.Orders', 'KaporaTutari') IS NULL
BEGIN
    ALTER TABLE dbo.Orders ADD KaporaTutari DECIMAL(10,2) NULL;
END
GO

-- Orders.KalanTutar
IF COL_LENGTH('dbo.Orders', 'KalanTutar') IS NULL
BEGIN
    ALTER TABLE dbo.Orders ADD KalanTutar DECIMAL(10,2) NULL;
END
GO

-- Orders.OdemeYontemi
IF COL_LENGTH('dbo.Orders', 'OdemeYontemi') IS NULL
BEGIN
    ALTER TABLE dbo.Orders ADD OdemeYontemi NVARCHAR(30) NULL;
END
GO

-- Orders.OdemeDurumu
IF COL_LENGTH('dbo.Orders', 'OdemeDurumu') IS NULL
BEGIN
    ALTER TABLE dbo.Orders ADD OdemeDurumu NVARCHAR(30) NULL
        CONSTRAINT DF_Orders_OdemeDurumu DEFAULT (N'KaporaAlindi');
END
GO

IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_Orders_OdemeYontemi')
    ALTER TABLE dbo.Orders DROP CONSTRAINT CK_Orders_OdemeYontemi;
GO

ALTER TABLE dbo.Orders WITH NOCHECK
ADD CONSTRAINT CK_Orders_OdemeYontemi CHECK (
    OdemeYontemi IS NULL OR OdemeYontemi IN (N'Cuzdan', N'KartSimulasyon')
);
GO

-- WalletTransactions
IF OBJECT_ID(N'dbo.WalletTransactions', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.WalletTransactions (
        Id         INT             IDENTITY(1,1) NOT NULL CONSTRAINT PK_WalletTransactions PRIMARY KEY,
        UserId     INT             NOT NULL,
        Tutar      DECIMAL(10,2)   NOT NULL,
        IslemTipi  NVARCHAR(30)    NOT NULL,
        Aciklama   NVARCHAR(200)   NULL,
        Tarih      DATETIME        NOT NULL CONSTRAINT DF_WalletTransactions_Tarih DEFAULT (GETDATE()),
        CONSTRAINT FK_WalletTransactions_User FOREIGN KEY (UserId) REFERENCES dbo.Users (Id),
        CONSTRAINT CK_WalletTransactions_IslemTipi CHECK (
            IslemTipi IN (
                N'HosGeldin',
                N'BakiyeYukleme',
                N'KaporaOdeme',
                N'KaporaIade',
                N'KaporaAktarim'
            )
        )
    );
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_WalletTransactions_UserId' AND object_id = OBJECT_ID(N'dbo.WalletTransactions')
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_WalletTransactions_UserId
        ON dbo.WalletTransactions (UserId, Tarih DESC);
END
GO

-- Mevcut kullanıcıları doğrulanmış + 500 TL bakiye ile hizala
UPDATE dbo.Users
SET
    Bakiye = CASE WHEN Bakiye IS NULL OR Bakiye < 0 THEN 500.00 ELSE Bakiye END,
    IsVerified = 1
WHERE IsVerified = 0 OR Bakiye IS NULL;
GO

-- Örnek yemek görselleri (Wikimedia Commons, yemeğin kendi fotoğrafı)
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
GO
