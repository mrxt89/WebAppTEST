-- ================================================================
-- Script: Popolamento iniziale AR_Pages_Components
-- Descrizione: Inserisce i componenti wiki documentabili per le pagine webapp
-- Data: 2025-10-24
-- ================================================================

SET IDENTITY_INSERT AR_Pages_Components ON;

-- ================================================================
-- DASHBOARD PROGETTI (pageId: 16)
-- ================================================================

-- Componenti principali Dashboard Progetti
INSERT INTO AR_Pages_Components (componentId, pageId, parentComponentId, componentKey, componentName, componentDescription, wikiSlug, sequence, iconName, isActive)
VALUES
    -- Root components
    (1, 16, NULL, 'overview', 'Panoramica Progetto', 'Vista generale del progetto con informazioni principali', '/progetti/dashboard-progetti/panoramica', 10, 'LayoutDashboard', 1),
    (2, 16, NULL, 'tasks', 'Gestione Attività', 'Gestione completa delle attività del progetto', '/progetti/dashboard-progetti/attivita', 20, 'CheckSquare', 1),
    (3, 16, NULL, 'stages', 'Fasi di Lavoro', 'Gestione delle fasi e milestone del progetto', '/progetti/dashboard-progetti/fasi', 30, 'Layers', 1),
    (4, 16, NULL, 'team', 'Gestione Team', 'Membri del team e assegnazioni', '/progetti/dashboard-progetti/team', 40, 'Users', 1),
    (5, 16, NULL, 'attachments', 'Allegati', 'Gestione documenti e allegati del progetto', '/progetti/dashboard-progetti/allegati', 50, 'Paperclip', 1),
    (6, 16, NULL, 'articles', 'Articoli e BOM', 'Gestione articoli e distinte base del progetto', '/progetti/dashboard-progetti/articoli', 60, 'Package', 1),
    (7, 16, NULL, 'analytics', 'Analitiche', 'Dashboard e statistiche del progetto', '/progetti/dashboard-progetti/analitiche', 70, 'BarChart3', 1),

    -- Sotto-componenti Attività
    (10, 16, 2, 'tasks-kanban', 'Vista Kanban', 'Visualizzazione attività in formato Kanban', '/progetti/dashboard-progetti/attivita/kanban', 21, 'Trello', 1),
    (11, 16, 2, 'tasks-table', 'Vista Tabella', 'Visualizzazione attività in formato tabella', '/progetti/dashboard-progetti/attivita/tabella', 22, 'Table', 1),
    (12, 16, 2, 'tasks-gantt', 'Vista Gantt', 'Visualizzazione attività in formato Gantt', '/progetti/dashboard-progetti/attivita/gantt', 23, 'GanttChartSquare', 1),
    (13, 16, 2, 'task-details', 'Dettagli Task', 'Pannello dettagli completo di una task', '/progetti/dashboard-progetti/attivita/dettagli', 24, 'FileText', 1),

    -- Sotto-componenti Task Details Panel
    (20, 16, 13, 'task-information', 'Informazioni Task', 'Informazioni generali della task', '/progetti/dashboard-progetti/attivita/dettagli/informazioni', 241, 'Info', 1),
    (21, 16, 13, 'task-chats', 'Chat Task', 'Conversazioni e comunicazioni sulla task', '/progetti/dashboard-progetti/attivita/dettagli/chat', 242, 'MessageSquare', 1),
    (22, 16, 13, 'task-costs', 'Costi Task', 'Gestione costi della task', '/progetti/dashboard-progetti/attivita/dettagli/costi', 243, 'DollarSign', 1),
    (23, 16, 13, 'task-history', 'Storico Task', 'Storico modifiche della task', '/progetti/dashboard-progetti/attivita/dettagli/storico', 244, 'History', 1),
    (24, 16, 13, 'task-attachments', 'Allegati Task', 'Allegati della task', '/progetti/dashboard-progetti/attivita/dettagli/allegati', 245, 'Paperclip', 1),

    -- Sotto-componenti Fasi
    (30, 16, 3, 'stages-phases', 'Vista Fasi', 'Visualizzazione fasi del progetto', '/progetti/dashboard-progetti/fasi/vista-fasi', 31, 'List', 1),
    (31, 16, 3, 'stages-kanban', 'Vista Kanban Fasi', 'Fasi in formato Kanban', '/progetti/dashboard-progetti/fasi/kanban', 32, 'Trello', 1),
    (32, 16, 3, 'stages-table', 'Vista Tabella Fasi', 'Fasi in formato tabella', '/progetti/dashboard-progetti/fasi/tabella', 33, 'Table', 1),
    (33, 16, 3, 'stages-gantt', 'Vista Gantt Fasi', 'Fasi in formato Gantt', '/progetti/dashboard-progetti/fasi/gantt', 34, 'GanttChartSquare', 1),

    -- Sotto-componenti Articoli
    (40, 16, 6, 'articles-list', 'Lista Articoli', 'Elenco articoli del progetto', '/progetti/dashboard-progetti/articoli/lista', 61, 'List', 1),
    (41, 16, 6, 'articles-details', 'Dettaglio Articolo', 'Dettagli di un articolo', '/progetti/dashboard-progetti/articoli/dettaglio', 62, 'FileText', 1),
    (42, 16, 6, 'bom-viewer', 'Visualizzatore BOM', 'Visualizzazione e modifica distinta base', '/progetti/dashboard-progetti/articoli/bom', 63, 'GitBranch', 1),
    (43, 16, 6, 'bom-costing', 'Costificazione BOM', 'Calcolo costi distinta base', '/progetti/dashboard-progetti/articoli/costificazione', 64, 'Calculator', 1),

    -- Sotto-componenti BOM Viewer
    (50, 16, 42, 'bom-composition', 'Composizione BOM', 'Struttura e composizione della distinta base', '/progetti/dashboard-progetti/articoli/bom/composizione', 631, 'GitBranch', 1),
    (51, 16, 42, 'bom-summary', 'Sommario BOM', 'Riepilogo componenti e quantità', '/progetti/dashboard-progetti/articoli/bom/sommario', 632, 'ListTree', 1),
    (52, 16, 42, 'bom-documents', 'Documenti BOM', 'Documenti allegati alla distinta', '/progetti/dashboard-progetti/articoli/bom/documenti', 633, 'FileText', 1),
    (53, 16, 42, 'bom-cycles', 'Cicli Lavorazione', 'Cicli di lavorazione del componente', '/progetti/dashboard-progetti/articoli/bom/cicli', 634, 'Repeat', 1),
    (54, 16, 42, 'bom-costing-params', 'Parametri Costing', 'Parametri per il calcolo costi', '/progetti/dashboard-progetti/articoli/bom/parametri-costing', 635, 'Settings', 1),
    (55, 16, 42, 'bom-reference-panel', 'Pannello Riferimento', 'BOM di riferimento da ERP e altri progetti', '/progetti/dashboard-progetti/articoli/bom/riferimento', 636, 'ExternalLink', 1),
    (56, 16, 42, 'bom-intercompany', 'Gestione Intercompany', 'Gestione componenti intercompany', '/progetti/dashboard-progetti/articoli/bom/intercompany', 637, 'Building2', 1),

    -- Sotto-componenti Analitiche
    (60, 16, 7, 'analytics-costs', 'Analisi Costi', 'Analisi dettagliata dei costi', '/progetti/dashboard-progetti/analitiche/costi', 71, 'DollarSign', 1),
    (61, 16, 7, 'analytics-progress', 'Analisi Avanzamento', 'Analisi avanzamento lavori', '/progetti/dashboard-progetti/analitiche/avanzamento', 72, 'TrendingUp', 1),
    (62, 16, 7, 'analytics-resources', 'Analisi Risorse', 'Analisi utilizzo risorse', '/progetti/dashboard-progetti/analitiche/risorse', 73, 'Users', 1),
    (63, 16, 7, 'analytics-time', 'Analisi Tempi', 'Analisi tempi e scadenze', '/progetti/dashboard-progetti/analitiche/tempi', 74, 'Clock', 1);

