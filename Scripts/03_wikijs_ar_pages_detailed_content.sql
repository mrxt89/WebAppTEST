-- =====================================================
-- WikiJS - Contenuto Dettagliato AR_Pages
-- WebAppTEST Documentation - Dettagli tecnici per ogni pagina
-- =====================================================

USE [WikiJS]
GO

-- Aggiornamento contenuto dettagliato per Dashboard
UPDATE [dbo].[pages] 
SET [content] = '# Dashboard - Pannello di Controllo

Pannello di controllo principale del sistema WebAppTEST.

## 🎯 Panoramica

La dashboard è il punto di accesso principale al sistema, fornisce una vista d''insieme delle funzionalità e dello stato del sistema.

## 📊 Funzionalità Principali

### Vista d''Insieme
- **KPI Dashboard**: Indicatori chiave di performance
- **Statistiche Sistema**: Utilizzo risorse e performance
- **Notifiche**: Alert e notifiche importanti
- **Accesso Rapido**: Link alle funzionalità principali

### Navigazione
- **Menu Principale**: Accesso a tutte le sezioni
- **Breadcrumb**: Navigazione contestuale
- **Shortcuts**: Scorciatoie da tastiera

## 🏗️ Architettura

### Componenti React
```javascript
// Dashboard principale
const Dashboard = () => {
  return (
    <div className="dashboard-container">
      <DashboardHeader />
      <KPICards />
      <QuickActions />
      <RecentActivity />
    </div>
  );
};
```

### Redux State
```javascript
const dashboardState = {
  kpis: {
    totalProjects: 0,
    activeTasks: 0,
    completedTasks: 0,
    systemHealth: 'good'
  },
  notifications: [],
  recentActivity: []
};
```

## 🔧 Configurazione

### Route
- **Path**: `/` (root)
- **Component**: Dashboard principale
- **Level**: 1 (root level)
- **Permissions**: Tutti gli utenti autenticati

### Permessi
- **Read**: Tutti gli utenti
- **Write**: Amministratori
- **Delete**: Solo super admin

## 📱 Responsive Design

- **Mobile**: Layout adattivo per dispositivi mobili
- **Tablet**: Ottimizzato per schermi medi
- **Desktop**: Layout completo con sidebar

## 🚀 Performance

- **Lazy Loading**: Caricamento componenti on-demand
- **Caching**: Cache dati dashboard
- **Real-time**: Aggiornamenti in tempo reale

---
**AR_Pages Info**: pageId=1, pageLevel=1, pageParent=NULL, disabled=0'
WHERE [path] = '/';

-- Aggiornamento contenuto dettagliato per Permessi
UPDATE [dbo].[pages] 
SET [content] = '# Permessi - Gestione Utenti e Gruppi

Sistema completo di gestione permessi, utenti e gruppi del sistema WebAppTEST.

## 🎯 Panoramica

Il sistema di permessi gestisce l''accesso alle funzionalità del sistema, la sicurezza e l''amministrazione degli utenti.

## 👥 Gestione Utenti

### Funzionalità Utenti
- **Creazione Utenti**: Nuovi utenti del sistema
- **Modifica Profili**: Aggiornamento dati utente
- **Gestione Password**: Reset e modifica password
- **Stato Utenti**: Attivazione/disattivazione account

### Tipi di Utenti
- **Super Admin**: Accesso completo al sistema
- **Admin**: Gestione progetti e utenti
- **Manager**: Gestione progetti assegnati
- **User**: Accesso limitato alle funzionalità

## 🔐 Gestione Gruppi

### Gruppi Predefiniti
- **Administrators**: Accesso completo
- **Project Managers**: Gestione progetti
- **Team Members**: Accesso progetti assegnati
- **Viewers**: Solo lettura

### Permessi per Gruppo
```javascript
const groupPermissions = {
  administrators: [
    'manage:users',
    'manage:projects',
    'manage:system',
    'view:all'
  ],
  projectManagers: [
    'manage:projects',
    'manage:tasks',
    'view:assigned'
  ],
  teamMembers: [
    'view:assigned',
    'edit:own-tasks'
  ]
};
```

## 🛡️ Sistema di Sicurezza

### Autenticazione
- **JWT Tokens**: Autenticazione stateless
- **Session Management**: Gestione sessioni utente
- **Password Policy**: Politiche password sicure
- **2FA**: Autenticazione a due fattori (opzionale)

