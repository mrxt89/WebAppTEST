// src/pages/progetti/progetti/articoli/BOMViewer/components/BOMHeaderEdit.jsx

import React, { useState, useEffect, useMemo } from "react";
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
import { 
  Save, 
  X, 
  AlertCircle, 
  Code,
  Upload,
  Database,
  CheckCircle2
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { swal } from "@/lib/common";
import RecodingWizard from "./codingRules/RecodingWizard";
import useErpExport from "@/hooks/useErpExport";

const BOMHeaderEdit = () => {
  const {
    item,
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
    selectedComponents,
    project,
    updateRoutingCheckOperation,
    refreshProject,
  } = useBOMViewer();

  // Hook per export ERP
  const {
    exportBOM,
    checkBOMExportability,
    syncBOMsFromERP,
    loading: exportLoading
  } = useErpExport();

  const [bomData, setBomData] = useState({
    code: "",
    description: "",
    status: "BOZZA",
    notes: "",
  });

  const [showCancelConfirmDialog, setShowCancelConfirmDialog] = useState(false);
  const [savingProgress, setSavingProgress] = useState(null);
  
  // Stati per ricodifica
  const [recodingWizardOpen, setRecodingWizardOpen] = useState(false);
  const [recodingItems, setRecodingItems] = useState([]);
  
  // Stato per tracciare export in corso
  const [isExporting, setIsExporting] = useState(false);

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
        notes: bom.Notes || "",
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

  // Handler per ricodifica articolo principale
  const handleRecodeRoot = () => {
    // Verifica se l'articolo è bloccato
    if (item?.stato_erp == 1) {
      toast({
        title: "Articolo bloccato",
        description: "L'articolo principale è presente in ERP e non può essere ricodificato",
        variant: "destructive",
      });
      return;
    }

    // Crea oggetto per l'articolo principale
    const rootComponent = {
      id: `component-${item.Id}-0`,
      type: "component",
      data: {
        ComponentId: item.Id,
        ComponentItemCode: item.Item,
        Item: item.Item,
        Description: item.Description,
        Level: 0,
        IsRoot: true,
        Nature: item.Nature || 22413312,
        BaseUoM: item.BaseUoM || "NR",
        stato_erp: item.stato_erp || 0
      }
    };

    setRecodingItems([rootComponent]);
    setRecodingWizardOpen(true);
  };

  // Handler per ricodifica componenti selezionati
  const handleRecodeSelected = async () => {
    if (!selectedComponents || selectedComponents.length === 0) {
      toast({
        title: "Nessun componente selezionato",
        description: "Seleziona almeno un componente da ricodificare",
        variant: "destructive",
      });
      return;
    }

    // Verifica componenti bloccati
    const lockedComponents = selectedComponents.filter(c => 
      c.data && c.data.stato_erp == 1
    );
    
    if (lockedComponents.length > 0) {
      const result = await swal.fire({
        title: "Attenzione",
        html: `
          <p><strong>${lockedComponents.length} componenti</strong> sono presenti in ERP e non possono essere ricodificati.</p>
          <p>Vuoi procedere con i rimanenti <strong>${selectedComponents.length - lockedComponents.length} componenti</strong>?</p>
        `,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Procedi",
        cancelButtonText: "Annulla",
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
      });

      if (!result.isConfirmed) {
        return;
      }
    }

    // Filtra solo i componenti ricodificabili
    const recodableComponents = selectedComponents.filter(c => 
      c.data && c.data.stato_erp != 1
    );

    if (recodableComponents.length === 0) {
      toast({
        title: "Nessun componente ricodificabile",
        description: "Tutti i componenti selezionati sono bloccati",
        variant: "destructive",
      });
      return;
    }

    setRecodingItems(recodableComponents);
    setRecodingWizardOpen(true);
  };

  // Handler per applicazione ricodifica
  const handleApplyRecoding = async (result) => {
    // La ricodifica è già stata applicata nel wizard
    // Qui possiamo fare azioni aggiuntive se necessario
    
    // Chiudi il wizard
    setRecodingWizardOpen(false);
    
    // Reset items
    setRecodingItems([]);
    
    // Il refresh è già stato fatto dal wizard tramite smartRefresh
  };

  // Handler per export BOM
  const handleExportBOM = async () => {
    if (!bom?.Id || !bom?.Version) {
      toast({
        title: "Errore",
        description: "Nessuna distinta selezionata",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsExporting(true);

      // Verifica esportabilità
      const checkResult = await checkBOMExportability(bom.Id, bom.Version);
      
      if (!checkResult.canExport) {
        const unverifiedCycles = checkResult.unverifiedCycles || [];

        if (unverifiedCycles.length > 0) {
          const cycleList = unverifiedCycles
            .map(
              (c) =>
                `• Fase ${c.RtgStep} - ${c.Operation || "N/D"} (CdL: ${
                  c.WC || "-"
                })`,
            )
            .join("\n");

          await swal.fire({
            title: "Cicli non verificati",
            html: `
              <div class="text-left">
                <p class="mb-3">
                  Tutti i cicli devono essere marcati come <strong>Operazione controllata</strong> prima di esportare.
                </p>
                <div class="bg-amber-50 border border-amber-200 rounded p-3">
                  <p class="font-semibold text-amber-800 mb-2">Fasi da verificare:</p>
                  <pre class="text-sm text-amber-800 whitespace-pre-wrap">${cycleList}</pre>
                </div>
                <p class="mt-3 text-xs text-gray-500">
                  Apri la tab Cicli del componente interessato e attiva il checkbox "Operazione controllata".
                </p>
              </div>
            `,
            icon: "warning",
            confirmButtonText: "OK",
            confirmButtonColor: "#d97706",
          });
          return;
        }

        // Se ci sono componenti mancanti, mostra dettagli
        if (checkResult.missingComponents?.length > 0) {
          const missingList = checkResult.missingComponents
            .map(c => `• ${c.code || 'N/A'}: ${c.description} (${c.issue})`)
            .join('\n');

          await swal.fire({
            title: "Distinta non esportabile",
            html: `
              <div class="text-left">
                <p class="mb-3">${checkResult.reason}</p>
                <div class="bg-red-50 border border-red-200 rounded p-3">
                  <p class="font-semibold text-red-800 mb-2">Componenti con problemi:</p>
                  <pre class="text-sm text-red-700 whitespace-pre-wrap">${missingList}</pre>
                </div>
                <p class="mt-3 text-sm text-gray-600">
                  Risolvi questi problemi prima di esportare la distinta.
                </p>
              </div>
            `,
            icon: "warning",
            confirmButtonText: "OK",
            confirmButtonColor: "#3085d6",
          });
          return;
        }

        // Altri motivi
        await swal.fire({
          title: "Distinta non esportabile",
          text: checkResult.reason,
          icon: checkResult.alreadyExported ? "info" : "warning",
          confirmButtonColor: "#3085d6",
        });
        return;
      }

      // Conferma export
      const confirmResult = await swal.fire({
        title: "Esportare distinta in ERP?",
        html: `
          <div class="text-left">
            <p>Stai per esportare la distinta:</p>
            <div class="mt-2 p-3 bg-gray-100 rounded">
              <p class="font-semibold">${bom.BOM}</p>
              <p class="text-sm text-gray-600">${bom.Description}</p>
              <p class="text-xs text-gray-500 mt-1">Versione ${bom.Version}</p>
            </div>
            <div class="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
              <p class="text-sm text-blue-800">
                <strong>Nota:</strong> Verranno esportati anche tutti i componenti 
                e i cicli di lavorazione associati.
              </p>
            </div>
          </div>
        `,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Esporta",
        cancelButtonText: "Annulla",
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        showLoaderOnConfirm: true,
        allowOutsideClick: () => !swal.isLoading(),
        preConfirm: async () => {
          try {
            const result = await exportBOM(bom.Id, bom.Version);
            return result;
          } catch (error) {
            swal.showValidationMessage(`Errore: ${error.message}`);
            return false;
          }
        },
      });

      if (confirmResult.isConfirmed && confirmResult.value?.success) {
        await swal.fire({
          title: "Esportazione completata!",
          html: `
            <div class="text-center">
              <div class="mb-4">
                <CheckCircle2 class="h-16 w-16 text-green-500 mx-auto" />
              </div>
              <p>Distinta base esportata e sincronizzata con successo</p>
            </div>
          `,
          icon: "success",
          timer: 2500,
          showConfirmButton: false,
        });

        // Disattiva modalità modifica dopo export riuscito
        setEditMode(false);
        
        // Refresh completo della BOM
        await smartRefresh();
        
        // Refresh automatico dell'intero progetto
        if (refreshProject) {
          await refreshProject();
        }
      } else if (confirmResult.isConfirmed) {
        // Anche in caso di errore, aggiorna il progetto
        if (refreshProject) {
          await refreshProject();
        }
      }
    } catch (error) {
      console.error("Errore export BOM:", error);
      await swal.fire({
        title: "Errore",
        text: error.message || "Si è verificato un errore durante l'esportazione",
        icon: "error",
        confirmButtonColor: "#d33",
      });
      
      // Refresh automatico del progetto anche in caso di errore
      if (refreshProject) {
        await refreshProject();
      }
    } finally {
      setIsExporting(false);
    }
  };

  // Handler per sync da ERP
  const handleSyncFromERP = async () => {
    try {
      setIsExporting(true);

      const result = await swal.fire({
        title: "Sincronizzare da ERP?",
        html: `
          <div class="text-left">
            <p>Vuoi sincronizzare la distinta <strong>${bom.BOM}</strong> dal gestionale?</p>
            <p class="mt-2 text-sm text-gray-600">
              Questa operazione aggiornerà i dati della distinta con quelli presenti nel gestionale.
            </p>
          </div>
        `,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Sincronizza",
        cancelButtonText: "Annulla",
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
      });

      if (!result.isConfirmed) return;

      // Sincronizza distinta
      const syncResult = await syncBOMsFromERP(bom.BOM, bom.Version);
      
      if (syncResult.success) {
        await swal.fire({
          title: "Sincronizzazione completata!",
          text: "Dati aggiornati dal gestionale",
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
        });

        // Disattiva modalità modifica
        setEditMode(false);
        
        // Refresh
        await smartRefresh();
      }
    } catch (error) {
      console.error("Error syncing from ERP:", error);
      await swal.fire({
        title: "Errore",
        text: error.message || "Errore durante la sincronizzazione",
        icon: "error",
      });
    } finally {
      setIsExporting(false);
    }
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
              Notes:
                pendingChanges.header.notes !== undefined
                  ? pendingChanges.header.notes
                  : bomData.notes,
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
              // Trova il componente per ottenere il BOMId corretto
              const component = bomComponents.find(c => c.ComponentId === parseInt(componentId));
              
              // Il BOMId dovrebbe essere l'ID della distinta base che CONTIENE il componente
              // Per UPDATE_COMPONENT, dobbiamo usare il ParentBOMId, non il BOMId del componente stesso
              // Il BOMId del componente è la sua distinta base, il ParentBOMId è la distinta che lo contiene
              const bomId = component?.ParentBOMId || changes.bomId || bom.Id;
              
              console.log('UPDATE_COMPONENT payload:', {
                Id: bomId,
                Line: changes.line,
                ComponentId: componentId,
                changes: changes.bomComponentChanges,
                componentData: {
                  ComponentId: component?.ComponentId,
                  BOMId: component?.BOMId,
                  ParentBOMId: component?.ParentBOMId,
                  Level: component?.Level
                }
              });

              const result = await addUpdateBOM("UPDATE_COMPONENT", {
                Id: bomId,
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
    // FIX: Traccia i BOMId creati per ciclo, per usarli nelle operazioni successive
    const createdBomIds = new Map(); // Map: rtgStep -> bomId creato
    
    if (cycleChanges.newCycles && cycleChanges.newCycles.length > 0) {
      for (const cycle of cycleChanges.newCycles) {
        const desiredCheckOperation = cycle.CheckOperation;
        const cycleData = {
          Id: bomId,
          ...cycle,
          ProcessingTime: parseTimeToSeconds(cycle.ProcessingTime),
          SetupTime: parseTimeToSeconds(cycle.SetupTime),
        };
        delete cycleData.CheckOperation;
        
        // FIX: Se BOMId = 0, aggiungi ItemId o ComponentId per creare automaticamente la BOM
        // Usa ComponentId o ItemId dal ciclo se disponibili, altrimenti usa componentId passato come parametro
        const targetItemId = cycle.ComponentId || cycle.ItemId || componentId;
        if ((!bomId || bomId === 0 || bomId === "0") && targetItemId) {
          const itemIdNum = typeof targetItemId === 'string' ? parseInt(targetItemId, 10) : targetItemId;
          if (itemIdNum && !isNaN(itemIdNum)) {
            cycleData.ItemId = itemIdNum;
            cycleData.ComponentId = itemIdNum;
          }
        }
        
        const addRoutingResult = await addUpdateBOM("ADD_ROUTING", cycleData);
        
        // FIX: Se la BOM è stata creata automaticamente, salva il BOMId restituito
        const actualBomId = addRoutingResult?.bomId || bomId;
        if (actualBomId && actualBomId !== bomId) {
          createdBomIds.set(cycle.RtgStep, actualBomId);
          console.log(`[DEBUG] BOM creata per ciclo RtgStep ${cycle.RtgStep}: ${actualBomId}`);
        }
        
        if (desiredCheckOperation !== undefined) {
          await updateRoutingCheckOperation(
            actualBomId,
            cycle.RtgStep,
            parseInt(desiredCheckOperation, 10) === 1 ? 1 : 0,
          );
        }
      }
    }

    // Gestisci modifiche
    if (cycleChanges.cycleChanges && Object.keys(cycleChanges.cycleChanges).length > 0) {
      for (const rtgStep in cycleChanges.cycleChanges) {
        const originalChanges = cycleChanges.cycleChanges[rtgStep].changes;
        const original = cycleChanges.cycleChanges[rtgStep].original;
        const changes = { ...originalChanges };
        const checkOperationChange = changes.CheckOperation;

        if (checkOperationChange !== undefined) {
          delete changes.CheckOperation;
        }

        if (Object.keys(changes).length > 0) {
          const updatedCycle = { ...original, ...changes };
          
          // Converti i tempi
          if (typeof updatedCycle.ProcessingTime === "string" && updatedCycle.ProcessingTime.includes(":")) {
            updatedCycle.ProcessingTime = parseTimeToSeconds(updatedCycle.ProcessingTime);
          }
          if (typeof updatedCycle.SetupTime === "string" && updatedCycle.SetupTime.includes(":")) {
            updatedCycle.SetupTime = parseTimeToSeconds(updatedCycle.SetupTime);
          }

          // FIX: Usa il BOMId creato se disponibile, altrimenti usa bomId originale
          const actualBomIdForUpdate = createdBomIds.get(parseInt(rtgStep, 10)) || bomId;
          
          // FIX: Se BOMId = 0, aggiungi ItemId o ComponentId per trovare la BOM
          const updateCycleData = {
            Id: actualBomIdForUpdate,
            RtgStep: parseInt(rtgStep, 10),
            ...updatedCycle
          };
          
          if ((!actualBomIdForUpdate || actualBomIdForUpdate === 0 || actualBomIdForUpdate === "0")) {
            const targetItemId = updatedCycle.ComponentId || updatedCycle.ItemId || componentId;
            if (targetItemId) {
              const itemIdNum = typeof targetItemId === 'string' ? parseInt(targetItemId, 10) : targetItemId;
              if (itemIdNum && !isNaN(itemIdNum)) {
                updateCycleData.ItemId = itemIdNum;
                updateCycleData.ComponentId = itemIdNum;
              }
            }
          }

          await addUpdateBOM("UPDATE_ROUTING", updateCycleData);
        }

        if (checkOperationChange !== undefined) {
          // FIX: Usa il BOMId creato se disponibile
          const actualBomIdForCheck = createdBomIds.get(parseInt(rtgStep, 10)) || bomId;
          await updateRoutingCheckOperation(
            actualBomIdForCheck,
            parseInt(rtgStep, 10),
            parseInt(checkOperationChange, 10) === 1 ? 1 : 0,
          );
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
    // Cancella tutte le modifiche pendenti
    setPendingChanges({});
    setShowCancelConfirmDialog(false);
    setEditMode(false);
    
    // Ripristina i valori originali dell'header
    if (bom) {
      setBomData({
        code: bom.BOM || "",
        description: bom.Description || "",
        status: bom.BOMStatus || "BOZZA",
      });
    }

    // Forza il refresh dei dati per assicurarsi che tutto sia ripristinato dal server
    // Questo è più sicuro che modificare manualmente lo stato locale
    if (smartRefresh) {
      smartRefresh();
    }
  };

  // Debug: monitora i cambiamenti di pendingChanges
  useEffect(() => {
    console.log('[BOMHeaderEdit] pendingChanges changed via useEffect:', pendingChanges);
  }, [pendingChanges]);

  // Conta le modifiche per tipo - useMemo per ricalcolare quando pendingChanges cambia
  const changesCount = useMemo(() => {
    console.log('[BOMHeaderEdit] Recalculating changesCount, pendingChanges:', pendingChanges);

    const count = {
      header: 0,
      components: 0,
      items: 0,
      cycles: 0,
    };

    // Conta le modifiche dell'header verificando se ci sono campi effettivamente modificati
    if (pendingChanges.header && Object.keys(pendingChanges.header).length > 0) {
      console.log('[BOMHeaderEdit] Header changes detected:', pendingChanges.header);
      count.header = 1;
    } else {
      console.log('[BOMHeaderEdit] No header changes:', {
        hasHeader: !!pendingChanges.header,
        headerKeys: pendingChanges.header ? Object.keys(pendingChanges.header) : []
      });
    }

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
  }, [pendingChanges]);

  const totalChanges = useMemo(() => {
    const total = changesCount.header + changesCount.components + changesCount.items + changesCount.cycles;
    console.log('[BOMHeaderEdit] Total changes:', total, changesCount);
    return total;
  }, [changesCount]);

  if (!editMode) return null;

  // Controlla se la BOM è in ERP
  const isInERP = bom?.stato_erp == "1" || bom?.stato_erp === 1;

  return (
    <>
      <div className="bg-amber-50 p-2 border-b border-amber-200">
        <div className="space-y-2">
          {/* Avviso se la BOM è in ERP */}
          {isInERP && (
            <Alert className="bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800 text-sm">
                <strong>Distinta bloccata:</strong> Questa distinta è presente in ERP (Mago) e non può essere modificata.
                Solo sincronizzazione da ERP disponibile.
              </AlertDescription>
            </Alert>
          )}

          {/* Form di modifica header */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label htmlFor="bomCode">Codice BOM</Label>
              <Input
                id="bomCode"
                value={bomData.code}
                onChange={(e) => handleHeaderChange("code", e.target.value)}
                className={isInERP ? "bg-gray-100" : "bg-white"}
                disabled={loading || isInERP}
                title={isInERP ? "Distinta presente in ERP - Campo non modificabile" : ""}
              />
            </div>

            <div>
              <Label htmlFor="bomDescription">Descrizione</Label>
              <Input
                id="bomDescription"
                value={bomData.description}
                onChange={(e) => handleHeaderChange("description", e.target.value)}
                className={isInERP ? "bg-gray-100" : "bg-white"}
                disabled={loading || isInERP}
                title={isInERP ? "Distinta presente in ERP - Campo non modificabile" : ""}
              />
            </div>

            <div>
              <Label htmlFor="bomStatus">Stato</Label>
              <Select
                value={bomData.status}
                onValueChange={(value) => handleHeaderChange("status", value)}
                disabled={loading || isInERP}
              >
                <SelectTrigger
                  id="bomStatus"
                  className={isInERP ? "bg-gray-100" : "bg-white"}
                  title={isInERP ? "Distinta presente in ERP - Campo non modificabile" : ""}
                >
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

          {/* Note BOM rimosse dall'header - ora gestite nella scheda Composizione */}

          {/* Pulsanti ricodifica e export */}
          <div className="flex items-center gap-2 pt-2 border-t border-amber-200">
            {/* Pulsanti ricodifica - nascosti se BOM in ERP */}
            {!isInERP && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRecodeRoot}
                  disabled={item?.stato_erp == 1 || loading}
                  className="bg-white"
                >
                  <Code className="h-4 w-4 mr-1" />
                  Ricodifica principale
                </Button>

                {selectedComponents && selectedComponents.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRecodeSelected}
                    disabled={loading}
                    className="bg-white"
                  >
                    <Code className="h-4 w-4 mr-1" />
                    Ricodifica selezionati ({selectedComponents.length})
                  </Button>
                )}

                {/* Export in ERP - solo se non già esportato */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportBOM}
                  disabled={loading || isExporting || exportLoading}
                  className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300"
                >
                  {isExporting ? (
                    <>
                      <span className="animate-spin h-4 w-4 mr-1">⏳</span>
                      Esportazione...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-1" />
                      Esporta in ERP
                    </>
                  )}
                </Button>
              </>
            )}

            {/* Sync da ERP - solo se già esportato */}
            {isInERP && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSyncFromERP}
                disabled={loading || isExporting || exportLoading}
                className="bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
              >
                {isExporting ? (
                  <>
                    <span className="animate-spin h-4 w-4 mr-1">⏳</span>
                    Sincronizzazione...
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4 mr-1" />
                    Sincronizza da ERP
                  </>
                )}
              </Button>
            )}

            {/* Indicatore stato ERP */}
            {bom?.stato_erp == 1 && (
              <div className="ml-auto flex items-center gap-2 text-sm text-green-700">
                <CheckCircle2 className="h-4 w-4" />
                <span>Presente in ERP</span>
                {bom?.data_sync_erp && (
                  <span className="text-xs text-gray-500">
                    (sync: {new Date(bom.data_sync_erp).toLocaleDateString('it-IT')})
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Riepilogo modifiche e pulsanti azione */}
          <div className="flex items-center justify-between pt-1 border-t border-amber-200">
            <div className="flex items-center gap-2">
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
                disabled={loading || totalChanges === 0 || isInERP}
                title={isInERP ? "Impossibile salvare: distinta presente in ERP" : ""}
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

      {/* Wizard ricodifica */}
      {recodingWizardOpen && (
        <RecodingWizard
          items={recodingItems}
          companyId={project?.CompanyId || 1}
          userId={1} // TODO: Prendere dall'autenticazione
          onClose={() => {
            setRecodingWizardOpen(false);
            setRecodingItems([]);
          }}
          onApply={handleApplyRecoding}
          forceHierarchicalMode={true} // Forza logica gerarchica per ricodifica da pagina distinte basi
        />
      )}
    </>
  );
};

export default BOMHeaderEdit;