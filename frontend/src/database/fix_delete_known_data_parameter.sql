-- =============================================
-- Script per correggere la stored procedure di eliminazione
-- =============================================

-- Aggiorna la stored procedure per fare hard delete invece di soft delete
CREATE OR ALTER PROCEDURE [dbo].[SP_DeleteKnownDataParameter]
    @CompanyId INT,
    @ParameterId BIGINT,
    @UserId INT
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Hard delete: elimina fisicamente il record
    DELETE FROM MA_BOMCostingKnownData
    WHERE Id = @ParameterId
    AND CompanyId = @CompanyId;
    
    -- Restituisce il numero di record eliminati
    SELECT @@ROWCOUNT AS DeletedCount;
END
GO

PRINT 'Stored procedure SP_DeleteKnownDataParameter aggiornata per hard delete';
