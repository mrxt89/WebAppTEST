-- =============================================
-- FIX: Stored Procedure LinkDocumentToNotification
-- Data: 2025-10-15
-- Problema: I campi IntercompanyReference (ReferenceId, ComponentCode, SourceCompanyId, TargetCompanyId)
--           non vengono salvati nella tabella AR_NotificationLinks
-- Soluzione: Aggiungere questi campi all'INSERT principale
-- =============================================

USE [WebAppTEST]
GO

-- Drop della procedura esistente
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[LinkDocumentToNotification]') AND type in (N'P', N'PC'))
DROP PROCEDURE [dbo].[LinkDocumentToNotification]
GO

CREATE PROCEDURE [dbo].[LinkDocumentToNotification]
    @NotificationId int,
    @CompanyId int,
    @DocumentType varchar(50),
    @BOM varchar(50) = NULL,
    @ProjectID int = 0,
    @TaskID int = 0,
    @MOId int = 0,
    @SaleOrdId int = 0,
    @SerialNo varchar(50) = NULL,
    @PurchaseOrdId int = 0,
    @SaleDocId int = 0,
    @PurchaseDocId int = 0,
    @ItemCode varchar(21) = NULL,
    @CustSuppType int = 0,
    @CustSuppCode varchar(12) = NULL,
    @ReferenceId int = 0,           -- Parametro per IntercompanyReference
    @ComponentCode varchar(50) = NULL, -- Parametro per ComponentCode
    @SourceCompanyId int = 0,       -- Parametro per SourceCompanyId
    @TargetCompanyId int = 0        -- Parametro per TargetCompanyId
