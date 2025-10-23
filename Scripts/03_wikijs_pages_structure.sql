-- =====================================================
-- WikiJS - Struttura Pagine WebAppTEST
-- WebAppTEST Documentation
-- =====================================================

USE [WikiJS]
GO

-- Inserimento Tag per Categorizzazione
INSERT INTO [dbo].[tags] (
    [tag], 
    [title], 
    [createdAt], 
    [updatedAt]
) VALUES 
('frontend', 'Frontend React', '2025-01-23T10:00:00.000Z', '2025-01-23T10:00:00.000Z'),
('backend', 'Backend Node.js', '2025-01-23T10:00:00.000Z', '2025-01-23T10:00:00.000Z'),
('database', 'Database SQL Server', '2025-01-23T10:00:00.000Z', '2025-01-23T10:00:00.000Z'),
('progetti', 'Gestione Progetti', '2025-01-23T10:00:00.000Z', '2025-01-23T10:00:00.000Z'),
('articoli', 'Articoli e BOM', '2025-01-23T10:00:00.000Z', '2025-01-23T10:00:00.000Z'),
('intercompany', 'Intercompany', '2025-01-23T10:00:00.000Z', '2025-01-23T10:00:00.000Z'),
('attivita', 'Attività e Task', '2025-01-23T10:00:00.000Z', '2025-01-23T10:00:00.000Z'),
('admin', 'Amministrazione', '2025-01-23T10:00:00.000Z', '2025-01-23T10:00:00.000Z'),
('api', 'API e Servizi', '2025-01-23T10:00:00.000Z', '2025-01-23T10:00:00.000Z'),
('docker', 'Docker e Deploy', '2025-01-23T10:00:00.000Z', '2025-01-23T10:00:00.000Z');

-- Inserimento Pagine Principali (struttura)
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
-- Home Page
('/', 
 'home-001', 
 'WebAppTEST - Documentazione', 
 'Documentazione completa del sistema WebAppTEST', 
 0, 
 1, 
 NULL, 
 NULL, 
 NULL, 
 '# WebAppTEST - Sistema di Gestione Progetti

Benvenuti nella documentazione completa del sistema WebAppTEST.

## Panoramica

WebAppTEST è un sistema full-stack per la gestione di progetti, articoli, BOM e attività intercompany.

## Architettura

- **Frontend**: React + Vite + TailwindCSS
- **Backend**: Node.js + Express
- **Database**: SQL Server
- **Deploy**: Docker con SSL/HTTPS

## Sezioni Principali

- [Gestione Progetti](/progetti)
- [Articoli e BOM](/articoli)
- [Intercompany](/intercompany)
- [Attività](/attivita)
- [Amministrazione](/admin)
- [API](/api)
- [Deploy](/deploy)', 
 NULL, 
 '[]', 
 'markdown', 
 '2025-01-23T10:00:00.000Z', 
 '2025-01-23T10:00:00.000Z', 
 'markdown', 
 'it', 
 1, 
 1, 
 '{}'),

-- Pagina Progetti
('/progetti', 
 'progetti-001', 
 'Gestione Progetti', 
 'Documentazione per la gestione dei progetti', 
 0, 
 1, 
 NULL, 
 NULL, 
 NULL, 
 '# Gestione Progetti

Sistema completo per la gestione di progetti, task e team.

## Funzionalità Principali

- Creazione e modifica progetti
- Gestione task e milestone
- Team management
- Timeline e Gantt
- Analytics e report

## Componenti

- ProjectManagementSplitView
- ProjectListSection
- ProjectDetailContainer
- ProjectGanttView
- ProjectStagesView', 
 NULL, 
 '[]', 
 'markdown', 
 '2025-01-23T10:00:00.000Z', 
 '2025-01-23T10:00:00.000Z', 
 'markdown', 
 'it', 
 1, 
 1, 
 '{}'),

