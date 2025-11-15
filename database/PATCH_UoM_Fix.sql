-- ============================================================================
-- PATCH: Fix UoM Synchronization Issue
-- Data: 2025-01-15
-- Descrizione: Corregge il problema dell'unità di misura che non viene
--              sincronizzata correttamente tra BOM e anagrafica articoli
-- ============================================================================

-- PROBLEMA 1: Linea 3503
-- Quando si sincronizza un componente temporaneo, l'UoM non viene passata
-- PRIMA: @ComponentUoM = NULL,
-- DOPO:  @ComponentUoM = @ComponentUoM,

-- PROBLEMA 2: UPDATE_COMPONENT non aggiorna BaseUoM in MA_ProjectArticles_Items
-- Quando si modifica l'UoM di un componente nella BOM, viene aggiornato solo
-- MA_ProjectArticles_BOMComponents.UoM ma NON MA_ProjectArticles_Items.BaseUoM

-- ============================================================================
-- ISTRUZIONI PER L'APPLICAZIONE
-- ============================================================================

-- 1. BACKUP DEL DATABASE PRIMA DI APPLICARE LA PATCH!

-- 2. Modifica manuale alla linea 3503 del file database/WebApp.sql:
--    Cambiare:    @ComponentUoM = NULL,
--    In:          @ComponentUoM = @ComponentUoM,

-- 3. Inserire il seguente codice DOPO la linea 4289
--    (subito dopo WHERE BOMId = @Id AND Line = @ComponentLine AND CompanyId = @CompanyId;)
--    e PRIMA della linea 4291 (-- NUOVO: Gestione aggiornamento dati fornitore)

/*

			-- NUOVO: Se l'UoM è stata modificata, aggiorna anche BaseUoM dell'articolo temporaneo
			IF @ComponentUoM IS NOT NULL
			BEGIN
				DECLARE @UpdatedComponentId BIGINT;

				-- Ottieni il ComponentId dalla BOM appena aggiornata
				SELECT @UpdatedComponentId = ComponentId
				FROM MA_ProjectArticles_BOMComponents
				WHERE BOMId = @Id AND Line = @ComponentLine AND CompanyId = @CompanyId;

				-- Aggiorna BaseUoM SOLO se l'articolo è temporaneo (stato_erp = 0)
				-- Non modificare articoli già presenti nel gestionale!
				UPDATE MA_ProjectArticles_Items
				SET BaseUoM = @ComponentUoM
				WHERE Id = @UpdatedComponentId
					AND CompanyId = @CompanyId
					AND stato_erp = 0;  -- Solo articoli temporanei
			END

*/

-- ============================================================================
-- VERIFICA POST-APPLICAZIONE
-- ============================================================================

-- Test 1: Verifica che la modifica 1 sia stata applicata
-- Cerca la linea che dovrebbe ora avere @ComponentUoM = @ComponentUoM
SELECT 'Cerca nella stored procedure MA_ProjectArticles_AddUpdateBOM circa alla linea 3503' AS Verifica1;

-- Test 2: Verifica che il nuovo blocco sia stato inserito
-- Dovrebbe esistere un UPDATE a MA_ProjectArticles_Items nella sezione UPDATE_COMPONENT
SELECT 'Cerca UPDATE MA_ProjectArticles_Items nella sezione UPDATE_COMPONENT' AS Verifica2;

-- ============================================================================
-- TEST FUNZIONALE
-- ============================================================================
/*
1. Crea una nuova BOM
2. Aggiungi un componente copiandolo da uno esistente con BaseUoM = "NR"
3. Il componente temporaneo viene creato con BaseUoM = "NR"
4. Modifica l'UoM del componente nella BOM a "MT"
5. Verifica in MA_ProjectArticles_Items che BaseUoM sia stato aggiornato a "MT"
6. Esporta in Mago
7. Verifica che:
   - MA_BillOfMaterialsComp.UoM = "MT" ✓
   - MA_Items.BaseUoM = "MT" ✓ (prima era "NR"!)
*/

-- ============================================================================
-- ROLLBACK (se necessario)
-- ============================================================================
/*
Se qualcosa va storto, ripristinare il backup del database fatto al punto 1.
*/