AS
BEGIN
    SET NOCOUNT ON;

    -- Verificare se la notifica esiste
    IF NOT EXISTS (SELECT 1 FROM AR_Notifications WHERE notificationId = @NotificationId)
    BEGIN
        RAISERROR('Notifica non trovata', 16, 1);
        RETURN;
    END

    -- Verificare se l'azienda esiste
    IF NOT EXISTS (SELECT 1 FROM AR_Companies WHERE CompanyId = @CompanyId AND IsActive = 1)
    BEGIN
        RAISERROR('Azienda non trovata o non attiva', 16, 1);
        RETURN;
    END

    -- Verifica che almeno un identificatore di documento sia specificato
    IF @DocumentType = 'MO' AND @MOId = 0
        RAISERROR('Per documenti di tipo MO, specificare un MOId valido', 16, 1);
    ELSE IF @DocumentType = 'SaleOrd' AND @SaleOrdId = 0
        RAISERROR('Per documenti di tipo SaleOrd, specificare un SaleOrdId valido', 16, 1);
    ELSE IF @DocumentType = 'PurchaseOrd' AND @PurchaseOrdId = 0
        RAISERROR('Per documenti di tipo PurchaseOrd, specificare un PurchaseOrdId valido', 16, 1);
    ELSE IF @DocumentType = 'SaleDoc' AND @SaleDocId = 0
        RAISERROR('Per documenti di tipo SaleDoc, specificare un SaleDocId valido', 16, 1);
    ELSE IF @DocumentType = 'PurchaseDoc' AND @PurchaseDocId = 0
        RAISERROR('Per documenti di tipo PurchaseDoc, specificare un PurchaseDocId valido', 16, 1);
    ELSE IF @DocumentType = 'Item' AND @ItemCode IS NULL
        RAISERROR('Per documenti di tipo Item, specificare un ItemCode valido', 16, 1);
    ELSE IF @DocumentType = 'CustSupp' AND (@CustSuppCode IS NULL OR @CustSuppType = 0)
        RAISERROR('Per documenti di tipo CustSupp, specificare CustSuppCode e CustSuppType validi', 16, 1);
    ELSE IF @DocumentType = 'BillOfMaterials' AND @BOM IS NULL
        RAISERROR('Per documenti di tipo BillOfMaterials, specificare un BOM valido', 16, 1);
    ELSE IF @DocumentType = 'Task' AND @TaskID = 0
        RAISERROR('Per documenti di tipo Task, specificare un TaskID valido', 16, 1);
    ELSE IF @DocumentType = 'Project' AND @ProjectID = 0
        RAISERROR('Per documenti di tipo Project, specificare un ProjectID valido', 16, 1);
    ELSE IF @DocumentType = 'IntercompanyReference' AND @ReferenceId = 0
        RAISERROR('Per documenti di tipo IntercompanyReference, specificare un ReferenceId valido', 16, 1);

    -- Dichiarazione variabili per gestire il risultato
    DECLARE @LinkId int;
    DECLARE @ProjectLinked bit = 0;
    DECLARE @ActualProjectID int;

    -- Se stiamo collegando una Task, verifichiamo se dobbiamo collegare anche il progetto
    IF @DocumentType = 'Task' AND @TaskID > 0
    BEGIN
        -- Recupera il ProjectID della task se non è stato passato
        IF @ProjectID = 0
        BEGIN
            SELECT @ActualProjectID = ProjectID
            FROM MA_ProjectTasks
            WHERE TaskID = @TaskID;
        END
        ELSE
        BEGIN
            SET @ActualProjectID = @ProjectID;
        END

        -- Verifica se il progetto è già collegato alla notifica
        IF @ActualProjectID IS NOT NULL AND @ActualProjectID > 0
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM AR_NotificationLinks
                WHERE NotificationID = @NotificationId
                  AND CompanyId = @CompanyId
                  AND DocumentType = 'Project'
                  AND ProjectID = @ActualProjectID
            )
            BEGIN
                -- Il progetto non è collegato, lo colleghiamo
                INSERT INTO AR_NotificationLinks (
                    NotificationID, CompanyId, DocumentType, BOM, ProjectID, TaskID,
                    MOId, SaleOrdId, SerialNo, PurchaseOrdId, SaleDocId, PurchaseDocId,
                    ItemCode, CustSuppType, CustSuppCode,
                    ReferenceId, ComponentCode, SourceCompanyId, TargetCompanyId
                )
                VALUES (
                    @NotificationId, @CompanyId, 'Project', NULL, @ActualProjectID, 0,
                    0, 0, NULL, 0, 0, 0,
                    NULL, 0, NULL,
                    NULL, NULL, NULL, NULL
                );

                SET @ProjectLinked = 1;
            END
        END

        -- Aggiorna il @ProjectID per il collegamento della task
        SET @ProjectID = @ActualProjectID;
    END

    -- FIX: Inserisci il collegamento principale includendo TUTTI i campi IntercompanyReference
    INSERT INTO AR_NotificationLinks (
        NotificationID, CompanyId, DocumentType, BOM, ProjectID, TaskID,
        MOId, SaleOrdId, SerialNo, PurchaseOrdId, SaleDocId, PurchaseDocId,
        ItemCode, CustSuppType, CustSuppCode,
        ReferenceId, ComponentCode, SourceCompanyId, TargetCompanyId
    )
    VALUES (
        @NotificationId, @CompanyId, @DocumentType, @BOM, @ProjectID, @TaskID,
        @MOId, @SaleOrdId, @SerialNo, @PurchaseOrdId, @SaleDocId, @PurchaseDocId,
        @ItemCode, @CustSuppType, @CustSuppCode,
        @ReferenceId, @ComponentCode, @SourceCompanyId, @TargetCompanyId
    );

    SET @LinkId = SCOPE_IDENTITY();

    -- Restituisci lo stato di successo e il LinkId appena creato
    IF @ProjectLinked = 1
    BEGIN
        SELECT
            1 AS Success,
            'Documento collegato con successo. Anche il progetto associato è stato collegato.' AS Message,
            @LinkId AS LinkId,
            @ProjectLinked AS ProjectAutoLinked;
    END
    ELSE
    BEGIN
        SELECT
            1 AS Success,
            'Documento collegato con successo' AS Message,
            @LinkId AS LinkId,
            @ProjectLinked AS ProjectAutoLinked;
    END
END
GO

-- Test della procedura (commentato - da usare per testing)
/*
-- Test per IntercompanyReference
DECLARE @TestNotificationId INT = 1;
DECLARE @TestCompanyId INT = 1;

EXEC LinkDocumentToNotification
    @NotificationId = @TestNotificationId,
    @CompanyId = @TestCompanyId,
    @DocumentType = 'IntercompanyReference',
    @ReferenceId = 2,
    @ComponentCode = 'TMP0010000000002',
    @SourceCompanyId = 1,
    @TargetCompanyId = 2;

-- Verifica il risultato
SELECT * FROM AR_NotificationLinks
WHERE NotificationID = @TestNotificationId
  AND DocumentType = 'IntercompanyReference';
*/
