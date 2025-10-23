-- =====================================================
-- WikiJS - Mappatura Componenti AR_Pages
-- WebAppTEST Documentation - Dettagli componenti React
-- =====================================================

USE [WikiJS]
GO

-- Creazione pagine aggiuntive per componenti specifici
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
-- Articoli Componenti
('/anagrafiche/articoli/componenti', 
 'articoli-componenti-001', 
 'Componenti Articoli', 
 'Documentazione componenti React per gestione articoli', 
 0, 
 1, 
 NULL, 
 NULL, 
 NULL, 
 '# Componenti Articoli - React Components

Documentazione completa dei componenti React per la gestione articoli.

## 🏗️ Componenti Principali

### ArticleForm
```javascript
const ArticleForm = ({ article, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState(article || {});
  
  return (
    <form onSubmit={handleSubmit}>
      <ArticleCodeInput />
      <ArticleDetails />
      <ArticleReferences />
      <FormActions />
    </form>
  );
};
```

### ArticleDetails
```javascript
const ArticleDetails = ({ articleId }) => {
  const [article, setArticle] = useState(null);
  
  return (
    <div className="article-details">
      <ArticleHeader />
      <ArticleInfo />
      <ArticleAttachments />
      <ArticleHistory />
    </div>
  );
};
```

### ArticlesList
```javascript
const ArticlesList = () => {
  const [articles, setArticles] = useState([]);
  const [filters, setFilters] = useState({});
  
  return (
    <div className="articles-list">
      <ArticlesFilters />
      <ArticlesTable />
      <ArticlesPagination />
    </div>
  );
};
```

## 🔧 Props e State

### ArticleForm Props
- `article`: Oggetto articolo esistente
- `onSubmit`: Callback salvataggio
- `onCancel`: Callback annullamento
- `mode`: 'create' | 'edit'

### ArticleDetails Props
- `articleId`: ID articolo
- `showActions`: Mostra azioni
- `editable`: Modificabile

## 📱 Responsive Design

- **Mobile**: Form stack verticale
- **Tablet**: Layout a due colonne
- **Desktop**: Layout completo

---
**Component**: Articoli.jsx | **Route**: /anagrafiche/articoli', 
 NULL, 
 '[]', 
 'markdown', 
 '2025-01-23T10:00:00.000Z', 
 '2025-01-23T10:00:00.000Z', 
 'markdown', 
 'it', 
 1, 
 1, 
 '{"arPageId": 5, "component": "Articoli.jsx", "type": "components"}'),

