-- =============================================================================
-- STORED PROCEDURES HELPER PER GESTIONE INTERCOMPANY SU COMPONENTI TEMPORANEI
-- =============================================================================
-- Creato: 2025-01-16
-- Descrizione: Stored procedure di supporto per verificare esistenza codici
--              nel gestionale e recuperare lista fornitori con flag Intercompany
-- =============================================================================

USE [WebApp]
GO

-- =============================================================================
-- 1. VERIFICA ESISTENZA CODICE NEL GESTIONALE
-- =============================================================================
-- Descrizione: Verifica se un codice articolo esiste in MA_Items e restituisce
--              le informazioni del fornitore e del collegamento Intercompany
-- =============================================================================

IF OBJECT_ID('dbo.MA_ProjectArticles_CheckItemInGestionale', 'P') IS NOT NULL
    DROP PROCEDURE dbo.MA_ProjectArticles_CheckItemInGestionale;
GO

CREATE PROCEDURE [dbo].[MA_ProjectArticles_CheckItemInGestionale]
    @CompanyId INT,
    @ItemCode VARCHAR(64),
    @Exists BIT OUTPUT,
    @SupplierId VARCHAR(12) OUTPUT,
    @SupplierName NVARCHAR(255) OUTPUT,
    @IsIntercompany BIT OUTPUT,
    @IntercompanyTargetId INT OUTPUT,
    @IntercompanyTargetName NVARCHAR(255) OUTPUT,
    @ErrorCode INT OUTPUT,
    @ErrorMessage NVARCHAR(4000) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    -- Inizializzazione variabili output
    SET @Exists = 0;
    SET @SupplierId = NULL;
    SET @SupplierName = NULL;
    SET @IsIntercompany = 0;
    SET @IntercompanyTargetId = NULL;
    SET @IntercompanyTargetName = NULL;
    SET @ErrorCode = 0;
    SET @ErrorMessage = N'';

    BEGIN TRY
        -- Validazione parametri
        IF @CompanyId IS NULL OR @CompanyId <= 0
        BEGIN
            SET @ErrorCode = 1;
            SET @ErrorMessage = N'CompanyId non valido.';
            RETURN;
        END

        IF @ItemCode IS NULL OR LTRIM(RTRIM(@ItemCode)) = ''
        BEGIN
            SET @ErrorCode = 2;
            SET @ErrorMessage = N'ItemCode non valido.';
            RETURN;
        END

        -- Verifica se esiste in MA_Items
        IF EXISTS (
            SELECT 1 FROM MA_Items
            WHERE Item = @ItemCode AND CompanyId = @CompanyId
        )
        BEGIN
            SET @Exists = 1;

            -- Recupera dati fornitore
            SELECT
                @SupplierId = goodsData.Supplier,
                @SupplierName = cs.CompanyName,
                @IsIntercompany = CASE WHEN cs.IntercompanyId IS NOT NULL THEN 1 ELSE 0 END,
                @IntercompanyTargetId = cs.IntercompanyId,
                @IntercompanyTargetName = targetComp.Description
            FROM MA_Items item
            LEFT JOIN MA_ItemsGoodsData goodsData
                ON item.Item = goodsData.Item AND item.CompanyId = goodsData.CompanyId
            LEFT JOIN MA_CustSupp cs
                ON goodsData.Supplier = cs.CustSupp
                AND goodsData.CompanyId = cs.CompanyId
                AND cs.CustSuppType = 3211265  -- Solo fornitori
            LEFT JOIN AR_Companies targetComp
                ON cs.IntercompanyId = targetComp.CompanyId
            WHERE item.Item = @ItemCode
              AND item.CompanyId = @CompanyId;
        END

    END TRY
    BEGIN CATCH
        SET @ErrorCode = ERROR_NUMBER();
        SET @ErrorMessage = ERROR_MESSAGE();
    END CATCH
END
GO

-- =============================================================================
-- 2. LISTA FORNITORI CON FLAG INTERCOMPANY
-- =============================================================================
-- Descrizione: Restituisce la lista dei fornitori con indicazione se sono
--              Intercompany e verso quale azienda
-- =============================================================================

IF OBJECT_ID('dbo.MA_ProjectArticles_GetSuppliersWithIntercompanyFlag', 'P') IS NOT NULL
    DROP PROCEDURE dbo.MA_ProjectArticles_GetSuppliersWithIntercompanyFlag;
GO

CREATE PROCEDURE [dbo].[MA_ProjectArticles_GetSuppliersWithIntercompanyFlag]
    @CompanyId INT,
    @OnlyIntercompany BIT = 0,  -- Se 1, ritorna solo fornitori Intercompany
    @ErrorCode INT OUTPUT,
    @ErrorMessage NVARCHAR(4000) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    -- Inizializzazione variabili output
    SET @ErrorCode = 0;
    SET @ErrorMessage = N'';

    BEGIN TRY
        -- Validazione parametri
        IF @CompanyId IS NULL OR @CompanyId <= 0
        BEGIN
            SET @ErrorCode = 1;
            SET @ErrorMessage = N'CompanyId non valido.';
            RETURN;
        END

        -- Restituisce lista fornitori
        SELECT
            cs.CustSupp AS SupplierId,
            cs.CompanyName AS SupplierName,
            CASE WHEN cs.IntercompanyId IS NOT NULL THEN 1 ELSE 0 END AS IsIntercompany,
            cs.IntercompanyId AS IntercompanyTargetId,
            targetComp.Description AS IntercompanyTargetName,
            targetComp.CompanyName AS IntercompanyTargetCompanyName
        FROM MA_CustSupp cs
        LEFT JOIN AR_Companies targetComp
            ON cs.IntercompanyId = targetComp.CompanyId
        WHERE cs.CompanyId = @CompanyId
          AND cs.CustSuppType = 3211265  -- Solo fornitori
          AND (@OnlyIntercompany = 0 OR cs.IntercompanyId IS NOT NULL)
        ORDER BY cs.CompanyName;

    END TRY
    BEGIN CATCH
        SET @ErrorCode = ERROR_NUMBER();
        SET @ErrorMessage = ERROR_MESSAGE();
    END CATCH
END
GO

-- =============================================================================
-- GRANT PERMISSIONS (opzionale - adattare ai vostri ruoli)
-- =============================================================================
-- GRANT EXECUTE ON dbo.MA_ProjectArticles_CheckItemInGestionale TO [YourRole];
-- GRANT EXECUTE ON dbo.MA_ProjectArticles_GetSuppliersWithIntercompanyFlag TO [YourRole];

PRINT 'Stored procedures helper Intercompany create con successo!';
GO
