// BOMViewer/components/BOMHeader.jsx - Versione migliorata per aggiungere componenti al primo livello
import React, { useEffect, useState, useRef } from 'react';
import { useBOMViewer } from '../context/BOMViewerContext';
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Edit, Save, X, Plus, Copy, PlusCircle, AlertCircle, Code, Replace } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { swal } from '@/lib/common';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const BOMHeader = () => {
  const { 
    item, 
    bom, 
    selectedBomId, 
    setSelectedBomId,
    selectedBomVersion, 
    setSelectedBomVersion,
    availableVersions, 
    setAvailableVersions,
    getBOMByItemId,
    editMode,
    setEditMode,
    canEdit,
    loading,
    setLoading,
    loadBOMData,
    addUpdateBOM,
    smartRefresh,
    getBOMVersions,
    setBom,
    setBomComponents,
    setBomRouting, 
    pendingChanges,
    setPendingChanges,
    updateItemDetails,
    updateComponent,
    selectedNode,
    bomComponents,
    updateRouting,
    addRouting,
    deleteRouting,
    reorderBOMRoutings,
    addComponent,
    getERPItems,
    getAvailableItems,
    projectArticlesActions
  } = useBOMViewer();

  const [isCreating, setIsCreating] = useState(false);
  const [bomDescription, setBomDescription] = useState('');
  const [bomCode, setBomCode] = useState('');
  const [bomStatus, setBomStatus] = useState('');
  const [parentComponent, setParentComponent] = useState(null);
  
  // Nuovo stato per verificare se la distinta è vuota
  const [isEmpty, setIsEmpty] = useState(false);
  const [showCancelConfirmDialog, setShowCancelConfirmDialog] = useState(false);
  // Stati per dialoghi di aggiunta componente
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addOption, setAddOption] = useState("");
  const [showAddManualDialog, setShowAddManualDialog] = useState(false);
  const [showAddSelectDialog, setShowAddSelectDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("erp");
  const [searchQuery, setSearchQuery] = useState('');
  const [erpItems, setErpItems] = useState([]);
  const [projectItems, setProjectItems] = useState([]);

  // Stato per l'inserimento manuale
  const [manualData, setManualData] = useState({
    code: '',
    description: '',
    nature: '22413312',
    uom: 'PZ',
    quantity: 1
  });
  
  // Definizione degli stati distinta disponibili
  const availableStatuses = [
    { value: 'BOZZA', label: 'Bozza' },
    { value: 'IN PRODUZIONE', label: 'In Produzione' },
    { value: 'ANNULLATO', label: 'Annullato' },
    { value: 'SOSPESO', label: 'Sospeso' }
  ];
  
  // Flag per tracciare se abbiamo già fatto il caricamento
  const didFetchRef = useRef(false);
  // Mappa per memorizzare la corrispondenza tra versione e ID BOM
  const versionMapRef = useRef({});
  // Flag per prevenire caricamenti duplicati
  const loadingVersionRef = useRef(null);

  // Verifica se la distinta è vuota quando cambiano i componenti
  useEffect(() => {
    if (bomComponents) {
      setIsEmpty(bomComponents.length === 0);
    }
  }, [bomComponents]);

  // Nuova funzione per trovare il componente padre
  const findParentComponent = () => {
    if (!selectedNode || !selectedNode.data || !Array.isArray(bomComponents) || bomComponents.length === 0) {
      setParentComponent(null);
      return;
    }

    const component = selectedNode.data;
    
    // Se il livello è 1, non ha un padre nella distinta
    if (component.Level <= 1) {
      setParentComponent(null);
      return;
    }

    // 1. Troviamo il padre usando il Path
    if (component.Path) {
      const pathParts = component.Path.split('.');
      
      // Rimuoviamo l'ultimo elemento per ottenere il path del padre
      pathParts.pop();
      
      if (pathParts.length === 0) {
        setParentComponent(null);
        return;
      }
      
      // Prendiamo l'ultimo elemento del path come ComponentId del padre
      const parentComponentId = pathParts[pathParts.length - 1];
      
      // Troviamo il componente padre nella lista dei componenti
      const parent = bomComponents.find(comp => 
        comp.ComponentId === parentComponentId && 
        comp.Level === component.Level - 1
      );

      setParentComponent(parent);
      return;
    }
    
    // 2. Alternativa: cerchiamo indietro nella lista per trovare un componente con Level = Level-1
    const index = bomComponents.findIndex(comp => 
      comp.ComponentId === component.ComponentId && 
      comp.Line === component.Line
    );
    
    if (index > 0) {
      for (let i = index - 1; i >= 0; i--) {
        if (bomComponents[i].Level === component.Level - 1) {
          setParentComponent(bomComponents[i]);
          return;
        }
      }
    }
    
    setParentComponent(null);
  };

  // Effetto per aggiornare il componente padre quando cambia il nodo selezionato
  useEffect(() => {
    findParentComponent();
  }, [selectedNode, bomComponents]);

  // Reset completo quando cambia item
  useEffect(() => {
    // Non fare nulla se non c'è un item
    if (!item?.Id) return;
    
    // Reset completo quando cambia item
    didFetchRef.current = false;
    setSelectedBomId(null);
    setSelectedBomVersion(null);
    setAvailableVersions([]);
    setBomDescription('');
    setBomCode('');
    setBomStatus('');
    versionMapRef.current = {}; // Reset della mappa delle versioni
    
    const loadBOMVersions = async () => {
      try {
        setLoading(true);
        
        // 1. Carica TUTTE le versioni disponibili per questo item
        const versions = await getBOMVersions(item.Id);
        
        if (!versions || versions.length === 0) {
          setAvailableVersions([1]);
          
          // Carica la versione 1 come fallback
          const data = await getBOMByItemId(item.Id, 1);
          if (data && data.header) {
            setSelectedBomId(data.header.Id);
            setSelectedBomVersion(1);
            setBomDescription(data.header.Description || '');
            setBomCode(data.header.BOM || '');
            setBomStatus(data.header.BOMStatus || 'BOZZA');
            didFetchRef.current = true;
            
            // Aggiungi alla mappa delle versioni
            versionMapRef.current[1] = {
              Id: data.header.Id,
              Version: 1,
              BOM: data.header.BOM || '',
              Description: data.header.Description || ''
            };
          }
          return;
        }
        
        // 2. Salva le versioni complete con tutti i dettagli inclusi gli ID
        // Creiamo una mappa versionNumber -> versionData
        const versionMap = {};
        versions.forEach(v => {
          // Assicurati che la versione sia un numero
          const versionNum = typeof v.Version === 'number' ? v.Version : parseInt(v.Version, 10);
          versionMap[versionNum] = { ...v, Version: versionNum };
        });
        
        // Salviamo questa mappa per poterla usare dopo
        versionMapRef.current = versionMap;
        
        // 3. Estrai e ordina i numeri di versione
        // Importante: assicurati che siano numeri, non stringhe
        const versionNumbers = Object.keys(versionMap)
          .map(v => parseInt(v, 10))
          .sort((a, b) => a - b);
        
        // 4. Imposta TUTTE le versioni disponibili nell'interfaccia
        // IMPORTANTE: assicurati di passare l'array di numeri, non oggetti
        setAvailableVersions(versionNumbers);
        
        // 5. Seleziona l'ultima versione come predefinita
        const latestVersion = Math.max(...versionNumbers);
     
        // 6. Prendi i dati completi della versione più recente dalla mappa
        const latestVersionData = versionMap[latestVersion];
        
        // 7. Imposta immediatamente la versione selezionata e il suo ID
        setSelectedBomVersion(latestVersion);
        setSelectedBomId(latestVersionData.Id);
        
        // 8. Carica i dati completi per questa versione
        const data = await getBOMByItemId(item.Id, latestVersion);
        if (data && data.header) {
          setBomDescription(data.header.Description || '');
          setBomCode(data.header.BOM || '');
          setBomStatus(data.header.BOMStatus || 'BOZZA');
        }
        
        didFetchRef.current = true;
      } catch (error) {
        console.error('Errore nel caricamento delle versioni BOM:', error);
        setAvailableVersions([1]);
        setSelectedBomVersion(1);
      } finally {
        setLoading(false);
      }
    };
    
    loadBOMVersions();
  }, [item?.Id, getBOMVersions, getBOMByItemId, setSelectedBomVersion, setAvailableVersions, setSelectedBomId, setLoading]);

  // Aggiorna i campi quando cambia il BOM
  useEffect(() => {
    if (bom) {
      setBomDescription(bom.Description || '');
      setBomCode(bom.BOM || '');
      setBomStatus(bom.BOMStatus || 'BOZZA');
    }
  }, [bom]);

const handleVersionChange = async (version) => {
  try {
    const newVersion = parseInt(version, 10);
    
    if (newVersion == selectedBomVersion) {
      return;
    }

    // Previene caricamenti duplicati
    if (loadingVersionRef.current === newVersion) {
      return;
    }
    
    loadingVersionRef.current = newVersion;
    setLoading(true);
    
    // Reset degli stati per evitare dati residui
    setBomComponents([]);
    setBomRouting([]);
    
    // Trova l'ID della BOM per questa versione dalla mappa
    const versionData = versionMapRef.current[newVersion];
    if (!versionData) {
      console.error(`Dati per versione ${newVersion} non trovati nella mappa`);
      toast({
        title: "Errore",
        description: `Informazioni per la versione ${newVersion} non disponibili`,
        variant: "destructive"
      });
      setLoading(false);
      loadingVersionRef.current = null;
      return;
    }
    
    const newBomId = versionData.Id;
    
    // Imposta la versione e l'ID
    setSelectedBomVersion(newVersion);
    setSelectedBomId(newBomId);
    
    // Carica i dati per la nuova versione
    const data = await getBOMByItemId(item.Id, newVersion);
    
    if (data && data.header) {
      // Aggiorna l'header nella context
      setBom(data.header);
      
      // Aggiorna tutti i dati collegati
      setBomCode(data.header.BOM || '');
      setBomDescription(data.header.Description || '');
      setBomStatus(data.header.BOMStatus || 'BOZZA');
      
      // Se i dati contengono già i componenti, li impostiamo direttamente
      if (Array.isArray(data.components)) {
        setBomComponents(data.components);
      }
      
      if (Array.isArray(data.routing)) {
        setBomRouting(data.routing);
      }
      
      await loadBOMData('GET_BOM_FULL', { version: newVersion }, true);
      
      // Carica la struttura multilivello
      await loadBOMData('GET_BOM_MULTILEVEL', { 
        version: newVersion,
        maxLevel: 10,
        includeRouting: true,
        expandPhantoms: true
      }, true);
    } else {
      // Se non ci sono dati, resetta lo stato
      setBom(null);
      setBomComponents([]);
      setBomRouting([]);
      
      console.error(`Nessun dato trovato per versione ${newVersion}`);
      toast({
        title: "Errore",
        description: `Non sono stati trovati dati per la versione ${newVersion}`,
        variant: "destructive"
      });
    }
  } catch (error) {
    console.error('Errore durante il cambio di versione:', error);
    toast({
      title: "Errore",
      description: "Si è verificato un errore durante il cambio di versione",
      variant: "destructive"
    });
  } finally {
    setLoading(false);
    loadingVersionRef.current = null;
  }
};
  
  // Gestisci modalità modifica
  const toggleEditMode = () => {
    if (editMode) {
      // Salva le modifiche
      handleSaveChanges();
    } else {
      // Attiva modalità modifica
      setEditMode(true);
    }
  };

  const handleConfirmCancel = () => {
    // Reset completo delle modifiche pendenti
    setPendingChanges({});
    
    // Chiudi il dialog
    setShowCancelConfirmDialog(false);
    
    // Disattiva la modalità modifica
    setEditMode(false);
    
    // Ricarica i dati per ripristinare lo stato originale
    loadBOMData('GET_BOM_FULL', { version: selectedBomVersion }, true);
    
    // Reset dei campi di input ai valori originali
    if (bom) {
      setBomDescription(bom.Description || '');
      setBomCode(bom.BOM || '');
      setBomStatus(bom.BOMStatus || 'BOZZA');
    }
    
    // Ricarica tramite smart refresh per aggiornare anche i componenti
    smartRefresh();
  };

  const handleCancelEditing = () => {
    // Verifica se ci sono modifiche pendenti
    const hasPendingChanges = Object.keys(pendingChanges).length > 0;
    
    if (hasPendingChanges) {
      // Mostra dialog di conferma
      setShowCancelConfirmDialog(true);
    } else {
      // Se non ci sono modifiche, disattiva subito la modalità modifica
      setEditMode(false);
    }
  };

  // Gestisce l'apertura del dialogo per le opzioni di aggiunta componente
  const handleAddComponentOptions = () => {
    if (!selectedBomId) {
      toast({
        title: "Nessuna distinta selezionata",
        description: "Seleziona una distinta base prima di aggiungere componenti",
        variant: "destructive"
      });
      return;
    }
    
    // Apri il dialogo con le opzioni
    setShowAddDialog(true);
  };

  // Gestisce la selezione dell'opzione per l'aggiunta componente
  const handleAddOptionSelect = (option) => {
    setAddOption(option);
    setShowAddDialog(false);
    
    switch(option) {
      case "temp":
        handleAddWithTemporary();
        break;
      case "manual":
        // Prepara i dati per il dialogo manuale
        setManualData({
          code: '',
          description: '',
          nature: '22413312',
          uom: 'PZ',
          quantity: 1
        });
        setShowAddManualDialog(true);
        break;
      case "existing":
        setShowAddSelectDialog(true);
        setActiveTab("erp");
        // Carica la lista iniziale degli articoli
        handleSearchItems();
        break;
      default:
        break;
    }
  };

  // Funzione per cercare articoli
  const handleSearchItems = async () => {
    try {
      setLoading(true);
      
      if(activeTab === "erp") {
        const items = await getERPItems(searchQuery);
        setErpItems(Array.isArray(items) ? items : []);
      } else if(activeTab === "projects") {
        const items = await getAvailableItems(searchQuery);
        setProjectItems(Array.isArray(items) ? items : []);
      }
    } catch (error) {
      console.error('Errore nella ricerca articoli:', error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante la ricerca degli articoli",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Funzione per aggiungere un componente temporaneo
  const handleAddWithTemporary = async () => {
    try {
      if (!selectedBomId) {
        toast({
          title: "Errore",
          description: "Nessuna distinta selezionata",
          variant: "destructive"
        });
        return;
      }

      // Chiamata all'API per aggiungere un componente temporaneo
      const result = await addComponent(
        selectedBomId
        , {
        createTempComponent: true,
        tempComponentPrefix: "",
        componentDescription: `Nuovo componente temporaneo`,
        quantity: 1,
        nature: 22413312, // Semilavorato
        uom: 'PZ',
        importBOM: true
      });
      
      if (result.success) {
        toast({
          title: "Componente aggiunto",
          description: "Nuovo componente temporaneo aggiunto con successo",
          variant: "success"
        });
        
        // Ricarica i dati della distinta
        await smartRefresh();
      } else {
        throw new Error(result.msg || "Errore durante l'aggiunta del componente");
      }
    } catch (error) {
      console.error("Errore nell'aggiunta con codice temporaneo:", error);
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore durante l'aggiunta del componente",
        variant: "destructive"
      });
    }
  };

  // Gestisce l'aggiunta con codice manuale
  const handleAddWithManual = async () => {
    try {
      if (!manualData.code || !manualData.description) {
        toast({
          title: "Dati incompleti",
          description: "Codice e descrizione sono campi obbligatori",
          variant: "destructive"
        });
        return;
      }

      // Aggiungi il componente manuale 
      const result = await addComponent(
        selectedBomId
        , { 
        ComponentCode: manualData.code,
        ComponentDescription: manualData.description,
        ComponentType: 7798784, // Articolo
        Quantity: parseFloat(manualData.quantity) || 1,
        UoM: manualData.uom,
        Nature: parseInt(manualData.nature, 10),
        ImportBOM: true,
        createTempComponent: false
      });
      
      if (result.success) {
        toast({
          title: "Componente aggiunto",
          description: "Nuovo componente aggiunto con successo",
          variant: "success"
        });
        
        // Chiudi il dialog e resetta il form
        setShowAddManualDialog(false);
        setManualData({
          code: '',
          description: '',
          nature: '22413312',
          uom: 'PZ',
          quantity: 1
        });
        
        // Ricarica i dati della distinta
        await smartRefresh();
      } else {
        throw new Error(result.msg || "Errore durante l'aggiunta del componente");
      }
    } catch (error) {
      console.error("Errore nell'aggiunta con codice manuale:", error);
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore durante l'aggiunta del componente",
        variant: "destructive"
      });
    }
  };

  // Gestisce l'aggiunta con codice esistente
  const handleAddWithExisting = async (item) => {
    try {
      // Verifica che sia presente almeno un identificatore per l'articolo
      if (!item || (!item.Id && !item.Item)) {
        toast({
          title: "Errore",
          description: "Nessun articolo selezionato",
          variant: "destructive"
        });
        return;
      }

      const componentId = item.Id || 0;
      const componentCode = item.Item || '';
      
      console.log("Aggiunta componente:", {
        bomId: selectedBomId,
        componentId: componentId,
        componentCode: componentCode
      });
      
      // Effettua l'aggiunta del componente
      const result = await addComponent(
        selectedBomId
        , { 
        ComponentId: componentId,
        ComponentCode: componentCode,
        ComponentType: 7798784, // Articolo
        Quantity: 1,
        ImportBOM: true, // Importa anche la distinta se presente
        createTempComponent: false // Non creiamo un codice temporaneo
      });
      
      if (result.success) {
        toast({
          title: "Componente aggiunto",
          description: "Componente aggiunto con successo",
          variant: "success"
        });
        
        // Chiudi il dialog
        setShowAddSelectDialog(false);
        
        // Ricarica i dati della distinta
        await smartRefresh();
      } else {
        throw new Error(result.msg || "Errore durante l'aggiunta del componente");
      }
    } catch (error) {
      console.error("Errore nell'aggiunta con codice esistente:", error);
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore durante l'aggiunta del componente",
        variant: "destructive"
      });
    }
  };

  
  // Funzione per salvare le modifiche ai cicli
  const handleSaveCycleChanges = async (cycleChanges, bomId, componentId) => {
    try {
      // 1. Gestisci i cicli da eliminare
      if (cycleChanges.deletedCycles && cycleChanges.deletedCycles.length > 0) {
        for (const cycle of cycleChanges.deletedCycles) {
          await deleteRouting(bomId, cycle.RtgStep);
          console.log(`Eliminato ciclo RtgStep: ${cycle.RtgStep} da BOM ID: ${bomId}`);
        }
      }
      
      // 2. Gestisci i nuovi cicli da aggiungere
      if (cycleChanges.newCycles && cycleChanges.newCycles.length > 0) {
        for (const cycle of cycleChanges.newCycles) {
          // Prepara i dati per l'API
          const cycleData = {
            RtgStep: cycle.RtgStep,
            Operation: cycle.Operation || '',
            WC: cycle.WC || '',
            ProcessingTime: typeof cycle.ProcessingTime === 'string' && cycle.ProcessingTime.includes(':') 
              ? parseTimeToSeconds(cycle.ProcessingTime) 
              : (cycle.ProcessingTime || 0),
            SetupTime: typeof cycle.SetupTime === 'string' && cycle.SetupTime.includes(':') 
              ? parseTimeToSeconds(cycle.SetupTime) 
              : (cycle.SetupTime || 0),
            Notes: cycle.Notes || '',
            NoOfProcessingWorkers: cycle.NoOfProcessingWorkers || 1,
            NoOfSetupWorkers: cycle.NoOfSetupWorkers || 1
          };
          
          // Aggiungi il ciclo
          await addRouting(bomId, cycleData);
          console.log(`Aggiunto nuovo ciclo RtgStep: ${cycle.RtgStep} a BOM ID: ${bomId}`);
        }
      }
      
      // 3. Gestisci le modifiche ai cicli esistenti
      if (cycleChanges.cycleChanges && Object.keys(cycleChanges.cycleChanges).length > 0) {
        for (const rtgStep in cycleChanges.cycleChanges) {
          const changes = cycleChanges.cycleChanges[rtgStep].changes;
          const original = cycleChanges.cycleChanges[rtgStep].original;
          
          // Se ci sono modifiche
          if (Object.keys(changes).length > 0) {
            // Prepara i dati per l'API
            const updatedCycle = { ...original };
            
            // Applica le modifiche
            for (const field in changes) {
              updatedCycle[field] = changes[field];
            }
            
            // Converti i tempi da formato HH:mm:ss a secondi
            if (typeof updatedCycle.ProcessingTime === 'string' && updatedCycle.ProcessingTime.includes(':')) {
              updatedCycle.ProcessingTime = parseTimeToSeconds(updatedCycle.ProcessingTime);
            }
            if (typeof updatedCycle.SetupTime === 'string' && updatedCycle.SetupTime.includes(':')) {
              updatedCycle.SetupTime = parseTimeToSeconds(updatedCycle.SetupTime);
            }
            
            // Aggiorna il ciclo
            await updateRouting(bomId, parseInt(rtgStep, 10), updatedCycle);
            console.log(`Aggiornato ciclo RtgStep: ${rtgStep} di BOM ID: ${bomId}`);
          }
        }
      }
      
      // 4. Gestisci il riordinamento dei cicli (se necessario)
      if (cycleChanges.newOrder && cycleChanges.newOrder.length > 0) {
        // Prepara i dati per l'API
        const cyclesToReorder = cycleChanges.newOrder
          .filter(cycle => !cycle.isTemp) // Filtra solo i cicli non temporanei
          .map(cycle => ({
            RtgStep: cycle.RtgStep,
            BOMId: bomId
          }));
        
        // Riordina solo se ci sono cicli da riordinare
        if (cyclesToReorder.length > 0) {
          await reorderBOMRoutings(bomId, cyclesToReorder);
          console.log(`Riordinati ${cyclesToReorder.length} cicli di BOM ID: ${bomId}`);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Errore durante il salvataggio delle modifiche ai cicli:', error);
      throw error;
    }
  };
  
  // Funzione di utilità per convertire tempo da formato HH:mm:ss a secondi
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
  
  // Salva le modifiche
  const handleSaveChanges = async () => {
    try {
      // Imposta lo stato di caricamento
      setLoading(true);
      
      // Verifica se ci sono modifiche alla testata (codice, descrizione o stato)
      const bomHasChanged = bom.BOM !== bomCode;
      const descriptionHasChanged = bom.Description !== bomDescription;
      const statusHasChanged = bom.BOMStatus !== bomStatus;
      
      if (bom && (bomHasChanged || descriptionHasChanged || statusHasChanged)) {
        const result = await addUpdateBOM('UPDATE', {
          Id: selectedBomId,
          BOM: bomCode,
          Description: bomDescription,
          BOMStatus: bomStatus,
          Version: selectedBomVersion,
        });
        
        if (!result.success) {
          throw new Error(result.msg || "Errore nel salvataggio delle modifiche");
        }
        
        // Aggiorna la mappa delle versioni con i nuovi dati
        if (versionMapRef.current[selectedBomVersion]) {
          versionMapRef.current[selectedBomVersion].BOM = bomCode;
          versionMapRef.current[selectedBomVersion].Description = bomDescription;
        }
      }
      
      // Variabile per tracciare gli errori
      const errors = [];
      
      // Array delle promesse per attendere il completamento di tutte le operazioni
      const savePromises = [];
      
      // Salvataggio delle modifiche pendenti
      if (Object.keys(pendingChanges).length > 0) {
        // Per ogni elemento con modifiche pendenti
        for (const componentId in pendingChanges) {
          const changes = pendingChanges[componentId];
          
          // Se è una modifica di un ciclo (ha il prefisso "cycle-")
          if (componentId.startsWith('cycle-')) {
            try {
              const actualComponentId = componentId.replace('cycle-', '');
              
              // Aggiungi la promessa per salvare le modifiche ai cicli
              savePromises.push(
                handleSaveCycleChanges(changes, changes.bomId, actualComponentId)
                  .catch(err => {
                    console.error(`Errore nel salvataggio dei cicli per il componente ${actualComponentId}:`, err);
                    errors.push(`Errore nel salvataggio dei cicli: ${err.message}`);
                  })
              );
            } catch (error) {
              console.error(`Errore nel salvataggio dei cicli per ${componentId}:`, error);
              errors.push(`Errore nel salvataggio dei cicli: ${error.message}`);
            }
          } else {
            // Per le modifiche ai componenti della distinta
            try {
              // Se ci sono modifiche al componente della distinta
              if (Object.keys(changes.bomComponentChanges).length > 0) {
                // Usa il BOMId del componente padre se disponibile, altrimenti usa quello originale
                const bomIdToUse = parentComponent && parentComponent.BOMId ? 
                  parentComponent.BOMId : changes.bomId;
                
                // Aggiungi la promessa per aggiornare il componente
                savePromises.push(
                  updateComponent(
                    bomIdToUse, 
                    changes.line, 
                    changes.bomComponentChanges
                  ).catch(err => {
                    console.error(`Errore nell'aggiornamento del componente ${componentId}:`, err);
                    errors.push(`Errore nell'aggiornamento del componente: ${err.message}`);
                  })
                );
                
                console.log('Aggiornamento componente con:', {
                  bomId: bomIdToUse,
                  line: changes.line,
                  changes: changes.bomComponentChanges,
                  componentId,
                  padre: parentComponent ? `${parentComponent.ComponentId} (BOMId: ${parentComponent.BOMId})` : 'nessuno'
                });
              }
              
              // Se ci sono modifiche ai dettagli dell'articolo
              if (Object.keys(changes.itemDetailsChanges).length > 0) {
                // Aggiungi la promessa per aggiornare i dettagli dell'articolo
                savePromises.push(
                  updateItemDetails(
                    componentId, 
                    changes.itemDetailsChanges
                  ).catch(err => {
                    console.error(`Errore nell'aggiornamento dei dettagli dell'articolo ${componentId}:`, err);
                    errors.push(`Errore nell'aggiornamento dei dettagli dell'articolo: ${err.message}`);
                  })
                );
              }
            } catch (error) {
              console.error(`Errore nel salvataggio delle modifiche per ${componentId}:`, error);
              errors.push(`Errore nel salvataggio delle modifiche: ${error.message}`);
            }
          }
        }
      }
      
      // Attendi il completamento di tutte le operazioni
      await Promise.all(savePromises);
      
      // Reimposta le modifiche pendenti
      setPendingChanges({});
      
      // Disattiva modalità modifica
      setEditMode(false);
      
      // Mostra errori se presenti
      if (errors.length > 0) {
        toast({
          title: "Errori durante il salvataggio",
          description: errors.join('\n'),
          variant: "destructive"
        });
      } else {
        // Notifica l'utente del successo
        toast({
          title: "Modifiche salvate",
          description: "Le modifiche alla distinta base sono state salvate con successo",
          variant: "success"
        });
      }
      
      // Forza il ricaricamento completo dei dati
      await loadBOMData('GET_BOM_FULL', { version: selectedBomVersion }, true);
      
      // Ricarica i dati con smartRefresh per aggiornare anche i componenti
      await smartRefresh();
    } catch (error) {
      console.error('Errore nel salvataggio delle modifiche:', error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante il salvataggio delle modifiche",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Crea nuova versione
  const handleCreateVersion = async () => {
    if (!item?.Id) return;
    
    try {
      // Swal di conferma - Uso corretto della libreria swal
      const confirmed = await swal.fire({
        title: "Crea nuova versione",
        text: "Sei sicuro di voler creare una nuova versione della distinta base?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Crea",
        cancelButtonText: "Annulla",
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33"
      });

      if (!confirmed.isConfirmed) return;

      setIsCreating(true);
      
      // Calcola la nuova versione (max + 1)
      // Prima verifica che availableVersions contenga numeri, non oggetti
      const versionNumbers = Array.isArray(availableVersions) ? 
        availableVersions.map(v => 
          typeof v === 'object' && v !== null ? 
            (typeof v.Version === 'number' ? v.Version : parseInt(v.Version || '0', 10)) : 
            v
        ) : [0];
        
      const newVersion = Math.max(...versionNumbers) + 1;
      
      // Crea nuova versione usando COPY
      const result = await addUpdateBOM('COPY', {
        ItemId: item.Id,
        SourceBOMId: selectedBomId,
        Version: newVersion,
        CopyComponents: true,
        CopyRouting: true,
        Description: `${bom?.Description || ''} - Versione ${newVersion}`,
      });
      
      if (result.success) {
        toast({
          title: "Nuova versione creata",
          description: `Creata versione ${newVersion} della distinta base`,
          variant: "success"
        });
        
        // Aggiungi la nuova versione alla mappa
        versionMapRef.current[newVersion] = {
          Id: result.bomId,
          Version: newVersion,
          BOM: `${bom?.BOM || 'BOM'} v${newVersion}`,
          Description: `${bom?.Description || ''} - Versione ${newVersion}`
        };
        
        // Aggiorna elenco versioni - assicurati che siano numeri
        setAvailableVersions(prev => {
          // Se prev è un array di oggetti, estrai i numeri di versione
          const prevVersionNumbers = prev.map(v => 
            typeof v === 'object' && v !== null ? 
              (typeof v.Version === 'number' ? v.Version : parseInt(v.Version || '0', 10)) : 
              v
          );
          
          // Aggiungi la nuova versione e ordina
          return [...prevVersionNumbers, newVersion].sort((a, b) => a - b);
        });
        
        // Aggiorna la BOM tramite smart refresh
        await smartRefresh();
        
        // Imposta la versione selezionata alla nuova versione
        setSelectedBomVersion(newVersion);
        setSelectedBomId(result.bomId);
        
        // Carica i dati della nuova versione
        const data = await getBOMByItemId(item.Id, newVersion);
        if (data && data.header) {
          setBomDescription(data.header.Description || '');
          setBomCode(data.header.BOM || '');
          setBomStatus(data.header.BOMStatus || 'BOZZA');
          
          // Forza un aggiornamento completo
          await loadBOMData('GET_BOM_FULL', { version: newVersion }, true);
        }
      } else {
        throw new Error(result.msg || "Errore nella creazione della nuova versione");
      }
    } catch (error) {
      console.error('Errore nella creazione della nuova versione:', error);
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore durante la creazione della nuova versione",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };
  
  // Crea nuova distinta se non esiste
  const handleCreateNewBOM = async () => {
    if (!item?.Id) return;
    
    try {
      setIsCreating(true);
      
      // Crea nuova distinta
      const result = await addUpdateBOM('ADD', {
        ItemId: item.Id,
        Description: `Distinta per ${item.Description || item.Item}`,
        Version: 1,
        UoM: item.BaseUoM || 'PZ',
        BOMStatus: 'BOZZA'
      });
      
      if (result.success) {
        toast({
          title: "Distinta base creata",
          description: "Nuova distinta base creata con successo",
          variant: "success"
        });
        
        // Aggiungi alla mappa delle versioni
        versionMapRef.current[1] = {
          Id: result.bomId,
          Version: 1,
          BOM: `BOM_${item.Item || 'TEMP'}`,
          Description: `Distinta per ${item.Description || item.Item}`
        };
        
        await smartRefresh();
        // Seleziona la nuova distinta
        setSelectedBomId(result.bomId);
        setSelectedBomVersion(1);
        setAvailableVersions([1]);
        
        // Reset del flag per consentire il caricamento della nuova distinta
        didFetchRef.current = false;
        
        // Ricarica i dati
        await loadBOMData('GET_BOM_FULL', { version: 1 }, true);
      } else {
        throw new Error(result.msg || "Errore nella creazione della distinta base");
      }
    } catch (error) {
      console.error('Errore nella creazione della distinta base:', error);
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore durante la creazione della distinta base",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

 // Return completo del componente BOMHeader

// Se l'articolo non ha una distinta, mostra interfaccia per crearla
if (!bom && !selectedBomId) {
  return (
    <div className="bg-gray-50 p-6 border-b flex flex-col items-center justify-center">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">
        {item ? item.Item : ''} - {item ? item.Description : 'Seleziona un articolo'}
      </h2>
      
      {item && (
        <>
          <p className="text-gray-500 mb-4">
            Questo articolo non ha una distinta base associata.
          </p>
          

            <Button 
              onClick={handleCreateNewBOM} 
              disabled={isCreating || loading}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Crea Distinta Base
            </Button>
        </>
      )}
    </div>
  );
}

return (
  <div className="bg-gray-50 p-4 border-b">
    <div className="flex flex-wrap items-center gap-4">
      {/* Sezione codice e descrizione - layout coerente in entrambe le modalità */}
      <div className="flex-1 min-w-0">
        {editMode ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={bomCode}
              onChange={(e) => setBomCode(e.target.value)}
              className="text-base font-semibold w-1/3 border rounded px-2 py-1"
              placeholder="Codice BOM"
            />
            <span className="text-base font-semibold">-</span>
            <input
              type="text"
              value={bomDescription}
              onChange={(e) => setBomDescription(e.target.value)}
              className="text-base font-semibold w-2/3 border rounded px-2 py-1"
              placeholder="Descrizione BOM"
            />
          </div>
        ) : (
          <h2 className="text-base font-semibold text-gray-800 truncate" title={bom?.Description || item?.Description}>
            {bom ? bom.BOM : item?.Item} - {bom?.Description || item?.Description}
          </h2>
        )}
      </div>
          
      {/* Informazioni cliente - visibili solo in modalità visualizzazione */}
      {!editMode && item?.CustomerItemReference && (
        <Badge variant="outline" className="text-xs whitespace-nowrap">
          Rif. Cliente: {item.CustomerItemReference}
        </Badge>
      )}
          
      {/* Badge stato - in versione select quando in modalità modifica */}
      {editMode ? (
        <div className="flex items-center gap-2 whitespace-nowrap">
          <span className="text-sm text-gray-700">Stato:</span>
          <Select 
            value={bomStatus} 
            onValueChange={setBomStatus}
          >
            <SelectTrigger className="w-40 h-8">
              <SelectValue placeholder="Seleziona stato" />
            </SelectTrigger>
            <SelectContent>
              {availableStatuses.map(status => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <Badge variant={bom?.BOMStatus === 'BOZZA' ? "default" : (bom?.BOMStatus === 'IN PRODUZIONE' ? "success" : "secondary")} className="whitespace-nowrap">
          {bom?.BOMStatus || 'BOZZA'}
        </Badge>
      )}
      
      {/* Componente padre (se presente) - visibile solo in modalità visualizzazione */}
      {!editMode && parentComponent && (
        <Badge variant="outline" className="text-xs bg-blue-50 whitespace-nowrap">
          Padre: {parentComponent.ComponentItemCode || parentComponent.ComponentId}
        </Badge>
      )}
        
      {/* Selettore versione - sempre visibile */}
      <div className="flex items-center gap-2 whitespace-nowrap">
        <span className="text-sm text-gray-700">Ver:</span>
        <Select 
          value={String(selectedBomVersion || '')}
          onValueChange={handleVersionChange}
          disabled={loading || !Array.isArray(availableVersions) || availableVersions.length <= 0 || editMode}
        >
          <SelectTrigger className="w-16 h-8">
            <SelectValue placeholder="Ver." />
          </SelectTrigger>
          <SelectContent>
            {Array.isArray(availableVersions) && availableVersions.map(version => {
              const versionNumber = typeof version === 'object' && version !== null ? 
                (version.Version || '?') : version;
              
              return (
                <SelectItem 
                  key={`version-${versionNumber}`} 
                  value={String(versionNumber)}
                >
                  {versionNumber}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        
        { !editMode && (
          <Button 
            size="icon" 
            variant="outline" 
            className="h-8 w-8"
            title="Crea nuova versione"
            onClick={handleCreateVersion}
            disabled={isCreating || loading}
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>
          
      {/* Pulsanti di azione */}
        <div className="flex gap-2 ml-auto">
          {editMode ? (
              <>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handleCancelEditing} // Modificato qui: ora usa handleCancelEditing
                  className="h-8"
                >
                  <X className="h-4 w-4 mr-1" />
                  Annulla
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleSaveChanges} 
                  disabled={loading || bom?.stato_erp == '1'} 
                  className="h-8"
                >
                  <Save className="h-4 w-4 mr-1" />
                  Salva
                </Button>
              </>
            ) : (
            <>
              <Button 
                size="sm" 
                variant={isEmpty ? "primary" : "outline"}
                onClick={handleAddComponentOptions} 
                disabled={loading || bom?.stato_erp == '1'}
                className={`h-8 ${isEmpty ? "bg-green-600 hover:bg-green-700 text-white" : ""}`}
              >
                <Plus className="h-4 w-4 mr-1" />
                Aggiungi
              </Button>
              
              <Button 
                size="sm" 
                variant="outline" 
                onClick={toggleEditMode} 
                disabled={loading || bom?.stato_erp == '1'}
                className="h-8"
              >
                <Edit className="h-4 w-4 mr-1" />
                Modifica
              </Button>
            </>
          )}
        </div>
    </div>

    {/* Dialog per opzioni di "Aggiungi componente" */}
    <Dialog
      open={showAddDialog}
      onOpenChange={setShowAddDialog}
    >
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Scegli tipo di componente da aggiungere</DialogTitle>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          <div 
            className="p-3 border rounded-md cursor-pointer hover:bg-gray-50"
            onClick={() => handleAddOptionSelect("temp")}
          >
            <div className="flex items-center gap-2 font-medium text-blue-600">
              <Code className="h-4 w-4" />
              Nuovo codice temporaneo
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Crea automaticamente un nuovo codice temporaneo
            </p>
          </div>
          
          <div 
            className="p-3 border rounded-md cursor-pointer hover:bg-gray-50"
            onClick={() => handleAddOptionSelect("manual")}
          >
            <div className="flex items-center gap-2 font-medium text-green-600">
              <Plus className="h-4 w-4" />
              Nuovo codice manuale
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Inserisci manualmente il codice e la descrizione
            </p>
          </div>
          
          <div 
            className="p-3 border rounded-md cursor-pointer hover:bg-gray-50"
            onClick={() => handleAddOptionSelect("existing")}
          >
            <div className="flex items-center gap-2 font-medium text-amber-600">
              <Replace className="h-4 w-4" />
              Codice da ERP-Progetti
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Seleziona un codice esistente nel sistema
            </p>
          </div>
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => setShowAddDialog(false)}
          >
            Annulla
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Dialog per inserimento manuale di un codice */}
    <Dialog
      open={showAddManualDialog}
      onOpenChange={setShowAddManualDialog}
    >
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Inserisci nuovo componente</DialogTitle>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="addCode">Codice Articolo*</Label>
              <Input 
                id="addCode" 
                value={manualData.code}
                onChange={(e) => setManualData({...manualData, code: e.target.value})}
                placeholder="Inserisci un codice univoco"
              />
            </div>
            
            <div className="col-span-2">
              <Label htmlFor="addDescription">Descrizione*</Label>
              <Input 
                id="addDescription" 
                value={manualData.description}
                onChange={(e) => setManualData({...manualData, description: e.target.value})}
                placeholder="Descrizione del nuovo articolo"
              />
            </div>
            
            <div>
              <Label htmlFor="addNature">Natura</Label>
              <Select 
                value={manualData.nature}
                onValueChange={(value) => setManualData({...manualData, nature: value})}
              >
                <SelectTrigger id="addNature">
                  <SelectValue placeholder="Natura articolo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="22413312">Semilavorato</SelectItem>
                  <SelectItem value="22413313">Prodotto Finito</SelectItem>
                  <SelectItem value="22413314">Acquisto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="addUoM">Unità di Misura</Label>
              <Input 
                id="addUoM" 
                value={manualData.uom}
                onChange={(e) => setManualData({...manualData, uom: e.target.value})}
                placeholder="PZ"
              />
            </div>
            
            <div>
              <Label htmlFor="addQuantity">Quantità</Label>
              <Input 
                id="addQuantity" 
                type="number"
                step="0.001"
                min="0.001"
                value={manualData.quantity}
                onChange={(e) => setManualData({...manualData, quantity: parseFloat(e.target.value) || 1})}
                placeholder="1"
              />
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => setShowAddManualDialog(false)}
          >
            Annulla
          </Button>
          <Button 
            onClick={handleAddWithManual}
          >
            Aggiungi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Dialog per selezione di un codice esistente */}
    <Dialog
      open={showAddSelectDialog}
      onOpenChange={setShowAddSelectDialog}
    >
      <DialogContent className="sm:max-w-[650px]">
        <DialogHeader>
          <DialogTitle>Seleziona codice da aggiungere</DialogTitle>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="erp">Codici ERP</TabsTrigger>
              <TabsTrigger value="projects">Codici Progetti</TabsTrigger>
            </TabsList>
            
            <div className="flex gap-2 mt-4">
              <div className="flex-1">
                <Input 
                  placeholder="Cerca articolo..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchItems()}
                />
              </div>
              <Button onClick={handleSearchItems}>
                <Search className="h-4 w-4 mr-2" />
                Cerca
              </Button>
            </div>
            
            <TabsContent value="erp" className="border rounded mt-2 max-h-[300px] overflow-auto">
              {loading ? (
                <div className="p-4 text-center">
                  <p className="text-gray-500">Caricamento in corso...</p>
                </div>
              ) : erpItems.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  Nessun risultato trovato. Prova a cercare un codice.
                </div>
              ) : (
                <div className="divide-y">
                  {erpItems.map(item => (
                    <div 
                      key={item.Item} 
                      className="p-3 hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleAddWithExisting(item)}
                    >
                      <div className="font-medium">{item.Item}</div>
                      <div className="text-sm text-gray-500">{item.Description}</div>
                      <div className="text-xs text-gray-400 mt-1">
                        UoM: {item.BaseUoM || 'PZ'} | Natura: {
                          item.Nature === 22413312 ? 'Semilavorato' : 
                          item.Nature === 22413313 ? 'Prodotto Finito' : 
                          item.Nature === 22413314 ? 'Acquisto' : 'Altro'
                        }
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="projects" className="border rounded mt-2 max-h-[300px] overflow-auto">
              {loading ? (
                <div className="p-4 text-center">
                  <p className="text-gray-500">Caricamento in corso...</p>
                </div>
              ) : projectItems.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  Nessun risultato trovato. Prova a cercare un codice progetto.
                </div>
              ) : (
                <div className="divide-y">
                  {projectItems.map(item => (
                    <div 
                      key={item.Id} 
                      className="p-3 hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleAddWithExisting(item)}
                    >
                      <div className="font-medium">{item.Item}</div>
                      <div className="text-sm text-gray-500">{item.Description}</div>
                      <div className="text-xs text-gray-400 mt-1">
                        UoM: {item.BaseUoM || 'PZ'} | Natura: {
                          item.Nature === 22413312 ? 'Semilavorato' : 
                          item.Nature === 22413313 ? 'Prodotto Finito' : 
                          item.Nature === 22413314 ? 'Acquisto' : 'Altro'
                        }
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => setShowAddSelectDialog(false)}
          >
            Annulla
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <Dialog 
      open={showCancelConfirmDialog} 
      onOpenChange={setShowCancelConfirmDialog}
    >
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Annullare le modifiche?</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <p>
            Ci sono modifiche non salvate. Se annulli, tutte le modifiche andranno perse.
            Vuoi continuare?
          </p>
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => setShowCancelConfirmDialog(false)}
          >
            No, continua a modificare
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleConfirmCancel}
          >
            Sì, annulla modifiche
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
);
}

export default BOMHeader;