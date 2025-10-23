-- =====================================================
-- WikiJS - Contenuto Dettagliato Pagine
-- WebAppTEST Documentation
-- =====================================================

USE [WikiJS]
GO

-- Aggiornamento contenuto pagina Home con dettagli completi
UPDATE [dbo].[pages] 
SET [content] = '# WebAppTEST - Sistema di Gestione Progetti

Benvenuti nella documentazione completa del sistema WebAppTEST.

## 🏗️ Architettura del Sistema

### Frontend
- **Framework**: React 18 + Vite
- **Styling**: TailwindCSS + Radix UI
- **State Management**: Redux Toolkit
- **Routing**: React Router DOM v6
- **Charts**: Recharts
- **Tables**: AG-Grid, Tanstack Table

### Backend
- **Runtime**: Node.js + Express
- **Database**: SQL Server
- **Autenticazione**: JWT
- **File Upload**: Multer
- **Logging**: Winston

### Deploy
- **Containerizzazione**: Docker + Docker Compose
- **Web Server**: Nginx
- **SSL**: Certificati HTTPS
- **Porte**: 5173 (HTTPS Frontend), 3443 (HTTPS Backend)

## 📁 Struttura Progetto

```
WebAppTEST/
├── frontend/          # Applicazione React
├── backend/           # API Node.js
├── database/          # Script SQL Server
├── ssl/              # Certificati SSL
├── Scripts/          # Script WikiJS
└── docker-compose.yml
```

## 🚀 Quick Start

1. **Avvio Sviluppo**:
   ```bash
   start-dev.bat
   ```

2. **Accesso Applicazione**:
   - Frontend: https://localhost:5173
   - Backend: https://localhost:3443
   - Wiki: https://localhost:5173/wiki

## 📚 Sezioni Documentazione

- [**Gestione Progetti**](/progetti) - Sistema completo per progetti e task
- [**Articoli e BOM**](/articoli) - Gestione articoli e distinte base
- [**Intercompany**](/intercompany) - Operazioni intercompany
- [**Attività**](/attivita) - Time tracking e gestione attività
- [**Amministrazione**](/admin) - Pannello admin sistema
- [**API**](/api) - Documentazione endpoint backend
- [**Deploy**](/deploy) - Guida deploy e Docker

## 🔧 Configurazione Database

- **Server**: host.docker.internal\ARCHASERVER
- **Database**: WebAppTEST
- **WikiJS**: WikiJS (separato)

## 📋 Regole di Sviluppo

- **Linguaggio**: Italiano per documentazione
- **Codice**: camelCase (JS), PascalCase (React)
- **Styling**: TailwindCSS prioritario
- **Sicurezza**: HTTPS, JWT, validazione input
- **Performance**: Lazy loading, memoization

## 🆘 Supporto

Per problemi o domande:
1. Consulta la documentazione specifica
2. Verifica i log del sistema
3. Contatta il team di sviluppo

---
*Ultimo aggiornamento: 23 Gennaio 2025*'
WHERE [path] = '/';

-- Aggiornamento pagina Progetti con dettagli tecnici
UPDATE [dbo].[pages] 
SET [content] = '# Gestione Progetti

Sistema completo per la gestione di progetti, task, team e milestone.

## 🎯 Funzionalità Principali

### Project Management
- **Creazione Progetti**: Form completo con template
- **Modifica Progetti**: Edit modal con validazione
- **Lista Progetti**: Tabella con filtri avanzati
- **Dettaglio Progetto**: Vista split con sidebar

### Task Management
- **Creazione Task**: Form con assegnazione team
- **Kanban Board**: Vista drag & drop
- **Timeline View**: Vista Gantt interattiva
- **Task Details**: Pannello dettagli completo

### Team Management
- **Assegnazione Ruoli**: MemberRoleSelect
- **Team Section**: Gestione membri progetto
- **Permissions**: Controllo accessi per ruolo

## 🏗️ Componenti Principali

### Core Components
- `ProjectManagementSplitView` - Vista principale split
- `ProjectListSection` - Lista progetti con filtri
- `ProjectDetailContainer` - Container dettaglio progetto
- `ProjectEditModalWithTemplate` - Modal modifica

### Task Components
- `ProjectTasksKanban` - Vista Kanban task
- `ProjectTasksTable` - Tabella task
- `ProjectGanttView` - Vista Gantt
- `TaskDetailsPanel` - Pannello dettagli task

### Utility Components
- `TasksViewToggler` - Switch vista task
- `TasksLegend` - Legenda colori
- `NewTaskForm` - Form creazione task
- `DraggableTask` - Task draggable

## 📊 Analytics e Reporting

### Project Analytics
- `ProjectAnalyticsTab` - Tab analytics
- `CostAnalysis` - Analisi costi
- `ProgressAnalysis` - Analisi progresso
- `ResourceAnalysis` - Analisi risorse
- `TimeAnalysis` - Analisi tempi

### Export e Import
- Export progetti in Excel
- Import da template
- Backup e restore

## 🔧 Configurazione

### Redux State
```javascript
// Store principale
const store = {
  projects: {
    list: [],
    current: null,
    filters: {},
    loading: false
  },
  tasks: {
    list: [],
    kanban: {},
    timeline: []
  }
}
```

