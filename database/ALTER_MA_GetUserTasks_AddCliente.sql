-- =============================================
-- Aggiunge colonna Cliente (ragione sociale da MA_CustSupp)
-- a MA_GetUserTasks e MA_GetUserTasksWithFilters
-- =============================================

-- 1) MA_GetUserTasks
-- =============================================
ALTER PROCEDURE [dbo].[MA_GetUserTasks]
    @UserID INT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @IsSystemAdmin BIT = 0;

    SELECT @IsSystemAdmin =
        CASE
            WHEN EXISTS (
                SELECT 1 FROM AR_GroupMembers UG
                JOIN AR_Groups G ON UG.GroupID = G.GroupID
                WHERE UG.UserID = @UserID
                AND G.GroupName IN ('ADMIN', 'AMMINISTRATORI', 'RESPONSABILI PROGETTI')
                AND (G.disabled IS NULL OR G.disabled = 0)
            ) THEN 1
            ELSE 0
        END;

    SELECT
        T0.TaskID,
        T0.ProjectID,
        T0.Title,
        T0.Description,
        T0.AssignedTo,
        T1.firstName AS AssignedToFirstName,
        T1.lastName AS AssignedToLastName,
        CONCAT(T1.firstName, ' ', T1.lastName) AS AssignedToName,
        T0.Priority,
        T0.Status,
        T0.DueDate,
        T0.StartDate,
        T0.PredecessorTaskID,
        T0.TaskSequence,
        (SELECT COUNT(*) FROM MA_ProjectTaskComments WHERE TaskID = T0.TaskID) AS CommentsCount,
        (SELECT COUNT(*) FROM MA_Attachments WHERE TaskID = T0.TaskID) AS AttachmentsCount,
        P.Name AS ProjectName,
        P.Description AS ProjectDescription,
        P.ProjectErpID,
        P.Status AS ProjectStatus,
        P.IsLocked AS ProjectIsLocked,
        ISNULL(P.Cliente, '') AS Cliente,
        CASE WHEN tp.TaskID IS NOT NULL THEN 1 ELSE 0 END AS IsPinned,
        tp.PinOrder,
        tp.PinnedAt,
        CASE
            WHEN P.AdminPermission = 1 THEN 1
            ELSE 0
        END AS AdminPermission,
        CASE
            WHEN T0.AssignedTo = @UserID THEN 1
            ELSE 0
        END AS OwnTask,
        (
            SELECT
                PA.UserID as userId,
                U.firstName,
                U.lastName,
                CASE
                    WHEN PA.UserID = T0.AssignedTo THEN 'RESPONSABILE'
                    ELSE 'COLLABORATORE'
                END as role
            FROM
                MA_ProjectTaskAssignees PA
                JOIN AR_Users U ON PA.UserID = U.userId
            WHERE
                PA.TaskID = T0.TaskID
            FOR JSON PATH
        ) AS Participants,
        (
            SELECT
                TD.PredecessorTaskID as taskId,
                PT.Title as title,
                TD.DependencyType as dependencyType,
                TD.LagDays as lagDays,
                PT.Status as status,
                PT.DueDate as dueDate
            FROM
                MA_ProjectTaskDependencies TD
                JOIN MA_ProjectTasks PT ON TD.PredecessorTaskID = PT.TaskID AND PT.TaskDisabled = 0
            WHERE
                TD.TaskID = T0.TaskID
            FOR JSON PATH
        ) AS Predecessors,
        (
            SELECT
                TD.TaskID as taskId,
                ST.Title as title,
                TD.DependencyType as dependencyType,
                TD.LagDays as lagDays,
                ST.Status as status,
                ST.StartDate as startDate
            FROM
                MA_ProjectTaskDependencies TD
                JOIN MA_ProjectTasks ST ON TD.TaskID = ST.TaskID AND ST.TaskDisabled = 0
            WHERE
                TD.PredecessorTaskID = T0.TaskID
            FOR JSON PATH
        ) AS Successors
    FROM
        MA_ProjectTasks T0
    INNER JOIN
        AR_Users T1 ON T0.AssignedTo = T1.userId
    INNER JOIN
        (
            SELECT
                P.ProjectID,
                P.ProjectErpID,
                P.Name,
                P.Description,
                P.Status,
                P.IsLocked,
                P.TBCreatedId,
                CASE
                    WHEN PM.Role IN ('ADMIN', 'MANAGER') THEN 1
                    ELSE 0
                END AS AdminPermission,
                ISNULL(cs.CompanyName, '') AS Cliente
            FROM
                MA_Projects P
            INNER JOIN
                MA_ProjectMembers PM ON P.ProjectID = PM.ProjectID
            LEFT JOIN
                MA_CustSupp cs ON cs.CustSupp = P.CustSupp AND cs.CompanyId = P.CompanyId
            WHERE
                PM.UserID = @UserID
                AND P.Disabled = 0
                AND (
                    @IsSystemAdmin = 1
                    OR P.IsLocked = 0
                    OR P.TBCreatedId = @UserID
                    OR EXISTS (SELECT 1 FROM MA_ProjectMembers WHERE ProjectID = P.ProjectID AND UserID = @UserID)
                )
        ) P ON T0.ProjectID = P.ProjectID
    LEFT JOIN MA_TaskPins tp ON T0.TaskID = tp.TaskID AND tp.UserID = @UserID
    WHERE
        (
            (@IsSystemAdmin = 1 OR P.IsLocked = 0 OR P.TBCreatedId = @UserID)
            OR
            (P.IsLocked = 1 AND EXISTS (
                SELECT 1 FROM MA_ProjectMembers
                WHERE ProjectID = P.ProjectID
                AND UserID = @UserID
                AND Role = 'USER'
            ) AND (
                T0.AssignedTo = @UserID
                OR EXISTS (
                    SELECT 1
                    FROM MA_ProjectTaskAssignees
                    WHERE TaskID = T0.TaskID AND UserID = @UserID
                )
            ))
            OR
            (P.IsLocked = 1 AND EXISTS (
                SELECT 1 FROM MA_ProjectMembers
                WHERE ProjectID = P.ProjectID
                AND UserID = @UserID
                AND Role IN ('ADMIN', 'MANAGER')
            ))
        )
        AND T0.TaskDisabled = 0
    ORDER BY
        CASE WHEN tp.TaskID IS NOT NULL THEN 0 ELSE 1 END,
        tp.PinOrder,
        CASE T0.Status
            WHEN 'COMPLETATA' THEN 3
            WHEN 'BLOCCATA' THEN 2
            WHEN 'SOSPESA' THEN 1
            ELSE 0
        END,
        CASE T0.Priority
            WHEN 'ALTA' THEN 0
            WHEN 'MEDIA' THEN 1
            WHEN 'BASSA' THEN 2
            ELSE 3
        END,
        T0.DueDate ASC;
