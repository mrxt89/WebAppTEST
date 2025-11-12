-- Script per modificare la stored procedure MA_AddUpdateTaskTemplateDetail
-- Aggiunge il parametro @Operation e lo gestisce nell'INSERT e UPDATE

SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- Drop e ricrea la stored procedure con il nuovo parametro
ALTER PROCEDURE [dbo].[MA_AddUpdateTaskTemplateDetail]
    @TemplateDetailID INT = NULL,
    @TemplateID INT,
    @TaskSequence INT,
    @Title NVARCHAR(255),
    @Description NVARCHAR(MAX) = NULL,
    @DefaultAssignedTo INT = NULL,
    @DefaultGroupId INT = NULL,  -- New parameter for group assignment
    @Priority VARCHAR(10) = 'MEDIA',
    @StandardDays INT = 1,
    @PredecessorDetailID INT = NULL,
    @Operation VARCHAR(21) = NULL  -- NUOVO PARAMETRO
AS
BEGIN
    SET NOCOUNT ON;

    IF @TemplateDetailID IS NULL OR NOT EXISTS (SELECT 1 FROM MA_TasksTemplatesDetail WHERE TemplateDetailID = @TemplateDetailID)
    BEGIN
        -- Insert new template detail (MODIFICATO: aggiunto Operation)
        INSERT INTO MA_TasksTemplatesDetail (
            TemplateID, TaskSequence, Title, Description, DefaultAssignedTo,
            DefaultGroupId, Priority, StandardDays, PredecessorDetailID, TBCreated, Operation
        )
        VALUES (
            @TemplateID, @TaskSequence, @Title, @Description, @DefaultAssignedTo,
            @DefaultGroupId, @Priority, @StandardDays, @PredecessorDetailID, GETDATE(), @Operation
        );

        SET @TemplateDetailID = SCOPE_IDENTITY();

        SELECT @TemplateDetailID as TemplateDetailID, 1 AS success, 'Dettaglio template creato' AS msg
    END
    ELSE
    BEGIN
        -- Update existing template detail (MODIFICATO: aggiunto Operation)
        UPDATE MA_TasksTemplatesDetail
        SET
            TemplateID = @TemplateID,
            TaskSequence = @TaskSequence,
            Title = @Title,
            Description = @Description,
            DefaultAssignedTo = @DefaultAssignedTo,
            DefaultGroupId = @DefaultGroupId,
            Priority = @Priority,
            StandardDays = @StandardDays,
            PredecessorDetailID = @PredecessorDetailID,
            Operation = @Operation
        WHERE TemplateDetailID = @TemplateDetailID;

        SELECT @TemplateDetailID as TemplateDetailID, 1 AS success, 'Dettaglio template aggiornato' AS msg
    END
END
GO

PRINT 'Stored procedure MA_AddUpdateTaskTemplateDetail modificata con successo - aggiunto parametro Operation';
GO
