-- ============================================================
-- Meals açık adres alanları (idempotent)
-- ============================================================
USE EvYemegiDB;
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF COL_LENGTH('dbo.Meals', 'Il') IS NULL
  ALTER TABLE dbo.Meals ADD Il NVARCHAR(80) NULL;
GO

IF COL_LENGTH('dbo.Meals', 'Ilce') IS NULL
  ALTER TABLE dbo.Meals ADD Ilce NVARCHAR(80) NULL;
GO

IF COL_LENGTH('dbo.Meals', 'Mahalle') IS NULL
  ALTER TABLE dbo.Meals ADD Mahalle NVARCHAR(120) NULL;
GO

IF COL_LENGTH('dbo.Meals', 'Sokak') IS NULL
  ALTER TABLE dbo.Meals ADD Sokak NVARCHAR(160) NULL;
GO

IF COL_LENGTH('dbo.Meals', 'BinaNo') IS NULL
  ALTER TABLE dbo.Meals ADD BinaNo NVARCHAR(40) NULL;
GO

IF COL_LENGTH('dbo.Meals', 'Kat') IS NULL
  ALTER TABLE dbo.Meals ADD Kat NVARCHAR(20) NULL;
GO

IF COL_LENGTH('dbo.Meals', 'DaireNo') IS NULL
  ALTER TABLE dbo.Meals ADD DaireNo NVARCHAR(20) NULL;
GO

IF COL_LENGTH('dbo.Meals', 'AcikAdres') IS NULL
  ALTER TABLE dbo.Meals ADD AcikAdres NVARCHAR(500) NULL;
GO
