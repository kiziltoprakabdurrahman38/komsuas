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

-- Örnek yemek görselleri (yoksa)
UPDATE dbo.Meals SET GorselUrl = N'https://images.unsplash.com/photo-1516684669134-de6f7c473a2a?w=800&q=80'
WHERE Baslik LIKE N'%Nohut%' AND (GorselUrl IS NULL OR GorselUrl = N'');

UPDATE dbo.Meals SET GorselUrl = N'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800&q=80'
WHERE Baslik LIKE N'%Mant%' AND (GorselUrl IS NULL OR GorselUrl = N'');

UPDATE dbo.Meals SET GorselUrl = N'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&q=80'
WHERE Baslik LIKE N'%Fasulye%' AND (GorselUrl IS NULL OR GorselUrl = N'');

UPDATE dbo.Meals SET GorselUrl = N'https://images.unsplash.com/photo-1529042410759-befb1204b468?w=800&q=80'
WHERE Baslik LIKE N'%K%fte%' AND (GorselUrl IS NULL OR GorselUrl = N'');

UPDATE dbo.Meals SET GorselUrl = N'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800&q=80'
WHERE Baslik LIKE N'%Makarna%' AND (GorselUrl IS NULL OR GorselUrl = N'');

UPDATE dbo.Meals SET GorselUrl = N'https://images.unsplash.com/photo-1604908177330-44683a29c595?w=800&q=80'
WHERE Baslik LIKE N'%Bamya%' AND (GorselUrl IS NULL OR GorselUrl = N'');
GO
