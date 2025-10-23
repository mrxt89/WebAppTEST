-- =====================================================
-- WikiJS - Navigazione e Tree AR_Pages
-- WebAppTEST Documentation - Struttura gerarchica
-- =====================================================

USE [WikiJS]
GO

-- Inserimento Page Links per navigazione AR_Pages
INSERT INTO [dbo].[pageLinks] (
    [path], 
    [localeCode], 
    [pageId]
) VALUES 
-- Root Level (pageLevel: 1)
('/', 'it', 1),                    -- Dashboard
('/anagrafiche', 'it', 4),         -- Anagrafiche
('/pianificazione', 'it', 7),      -- Pianificazione
('/produzione', 'it', 9),          -- Produzione
('/progetti', 'it', 15),           -- Progetti

-- Second Level (pageLevel: 2)
('/permessi', 'it', 2),            -- Permessi
('/anagrafiche/articoli', 'it', 5), -- Articoli
('/anagrafiche/clienti-fornitori', 'it', 6), -- Clienti e Fornitori
('/anagrafiche/distinte-basi', 'it', 12), -- Distinte Basi
('/anagrafiche/risorse', 'it', 13), -- Risorse
('/pianificazione/odp', 'it', 8),  -- Ordini di Produzione
('/pianificazione/calendari', 'it', 14), -- Calendari
('/produzione/avanzamento', 'it', 10), -- Avanzamento
('/progetti/dashboard', 'it', 16), -- Dashboard Progetti
('/progetti/mie-attivita', 'it', 20), -- Le Mie Attività
('/progetti/templates', 'it', 21), -- Templates Progetti
('/progetti/categorie', 'it', 19), -- Categorie Progetti
('/progetti/clienti', 'it', 22),   -- Clienti Progetti
('/progetti/costificazione', 'it', 23), -- Costificazione
('/progetti/intercompany', 'it', 1023); -- Intercompany

-- Inserimento Page Tree per struttura gerarchica AR_Pages
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
-- Root Level (pageLevel: 1)
(1, '/', 0, 'Dashboard', 0, 1, NULL, NULL, 1, 'it', '[]'),
(4, '/anagrafiche', 0, 'Anagrafiche', 0, 1, NULL, NULL, 4, 'it', '[]'),
(7, '/pianificazione', 0, 'Pianificazione', 0, 1, NULL, NULL, 7, 'it', '[]'),
(9, '/produzione', 0, 'Produzione', 0, 1, NULL, NULL, 9, 'it', '[]'),
(15, '/progetti', 0, 'Progetti', 0, 1, NULL, NULL, 15, 'it', '[]'),

-- Second Level (pageLevel: 2) - Children of Dashboard
(2, '/permessi', 1, 'Permessi', 0, 0, NULL, 1, 2, 'it', '[1]'),

-- Second Level (pageLevel: 2) - Children of Anagrafiche
(5, '/anagrafiche/articoli', 1, 'Articoli', 0, 0, NULL, 4, 5, 'it', '[4]'),
(6, '/anagrafiche/clienti-fornitori', 1, 'Clienti e Fornitori', 0, 0, NULL, 4, 6, 'it', '[4]'),
(12, '/anagrafiche/distinte-basi', 1, 'Distinte Basi', 0, 0, NULL, 4, 12, 'it', '[4]'),
(13, '/anagrafiche/risorse', 1, 'Risorse', 0, 0, NULL, 4, 13, 'it', '[4]'),

-- Second Level (pageLevel: 2) - Children of Pianificazione
(8, '/pianificazione/odp', 1, 'Ordini di Produzione', 0, 0, NULL, 7, 8, 'it', '[7]'),
(14, '/pianificazione/calendari', 1, 'Calendari di Produzione', 0, 0, NULL, 7, 14, 'it', '[7]'),

-- Second Level (pageLevel: 2) - Children of Produzione
(10, '/produzione/avanzamento', 1, 'Avanzamento', 0, 0, NULL, 9, 10, 'it', '[9]'),