-- BOM Componenti
('/anagrafiche/distinte-basi/componenti', 
 'bom-componenti-001', 
 'Componenti BOM', 
 'Documentazione componenti React per gestione BOM', 
 0, 
 1, 
 NULL, 
 NULL, 
 NULL, 
 '# Componenti BOM - React Components

Documentazione completa dei componenti React per la gestione BOM e distinte base.

## 🏗️ Componenti Principali

### BillOfMaterials
```javascript
const BillOfMaterials = () => {
  const [bom, setBom] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  
  return (
    <div className="bom-container">
      <BOMHeader />
      <BOMTreeView />
      <BOMDetailPanel />
      <BOMActions />
    </div>
  );
};
```

### BOMViewer
```javascript
const BOMViewer = ({ bomId }) => {
  return (
    <BOMViewerProvider>
      <div className="bom-viewer">
        <BOMHeader />
        <BOMTreeView />
        <BOMDetailPanel />
        <BOMReferencePanel />
      </div>
    </BOMViewerProvider>
  );
};
```

### BOMCosting
```javascript
const BOMCosting = () => {
  const [costs, setCosts] = useState({});
  
  return (
    <div className="bom-costing">
      <CostTreeView />
      <OperationsManagement />
      <WorkCentersManagement />
      <CostAnalysis />
    </div>
  );
};
```

## 🔧 Context e Hooks

### BOMViewerContext
```javascript
const BOMViewerContext = createContext();

const BOMViewerProvider = ({ children }) => {
  const [bom, setBom] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  
  return (
    <BOMViewerContext.Provider value={{
      bom, setBom,
      selectedItem, setSelectedItem
    }}>
      {children}
    </BOMViewerContext.Provider>
  );
};
```

### Custom Hooks
```javascript
// useBOMViewer
const useBOMViewer = () => {
  const context = useContext(BOMViewerContext);
  if (!context) {
    throw new Error('useBOMViewer must be used within BOMViewerProvider');
  }
  return context;
};

// useBOMCosting
const useBOMCosting = (bomId) => {
  const [costs, setCosts] = useState({});
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    loadBOMCosts(bomId);
  }, [bomId]);
  
  return { costs, loading, recalculateCosts };
};
```

## 📊 Drag & Drop

### DndContextProvider
```javascript
const DndContextProvider = ({ children }) => {
  const [draggingOver, setDraggingOver] = useState(false);
  const [dropTarget, setDropTarget] = useState(null);
  
  return (
    <DndContext
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {children}
    </DndContext>
  );
};
```

## 🚀 Performance

### Virtualization
```javascript
const VirtualizedBOMTree = () => {
  return (
    <FixedSizeList
      height={600}
      itemCount={bomItems.length}
      itemSize={50}
    >
      {({ index, style }) => (
        <div style={style}>
          <BOMTreeItem item={bomItems[index]} />
        </div>
      )}
    </FixedSizeList>
  );
};
```

---
**Component**: BillOfMaterials.jsx | **Route**: /anagrafiche/distinte', 
 NULL, 
 '[]', 
 'markdown', 
 '2025-01-23T10:00:00.000Z', 
 '2025-01-23T10:00:00.000Z', 
 'markdown', 
 'it', 
 1, 
 1, 
 '{"arPageId": 12, "component": "BillOfMaterials.jsx", "type": "components"}'),

-- Intercompany Componenti
('/progetti/intercompany/componenti', 
 'intercompany-componenti-001', 
 'Componenti Intercompany', 
 'Documentazione componenti React per gestione intercompany', 
 0, 
 1, 
 NULL, 
 NULL, 
 NULL, 
 '# Componenti Intercompany - React Components

Documentazione completa dei componenti React per la gestione intercompany.

## 🏗️ Componenti Principali

### IntercompanyDashboard
```javascript
const IntercompanyDashboard = () => {
  const [dashboardData, setDashboardData] = useState({});
  
  return (
    <div className="intercompany-dashboard">
      <IntercompanyHeader />
      <IntercompanySummary />
      <IntercompanyRequests />
      <IntercompanyChats />
    </div>
  );
};
```

### IntercompanySidebar
```javascript
const IntercompanySidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  
  return (
    <div className={`intercompany-sidebar ${collapsed ? 'collapsed' : ''}`}>
      <IntercompanySummary />
      <IntercompanyActions />
      <IntercompanySettings />
    </div>
  );
};
```

### IntercompanySyncModal
```javascript
const IntercompanySyncModal = ({ isOpen, onClose }) => {
  const [syncStatus, setSyncStatus] = useState('idle');
  
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <SyncProgress />
      <SyncOptions />
      <SyncActions />
    </Modal>
  );
};
```

## 🔄 Sync Components

### IntercompanySync
```javascript
const IntercompanySync = () => {
  const [syncData, setSyncData] = useState({});
  const [conflicts, setConflicts] = useState([]);
  
  return (
    <div className="intercompany-sync">
      <SyncStatus />
      <ConflictResolution />
      <SyncHistory />
    </div>
  );
};
```

### IntercompanyChatModal
```javascript
const IntercompanyChatModal = ({ isOpen, onClose, companyId }) => {
  const [messages, setMessages] = useState([]);
  
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ChatHeader companyId={companyId} />
      <ChatMessages messages={messages} />
      <ChatInput onSend={handleSend} />
    </Modal>
  );
};
```

## 📊 Data Management

### IntercompanyContext
```javascript
const IntercompanyContext = createContext();

const IntercompanyProvider = ({ children }) => {
  const [companies, setCompanies] = useState([]);
  const [sharingData, setSharingData] = useState({});
  const [syncStatus, setSyncStatus] = useState({});
  
  return (
    <IntercompanyContext.Provider value={{
      companies, setCompanies,
      sharingData, setSharingData,
      syncStatus, setSyncStatus
    }}>
      {children}
    </IntercompanyContext.Provider>
  );
};
```

### Custom Hooks
```javascript
// useIntercompanySync
const useIntercompanySync = () => {
  const [syncStatus, setSyncStatus] = useState('idle');
  const [progress, setProgress] = useState(0);
  
  const startSync = async (companyId) => {
    setSyncStatus('syncing');
    // Sync logic
  };
  
  return { syncStatus, progress, startSync };
};

// useIntercompanyChat
const useIntercompanyChat = (companyId) => {
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  
  useEffect(() => {
    connectToChat(companyId);
  }, [companyId]);
  
  return { messages, isConnected, sendMessage };
};
```

## 🔔 Real-time Features

### WebSocket Integration
```javascript
const IntercompanyWebSocket = () => {
  const [socket, setSocket] = useState(null);
  
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:3443/intercompany');
    ws.onmessage = handleMessage;
    setSocket(ws);
    
    return () => ws.close();
  }, []);
  
  return socket;
};
```

### Event Handlers
```javascript
const handleIntercompanyEvent = (event) => {
  switch (event.type) {
    case 'SYNC_STARTED':
      setSyncStatus('syncing');
      break;
    case 'SYNC_COMPLETED':
      setSyncStatus('completed');
      break;
    case 'CHAT_MESSAGE':
      addMessage(event.message);
      break;
  }
};
```

---
**Component**: IntercompanyDashboard | **Route**: /progetti/intercompany', 
 NULL, 
 '[]', 
 'markdown', 
 '2025-01-23T10:00:00.000Z', 
 '2025-01-23T10:00:00.000Z', 
 'markdown', 
 'it', 
 1, 
 1, 
 '{"arPageId": 1023, "component": "IntercompanyDashboard", "type": "components"}'),