-- ================================================================
-- LISTA ATTIVITÀ (pageId: 20)
-- ================================================================

INSERT INTO AR_Pages_Components (componentId, pageId, parentComponentId, componentKey, componentName, componentDescription, wikiSlug, sequence, iconName, isActive)
VALUES
    (100, 20, NULL, 'my-tasks-kanban', 'Vista Kanban', 'Le tue attività in formato Kanban', '/progetti/lista-attivita/kanban', 10, 'Trello', 1),
    (101, 20, NULL, 'my-tasks-list', 'Vista Lista', 'Le tue attività in formato lista', '/progetti/lista-attivita/lista', 20, 'List', 1),
    (102, 20, NULL, 'my-tasks-calendar', 'Vista Calendario', 'Le tue attività nel calendario', '/progetti/lista-attivita/calendario', 30, 'Calendar', 1);

-- ================================================================
-- TEMPLATES PROGETTI (pageId: 21)
-- ================================================================

INSERT INTO AR_Pages_Components (componentId, pageId, parentComponentId, componentKey, componentName, componentDescription, wikiSlug, sequence, iconName, isActive)
VALUES
    (110, 21, NULL, 'templates-list', 'Lista Templates', 'Elenco template progetti disponibili', '/progetti/templates-progetti/lista', 10, 'Layout', 1),
    (111, 21, NULL, 'templates-create', 'Crea Template', 'Creazione nuovo template', '/progetti/templates-progetti/crea', 20, 'Plus', 1),
    (112, 21, NULL, 'templates-edit', 'Modifica Template', 'Modifica template esistente', '/progetti/templates-progetti/modifica', 30, 'Edit', 1);

-- ================================================================
-- CATEGORIE PROGETTI (pageId: 19)
-- ================================================================