### Autorizzazione
- **Role-Based Access**: Controllo accessi basato su ruoli
- **Permission Matrix**: Matrice permessi dettagliata
- **Resource-Level**: Controllo a livello di risorsa
- **Time-Based**: Permessi con scadenza

## 🏗️ Componenti

### AdminDashboard
```javascript
const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  
  return (
    <div className="admin-dashboard">
      <UserManagement users={users} />
      <GroupManagement groups={groups} />
      <PermissionMatrix />
      <AuditLog />
    </div>
  );
};
```

### API Endpoints
- `GET /api/admin/users` - Lista utenti
- `POST /api/admin/users` - Crea utente
- `PUT /api/admin/users/:id` - Modifica utente
- `DELETE /api/admin/users/:id` - Elimina utente
- `GET /api/admin/groups` - Lista gruppi
- `POST /api/admin/groups` - Crea gruppo

## 📊 Audit e Logging

### Audit Trail
- **Login/Logout**: Tracciamento accessi
- **Modifiche Dati**: Log modifiche utenti
- **Permessi**: Cambiamenti permessi
- **Sicurezza**: Tentativi accesso non autorizzati

### Reportistica
- **Utenti Attivi**: Statistiche utilizzo
- **Permessi**: Report permessi per utente
- **Sicurezza**: Report eventi sicurezza

## 🔧 Configurazione

### Route
- **Path**: `/admin/dashboard`
- **Component**: `AdminDashboard`
- **Parent**: Dashboard
- **Level**: 2
- **Permissions**: Solo amministratori

### Database
- **Tabella Utenti**: `users`
- **Tabella Gruppi**: `groups`
- **Tabella Permessi**: `permissions`
- **Tabella Audit**: `audit_log`

---
**AR_Pages Info**: pageId=2, pageParent=1, pageLevel=2, route="/admin/dashboard", component="AdminDashboard", disabled=0'
WHERE [path] = '/permessi';

-- Aggiornamento contenuto dettagliato per Progetti
UPDATE [dbo].[pages] 
SET [content] = '# Progetti - Gestione Completa

Sistema completo di gestione progetti, attività, team e risorse del WebAppTEST.

## 🎯 Panoramica

Il modulo Progetti è il cuore del sistema WebAppTEST, fornisce tutte le funzionalità necessarie per la gestione completa del ciclo di vita dei progetti.

## 📋 Funzionalità Principali

### Gestione Progetti
- **Creazione Progetti**: Form completo con template
- **Modifica Progetti**: Edit modal con validazione
- **Lista Progetti**: Tabella con filtri avanzati
- **Dettaglio Progetto**: Vista split con sidebar
- **Archiviazione**: Gestione progetti completati

### Task Management
- **Creazione Task**: Form con assegnazione team
- **Kanban Board**: Vista drag & drop interattiva
- **Timeline View**: Vista Gantt con dipendenze
- **Task Details**: Pannello dettagli completo
- **Time Tracking**: Tracciamento tempo per task

### Team Management
- **Assegnazione Ruoli**: MemberRoleSelect per ruoli
- **Team Section**: Gestione membri progetto
- **Permissions**: Controllo accessi per ruolo
- **Notifications**: Notifiche team real-time

## 🏗️ Architettura Componenti

### Core Components
```javascript
// Vista principale split
const ProjectManagementSplitView = () => {
  return (
    <div className="project-split-view">
      <ProjectListSection />
      <ProjectDetailContainer />
    </div>
  );
};

// Lista progetti con filtri
const ProjectListSection = () => {
  return (
    <div className="project-list">
      <ProjectFilters />
      <ProjectTable />
      <ProjectActions />
    </div>
  );
};
```

### Task Components
```javascript
// Vista Kanban task
const ProjectTasksKanban = () => {
  return (
    <div className="kanban-board">
      <KanbanColumn status="todo" />
      <KanbanColumn status="in-progress" />
      <KanbanColumn status="done" />
    </div>
  );
};

// Vista Gantt
const ProjectGanttView = () => {
  return (
    <div className="gantt-view">
      <GanttChart />
      <TimelineControls />
    </div>
  );
};
```

## 📊 Analytics e Reporting

