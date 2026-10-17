-- ============================================================
-- Users auth kolonları (idempotent ALTER)
-- ============================================================
USE EvYemegiDB;
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- AdSoyad
IF COL_LENGTH('dbo.Users', 'AdSoyad') IS NULL
BEGIN
    ALTER TABLE dbo.Users ADD AdSoyad NVARCHAR(100) NULL;
END
GO

-- TcKimlikNo
IF COL_LENGTH('dbo.Users', 'TcKimlikNo') IS NULL
BEGIN
    ALTER TABLE dbo.Users ADD TcKimlikNo CHAR(11) NULL;
END
GO

-- DogumTarihi
IF COL_LENGTH('dbo.Users', 'DogumTarihi') IS NULL
BEGIN
    ALTER TABLE dbo.Users ADD DogumTarihi DATE NULL;
END
GO

-- Cinsiyet (Belirtmek İstemiyorum için yeterli uzunluk)
IF COL_LENGTH('dbo.Users', 'Cinsiyet') IS NULL
BEGIN
    ALTER TABLE dbo.Users ADD Cinsiyet NVARCHAR(30) NULL;
END
ELSE
BEGIN
    ALTER TABLE dbo.Users ALTER COLUMN Cinsiyet NVARCHAR(30) NULL;
END
GO

-- Telefon genişliği (varsa dokunma; yoksa ekle)
IF COL_LENGTH('dbo.Users', 'Telefon') IS NULL
BEGIN
    ALTER TABLE dbo.Users ADD Telefon NVARCHAR(20) NULL;
END
GO

-- KayitTarihi
IF COL_LENGTH('dbo.Users', 'KayitTarihi') IS NULL
BEGIN
    ALTER TABLE dbo.Users ADD KayitTarihi DATETIME NOT NULL CONSTRAINT DF_Users_KayitTarihi DEFAULT (GETDATE());
END
GO

-- Eski Ad kolonundan AdSoyad doldur
IF COL_LENGTH('dbo.Users', 'Ad') IS NOT NULL AND COL_LENGTH('dbo.Users', 'AdSoyad') IS NOT NULL
BEGIN
    UPDATE dbo.Users
    SET AdSoyad = LEFT(Ad, 100)
    WHERE AdSoyad IS NULL AND Ad IS NOT NULL;
END
GO

-- Rol: Kullanici değerine izin ver (rol bağımsız kullanım)
IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_Users_Rol')
BEGIN
    ALTER TABLE dbo.Users DROP CONSTRAINT CK_Users_Rol;
END
GO

ALTER TABLE dbo.Users WITH NOCHECK
ADD CONSTRAINT CK_Users_Rol CHECK (Rol IN (N'Asci', N'Alici', N'Kullanici'));
GO

-- Unique TC
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

-- Unique Telefon
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

-- Cinsiyet check (Türkçe karakterler NCHAR ile — sqlcmd kod sayfasından bağımsız)
IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_Users_Cinsiyet')
BEGIN
    ALTER TABLE dbo.Users DROP CONSTRAINT CK_Users_Cinsiyet;
END
GO

ALTER TABLE dbo.Users WITH NOCHECK
ADD CONSTRAINT CK_Users_Cinsiyet CHECK (
    Cinsiyet IS NULL OR Cinsiyet IN (
        N'Kad' + NCHAR(305) + N'n',
        N'Erkek',
        N'Belirtmek ' + NCHAR(304) + N'stemiyorum'
    )
);
GO
