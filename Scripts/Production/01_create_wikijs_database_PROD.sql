-- =====================================================
-- Script: Creazione Database WikiJS per Wiki.js - PRODUZIONE
-- Versione: 1.0 PROD
-- Data: 2025-10-23
-- Server: 192.168.42.117
-- Descrizione: Crea database separato per Wiki.js in produzione
-- =====================================================

USE [master]
GO

-- IMPORTANTE: Verifica i percorsi dei file per il tuo SQL Server produzione!
-- Esegui questa query per trovare i percorsi corretti:
--
-- SELECT
--     physical_name
-- FROM sys.master_files
-- WHERE database_id = DB_ID('WebApp')
--
-- Poi modifica i path sotto di conseguenza

-- Verifica se database esiste già
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'WikiJS')
BEGIN
    PRINT 'Creazione database WikiJS...'

    -- MODIFICA I PATH SE DIVERSI SUL TUO SERVER PRODUZIONE
    -- Questi sono i path di default, potrebbero essere diversi
    CREATE DATABASE [WikiJS]
     CONTAINMENT = NONE
     ON PRIMARY
    (
        NAME = N'WikiJS',
        FILENAME = N'C:\Program Files\Microsoft SQL Server\MSSQL16.MSSQLSERVER\MSSQL\DATA\WikiJS.mdf',
        SIZE = 100MB,
        MAXSIZE = UNLIMITED,
        FILEGROWTH = 10MB
    )
     LOG ON
    (
        NAME = N'WikiJS_log',
        FILENAME = N'C:\Program Files\Microsoft SQL Server\MSSQL16.MSSQLSERVER\MSSQL\DATA\WikiJS_log.ldf',
        SIZE = 10MB,
        MAXSIZE = 1GB,
        FILEGROWTH = 10%
    )

    PRINT 'Database WikiJS creato con successo!'
END
ELSE
BEGIN
    PRINT 'Database WikiJS esiste già!'
END
GO

-- Imposta recovery model a FULL per produzione (SIMPLE per dev)
ALTER DATABASE [WikiJS] SET RECOVERY FULL
GO

-- Verifica creazione
USE [WikiJS]
GO

SELECT
    name AS [Database],
    database_id AS [ID],
    create_date AS [Data Creazione],
    recovery_model_desc AS [Recovery Model],
    state_desc AS [Stato]
FROM sys.databases
WHERE name = 'WikiJS'
GO

PRINT 'Setup database completato!'
PRINT 'Ora Wiki.js può creare le sue tabelle automaticamente al primo avvio.'
PRINT ''
PRINT '=============================================='
PRINT 'IMPORTANTE PER PRODUZIONE:'
PRINT '=============================================='
PRINT '1. Verifica i percorsi dei file sopra'
PRINT '2. Configura backup automatici per WikiJS'
PRINT '3. Recovery model impostato a FULL'
PRINT '=============================================='
GO