### Project Analytics
- **Cost Analysis**: Analisi costi progetto
- **Progress Analysis**: Analisi progresso
- **Resource Analysis**: Analisi utilizzo risorse
- **Time Analysis**: Analisi tempi e scadenze

### Export e Import
- **Export Excel**: Esportazione progetti in Excel
- **Import Template**: Import da template
- **Backup/Restore**: Backup e ripristino progetti
- **API Integration**: Integrazione con sistemi esterni

## 🔧 Configurazione

### Redux State
```javascript
const projectState = {
  projects: {
    list: [],
    current: null,
    filters: {
      status: 'all',
      category: 'all',
      assignedTo: 'all'
    },
    loading: false,
    error: null
  },
  tasks: {
    list: [],
    kanban: {
      todo: [],
      inProgress: [],
      done: []
    },
    timeline: []
  },
  team: {
    members: [],
    roles: []
  }
};
```

### API Endpoints
- `GET /api/projects` - Lista progetti
- `POST /api/projects` - Crea progetto
- `PUT /api/projects/:id` - Modifica progetto
- `DELETE /api/projects/:id` - Elimina progetto
- `GET /api/projects/:id/tasks` - Task progetto
- `POST /api/projects/:id/tasks` - Crea task
- `GET /api/projects/:id/team` - Team progetto

## 📱 Responsive Design

### Mobile Support
- **Touch Gestures**: Drag & drop mobile
- **Adaptive Layout**: Layout adattivo
- **Performance**: Ottimizzazioni mobile
- **Offline Support**: Funzionalità offline

### Accessibility
- **Keyboard Navigation**: Navigazione da tastiera
- **Screen Reader**: Supporto screen reader
- **High Contrast**: Modalità alto contrasto
- **Focus Management**: Gestione focus

## 🚀 Performance

### Optimization
- **Virtual Scrolling**: Scroll virtuale per liste grandi
- **Lazy Loading**: Caricamento lazy componenti
- **Memoization**: Memoizzazione calcoli costosi
- **Debouncing**: Debounce per ricerche

### Caching
- **Project Cache**: Cache progetti in memoria
- **API Cache**: Cache chiamate API
- **Asset Cache**: Cache assets statici
- **Service Worker**: Cache offline

## 🔄 Integrazioni

### Sistemi Esterni
- **ERP Integration**: Integrazione con sistemi ERP
- **Calendar Sync**: Sincronizzazione calendari
- **Email Notifications**: Notifiche email
- **File Storage**: Gestione file e allegati

### API Webhooks
- **Project Created**: Webhook creazione progetto
- **Task Updated**: Webhook aggiornamento task
- **Status Changed**: Webhook cambio stato
- **Deadline Alert**: Webhook scadenze

---
**AR_Pages Info**: pageId=15, pageParent=NULL, pageLevel=1, route="", component="", disabled=0'
WHERE [path] = '/progetti';

-- Aggiornamento contenuto dettagliato per Le Mie Attività
UPDATE [dbo].[pages] 
SET [content] = '# Le Mie Attività - Time Tracking e Gestione

Sistema completo di gestione attività personali e time tracking per gli utenti del WebAppTEST.

## 🎯 Panoramica

Il modulo "Le Mie Attività" permette agli utenti di gestire le proprie attività assegnate, tracciare il tempo e monitorare il progresso dei task.

## ⏰ Time Tracking

### Funzionalità Time Tracking
- **Start/Stop Timer**: Timer per attività
- **Time Entry**: Inserimento manuale tempo
- **Time Reports**: Reportistica tempo
- **Billable Hours**: Gestione ore fatturabili

### Enhanced Timesheet
```javascript
const EnhancedTimesheet = () => {
  const [timeEntries, setTimeEntries] = useState([]);
  const [currentTimer, setCurrentTimer] = useState(null);
  
  return (
    <div className="timesheet">
      <TimerControls />
      <TimeEntryForm />
      <TimeEntriesList />
      <TimeReports />
    </div>
  );
};
```

## 📋 Gestione Attività

### Vista Attività
- **Lista Attività**: Vista tabellare con filtri
- **Kanban View**: Vista drag & drop
- **Timeline View**: Vista temporale
- **Calendar View**: Vista calendario