END
GO

-- 2) MA_GetUserTasksWithFilters
-- Aggiungere nella subquery P la join a MA_CustSupp e il campo Cliente.
-- Nella stringa @SQL, sostituire la subquery che costruisce P con la versione sotto.
--
-- Cerca nel corpo della SP questa parte:
--   SELECT P.ProjectID, P.Name, P.Description, P.Status,
--   CASE WHEN PM.Role IN (''ADMIN'', ''MANAGER'') THEN 1 ELSE 0 END AS AdminPermission
--   FROM MA_Projects P
--   INNER JOIN MA_ProjectMembers PM ON P.ProjectID = PM.ProjectID
--   WHERE ...
--
-- Sostituisci con:
--   SELECT P.ProjectID, P.Name, P.Description, P.Status,
--   CASE WHEN PM.Role IN (''ADMIN'', ''MANAGER'') THEN 1 ELSE 0 END AS AdminPermission,
--   ISNULL(cs.CompanyName,'') AS Cliente
--   FROM MA_Projects P
--   INNER JOIN MA_ProjectMembers PM ON P.ProjectID = PM.ProjectID
--   LEFT JOIN MA_CustSupp cs ON cs.CustSupp = P.CustSupp AND cs.CompanyId = P.CompanyId
--   WHERE ...
--
-- E nella SELECT principale della query dinamica aggiungi dopo P.ProjectStatus (o ProjectStatusDescription):
--   P.Cliente,
--
-- Poi riesegui CREATE/ALTER della procedura MA_GetUserTasksWithFilters con il corpo aggiornato.
