// CyclesTab.jsx - Versione migliorata con integrazione della modalità edit globale
import React, { useState, useEffect, useRef } from 'react';
import { useBOMViewer } from '../../context/BOMViewerContext';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Plus,
  Trash,
  Info,
  ChevronRight,
  ChevronDown as ExpandIcon,
  GripVertical,
  AlertTriangle
} from 'lucide-react';
import { 
  Select, 
  SelectTrigger, 
  SelectValue, 
  SelectContent, 
  SelectItem 
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";

// Funzione di utilità per convertire secondi in formato HH:mm:ss
const formatTimeHHMMSS = (seconds) => {
  if (seconds === null || seconds === undefined) return "00:00:00";
  
  // Assicurati che seconds sia un numero
  const totalSeconds = parseInt(seconds, 10) || 0;
  
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  
  return [
    hours.toString().padStart(2, '0'),
    minutes.toString().padStart(2, '0'),
    secs.toString().padStart(2, '0')
  ].join(':');
};

// Funzione di utilità per convertire formato HH:mm:ss in secondi
const parseTimeToSeconds = (timeString) => {
  if (!timeString) return 0;
  
  const parts = timeString.split(':').map(part => parseInt(part, 10) || 0);
  
  if (parts.length === 3) {
    // Formato HH:mm:ss
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    // Formato mm:ss
    return parts[0] * 60 + parts[1];
  } else {
    // Fallback
    return parseInt(timeString, 10) || 0;
  }
};

// Crea un ID temporaneo per i nuovi cicli
const createTempId = () => `temp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

// Componente per ogni ciclo con funzionalità di drag and drop
const SortableCycleItem = ({ 
  cycle, 
  index, 
  isEditMode, 
  canEdit,
  isInMago,
  handleCycleFieldChange, 
  handleDeleteCycle, 
  expanded, 
  toggleExpand 
}) => {
  
  // Hook per drag and drop dal dnd kit
  const { 
    attributes, 
    listeners, 
    setNodeRef, 
    transform, 
    transition, 
    isDragging 
  } = useSortable({ id: cycle.id || cycle.RtgStep });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
  };

  const isExpanded = expanded.includes(cycle.id || cycle.RtgStep);
  const isReadOnly = isInMago 
  
  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={`bg-white border rounded-lg overflow-hidden shadow-sm mb-3 ${isDragging ? 'border-blue-500 ring-2 ring-blue-200' : ''}`}
    >
      {/* Prima riga - Intestazione e informazioni principali */}
      <div className="flex items-center px-4 py-3 bg-gray-50 border-b">
        {isEditMode && !isReadOnly && (
          <div 
            className="cursor-move mr-2 text-gray-400 hover:text-gray-600"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-5 w-5" />
          </div>
        )}
        
        <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-full bg-blue-100 text-blue-700 font-medium mr-3">
          {cycle.RtgStep}
        </div>
        
        <div className="flex-grow">
          <div className="flex flex-col sm:flex-row sm:items-baseline">
            <div className="font-medium text-gray-900">{cycle.Operation}</div>
            {!isEditMode && cycle.OperationDescription && (
              <div className="text-sm text-gray-500 sm:ml-2">
                {cycle.OperationDescription}
              </div>
            )}
          </div>
          <div className="text-sm text-gray-600 mt-0.5">
            {cycle.WC}{cycle.WorkCenterDescription ? ` - ${cycle.WorkCenterDescription}` : ''}
          </div>
          
          {/* Indicatore che il ciclo è protetto */}
          {isInMago && (
            <Badge className="mt-1 bg-blue-100 text-blue-700">ERP</Badge>
          )}
        </div>
        
        {!isEditMode && (
          <div className="flex-shrink-0 flex ml-4 space-x-4">
            <div className="text-right">
              <div className="text-xs text-gray-500">Tempo Esec.</div>
              <div className="font-medium">{formatTimeHHMMSS(cycle.ProcessingTime)}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500">Setup</div>
              <div className="font-medium">{formatTimeHHMMSS(cycle.SetupTime)}</div>
            </div>
          </div>
        )}
        
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-7 w-7 text-gray-500 ml-2"
          onClick={() => toggleExpand(cycle.id || cycle.RtgStep)}
        >
          {isExpanded ? <ExpandIcon className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>
        
        {isEditMode && !isReadOnly && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 text-red-500 ml-2"
            onClick={() => handleDeleteCycle(cycle.id || cycle.RtgStep)}
          >
            <Trash className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      {/* Contenuto informazioni o campi di modifica (solo se espanso) */}
      {isExpanded && (
        isEditMode && !isReadOnly ? (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-sm font-medium mb-1">Fase</div>
                  <Input 
                    value={cycle.RtgStep || ''}
                    onChange={e => handleCycleFieldChange(cycle.id || cycle.RtgStep, 'RtgStep', parseInt(e.target.value))}
                    className="h-9 w-full"
                    type="number"
                  />
                </div>
                <div>
                  <div className="text-sm font-medium mb-1">Centro di Lavoro</div>
                  <Select
                    value={cycle.WC || 'none'}
                    onValueChange={value => handleCycleFieldChange(cycle.id || cycle.RtgStep, 'WC', value === 'none' ? '' : value)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Seleziona CdL" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Seleziona centro di lavoro</SelectItem>
                      {/* Assumiamo che workCenters venga passato come prop o sia disponibile nel contesto */}
                      {window.workCenters && window.workCenters.map(wc => (
                        <SelectItem key={wc.WC} value={wc.WC || `wc-${wc.id}`}>
                          {wc.Description || wc.WC || 'Centro senza nome'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="mt-1 text-xs text-gray-500">
                    {cycle.WorkCenterDescription}
                  </div>
                </div>
              </div>
              
              <div>
                <div className="text-sm font-medium mb-1">Operazione</div>
                <Select
                  value={cycle.Operation || 'none'}
                  onValueChange={value => handleCycleFieldChange(cycle.id || cycle.RtgStep, 'Operation', value === 'none' ? '' : value)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Seleziona operazione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Seleziona operazione</SelectItem>
                    {/* Assumiamo che operations venga passato come prop o sia disponibile nel contesto */}
                    {window.operations && window.operations.map(op => (
                      <SelectItem key={op.Operation} value={op.Operation || `op-${op.id}`}>
                        {op.Description || op.Operation || 'Operazione senza nome'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="mt-1 text-xs text-gray-500">
                  {cycle.OperationDescription}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-sm font-medium mb-1">Tempo Esecuzione</div>
                  <Input
                    value={
                      typeof cycle.ProcessingTime === 'string' && 
                      cycle.ProcessingTime.includes(':') ? 
                        cycle.ProcessingTime : 
                        formatTimeHHMMSS(cycle.ProcessingTime)
                    }
                    onChange={e => handleCycleFieldChange(cycle.id || cycle.RtgStep, 'ProcessingTime', e.target.value)}
                    className="h-9 w-full"
                    placeholder="HH:mm:ss"
                  />
                </div>
                <div>
                  <div className="text-sm font-medium mb-1">Tempo Setup</div>
                  <Input
                    value={
                      typeof cycle.SetupTime === 'string' && 
                      cycle.SetupTime.includes(':') ? 
                        cycle.SetupTime : 
                        formatTimeHHMMSS(cycle.SetupTime)
                    }
                    onChange={e => handleCycleFieldChange(cycle.id || cycle.RtgStep, 'SetupTime', e.target.value)}
                    className="h-9 w-full"
                    placeholder="HH:mm:ss"
                  />
                </div>
              </div>
            </div>
            
            <div>
              <div className="text-sm font-medium mb-1">Note</div>
              <Textarea
                value={cycle.Notes || ''}
                onChange={e => handleCycleFieldChange(cycle.id || cycle.RtgStep, 'Notes', e.target.value)}
                className="min-h-[120px] resize-vertical"
                rows={5}
              />
            </div>
          </div>
        ) : (
          <div className="p-4 text-sm text-gray-600 border-t">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="font-medium text-gray-700 mb-1">Centro di Lavoro:</div>
                <div className="pl-2">{cycle.WC} - {cycle.WorkCenterDescription}</div>
                
                <div className="font-medium text-gray-700 mb-1 mt-3">Operazione:</div>
                <div className="pl-2">{cycle.Operation} - {cycle.OperationDescription}</div>
                
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <div className="font-medium text-gray-700 mb-1">Tempo Esecuzione:</div>
                    <div className="pl-2">{formatTimeHHMMSS(cycle.ProcessingTime)}</div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-700 mb-1">Tempo Setup:</div>
                    <div className="pl-2">{formatTimeHHMMSS(cycle.SetupTime)}</div>
                  </div>
                </div>
              </div>
              
              {cycle.Notes && (
                <div>
                  <div className="font-medium text-gray-700 mb-1">Note:</div>
                  <div className="pl-2 whitespace-pre-wrap">{cycle.Notes}</div>
                </div>
              )}
            </div>
            
            {isInMago && (
              <div className="flex items-center mt-4 p-2 bg-blue-50 rounded-md text-xs text-blue-700">
                <AlertTriangle className="h-3 w-3 mr-1 flex-shrink-0" />
                <span>Questo ciclo è presente in ERP (Mago) e non può essere modificato.</span>
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
};

const CyclesTab = () => {
  const { 
    selectedNode,
    bomRouting,
    workCenters,
    operations,
    suppliers,
    editMode,
    canEdit,
    loadMasterData,
    addRouting,
    updateRouting,
    deleteRouting,
    smartRefresh,
    reorderBOMRoutings,
    pendingChanges,
    setPendingChanges
  } = useBOMViewer();
  
  // Stato per il "draft" dei cicli in fase di editing
  const [draftCycles, setDraftCycles] = useState([]);
  // Stato originale per confronto e annullamento
  const [originalCycles, setOriginalCycles] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  
  // Stato per tenere traccia dei cicli espansi
  const [expandedCycles, setExpandedCycles] = useState([]);
  
  // Stato per dialog di conferma annullamento
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Flag per verificare se ci sono modifiche
  const [hasChanges, setHasChanges] = useState(false);
  
  // Sensori per il drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Richiede almeno 5px di movimento per attivare il drag
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  // Flag per tracciare se i dati master sono stati caricati
  const dataLoadedRef = useRef(false);
  
  // Condividi i dati con il component window per l'accesso all'interno dei componenti
  useEffect(() => {
    if (workCenters) window.workCenters = workCenters;
    if (operations) window.operations = operations;
  }, [workCenters, operations]);
  
  // Carica i dati master solo una volta al mount
  useEffect(() => {
    if (!dataLoadedRef.current) {
      loadMasterData();
      dataLoadedRef.current = true;
    }
  }, [loadMasterData]);
  
  // Aggiorna i cicli dal contesto quando cambia il nodo selezionato
  useEffect(() => {
    if (!selectedNode || selectedNode.type !== 'component' || !Array.isArray(bomRouting)) {
      setDraftCycles([]);
      setOriginalCycles([]);
      return;
    }
    
    // Filtra i cicli per questo componente
    const componentBomId = selectedNode.data.BOMId;
    const ComponentNature = selectedNode.data.ComponentNature || selectedNode.data.Nature;
    
    // Criterio di filtro per mostrare SOLO i cicli del componente selezionato
    const filteredCycles = bomRouting.filter(cycle => 
      cycle.BOMId && cycle.BOMId == componentBomId && 
      ComponentNature != '22413314' && ComponentNature != 22413314
    );
    
    // Ordina per numero fase
    const sortedCycles = [...filteredCycles].sort((a, b) => 
      (parseInt(a.RtgStep) || 0) - (parseInt(b.RtgStep) || 0)
    );
    
    // Deep copy per evitare riferimenti tra gli array
    const cyclesToStore = JSON.parse(JSON.stringify(sortedCycles));
    setOriginalCycles(cyclesToStore);
    
    // Aggiorna sempre lo stato bozza
    setDraftCycles(cyclesToStore);
    
    // Reset delle modifiche in sospeso per i cicli di questo componente quando cambia il nodo selezionato
    if (selectedNode.data.ComponentId) {
      setPendingChanges(prev => {
        const newChanges = {...prev};
        
        // Rimuovi le eventuali modifiche ai cicli per questo componente
        if (newChanges[`cycle-${selectedNode.data.ComponentId}`]) {
          delete newChanges[`cycle-${selectedNode.data.ComponentId}`];
        }
        
        return newChanges;
      });
    }

    // Reset del flag delle modifiche
    setHasChanges(false);

  }, [selectedNode, bomRouting, setPendingChanges]);
  
  // Funzione per espandere/comprimere un ciclo
  const toggleCycleExpansion = (cycleId) => {
    setExpandedCycles(prev => {
      if (prev.includes(cycleId)) {
        return prev.filter(id => id !== cycleId);
      } else {
        return [...prev, cycleId];
      }
    });
  };
  
  // Modifica un campo di un ciclo
  const handleCycleFieldChange = (rtgStep, field, value) => {
    // Aggiorna lo stato draft locale
    setDraftCycles(prevDraft => 
      prevDraft.map(cycle => 
        cycle.RtgStep === rtgStep || cycle.id === rtgStep
          ? { ...cycle, [field]: value }
          : cycle
      )
    );
    
    // Trova il ciclo che stiamo modificando
    const cycle = draftCycles.find(c => c.RtgStep === rtgStep || c.id === rtgStep);
    if (!cycle) return;

    // Imposta il flag delle modifiche a true
    setHasChanges(true);
    
    // Se siamo in modalità edit, aggiungi la modifica alle modifiche in sospeso
    if (editMode && selectedNode && selectedNode.data && selectedNode.data.ComponentId) {
      const cycleId = `cycle-${selectedNode.data.ComponentId}`;
      
      setPendingChanges(prev => {
        // Se non ci sono modifiche precedenti per questi cicli, inizializza
        if (!prev[cycleId]) {
          prev[cycleId] = {
            cycleChanges: {},
            bomId: selectedNode.data.BOMId,
            componentId: selectedNode.data.ComponentId
          };
        }
        
        // Se non ci sono modifiche precedenti per questo ciclo specifico, inizializza
        if (!prev[cycleId].cycleChanges[rtgStep]) {
          prev[cycleId].cycleChanges[rtgStep] = {
            original: { ...cycle },
            changes: {}
          };
        }
        
        // Aggiorna il campo specifico
        prev[cycleId].cycleChanges[rtgStep].changes[field] = value;
        
        return { ...prev };
      });
    }
  };
  
  // Aggiungi un nuovo ciclo (solo nello stato locale)
  const handleAddCycle = () => {
    // Trova l'ultimo numero di fase
    const lastStep = draftCycles.length > 0 
      ? Math.max(...draftCycles.map(c => parseInt(c.RtgStep) || 0)) 
      : 0;
    const newStep = lastStep + 10; // Incrementa di 10
    
    // Crea un nuovo ciclo
    const newCycle = {
      id: createTempId(), // ID temporaneo per identificarlo
      RtgStep: newStep,
      BOMId: selectedNode.data.BOMId,
      Operation: '',
      WC: '',
      ProcessingTime: 0,
      SetupTime: 0,
      NoOfProcessingWorkers: 1,
      NoOfSetupWorkers: 1,
      Notes: '',
      // Campi aggiuntivi per il rendering
      isNew: true
    };
    
    // Aggiungi il nuovo ciclo alla bozza
    setDraftCycles(prevDraft => [...prevDraft, newCycle]);
    
    // Imposta il flag delle modifiche a true
    setHasChanges(true);
    
    // Aggiungi il nuovo ciclo alle modifiche in sospeso
    if (selectedNode && selectedNode.data && selectedNode.data.ComponentId) {
      const cycleId = `cycle-${selectedNode.data.ComponentId}`;
      
      setPendingChanges(prev => {
        // Se non ci sono modifiche precedenti per questi cicli, inizializza
        if (!prev[cycleId]) {
          prev[cycleId] = {
            cycleChanges: {},
            bomId: selectedNode.data.BOMId,
            componentId: selectedNode.data.ComponentId,
            newCycles: []
          };
        }
        
        // Se non c'è l'array dei nuovi cicli, inizializzalo
        if (!prev[cycleId].newCycles) {
          prev[cycleId].newCycles = [];
        }
        
        // Aggiungi il nuovo ciclo
        prev[cycleId].newCycles.push(newCycle);
        
        return { ...prev };
      });
    }
    
    // Espandi automaticamente il nuovo ciclo
    setExpandedCycles(prev => [...prev, newCycle.id]);
  };
  
  // Elimina un ciclo (solo nello stato locale)
  const handleDeleteCycle = async (cycleId) => {
    try {
      // Trova il ciclo che stiamo eliminando
      const cycle = draftCycles.find(c => (c.id || c.RtgStep) === cycleId);
      if (!cycle) return;
      
      // Rimuovi il ciclo dallo stato bozza
      setDraftCycles(prevDraft => 
        prevDraft.filter(cycle => 
          (cycle.id || cycle.RtgStep) !== cycleId
        )
      );
      
      // Imposta il flag delle modifiche a true
      setHasChanges(true);
      
      // Aggiungi all'elenco delle eliminazioni nelle modifiche in sospeso
      if (selectedNode && selectedNode.data && selectedNode.data.ComponentId) {
        const componentCycleId = `cycle-${selectedNode.data.ComponentId}`;
        
        setPendingChanges(prev => {
          // Se non ci sono modifiche precedenti per questi cicli, inizializza
          if (!prev[componentCycleId]) {
            prev[componentCycleId] = {
              cycleChanges: {},
              bomId: selectedNode.data.BOMId,
              componentId: selectedNode.data.ComponentId,
              deletedCycles: []
            };
          }
          
          // Se non c'è l'array dei cicli eliminati, inizializzalo
          if (!prev[componentCycleId].deletedCycles) {
            prev[componentCycleId].deletedCycles = [];
          }
          
          // Se è un ciclo temporaneo, rimuovilo dai nuovi cicli se presente
          if (cycle.id && cycle.id.startsWith('temp-') && prev[componentCycleId].newCycles) {
            prev[componentCycleId].newCycles = prev[componentCycleId].newCycles.filter(
              newCycle => newCycle.id !== cycle.id
            );
          } else {
            // Altrimenti aggiungilo ai cicli da eliminare
            prev[componentCycleId].deletedCycles.push(cycle);
          }
          
          return { ...prev };
        });
      }
      
      // Rimuovi anche dall'elenco degli espansi
      setExpandedCycles(prev => prev.filter(id => id !== cycleId));
    } catch (error) {
      console.error('Errore nella gestione dell\'eliminazione del ciclo:', error);
      toast({
        title: "Errore",
        description: "Errore durante l'operazione di eliminazione",
        variant: "destructive"
      });
    }
  };
  
  // Gestisce il fine del drag and drop
  const handleDragEnd = (event) => {
    const { active, over } = event;
    
    if (active.id !== over.id) {
      // Trova gli indici degli elementi trascinati e di destinazione
      const oldIndex = draftCycles.findIndex(item => 
        (item.id || item.RtgStep) === active.id
      );
      const newIndex = draftCycles.findIndex(item => 
        (item.id || item.RtgStep) === over.id
      );
      
      // Usa la funzione arrayMove di dnd-kit per riordinare
      const reorderedCycles = arrayMove(draftCycles, oldIndex, newIndex);
      setDraftCycles(reorderedCycles);
      
      // Imposta il flag delle modifiche a true
      setHasChanges(true);
      
      // Aggiorna l'ordine nelle modifiche in sospeso
      if (selectedNode && selectedNode.data && selectedNode.data.ComponentId) {
        const cycleId = `cycle-${selectedNode.data.ComponentId}`;
        
        setPendingChanges(prev => {
          // Se non ci sono modifiche precedenti per questi cicli, inizializza
          if (!prev[cycleId]) {
            prev[cycleId] = {
              cycleChanges: {},
              bomId: selectedNode.data.BOMId,
              componentId: selectedNode.data.ComponentId
            };
          }
          
          // Aggiorna l'ordine
          prev[cycleId].newOrder = reorderedCycles.map(cycle => ({
            RtgStep: cycle.RtgStep,
            id: cycle.id,
            isTemp: cycle.id && cycle.id.startsWith('temp-')
          }));
          
          return { ...prev };
        });
      }
    }
  };
  
  // Gestisce il reset delle modifiche dopo un annullamento
  const handleCancelEditing = () => {
    // Verifica se ci sono modifiche
    if (hasChanges) {
      // Apri dialog di conferma
      setShowCancelConfirm(true);
    } else {
      // Se non ci sono modifiche, annulla direttamente
      resetAllChanges();
    }
  };
  
  // Funzione per confermare l'annullamento delle modifiche
  const confirmCancelEditing = () => {
    resetAllChanges();
    setShowCancelConfirm(false);
  };
  
  // Funzione per resettare tutte le modifiche
  const resetAllChanges = () => {
    // Resetta lo stato bozza ai valori originali
    setDraftCycles(JSON.parse(JSON.stringify(originalCycles)));
    
    // Rimuovi le modifiche pendenti per questo componente
    if (selectedNode && selectedNode.data && selectedNode.data.ComponentId) {
      const cycleId = `cycle-${selectedNode.data.ComponentId}`;
      
      setPendingChanges(prev => {
        const newChanges = {...prev};
        // Rimuovi tutte le modifiche pendenti per questo componente
        if (newChanges[cycleId]) {
          delete newChanges[cycleId];
        }
        return newChanges;
      });
    }
    
    // Reset del flag delle modifiche
    setHasChanges(false);
  };
  
  // Verifica se il componente è presente in Mago e quindi i cicli non sono modificabili
  const isComponentInMago = selectedNode && selectedNode.data && 
    (selectedNode.data.stato_erp === '1' || selectedNode.data.stato_erp === 1);
  
  // Se non c'è un componente selezionato o non ha cicli
  if (!selectedNode || selectedNode.type !== 'component') {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>Seleziona un componente per visualizzare i suoi cicli di produzione</p>
      </div>
    );
  }
  
  // Controllo se è un codice d'acquisto (non ha cicli)
  const isAcquistoComponent = 
    selectedNode.data.ComponentNature === 22413314 || 
    selectedNode.data.ComponentNature === '22413314' ||
    selectedNode.data.Nature === 22413314 ||
    selectedNode.data.Nature === '22413314';
  
  if (isAcquistoComponent) {
    return (
      <div className="p-6 text-center">
        <Alert>
          <Info className="h-4 w-4 mr-2" />
          <AlertDescription>
            I codici di acquisto non hanno cicli di produzione.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">
          Cicli di Produzione: {selectedNode.data.ComponentItemCode || selectedNode.data.ComponentCode}
        </h3>
        
        {/* Pulsanti di azione per modifica/annulla/salva */}
        {!isComponentInMago && (
          <div className="flex gap-2">
            {editMode ? (
              <>
                <Button variant="outline" onClick={handleCancelEditing}>
                  Annulla
                </Button>
              </>
            ) : (
              <>
                {/* Qui potrebbero esserci altri pulsanti in modalità visualizzazione */}
              </>
            )}
          </div>
        )}
        
        {/* Mostra messaggio se il componente è in Mago */}
        {isComponentInMago && (
          <div className="flex items-center">
            <Badge className="bg-blue-100 text-blue-700 mr-2">ERP</Badge>
            <span className="text-sm text-blue-700">Componente presente in Mago</span>
          </div>
        )}
      </div>
      
      {/* Avviso se il componente è in Mago */}
      {isComponentInMago && (
        <Alert className="mb-4 border-blue-200 bg-blue-50 text-blue-800">
          <AlertTriangle className="h-4 w-4 mr-2" />
          <AlertDescription>
            Questo componente è presente in ERP (Mago). I cicli non possono essere modificati.
          </AlertDescription>
        </Alert>
      )}
      
      {/* Se non ci sono cicli */}
      {draftCycles.length === 0 ? (
        <div className="p-6 text-center">
          <p className="text-gray-500 mb-4">Nessun ciclo definito per questo componente</p>
          
          {/* Mostra il pulsante Aggiungi solo in modalità modifica e se non è in Mago */}
          {editMode && !isComponentInMago && (
            <Button onClick={handleAddCycle}>
              <Plus className="h-4 w-4 mr-1" />
              Aggiungi Fase
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {editMode && !isComponentInMago ? (
              <DndContext 
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext 
                  items={draftCycles.map(cycle => cycle.id || cycle.RtgStep)}
                  strategy={verticalListSortingStrategy}
                >
                  {draftCycles.map((cycle, index) => (
                    <SortableCycleItem
                      key={cycle.id || cycle.RtgStep}
                      cycle={cycle}
                      index={index}
                      isEditMode={editMode}
                      canEdit={canEdit}
                      isInMago={isComponentInMago}
                      handleCycleFieldChange={handleCycleFieldChange}
                      handleDeleteCycle={handleDeleteCycle}
                      expanded={expandedCycles}
                      toggleExpand={toggleCycleExpansion}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            ) : (
              draftCycles.map((cycle, index) => (
                <SortableCycleItem
                  key={cycle.id || cycle.RtgStep}
                  cycle={cycle}
                  index={index}
                  isEditMode={false}
                  canEdit={canEdit}
                  isInMago={isComponentInMago}
                  handleCycleFieldChange={handleCycleFieldChange}
                  handleDeleteCycle={handleDeleteCycle}
                  expanded={expandedCycles}
                  toggleExpand={toggleCycleExpansion}
                />
              ))
            )}
          </div>
          
          {/* Pulsante per aggiungere nuovi cicli (solo in modalità modifica e se non è in Mago) */}
          {editMode && !isComponentInMago && (
            <div className="mt-4">
              <Button variant="outline" onClick={handleAddCycle}>
                <Plus className="h-4 w-4 mr-1" />
                Aggiungi Fase
              </Button>
            </div>
          )}
        </>
      )}
      
      {/* Dialog di conferma per annullamento con modifiche */}
      <Dialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Annullare le modifiche?</DialogTitle>
            <DialogDescription>
              Ci sono modifiche non salvate. Se annulli, tutte le modifiche andranno perse.
              Vuoi continuare?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowCancelConfirm(false)}>No, continua a modificare</Button>
            <Button variant="destructive" onClick={confirmCancelEditing}>Sì, annulla modifiche</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Indicatore durante il salvataggio */}
      {isSaving && (
        <div className="fixed inset-0 bg-black/10 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500"></div>
              <p>Salvataggio delle modifiche in corso...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CyclesTab;