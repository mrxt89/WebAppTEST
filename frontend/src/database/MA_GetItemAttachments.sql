-- =============================================
-- Author:		WebApp
-- Create date: 2025-09-25
-- Description:	Ottiene gli allegati per un articolo (ERP o Progetto)
-- =============================================
ALTER PROCEDURE [dbo].[MA_GetItemAttachments]
    @ItemCode VARCHAR(64) = NULL,         -- Codice articolo
    @ProjectItemId BIGINT = NULL,         -- ID dell'articolo in MA_ProjectArticles_Items (alternativa a @ItemCode)
    @CompanyId INT,                       -- ID dell'azienda richiedente
    @IncludeShared BIT = 1,               -- Includi allegati condivisi da altre aziende
    @IsErpAttachment BIT = NULL           -- Filtro per allegati ERP (NULL = tutti)
AS
BEGIN
    SET NOCOUNT ON;

    -- Ottieni tutti gli allegati che l'azienda può vedere
    SELECT 
        a.AttachmentID,
        a.ProjectItemId,
        a.CompanyId AS OwnerCompanyId,
        a.ItemCode,
        a.FileName,
        a.FilePath,
        a.FileType,
        a.FileSizeKB,
        a.UploadedBy,
        a.UploadedAt,
        a.Description,
        a.IsPublic,
        a.StorageLocation,
        a.IsErpAttachment,
        a.Tags,
        u.username AS UploadedByUsername,
        u.firstName + ' ' + u.lastName AS UploadedByFullName,
        c.Description AS OwnerCompanyName,
        CASE 
            WHEN a.CompanyId = @CompanyId THEN 'owner' 
            ELSE COALESCE(s.AccessLevel, 'read') 
        END AS AccessLevel,
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM dbo.MA_ItemAttachmentCategoryMap m 
                JOIN dbo.MA_ItemAttachmentCategories cat ON m.CategoryID = cat.CategoryID
                WHERE m.AttachmentID = a.AttachmentID
            ) THEN 1 ELSE 0 
        END AS HasCategories
    FROM 
        dbo.MA_ItemAttachments a
    JOIN 
        dbo.AR_Users u ON a.UploadedBy = u.userId
    JOIN 
        dbo.AR_Companies c ON a.CompanyId = c.CompanyId
    LEFT JOIN 
        dbo.MA_ItemAttachmentSharing s ON a.AttachmentID = s.AttachmentID AND s.TargetCompanyId = @CompanyId
    WHERE 
        a.IsVisible = 1
        AND (
            a.ItemCode = @ItemCode 
            OR (@ProjectItemId IS NOT NULL AND a.ProjectItemId = @ProjectItemId)
            OR EXISTS (
                SELECT 1 FROM dbo.MA_ItemAttachmentCodeMap m 
                WHERE m.AttachmentID = a.AttachmentID 
                AND m.ItemCode = @ItemCode 
                AND m.IsActive = 1
                AND m.CompanyId = @CompanyId
            )
        )
        AND (
            a.CompanyId = @CompanyId 
            OR a.IsPublic = 1
            OR (@IncludeShared = 1 AND s.AttachmentID IS NOT NULL)
        )
        AND (@IsErpAttachment IS NULL OR a.IsErpAttachment = @IsErpAttachment)
    ORDER BY 
        a.UploadedAt DESC;
END;
GO
