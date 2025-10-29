-- ================================================================================
-- FIX INTERCOMPANY - RIEPILOGO MODIFICHE
-- ================================================================================
-- Data: 29/10/2025
-- Autore: Claude Code
--
-- PROBLEMI RISOLTI:
--
-- 1. PROBLEMA #1: Validazione codice troppo restrittiva
--    - SITUAZIONE: Quando CBL o TECNOLINE vogliono modificare il codice temporaneo
--      nella pagina Intercompany, il sistema richiedeva che il codice esistesse
--      già in MA_Items (gestionale), bloccando la possibilità di assegnare un nuovo
--      codice non ancora presente nel gestionale.
--
--    - SOLUZIONE: Modificata la funzione replaceTemporaryItem nel backend
--      (projectArticlesManagement.js) per permettere la RINOMINA del codice
--      temporaneo invece di cercare un articolo esistente. Ora valida solo che
--      il codice sia univoco e valido usando MA_ProjectArticles_ValidateItemCode.
--
--    - FILE MODIFICATI:
--      * backend/queries/projectArticlesManagement.js (funzione replaceTemporaryItem)
--
-- 2. PROBLEMA #2: Codice non sincronizzato dopo modifica dalla dashboard
--    - SITUAZIONE: Quando si modifica il codice di un articolo dalla dashboard
--      (Tab Articoli > Modifica), il campo Item in MA_ProjectArticles_Items
--      viene aggiornato, ma TargetProjectItemCode in MA_ProjectArticles_References
--      rimane invariato, causando visualizzazione errata nella pagina Intercompany.
--
--    - SOLUZIONE: Creato un TRIGGER su MA_ProjectArticles_Items che sincronizza
--      automaticamente TargetProjectItemCode ogni volta che Item viene modificato.
--
--    - FILE SQL DA ESEGUIRE:
--      * FIX_IntercompanyItemCodeSync.sql (crea il trigger)
--      * FIX_IntercompanySyncExistingCodes.sql (sincronizza codici già esistenti)
--
-- ================================================================================
-- ISTRUZIONI PER L'INSTALLAZIONE
-- ================================================================================
--
-- PASSO 1: BACKUP
-- ----------------
-- Prima di procedere, esegui un backup del database:
--
--    BACKUP DATABASE [WebAppTEST]
--    TO DISK = 'C:\Backup\WebAppTEST_BeforeIntercompanyFix_20251029.bak'
--    WITH FORMAT, INIT, NAME = 'Full Database Backup', SKIP, NOREWIND, NOUNLOAD, STATS = 10;
--
-- PASSO 2: ESEGUI GLI SCRIPT SQL IN ORDINE
-- -----------------------------------------
-- 1. FIX_IntercompanyItemCodeSync.sql
--    Crea il trigger per sincronizzazione automatica
--
-- 2. FIX_IntercompanySyncExistingCodes.sql
--    Sincronizza tutti i codici esistenti già disallineati
--
-- PASSO 3: RIAVVIA IL BACKEND
-- ---------------------------
-- Dopo aver eseguito gli script SQL, riavvia il backend Node.js
-- per caricare le modifiche alla funzione replaceTemporaryItem
--
-- PASSO 4: TEST
-- -------------
-- 1. Accedi come utente di CBL o TECNOLINE
-- 2. Vai nella pagina Intercompany
-- 3. Prova a modificare un codice temporaneo con un codice nuovo
--    (anche se non esiste nel gestionale)
-- 4. Verifica che il codice venga accettato e visualizzato correttamente
-- 5. Modifica un codice articolo dalla dashboard (Tab Articoli)
-- 6. Torna nella pagina Intercompany e verifica che il nuovo codice
--    sia sincronizzato automaticamente
--
-- ================================================================================
-- VERIFICA POST-INSTALLAZIONE
-- ================================================================================
--
-- Esegui questa query per verificare che non ci siano codici disallineati:
--
/*
SELECT
    ref.ReferenceID,
    ref.TargetProjectItemCode AS [Codice in Reference],
    item.Item AS [Codice in Item],
    CASE
        WHEN ref.TargetProjectItemCode = item.Item THEN 'OK'
        ELSE 'DISALLINEATO'
    END AS [Stato],
    sourceComp.Description AS [Azienda Source],
    targetComp.Description AS [Azienda Target]
FROM MA_ProjectArticles_References ref
INNER JOIN MA_ProjectArticles_Items item
    ON ref.TargetProjectItemId = item.Id
    AND ref.TargetCompanyId = item.CompanyId
LEFT JOIN AR_Companies sourceComp ON ref.SourceCompanyId = sourceComp.CompanyId
LEFT JOIN AR_Companies targetComp ON ref.TargetCompanyId = targetComp.CompanyId
WHERE ref.TargetProjectItemCode <> item.Item
    OR (ref.TargetProjectItemCode IS NULL AND item.Item IS NOT NULL);
*/
--
-- Se la query non restituisce risultati, tutto è sincronizzato correttamente!
--
-- ================================================================================
-- VERIFICA TRIGGER
-- ================================================================================
--
-- Esegui questa query per verificare che il trigger sia stato creato:
--
/*
SELECT
    name AS [Nome Trigger],
    OBJECT_NAME(parent_id) AS [Tabella],
    is_disabled AS [Disabilitato],
    create_date AS [Data Creazione],
    modify_date AS [Data Modifica]
FROM sys.triggers
WHERE name = 'TR_UpdateReferencesOnItemChange';
*/
--
-- Dovresti vedere una riga con il trigger attivo (is_disabled = 0)
--
-- ================================================================================
-- ROLLBACK (se necessario)
-- ================================================================================
--
-- Se qualcosa va storto e vuoi fare rollback:
--
-- 1. Elimina il trigger:
--    DROP TRIGGER [dbo].[TR_UpdateReferencesOnItemChange];
--
-- 2. Ripristina il backup del database:
--    RESTORE DATABASE [WebAppTEST]
--    FROM DISK = 'C:\Backup\WebAppTEST_BeforeIntercompanyFix_20251029.bak'
--    WITH REPLACE;
--
-- 3. Ripristina il file backend:
--    Usa git per tornare alla versione precedente:
--    git checkout HEAD -- backend/queries/projectArticlesManagement.js
--
-- ================================================================================
-- SUPPORTO
-- ================================================================================
--
-- Per qualsiasi problema o domanda, contatta lo sviluppatore
--
-- ================================================================================
