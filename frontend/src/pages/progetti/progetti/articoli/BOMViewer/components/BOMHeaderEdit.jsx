// BOMHeaderEdit.jsx - Componente per gestire la modalità di modifica dell'header BOM
import React, { useState, useEffect } from "react";
import { useBOMViewer } from "../context/BOMViewerContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Save, X, AlertCircle } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

const BOMHeaderEdit = () => {
  const {
    bom,
    editMode,
    setEditMode,
    loading,
    setLoading,
    pendingChanges,
    setPendingChanges,
    addUpdateBOM,
    bomComponents,
    updateItemDetails,
    smartRefresh,
    reorderBOMRoutings,
  } = useBOMViewer();

  const [bomData, setBomData] = useState({
    code: "",
    description: "",
    status: "BOZZA",
  });

  const [showCancelConfirmDialog, setShowCancelConfirmDialog] = useState(false);
  const [savingProgress, setSavingProgress] = useState(null);

  // Stati disponibili per la distinta
  const availableStatuses = [
    { value: "BOZZA", label: "Bozza" },
    { value: "IN PRODUZIONE", label: "In Produzione" },
    { value: "ANNULLATO", label: "Annullato" },
    { value: "SOSPESO", label: "Sospeso" },
  ];

  // Inizializza i dati quando cambia il BOM
  useEffect(() => {
    if (bom) {
      setBomData({
        code: bom.BOM || "",
        description: bom.Description || "",
        status: bom.BOMStatus || "BOZZA",
      });
    }
  }, [bom]);

  // Gestisce il cambio dei dati dell'header
  const handleHeaderChange = (field, value) => {
    setBomData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Traccia le modifiche dell'header
    setPendingChanges((prev) => ({
      ...prev,
      header: {
        ...prev.header,
        [field]: value,
      },
    }));
  };

  // Funzione per controllare se ci sono modifiche
  const hasChanges = () => {
    return Object.keys(pendingChanges).length > 0;
  };

  // Funzione per salvare tutte le modifiche
  const handleSaveAllChanges = async () => {
    try {
      setLoading(true);
      setSavingProgress("Preparazione salvataggio...");

      const errors = [];
      const successCount = {
        header: 0,
        components: 0,
        items: 0,
        cycles: 0,
      };

      // Prepara tutte le operazioni da eseguire
      const operations = [];

      // 1. Prepara le modifiche dell'header
      if (pendingChanges.header) {
        operations.push({
          type: 'header',
          execute: async () => {
            const result = await addUpdateBOM("UPDATE", {
              Id: bom.Id,
              BOM: pendingChanges.header.code || bomData.code,
              Description: pendingChanges.header.description || bomData.description,
              BOMStatus: pendingChanges.header.status || bomData.status,
              Version: bom.Version,
            });

            if (result.success) {
              successCount.header = 1;
            } else {
              throw new Error(result.msg || "Errore nell'aggiornamento dell'header");
            }
          }
        });
      }

      // 2. Prepara le modifiche ai componenti e agli articoli
      for (const componentId in pendingChanges) {
        if (componentId === "header") continue;

        const changes = pendingChanges[componentId];

        // Gestisci i cicli
        if (componentId.startsWith("cycle-")) {
          operations.push({
            type: 'cycles',
            execute: async () => {
              await handleSaveCycleChanges(
                changes,
                changes.bomId,
                componentId.replace("cycle-", "")
              );
              successCount.cycles++;
            }
          });
          continue;
        }

        // Gestisci le modifiche ai componenti della distinta
        if (changes.bomComponentChanges && Object.keys(changes.bomComponentChanges).length > 0) {
          operations.push({
            type: 'components',
            execute: async () => {
              // Trova il componente padre se necessario
              const component = bomComponents.find(c => c.ComponentId === parseInt(componentId));
              const parentBOMId = component?.ParentBOMId || changes.bomId || bom.Id;

              const result = await addUpdateBOM("UPDATE_COMPONENT", {
                Id: parentBOMId,
                Line: changes.line,
                ...changes.bomComponentChanges
              });

              if (result.success) {
                successCount.components++;
              } else {
                throw new Error(result.msg || `Errore nell'aggiornamento del componente ${componentId}`);
              }
            }
          });
        }

        // Gestisci le modifiche ai dettagli dell'articolo
        if (changes.itemDetailsChanges && Object.keys(changes.itemDetailsChanges).length > 0) {
          operations.push({
            type: 'items',
            execute: async () => {
              const result = await updateItemDetails(
                componentId,
                changes.itemDetailsChanges
              );

              if (result) {
                successCount.items++;
              } else {
                throw new Error(`Errore nell'aggiornamento dell'articolo ${componentId}`);
              }
            }
          });
        }
      }

      // Esegui tutte le operazioni
      setSavingProgress(`Salvataggio in corso: 0/${operations.length} operazioni completate`);
      
      let completedOperations = 0;
      
      for (const operation of operations) {
        try {
          await operation.execute();
          completedOperations++;
          setSavingProgress(`Salvataggio in corso: ${completedOperations}/${operations.length} operazioni completate`);
        } catch (error) {
          errors.push(`Errore ${operation.type}: ${error.message}`);
          console.error(`Errore durante l'operazione ${operation.type}:`, error);
        }
      }

      // 3. Resetta le modifiche pendenti
      setPendingChanges({});

      // 4. Mostra il risultato
      if (errors.length === 0) {
        toast({
          title: "Salvataggio completato",
          description: `Salvati con successo: ${successCount.header} header, ${successCount.components} componenti, ${successCount.items} articoli, ${successCount.cycles} cicli`,
          variant: "success",
        });
      } else {
        toast({
          title: "Salvataggio parziale",
          description: `Alcune modifiche non sono state salvate:\n${errors.join("\n")}`,
          variant: "warning",
        });
      }

      // 5. Disattiva modalità modifica
      setEditMode(false);

      // 6. Ricarica i dati SOLO alla fine con smartRefresh
      setSavingProgress("Aggiornamento visualizzazione...");
      await smartRefresh();

    } catch (error) {
      console.error("Errore nel salvataggio:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante il salvataggio",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setSavingProgress(null);
    }
  };

  // Funzione helper per salvare le modifiche ai cicli
  const handleSaveCycleChanges = async (cycleChanges, bomId, componentId) => {
    // Gestisci eliminazioni
    if (cycleChanges.deletedCycles && cycleChanges.deletedCycles.length > 0) {
      for (const cycle of cycleChanges.deletedCycles) {
        await addUpdateBOM("DELETE_ROUTING", {
          Id: bomId,
          RtgStep: cycle.RtgStep
        });
      }
    }

    // Gestisci aggiunte
    if (cycleChanges.newCycles && cycleChanges.newCycles.length > 0) {
      for (const cycle of cycleChanges.newCycles) {
        const cycleData = {
          Id: bomId,
          ...cycle,
          ProcessingTime: parseTimeToSeconds(cycle.ProcessingTime),
          SetupTime: parseTimeToSeconds(cycle.SetupTime),
        };
        await addUpdateBOM("ADD_ROUTING", cycleData);
      }
    }

    // Gestisci modifiche
    if (cycleChanges.cycleChanges && Object.keys(cycleChanges.cycleChanges).length > 0) {
      for (const rtgStep in cycleChanges.cycleChanges) {
        const changes = cycleChanges.cycleChanges[rtgStep].changes;
        const original = cycleChanges.cycleChanges[rtgStep].original;

        if (Object.keys(changes).length > 0) {
          const updatedCycle = { ...original, ...changes };
          
          // Converti i tempi
          if (typeof updatedCycle.ProcessingTime === "string" && updatedCycle.ProcessingTime.includes(":")) {
            updatedCycle.ProcessingTime = parseTimeToSeconds(updatedCycle.ProcessingTime);
          }
          if (typeof updatedCycle.SetupTime === "string" && updatedCycle.SetupTime.includes(":")) {
            updatedCycle.SetupTime = parseTimeToSeconds(updatedCycle.SetupTime);
          }

          await addUpdateBOM("UPDATE_ROUTING", {
            Id: bomId,
            RtgStep: parseInt(rtgStep, 10),
            ...updatedCycle
          });
        }
      }
    }

    // Gestisci riordinamento
    if (cycleChanges.newOrder && cycleChanges.newOrder.length > 0) {
      const cyclesToReorder = cycleChanges.newOrder
        .filter((cycle) => !cycle.isTemp)
        .map((cycle) => ({
          RtgStep: cycle.RtgStep,
          BOMId: bomId,
        }));

      if (cyclesToReorder.length > 0) {
        await reorderBOMRoutings(bomId, cyclesToReorder);
      }
    }
  };

  // Funzione helper per convertire tempo
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

  // Gestisce l'annullamento delle modifiche
  const handleCancelEditing = () => {
    if (hasChanges()) {
      setShowCancelConfirmDialog(true);
    } else {
      handleConfirmCancel();
    }
  };

  // Conferma annullamento
  const handleConfirmCancel = () => {
    setPendingChanges({});
    setShowCancelConfirmDialog(false);
    setEditMode(false);
    
    // Ripristina i valori originali
    if (bom) {
      setBomData({
        code: bom.BOM || "",
        description: bom.Description || "",
        status: bom.BOMStatus || "BOZZA",
      });
    }
  };

  // Conta le modifiche per tipo
  const getChangesCount = () => {
    const count = {
      header: pendingChanges.header ? 1 : 0,
      components: 0,
      items: 0,
      cycles: 0,
    };

    for (const key in pendingChanges) {
      if (key === "header") continue;
      
      if (key.startsWith("cycle-")) {
        count.cycles++;
      } else {
        const changes = pendingChanges[key];
        if (changes.bomComponentChanges && Object.keys(changes.bomComponentChanges).length > 0) {
          count.components++;
        }
        if (changes.itemDetailsChanges && Object.keys(changes.itemDetailsChanges).length > 0) {
          count.items++;
        }
      }
    }

    return count;
  };

  if (!editMode) return null;

  const changesCount = getChangesCount();
  const totalChanges = changesCount.header + changesCount.components + changesCount.items + changesCount.cycles;

  return (
    <div className="bg-amber-50 p-4 border-b border-amber-200">
      <div className="space-y-4">
        {/* Form di modifica header */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="bomCode">Codice BOM</Label>
            <Input
              id="bomCode"
              value={bomData.code}
              onChange={(e) => handleHeaderChange("code", e.target.value)}
              className="bg-white"
              disabled={loading}
            />
          </div>
          
          <div>
            <Label htmlFor="bomDescription">Descrizione</Label>
            <Input
              id="bomDescription"
              value={bomData.description}
              onChange={(e) => handleHeaderChange("description", e.target.value)}
              className="bg-white"
              disabled={loading}
            />
          </div>
          
          <div>
            <Label htmlFor="bomStatus">Stato</Label>
            <Select 
              value={bomData.status} 
              onValueChange={(value) => handleHeaderChange("status", value)}
              disabled={loading}
            >
              <SelectTrigger id="bomStatus" className="bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableStatuses.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Riepilogo modifiche e pulsanti azione */}
        <div className="flex items-center justify-between pt-2 border-t border-amber-200">
          <div className="flex items-center gap-4">
            {totalChanges > 0 && (
              <>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <span className="text-sm font-medium text-amber-700">
                    Modifiche non salvate:
                  </span>
                </div>
                
                {changesCount.header > 0 && (
                  <Badge variant="outline" className="bg-white">
                    Header
                  </Badge>
                )}
                
                {changesCount.components > 0 && (
                  <Badge variant="outline" className="bg-white">
                    {changesCount.components} componenti
                  </Badge>
                )}
                
                {changesCount.items > 0 && (
                  <Badge variant="outline" className="bg-white">
                    {changesCount.items} articoli
                  </Badge>
                )}
                
                {changesCount.cycles > 0 && (
                  <Badge variant="outline" className="bg-white">
                    {changesCount.cycles} cicli
                  </Badge>
                )}
              </>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleCancelEditing}
              disabled={loading}
            >
              <X className="h-4 w-4 mr-1" />
              Annulla
            </Button>
            
            <Button
              onClick={handleSaveAllChanges}
              disabled={loading || totalChanges === 0}
            >
              <Save className="h-4 w-4 mr-1" />
              Salva tutto ({totalChanges})
            </Button>
          </div>
        </div>

        {/* Indicatore di progresso durante il salvataggio */}
        {savingProgress && (
          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-center gap-2 text-sm text-blue-700">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700"></div>
              <span>{savingProgress}</span>
            </div>
          </div>
        )}
      </div>

      {/* Dialog conferma annullamento */}
      <Dialog open={showCancelConfirmDialog} onOpenChange={setShowCancelConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Annullare le modifiche?</DialogTitle>
            <DialogDescription>
              Ci sono {totalChanges} modifiche non salvate. Se annulli, tutte le modifiche andranno perse.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelConfirmDialog(false)}>
              No, continua a modificare
            </Button>
            <Button variant="destructive" onClick={handleConfirmCancel}>
              Sì, annulla modifiche
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BOMHeaderEdit;