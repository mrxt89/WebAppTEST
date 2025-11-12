-- Script per modificare la stored procedure MA_AddUpdateProjectTask
-- Aggiunge il parametro @Operation e lo gestisce nell'INSERT e UPDATE

SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- Drop e ricrea la stored procedure con il nuovo parametro
ALTER PROCEDURE [dbo].[MA_AddUpdateProjectTask]
    @TaskID INT = NULL,
    @ProjectID INT,
    @Title NVARCHAR(255),
    @Description NVARCHAR(MAX) = NULL,
    @AssignedTo INT = NULL,
    @Priority VARCHAR(10),
    @Status VARCHAR(20),
    @DueDate DATE NULL,
    @StartDate DATE NULL,
    @PredecessorTaskID INT = NULL, -- Manteniamo per retrocompatibilità
    @PredecessorTasks NVARCHAR(MAX) = NULL, -- JSON array di predecessori [{taskId: 123, dependencyType: 'FS', lagDays: 0}]
    @UserId INT,
    @AdditionalAssignees NVARCHAR(MAX) = NULL,
    @Operation VARCHAR(21) = NULL  -- NUOVO PARAMETRO
AS
BEGIN
    SET NOCOUNT ON

    SET @DueDate = ISNULL(@DueDate, CAST(GETDATE() AS DATE))
    SET @StartDate = ISNULL(@StartDate, CAST(GETDATE() AS DATE))

    DECLARE @MaxSequence INT
    SELECT @MaxSequence = ISNULL(MAX(TaskSequence), 0)
    FROM MA_ProjectTasks
    WHERE ProjectID = @ProjectID

    DECLARE @TaskIDOutput INT
    DECLARE @msg VARCHAR(100) = ''
    DECLARE @titleMSG NVARCHAR(MAX) = ''
    DECLARE @messageToSend NVARCHAR(MAX) = ''
    DECLARE @receiversList NVARCHAR(MAX) = ''

    -- Salvataggio valori precedenti per il log in caso di update
    DECLARE @PrevValues TABLE (
        Status VARCHAR(20),
        DueDate DATE,
        StartDate DATE,
        Title NVARCHAR(255),
        Description NVARCHAR(MAX),
        Priority VARCHAR(10),
        AssignedTo INT
    )

    IF @TaskID IS NOT NULL
    BEGIN
        INSERT INTO @PrevValues
        SELECT Status, DueDate, StartDate, Title, Description, Priority, AssignedTo
        FROM MA_ProjectTasks
        WHERE TaskID = @TaskID
    END

    IF @TaskID IS NULL OR NOT EXISTS (SELECT 1 FROM MA_ProjectTasks WHERE TaskID = @TaskID)
    BEGIN
        -- Insert new task (MODIFICATO: aggiunto Operation)
        INSERT INTO MA_ProjectTasks (
            ProjectID, Title, Description, AssignedTo, Priority,
            Status, DueDate, StartDate, PredecessorTaskID, TaskSequence, TBCreated, Operation
        )
        VALUES (
            @ProjectID, @Title, @Description, ISNULL(@AssignedTo,0), @Priority,
            @Status, @DueDate, @StartDate, ISNULL(@PredecessorTaskID,0), @MaxSequence + 10, GETDATE(), @Operation
        )

        SET @TaskIDOutput = SCOPE_IDENTITY()

        -- Inserimento Log
        INSERT INTO MA_ProjectTasks_Log(
            UserId, TaskID, ProjectID, TaskSequence, PredecessorTaskID,
            Title, Description, AssignedTo, Priority, Status, DueDate, TBCreated, StartDate
        )
        VALUES (
            @UserId, @TaskIDOutput, @ProjectID, @MaxSequence + 10, ISNULL(@PredecessorTaskID,0),
            @Title, @Description, ISNULL(@AssignedTo,0), @Priority, @Status, @DueDate, GETDATE(), @StartDate
        )

        -- Gestione predecessori
        IF @PredecessorTasks IS NOT NULL
        BEGIN
            INSERT INTO MA_ProjectTaskDependencies (TaskID, PredecessorTaskID, DependencyType, LagDays, TBCreatedBy)
            SELECT
                @TaskIDOutput,
                CAST(JSON_VALUE(value, '$.taskId') AS INT),
                ISNULL(JSON_VALUE(value, '$.dependencyType'), 'FS'),
                ISNULL(CAST(JSON_VALUE(value, '$.lagDays') AS INT), 0),
                @UserId
            FROM OPENJSON(@PredecessorTasks)
            WHERE JSON_VALUE(value, '$.taskId') IS NOT NULL
        END
        -- Retrocompatibilità: se viene passato solo PredecessorTaskID
        ELSE IF @PredecessorTaskID IS NOT NULL AND @PredecessorTaskID > 0
        BEGIN
            INSERT INTO MA_ProjectTaskDependencies (TaskID, PredecessorTaskID, DependencyType, LagDays, TBCreatedBy)
            VALUES (@TaskIDOutput, @PredecessorTaskID, 'FS', 0, @UserId)
        END

        -- Insert initial assignees
        IF @AssignedTo IS NOT NULL
        BEGIN
            INSERT INTO MA_ProjectTaskAssignees (TaskID, UserID)
            VALUES (@TaskIDOutput, @AssignedTo)

            IF @AssignedTo > 0 AND NOT EXISTS (SELECT 1 FROM MA_ProjectMembers WHERE ProjectID = @ProjectID AND UserID = @AssignedTo)
            BEGIN
                INSERT INTO MA_ProjectMembers (ProjectID, UserID, Role, TBCreated)
                VALUES (@ProjectID, @AssignedTo, 'USER', GETDATE())
            END
        END

        IF @AdditionalAssignees IS NOT NULL
        BEGIN
            CREATE TABLE #AdditionalUsers (UserID INT)

            INSERT INTO #AdditionalUsers (UserID)
            SELECT DISTINCT CAST(value AS INT)
            FROM OPENJSON(@AdditionalAssignees)
            WHERE CAST(value AS INT) != @AssignedTo AND CAST(value AS INT) > 0

            INSERT INTO MA_ProjectTaskAssignees (TaskID, UserID)
            SELECT @TaskIDOutput, UserID
            FROM #AdditionalUsers

            INSERT INTO MA_ProjectMembers (ProjectID, UserID, Role, TBCreated)
            SELECT @ProjectID, u.UserID, 'USER', GETDATE()
            FROM #AdditionalUsers u
            WHERE NOT EXISTS (
                SELECT 1
                FROM MA_ProjectMembers
                WHERE ProjectID = @ProjectID AND UserID = u.UserID
            )

            DROP TABLE #AdditionalUsers
        END

        -- Notifica nuova attività
        SELECT TOP(1)
            @titleMSG = CONCAT(CASE WHEN LEN(T1.Name) > 50 THEN LEFT(T1.Name,50) + '..' ELSE T1.Name END, ' - Nuova attività'),
            @messageToSend = CONCAT(
                'Ti è stata assegnata l''attività: ', T0.Title,
                CHAR(13), 'Descrizione: ', T0.Description,
                CHAR(13), 'Scadenza: ', FORMAT(T0.DueDate, 'dd/MM/yyyy'),
                CHAR(13), 'Priorità: ', T0.Priority,
                CHAR(13), 'Stato: ', T0.Status
            )
        FROM MA_ProjectTasks T0
        JOIN MA_Projects T1 ON T1.ProjectID = T0.ProjectID
        WHERE T0.TaskID = @TaskIDOutput

        SET @msg = 'Attività inserita'
    END
    ELSE
    BEGIN
        -- Update existing task (MODIFICATO: aggiunto Operation)
        UPDATE MA_ProjectTasks
        SET
            Title = @Title,
            Description = @Description,
            AssignedTo = CASE WHEN @AssignedTo IS NULL THEN AssignedTo ELSE @AssignedTo END,
            Priority = @Priority,
            Status = @Status,
            DueDate = @DueDate,
            StartDate = @StartDate,
            PredecessorTaskID = CASE WHEN @PredecessorTaskID IS NULL THEN PredecessorTaskID ELSE @PredecessorTaskID END,
            Operation = @Operation
        WHERE TaskID = @TaskID

        SET @TaskIDOutput = @TaskID

        -- Gestione predecessori per update
        IF @PredecessorTasks IS NOT NULL
        BEGIN
            -- Rimuovi le dipendenze esistenti
            DELETE FROM MA_ProjectTaskDependencies
            WHERE TaskID = @TaskID

            -- Inserisci le nuove dipendenze
            INSERT INTO MA_ProjectTaskDependencies (TaskID, PredecessorTaskID, DependencyType, LagDays, TBCreatedBy)
            SELECT
                @TaskID,
                CAST(JSON_VALUE(value, '$.taskId') AS INT),
                ISNULL(JSON_VALUE(value, '$.dependencyType'), 'FS'),
                ISNULL(CAST(JSON_VALUE(value, '$.lagDays') AS INT), 0),
                @UserId
            FROM OPENJSON(@PredecessorTasks)
            WHERE JSON_VALUE(value, '$.taskId') IS NOT NULL
        END

        -- Gestione degli assegnati
        IF @AssignedTo IS NOT NULL OR @AdditionalAssignees IS NOT NULL
        BEGIN
            CREATE TABLE #NewAssignees (UserID INT)

            IF @AssignedTo IS NOT NULL AND @AssignedTo > 0
            BEGIN
                INSERT INTO #NewAssignees (UserID) VALUES (@AssignedTo)

                IF NOT EXISTS (SELECT 1 FROM MA_ProjectMembers WHERE ProjectID = @ProjectID AND UserID = @AssignedTo)
                BEGIN
                    INSERT INTO MA_ProjectMembers (ProjectID, UserID, Role, TBCreated)
                    VALUES (@ProjectID, @AssignedTo, 'USER', GETDATE())
                END
            END

            IF @AdditionalAssignees IS NOT NULL
            BEGIN
                INSERT INTO #NewAssignees (UserID)
                SELECT DISTINCT CAST(value AS INT)
                FROM OPENJSON(@AdditionalAssignees)
                WHERE CAST(value AS INT) != @AssignedTo AND CAST(value AS INT) > 0

                INSERT INTO MA_ProjectMembers (ProjectID, UserID, Role, TBCreated)
                SELECT @ProjectID, n.UserID, 'USER', GETDATE()
                FROM #NewAssignees n
                WHERE n.UserID != @AssignedTo
                  AND n.UserID > 0
                  AND NOT EXISTS (
                    SELECT 1
                    FROM MA_ProjectMembers
                    WHERE ProjectID = @ProjectID AND UserID = n.UserID
                )
            END

            DELETE FROM MA_ProjectTaskAssignees
            WHERE TaskID = @TaskID
            AND UserID NOT IN (SELECT UserID FROM #NewAssignees)

            INSERT INTO MA_ProjectTaskAssignees (TaskID, UserID)
            SELECT @TaskID, n.UserID
            FROM #NewAssignees n
            WHERE NOT EXISTS (
                SELECT 1
                FROM MA_ProjectTaskAssignees
                WHERE TaskID = @TaskID AND UserID = n.UserID
            )

            DROP TABLE #NewAssignees
        END

        -- Costruzione del messaggio con i cambiamenti
        DECLARE @changes NVARCHAR(MAX) = ''

        IF EXISTS (SELECT 1 FROM @PrevValues p WHERE p.Status != @Status)
            SET @changes = @changes + CHAR(13) + 'Stato: da "' + (SELECT Status FROM @PrevValues) + '" a "' + @Status + '"'

        IF EXISTS (SELECT 1 FROM @PrevValues p WHERE p.DueDate != @DueDate)
            SET @changes = @changes + CHAR(13) + 'Data fine: da ' + FORMAT((SELECT DueDate FROM @PrevValues), 'dd/MM/yyyy') +
                         ' a ' + FORMAT(@DueDate, 'dd/MM/yyyy')

        IF EXISTS (SELECT 1 FROM @PrevValues p WHERE p.StartDate != @StartDate)
            SET @changes = @changes + CHAR(13) + 'Data inizio: da ' + FORMAT((SELECT StartDate FROM @PrevValues), 'dd/MM/yyyy') +
                         ' a ' + FORMAT(@StartDate, 'dd/MM/yyyy')

        IF EXISTS (SELECT 1 FROM @PrevValues p WHERE p.Title != @Title)
            SET @changes = @changes + CHAR(13) + 'Titolo: da "' + (SELECT Title FROM @PrevValues) + '" a "' + @Title + '"'

        IF EXISTS (SELECT 1 FROM @PrevValues p WHERE p.Priority != @Priority)
            SET @changes = @changes + CHAR(13) + 'Priorità: da "' + (SELECT Priority FROM @PrevValues) + '" a "' + @Priority + '"'

        IF EXISTS (SELECT 1 FROM @PrevValues p WHERE p.AssignedTo != ISNULL(@AssignedTo, p.AssignedTo))
            SET @changes = @changes + CHAR(13) + 'Assegnato a: da ' +
                ISNULL((SELECT TOP 1 CONCAT(firstName, ' ', lastName) FROM AR_Users WHERE userId = (SELECT AssignedTo FROM @PrevValues)), 'nessuno') +
                ' a ' +
                ISNULL((SELECT TOP 1 CONCAT(firstName, ' ', lastName) FROM AR_Users WHERE userId = @AssignedTo), 'nessuno')

        -- Inserimento Log dopo l'update
        INSERT INTO MA_ProjectTasks_Log(
            UserId, TaskID, ProjectID, TaskSequence, PredecessorTaskID,
            Title, Description, AssignedTo, Priority, Status, DueDate, TBCreated, StartDate
        )
        SELECT
            @UserId, TaskID, ProjectID, TaskSequence, PredecessorTaskID,
            Title, Description, AssignedTo, Priority, Status, DueDate, GETDATE(), StartDate
        FROM MA_ProjectTasks
        WHERE TaskID = @TaskID

        -- Preparazione notifica di aggiornamento
        DECLARE @NotificationID INT = ISNULL(
            (SELECT TOP(1) NotificationID
             FROM AR_NotificationLinks
             WHERE ProjectID = @ProjectID),
            0
        )

        SET @titleMSG = ISNULL(
            (SELECT TOP(1) T1.Name
             FROM MA_ProjectTasks T0
             JOIN MA_Projects T1 ON T1.ProjectID = T0.ProjectID
             WHERE T0.TaskID = @TaskID),
            'MODIFICA PROGETTO'
        )

        SET @messageToSend = ISNULL(
            (SELECT TOP(1)
                CONCAT(
                    T2.firstName, ' ', T2.lastName,
                    ' ha aggiornato l''attività "', T0.Title, '"',
                    CASE WHEN @changes != '' THEN CHAR(13) + 'Modifiche:' + @changes ELSE '' END
                )
             FROM MA_ProjectTasks T0
             JOIN MA_Projects T1 ON T1.ProjectID = T0.ProjectID
             JOIN AR_Users T2 ON T2.userId = @UserId
             WHERE T0.TaskID = @TaskID),
            'Aggiornamento attività'
        )

        SET @msg = 'Attività aggiornata'
    END

    -- Costruzione della lista dei destinatari
    SELECT @receiversList = STRING_AGG(CAST(UserID AS NVARCHAR), '-')
    FROM (
        SELECT DISTINCT UserID
        FROM (
            SELECT T0.AssignedTo AS UserID
            FROM MA_ProjectTasks T0
            WHERE T0.TaskID = @TaskIDOutput
                AND T0.AssignedTo != @UserId
                AND T0.AssignedTo != 0
            UNION ALL
            SELECT UserID
            FROM MA_ProjectTaskAssignees TA
            WHERE TA.TaskID = @TaskIDOutput
                AND TA.UserID != @UserId
        ) T
    ) DistinctUsers

    SELECT @TaskIDOutput as TaskID, 1 as success, @msg as msg
END
GO

PRINT 'Stored procedure MA_AddUpdateProjectTask modificata con successo - aggiunto parametro Operation';
GO
