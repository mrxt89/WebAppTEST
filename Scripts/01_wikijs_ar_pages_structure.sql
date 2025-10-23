-- =====================================================
-- WikiJS - Struttura Pagine AR_Pages
-- WebAppTEST Documentation - Mappatura completa
-- =====================================================

USE [WikiJS]
GO

-- Inserimento Tag per Categorizzazione AR_Pages
INSERT INTO [dbo].[tags] (
    [tag], 
    [title], 
    [createdAt], 
    [updatedAt]
) VALUES 
('dashboard', 'Dashboard e Controlli', '2025-01-23T10:00:00.000Z', '2025-01-23T10:00:00.000Z'),
('permessi', 'Gestione Permessi', '2025-01-23T10:00:00.000Z', '2025-01-23T10:00:00.000Z'),
('anagrafiche', 'Anagrafiche', '2025-01-23T10:00:00.000Z', '2025-01-23T10:00:00.000Z'),
('articoli', 'Articoli', '2025-01-23T10:00:00.000Z', '2025-01-23T10:00:00.000Z'),
('clienti-fornitori', 'Clienti e Fornitori', '2025-01-23T10:00:00.000Z', '2025-01-23T10:00:00.000Z'),
('pianificazione', 'Pianificazione', '2025-01-23T10:00:00.000Z', '2025-01-23T10:00:00.000Z'),
('produzione', 'Produzione', '2025-01-23T10:00:00.000Z', '2025-01-23T10:00:00.000Z'),
('odp', 'Ordini di Produzione', '2025-01-23T10:00:00.000Z', '2025-01-23T10:00:00.000Z'),
('avanzamento', 'Avanzamento', '2025-01-23T10:00:00.000Z', '2025-01-23T10:00:00.000Z'),
('distinte-basi', 'Distinte Basi', '2025-01-23T10:00:00.000Z', '2025-01-23T10:00:00.000Z'),
('risorse', 'Risorse', '2025-01-23T10:00:00.000Z', '2025-01-23T10:00:00.000Z'),
('calendari', 'Calendari di Produzione', '2025-01-23T10:00:00.000Z', '2025-01-23T10:00:00.000Z'),
('progetti', 'Progetti', '2025-01-23T10:00:00.000Z', '2025-01-23T10:00:00.000Z'),
('dashboard-progetti', 'Dashboard Progetti', '2025-01-23T10:00:00.000Z', '2025-01-23T10:00:00.000Z'),
('categorie-progetti', 'Categorie Progetti', '2025-01-23T10:00:00.000Z', '2025-01-23T10:00:00.000Z'),
('mie-attivita', 'Le Mie Attività', '2025-01-23T10:00:00.000Z', '2025-01-23T10:00:00.000Z'),
('templates-progetti', 'Templates Progetti', '2025-01-23T10:00:00.000Z', '2025-01-23T10:00:00.000Z'),
('clienti-progetti', 'Clienti Progetti', '2025-01-23T10:00:00.000Z', '2025-01-23T10:00:00.000Z'),
('costificazione', 'Costificazione Distinte', '2025-01-23T10:00:00.000Z', '2025-01-23T10:00:00.000Z'),
('intercompany', 'Intercompany', '2025-01-23T10:00:00.000Z', '2025-01-23T10:00:00.000Z');