-- Second Level (pageLevel: 2) - Children of Progetti
(16, '/progetti/dashboard', 1, 'Dashboard Progetti', 0, 0, NULL, 15, 16, 'it', '[15]'),
(20, '/progetti/mie-attivita', 1, 'Le Mie Attività', 0, 0, NULL, 15, 20, 'it', '[15]'),
(21, '/progetti/templates', 1, 'Templates Progetti', 0, 0, NULL, 15, 21, 'it', '[15]'),
(19, '/progetti/categorie', 1, 'Categorie Progetti', 0, 0, NULL, 15, 19, 'it', '[15]'),
(22, '/progetti/clienti', 1, 'Clienti Progetti', 0, 0, NULL, 15, 22, 'it', '[15]'),
(23, '/progetti/costificazione', 1, 'Costificazione Distinte', 0, 0, NULL, 15, 23, 'it', '[15]'),
(1023, '/progetti/intercompany', 1, 'Intercompany', 0, 0, NULL, 15, 1023, 'it', '[15]');

-- Inserimento Page Tags per categorizzazione AR_Pages
INSERT INTO [dbo].[pageTags] ([pageId], [tagId]) VALUES 
-- Dashboard e Permessi
(1, 1), (1, 2), -- dashboard, permessi
(2, 2), (2, 8), -- permessi, admin

-- Anagrafiche
(4, 3), (4, 1), -- anagrafiche, dashboard
(5, 4), (5, 3), -- articoli, anagrafiche
(6, 5), (6, 3), -- clienti-fornitori, anagrafiche
(12, 10), (12, 3), -- distinte-basi, anagrafiche
(13, 11), (13, 3), -- risorse, anagrafiche

-- Pianificazione
(7, 6), (7, 1), -- pianificazione, dashboard
(8, 7), (8, 6), -- odp, pianificazione
(14, 12), (14, 6), -- calendari, pianificazione

-- Produzione
(9, 7), (9, 1), -- produzione, dashboard
(10, 9), (10, 7), -- avanzamento, produzione

-- Progetti
(15, 13), (15, 1), -- progetti, dashboard
(16, 14), (16, 13), -- dashboard-progetti, progetti
(19, 15), (19, 13), -- categorie-progetti, progetti
(20, 16), (20, 13), -- mie-attivita, progetti
(21, 17), (21, 13), -- templates-progetti, progetti
(22, 18), (22, 13), -- clienti-progetti, progetti
(23, 19), (23, 13), -- costificazione, progetti
(1023, 20), (1023, 13); -- intercompany, progetti

-- Configurazione Navigazione AR_Pages
INSERT INTO [dbo].[navigation] (
    [key], 
    [config]
) VALUES (
    'main', 
    '{
        "items": [
            {
                "type": "page",
                "id": "dashboard",
                "label": "Dashboard",
                "path": "/",
                "icon": "home"
            },
            {
                "type": "group",
                "label": "Anagrafiche",
                "icon": "users",
                "items": [
                    {
                        "type": "page",
                        "id": "articoli",
                        "label": "Articoli",
                        "path": "/anagrafiche/articoli",
                        "icon": "package"
                    },
                    {
                        "type": "page",
                        "id": "clienti-fornitori",
                        "label": "Clienti e Fornitori",
                        "path": "/anagrafiche/clienti-fornitori",
                        "icon": "building"
                    },
                    {
                        "type": "page",
                        "id": "distinte-basi",
                        "label": "Distinte Basi",
                        "path": "/anagrafiche/distinte-basi",
                        "icon": "layers"
                    },
                    {
                        "type": "page",
                        "id": "risorse",
                        "label": "Risorse",
                        "path": "/anagrafiche/risorse",
                        "icon": "settings"
                    }
                ]
            },
            {
                "type": "group",
                "label": "Pianificazione",
                "icon": "calendar",
                "items": [
                    {
                        "type": "page",
                        "id": "odp",
                        "label": "Ordini di Produzione",
                        "path": "/pianificazione/odp",
                        "icon": "clipboard-list"
                    },
                    {
                        "type": "page",
                        "id": "calendari",
                        "label": "Calendari di Produzione",
                        "path": "/pianificazione/calendari",
                        "icon": "calendar-days"
                    }
                ]
            },
            {
                "type": "group",
                "label": "Produzione",
                "icon": "factory",
                "items": [
                    {
                        "type": "page",
                        "id": "avanzamento",
                        "label": "Avanzamento",
                        "path": "/produzione/avanzamento",
                        "icon": "trending-up"
                    }
                ]
            },
            {
                "type": "group",
                "label": "Progetti",
                "icon": "folder",
                "items": [
                    {
                        "type": "page",
                        "id": "dashboard-progetti",
                        "label": "Dashboard Progetti",
                        "path": "/progetti/dashboard",
                        "icon": "bar-chart-3"
                    },
                    {
                        "type": "page",
                        "id": "mie-attivita",
                        "label": "Le Mie Attività",
                        "path": "/progetti/mie-attivita",
                        "icon": "check-square"
                    },
                    {
                        "type": "page",
                        "id": "templates-progetti",
                        "label": "Templates Progetti",
                        "path": "/progetti/templates",
                        "icon": "file-template"
                    },
                    {
                        "type": "page",
                        "id": "categorie-progetti",
                        "label": "Categorie Progetti",
                        "path": "/progetti/categorie",
                        "icon": "tags"
                    },
                    {
                        "type": "page",
                        "id": "clienti-progetti",
                        "label": "Clienti Progetti",
                        "path": "/progetti/clienti",
                        "icon": "user-check"
                    },
                    {
                        "type": "page",
                        "id": "costificazione",
                        "label": "Costificazione Distinte",
                        "path": "/progetti/costificazione",
                        "icon": "calculator"
                    },
                    {
                        "type": "page",
                        "id": "intercompany",
                        "label": "Intercompany",
                        "path": "/progetti/intercompany",
                        "icon": "network"
                    }
                ]
            },
            {
                "type": "group",
                "label": "Amministrazione",
                "icon": "shield",
                "items": [
                    {
                        "type": "page",
                        "id": "permessi",
                        "label": "Permessi",
                        "path": "/permessi",
                        "icon": "key"
                    }
                ]
            }
        ]
    }'
);

