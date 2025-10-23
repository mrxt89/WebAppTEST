-- =====================================================
-- WikiJS - Configurazione Navigazione e Tree
-- WebAppTEST Documentation
-- =====================================================

USE [WikiJS]
GO

-- Inserimento Page Links per navigazione
INSERT INTO [dbo].[pageLinks] (
    [path], 
    [localeCode], 
    [pageId]
) VALUES 
('/', 'it', 1),
('/progetti', 'it', 2),
('/articoli', 'it', 3),
('/intercompany', 'it', 4),
('/attivita', 'it', 5),
('/admin', 'it', 6),
('/api', 'it', 7),
('/deploy', 'it', 8);

-- Inserimento Page Tree per struttura navigazione
INSERT INTO [dbo].[pageTree] (
    [id], 
    [path], 
    [depth], 
    [title], 
    [isPrivate], 
    [isFolder], 
    [privateNS], 
    [parent], 
    [pageId], 
    [localeCode], 
    [ancestors]
) VALUES 
-- Root
(1, '/', 0, 'WebAppTEST - Documentazione', 0, 1, NULL, NULL, 1, 'it', '[]'),

-- Pagine principali (depth 1)
(2, '/progetti', 1, 'Gestione Progetti', 0, 0, NULL, 1, 2, 'it', '[1]'),
(3, '/articoli', 1, 'Articoli e BOM', 0, 0, NULL, 1, 3, 'it', '[1]'),
(4, '/intercompany', 1, 'Intercompany', 0, 0, NULL, 1, 4, 'it', '[1]'),
(5, '/attivita', 1, 'Attività e Task', 0, 0, NULL, 1, 5, 'it', '[1]'),
(6, '/admin', 1, 'Amministrazione', 0, 0, NULL, 1, 6, 'it', '[1]'),
(7, '/api', 1, 'API e Servizi', 0, 0, NULL, 1, 7, 'it', '[1]'),
(8, '/deploy', 1, 'Deploy e Docker', 0, 0, NULL, 1, 8, 'it', '[1]');

-- Inserimento Page Tags per categorizzazione
INSERT INTO [dbo].[pageTags] ([pageId], [tagId]) VALUES 
-- Home page
(1, 1), (1, 2), (1, 3), (1, 10), -- frontend, backend, database, docker

-- Progetti
(2, 4), (2, 7), (2, 1), -- progetti, attivita, frontend

-- Articoli
(3, 5), (3, 1), (3, 2), -- articoli, frontend, backend

-- Intercompany
(4, 6), (4, 1), (4, 2), -- intercompany, frontend, backend

-- Attività
(5, 7), (5, 1), (5, 2), -- attivita, frontend, backend

-- Admin
(6, 8), (6, 1), (6, 2), -- admin, frontend, backend

-- API
(7, 9), (7, 2), (7, 3), -- api, backend, database

-- Deploy
(8, 10), (8, 2), (8, 3); -- docker, backend, database

-- Configurazione Navigazione
INSERT INTO [dbo].[navigation] (
    [key], 
    [config]
) VALUES (
    'main', 
    '{
        "items": [
            {
                "type": "page",
                "id": "home",
                "label": "Home",
                "path": "/",
                "icon": "home"
            },
            {
                "type": "group",
                "label": "Sistema",
                "icon": "layers",
                "items": [
                    {
                        "type": "page",
                        "id": "progetti",
                        "label": "Progetti",
                        "path": "/progetti",
                        "icon": "folder"
                    },
                    {
                        "type": "page",
                        "id": "articoli",
                        "label": "Articoli e BOM",
                        "path": "/articoli",
                        "icon": "package"
                    },
                    {
                        "type": "page",
                        "id": "intercompany",
                        "label": "Intercompany",
                        "path": "/intercompany",
                        "icon": "network"
                    },
                    {
                        "type": "page",
                        "id": "attivita",
                        "label": "Attività",
                        "path": "/attivita",
                        "icon": "check-square"
                    }
                ]
            },
            {
                "type": "group",
                "label": "Amministrazione",
                "icon": "settings",
                "items": [
                    {
                        "type": "page",
                        "id": "admin",
                        "label": "Admin Panel",
                        "path": "/admin",
                        "icon": "shield"
                    },
                    {
                        "type": "page",
                        "id": "api",
                        "label": "API Docs",
                        "path": "/api",
                        "icon": "code"
                    },
                    {
                        "type": "page",
                        "id": "deploy",
                        "label": "Deploy",
                        "path": "/deploy",
                        "icon": "server"
                    }
                ]
            }
        ]
    }'
);

-- Configurazione Settings di base
INSERT INTO [dbo].[settings] (
    [key], 
    [value], 
    [updatedAt]
) VALUES 
('site', '{"title":"WebAppTEST Documentation","description":"Documentazione completa del sistema WebAppTEST","logo":"","favicon":"","footer":"© 2025 WebAppTEST - Sistema di Gestione Progetti"}', '2025-01-23T10:00:00.000Z'),
('features', '{"pageHistory":true,"pageComments":true,"pageRating":false,"pageTags":true,"pageToc":true,"pageSource":true,"pageEdit":true,"pageDelete":true,"pageMove":true,"pageDuplicate":true,"pageTemplate":true,"pageDraft":true,"pagePrivate":true,"pagePublish":true,"pageUnpublish":true,"pageLock":true,"pageUnlock":true,"pageArchive":true,"pageUnarchive":true,"pageRestore":true,"pagePurge":true}', '2025-01-23T10:00:00.000Z'),
('theme', '{"primaryColor":"#3b82f6","secondaryColor":"#64748b","accentColor":"#f59e0b","backgroundColor":"#ffffff","textColor":"#1f2937","linkColor":"#3b82f6","borderColor":"#e5e7eb","shadowColor":"#000000","fontFamily":"Inter, system-ui, sans-serif","fontSize":"16px","lineHeight":"1.6","borderRadius":"8px","spacing":"1rem"}', '2025-01-23T10:00:00.000Z'),
('security', '{"passwordMinLength":8,"passwordRequireUppercase":true,"passwordRequireLowercase":true,"passwordRequireNumbers":true,"passwordRequireSpecialChars":false,"sessionTimeout":3600,"maxLoginAttempts":5,"lockoutDuration":900,"requireEmailVerification":false,"allowSelfRegistration":false}', '2025-01-23T10:00:00.000Z'),
('system', '{"maintenanceMode":false,"allowGuestAccess":true,"defaultLocale":"it","supportedLocales":["it","en"],"timezone":"Europe/Rome","dateFormat":"DD/MM/YYYY","timeFormat":"24h","currency":"EUR","units":"metric"}', '2025-01-23T10:00:00.000Z');

PRINT 'Configurazione navigazione e settings WikiJS completata!'