-- Inserimento Pagine AR_Pages (struttura base)
INSERT INTO [dbo].[pages] (
    [path], 
    [hash], 
    [title], 
    [description], 
    [isPrivate], 
    [isPublished], 
    [privateNS], 
    [publishStartDate], 
    [publishEndDate], 
    [content], 
    [render], 
    [toc], 
    [contentType], 
    [createdAt], 
    [updatedAt], 
    [editorKey], 
    [localeCode], 
    [authorId], 
    [creatorId], 
    [extra]
) VALUES 
-- 1. Dashboard (pageId: 1, pageLevel: 1)
('/', 
 'dashboard-001', 
 'Dashboard', 
 'Pannello di controllo principale del sistema', 
 0, 
 1, 
 NULL, 
 NULL, 
 NULL, 
 '# Dashboard - Pannello di Controllo

Pannello di controllo principale del sistema WebAppTEST.

## Panoramica

La dashboard fornisce una vista d''insieme delle funzionalità principali del sistema.

## Sezioni Principali

- [Permessi](/permessi) - Gestione permessi utenti
- [Anagrafiche](/anagrafiche) - Gestione anagrafiche
- [Pianificazione](/pianificazione) - Pianificazione produzione
- [Produzione](/produzione) - Gestione produzione
- [Progetti](/progetti) - Gestione progetti

## Componenti

- **Route**: `/` (root)
- **Component**: Dashboard principale
- **Level**: 1 (root level)', 
 NULL, 
 '[]', 
 'markdown', 
 '2025-01-23T10:00:00.000Z', 
 '2025-01-23T10:00:00.000Z', 
 'markdown', 
 'it', 
 1, 
 1, 
 '{"arPageId": 1, "arPageParent": null, "arPageLevel": 1, "arPageRoute": "", "arPageComponent": "", "arSequence": 0}'),

-- 2. Permessi (pageId: 2, pageParent: 1, pageLevel: 2)
('/permessi', 
 'permessi-002', 
 'Permessi', 
 'Gestione permessi utenti e gruppi', 
 0, 
 1, 
 NULL, 
 NULL, 
 NULL, 
 '# Permessi - Gestione Utenti e Gruppi

Sistema di gestione permessi e amministrazione utenti.

## Funzionalità

- Gestione utenti
- Gestione gruppi
- Assegnazione permessi
- Controllo accessi

## Componenti

- **Route**: `/admin/dashboard`
- **Component**: `AdminDashboard`
- **Parent**: Dashboard
- **Level**: 2', 
 NULL, 
 '[]', 
 'markdown', 
 '2025-01-23T10:00:00.000Z', 
 '2025-01-23T10:00:00.000Z', 
 'markdown', 
 'it', 
 1, 
 1, 
 '{"arPageId": 2, "arPageParent": 1, "arPageLevel": 2, "arPageRoute": "/admin/dashboard", "arPageComponent": "AdminDashboard", "arSequence": 0}'),

-- 4. Anagrafiche (pageId: 4, pageLevel: 1)
('/anagrafiche', 
 'anagrafiche-004', 
 'Anagrafiche', 
 'Gestione anagrafiche del sistema', 
 0, 
 1, 
 NULL, 
 NULL, 
 NULL, 
 '# Anagrafiche

Gestione delle anagrafiche principali del sistema.

## Sezioni

- [Articoli](/anagrafiche/articoli) - Gestione articoli
- [Clienti e Fornitori](/anagrafiche/clienti-fornitori) - Gestione clienti e fornitori
- [Distinte Basi](/anagrafiche/distinte-basi) - Gestione distinte base
- [Risorse](/anagrafiche/risorse) - Gestione risorse

## Componenti

- **Route**: `/anagrafiche`
- **Component**: Anagrafiche container
- **Level**: 1 (root level)
- **Status**: Disabled', 
 NULL, 
 '[]', 
 'markdown', 
 '2025-01-23T10:00:00.000Z', 
 '2025-01-23T10:00:00.000Z', 
 'markdown', 
 'it', 
 1, 
 1, 
 '{"arPageId": 4, "arPageParent": null, "arPageLevel": 1, "arPageRoute": "", "arPageComponent": "", "arSequence": 0, "arDisabled": 1}'),