-- Time Tracking Componenti
('/progetti/mie-attivita/componenti', 
 'time-tracking-componenti-001', 
 'Componenti Time Tracking', 
 'Documentazione componenti React per time tracking', 
 0, 
 1, 
 NULL, 
 NULL, 
 NULL, 
 '# Componenti Time Tracking - React Components

Documentazione completa dei componenti React per il time tracking e gestione attività.

## 🏗️ Componenti Principali

### MyTasksPage
```javascript
const MyTasksPage = () => {
  const [viewMode, setViewMode] = useState('list');
  const [filters, setFilters] = useState({});
  
  return (
    <div className="my-tasks-page">
      <TasksViewToggler viewMode={viewMode} onChange={setViewMode} />
      <MyTasksFilters filters={filters} onChange={setFilters} />
      {renderView()}
      <TasksStatistics />
    </div>
  );
};
```

### EnhancedTimesheet
```javascript
const EnhancedTimesheet = () => {
  const [timeEntries, setTimeEntries] = useState([]);
  const [currentTimer, setCurrentTimer] = useState(null);
  
  return (
    <div className="enhanced-timesheet">
      <TimerControls />
      <TimeEntryForm />
      <TimeEntriesList />
      <TimeReportsView />
    </div>
  );
};
```

### MyTasksKanban
```javascript
const MyTasksKanban = () => {
  const [tasks, setTasks] = useState([]);
  
  return (
    <div className="tasks-kanban">
      <KanbanColumn title="Da Fare" status="todo" />
      <KanbanColumn title="In Corso" status="in-progress" />
      <KanbanColumn title="Completato" status="done" />
    </div>
  );
};
```

## ⏰ Timer Components

### TimerControls
```javascript
const TimerControls = ({ taskId, onStart, onStop }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  
  return (
    <div className="timer-controls">
      <TimerDisplay time={elapsedTime} />
      <StartStopButton 
        isRunning={isRunning}
        onStart={handleStart}
        onStop={handleStop}
      />
    </div>
  );
};
```

### TimeEntryDialog
```javascript
const TimeEntryDialog = ({ isOpen, onClose, taskId }) => {
  const [timeEntry, setTimeEntry] = useState({
    taskId,
    startTime: '',
    endTime: '',
    description: ''
  });
  
  return (
    <Dialog isOpen={isOpen} onClose={onClose}>
      <TimeEntryForm 
        data={timeEntry}
        onChange={setTimeEntry}
        onSubmit={handleSubmit}
      />
    </Dialog>
  );
};
```

## 📊 Statistics Components

### TasksStatistics
```javascript
const TasksStatistics = () => {
  const [stats, setStats] = useState({});
  
  return (
    <div className="tasks-statistics">
      <StatCard title="Task Completati" value={stats.completed} />
      <StatCard title="Tempo Totale" value={stats.totalTime} />
      <StatCard title="Produttività" value={stats.productivity} />
      <StatCard title="Ore Straordinario" value={stats.overtime} />
    </div>
  );
};
```

### TimeReportsView
```javascript
const TimeReportsView = () => {
  const [reportType, setReportType] = useState('daily');
  const [reportData, setReportData] = useState([]);
  
  return (
    <div className="time-reports">
      <ReportTypeSelector value={reportType} onChange={setReportType} />
      <ReportChart data={reportData} />
      <ReportTable data={reportData} />
    </div>
  );
};
```

## 🔧 Custom Hooks

### useTimeTracking
```javascript
const useTimeTracking = (taskId) => {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [timeEntries, setTimeEntries] = useState([]);
  
  const startTimer = () => {
    setIsRunning(true);
    // Timer logic
  };
  
  const stopTimer = () => {
    setIsRunning(false);
    // Save time entry
  };
  
  return { isRunning, elapsedTime, timeEntries, startTimer, stopTimer };
};
```

### useTaskFilters
```javascript
const useTaskFilters = () => {
  const [filters, setFilters] = useState({
    status: 'all',
    project: 'all',
    dateRange: 'week'
  });
  
  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };
  
  return { filters, updateFilter };
};
```

## 📱 Mobile Components

### MobileTimer
```javascript
const MobileTimer = () => {
  return (
    <div className="mobile-timer">
      <TimerDisplay />
      <TouchControls />
      <QuickActions />
    </div>
  );
};
```

### SwipeableTaskCard
```javascript
const SwipeableTaskCard = ({ task, onSwipeLeft, onSwipeRight }) => {
  return (
    <Swipeable
      onSwipeLeft={onSwipeLeft}
      onSwipeRight={onSwipeRight}
    >
      <TaskCard task={task} />
    </Swipeable>
  );
};
```

---
**Component**: MyTasksPage.jsx | **Route**: /progetti/attivita', 
 NULL, 
 '[]', 
 'markdown', 
 '2025-01-23T10:00:00.000Z', 
 '2025-01-23T10:00:00.000Z', 
 'markdown', 
 'it', 
 1, 
 1, 
 '{"arPageId": 20, "component": "MyTasksPage.jsx", "type": "components"}');

