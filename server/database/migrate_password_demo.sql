-- ============================================================
-- SifreHash + Demo kullanıcı (Abdurrahman Kızıltoprak)
-- ============================================================
USE EvYemegiDB;
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF COL_LENGTH('dbo.Users', 'SifreHash') IS NULL
BEGIN
    ALTER TABLE dbo.Users ADD SifreHash CHAR(64) NULL;
END
GO

-- Unique index bağımlılığını kaldır, Tc alanını esnet, yeniden oluştur
IF EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'UQ_Users_TcKimlikNo' AND object_id = OBJECT_ID(N'dbo.Users')
)
BEGIN
    DROP INDEX UQ_Users_TcKimlikNo ON dbo.Users;
END
GO

IF COL_LENGTH('dbo.Users', 'TcKimlikNo') IS NOT NULL
BEGIN
    ALTER TABLE dbo.Users ALTER COLUMN TcKimlikNo NVARCHAR(11) NULL;
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

-- Mevcut kullanıcılara varsayılan şifre '1' (SHA-256)
UPDATE dbo.Users
SET SifreHash = '6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b'
WHERE SifreHash IS NULL;
GO

-- Demo hesap
IF EXISTS (SELECT 1 FROM dbo.Users WHERE LTRIM(RTRIM(TcKimlikNo)) = N'1')
BEGIN
    UPDATE dbo.Users
    SET
        AdSoyad = N'Abdurrahman Kiziltoprak',
        Ad = N'Abdurrahman Kiziltoprak',
        Telefon = N'05555555555',
        SifreHash = '6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b',
        IsVerified = 1,
        VerificationCode = NULL,
        Bakiye = 1000.00,
        Rol = N'Kullanici',
        Cinsiyet = N'Erkek',
        DogumTarihi = '2000-01-01'
    WHERE LTRIM(RTRIM(TcKimlikNo)) = N'1';
END
ELSE IF EXISTS (SELECT 1 FROM dbo.Users WHERE Telefon = N'05555555555')
BEGIN
    UPDATE dbo.Users
    SET
        AdSoyad = N'Abdurrahman Kiziltoprak',
        Ad = N'Abdurrahman Kiziltoprak',
        TcKimlikNo = N'1',
        SifreHash = '6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b',
        IsVerified = 1,
        VerificationCode = NULL,
        Bakiye = 1000.00,
        Rol = N'Kullanici',
        Cinsiyet = N'Erkek',
        DogumTarihi = '2000-01-01'
    WHERE Telefon = N'05555555555';
END
ELSE
BEGIN
    INSERT INTO dbo.Users
        (AdSoyad, TcKimlikNo, DogumTarihi, Cinsiyet, Telefon, Rol, Ad, Bakiye, IsVerified, VerificationCode, SifreHash)
    VALUES
        (
            N'Abdurrahman Kiziltoprak',
            N'1',
            '2000-01-01',
            N'Erkek',
            N'05555555555',
            N'Kullanici',
            N'Abdurrahman Kiziltoprak',
            1000.00,
            1,
            NULL,
            '6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b'
        );
END
GO