-- 5. Articoli (pageId: 5, pageParent: 4, pageLevel: 2)
('/anagrafiche/articoli', 
 'articoli-005', 
 'Articoli', 
 'Gestione articoli e codici', 
 0, 
 1, 
 NULL, 
 NULL, 
 NULL, 
 '# Articoli - Gestione Anagrafica

Sistema di gestione articoli e codici prodotto.

## Funzionalità

- Creazione articoli
- Gestione codici
- Classificazione
- Riferimenti incrociati

## Componenti

- **Route**: `/anagrafiche/articoli`
- **Component**: `Articoli.jsx`
- **Parent**: Anagrafiche
- **Level**: 2
- **Status**: Disabled', 
 NULL, 
 '[]', 
 'markdown', 
 '2025-01-23T10:00:00.000Z', 
 '2025-01-23T10:00:00.000Z', 
 'markdown', 
 'it', 
 1, 
 1, 
 '{"arPageId": 5, "arPageParent": 4, "arPageLevel": 2, "arPageRoute": "/anagrafiche/articoli", "arPageComponent": "Articoli.jsx", "arSequence": 0, "arDisabled": 1}'),

-- 6. Clienti e Fornitori (pageId: 6, pageParent: 4, pageLevel: 2)
('/anagrafiche/clienti-fornitori', 
 'clienti-fornitori-006', 
 'Clienti e Fornitori', 
 'Gestione clienti e fornitori', 
 0, 
 1, 
 NULL, 
 NULL, 
 NULL, 
 '# Clienti e Fornitori

Gestione anagrafica clienti e fornitori.

## Funzionalità

- Anagrafica clienti
- Anagrafica fornitori
- Gestione contatti
- Storico transazioni

## Componenti

- **Route**: `/anagrafiche/clientiFornitori`
- **Component**: `CustSupp.jsx`
- **Parent**: Anagrafiche
- **Level**: 2
- **Status**: Disabled', 
 NULL, 
 '[]', 
 'markdown', 
 '2025-01-23T10:00:00.000Z', 
 '2025-01-23T10:00:00.000Z', 
 'markdown', 
 'it', 
 1, 
 1, 
 '{"arPageId": 6, "arPageParent": 4, "arPageLevel": 2, "arPageRoute": "/anagrafiche/clientiFornitori", "arPageComponent": "CustSupp.jsx", "arSequence": 0, "arDisabled": 1}'),

-- 7. Pianificazione (pageId: 7, pageLevel: 1)
('/pianificazione', 
 'pianificazione-007', 
 'Pianificazione', 
 'Pianificazione produzione e risorse', 
 0, 
 1, 
 NULL, 
 NULL, 
 NULL, 
 '# Pianificazione

Sistema di pianificazione produzione e risorse.

## Sezioni

- [Ordini di Produzione](/pianificazione/odp) - Gestione ODP
- [Calendari di Produzione](/pianificazione/calendari) - Calendari produzione

## Componenti

- **Route**: `/pianificazione`
- **Component**: Pianificazione container
- **Level**: 1 (root level)
- **Status**: Disabled', 
 NULL, 
 '[]', 
 'markdown', 
 '2025-01-23T10:00:00.000Z', 
 '2025-01-23T10:00:00.000Z', 
 'markdown', 
 'it', 
 1, 
 1, 
 '{"arPageId": 7, "arPageParent": null, "arPageLevel": 1, "arPageRoute": "", "arPageComponent": "", "arSequence": 0, "arDisabled": 1}'),

-- 8. Ordini di Produzione (pageId: 8, pageParent: 7, pageLevel: 2)
('/pianificazione/odp', 
 'odp-008', 
 'Ordini di Produzione', 
 'Gestione ordini di produzione', 
 0, 
 1, 
 NULL, 
 NULL, 
 NULL, 
 '# Ordini di Produzione (ODP)

Sistema di gestione ordini di produzione.

## Funzionalità

- Creazione ODP
- Pianificazione risorse
- Controllo avanzamento
- Reportistica

## Componenti

- **Route**: `/pianificazione/ODP`
- **Component**: `ManufacturingOrder.jsx`
- **Parent**: Pianificazione
- **Level**: 2
- **Status**: Disabled', 
 NULL, 
 '[]', 
 'markdown', 
 '2025-01-23T10:00:00.000Z', 
 '2025-01-23T10:00:00.000Z', 
 'markdown', 
 'it', 
 1, 
 1, 
 '{"arPageId": 8, "arPageParent": 7, "arPageLevel": 2, "arPageRoute": "/pianificazione/ODP", "arPageComponent": "ManufacturingOrder.jsx", "arSequence": 0, "arDisabled": 1}'),

