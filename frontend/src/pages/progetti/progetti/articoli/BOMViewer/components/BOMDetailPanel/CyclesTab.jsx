// CyclesTab.jsx - Versione migliorata con ordine campi corretto e filtri di ricerca
import React, { useState, useEffect, useRef } from "react";
import { useBOMViewer } from "../../context/BOMViewerContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Trash,
  Info,
  ChevronRight,
  ChevronDown,
  GripVertical,
  AlertTriangle,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/use-toast";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

// Funzione di utilità per convertire secondi in formato HH:mm:ss
const formatTimeHHMMSS = (seconds) => {
  if (seconds === null || seconds === undefined) return "00:00:00";

  const totalSeconds = parseInt(seconds, 10) || 0;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  return [
    hours.toString().padStart(2, "0"),
    minutes.toString().padStart(2, "0"),
    secs.toString().padStart(2, "0"),
  ].join(":");
};

// Funzione di utilità per convertire formato HH:mm:ss in secondi
const parseTimeToSeconds = (timeString) => {
  if (!timeString) return 0;

  const parts = timeString.split(":").map((part) => parseInt(part, 10) || 0);

  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  } else {
    return parseInt(timeString, 10) || 0;
  }
};

// Crea un ID temporaneo per i nuovi cicli
const createTempId = () =>
  `temp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

// Componente ComboBox riutilizzabile con ricerca
const SearchableCombobox = ({
  value,
  onValueChange,
  placeholder,
  items,
  displayField,
  valueField,
  descriptionField,
  disabled = false,
  className,
}) => {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  // Calcola i termini di ricerca una volta sola e normalizza
  const searchTerms = searchValue
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(term => term.length > 0);

  // Filtra gli elementi basandosi sulla ricerca
  const filteredItems = items.filter((item) => {
    if (!searchValue.trim()) return true;
    
    // Normalizza i valori per la ricerca
    const displayValue = (item[displayField] || "").toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
    const descValue = (item[descriptionField] || "").toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
    
    // Se non ci sono termini di ricerca, mostra tutto
    if (searchTerms.length === 0) return true;
    
    // Controlla se TUTTI i termini di ricerca sono presenti in almeno uno dei campi
    const matches = searchTerms.every(term => {
      // Cerca nel codice operazione (LIKE '%term%')
      if (displayValue.includes(term)) return true;
      
      // Cerca nella descrizione operazione (LIKE '%term%')
      if (descValue.includes(term)) return true;
      
      // Cerca anche in altri campi se presenti (per compatibilità)
      const allFields = Object.values(item)
        .filter(val => typeof val === 'string')
        .map(val => val.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ""))
        .join(' ');
      
      return allFields.includes(term);
    });


    return matches;
  });



  // Trova l'elemento selezionato
  const selectedItem = items.find((item) => item[valueField] === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
          disabled={disabled}
        >
          <span className="truncate">
            {selectedItem 
              ? `${selectedItem[displayField]} - ${selectedItem[descriptionField]}`
              : placeholder}
          </span>
          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder={`Cerca codice o descrizione...`} 
            value={searchValue}
            onValueChange={setSearchValue}
          />
          {filteredItems.length === 0 && searchValue.trim() && (
            <CommandEmpty>Nessun risultato trovato.</CommandEmpty>
          )}
          <CommandGroup className="max-h-[300px] overflow-auto">
            {filteredItems.map((item) => (
              <CommandItem
                key={item[valueField]}
                value={item[valueField]}
                onSelect={() => {
                  onValueChange(item[valueField]);
                  setOpen(false);
                  setSearchValue("");
                }}
              >
                <div className="flex flex-col">
                  <span className="font-medium">
                    {item[displayField]}
                    {searchValue && searchTerms.some(term => item[displayField]?.toLowerCase().includes(term)) && (
                      <span className="text-blue-600 ml-1">(codice)</span>
                    )}
                  </span>
                  <span className="text-sm text-gray-500">
                    {item[descriptionField]}
                    {searchValue && searchTerms.some(term => item[descriptionField]?.toLowerCase().includes(term)) && (
                      <span className="text-blue-600 ml-1">(descrizione)</span>
                    )}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

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
  toggleExpand,
  workCenters,
  operations,
  onToggleCheckOperation,
  checkOperationSaving = false,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: cycle.id || cycle.RtgStep });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
  };

  const isExpanded = expanded.includes(cycle.id || cycle.RtgStep);
  const isReadOnly = isInMago;
  const isOperationChecked =
    parseInt(cycle.CheckOperation, 10) === 1 || cycle.CheckOperation === true;

  // Gestione del cambio operazione con precompilazione del CdL
  const handleOperationChange = (operationCode) => {
    handleCycleFieldChange(cycle.id || cycle.RtgStep, "Operation", operationCode);
    
    // Trova l'operazione selezionata
    const selectedOperation = operations.find(op => op.Operation === operationCode);
    
    // Se l'operazione ha un CdL predefinito, precompilalo
    if (selectedOperation && selectedOperation.WC) {
      handleCycleFieldChange(cycle.id || cycle.RtgStep, "WC", selectedOperation.WC);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white border rounded-lg overflow-hidden shadow-sm mb-3 ${
        isDragging ? "border-blue-500 ring-2 ring-blue-200" : ""
      }`}
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
            {cycle.WC}
            {cycle.WorkCenterDescription
              ? ` - ${cycle.WorkCenterDescription}`
              : ""}
          </div>
          <div className="mt-1 flex flex-wrap gap-2">
            <Badge
              className={
                isOperationChecked
                  ? "bg-green-100 text-green-700 border border-green-200"
                  : "bg-amber-100 text-amber-800 border border-amber-200"
              }
            >
              {isOperationChecked ? "Operazione controllata" : "Da verificare"}
            </Badge>

            {isInMago && (
              <Badge className="bg-blue-100 text-blue-700 border border-blue-200">
                ERP
              </Badge>
            )}
          </div>

          {isInMago && (
            <p className="text-xs text-blue-600 mt-1">
              Ciclo sincronizzato da ERP
            </p>
          )}

          {onToggleCheckOperation && (
            <div className="mt-2 flex items-center gap-2 text-xs text-gray-600">
              <Checkbox
                checked={isOperationChecked}
                onCheckedChange={(checked) =>
                  onToggleCheckOperation(cycle, checked === true)
                }
                disabled={!onToggleCheckOperation || cycle.isNew || checkOperationSaving}
                className="h-4 w-4 data-[state=checked]:bg-green-500 data-[state=checked]:text-white"
              />
              <span>
                Operazione controllata
                {cycle.isNew && " (salva la fase per attivare)"}
                {checkOperationSaving && " (salvataggio...)"}
              </span>
            </div>
          )}
        </div>

        {!isEditMode && (
          <div className="flex-shrink-0 flex ml-4 space-x-4">
            <div className="text-right">
              <div className="text-xs text-gray-500">Tempo Esec.</div>
              <div className="font-medium">
                {formatTimeHHMMSS(cycle.ProcessingTime)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500">Setup</div>
              <div className="font-medium">
                {formatTimeHHMMSS(cycle.SetupTime)}
              </div>
            </div>
          </div>
        )}

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-gray-500 ml-2"
          onClick={() => toggleExpand(cycle.id || cycle.RtgStep)}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
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

      {/* Contenuto espanso */}
      {isExpanded &&
        (isEditMode && !isReadOnly ? (
          <div className="p-4 space-y-4">
            {/* Prima riga: Numero Fase e Operazione */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor={`rtg-step-${cycle.id || cycle.RtgStep}`} className="text-sm font-medium mb-1 block">
                  Numero Fase
                </label>
                <Input
                  id={`rtg-step-${cycle.id || cycle.RtgStep}`}
                  name={`rtg-step-${cycle.id || cycle.RtgStep}`}
                  value={cycle.RtgStep || ""}
                  onChange={(e) =>
                    handleCycleFieldChange(
                      cycle.id || cycle.RtgStep,
                      "RtgStep",
                      parseInt(e.target.value) || 0
                    )
                  }
                  className="h-9"
                  type="number"
                  min="1"
                  step="10"
                  autoComplete="off"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Operazione
                </label>
                <SearchableCombobox
                  value={cycle.Operation || ""}
                  onValueChange={handleOperationChange}
                  placeholder="Seleziona operazione"
                  items={operations}
                  displayField="Operation"
                  valueField="Operation"
                  descriptionField="Description"
                />
              </div>
            </div>

            {/* Seconda riga: Centro di Lavoro */}
            <div>
              <label className="text-sm font-medium mb-1 block">
                Centro di Lavoro
              </label>
              <SearchableCombobox
                value={cycle.WC || ""}
                onValueChange={(value) =>
                  handleCycleFieldChange(
                    cycle.id || cycle.RtgStep,
                    "WC",
                    value
                  )
                }
                placeholder="Seleziona centro di lavoro"
                items={workCenters}
                displayField="WC"
                valueField="WC"
                descriptionField="Description"
              />
            </div>

            {/* Terza riga: Note */}
            <div>
              <label className="text-sm font-medium mb-1 block">Note</label>
              <Textarea
                value={cycle.Notes || ""}
                onChange={(e) =>
                  handleCycleFieldChange(
                    cycle.id || cycle.RtgStep,
                    "Notes",
                    e.target.value
                  )
                }
                className="min-h-[80px] resize-vertical"
                rows={3}
                placeholder="Inserisci note per questa fase..."
              />
            </div>

            {/* Quarta riga: Tempi */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Tempo Esecuzione (HH:mm:ss)
                </label>
                <Input
                  value={
                    typeof cycle.ProcessingTime === "string" &&
                    cycle.ProcessingTime.includes(":")
                      ? cycle.ProcessingTime
                      : formatTimeHHMMSS(cycle.ProcessingTime)
                  }
                  onChange={(e) =>
                    handleCycleFieldChange(
                      cycle.id || cycle.RtgStep,
                      "ProcessingTime",
                      e.target.value
                    )
                  }
                  className="h-9"
                  placeholder="00:00:00"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Tempo Setup (HH:mm:ss)
                </label>
                <Input
                  value={
                    typeof cycle.SetupTime === "string" &&
                    cycle.SetupTime.includes(":")
                      ? cycle.SetupTime
                      : formatTimeHHMMSS(cycle.SetupTime)
                  }
                  onChange={(e) =>
                    handleCycleFieldChange(
                      cycle.id || cycle.RtgStep,
                      "SetupTime",
                      e.target.value
                    )
                  }
                  className="h-9"
                  placeholder="00:00:00"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Checkbox
                id={`check-${cycle.id || cycle.RtgStep}`}
                checked={isOperationChecked}
                onCheckedChange={(checked) =>
                  onToggleCheckOperation &&
                  onToggleCheckOperation(cycle, checked === true)
                }
                disabled={cycle.isNew || checkOperationSaving}
                className="data-[state=checked]:bg-green-500 data-[state=checked]:text-white"
              />
              <label
                htmlFor={`check-${cycle.id || cycle.RtgStep}`}
                className="text-sm text-gray-700 select-none cursor-pointer"
              >
                Operazione controllata (richiesto per export ERP)
                {cycle.isNew && " - salva prima la fase"}
                {checkOperationSaving && " - salvataggio in corso"}
              </label>
            </div>
          </div>
        ) : (
          // Modalità visualizzazione
          <div className="p-4 text-sm text-gray-600 border-t">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="font-medium text-gray-700 mb-1">
                  Centro di Lavoro:
                </div>
                <div className="pl-2">
                  {cycle.WC} - {cycle.WorkCenterDescription}
                </div>

                <div className="font-medium text-gray-700 mb-1 mt-3">
                  Operazione:
                </div>
                <div className="pl-2">
                  {cycle.Operation} - {cycle.OperationDescription}
                </div>

                <div className="font-medium text-gray-700 mb-1 mt-3">
                  Controllo Operazione:
                </div>
                <div className="pl-2 flex items-center gap-2">
                  <Badge
                    className={
                      isOperationChecked
                        ? "bg-green-100 text-green-700 border border-green-200"
                        : "bg-amber-100 text-amber-800 border border-amber-200"
                    }
                  >
                    {isOperationChecked ? "Verificata" : "Non verificata"}
                  </Badge>
                  {!isOperationChecked && (
                    <span className="text-xs text-amber-700">
                      Necessaria per export ERP
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <div className="font-medium text-gray-700 mb-1">
                      Tempo Esecuzione:
                    </div>
                    <div className="pl-2">
                      {formatTimeHHMMSS(cycle.ProcessingTime)}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-700 mb-1">
                      Tempo Setup:
                    </div>
                    <div className="pl-2">
                      {formatTimeHHMMSS(cycle.SetupTime)}
                    </div>
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
                <span>
                  Questo ciclo è presente in ERP (Mago) e non può essere
                  modificato.
                </span>
              </div>
            )}
          </div>
        ))}
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
    setPendingChanges,
    updateRoutingCheckOperation,
  } = useBOMViewer();

  const [draftCycles, setDraftCycles] = useState([]);
  const [originalCycles, setOriginalCycles] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedCycles, setExpandedCycles] = useState([]);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [checkOperationSaving, setCheckOperationSaving] = useState({});

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const dataLoadedRef = useRef(false);

  // Carica i dati master solo una volta al mount
  useEffect(() => {
    if (!dataLoadedRef.current) {
      loadMasterData();
      dataLoadedRef.current = true;
    }
  }, [loadMasterData]);

  // Aggiorna i cicli dal contesto quando cambia il nodo selezionato
  useEffect(() => {
    if (
      !selectedNode ||
      selectedNode.type !== "component" ||
      !Array.isArray(bomRouting)
    ) {
      setDraftCycles([]);
      setOriginalCycles([]);
      return;
    }

    const componentBomId = selectedNode.data.BOMId;
    const ComponentNature =
      selectedNode.data.ComponentNature || selectedNode.data.Nature;

    const filteredCycles = bomRouting.filter(
      (cycle) =>
        cycle.BOMId &&
        cycle.BOMId == componentBomId &&
        ComponentNature != "22413314" &&
        ComponentNature != 22413314
    );

    const sortedCycles = [...filteredCycles].sort(
      (a, b) => (parseInt(a.RtgStep) || 0) - (parseInt(b.RtgStep) || 0)
    );

    const cyclesToStore = JSON.parse(JSON.stringify(sortedCycles));
    setOriginalCycles(cyclesToStore);
    setDraftCycles(cyclesToStore);

    if (selectedNode.data.ComponentId) {
      setPendingChanges((prev) => {
        const newChanges = { ...prev };
        if (newChanges[`cycle-${selectedNode.data.ComponentId}`]) {
          delete newChanges[`cycle-${selectedNode.data.ComponentId}`];
        }
        return newChanges;
      });
    }

    setHasChanges(false);
  }, [selectedNode, bomRouting, setPendingChanges]);

  const toggleCycleExpansion = (cycleId) => {
    setExpandedCycles((prev) => {
      if (prev.includes(cycleId)) {
        return prev.filter((id) => id !== cycleId);
      } else {
        return [...prev, cycleId];
      }
    });
  };

  const handleCycleFieldChange = (rtgStep, field, value) => {
    setDraftCycles((prevDraft) =>
      prevDraft.map((cycle) =>
        cycle.RtgStep === rtgStep || cycle.id === rtgStep
          ? { ...cycle, [field]: value }
          : cycle
      )
    );

    if (field === "CheckOperation") {
      return;
    }

    const cycle = draftCycles.find(
      (c) => c.RtgStep === rtgStep || c.id === rtgStep
    );
    if (!cycle) return;

    setHasChanges(true);

    if (
      editMode &&
      selectedNode &&
      selectedNode.data &&
      selectedNode.data.ComponentId
    ) {
      const cycleId = `cycle-${selectedNode.data.ComponentId}`;

      setPendingChanges((prev) => {
        if (!prev[cycleId]) {
          prev[cycleId] = {
            cycleChanges: {},
            bomId: selectedNode.data.BOMId,
            componentId: selectedNode.data.ComponentId,
          };
        }

        if (!prev[cycleId].cycleChanges[rtgStep]) {
          prev[cycleId].cycleChanges[rtgStep] = {
            original: { ...cycle },
            changes: {},
          };
        }

        prev[cycleId].cycleChanges[rtgStep].changes[field] = value;

        return { ...prev };
      });
    }
  };

  const handleToggleCheckOperation = (rtgStep, value) => {
    const normalizedValue = value ? 1 : 0;
    handleCycleFieldChange(rtgStep, "CheckOperation", normalizedValue);
  };

  const handleAddCycle = () => {
    const lastStep =
      draftCycles.length > 0
        ? Math.max(...draftCycles.map((c) => parseInt(c.RtgStep) || 0))
        : 0;
    const newStep = lastStep + 10;

    const newCycle = {
      id: createTempId(),
      RtgStep: newStep,
      BOMId: selectedNode.data.BOMId,
      Operation: "",
      WC: "",
      ProcessingTime: 0,
      SetupTime: 0,
      NoOfProcessingWorkers: 1,
      NoOfSetupWorkers: 1,
      Notes: "",
      isNew: true,
      CheckOperation: 0,
    };
    
    // FIX: Se BOMId = 0, aggiungi ItemId o ComponentId per creare automaticamente la BOM
    if ((!selectedNode.data.BOMId || selectedNode.data.BOMId === 0 || selectedNode.data.BOMId === "0") && selectedNode.data.ComponentId) {
      newCycle.ComponentId = selectedNode.data.ComponentId;
      newCycle.ItemId = selectedNode.data.ItemId || selectedNode.data.ComponentId;
    }

    setDraftCycles((prevDraft) => [...prevDraft, newCycle]);
    setHasChanges(true);

    if (selectedNode && selectedNode.data && selectedNode.data.ComponentId) {
      const cycleId = `cycle-${selectedNode.data.ComponentId}`;

      setPendingChanges((prev) => {
        if (!prev[cycleId]) {
          prev[cycleId] = {
            cycleChanges: {},
            bomId: selectedNode.data.BOMId,
            componentId: selectedNode.data.ComponentId,
            newCycles: [],
          };
        }

        if (!prev[cycleId].newCycles) {
          prev[cycleId].newCycles = [];
        }

        prev[cycleId].newCycles.push(newCycle);

        return { ...prev };
      });
    }

    setExpandedCycles((prev) => [...prev, newCycle.id]);
  };

  const handleDeleteCycle = async (cycleId) => {
    try {
      const cycle = draftCycles.find((c) => (c.id || c.RtgStep) === cycleId);
      if (!cycle) return;

      setDraftCycles((prevDraft) =>
        prevDraft.filter((cycle) => (cycle.id || cycle.RtgStep) !== cycleId)
      );

      setHasChanges(true);

      if (selectedNode && selectedNode.data && selectedNode.data.ComponentId) {
        const componentCycleId = `cycle-${selectedNode.data.ComponentId}`;

        setPendingChanges((prev) => {
          if (!prev[componentCycleId]) {
            prev[componentCycleId] = {
              cycleChanges: {},
              bomId: selectedNode.data.BOMId,
              componentId: selectedNode.data.ComponentId,
              deletedCycles: [],
            };
          }

          if (!prev[componentCycleId].deletedCycles) {
            prev[componentCycleId].deletedCycles = [];
          }

          if (
            cycle.id &&
            cycle.id.startsWith("temp-") &&
            prev[componentCycleId].newCycles
          ) {
            prev[componentCycleId].newCycles = prev[
              componentCycleId
            ].newCycles.filter((newCycle) => newCycle.id !== cycle.id);
          } else {
            prev[componentCycleId].deletedCycles.push(cycle);
          }

          return { ...prev };
        });
      }

      setExpandedCycles((prev) => prev.filter((id) => id !== cycleId));
    } catch (error) {
      console.error("Errore nell'eliminazione del ciclo:", error);
      toast({
        title: "Errore",
        description: "Errore durante l'operazione di eliminazione",
        variant: "destructive",
      });
    }
  };

  const handleCheckOperationToggle = async (cycle, checked) => {
    if (!cycle || !cycle.RtgStep) return;

    const rtgStep = cycle.RtgStep;
    const bomId = cycle.BOMId || selectedNode?.data?.BOMId;
    if (!bomId || cycle.isNew) {
      return;
    }

    const previousValue =
      parseInt(cycle.CheckOperation, 10) === 1 || cycle.CheckOperation === true
        ? 1
        : 0;
    const nextValue = checked ? 1 : 0;

    setDraftCycles((prevDraft) =>
      prevDraft.map((c) =>
        c.RtgStep === rtgStep || c.id === rtgStep
          ? { ...c, CheckOperation: nextValue }
          : c,
      ),
    );

    setCheckOperationSaving((prev) => ({ ...prev, [rtgStep]: true }));

    try {
      // FIX: Se BOMId = 0, passa anche ItemId o ComponentId
      const itemId = selectedNode?.data?.ItemId || selectedNode?.data?.ComponentId;
      const componentId = selectedNode?.data?.ComponentId;
      await updateRoutingCheckOperation(bomId, rtgStep, nextValue, itemId, componentId);
      toast({
        title: "Operazione aggiornata",
        description: `Fase ${rtgStep} ${
          nextValue === 1 ? "verificata" : "marcata da verificare"
        }`,
        variant: nextValue === 1 ? "success" : "default",
      });
    } catch (error) {
      console.error("Errore aggiornamento check operazione:", error);
      setDraftCycles((prevDraft) =>
        prevDraft.map((c) =>
          c.RtgStep === rtgStep || c.id === rtgStep
            ? { ...c, CheckOperation: previousValue }
            : c,
        ),
      );
      toast({
        title: "Errore",
        description:
          "Impossibile aggiornare il flag Operazione controllata. Riprova.",
        variant: "destructive",
      });
    } finally {
      setCheckOperationSaving((prev) => {
        const next = { ...prev };
        delete next[rtgStep];
        return next;
      });
    }
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = draftCycles.findIndex(
        (item) => (item.id || item.RtgStep) === active.id
      );
      const newIndex = draftCycles.findIndex(
        (item) => (item.id || item.RtgStep) === over.id
      );

      const reorderedCycles = arrayMove(draftCycles, oldIndex, newIndex);
      setDraftCycles(reorderedCycles);

      setHasChanges(true);

      if (selectedNode && selectedNode.data && selectedNode.data.ComponentId) {
        const cycleId = `cycle-${selectedNode.data.ComponentId}`;

        setPendingChanges((prev) => {
          if (!prev[cycleId]) {
            prev[cycleId] = {
              cycleChanges: {},
              bomId: selectedNode.data.BOMId,
              componentId: selectedNode.data.ComponentId,
            };
          }

          prev[cycleId].newOrder = reorderedCycles.map((cycle) => ({
            RtgStep: cycle.RtgStep,
            id: cycle.id,
            isTemp: cycle.id && cycle.id.startsWith("temp-"),
          }));

          return { ...prev };
        });
      }
    }
  };

  const handleCancelEditing = () => {
    if (hasChanges) {
      setShowCancelConfirm(true);
    } else {
      resetAllChanges();
    }
  };

  const confirmCancelEditing = () => {
    resetAllChanges();
    setShowCancelConfirm(false);
  };

  const resetAllChanges = () => {
    setDraftCycles(JSON.parse(JSON.stringify(originalCycles)));

    if (selectedNode && selectedNode.data && selectedNode.data.ComponentId) {
      const cycleId = `cycle-${selectedNode.data.ComponentId}`;

      setPendingChanges((prev) => {
        const newChanges = { ...prev };
        if (newChanges[cycleId]) {
          delete newChanges[cycleId];
        }
        return newChanges;
      });
    }

    setHasChanges(false);
  };

  const isComponentInMago =
    selectedNode &&
    selectedNode.data &&
    (selectedNode.data.stato_erp === "1" || selectedNode.data.stato_erp === 1);

  if (!selectedNode || selectedNode.type !== "component") {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>
          Seleziona un componente per visualizzare i suoi cicli di produzione
        </p>
      </div>
    );
  }

  const isAcquistoComponent =
    selectedNode.data.ComponentNature === 22413314 ||
    selectedNode.data.ComponentNature === "22413314" ||
    selectedNode.data.Nature === 22413314 ||
    selectedNode.data.Nature === "22413314";

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
          Cicli di Produzione:{" "}
          {selectedNode.data.ComponentItemCode ||
            selectedNode.data.ComponentCode}
        </h3>

        {!isComponentInMago && (
          <div className="flex gap-2">
            {editMode && (
              <Button variant="outline" onClick={handleCancelEditing}>
                Annulla
              </Button>
            )}
          </div>
        )}

        {isComponentInMago && (
          <div className="flex items-center">
            <Badge className="bg-blue-100 text-blue-700 mr-2">ERP</Badge>
            <span className="text-sm text-blue-700">
              Componente presente in Mago
            </span>
          </div>
        )}
      </div>

      {isComponentInMago && (
        <Alert className="mb-4 border-blue-200 bg-blue-50 text-blue-800">
          <AlertTriangle className="h-4 w-4 mr-2" />
          <AlertDescription>
            Questo componente è presente in ERP (Mago). I cicli non possono
            essere modificati.
          </AlertDescription>
        </Alert>
      )}

      {draftCycles.length === 0 ? (
        <div className="p-6 text-center">
          <p className="text-gray-500 mb-4">
            Nessun ciclo definito per questo componente
          </p>

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
                  items={draftCycles.map((cycle) => cycle.id || cycle.RtgStep)}
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
                      workCenters={workCenters}
                    operations={operations}
                  onToggleCheckOperation={handleCheckOperationToggle}
                  checkOperationSaving={!!checkOperationSaving[cycle.RtgStep]}
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
                  workCenters={workCenters}
                  operations={operations}
                onToggleCheckOperation={handleCheckOperationToggle}
                checkOperationSaving={!!checkOperationSaving[cycle.RtgStep]}
                />
              ))
            )}
          </div>

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

      <Dialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Annullare le modifiche?</DialogTitle>
            <DialogDescription>
              Ci sono modifiche non salvate. Se annulli, tutte le modifiche
              andranno perse. Vuoi continuare?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowCancelConfirm(false)}
            >
              No, continua a modificare
            </Button>
            <Button variant="destructive" onClick={confirmCancelEditing}>
              Sì, annulla modifiche
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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