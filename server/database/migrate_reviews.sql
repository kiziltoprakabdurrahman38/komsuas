-- ============================================================
-- Reviews, ortalama puan, sipariş iptal durumları (idempotent)
-- ============================================================
USE EvYemegiDB;
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF COL_LENGTH('dbo.Users', 'OrtalamaPuan') IS NULL
  ALTER TABLE dbo.Users ADD OrtalamaPuan DECIMAL(2,1) NOT NULL
    CONSTRAINT DF_Users_OrtalamaPuan DEFAULT (5.0);
GO

IF COL_LENGTH('dbo.Users', 'ToplamDegerlendirme') IS NULL
  ALTER TABLE dbo.Users ADD ToplamDegerlendirme INT NOT NULL
    CONSTRAINT DF_Users_ToplamDegerlendirme DEFAULT (0);
GO

IF COL_LENGTH('dbo.Meals', 'OrtalamaPuan') IS NULL
  ALTER TABLE dbo.Meals ADD OrtalamaPuan DECIMAL(2,1) NOT NULL
    CONSTRAINT DF_Meals_OrtalamaPuan DEFAULT (5.0);
GO

IF COL_LENGTH('dbo.Meals', 'ToplamDegerlendirme') IS NULL
  ALTER TABLE dbo.Meals ADD ToplamDegerlendirme INT NOT NULL
    CONSTRAINT DF_Meals_ToplamDegerlendirme DEFAULT (0);
GO

IF EXISTS (
  SELECT 1 FROM sys.check_constraints
  WHERE name = N'CK_Orders_Durum' AND parent_object_id = OBJECT_ID(N'dbo.Orders')
)
  ALTER TABLE dbo.Orders DROP CONSTRAINT CK_Orders_Durum;
GO

ALTER TABLE dbo.Orders WITH CHECK
ADD CONSTRAINT CK_Orders_Durum CHECK (
  Durum IN (
    N'Beklemede',
    N'Onaylandi',
    N'TeslimEdildi',
    N'Iptal',
    N'AliciGelmedi',
    N'AsciIptal'
  )
);
GO

IF EXISTS (
  SELECT 1 FROM sys.check_constraints
  WHERE name = N'CK_WalletTransactions_IslemTipi'
    AND parent_object_id = OBJECT_ID(N'dbo.WalletTransactions')
)
  ALTER TABLE dbo.WalletTransactions DROP CONSTRAINT CK_WalletTransactions_IslemTipi;
GO

ALTER TABLE dbo.WalletTransactions WITH CHECK
ADD CONSTRAINT CK_WalletTransactions_IslemTipi CHECK (
  IslemTipi IN (
    N'HosGeldin',
    N'BakiyeYukleme',
    N'KaporaOdeme',
    N'KaporaIade',
    N'KaporaAktarim',
    N'KaporaKesinti'
  )
);
GO

IF OBJECT_ID(N'dbo.Reviews', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Reviews (
    Id       INT            IDENTITY(1,1) NOT NULL CONSTRAINT PK_Reviews PRIMARY KEY,
    OrderId  INT            NOT NULL,
    MealId   INT            NOT NULL,
    BuyerId  INT            NOT NULL,
    CookId   INT            NOT NULL,
    Puan     INT            NOT NULL,
    Yorum    NVARCHAR(500)  NULL,
    Tarih    DATETIME       NOT NULL CONSTRAINT DF_Reviews_Tarih DEFAULT (GETDATE()),
    CONSTRAINT FK_Reviews_Order FOREIGN KEY (OrderId) REFERENCES dbo.Orders (Id),
    CONSTRAINT FK_Reviews_Meal  FOREIGN KEY (MealId)  REFERENCES dbo.Meals  (Id),
    CONSTRAINT FK_Reviews_Buyer FOREIGN KEY (BuyerId) REFERENCES dbo.Users  (Id),
    CONSTRAINT FK_Reviews_Cook  FOREIGN KEY (CookId)  REFERENCES dbo.Users  (Id),
    CONSTRAINT CK_Reviews_Puan CHECK (Puan BETWEEN 1 AND 5),
    CONSTRAINT UQ_Reviews_OrderId UNIQUE (OrderId)
  );
END
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'IX_Reviews_CookId' AND object_id = OBJECT_ID(N'dbo.Reviews')
)
  CREATE NONCLUSTERED INDEX IX_Reviews_CookId ON dbo.Reviews (CookId);
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'IX_Reviews_MealId' AND object_id = OBJECT_ID(N'dbo.Reviews')
)
  CREATE NONCLUSTERED INDEX IX_Reviews_MealId ON dbo.Reviews (MealId);
GO