-- 9. Produzione (pageId: 9, pageLevel: 1)
('/produzione', 
 'produzione-009', 
 'Produzione', 
 'Gestione produzione e avanzamento', 
 0, 
 1, 
 NULL, 
 NULL, 
 NULL, 
 '# Produzione

Sistema di gestione produzione e avanzamento.

## Sezioni

- [Avanzamento](/produzione/avanzamento) - Controllo avanzamento ODP

## Componenti

- **Route**: `/produzione`
- **Component**: Produzione container
- **Level**: 1 (root level)
- **Status**: Disabled', 
 NULL, 
 '[]', 
 'markdown', 
 '2025-01-23T10:00:00.000Z', 
 '2025-01-23T10:00:00.000Z', 
 'markdown', 
 'it', 
 1, 
 1, 
 '{"arPageId": 9, "arPageParent": null, "arPageLevel": 1, "arPageRoute": "", "arPageComponent": "", "arSequence": 0, "arDisabled": 1}'),

-- 10. Avanzamento (pageId: 10, pageParent: 9, pageLevel: 2)
('/produzione/avanzamento', 
 'avanzamento-010', 
 'Avanzamento', 
 'Controllo avanzamento ordini di produzione', 
 0, 
 1, 
 NULL, 
 NULL, 
 NULL, 
 '# Avanzamento - Controllo ODP

Sistema di controllo avanzamento ordini di produzione.

## Funzionalità

- Monitoraggio avanzamento
- Controllo scadenze
- Reportistica produzione
- Allert automatici

## Componenti

- **Route**: `produzione/avanzamentoODP`
- **Component**: `StepProgress.jsx`
- **Parent**: Produzione
- **Level**: 2
- **Status**: Disabled', 
 NULL, 
 '[]', 
 'markdown', 
 '2025-01-23T10:00:00.000Z', 
 '2025-01-23T10:00:00.000Z', 
 'markdown', 
 'it', 
 1, 
 1, 
 '{"arPageId": 10, "arPageParent": 9, "arPageLevel": 2, "arPageRoute": "produzione/avanzamentoODP", "arPageComponent": "StepProgress.jsx", "arSequence": 0, "arDisabled": 1}'),

-- 12. Distinte Basi (pageId: 12, pageParent: 4, pageLevel: 2)
('/anagrafiche/distinte-basi', 
 'distinte-basi-012', 
 'Distinte Basi', 
 'Gestione distinte base e BOM', 
 0, 
 1, 
 NULL, 
 NULL, 
 NULL, 
 '# Distinte Basi (BOM)

Sistema di gestione distinte base e BOM.

## Funzionalità

- Creazione BOM
- Versioning distinte
- Costing BOM
- Import/Export

## Componenti

- **Route**: `/anagrafiche/distinte`
- **Component**: `BillOfMaterials.jsx`
- **Parent**: Anagrafiche
- **Level**: 2
- **Status**: Disabled', 
 NULL, 
 '[]', 
 'markdown', 
 '2025-01-23T10:00:00.000Z', 
 '2025-01-23T10:00:00.000Z', 
 'markdown', 
 'it', 
 1, 
 1, 
 '{"arPageId": 12, "arPageParent": 4, "arPageLevel": 2, "arPageRoute": "/anagrafiche/distinte", "arPageComponent": "BillOfMaterials.jsx", "arSequence": 0, "arDisabled": 1}'),

