-- =============================================
-- VERIFICA: Allegati Intercompany nei Progetti
-- Controlla che gli allegati condivisi siano visibili negli allegati progetto
-- =============================================

PRINT '========================================='
PRINT 'VERIFICA ALLEGATI INTERCOMPANY'
PRINT '========================================='
PRINT ''

-- Parametri da modificare
DECLARE @ReferenceId INT = 2011;  -- ⬅ Cambia con il tuo ReferenceId

-- Recupera info reference
DECLARE @SourceProjectItemId INT;
DECLARE @SourceCompanyId INT;
DECLARE @TargetCompanyId INT;
DECLARE @TargetProjectId INT;

SELECT
    @SourceProjectItemId = SourceProjectItemId,
    @SourceCompanyId = SourceCompanyId,
    @TargetCompanyId = TargetCompanyId,
    @TargetProjectId = TargetProjectId
FROM MA_ProjectArticles_References
WHERE ReferenceId = @ReferenceId;

PRINT '1. ALLEGATI ARTICOLO SORGENTE (Condivisi)'
PRINT '   Questi allegati dovrebbero essere copiati nel progetto target'
PRINT ''

SELECT
    ia.AttachmentID,
    ia.FileName,
    ia.FilePath,
    ia.FileType,
    ia.FileSizeKB,
    ia.Description,
    ia.IsVisible,
    ias.Status AS SharingStatus,
    u.username AS UploadedByUser
FROM MA_ItemAttachments ia
INNER JOIN MA_ItemAttachmentSharing ias
    ON ia.AttachmentID = ias.AttachmentID
LEFT JOIN MA_Users u ON ia.UploadedBy = u.UserId
WHERE ias.SourceProjectItemId = @SourceProjectItemId
  AND ias.SourceCompanyId = @SourceCompanyId
  AND ias.TargetCompanyId = @TargetCompanyId
  AND ias.Status = 'ACTIVE'
  AND ia.IsVisible = 1
ORDER BY ia.UploadedAt DESC

PRINT ''
PRINT '2. ALLEGATI PROGETTO TARGET (Dopo approvazione)'
PRINT '   Questi sono gli allegati copiati nel progetto CBL'
PRINT ''

IF @TargetProjectId IS NULL
BEGIN
    PRINT '⚠ TargetProjectId è NULL - La reference non è stata ancora approvata'
END
ELSE
BEGIN
    SELECT
        pa.AttachmentID,
        pa.FileName,
        pa.FilePath,
        pa.FileType,
        pa.FileSizeKB,
        pa.UploadedAt,
        u.username AS UploadedByUser,
        -- Verifica se il FilePath corrisponde a un allegato articolo sorgente
        CASE
            WHEN EXISTS (
                SELECT 1
                FROM MA_ItemAttachments ia2
                JOIN MA_ItemAttachmentSharing ias2 ON ia2.AttachmentID = ias2.AttachmentID
                WHERE ia2.FilePath = pa.FilePath
                  AND ias2.SourceProjectItemId = @SourceProjectItemId
            ) THEN 'SI - Collegato a ItemAttachment'
            ELSE 'NO - Allegato indipendente'
        END AS IsLinkedToItem
    FROM MA_ProjectAttachments pa
    LEFT JOIN MA_Users u ON pa.UploadedBy = u.UserId
    WHERE pa.ProjectID = @TargetProjectId
    ORDER BY pa.UploadedAt DESC

    PRINT ''
    PRINT '3. RIEPILOGO'
    PRINT ''

    DECLARE @ItemAttachmentsCount INT;
    DECLARE @ProjectAttachmentsCount INT;
    DECLARE @LinkedAttachmentsCount INT;

    -- Conta allegati articolo condivisi
    SELECT @ItemAttachmentsCount = COUNT(*)
    FROM MA_ItemAttachments ia
    INNER JOIN MA_ItemAttachmentSharing ias ON ia.AttachmentID = ias.AttachmentID
    WHERE ias.SourceProjectItemId = @SourceProjectItemId
      AND ias.SourceCompanyId = @SourceCompanyId
      AND ias.TargetCompanyId = @TargetCompanyId
      AND ias.Status = 'ACTIVE'
      AND ia.IsVisible = 1;

    -- Conta allegati progetto
    SELECT @ProjectAttachmentsCount = COUNT(*)
    FROM MA_ProjectAttachments
    WHERE ProjectID = @TargetProjectId;

    -- Conta allegati progetto collegati a item
    SELECT @LinkedAttachmentsCount = COUNT(*)
    FROM MA_ProjectAttachments pa
    WHERE pa.ProjectID = @TargetProjectId
      AND EXISTS (
          SELECT 1
          FROM MA_ItemAttachments ia2
          JOIN MA_ItemAttachmentSharing ias2 ON ia2.AttachmentID = ias2.AttachmentID
          WHERE ia2.FilePath = pa.FilePath
            AND ias2.SourceProjectItemId = @SourceProjectItemId
      );

    SELECT
        @ItemAttachmentsCount AS AllegatiArticoloCondivisi,
        @ProjectAttachmentsCount AS AllegatiProgettoTotali,
        @LinkedAttachmentsCount AS AllegatiProgettoCollegatiAItem,
        CASE
            WHEN @ItemAttachmentsCount = @LinkedAttachmentsCount THEN '✓ TUTTI gli allegati sono stati copiati'
            WHEN @LinkedAttachmentsCount > 0 THEN '⚠ Solo ALCUNI allegati sono stati copiati'
            ELSE '✗ NESSUN allegato è stato copiato'
        END AS Stato
END

PRINT ''
PRINT '4. DETTAGLI ALLEGATI MANCANTI'
PRINT '   Allegati condivisi che NON sono stati copiati nel progetto'
PRINT ''

IF @TargetProjectId IS NOT NULL
BEGIN
    SELECT
        ia.AttachmentID,
        ia.FileName,
        ia.FilePath,
        'MANCANTE in MA_ProjectAttachments' AS Motivo
    FROM MA_ItemAttachments ia
    INNER JOIN MA_ItemAttachmentSharing ias ON ia.AttachmentID = ias.AttachmentID
    WHERE ias.SourceProjectItemId = @SourceProjectItemId
      AND ias.SourceCompanyId = @SourceCompanyId
      AND ias.TargetCompanyId = @TargetCompanyId
      AND ias.Status = 'ACTIVE'
      AND ia.IsVisible = 1
      AND NOT EXISTS (
          SELECT 1
          FROM MA_ProjectAttachments pa
          WHERE pa.ProjectID = @TargetProjectId
            AND pa.FilePath = ia.FilePath
      )

    IF @@ROWCOUNT = 0
        PRINT '✓ Nessun allegato mancante - Tutto sincronizzato correttamente'
END

PRINT ''
PRINT '========================================='
PRINT 'FINE VERIFICA'
PRINT '========================================='