-- Aggiornamento Page Tree per includere le nuove pagine componenti
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
-- Componenti Articoli
(101, '/anagrafiche/articoli/componenti', 2, 'Componenti Articoli', 0, 0, NULL, 5, 101, 'it', '[4,5]'),

-- Componenti BOM
(102, '/anagrafiche/distinte-basi/componenti', 2, 'Componenti BOM', 0, 0, NULL, 12, 102, 'it', '[4,12]'),

-- Componenti Intercompany
(103, '/progetti/intercompany/componenti', 2, 'Componenti Intercompany', 0, 0, NULL, 1023, 103, 'it', '[15,1023]'),

-- Componenti Time Tracking
(104, '/progetti/mie-attivita/componenti', 2, 'Componenti Time Tracking', 0, 0, NULL, 20, 104, 'it', '[15,20]');

-- Aggiornamento Page Links per le nuove pagine
INSERT INTO [dbo].[pageLinks] (
    [path], 
    [localeCode], 
    [pageId]
) VALUES 
('/anagrafiche/articoli/componenti', 'it', 101),
('/anagrafiche/distinte-basi/componenti', 'it', 102),
('/progetti/intercompany/componenti', 'it', 103),
('/progetti/mie-attivita/componenti', 'it', 104);

PRINT 'Mappatura componenti AR_Pages WikiJS completata!'