-- 13. Risorse (pageId: 13, pageParent: 4, pageLevel: 2)
('/anagrafiche/risorse', 
 'risorse-013', 
 'Risorse', 
 'Gestione risorse e centri di lavoro', 
 0, 
 1, 
 NULL, 
 NULL, 
 NULL, 
 '# Risorse - Centri di Lavoro

Sistema di gestione risorse e centri di lavoro.

## Funzionalità

- Anagrafica risorse
- Centri di lavoro
- Capacità produttive
- Calendari risorse

## Componenti

- **Route**: `/anagrafiche/risorse`
- **Component**: `Resources.jsx`
- **Parent**: Anagrafiche
- **Level**: 2
- **Status**: Disabled', 
 NULL, 
 '[]', 
 'markdown', 
 '2025-01-23T10:00:00.000Z', 
 '2025-01-23T10:00:00.000Z', 
 'markdown', 
 'it', 
 1, 
 1, 
 '{"arPageId": 13, "arPageParent": 4, "arPageLevel": 2, "arPageRoute": "/anagrafiche/risorse", "arPageComponent": "Resources.jsx", "arSequence": 0, "arDisabled": 1}'),

-- 14. Calendari di Produzione (pageId: 14, pageParent: 7, pageLevel: 2)
('/pianificazione/calendari', 
 'calendari-014', 
 'Calendari di Produzione', 
 'Gestione calendari di produzione', 
 0, 
 1, 
 NULL, 
 NULL, 
 NULL, 
 '# Calendari di Produzione

Sistema di gestione calendari di produzione.

## Funzionalità

- Creazione calendari
- Gestione turni
- Pianificazione risorse
- Controllo disponibilità

## Componenti

- **Route**: `/pianificazione/calendari`
- **Component**: `ProductionCalendar.jsx`
- **Parent**: Pianificazione
- **Level**: 2
- **Status**: Disabled', 
 NULL, 
 '[]', 
 'markdown', 
 '2025-01-23T10:00:00.000Z', 
 '2025-01-23T10:00:00.000Z', 
 'markdown', 
 'it', 
 1, 
 1, 
 '{"arPageId": 14, "arPageParent": 7, "arPageLevel": 2, "arPageRoute": "/pianificazione/calendari", "arPageComponent": "ProductionCalendar.jsx", "arSequence": 0, "arDisabled": 1}'),

-- 15. Progetti (pageId: 15, pageLevel: 1)
('/progetti', 
 'progetti-015', 
 'Progetti', 
 'Gestione progetti e attività', 
 0, 
 1, 
 NULL, 
 NULL, 
 NULL, 
 '# Progetti - Gestione Completa

Sistema completo di gestione progetti e attività.

## Sezioni

- [Dashboard Progetti](/progetti/dashboard) - Dashboard progetti
- [Le Mie Attività](/progetti/mie-attivita) - Gestione attività personali
- [Templates Progetti](/progetti/templates) - Template progetti
- [Categorie Progetti](/progetti/categorie) - Categorie progetti
- [Clienti Progetti](/progetti/clienti) - Clienti progetti
- [Costificazione Distinte](/progetti/costificazione) - Costificazione BOM
- [Intercompany](/progetti/intercompany) - Gestione intercompany

## Componenti

- **Route**: `/progetti`
- **Component**: Progetti container
- **Level**: 1 (root level)
- **Status**: Active', 
 NULL, 
 '[]', 
 'markdown', 
 '2025-01-23T10:00:00.000Z', 
 '2025-01-23T10:00:00.000Z', 
 'markdown', 
 'it', 
 1, 
 1, 
 '{"arPageId": 15, "arPageParent": null, "arPageLevel": 1, "arPageRoute": "", "arPageComponent": "", "arSequence": 0, "arDisabled": 0}'),

