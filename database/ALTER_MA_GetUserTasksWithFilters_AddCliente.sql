-- =============================================
-- MA_GetUserTasksWithFilters con colonna Cliente
-- (ragione sociale da MA_CustSupp)
-- =============================================
USE [WebAppTEST]
GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

ALTER PROCEDURE [dbo].[MA_GetUserTasksWithFilters]
    @UserID INT,
    @SearchText NVARCHAR(100) = NULL,
    @Priority VARCHAR(20) = NULL,
    @Status VARCHAR(20) = NULL,
    @ProjectID INT = NULL,
    @DueDateFilter VARCHAR(20) = NULL,
    @AssignedTo INT = NULL,
    @InvolvedUserID INT = NULL,
    @SortBy VARCHAR(20) = 'DueDate',
    @SortDirection VARCHAR(4) = 'ASC',
    @IncludeDisabled BIT = 0
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @IsAdmin BIT = 0;

    SELECT @IsAdmin =
        CASE
            WHEN EXISTS (
                SELECT 1 FROM MA_GroupMembers UG
                JOIN MA_Groups G ON UG.GroupID = G.GroupID
                WHERE UG.UserID = @UserID
                AND G.GroupName IN ('ADMIN', 'RESPONSABILI PROGETTI')
            ) THEN 1
            ELSE 0
        END;

    DECLARE @SQL NVARCHAR(MAX) = N'
    SELECT
        T0.TaskID,
        T0.ProjectID,
        T0.Title,
        T0.Description,
        T0.AssignedTo,
        T1.firstName AS AssignedToFirstName,
        T1.lastName AS AssignedToLastName,
        CONCAT(T1.firstName, '' '', T1.lastName) AS AssignedToName,
        T0.Priority,
        T0.Status,
        T0.DueDate,
        T0.StartDate,
        T0.PredecessorTaskID,
        T0.Sequence AS TaskSequence,
        T0.TaskDisabled,
        T0.TaskDisabledBy,
        T0.TaskDisabledAt,
        CONCAT(UD.firstName, '' '', UD.lastName) AS DisabledByName,
        (SELECT COUNT(*) FROM MA_TaskComments WHERE TaskID = T0.TaskID) AS CommentsCount,
        (SELECT COUNT(*) FROM MA_TaskAttachments WHERE TaskID = T0.TaskID) AS AttachmentsCount,
        (SELECT COUNT(*)
         FROM MA_TaskComments TC
         WHERE TC.TaskID = T0.TaskID
           AND TC.UserID != @UserID
           AND NOT EXISTS (
               SELECT 1 FROM MA_TaskCommentReads TCR
               WHERE TCR.CommentID = TC.CommentID
                 AND TCR.UserID = @UserID
           )
        ) AS UnreadComments,
        (SELECT COUNT(*) FROM MA_CalendarEvents WHERE TaskID = T0.TaskID) AS CalendarEventsCount,
        P.Name AS ProjectName,
        P.Description AS ProjectDescription,
        P.Status AS ProjectStatus,
        ISNULL(P.Cliente, '''') AS Cliente,
        PS.StatusDescription AS ProjectStatusDescription,
        PS.HexColor AS ProjectStatusColor,
        CASE
            WHEN P.AdminPermission = 1 THEN 1
            ELSE 0
        END AS AdminPermission,
        CASE
            WHEN T0.AssignedTo = @UserID THEN 1
            ELSE 0
        END AS OwnTask,
        T0.DefaultGroupId,
        G.GroupName,
        ISNULL((
            SELECT
                PA.UserID as userId,
                U.firstName,
                U.lastName,
                CASE
                    WHEN PA.UserID = T0.AssignedTo THEN ''RESPONSABILE''
                    ELSE ''COLLABORATORE''
                END as role
            FROM
                MA_TaskParticipants PA
                JOIN MA_Users U ON PA.UserID = U.userId
            WHERE
                PA.TaskID = T0.TaskID
            FOR JSON PATH
        ), ''[]'') AS Participants,
        PT.Title AS PredecessorTitle,
        PT.Status AS PredecessorStatus
    FROM
        MA_ProjectTasks T0
    INNER JOIN
        MA_Users T1 ON T0.AssignedTo = T1.userId
    LEFT JOIN
        MA_Users UD ON T0.TaskDisabledBy = UD.userId
    LEFT JOIN
        MA_Groups G ON T0.DefaultGroupId = G.GroupId
    LEFT JOIN
        MA_ProjectTasks PT ON T0.PredecessorTaskID = PT.TaskID
    INNER JOIN
        (
            SELECT
                P.ProjectID,
                P.Name,
                P.Description,
                P.Status,
                ISNULL(cs.CompanyName, '''') AS Cliente,
                CASE
                    WHEN PM.Role IN (''ADMIN'', ''MANAGER'') THEN 1
                    ELSE 0
                END AS AdminPermission
            FROM
                MA_Projects P
            INNER JOIN
                MA_ProjectMembers PM ON P.ProjectID = PM.ProjectID
            LEFT JOIN
                MA_CustSupp cs ON cs.CustSupp = P.CustSupp AND cs.CompanyId = P.CompanyId
            WHERE
                PM.UserID = @UserID
                AND P.Disabled = 0
        ) P ON T0.ProjectID = P.ProjectID
    LEFT JOIN
        MA_ProjectStatus PS ON P.Status = PS.Id
    WHERE
        (@IncludeDisabled = 1 OR T0.TaskDisabled = 0) AND
        (
            @IsAdmin = 1
            OR
            (
                T0.AssignedTo = @UserID
                OR EXISTS (
                    SELECT 1
                    FROM MA_TaskParticipants
                    WHERE TaskID = T0.TaskID AND UserID = @UserID
                )
                OR EXISTS (
                    SELECT 1
                    FROM MA_GroupMembers GM
                    WHERE GM.GroupId = T0.DefaultGroupId AND GM.UserId = @UserID
                )
            )
        )';

    IF @InvolvedUserID IS NOT NULL AND @InvolvedUserID <> 0
    BEGIN
        SET @SQL = @SQL + N' AND
            (
                T0.AssignedTo = @InvolvedUserID
                OR EXISTS (
                    SELECT 1
                    FROM MA_TaskParticipants
                    WHERE TaskID = T0.TaskID AND UserID = @InvolvedUserID
                )
            )';
    END

    IF @SearchText IS NOT NULL AND @SearchText <> ''
    BEGIN
        SET @SQL = @SQL + N' AND (T0.Title LIKE ''%'' + @SearchText + ''%'' OR T0.Description LIKE ''%'' + @SearchText + ''%'')';
    END

    IF @Priority IS NOT NULL AND @Priority <> 'all'
    BEGIN
        SET @SQL = @SQL + N' AND T0.Priority = @Priority';
    END

    IF @Status IS NOT NULL AND @Status <> 'all'
    BEGIN
        SET @SQL = @SQL + N' AND T0.Status = @Status';
    END

    IF @ProjectID IS NOT NULL AND @ProjectID <> 0
    BEGIN
        SET @SQL = @SQL + N' AND T0.ProjectID = @ProjectID';
    END

    IF @AssignedTo IS NOT NULL AND @AssignedTo <> 0
    BEGIN
        SET @SQL = @SQL + N' AND T0.AssignedTo = @AssignedTo';
    END

    IF @DueDateFilter IS NOT NULL AND @DueDateFilter <> 'all'
    BEGIN
        IF @DueDateFilter = 'today'
            SET @SQL = @SQL + N' AND CAST(T0.DueDate AS DATE) = CAST(GETDATE() AS DATE)';
        ELSE IF @DueDateFilter = 'tomorrow'
            SET @SQL = @SQL + N' AND CAST(T0.DueDate AS DATE) = DATEADD(DAY, 1, CAST(GETDATE() AS DATE))';
        ELSE IF @DueDateFilter = 'week'
            SET @SQL = @SQL + N' AND CAST(T0.DueDate AS DATE) > CAST(GETDATE() AS DATE) AND CAST(T0.DueDate AS DATE) <= DATEADD(DAY, 7, CAST(GETDATE() AS DATE))';
        ELSE IF @DueDateFilter = 'month'
            SET @SQL = @SQL + N' AND CAST(T0.DueDate AS DATE) > CAST(GETDATE() AS DATE) AND CAST(T0.DueDate AS DATE) <= DATEADD(MONTH, 1, CAST(GETDATE() AS DATE))';
        ELSE IF @DueDateFilter = 'late'
            SET @SQL = @SQL + N' AND CAST(T0.DueDate AS DATE) < CAST(GETDATE() AS DATE) AND T0.Status <> ''COMPLETATA''';
    END

    SET @SQL = @SQL + N'
    ORDER BY ';

    IF @SortBy = 'DueDate'
        SET @SQL = @SQL + N'T0.DueDate';
    ELSE IF @SortBy = 'Priority'
        SET @SQL = @SQL + N'CASE T0.Priority WHEN ''ALTA'' THEN 1 WHEN ''MEDIA'' THEN 2 WHEN ''BASSA'' THEN 3 ELSE 4 END';
    ELSE IF @SortBy = 'Status'
        SET @SQL = @SQL + N'CASE T0.Status WHEN ''DA FARE'' THEN 1 WHEN ''IN ESECUZIONE'' THEN 2 WHEN ''SOSPESA'' THEN 3 WHEN ''BLOCCATA'' THEN 4 WHEN ''COMPLETATA'' THEN 5 ELSE 6 END';
    ELSE IF @SortBy = 'Project'
        SET @SQL = @SQL + N'P.Name';
    ELSE IF @SortBy = 'Title'
        SET @SQL = @SQL + N'T0.Title';
    ELSE IF @SortBy = 'AssignedTo'
        SET @SQL = @SQL + N'T1.firstName, T1.lastName';
    ELSE IF @SortBy = 'Cliente'
        SET @SQL = @SQL + N'P.Cliente';
    ELSE
        SET @SQL = @SQL + N'T0.DueDate';

    IF @SortDirection = 'DESC'
        SET @SQL = @SQL + N' DESC';
    ELSE
        SET @SQL = @SQL + N' ASC';

    SET @SQL = @SQL + N', T0.TaskID ASC';

    EXEC sp_executesql @SQL,
        N'@UserID INT, @SearchText NVARCHAR(100), @Priority VARCHAR(20), @Status VARCHAR(20), @ProjectID INT, @AssignedTo INT, @InvolvedUserID INT, @IsAdmin BIT, @IncludeDisabled BIT',
        @UserID, @SearchText, @Priority, @Status, @ProjectID, @AssignedTo, @InvolvedUserID, @IsAdmin, @IncludeDisabled;
END
GO
