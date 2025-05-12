// CyclesTab.jsx - Versione corretta
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
  Edit,
  Save,
  Plus,
  Trash,
  ChevronUp,
  ChevronDown,
  X,
  Info
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
    loadBOMData
  } = useBOMViewer();
  
  const [cycleData, setCycleData] = useState([]);
  const [isEditingCycles, setIsEditingCycles] = useState(false);
  const [editedCycles, setEditedCycles] = useState({});
  const [debugInfo, setDebugInfo] = useState({ visible: false, data: {} });
  
  // Flag per tracciare se i dati master sono stati caricati
  const dataLoadedRef = useRef(false);
  
  // Carica i dati master solo una volta al mount
  useEffect(() => {
    if (!dataLoadedRef.current) {
      loadMasterData();
      dataLoadedRef.current = true;
    }
  }, [loadMasterData]);
  
  // Aggiorna i cicli visualizzati quando cambia il nodo selezionato o i dati dei cicli
  useEffect(() => {
    if (!selectedNode || selectedNode.type !== 'component' || !Array.isArray(bomRouting)) {
      setCycleData([]);
      return;
    }
    
    // Filtra i cicli per questo componente
    const componentId = selectedNode.data.ComponentId || selectedNode.data.Id;
    const componentItemId = selectedNode.data.ItemId;
    const componentBomId = selectedNode.data.BOMId;
    const componentLine = selectedNode.data.Line;
    
    // Informazioni di debug
    const debug = {
      componentId,
      componentItemId,
      componentBomId,
      componentLine,
      totalCycles: bomRouting.length,
      selectedNode: selectedNode.id,
      cycles: []
    };
    
    console.log("Filtrando cicli per componente:", debug);
    
    // Migliore criterio di filtro per mostrare SOLO i cicli del componente selezionato
    const filteredCycles = bomRouting.filter(cycle => {
      // Requisito principale: il ciclo deve essere esplicitamente collegato a questo componente
      // Verifica match più stretto per prima cosa
      const directComponentMatch = 
        (cycle.ComponentId && cycle.ComponentId == componentId) ||
        (cycle.ItemId && cycle.ItemId == componentItemId);
      
      // Match per BOMId + ComponentLine (specifico per questo componente)
      const bomAndLineMatch = 
        (cycle.BOMId && cycle.BOMId == componentBomId) && 
        (cycle.ComponentLine !== undefined && cycle.ComponentLine == componentLine);
      
      // Se almeno una condizione è vera, il ciclo appartiene a questo componente
      const isMatch = directComponentMatch || bomAndLineMatch;
      
      if (isMatch) {
        debug.cycles.push({
          rtgStep: cycle.RtgStep,
          operation: cycle.Operation,
          directMatch: directComponentMatch,
          bomLineMatch: bomAndLineMatch
        });
      }
      
      return isMatch;
    });
    
    console.log(`Trovati ${filteredCycles.length} cicli per il componente selezionato`);
    setDebugInfo({ visible: filteredCycles.length === 0 && bomRouting.length > 0, data: debug });
    
    // Ordina per numero fase
    const sortedCycles = [...filteredCycles].sort((a, b) => 
      (parseInt(a.RtgStep) || 0) - (parseInt(b.RtgStep) || 0)
    );
    
    // Confronta se i dati sono cambiati per evitare update inutili
    if (JSON.stringify(sortedCycles) !== JSON.stringify(cycleData)) {
      setCycleData(sortedCycles);
      
      // Inizializza gli stati modificati
      const initialEdits = {};
      sortedCycles.forEach(cycle => {
        initialEdits[cycle.RtgStep] = { ...cycle };
      });
      setEditedCycles(initialEdits);
    }
  }, [selectedNode, bomRouting]);
  
  // Gestione inizio editing cicli
  const handleStartEditing = () => {
    setIsEditingCycles(true);
  };
  
  // Gestione fine editing cicli
  const handleSaveEditing = async () => {
    try {
      // Salva tutte le modifiche
      for (const rtgStep in editedCycles) {
        const originalCycle = cycleData.find(c => c.RtgStep == rtgStep);
        const editedCycle = editedCycles[rtgStep];
        
        // Converte i campi di tempo da HH:mm:ss a secondi prima del salvataggio
        const cycleToSave = {
          ...editedCycle,
          ProcessingTime: typeof editedCycle.ProcessingTime === 'string' && editedCycle.ProcessingTime.includes(':') ? 
            parseTimeToSeconds(editedCycle.ProcessingTime) : 
            editedCycle.ProcessingTime,
          SetupTime: typeof editedCycle.SetupTime === 'string' && editedCycle.SetupTime.includes(':') ? 
            parseTimeToSeconds(editedCycle.SetupTime) : 
            editedCycle.SetupTime
        };
        
        // Verifica se ci sono modifiche
        if (JSON.stringify(originalCycle) !== JSON.stringify(cycleToSave)) {
          await updateRouting(parseInt(rtgStep), cycleToSave);
        }
      }
      
      // Ricarica i dati
      await loadBOMData();
      
      // Esce dalla modalità modifica
      setIsEditingCycles(false);
    } catch (error) {
      console.error('Errore nel salvataggio delle modifiche ai cicli:', error);
      alert(`Errore nel salvataggio: ${error.message}`);
    }
  };
  
  // Gestione annullamento editing
  const handleCancelEditing = () => {
    // Reimpostazione degli stati modificati
    const initialEdits = {};
    cycleData.forEach(cycle => {
      initialEdits[cycle.RtgStep] = { ...cycle };
    });
    setEditedCycles(initialEdits);
    
    setIsEditingCycles(false);
  };
  
  // Gestione modifica campo
  const handleCycleFieldChange = (rtgStep, field, value) => {
    setEditedCycles(prev => ({
      ...prev,
      [rtgStep]: {
        ...prev[rtgStep],
        [field]: value
      }
    }));
  };
  
  // Gestione aggiunta nuovo ciclo
  const handleAddCycle = async () => {
    try {
      if (!selectedNode || selectedNode.type !== 'component') return;
      
      // Trova l'ultimo numero di fase
      const lastStep = cycleData.length > 0 
        ? Math.max(...cycleData.map(c => parseInt(c.RtgStep) || 0)) 
        : 0;
      const newStep = lastStep + 10; // Incrementa di 10
      
      // Crea un nuovo ciclo
      const componentId = selectedNode.data.ComponentId || selectedNode.data.Id;
      const bomId = selectedNode.data.BOMId;
      const componentLine = selectedNode.data.Line;
      
      const newCycle = {
        RtgStep: newStep,
        Operation: '',
        WC: '',
        ProcessingTime: 0, // Secondi
        SetupTime: 0, // Secondi
        ComponentId: componentId,
        BOMId: bomId,
        ComponentLine: componentLine, // Aggiungiamo esplicitamente ComponentLine
        Path: selectedNode.data.Path // Aggiungiamo esplicitamente il Path
      };
      
      console.log("Aggiunta nuovo ciclo:", newCycle);
      
      // Salva il nuovo ciclo
      await addRouting(newCycle);
      
      // Ricarica i dati
      await loadBOMData();
    } catch (error) {
      console.error('Errore nell\'aggiunta del ciclo:', error);
      alert(`Errore nell'aggiunta del ciclo: ${error.message}`);
    }
  };
  
  // Gestione eliminazione ciclo
  const handleDeleteCycle = async (rtgStep) => {
    try {
      const confirm = window.confirm('Sei sicuro di voler eliminare questa fase?');
      if (!confirm) return;
      
      await deleteRouting(rtgStep);
      
      // Ricarica i dati
      await loadBOMData();
    } catch (error) {
      console.error('Errore nell\'eliminazione del ciclo:', error);
      alert(`Errore nell'eliminazione del ciclo: ${error.message}`);
    }
  };
  
  // Gestione spostamento ciclo (su/giù)
  const handleMoveCycle = async (index, direction) => {
    try {
      if (direction !== 'up' && direction !== 'down') return;
      if (direction === 'up' && index === 0) return;
      if (direction === 'down' && index === cycleData.length - 1) return;
      
      // Ordina le fasi di ciclo
      const newOrder = [...cycleData];
      
      // Scambia gli elementi
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
      
      // Aggiorna i numeri di fase
      const updatedCycles = newOrder.map((cycle, idx) => ({
        ...cycle,
        originalRtgStep: cycle.RtgStep, // Mantieni il numero originale per l'identificazione
        RtgStep: (idx + 1) * 10 // Riassegna i numeri di fase
      }));
      
      // Salva le modifiche
      for (const cycle of updatedCycles) {
        await updateRouting(cycle.originalRtgStep || cycle.RtgStep, cycle);
      }
      
      // Ricarica i dati
      await loadBOMData();
    } catch (error) {
      console.error('Errore nello spostamento del ciclo:', error);
      alert(`Errore nello spostamento del ciclo: ${error.message}`);
    }
  };
  
  // Toggle del debug info
  const toggleDebugInfo = () => {
    setDebugInfo(prev => ({ ...prev, visible: !prev.visible }));
  };
  
  // Se non c'è un componente selezionato o non ha cicli
  if (!selectedNode || selectedNode.type !== 'component') {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>Seleziona un componente per visualizzare i suoi cicli di produzione</p>
      </div>
    );
  }
  
  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">
          Cicli di Produzione: {selectedNode.data.ComponentItemCode || selectedNode.data.ComponentCode}
        </h3>
        
        { (
          <div>
            {isEditingCycles ? (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCancelEditing}>
                  <X className="h-4 w-4 mr-1" />
                  Annulla
                </Button>
                <Button size="sm" onClick={handleSaveEditing}>
                  <Save className="h-4 w-4 mr-1" />
                  Salva
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleStartEditing}>
                  <Edit className="h-4 w-4 mr-1" />
                  Modifica
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Se non ci sono cicli */}
      {cycleData.length === 0 ? (
        <div className="p-6 text-center">
          <p className="text-gray-500 mb-4">Nessun ciclo definito per questo componente</p>
          
          { editMode && (
            <Button onClick={handleAddCycle}>
              <Plus className="h-4 w-4 mr-2" />
              Aggiungi Ciclo
            </Button>
          )}
        </div>
      ) : (
        <>
          <Table className="border-2">
            <TableHeader>
              <TableRow>
                <TableHead className="w-24 text-center border-r-2">FASE</TableHead>
                <TableHead className="w-1/2 text-center border-r-2">OPERAZIONE</TableHead>
                <TableHead className="w-1/2 text-center">CENTRO DI LAVORO</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cycleData.map((cycle, index) => (
                <React.Fragment key={cycle.RtgStep}>
                  {/* Prima riga - Fase, Operazione, Centro di Lavoro */}
                  <TableRow className="border-b-0">
                    {/* Fase */}
                    <TableCell className="border-r-2 text-center">
                      {isEditingCycles ? (
                        <Input 
                          value={editedCycles[cycle.RtgStep]?.RtgStep || cycle.RtgStep}
                          onChange={e => handleCycleFieldChange(cycle.RtgStep, 'RtgStep', parseInt(e.target.value))}
                          className="h-9 w-20 mx-auto"
                          type="number"
                        />
                      ) : (
                        cycle.RtgStep
                      )}
                    </TableCell>
                    
                    {/* Operazione */}
                    <TableCell className="border-r-2">
                      {isEditingCycles ? (
                        <>
                          <Select
                            value={editedCycles[cycle.RtgStep]?.Operation || 'none'}
                            onValueChange={value => handleCycleFieldChange(cycle.RtgStep, 'Operation', value === 'none' ? '' : value)}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Seleziona operazione" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Seleziona operazione</SelectItem>
                              {operations.map(op => (
                                <SelectItem key={op.Operation} value={op.Operation || `op-${op.id}`}>
                                  {op.Description || op.Operation || 'Operazione senza nome'}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="mt-1 text-xs text-gray-500">
                            {cycle.OperationDescription}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="font-medium">{cycle.Operation}</div>
                          <div className="text-xs text-gray-500">{cycle.OperationDescription}</div>
                        </>
                      )}
                    </TableCell>
                    
                    {/* Centro di Lavoro */}
                    <TableCell>
                      {isEditingCycles ? (
                        <>
                          <Select
                            value={editedCycles[cycle.RtgStep]?.WC || 'none'}
                            onValueChange={value => handleCycleFieldChange(cycle.RtgStep, 'WC', value === 'none' ? '' : value)}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Seleziona CdL" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Seleziona centro di lavoro</SelectItem>
                              {workCenters.map(wc => (
                                <SelectItem key={wc.WC} value={wc.WC || `wc-${wc.id}`}>
                                  {wc.Description || wc.WC || 'Centro senza nome'}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="mt-1 text-xs text-gray-500">
                            {cycle.WorkCenterDescription}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="font-medium">{cycle.WC}</div>
                          <div className="text-xs text-gray-500">{cycle.WorkCenterDescription}</div>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                  
                  {/* Seconda riga - Tasti, Esecuzione, Setup, Note */}
                  <TableRow className={index < cycleData.length - 1 ? "border-b-4" : ""}>
                    {/* Tasti/Azioni */}
                    <TableCell className="border-r-2 text-center p-1">
                      <div className="text-xs font-semibold mb-1 uppercase text-red-600">Tasti</div>
                      {isEditingCycles && (
                        <div className="flex flex-row items-center justify-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-gray-500"
                            onClick={() => handleMoveCycle(index, 'up')}
                            disabled={index === 0}
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-gray-500"
                            onClick={() => handleMoveCycle(index, 'down')}
                            disabled={index === cycleData.length - 1}
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-red-500"
                            onClick={() => handleDeleteCycle(cycle.RtgStep)}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                    
                    {/* Esecuzione */}
                    <TableCell className="border-r-2 p-1">
                      <div className="text-xs font-semibold mb-1 uppercase text-amber-600 text-center">Esecuzione</div>
                      {isEditingCycles ? (
                        <Input
                          value={
                            typeof editedCycles[cycle.RtgStep]?.ProcessingTime === 'string' && 
                            editedCycles[cycle.RtgStep]?.ProcessingTime.includes(':') ? 
                              editedCycles[cycle.RtgStep]?.ProcessingTime : 
                              formatTimeHHMMSS(editedCycles[cycle.RtgStep]?.ProcessingTime || cycle.ProcessingTime)
                          }
                          onChange={e => handleCycleFieldChange(cycle.RtgStep, 'ProcessingTime', e.target.value)}
                          className="h-9"
                          placeholder="HH:mm:ss"
                        />
                      ) : (
                        <div className="text-center">{formatTimeHHMMSS(cycle.ProcessingTime)}</div>
                      )}
                    </TableCell>
                    
                    {/* Setup */}
                    <TableCell className="border-r-2 p-1">
                      <div className="text-xs font-semibold mb-1 uppercase text-amber-600 text-center">Setup</div>
                      {isEditingCycles ? (
                        <Input
                          value={
                            typeof editedCycles[cycle.RtgStep]?.SetupTime === 'string' && 
                            editedCycles[cycle.RtgStep]?.SetupTime.includes(':') ? 
                              editedCycles[cycle.RtgStep]?.SetupTime : 
                              formatTimeHHMMSS(editedCycles[cycle.RtgStep]?.SetupTime || cycle.SetupTime)
                          }
                          onChange={e => handleCycleFieldChange(cycle.RtgStep, 'SetupTime', e.target.value)}
                          className="h-9"
                          placeholder="HH:mm:ss"
                        />
                      ) : (
                        <div className="text-center">{formatTimeHHMMSS(cycle.SetupTime)}</div>
                      )}
                    </TableCell>
                    
                    {/* Note */}
                    <TableCell className="p-1">
                      <div className="text-xs font-semibold mb-1 uppercase text-green-700 text-center">Note</div>
                      {isEditingCycles ? (
                        <Textarea
                          value={editedCycles[cycle.RtgStep]?.Notes || cycle.Notes || ''}
                          onChange={e => handleCycleFieldChange(cycle.RtgStep, 'Notes', e.target.value)}
                          className="min-h-[60px] resize-none"
                          rows={2}
                        />
                      ) : (
                        <div className="max-h-16 overflow-auto text-sm">
                          {cycle.Notes || '-'}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
          
          {/* Aggiungi ciclo (solo in modalità modifica) */}
          { isEditingCycles && (
            <div className="mt-4">
              <Button variant="outline" onClick={handleAddCycle}>
                <Plus className="h-4 w-4 mr-2" />
                Aggiungi Ciclo
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CyclesTab;