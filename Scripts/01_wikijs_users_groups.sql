-- =====================================================
-- WikiJS - Configurazione Utenti e Gruppi
-- WebAppTEST Documentation
-- =====================================================

USE [WikiJS]
GO

-- Inserimento Gruppi di Base
INSERT INTO [dbo].[groups] (
    [name], 
    [permissions], 
    [pageRules], 
    [isSystem], 
    [createdAt], 
    [updatedAt], 
    [redirectOnLogin]
) VALUES 
-- Gruppo Amministratori
('Administrators', 
 '["admin","manage:system","manage:users","manage:groups","manage:pages","manage:assets","manage:analytics","manage:authentication","manage:storage","manage:renderers","manage:editors","manage:locales","manage:search","manage:comments","manage:api"]', 
 '[]', 
 1, 
 '2025-01-23T10:00:00.000Z', 
 '2025-01-23T10:00:00.000Z', 
 '/'),

-- Gruppo Editori
('Editors', 
 '["manage:pages","manage:assets","manage:comments"]', 
 '[]', 
 0, 
 '2025-01-23T10:00:00.000Z', 
 '2025-01-23T10:00:00.000Z', 
 '/'),

-- Gruppo Utenti
('Users', 
 '["read:pages","read:assets","manage:comments"]', 
 '[]', 
 0, 
 '2025-01-23T10:00:00.000Z', 
 '2025-01-23T10:00:00.000Z', 
 '/'),

-- Gruppo Guest
('Guests', 
 '["read:pages","read:assets"]', 
 '[]', 
 0, 
 '2025-01-23T10:00:00.000Z', 
 '2025-01-23T10:00:00.000Z', 
 '/');

-- Inserimento Utenti di Base
INSERT INTO [dbo].[users] (
    [email], 
    [name], 
    [providerId], 
    [password], 
    [tfaIsActive], 
    [tfaSecret], 
    [jobTitle], 
    [location], 
    [pictureUrl], 
    [timezone], 
    [isSystem], 
    [isActive], 
    [isVerified], 
    [mustChangePwd], 
    [createdAt], 
    [updatedAt], 
    [providerKey], 
    [localeCode], 
    [defaultEditor], 
    [lastLoginAt], 
    [dateFormat], 
    [appearance]
) VALUES 
-- Amministratore Sistema
('admin@webapptest.local', 
 'Amministratore Sistema', 
 'admin', 
 '$2a$10$rQZ8K9vL2mN3oP4qR5sT6uV7wX8yZ9aB0cD1eF2gH3iJ4kL5mN6oP7qR8sT9uV', 
 0, 
 NULL, 
 'System Administrator', 
 'Italia', 
 NULL, 
 'Europe/Rome', 
 0, 
 1, 
 1, 
 0, 
 '2025-01-23T10:00:00.000Z', 
 '2025-01-23T10:00:00.000Z', 
 'local', 
 'it', 
 'markdown', 
 NULL, 
 'DD/MM/YYYY', 
 'auto'),

-- Utente Documentazione
('docs@webapptest.local', 
 'Documentazione Team', 
 'docs', 
 '$2a$10$rQZ8K9vL2mN3oP4qR5sT6uV7wX8yZ9aB0cD1eF2gH3iJ4kL5mN6oP7qR8sT9uV', 
 0, 
 NULL, 
 'Technical Writer', 
 'Italia', 
 NULL, 
 'Europe/Rome', 
 0, 
 1, 
 1, 
 0, 
 '2025-01-23T10:00:00.000Z', 
 '2025-01-23T10:00:00.000Z', 
 'local', 
 'it', 
 'markdown', 
 NULL, 
 'DD/MM/YYYY', 
 'auto');

-- Associazione Utenti ai Gruppi
INSERT INTO [dbo].[userGroups] ([userId], [groupId]) VALUES 
(1, 1), -- Admin -> Administrators
(2, 2); -- Docs -> Editors

PRINT 'Utenti e gruppi WikiJS creati con successo!'
