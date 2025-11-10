-- =====================================================
-- MIGRAZIONE: Ricostruzione Descrizione da Codice
-- Data: 2025-11-10
-- Descrizione: Aggiunge stored procedure per ricostruire la descrizione
--              dalla parte di codice mantenuta (es. RCANCSP)
-- =====================================================

-- =====================================================
-- STORED PROCEDURE: Ricostruisci Descrizione da Prefisso
-- =====================================================
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'MA_CodingRules_ReconstructDescriptionFromCode')
    DROP PROCEDURE MA_CodingRules_ReconstructDescriptionFromCode;
GO

CREATE PROCEDURE MA_CodingRules_ReconstructDescriptionFromCode
    @CompanyId INT,
    @CodePrefix VARCHAR(14),
    @CharactersToKeep INT,
    @ReconstructedDescription NVARCHAR(512) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    -- Variabili per estrarre i codici
    DECLARE @MacroFamilyCode VARCHAR(3);
    DECLARE @FamilyCode VARCHAR(5);
    DECLARE @TypeCode VARCHAR(5);

    -- Variabili per le descrizioni
    DECLARE @MacroFamilyDesc NVARCHAR(512);
    DECLARE @FamilyDesc NVARCHAR(512);
    DECLARE @TypeDesc NVARCHAR(512);

    -- Variabili per gli ID
    DECLARE @MacroFamilyId BIGINT;
    DECLARE @FamilyId BIGINT;

    -- Tabella per costruire la descrizione
    DECLARE @DescriptionParts TABLE (
        PartOrder INT,
        PartDescription NVARCHAR(512)
    );

    -- =====================================================
    -- LOGICA DI ESTRAZIONE BASATA SU CharactersToKeep
    -- =====================================================

    -- Con 7 caratteri: MacroFamily(1) + Family(3) + Type(3)
    -- Con 10 caratteri: MacroFamily(1) + Family(3) + Type(3) + Alias(3)
    -- Con 4 caratteri: MacroFamily(1) + Family(3)

    IF @CharactersToKeep >= 1
    BEGIN
        -- Estrai MacroFamily (primo carattere)
        SET @MacroFamilyCode = LEFT(@CodePrefix, 1);
    END

    IF @CharactersToKeep >= 4
    BEGIN
        -- Estrai Family (caratteri 2-4)
        SET @FamilyCode = SUBSTRING(@CodePrefix, 2, 3);
    END

    IF @CharactersToKeep >= 7
    BEGIN
        -- Estrai Type (caratteri 5-7)
        SET @TypeCode = SUBSTRING(@CodePrefix, 5, 3);
    END

    -- =====================================================
    -- LOOKUP NELLE TABELLE
    -- =====================================================

    -- 1. Cerca MacroFamily
    IF @MacroFamilyCode IS NOT NULL
    BEGIN
        SELECT TOP 1
            @MacroFamilyId = mf.Id,
            @MacroFamilyDesc = mf.Description
        FROM MA_CodingRules_MacroFamilies mf
        INNER JOIN MA_CodingRules_Categories cat ON cat.Id = mf.CategoryId
        WHERE mf.CompanyId = @CompanyId
            AND cat.Code = @MacroFamilyCode
            AND mf.IsActive = 1
        ORDER BY mf.CreateDate DESC;

        -- Aggiungi descrizione se trovata
        IF @MacroFamilyDesc IS NOT NULL
        BEGIN
            INSERT INTO @DescriptionParts (PartOrder, PartDescription)
            VALUES (1, @MacroFamilyDesc);
        END
    END

    -- 2. Cerca Family (se abbiamo trovato MacroFamily)
    IF @MacroFamilyId IS NOT NULL AND @FamilyCode IS NOT NULL AND @FamilyCode != '000'
    BEGIN
        SELECT TOP 1
            @FamilyId = f.Id,
            @FamilyDesc = f.Description
        FROM MA_CodingRules_Families f
        WHERE f.CompanyId = @CompanyId
            AND f.MacroFamilyId = @MacroFamilyId
            AND f.Code = @FamilyCode
            AND f.IsActive = 1
        ORDER BY f.CreateDate DESC;

        -- Aggiungi descrizione se trovata
        IF @FamilyDesc IS NOT NULL
        BEGIN
            INSERT INTO @DescriptionParts (PartOrder, PartDescription)
            VALUES (2, @FamilyDesc);
        END
    END

    -- 3. Cerca Type (se abbiamo trovato Family)
    IF @FamilyId IS NOT NULL AND @TypeCode IS NOT NULL AND @TypeCode != '000'
    BEGIN
        SELECT TOP 1
            @TypeDesc = t.Description
        FROM MA_CodingRules_Types t
        WHERE t.CompanyId = @CompanyId
            AND t.FamilyId = @FamilyId
            AND t.Code = @TypeCode
            AND t.IsActive = 1
        ORDER BY t.CreateDate DESC;

        -- Aggiungi descrizione se trovata
        IF @TypeDesc IS NOT NULL
        BEGIN
            INSERT INTO @DescriptionParts (PartOrder, PartDescription)
            VALUES (3, @TypeDesc);
        END
    END

    -- =====================================================
    -- COSTRUZIONE DESCRIZIONE FINALE
    -- =====================================================

    -- Se abbiamo trovato almeno una parte, concatena con " - "
    IF EXISTS (SELECT 1 FROM @DescriptionParts)
    BEGIN
        SELECT @ReconstructedDescription = STRING_AGG(PartDescription, ' - ')
            WITHIN GROUP (ORDER BY PartOrder)
        FROM @DescriptionParts;
    END
    ELSE
    BEGIN
        -- Nessun match trovato, restituisci NULL
        -- Il backend userà la descrizione originale
        SET @ReconstructedDescription = NULL;
    END
END
GO

PRINT '✓ Stored Procedure MA_CodingRules_ReconstructDescriptionFromCode creata';
GO

-- =====================================================
-- TEST (opzionale - commentare in produzione)
-- =====================================================
/*
DECLARE @Result NVARCHAR(512);
EXEC MA_CodingRules_ReconstructDescriptionFromCode
    @CompanyId = 1,
    @CodePrefix = 'RCANCSP',
    @CharactersToKeep = 7,
    @ReconstructedDescription = @Result OUTPUT;

SELECT @Result AS DescrizioneRicostruita;
*/