### MyTasksPage
```javascript
const MyTasksPage = () => {
  const [viewMode, setViewMode] = useState('list');
  const [filters, setFilters] = useState({});
  
  return (
    <div className="my-tasks">
      <TasksViewToggler viewMode={viewMode} onChange={setViewMode} />
      <MyTasksFilters filters={filters} onChange={setFilters} />
      {viewMode === 'list' && <MyTasksList />}
      {viewMode === 'kanban' && <MyTasksKanban />}
      {viewMode === 'timeline' && <MyTasksTimelineView />}
    </div>
  );
};
```

## 📊 Statistiche e Report

### TasksStatistics
- **Productivity Metrics**: Metriche produttività
- **Time Analysis**: Analisi tempo per progetto
- **Completion Rate**: Tasso completamento
- **Overtime Tracking**: Tracciamento straordinari

### TimeReportsView
- **Daily Reports**: Report giornalieri
- **Weekly Reports**: Report settimanali
- **Monthly Reports**: Report mensili
- **Project Reports**: Report per progetto

## 🏗️ Componenti Principali

### Task Components
```javascript
// Filtri attività
const MyTasksFilters = () => {
  return (
    <div className="task-filters">
      <StatusFilter />
      <ProjectFilter />
      <DateRangeFilter />
      <PriorityFilter />
    </div>
  );
};

// Lista attività
const MyTasksList = () => {
  return (
    <div className="tasks-list">
      <TaskRow />
      <TaskRow />
      <TaskRow />
    </div>
  );
};

// Vista Kanban
const MyTasksKanban = () => {
  return (
    <div className="kanban-board">
      <KanbanColumn title="Da Fare" status="todo" />
      <KanbanColumn title="In Corso" status="in-progress" />
      <KanbanColumn title="Completato" status="done" />
    </div>
  );
};
```

### Time Tracking Components
```javascript
// Time Entry Dialog
const TimeEntryDialog = () => {
  return (
    <Dialog>
      <TimeEntryForm />
      <TimerControls />
      <ProjectSelector />
      <TaskSelector />
    </Dialog>
  );
};

// Timesheet Task Panel
const TimesheetTaskPanel = () => {
  return (
    <div className="timesheet-panel">
      <TaskInfo />
      <TimeEntries />
      <AddTimeEntry />
    </div>
  );
};
```

## 🔧 Configurazione

### Redux State
```javascript
const myTasksState = {
  tasks: {
    list: [],
    filters: {
      status: 'all',
      project: 'all',
      dateRange: 'week'
    },
    viewMode: 'list',
    loading: false
  },
  timeTracking: {
    currentTimer: null,
    timeEntries: [],
    reports: {
      daily: [],
      weekly: [],
      monthly: []
    }
  }
};
```

### API Endpoints
- `GET /api/my-tasks` - Le mie attività
- `POST /api/time-entries` - Crea time entry
- `PUT /api/time-entries/:id` - Modifica time entry
- `GET /api/time-reports` - Report tempo
- `POST /api/timer/start` - Avvia timer
- `POST /api/timer/stop` - Ferma timer

## 📱 Mobile Experience

### Touch Support
- **Swipe Gestures**: Swipe per azioni rapide
- **Touch Timer**: Timer touch-friendly
- **Mobile Forms**: Form ottimizzati mobile
- **Offline Sync**: Sincronizzazione offline

### Performance
- **Lazy Loading**: Caricamento lazy componenti
- **Virtual Scrolling**: Scroll virtuale liste
- **Caching**: Cache dati locali
- **Background Sync**: Sync in background

## 🔔 Notifiche

### Real-time Updates
- **Task Assignments**: Notifiche assegnazione task
- **Deadline Alerts**: Alert scadenze
- **Time Reminders**: Promemoria tempo
- **Status Changes**: Notifiche cambio stato

### Notification Types
- **In-app**: Notifiche nell''applicazione
- **Email**: Notifiche email
- **Push**: Notifiche push mobile
- **SMS**: Notifiche SMS (opzionale)

---
**AR_Pages Info**: pageId=20, pageParent=15, pageLevel=2, route="/progetti/attivita", component="MyTasksPage.jsx", sequence=2, disabled=0'
WHERE [path] = '/progetti/mie-attivita';

PRINT 'Contenuto dettagliato AR_Pages WikiJS aggiornato con successo!'
