// BOMViewer/components/BOMDetailPanel/TabComposition.jsx
import React, { useState } from "react";
import { useBOMViewer } from "../../context/BOMViewerContext";
import ComponentDetail from "./ComponentDetail";
import CycleDetail from "./CycleDetail";
import { Button } from "@/components/ui/button";
import {
  Trash,
  Replace,
  Repeat,
  Search,
  Plus,
  ArrowDown,
  Code,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TabComposition = () => {
  const {
    selectedNode,
    editMode,
    addComponent,
    deleteComponent,
    deleteRouting,
    selectedBomId,
    getERPItems,
    loadBOMData,
    getBOMData,
    replaceWithNewComponent,
    getAvailableItems,
    replaceComponent,
    smartRefresh,
  } = useBOMViewer();

  // Stati per i dialoghi
  const [showAddComponentDialog, setShowAddComponentDialog] = useState(false);
  const [showAddRoutingDialog, setShowAddRoutingDialog] = useState(false);
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [showReplaceDialog, setShowReplaceDialog] = useState(false);
  const [replaceOption, setReplaceOption] = useState("");
  const [showManualCodeDialog, setShowManualCodeDialog] = useState(false);
  const [showSelectCodeDialog, setShowSelectCodeDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("erp");

  // NUOVI STATI per dialoghi di "Inserisci componente sotto"
  const [showAddUnderDialog, setShowAddUnderDialog] = useState(false);
  const [addUnderOption, setAddUnderOption] = useState("");
  const [showAddUnderManualDialog, setShowAddUnderManualDialog] =
    useState(false);
  const [showAddUnderSelectDialog, setShowAddUnderSelectDialog] =
    useState(false);
  // variabile di stato per il dialogo temporaneo nella sezione iniziale di definizione degli stati
  const [showTempReplaceDialog, setShowTempReplaceDialog] = useState(false);
  const [tempReplaceCopyBOM, setTempReplaceCopyBOM] = useState(false);
  // Stati per i form
  const [newComponentData, setNewComponentData] = useState({
    ComponentCode: "",
    ComponentType: "7798784", // Articolo
    Quantity: 1,
    UoM: "PZ",
    Details: "",
    Notes: "",
  });

  const [newRoutingData, setNewRoutingData] = useState({
    RtgStep: 10,
    Operation: "",
    WC: "",
    ProcessingTime: 0,
    SetupTime: 0,
    Supplier: "",
    Notes: "",
  });

  // Stati per la ricerca di articoli
  const [erpItems, setErpItems] = useState([]);
  const [projectItems, setProjectItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Stati per sostituzione con codice manuale
  const [manualCodeData, setManualCodeData] = useState({
    code: "",
    description: "",
    nature: "22413312", // Semilavorato di default
    uom: "PZ",
  });

  // NUOVO: Stato per i dati del componente da aggiungere sotto
  const [addUnderManualData, setAddUnderManualData] = useState({
    code: "",
    description: "",
    nature: "22413312",
    uom: "PZ",
    quantity: 1,
  });

  // Carica articoli dal gestionale
  const handleSearchItems = async () => {
    try {
      if (activeTab === "erp") {
        const items = await getERPItems(searchQuery);
        setErpItems(Array.isArray(items) ? items : []);
      } else if (activeTab === "projects") {
        const items = await getAvailableItems(projectId);
        setProjectItems(Array.isArray(items) ? items : []);
      }
    } catch (error) {
      console.error("Errore nella ricerca articoli:", error);
    }
  };

  // Handle aggiunta componente
  const handleAddComponent = async () => {
    if (!selectedBomId) return;
    // Se la distinta ha stato_erp = 1, non è possibile aggiungere componenti
    if (selectedNode.data.stato_erp == "1") {
      toast({
        title: "Operazione non consentita",
        description:
          "Non è possibile aggiungere componenti a una distinta Presente in Mago",
        variant: "destructive",
      });
      return;
    }

    setShowAddComponentDialog(true);
  };

  // Handle salvataggio nuovo componente
  const handleSaveNewComponent = async () => {
    try {
      await addComponent({
        ComponentCode: newComponentData.ComponentCode,
        ComponentType: parseInt(newComponentData.ComponentType, 10),
        Quantity: parseFloat(newComponentData.Quantity),
        UoM: newComponentData.UoM,
        Details: newComponentData.Details,
        Notes: newComponentData.Notes,
        ImportBOM: true,
      });

      // Chiudi dialog e resetta form
      setShowAddComponentDialog(false);
      setNewComponentData({
        ComponentCode: "",
        ComponentType: "7798784",
        Quantity: 1,
        UoM: "PZ",
        Details: "",
        Notes: "",
      });

      // Ricarica dati BOM
      await loadBOMData();
    } catch (error) {
      console.error("Errore nell'aggiunta del componente:", error);
    }
  };

  // Handle selezione articolo dal risultato ricerca
  const handleSelectItem = (item) => {
    setNewComponentData({
      ...newComponentData,
      ComponentCode: item.Item,
      Details: item.Description,
      UoM: item.BaseUoM || "PZ",
    });
  };

  // Handle eliminazione
  const handleDelete = () => {
    setShowDeleteConfirmDialog(true);
  };

  // Handle conferma eliminazione
  const handleConfirmDelete = async () => {
    try {
      if (selectedNode.type === "component") {
        console.log("Eliminazione componente:", selectedNode);

        // Controlla se il padre ha stato_erp = 1
        const parentBomId = selectedNode.data.ParentBOMId || 0;
        const parentBom = await getBOMData("GET_BOM", parentBomId);

        if (parentBom && parentBom.stato_erp == "1") {
          toast({
            title: "Operazione non consentita",
            description:
              "Non è possibile eliminare componenti di una distinta Presente in Mago",
            variant: "destructive",
          });
          setShowDeleteConfirmDialog(false);
          return;
        }

        // Usa ParentBOMId invece del BOMId del componente stesso
        await deleteComponent(
          selectedNode.data.ParentBOMId || selectedBomId,
          selectedNode.data.Line,
        );
      } else if (selectedNode.type === "cycle") {
        await deleteRouting(selectedNode.data.RtgStep);
      }

      setShowDeleteConfirmDialog(false);

      await smartRefresh();
    } catch (error) {
      console.error("Errore nell'eliminazione:", error);
    }
  };

  // Handle apertura opzioni di sostituzione
  const handleReplaceOptions = () => {
    // Controlla se il padre ha stato_erp = 1
    /*if (selectedNode.data.stato_erp == '1') {
      toast({
        title: "Operazione non consentita",
        description: "Non è possibile sostituire componenti di una distinta Presente in Mago",
        variant: "destructive"
      });
      return;
    }*/

    setShowReplaceDialog(true);
  };

  // Gestisce la selezione dell'opzione di sostituzione
  const handleReplaceOptionSelect = (option) => {
    setReplaceOption(option);
    setShowReplaceDialog(false);

    // In base all'opzione, apri il dialog corrispondente
    switch (option) {
      case "temp":
        // Invece di chiamare direttamente handleReplaceWithTemporary, mostra il dialog con le opzioni
        setTempReplaceCopyBOM(false); // Resetta il valore all'apertura
        setShowTempReplaceDialog(true);
        break;
      case "manual":
        // Imposta il valore di default per copyBOM
        setManualCodeData({
          code: "",
          description: "",
          nature: "22413312",
          uom: "PZ",
          copyBOM: true, // Aggiungi il nuovo campo
        });
        setShowManualCodeDialog(true);
        break;
      case "existing":
        setShowSelectCodeDialog(true);
        setActiveTab("erp");
        // Carica la lista iniziale degli articoli
        handleSearchItems();
        break;
      default:
        break;
    }
  };

  // NUOVA FUNZIONE: Gestisce le opzioni di "Aggiungi componente sotto"
  const handleAddComponentUnder = () => {
    // Controlla che abbiamo un componente selezionato
    if (!selectedNode || selectedNode.type !== "component") {
      toast({
        title: "Nessun componente selezionato",
        description: "Seleziona un componente prima di aggiungere sotto",
        variant: "destructive",
      });
      return;
    }

    // Controlla se il componente ha stato_erp = 1
    if (selectedNode.data.bomStato_erp == "1") {
      toast({
        title: "Operazione non consentita",
        description:
          "Non è possibile aggiungere componenti sotto a un componente Presente in Mago",
        variant: "destructive",
      });
      return;
    }

    // Apri il dialogo con le opzioni
    setShowAddUnderDialog(true);
  };

  // NUOVA FUNZIONE: Gestisce la selezione dell'opzione per "Aggiungi componente sotto"
  const handleAddUnderOptionSelect = (option) => {
    setAddUnderOption(option);
    setShowAddUnderDialog(false);

    switch (option) {
      case "temp":
        handleAddUnderWithTemporary();
        break;
      case "manual":
        // Prepara i dati per il dialogo manuale
        setAddUnderManualData({
          code: "",
          description: "",
          nature: "22413312",
          uom: "PZ",
          quantity: 1,
        });
        setShowAddUnderManualDialog(true);
        break;
      case "existing":
        setShowAddUnderSelectDialog(true);
        setActiveTab("erp");
        // Carica la lista iniziale degli articoli
        handleSearchItems();
        break;
      default:
        break;
    }
  };

  // Sostituzione con codice temporaneo automatico
  const handleReplaceWithTemporary = async () => {
    try {
      if (!selectedNode || !selectedNode.data || !selectedNode.data.Line) {
        toast({
          title: "Errore",
          description: "Nessun componente selezionato",
          variant: "destructive",
        });
        return;
      }

      // Chiudi il dialog delle opzioni
      setShowTempReplaceDialog(false);

      // Chiamata all'API per la sostituzione con componente temporaneo
      const result = await replaceWithNewComponent(
        selectedNode.data.ParentBOMId || selectedBomId,
        selectedNode.data.Line,
        {
          createTempComponent: true,
          tempComponentPrefix: "",
          Description: `Temporaneo per ${selectedNode.data.ComponentItemCode || "componente"}`,
          Quantity: selectedNode.data.Quantity || 1,
          Nature: 22413312, // Semilavorato
          BaseUoM: selectedNode.data.UoM || "PZ",
          CopyBOM: tempReplaceCopyBOM, // Passa il parametro CopyBOM
        },
      );

      if (result.success) {
        toast({
          title: "Sostituzione completata",
          description: "Componente sostituito con un nuovo codice temporaneo",
          variant: "success",
        });

        // Ricarica i dati della distinta
        await smartRefresh();
      } else {
        throw new Error(result.msg || "Errore durante la sostituzione");
      }
    } catch (error) {
      console.error("Errore nella sostituzione con codice temporaneo:", error);
      toast({
        title: "Errore",
        description:
          error.message || "Si è verificato un errore durante la sostituzione",
        variant: "destructive",
      });
    }
  };

  // Modifica alla funzione handleReplaceWithManual per includere il parametro copyBOM
  const handleReplaceWithManual = async () => {
    try {
      if (!manualCodeData.code || !manualCodeData.description) {
        toast({
          title: "Dati incompleti",
          description: "Codice e descrizione sono campi obbligatori",
          variant: "destructive",
        });
        return;
      }

      // Effettua la sostituzione
      const result = await replaceWithNewComponent(
        selectedNode.data.ParentBOMId || selectedBomId,
        selectedNode.data.Line,
        {
          Item: manualCodeData.code,
          Description: manualCodeData.description,
          Nature: parseInt(manualCodeData.nature, 10),
          BaseUoM: manualCodeData.uom,
          Quantity: selectedNode.data.Quantity || 1,
          CopyBOM: manualCodeData.copyBOM, // Passa il parametro CopyBOM
        },
      );

      if (result.success) {
        toast({
          title: "Sostituzione completata",
          description: "Componente sostituito con il nuovo codice manuale",
          variant: "success",
        });

        // Chiudi il dialog e resetta il form
        setShowManualCodeDialog(false);
        setManualCodeData({
          code: "",
          description: "",
          nature: "22413312",
          uom: "PZ",
          copyBOM: false,
        });

        // Ricarica i dati della distinta
        await smartRefresh();
      } else {
        throw new Error(result.msg || "Errore durante la sostituzione");
      }
    } catch (error) {
      console.error("Errore nella sostituzione con codice manuale:", error);
      toast({
        title: "Errore",
        description:
          error.message || "Si è verificato un errore durante la sostituzione",
        variant: "destructive",
      });
    }
  };

  // NUOVA FUNZIONE: Aggiunta sotto con codice temporaneo automatico
  const handleAddUnderWithTemporary = async () => {
    try {
      if (!selectedNode || !selectedNode.data) {
        toast({
          title: "Errore",
          description: "Nessun componente selezionato",
          variant: "destructive",
        });
        return;
      }

      // Chiamata all'API per aggiungere un componente temporaneo sotto
      // CORREZIONE: Passa bomId e componentData come parametri separati
      const result = await addComponent(selectedBomId, {
        createTempComponent: true,
        tempComponentPrefix: "",
        componentDescription: `Temporaneo sotto ${selectedNode.data.ComponentItemCode || "componente"}`,
        quantity: 1,
        nature: 22413312, // Semilavorato
        uom: selectedNode.data.UoM || "PZ",
        parentComponentId: selectedNode.data.ComponentId, // Questo è il collegamento al padre
        importBOM: true, // Importa anche la distinta se presente
      });

      if (result.success) {
        toast({
          title: "Componente aggiunto",
          description: "Nuovo componente temporaneo aggiunto con successo",
          variant: "success",
        });

        // Ricarica i dati della distinta
        await smartRefresh();
      } else {
        throw new Error(
          result.msg || "Errore durante l'aggiunta del componente",
        );
      }
    } catch (error) {
      console.error("Errore nell'aggiunta con codice temporaneo:", error);
      toast({
        title: "Errore",
        description:
          error.message ||
          "Si è verificato un errore durante l'aggiunta del componente",
        variant: "destructive",
      });
    }
  };

  // NUOVA FUNZIONE: Gestisce l'aggiunta sotto con codice manuale
  const handleAddUnderWithManual = async () => {
    try {
      if (!addUnderManualData.code || !addUnderManualData.description) {
        toast({
          title: "Dati incompleti",
          description: "Codice e descrizione sono campi obbligatori",
          variant: "destructive",
        });
        return;
      }

      // Aggiungi il componente manuale sotto al componente selezionato
      const result = await addComponent(selectedBomId, {
        ComponentCode: addUnderManualData.code, // Usiamo un codice specifico invece di createTempComponent
        ComponentDescription: addUnderManualData.description,
        ComponentType: 7798784, // Articolo
        Quantity: parseFloat(addUnderManualData.quantity) || 1,
        UoM: addUnderManualData.uom,
        Nature: parseInt(addUnderManualData.nature, 10),
        ParentComponentId: selectedNode.data.ComponentId, // Collegamento al padre
        ImportBOM: true,
        createTempComponent: false, // Non creiamo un codice temporaneo
      });

      if (result.success) {
        toast({
          title: "Componente aggiunto",
          description: "Nuovo componente aggiunto con successo",
          variant: "success",
        });

        // Chiudi il dialog e resetta il form
        setShowAddUnderManualDialog(false);
        setAddUnderManualData({
          code: "",
          description: "",
          nature: "22413312",
          uom: "PZ",
          quantity: 1,
        });

        // Ricarica i dati della distinta
        await smartRefresh();
      } else {
        throw new Error(
          result.msg || "Errore durante l'aggiunta del componente",
        );
      }
    } catch (error) {
      console.error("Errore nell'aggiunta con codice manuale:", error);
      toast({
        title: "Errore",
        description:
          error.message ||
          "Si è verificato un errore durante l'aggiunta del componente",
        variant: "destructive",
      });
    }
  };

  // NUOVA FUNZIONE: Gestisce l'aggiunta sotto con codice esistente
  const handleAddUnderWithExisting = async (item) => {
    try {
      // Verifica che sia presente almeno un identificatore per l'articolo
      if (!item || (!item.Id && !item.Item)) {
        toast({
          title: "Errore",
          description: "Nessun articolo selezionato",
          variant: "destructive",
        });
        return;
      }

      const componentId = item.Id || 0;
      const componentCode = item.Item || "";

      console.log("Aggiunta componente sotto:", {
        bomId: selectedBomId,
        parentComponentId: selectedNode.data.ComponentId,
        componentId: componentId,
        componentCode: componentCode,
      });

      // Effettua l'aggiunta sotto al componente selezionato
      const result = await addComponent(selectedBomId, {
        ComponentId: componentId,
        ComponentCode: componentCode,
        ComponentType: 7798784, // Articolo
        Quantity: 1,
        ParentComponentId: selectedNode.data.ComponentId, // Collegamento al padre
        ImportBOM: true, // Importa anche la distinta se presente
        createTempComponent: false, // Non creiamo un codice temporaneo
      });

      if (result.success) {
        toast({
          title: "Componente aggiunto",
          description: "Componente aggiunto con successo",
          variant: "success",
        });

        // Chiudi il dialog
        setShowAddUnderSelectDialog(false);

        // Ricarica i dati della distinta
        await smartRefresh();
      } else {
        throw new Error(
          result.msg || "Errore durante l'aggiunta del componente",
        );
      }
    } catch (error) {
      console.error("Errore nell'aggiunta con codice esistente:", error);
      toast({
        title: "Errore",
        description:
          error.message ||
          "Si è verificato un errore durante l'aggiunta del componente",
        variant: "destructive",
      });
    }
  };

  // Gestisce la sostituzione con codice esistente
  const handleReplaceWithExisting = async (item) => {
    try {
      // Verifica che sia presente almeno un identificatore per l'articolo
      if (!item || (!item.Id && !item.Item)) {
        toast({
          title: "Errore",
          description: "Nessun articolo selezionato",
          variant: "destructive",
        });
        return;
      }

      const newComponentId = item.Id || 0;
      const newComponentCode = item.Item || "";

      console.log("Sostituzione componente:", {
        bomId: selectedNode.data.ParentBOMId || selectedBomId,
        componentLine: selectedNode.data.Line,
        newComponentId: newComponentId,
        newComponentCode: newComponentCode,
      });

      // Effettua la sostituzione con il componente selezionato
      const result = await replaceComponent(
        selectedNode.data.ParentBOMId || selectedBomId,
        selectedNode.data.Line,
        newComponentId,
        newComponentCode,
      );

      if (result.success) {
        toast({
          title: "Sostituzione completata",
          description: "Componente sostituito con successo",
          variant: "success",
        });

        // Chiudi il dialog
        setShowSelectCodeDialog(false);

        // Ricarica i dati della distinta
        await smartRefresh();
      } else {
        throw new Error(result.msg || "Errore durante la sostituzione");
      }
    } catch (error) {
      console.error("Errore nella sostituzione con codice esistente:", error);
      toast({
        title: "Errore",
        description:
          error.message || "Si è verificato un errore durante la sostituzione",
        variant: "destructive",
      });
    }
  };

  // Se non c'è nessun nodo selezionato, mostra placeholder
  if (!selectedNode) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-10">
        <p className="text-gray-500">
          Seleziona un componente o un ciclo dalla struttura per visualizzarne i
          dettagli
        </p>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Intestazione dettagli nodo */}
      <div className="border-b pb-3 flex justify-between items-center">
        <h3 className="text-lg font-medium">
          {selectedNode.type === "component"
            ? ``
            : `Ciclo: Fase ${selectedNode.data.RtgStep} - ${selectedNode.data.OperationDescription || selectedNode.data.Operation || ""}`}
        </h3>

        {editMode && (
          <div className="flex gap-2">
            {/* Pulsanti specifici per componenti */}
            {selectedNode.type === "component" && (
              <>
                {/* Nuovo pulsante per "Aggiungi componente sotto" */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAddComponentUnder}
                  disabled={selectedNode.data.bomStato_erp == "1"}
                >
                  <ArrowDown className="h-4 w-4 mr-1" />
                  Aggiungi sotto
                </Button>

                {/* Pulsante per sostituzioni */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleReplaceOptions}
                  disabled={selectedNode.data.parentBOMStato_erp == "1"}
                >
                  <Repeat className="h-4 w-4" />
                </Button>
              </>
            )}

            {/* Pulsante elimina (sempre disponibile) */}
            <Button
              size="sm"
              variant="destructive"
              onClick={handleDelete}
              disabled={selectedNode.data.parentBOMStato_erp == "1"}
            >
              <Trash className="h-4 w-4 mr-1" />
              Elimina
            </Button>
          </div>
        )}
      </div>

      {/* Dettagli nodo */}
      <div className="mt-4">
        {selectedNode.type === "component" ? (
          <ComponentDetail component={selectedNode.data} editMode={editMode} />
        ) : (
          <CycleDetail cycle={selectedNode.data} editMode={editMode} />
        )}
      </div>

      {/* Dialog per conferma eliminazione */}
      <Dialog
        open={showDeleteConfirmDialog}
        onOpenChange={setShowDeleteConfirmDialog}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Conferma eliminazione</DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <p>
              Sei sicuro di voler eliminare{" "}
              {selectedNode.type === "component"
                ? "questo componente"
                : "questa fase"}
              ?
              {selectedNode.type === "component" &&
                selectedNode.children?.length > 0 && (
                  <span className="text-destructive font-medium block mt-2">
                    Attenzione: questo componente ha{" "}
                    {selectedNode.children.length}{" "}
                    {selectedNode.children.length === 1 ? "ciclo" : "cicli"}{" "}
                    associati che verranno eliminati.
                  </span>
                )}
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirmDialog(false)}
            >
              Annulla
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Elimina
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog per opzioni di sostituzione */}
      <Dialog open={showReplaceDialog} onOpenChange={setShowReplaceDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Scegli tipo di sostituzione</DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div
              className="p-3 border rounded-md cursor-pointer hover:bg-gray-50"
              onClick={() => handleReplaceOptionSelect("temp")}
            >
              <div className="flex items-center gap-2 font-medium text-blue-600">
                <Code className="h-4 w-4" />
                Sostituisci con nuovo codice temporaneo
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Crea automaticamente un nuovo codice temporaneo
              </p>
            </div>

            <div
              className="p-3 border rounded-md cursor-pointer hover:bg-gray-50"
              onClick={() => handleReplaceOptionSelect("manual")}
            >
              <div className="flex items-center gap-2 font-medium text-green-600">
                <Plus className="h-4 w-4" />
                Sostituisci con nuovo codice manuale
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Inserisci manualmente il codice e la descrizione
              </p>
            </div>

            <div
              className="p-3 border rounded-md cursor-pointer hover:bg-gray-50"
              onClick={() => handleReplaceOptionSelect("existing")}
            >
              <div className="flex items-center gap-2 font-medium text-amber-600">
                <Replace className="h-4 w-4" />
                Sostituisci con codice da ERP-Progetti
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Seleziona un codice esistente nel sistema
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowReplaceDialog(false)}
            >
              Annulla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* NUOVO Dialog per opzioni di "Aggiungi componente sotto" */}
      <Dialog open={showAddUnderDialog} onOpenChange={setShowAddUnderDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>
              Scegli tipo di componente da aggiungere sotto
            </DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div
              className="p-3 border rounded-md cursor-pointer hover:bg-gray-50"
              onClick={() => handleAddUnderOptionSelect("temp")}
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
              onClick={() => handleAddUnderOptionSelect("manual")}
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
              onClick={() => handleAddUnderOptionSelect("existing")}
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
              onClick={() => setShowAddUnderDialog(false)}
            >
              Annulla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog per inserimento codice manuale */}
      <Dialog
        open={showManualCodeDialog}
        onOpenChange={setShowManualCodeDialog}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Inserisci nuovo codice manuale</DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="manualCode">Codice Articolo*</Label>
                <Input
                  id="manualCode"
                  value={manualCodeData.code}
                  onChange={(e) =>
                    setManualCodeData({
                      ...manualCodeData,
                      code: e.target.value,
                    })
                  }
                  placeholder="Inserisci un codice univoco"
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="manualDescription">Descrizione*</Label>
                <Input
                  id="manualDescription"
                  value={manualCodeData.description}
                  onChange={(e) =>
                    setManualCodeData({
                      ...manualCodeData,
                      description: e.target.value,
                    })
                  }
                  placeholder="Descrizione del nuovo articolo"
                />
              </div>

              <div>
                <Label htmlFor="manualNature">Natura</Label>
                <Select
                  value={manualCodeData.nature}
                  onValueChange={(value) =>
                    setManualCodeData({ ...manualCodeData, nature: value })
                  }
                >
                  <SelectTrigger id="manualNature">
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
                <Label htmlFor="manualUoM">Unità di Misura</Label>
                <Input
                  id="manualUoM"
                  value={manualCodeData.uom}
                  onChange={(e) =>
                    setManualCodeData({
                      ...manualCodeData,
                      uom: e.target.value,
                    })
                  }
                  placeholder="PZ"
                />
              </div>

              {/* Nuova checkbox per "Copia distinta" */}
              <div className="col-span-2 flex items-center space-x-2 pt-2">
                <Checkbox
                  id="copyBOM"
                  checked={manualCodeData.copyBOM}
                  onCheckedChange={(checked) =>
                    setManualCodeData({ ...manualCodeData, copyBOM: checked })
                  }
                  className="h-4 w-4 bg-primary"
                />
                <Label htmlFor="copyBOM" className="cursor-pointer">
                  Copia distinta del componente originale
                </Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowManualCodeDialog(false)}
            >
              Annulla
            </Button>
            <Button onClick={handleReplaceWithManual}>Sostituisci</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog per conferma e opzioni di sostituzione con temporaneo */}
      <Dialog
        open={showTempReplaceDialog}
        onOpenChange={setShowTempReplaceDialog}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              Opzioni sostituzione con codice temporaneo
            </DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <p className="text-sm text-gray-500">
              Stai per sostituire il componente con un nuovo codice temporaneo.
            </p>

            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="tempCopyBOM"
                checked={tempReplaceCopyBOM}
                onCheckedChange={(checked) => setTempReplaceCopyBOM(checked)}
                className="h-4 w-4 bg-primary"
              />
              <Label htmlFor="tempCopyBOM" className="cursor-pointer">
                Copia distinta del componente originale
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowTempReplaceDialog(false)}
            >
              Annulla
            </Button>
            <Button onClick={handleReplaceWithTemporary}>Sostituisci</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* NUOVO Dialog per inserimento manuale di un codice da aggiungere sotto */}
      <Dialog
        open={showAddUnderManualDialog}
        onOpenChange={setShowAddUnderManualDialog}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              Inserisci nuovo componente da aggiungere sotto
            </DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="addUnderCode">Codice Articolo*</Label>
                <Input
                  id="addUnderCode"
                  value={addUnderManualData.code}
                  onChange={(e) =>
                    setAddUnderManualData({
                      ...addUnderManualData,
                      code: e.target.value,
                    })
                  }
                  placeholder="Inserisci un codice univoco"
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="addUnderDescription">Descrizione*</Label>
                <Input
                  id="addUnderDescription"
                  value={addUnderManualData.description}
                  onChange={(e) =>
                    setAddUnderManualData({
                      ...addUnderManualData,
                      description: e.target.value,
                    })
                  }
                  placeholder="Descrizione del nuovo articolo"
                />
              </div>

              <div>
                <Label htmlFor="addUnderNature">Natura</Label>
                <Select
                  value={addUnderManualData.nature}
                  onValueChange={(value) =>
                    setAddUnderManualData({
                      ...addUnderManualData,
                      nature: value,
                    })
                  }
                >
                  <SelectTrigger id="addUnderNature">
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
                <Label htmlFor="addUnderUoM">Unità di Misura</Label>
                <Input
                  id="addUnderUoM"
                  value={addUnderManualData.uom}
                  onChange={(e) =>
                    setAddUnderManualData({
                      ...addUnderManualData,
                      uom: e.target.value,
                    })
                  }
                  placeholder="PZ"
                />
              </div>

              <div>
                <Label htmlFor="addUnderQuantity">Quantità</Label>
                <Input
                  id="addUnderQuantity"
                  type="number"
                  step="0.001"
                  min="0.001"
                  value={addUnderManualData.quantity}
                  onChange={(e) =>
                    setAddUnderManualData({
                      ...addUnderManualData,
                      quantity: parseFloat(e.target.value) || 1,
                    })
                  }
                  placeholder="1"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddUnderManualDialog(false)}
            >
              Annulla
            </Button>
            <Button onClick={handleAddUnderWithManual}>Aggiungi sotto</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog per selezione codice esistente */}
      <Dialog
        open={showSelectCodeDialog}
        onOpenChange={setShowSelectCodeDialog}
      >
        <DialogContent className="sm:max-w-[650px]">
          <DialogHeader>
            <DialogTitle>Seleziona codice esistente</DialogTitle>
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
                    onKeyDown={(e) => e.key === "Enter" && handleSearchItems()}
                  />
                </div>
                <Button onClick={handleSearchItems}>
                  <Search className="h-4 w-4 mr-2" />
                  Cerca
                </Button>
              </div>

              <TabsContent
                value="erp"
                className="border rounded mt-2 max-h-[300px] overflow-auto"
              >
                {erpItems.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    Nessun risultato trovato. Prova a cercare un codice.
                  </div>
                ) : (
                  <div className="divide-y">
                    {erpItems.map((item) => (
                      <div
                        key={item.Item}
                        className="p-3 hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleReplaceWithExisting(item)}
                      >
                        <div className="font-medium">{item.Item}</div>
                        <div className="text-sm text-gray-500">
                          {item.Description}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          UoM: {item.BaseUoM || "PZ"} | Natura:{" "}
                          {item.Nature === 22413312
                            ? "Semilavorato"
                            : item.Nature === 22413313
                              ? "Prodotto Finito"
                              : item.Nature === 22413314
                                ? "Acquisto"
                                : "Altro"}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent
                value="projects"
                className="border rounded mt-2 max-h-[300px] overflow-auto"
              >
                {projectItems.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    Nessun risultato trovato. Prova a cercare un codice
                    progetto.
                  </div>
                ) : (
                  <div className="divide-y">
                    {projectItems.map((item) => (
                      <div
                        key={item.Id}
                        className="p-3 hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleReplaceWithExisting(item)}
                      >
                        <div className="font-medium">{item.Item}</div>
                        <div className="text-sm text-gray-500">
                          {item.Description}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          UoM: {item.BaseUoM || "PZ"} | Natura:{" "}
                          {item.Nature === 22413312
                            ? "Semilavorato"
                            : item.Nature === 22413313
                              ? "Prodotto Finito"
                              : item.Nature === 22413314
                                ? "Acquisto"
                                : "Altro"}
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
              onClick={() => setShowSelectCodeDialog(false)}
            >
              Annulla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* NUOVO Dialog per selezione di un codice esistente da aggiungere sotto */}
      <Dialog
        open={showAddUnderSelectDialog}
        onOpenChange={setShowAddUnderSelectDialog}
      >
        <DialogContent className="sm:max-w-[650px]">
          <DialogHeader>
            <DialogTitle>Seleziona codice da aggiungere sotto</DialogTitle>
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
                    onKeyDown={(e) => e.key === "Enter" && handleSearchItems()}
                  />
                </div>
                <Button onClick={handleSearchItems}>
                  <Search className="h-4 w-4 mr-2" />
                  Cerca
                </Button>
              </div>

              <TabsContent
                value="erp"
                className="border rounded mt-2 max-h-[300px] overflow-auto"
              >
                {erpItems.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    Nessun risultato trovato. Prova a cercare un codice.
                  </div>
                ) : (
                  <div className="divide-y">
                    {erpItems.map((item) => (
                      <div
                        key={item.Item}
                        className="p-3 hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleAddUnderWithExisting(item)}
                      >
                        <div className="font-medium">{item.Item}</div>
                        <div className="text-sm text-gray-500">
                          {item.Description}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          UoM: {item.BaseUoM || "PZ"} | Natura:{" "}
                          {item.Nature === 22413312
                            ? "Semilavorato"
                            : item.Nature === 22413313
                              ? "Prodotto Finito"
                              : item.Nature === 22413314
                                ? "Acquisto"
                                : "Altro"}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent
                value="projects"
                className="border rounded mt-2 max-h-[300px] overflow-auto"
              >
                {projectItems.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    Nessun risultato trovato. Prova a cercare un codice
                    progetto.
                  </div>
                ) : (
                  <div className="divide-y">
                    {projectItems.map((item) => (
                      <div
                        key={item.Id}
                        className="p-3 hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleAddUnderWithExisting(item)}
                      >
                        <div className="font-medium">{item.Item}</div>
                        <div className="text-sm text-gray-500">
                          {item.Description}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          UoM: {item.BaseUoM || "PZ"} | Natura:{" "}
                          {item.Nature === 22413312
                            ? "Semilavorato"
                            : item.Nature === 22413313
                              ? "Prodotto Finito"
                              : item.Nature === 22413314
                                ? "Acquisto"
                                : "Altro"}
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
              onClick={() => setShowAddUnderSelectDialog(false)}
            >
              Annulla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TabComposition;