-- 16. Dashboard Progetti (pageId: 16, pageParent: 15, pageLevel: 2)
('/progetti/dashboard', 
 'dashboard-progetti-016', 
 'Dashboard Progetti', 
 'Dashboard principale per la gestione progetti', 
 0, 
 1, 
 NULL, 
 NULL, 
 NULL, 
 '# Dashboard Progetti

Dashboard principale per la gestione e monitoraggio progetti.

## Funzionalità

- Vista d''insieme progetti
- Statistiche e KPI
- Progetti recenti
- Attività in corso

## Componenti

- **Route**: `/progetti/dashboard`
- **Component**: `ProjectsDashboard.jsx`
- **Parent**: Progetti
- **Level**: 2
- **Sequence**: 1
- **Status**: Active', 
 NULL, 
 '[]', 
 'markdown', 
 '2025-01-23T10:00:00.000Z', 
 '2025-01-23T10:00:00.000Z', 
 'markdown', 
 'it', 
 1, 
 1, 
 '{"arPageId": 16, "arPageParent": 15, "arPageLevel": 2, "arPageRoute": "/progetti/dashboard", "arPageComponent": "ProjectsDashboard.jsx", "arSequence": 1, "arDisabled": 0}'),

-- 19. Categorie Progetti (pageId: 19, pageParent: 15, pageLevel: 2)
('/progetti/categorie', 
 'categorie-progetti-019', 
 'Categorie Progetti', 
 'Gestione categorie e classificazione progetti', 
 0, 
 1, 
 NULL, 
 NULL, 
 NULL, 
 '# Categorie Progetti

Sistema di gestione categorie e classificazione progetti.

## Funzionalità

- Creazione categorie
- Classificazione progetti
- Filtri per categoria
- Reportistica per categoria

## Componenti

- **Route**: `/progetti/categorie`
- **Component**: `ProjectCategories.jsx`
- **Parent**: Progetti
- **Level**: 2
- **Sequence**: 4
- **Status**: Active', 
 NULL, 
 '[]', 
 'markdown', 
 '2025-01-23T10:00:00.000Z', 
 '2025-01-23T10:00:00.000Z', 
 'markdown', 
 'it', 
 1, 
 1, 
 '{"arPageId": 19, "arPageParent": 15, "arPageLevel": 2, "arPageRoute": "/progetti/categorie", "arPageComponent": "ProjectCategories.jsx", "arSequence": 4, "arDisabled": 0}'),

-- 20. Lista Attività (pageId: 20, pageParent: 15, pageLevel: 2)
('/progetti/mie-attivita', 
 'mie-attivita-020', 
 'Le Mie Attività', 
 'Gestione attività personali e time tracking', 
 0, 
 1, 
 NULL, 
 NULL, 
 NULL, 
 '# Le Mie Attività

Sistema di gestione attività personali e time tracking.

## Funzionalità

- Lista attività assegnate
- Time tracking
- Vista Kanban
- Timeline view
- Statistiche personali

## Componenti

- **Route**: `/progetti/attivita`
- **Component**: `MyTasksPage.jsx`
- **Parent**: Progetti
- **Level**: 2
- **Sequence**: 2
- **Status**: Active', 
 NULL, 
 '[]', 
 'markdown', 
 '2025-01-23T10:00:00.000Z', 
 '2025-01-23T10:00:00.000Z', 
 'markdown', 
 'it', 
 1, 
 1, 
 '{"arPageId": 20, "arPageParent": 15, "arPageLevel": 2, "arPageRoute": "/progetti/attivita", "arPageComponent": "MyTasksPage.jsx", "arSequence": 2, "arDisabled": 0}'),

-- 21. Templates Progetti (pageId: 21, pageParent: 15, pageLevel: 2)
('/progetti/templates', 
 'templates-progetti-021', 
 'Templates Progetti', 
 'Gestione template per progetti', 
 0, 
 1, 
 NULL, 
 NULL, 
 NULL, 
 '# Templates Progetti

Sistema di gestione template per progetti.

## Funzionalità

- Creazione template
- Applicazione template
- Gestione stage template
- Condivisione template

## Componenti

- **Route**: `/progetti/templates`
- **Component**: `projectTemplates.jsx`
- **Parent**: Progetti
- **Level**: 2
- **Sequence**: 3
- **Status**: Active', 
 NULL, 
 '[]', 
 'markdown', 
 '2025-01-23T10:00:00.000Z', 
 '2025-01-23T10:00:00.000Z', 
 'markdown', 
 'it', 
 1, 
 1, 
 '{"arPageId": 21, "arPageParent": 15, "arPageLevel": 2, "arPageRoute": "/progetti/templates", "arPageComponent": "projectTemplates.jsx", "arSequence": 3, "arDisabled": 0}'),