-- Pagina Articoli
('/articoli', 
 'articoli-001', 
 'Articoli e BOM', 
 'Gestione articoli e distinte base', 
 0, 
 1, 
 NULL, 
 NULL, 
 NULL, 
 '# Articoli e BOM

Sistema avanzato per la gestione di articoli e distinte base.

## Funzionalità

- Gestione articoli
- BOM Viewer con drag & drop
- Costing e pricing
- Versioning BOM
- Import/Export

## Componenti Principali

- BOMViewer
- ArticleForm
- BOMCosting
- BOMImportWizard', 
 NULL, 
 '[]', 
 'markdown', 
 '2025-01-23T10:00:00.000Z', 
 '2025-01-23T10:00:00.000Z', 
 'markdown', 
 'it', 
 1, 
 1, 
 '{}'),

-- Pagina Intercompany
('/intercompany', 
 'intercompany-001', 
 'Intercompany', 
 'Gestione operazioni intercompany', 
 0, 
 1, 
 NULL, 
 NULL, 
 NULL, 
 '# Intercompany

Sistema per la gestione delle operazioni intercompany.

## Funzionalità

- Dashboard intercompany
- Sync automatico
- Chat e comunicazioni
- Request management
- Summary e reporting', 
 NULL, 
 '[]', 
 'markdown', 
 '2025-01-23T10:00:00.000Z', 
 '2025-01-23T10:00:00.000Z', 
 'markdown', 
 'it', 
 1, 
 1, 
 '{}'),

-- Pagina Attività
('/attivita', 
 'attivita-001', 
 'Attività e Task', 
 'Gestione attività e time tracking', 
 0, 
 1, 
 NULL, 
 NULL, 
 NULL, 
 '# Attività e Task

Sistema completo per la gestione delle attività e time tracking.

## Funzionalità

- MyTasksPage
- Time tracking
- Kanban e Timeline
- Statistics e reports
- Enhanced Timesheet', 
 NULL, 
 '[]', 
 'markdown', 
 '2025-01-23T10:00:00.000Z', 
 '2025-01-23T10:00:00.000Z', 
 'markdown', 
 'it', 
 1, 
 1, 
 '{}'),

-- Pagina Admin
('/admin', 
 'admin-001', 
 'Amministrazione', 
 'Pannello di amministrazione sistema', 
 0, 
 1, 
 NULL, 
 NULL, 
 NULL, 
 '# Amministrazione

Pannello di amministrazione per la gestione del sistema.

## Funzionalità

- User management
- Group management
- System settings
- Notifications
- Analytics', 
 NULL, 
 '[]', 
 'markdown', 
 '2025-01-23T10:00:00.000Z', 
 '2025-01-23T10:00:00.000Z', 
 'markdown', 
 'it', 
 1, 
 1, 
 '{}'),

-- Pagina API
('/api', 
 'api-001', 
 'API e Servizi', 
 'Documentazione API e servizi backend', 
 0, 
 1, 
 NULL, 
 NULL, 
 NULL, 
 '# API e Servizi

Documentazione completa delle API e servizi backend.

## Endpoints Principali

- /api/projects
- /api/articles
- /api/bom
- /api/tasks
- /api/intercompany

## Autenticazione

- JWT Token
- Middleware di sicurezza
- Rate limiting', 
 NULL, 
 '[]', 
 'markdown', 
 '2025-01-23T10:00:00.000Z', 
 '2025-01-23T10:00:00.000Z', 
 'markdown', 
 'it', 
 1, 
 1, 
 '{}'),

-- Pagina Deploy
('/deploy', 
 'deploy-001', 
 'Deploy e Docker', 
 'Guida al deploy e configurazione Docker', 
 0, 
 1, 
 NULL, 
 NULL, 
 NULL, 
 '# Deploy e Docker

Guida completa al deploy e configurazione Docker.

## Configurazione

- Docker Compose
- SSL/HTTPS
- Nginx configuration
- Environment variables

## Scripts

- start-dev.bat
- Production setup
- SSL certificates', 
 NULL, 
 '[]', 
 'markdown', 
 '2025-01-23T10:00:00.000Z', 
 '2025-01-23T10:00:00.000Z', 
 'markdown', 
 'it', 
 1, 
 1, 
 '{}');

PRINT 'Struttura pagine WikiJS creata con successo!'