-- Configurazione Settings per AR_Pages
INSERT INTO [dbo].[settings] (
    [key], 
    [value], 
    [updatedAt]
) VALUES 
('site', '{"title":"WebAppTEST - AR_Pages Documentation","description":"Documentazione completa delle pagine AR_Pages del sistema WebAppTEST","logo":"","favicon":"","footer":"© 2025 WebAppTEST - Sistema di Gestione Progetti"}', '2025-01-23T10:00:00.000Z'),
('features', '{"pageHistory":true,"pageComments":true,"pageRating":false,"pageTags":true,"pageToc":true,"pageSource":true,"pageEdit":true,"pageDelete":true,"pageMove":true,"pageDuplicate":true,"pageTemplate":true,"pageDraft":true,"pagePrivate":true,"pagePublish":true,"pageUnpublish":true,"pageLock":true,"pageUnlock":true,"pageArchive":true,"pageUnarchive":true,"pageRestore":true,"pagePurge":true}', '2025-01-23T10:00:00.000Z'),
('theme', '{"primaryColor":"#3b82f6","secondaryColor":"#64748b","accentColor":"#f59e0b","backgroundColor":"#ffffff","textColor":"#1f2937","linkColor":"#3b82f6","borderColor":"#e5e7eb","shadowColor":"#000000","fontFamily":"Inter, system-ui, sans-serif","fontSize":"16px","lineHeight":"1.6","borderRadius":"8px","spacing":"1rem"}', '2025-01-23T10:00:00.000Z'),
('security', '{"passwordMinLength":8,"passwordRequireUppercase":true,"passwordRequireLowercase":true,"passwordRequireNumbers":true,"passwordRequireSpecialChars":false,"sessionTimeout":3600,"maxLoginAttempts":5,"lockoutDuration":900,"requireEmailVerification":false,"allowSelfRegistration":false}', '2025-01-23T10:00:00.000Z'),
('system', '{"maintenanceMode":false,"allowGuestAccess":true,"defaultLocale":"it","supportedLocales":["it","en"],"timezone":"Europe/Rome","dateFormat":"DD/MM/YYYY","timeFormat":"24h","currency":"EUR","units":"metric"}', '2025-01-23T10:00:00.000Z'),
('arPages', '{"enabled":true,"syncEnabled":false,"lastSync":"2025-01-23T10:00:00.000Z","totalPages":18,"activePages":8,"disabledPages":10}', '2025-01-23T10:00:00.000Z');

PRINT 'Navigazione e struttura gerarchica AR_Pages WikiJS completata!'
