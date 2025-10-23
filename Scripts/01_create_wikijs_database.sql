-- =====================================================
-- Script: Creazione Database WikiJS per Wiki.js
-- Versione: 1.0
-- Data: 2025-10-23
-- Descrizione: Crea database separato per Wiki.js
-- =====================================================

USE [master]
GO

-- Verifica se database esiste già
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'WikiJS')
BEGIN
    PRINT 'Creazione database WikiJS...'

    CREATE DATABASE [WikiJS]
     CONTAINMENT = NONE
     ON PRIMARY
    (
        NAME = N'WikiJS',
        FILENAME = N'C:\Program Files\Microsoft SQL Server\MSSQL16.ARCHASERVER\MSSQL\DATA\WikiJS.mdf',
        SIZE = 100MB,
        MAXSIZE = UNLIMITED,
        FILEGROWTH = 10MB
    )
     LOG ON
    (
        NAME = N'WikiJS_log',
        FILENAME = N'C:\Program Files\Microsoft SQL Server\MSSQL16.ARCHASERVER\MSSQL\DATA\WikiJS_log.ldf',
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

-- Imposta recovery model a SIMPLE (per dev) o FULL (per prod)
ALTER DATABASE [WikiJS] SET RECOVERY SIMPLE
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
GO
