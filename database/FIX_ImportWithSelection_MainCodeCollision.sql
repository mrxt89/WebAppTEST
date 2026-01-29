/*
  Fix: Importazione BOM "IMPORT_WITH_SELECTION" fallisce quando la generazione del
  codice articolo principale (logica semplificata) produce un codice già esistente.

  Sintomo tipico:
    "Errore generazione codice articolo principale: ERRORE CRITICO: Codice generato ... già esistente"

  Strategia:
  - Patch del blocco nella SP dbo.MA_ProjectArticles_ImportWithSelection:
    invece di abortire, prova a trovare il primo codice libero incrementando il valore numerico
    (mantiene formato a lunghezza @TotalLength). Se non numerico, fallback a GenerateTempItemCode.

  NOTE:
  - Non riscrive l'intera SP: sostituisce solo il blocco specifico tramite sys.sql_modules.
  - Esegue ALTER PROCEDURE sul testo risultante.
*/

SET NOCOUNT ON;
GO

DECLARE @ProcName SYSNAME = N'MA_ProjectArticles_ImportWithSelection';
DECLARE @SchemaName SYSNAME = N'dbo';

DECLARE @Definition NVARCHAR(MAX);
SELECT @Definition = m.definition
FROM sys.sql_modules m
INNER JOIN sys.objects o ON o.object_id = m.object_id
INNER JOIN sys.schemas s ON s.schema_id = o.schema_id
WHERE o.type = 'P'
  AND o.name = @ProcName
  AND s.name = @SchemaName;

IF @Definition IS NULL
BEGIN
  RAISERROR(N'Procedura %s.%s non trovata in sys.sql_modules.', 16, 1, @SchemaName, @ProcName);
  RETURN;
END

DECLARE @OldBlock NVARCHAR(MAX) = N'
                IF @MainCodeError IS NOT NULL OR @MainItemCode IS NULL
                BEGIN
                    SET @ErrorCode = 999;
                    SET @ErrorMessage = ''Errore generazione codice articolo principale: '' + ISNULL(@MainCodeError, ''codice NULL'');
                    PRINT @ErrorMessage;
                    IF @NeedCommit = 1 AND @TranCount = 0
                        ROLLBACK TRANSACTION;
                    RETURN;
                END
';

DECLARE @NewBlock NVARCHAR(MAX) = N'
                IF @MainCodeError IS NOT NULL OR @MainItemCode IS NULL
                BEGIN
                    -- Non abortire: se il codice è già esistente, prova a trovare il primo codice libero.
                    PRINT ''AVVISO generazione codice articolo principale: '' + ISNULL(@MainCodeError, ''codice NULL'');

                    IF @MainItemCode IS NULL
                    BEGIN
                        -- Fallback totale
                        SET @MainItemCode = dbo.GenerateTempItemCode(@CompanyId);
                        PRINT ''Fallback TMP per articolo principale: '' + @SourceItem + '' -> '' + @MainItemCode;
                    END
                    ELSE
                    BEGIN
                        DECLARE @CandidateCode VARCHAR(64) = @MainItemCode;
                        DECLARE @CandidateNum BIGINT = TRY_CONVERT(BIGINT, @CandidateCode);

                        IF @CandidateNum IS NULL
                        BEGIN
                            -- Se non numerico non possiamo incrementare mantenendo formato: fallback TMP
                            SET @MainItemCode = dbo.GenerateTempItemCode(@CompanyId);
                            PRINT ''Fallback TMP (codice non numerico) per articolo principale: '' + @SourceItem + '' -> '' + @MainItemCode;
                        END
                        ELSE
                        BEGIN
                            -- Incrementa finché non troviamo un codice libero (controllo su Progetti + ERP)
                            WHILE EXISTS (SELECT 1 FROM dbo.MA_ProjectArticles_Items WHERE CompanyId = @CompanyId AND Item = @CandidateCode)
                               OR EXISTS (SELECT 1 FROM dbo.MA_Items WHERE CompanyId = @CompanyId AND Item = @CandidateCode)
                            BEGIN
                                SET @CandidateNum = @CandidateNum + 1;
                                SET @CandidateCode = RIGHT(REPLICATE(''0'', @TotalLength) + CAST(@CandidateNum AS VARCHAR(64)), @TotalLength);
                            END

                            SET @MainItemCode = @CandidateCode;
                            PRINT ''Codice articolo principale risolto (unique): '' + @SourceItem + '' -> '' + @MainItemCode;
                        END
                    END

                    -- Reset errore: abbiamo risolto/forzato un codice valido
                    SET @MainCodeError = NULL;
                END
';

DECLARE @Patched NVARCHAR(MAX) = REPLACE(@Definition, @OldBlock, @NewBlock);

IF @Patched = @Definition
BEGIN
  PRINT N'Patch non applicata: blocco target non trovato (la SP potrebbe essere già aggiornata o differire).';
  RETURN;
END

-- Converti CREATE PROCEDURE -> ALTER PROCEDURE per poter applicare il patch
SET @Patched = REPLACE(@Patched, N'CREATE PROCEDURE', N'ALTER PROCEDURE');

EXEC sp_executesql @Patched;

PRINT N'Patch applicata con successo a ' + QUOTENAME(@SchemaName) + N'.' + QUOTENAME(@ProcName) + N'.';
GO