INSERT INTO AR_Pages_Components (componentId, pageId, parentComponentId, componentKey, componentName, componentDescription, wikiSlug, sequence, iconName, isActive)
VALUES
    (120, 19, NULL, 'categories-list', 'Lista Categorie', 'Gestione categorie progetti', '/progetti/categorie-progetti/lista', 10, 'Tags', 1),
    (121, 19, NULL, 'categories-manage', 'Gestione Categorie', 'Creazione e modifica categorie', '/progetti/categorie-progetti/gestione', 20, 'Settings', 1);

-- ================================================================
-- CLIENTI PROGETTI (pageId: 22)
-- ================================================================

INSERT INTO AR_Pages_Components (componentId, pageId, parentComponentId, componentKey, componentName, componentDescription, wikiSlug, sequence, iconName, isActive)
VALUES
    (130, 22, NULL, 'customers-list', 'Lista Clienti', 'Elenco clienti progetti', '/progetti/clienti-progetti/lista', 10, 'Building', 1),
    (131, 22, NULL, 'customers-details', 'Dettaglio Cliente', 'Informazioni dettagliate cliente', '/progetti/clienti-progetti/dettaglio', 20, 'FileText', 1);

-- ================================================================
-- COSTIFICAZIONE DISTINTE (pageId: 23)
-- ================================================================

INSERT INTO AR_Pages_Components (componentId, pageId, parentComponentId, componentKey, componentName, componentDescription, wikiSlug, sequence, iconName, isActive)
VALUES
    (140, 23, NULL, 'costing-overview', 'Panoramica Costificazione', 'Overview del modulo costificazione', '/progetti/costificazione-distinte/panoramica', 10, 'Calculator', 1),
    (141, 23, NULL, 'costing-bom', 'Costificazione BOM', 'Calcolo costi distinta base', '/progetti/costificazione-distinte/bom', 20, 'DollarSign', 1),
    (142, 23, NULL, 'costing-parameters', 'Parametri Costing', 'Configurazione parametri di calcolo', '/progetti/costificazione-distinte/parametri', 30, 'Settings', 1);

-- ================================================================
-- INTERCOMPANY (pageId: 1023)
-- ================================================================

INSERT INTO AR_Pages_Components (componentId, pageId, parentComponentId, componentKey, componentName, componentDescription, wikiSlug, sequence, iconName, isActive)
VALUES
    (150, 1023, NULL, 'intercompany-dashboard', 'Dashboard Intercompany', 'Panoramica richieste intercompany', '/progetti/intercompany/dashboard', 10, 'LayoutDashboard', 1),
    (151, 1023, NULL, 'intercompany-requests', 'Richieste Intercompany', 'Gestione richieste tra company', '/progetti/intercompany/richieste', 20, 'SendHorizontal', 1),
    (152, 1023, NULL, 'intercompany-summary', 'Riepilogo Intercompany', 'Riepilogo componenti intercompany', '/progetti/intercompany/riepilogo', 30, 'ListTree', 1),
    (153, 1023, NULL, 'intercompany-details', 'Dettagli Richiesta', 'Dettagli completi richiesta intercompany', '/progetti/intercompany/dettagli', 40, 'FileText', 1);

SET IDENTITY_INSERT AR_Pages_Components OFF;

-- ================================================================
-- Verifica inserimenti
-- ================================================================

SELECT
    c.componentId,
    p.pageName,
    c.componentKey,
    c.componentName,
    c.wikiSlug,
    CASE WHEN c.parentComponentId IS NULL THEN 'Root' ELSE CAST(c.parentComponentId AS VARCHAR) END as Parent,
    c.sequence,
    c.iconName
FROM AR_Pages_Components c
JOIN AR_Pages p ON c.pageId = p.pageId
ORDER BY c.pageId, c.sequence;

-- ================================================================
-- Query di test per visualizzare l'albero gerarchico
-- ================================================================

;WITH ComponentTree AS (
    -- Livello 0: componenti root
    SELECT
        c.componentId,
        c.pageId,
        p.pageName,
        c.componentKey,
        c.componentName,
        c.wikiSlug,
        c.parentComponentId,
        0 as Level,
        CAST(c.componentName AS NVARCHAR(MAX)) as Path,
        c.sequence
    FROM AR_Pages_Components c
    JOIN AR_Pages p ON c.pageId = p.pageId
    WHERE c.parentComponentId IS NULL

    UNION ALL

    -- Livelli successivi: componenti figli
    SELECT
        c.componentId,
        c.pageId,
        p.pageName,
        c.componentKey,
        c.componentName,
        c.wikiSlug,
        c.parentComponentId,
        ct.Level + 1,
        ct.Path + ' > ' + c.componentName,
        c.sequence
    FROM AR_Pages_Components c
    JOIN AR_Pages p ON c.pageId = p.pageId
    JOIN ComponentTree ct ON c.parentComponentId = ct.componentId
)
SELECT
    pageName,
    REPLICATE('  ', Level) + '├─ ' + componentName as ComponentHierarchy,
    componentKey,
    wikiSlug,
    Level
FROM ComponentTree
ORDER BY pageId, sequence;
