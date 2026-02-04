-- ===============================================================================
-- 20260204_02: Stored Procedure per sincronizzare campi hardcoded dal JSON
-- ===============================================================================
-- DESCRIZIONE:
-- Sincronizza i campi hardcoded (Diameter, Bxh, Depth, Length, MediumRadius) 
-- dal campo TechnicalCharacteristicsJSON.
-- 
-- MAPPING:
-- - DIAMETRO/DIAMETER → Diameter
-- - BxH/BXH → Bxh
-- - PROFONDITA/DEPTH → Depth
-- - LUNGHEZZA/LENGTH → Length
-- - RAGGIO/RAGGIO_MEDIO/RAGGIOM/RADIUS → MediumRadius
-- - SPESSORE/THICKNESS → (non mappato, campo non presente nella tabella)
--
-- USO:
-- - Chiamata automatica dopo salvataggio ricodifica
-- - Può essere chiamata manualmente per sincronizzare articoli esistenti
-- ===============================================================================

USE [WebAppTEST]
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'MA_SyncTechnicalCharacteristicsFromJSON')
    DROP PROCEDURE [dbo].[MA_SyncTechnicalCharacteristicsFromJSON];
GO

CREATE PROCEDURE [dbo].[MA_SyncTechnicalCharacteristicsFromJSON]
    @ItemId BIGINT = NULL,  -- Se NULL, sincronizza tutti gli articoli con JSON
    @CompanyId INT = NULL   -- Se NULL, usa CompanyId dell'articolo
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @RowsUpdated INT = 0;
    
    -- Se @ItemId è specificato, sincronizza solo quell'articolo
    IF @ItemId IS NOT NULL
    BEGIN
        DECLARE @ActualCompanyId INT;
        
        -- Ottieni CompanyId se non specificato
        IF @CompanyId IS NULL
        BEGIN
            SELECT @ActualCompanyId = CompanyId
            FROM dbo.MA_ProjectArticles_Items
            WHERE Id = @ItemId;
        END
        ELSE
        BEGIN
            SET @ActualCompanyId = @CompanyId;
        END
        
        -- Sincronizza i campi hardcoded dal JSON
        UPDATE dbo.MA_ProjectArticles_Items
        SET 
            -- Diameter: cerca DIAMETRO o DIAMETER
            Diameter = CASE 
                WHEN TechnicalCharacteristicsJSON IS NOT NULL 
                THEN TRY_CAST(
                    ISNULL(
                        JSON_VALUE(TechnicalCharacteristicsJSON, '$.DIAMETRO'),
                        JSON_VALUE(TechnicalCharacteristicsJSON, '$.DIAMETER')
                    ) AS FLOAT
                )
                ELSE Diameter
            END,
            
            -- Bxh: cerca BxH o BXH
            Bxh = CASE 
                WHEN TechnicalCharacteristicsJSON IS NOT NULL 
                THEN ISNULL(
                    JSON_VALUE(TechnicalCharacteristicsJSON, '$.BxH'),
                    JSON_VALUE(TechnicalCharacteristicsJSON, '$.BXH')
                )
                ELSE Bxh
            END,
            
            -- Depth: cerca PROFONDITA o DEPTH
            Depth = CASE 
                WHEN TechnicalCharacteristicsJSON IS NOT NULL 
                THEN TRY_CAST(
                    ISNULL(
                        JSON_VALUE(TechnicalCharacteristicsJSON, '$.PROFONDITA'),
                        JSON_VALUE(TechnicalCharacteristicsJSON, '$.DEPTH')
                    ) AS FLOAT
                )
                ELSE Depth
            END,
            
            -- Length: cerca LUNGHEZZA o LENGTH
            Length = CASE 
                WHEN TechnicalCharacteristicsJSON IS NOT NULL 
                THEN TRY_CAST(
                    ISNULL(
                        JSON_VALUE(TechnicalCharacteristicsJSON, '$.LUNGHEZZA'),
                        JSON_VALUE(TechnicalCharacteristicsJSON, '$.LENGTH')
                    ) AS FLOAT
                )
                ELSE Length
            END,
            
            -- MediumRadius: cerca RAGGIO, RAGGIO_MEDIO, RAGGIOM o RADIUS
            MediumRadius = CASE 
                WHEN TechnicalCharacteristicsJSON IS NOT NULL 
                THEN TRY_CAST(
                    ISNULL(
                        JSON_VALUE(TechnicalCharacteristicsJSON, '$.RAGGIO'),
                        ISNULL(
                            JSON_VALUE(TechnicalCharacteristicsJSON, '$.RAGGIO_MEDIO'),
                            ISNULL(
                                JSON_VALUE(TechnicalCharacteristicsJSON, '$.RAGGIOM'),
                                JSON_VALUE(TechnicalCharacteristicsJSON, '$.RADIUS')
                            )
                        )
                    ) AS FLOAT
                )
                ELSE MediumRadius
            END
            
        WHERE Id = @ItemId
            AND CompanyId = @ActualCompanyId
            AND TechnicalCharacteristicsJSON IS NOT NULL
            AND LEN(TechnicalCharacteristicsJSON) > 2; -- Almeno "{}"
        
        SET @RowsUpdated = @@ROWCOUNT;
        
        PRINT 'Sincronizzati ' + CAST(@RowsUpdated AS VARCHAR(10)) + ' articolo/i (ItemId: ' + CAST(@ItemId AS VARCHAR(20)) + ')';
    END
    ELSE
    BEGIN
        -- Sincronizza tutti gli articoli con JSON (batch)
        UPDATE dbo.MA_ProjectArticles_Items
        SET 
            Diameter = CASE 
                WHEN TechnicalCharacteristicsJSON IS NOT NULL 
                THEN TRY_CAST(
                    ISNULL(
                        JSON_VALUE(TechnicalCharacteristicsJSON, '$.DIAMETRO'),
                        JSON_VALUE(TechnicalCharacteristicsJSON, '$.DIAMETER')
                    ) AS FLOAT
                )
                ELSE Diameter
            END,
            
            Bxh = CASE 
                WHEN TechnicalCharacteristicsJSON IS NOT NULL 
                THEN ISNULL(
                    JSON_VALUE(TechnicalCharacteristicsJSON, '$.BxH'),
                    JSON_VALUE(TechnicalCharacteristicsJSON, '$.BXH')
                )
                ELSE Bxh
            END,
            
            Depth = CASE 
                WHEN TechnicalCharacteristicsJSON IS NOT NULL 
                THEN TRY_CAST(
                    ISNULL(
                        JSON_VALUE(TechnicalCharacteristicsJSON, '$.PROFONDITA'),
                        JSON_VALUE(TechnicalCharacteristicsJSON, '$.DEPTH')
                    ) AS FLOAT
                )
                ELSE Depth
            END,
            
            Length = CASE 
                WHEN TechnicalCharacteristicsJSON IS NOT NULL 
                THEN TRY_CAST(
                    ISNULL(
                        JSON_VALUE(TechnicalCharacteristicsJSON, '$.LUNGHEZZA'),
                        JSON_VALUE(TechnicalCharacteristicsJSON, '$.LENGTH')
                    ) AS FLOAT
                )
                ELSE Length
            END,
            
            MediumRadius = CASE 
                WHEN TechnicalCharacteristicsJSON IS NOT NULL 
                THEN TRY_CAST(
                    ISNULL(
                        JSON_VALUE(TechnicalCharacteristicsJSON, '$.RAGGIO'),
                        ISNULL(
                            JSON_VALUE(TechnicalCharacteristicsJSON, '$.RAGGIO_MEDIO'),
                            ISNULL(
                                JSON_VALUE(TechnicalCharacteristicsJSON, '$.RAGGIOM'),
                                JSON_VALUE(TechnicalCharacteristicsJSON, '$.RADIUS')
                            )
                        )
                    ) AS FLOAT
                )
                ELSE MediumRadius
            END
            
        WHERE TechnicalCharacteristicsJSON IS NOT NULL
            AND LEN(TechnicalCharacteristicsJSON) > 2;
        
        SET @RowsUpdated = @@ROWCOUNT;
        
        PRINT 'Sincronizzati ' + CAST(@RowsUpdated AS VARCHAR(10)) + ' articoli in batch';
    END
    
    RETURN @RowsUpdated;
END
GO

PRINT '========================================'
PRINT 'Stored Procedure creata:'
PRINT 'MA_SyncTechnicalCharacteristicsFromJSON'
PRINT '========================================'
PRINT ''
PRINT 'USO:'
PRINT '  -- Sincronizza un articolo specifico'
PRINT '  EXEC MA_SyncTechnicalCharacteristicsFromJSON @ItemId = 12345;'
PRINT ''
PRINT '  -- Sincronizza tutti gli articoli con JSON'
PRINT '  EXEC MA_SyncTechnicalCharacteristicsFromJSON;'
PRINT ''
GO