-- 22. Clienti Progetti (pageId: 22, pageParent: 15, pageLevel: 2)
('/progetti/clienti', 
 'clienti-progetti-022', 
 'Clienti Progetti', 
 'Gestione clienti per progetti', 
 0, 
 1, 
 NULL, 
 NULL, 
 NULL, 
 '# Clienti Progetti

Sistema di gestione clienti specifici per progetti.

## Funzionalità

- Anagrafica clienti progetti
- Storico progetti per cliente
- Reportistica per cliente
- Gestione contratti

## Componenti

- **Route**: `/progetti/clienti`
- **Component**: `ProjectCustomers.jsx`
- **Parent**: Progetti
- **Level**: 2
- **Sequence**: 5
- **Status**: Active', 
 NULL, 
 '[]', 
 'markdown', 
 '2025-01-23T10:00:00.000Z', 
 '2025-01-23T10:00:00.000Z', 
 'markdown', 
 'it', 
 1, 
 1, 
 '{"arPageId": 22, "arPageParent": 15, "arPageLevel": 2, "arPageRoute": "/progetti/clienti", "arPageComponent": "ProjectCustomers.jsx", "arSequence": 5, "arDisabled": 0}'),

-- 23. Costificazione Distinte (pageId: 23, pageParent: 15, pageLevel: 2)
('/progetti/costificazione', 
 'costificazione-023', 
 'Costificazione Distinte', 
 'Sistema di costificazione BOM e distinte', 
 0, 
 1, 
 NULL, 
 NULL, 
 NULL, 
 '# Costificazione Distinte

Sistema avanzato di costificazione BOM e distinte base.

## Funzionalità

- Calcolo costi BOM
- Gestione markup
- Analisi costi
- Reportistica costing

## Componenti

- **Route**: `progetti/articoli`
- **Component**: `BOMCosting.jsx`
- **Parent**: Progetti
- **Level**: 2
- **Sequence**: 6
- **Status**: Active', 
 NULL, 
 '[]', 
 'markdown', 
 '2025-01-23T10:00:00.000Z', 
 '2025-01-23T10:00:00.000Z', 
 'markdown', 
 'it', 
 1, 
 1, 
 '{"arPageId": 23, "arPageParent": 15, "arPageLevel": 2, "arPageRoute": "progetti/articoli", "arPageComponent": "BOMCosting.jsx", "arSequence": 6, "arDisabled": 0}'),

-- 1023. Intercompany (pageId: 1023, pageParent: 15, pageLevel: 2)
('/progetti/intercompany', 
 'intercompany-1023', 
 'Intercompany', 
 'Gestione condivisioni e operazioni intercompany', 
 0, 
 1, 
 NULL, 
 NULL, 
 NULL, 
 '# Intercompany

Sistema di gestione condivisioni e operazioni intercompany.

## Funzionalità

- Dashboard intercompany
- Gestione condivisioni
- Sync automatico
- Chat e comunicazioni
- Request management

## Componenti

- **Route**: `/progetti/intercompany`
- **Component**: `IntercompanyDashboard`
- **Parent**: Progetti
- **Level**: 2
- **Sequence**: 5
- **Status**: Active', 
 NULL, 
 '[]', 
 'markdown', 
 '2025-01-23T10:00:00.000Z', 
 '2025-01-23T10:00:00.000Z', 
 'markdown', 
 'it', 
 1, 
 1, 
 '{"arPageId": 1023, "arPageParent": 15, "arPageLevel": 2, "arPageRoute": "/progetti/intercompany", "arPageComponent": "IntercompanyDashboard", "arSequence": 5, "arDisabled": 0}');

PRINT 'Struttura pagine AR_Pages WikiJS creata con successo!'