### API Endpoints
- `GET /api/projects` - Lista progetti
- `POST /api/projects` - Crea progetto
- `PUT /api/projects/:id` - Modifica progetto
- `DELETE /api/projects/:id` - Elimina progetto

## 📱 Responsive Design

- **Mobile First**: Design responsive
- **Breakpoints**: TailwindCSS standard
- **Touch Support**: Drag & drop mobile
- **Performance**: Lazy loading componenti

## 🚀 Best Practices

1. **State Management**: Usa Redux per stato globale
2. **Componenti**: Riutilizza componenti esistenti
3. **Performance**: Implementa memoization
4. **Error Handling**: Gestisci errori gracefully
5. **Testing**: Testa componenti critici

---
*Componenti: 50+ | API: 15+ | Features: 20+*'
WHERE [path] = '/progetti';

-- Aggiornamento pagina Articoli con dettagli BOM
UPDATE [dbo].[pages] 
SET [content] = '# Articoli e BOM

Sistema avanzato per la gestione di articoli e distinte base con funzionalità enterprise.

## 🎯 Funzionalità Principali

### Article Management
- **Gestione Articoli**: CRUD completo articoli
- **Codifica Articoli**: Sistema codifica personalizzato
- **Riferimenti**: Gestione riferimenti incrociati
- **Attachments**: File allegati per articolo

### BOM Management
- **BOM Viewer**: Visualizzatore avanzato con drag & drop
- **Versioning**: Gestione versioni BOM
- **Import/Export**: Wizard import BOM
- **Costing**: Calcolo costi e markup

### Intercompany BOM
- **Sync Automatico**: Sincronizzazione intercompany
- **Sharing**: Condivisione BOM tra aziende
- **Summary**: Riepilogo costi intercompany
- **Chat**: Comunicazioni BOM

## 🏗️ Componenti Principali

### Article Components
- `ArticleForm` - Form creazione/modifica articolo
- `ArticleDetails` - Dettagli articolo
- `ArticlePage` - Pagina articolo completa
- `ArticlesList` - Lista articoli con filtri
- `ArticleReferences` - Riferimenti articolo

### BOM Components
- `BOMViewer` - Visualizzatore BOM principale
- `BOMTreeView` - Vista ad albero BOM
- `BOMDetailPanel` - Pannello dettagli BOM
- `BOMReferencePanel` - Pannello riferimenti
- `BOMHeader` - Header BOM con controlli

### Costing Components
- `BOMCosting` - Sistema costing
- `CostTreeView` - Vista albero costi
- `OperationsManagement` - Gestione operazioni
- `WorkCentersManagement` - Gestione centri lavoro

## 🔧 Architettura BOM Viewer

### Context Pattern
```javascript
// BOMViewerContext
const BOMViewerProvider = ({ children }) => {
  const [bom, setBom] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [intercompanyData, setIntercompanyData] = useState({});
  
  return (
    <BOMViewerContext.Provider value={{
      bom, setBom,
      selectedItem, setSelectedItem,
      intercompanyData, setIntercompanyData
    }}>
      {children}
    </BOMViewerContext.Provider>
  );
};
```

### Drag & Drop
- **DndContextProvider**: Gestione drag & drop
- **Drop Zones**: Zone di drop per riorganizzazione
- **Visual Feedback**: Feedback visivo durante drag
- **Validation**: Validazione drop operations

## 📊 BOM Costing System

### Cost Calculation
- **Material Costs**: Costi materiali
- **Labor Costs**: Costi manodopera
- **Overhead**: Costi generali
- **Markup**: Margini e markup

### Operations Management
- **Work Centers**: Centri di lavoro
- **Routing**: Percorsi di lavorazione
- **Time Standards**: Tempi standard
- **Cost Centers**: Centri di costo

## 🔄 Intercompany Features

### Sync System
- **Auto Sync**: Sincronizzazione automatica
- **Manual Sync**: Sincronizzazione manuale
- **Conflict Resolution**: Risoluzione conflitti
- **History Tracking**: Tracciamento modifiche

### Communication
- **Chat Modal**: Chat per comunicazioni
- **Request System**: Sistema richieste
- **Notifications**: Notifiche real-time
- **Status Tracking**: Tracciamento stato

## 📱 User Experience

### Responsive Design
- **Mobile Support**: Supporto mobile completo
- **Touch Gestures**: Gesture touch per BOM
- **Adaptive Layout**: Layout adattivo
- **Performance**: Ottimizzazioni performance

### Accessibility
- **Keyboard Navigation**: Navigazione da tastiera
- **Screen Reader**: Supporto screen reader
- **High Contrast**: Modalità alto contrasto
- **Focus Management**: Gestione focus

## 🚀 Performance

### Optimization
- **Virtual Scrolling**: Scroll virtuale per BOM grandi
- **Lazy Loading**: Caricamento lazy componenti
- **Memoization**: Memoizzazione calcoli costosi
- **Debouncing**: Debounce per ricerche

### Caching
- **BOM Cache**: Cache BOM in memoria
- **API Cache**: Cache chiamate API
- **Asset Cache**: Cache assets statici
- **Service Worker**: Cache offline

---
*Componenti: 30+ | API: 25+ | Features: 15+*'
WHERE [path] = '/articoli';

PRINT 'Contenuto dettagliato pagine WikiJS aggiornato!'
