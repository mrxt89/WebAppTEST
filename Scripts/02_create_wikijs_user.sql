-- =====================================================
-- Script: Creazione Utente Dedicato per WikiJS
-- Versione: 1.0
-- Data: 2025-10-23
-- Descrizione: Crea utente SQL con permessi limitati
-- OPZIONALE: Usare solo se non vuoi usare 'sa'
-- =====================================================

USE [master]
GO

-- Verifica se login esiste
IF NOT EXISTS (SELECT name FROM sys.server_principals WHERE name = 'wikijs_user')
BEGIN
    PRINT 'Creazione login wikijs_user...'

    -- MODIFICA QUESTA PASSWORD!
    CREATE LOGIN [wikijs_user]
    WITH PASSWORD = N'WikiJS_P@ssw0rd!2024',
         DEFAULT_DATABASE = [WikiJS],
         CHECK_EXPIRATION = OFF,
         CHECK_POLICY = OFF

    PRINT 'Login wikijs_user creato!'
END
ELSE
BEGIN
    PRINT 'Login wikijs_user esiste già!'
END
GO

USE [WikiJS]
GO

-- Crea user nel database WikiJS
IF NOT EXISTS (SELECT name FROM sys.database_principals WHERE name = 'wikijs_user')
BEGIN
    PRINT 'Creazione user wikijs_user nel database WikiJS...'

    CREATE USER [wikijs_user] FOR LOGIN [wikijs_user]

    -- Assegna ruoli necessari
    ALTER ROLE [db_owner] ADD MEMBER [wikijs_user]

    PRINT 'User wikijs_user configurato con permessi db_owner!'
END
ELSE
BEGIN
    PRINT 'User wikijs_user esiste già nel database!'
END
GO

-- Verifica permessi
SELECT
    dp.name AS [User],
    dp.type_desc AS [Tipo],
    dp.create_date AS [Data Creazione],
    STRING_AGG(drole.name, ', ') AS [Ruoli]
FROM sys.database_principals dp
LEFT JOIN sys.database_role_members drm ON dp.principal_id = drm.member_principal_id
LEFT JOIN sys.database_principals drole ON drm.role_principal_id = drole.principal_id
WHERE dp.name = 'wikijs_user'
GROUP BY dp.name, dp.type_desc, dp.create_date
GO

PRINT 'Setup utente completato!'
PRINT 'Usa queste credenziali in docker-compose.yml:'
PRINT '  DB_USER: wikijs_user'
PRINT '  DB_PASS: WikiJS_P@ssw0rd!2024'
GO
