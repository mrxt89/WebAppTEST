// src/pages/progetti/progetti/articoli/BOMViewer/components/codingRules/RecodingWizard.jsx

import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle,
  CheckCircle,
  Code,
  Package,
  Lock,
  Loader2,
  AlertTriangle,
  FileText,
  Download,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import RecodingTable from "./RecodingTable";
import useRecodingRules from "@/hooks/useRecodingRules";
import { useBOMViewer } from "../../context/BOMViewerContext";

const RecodingWizard = ({
  items = [],
  companyId = 1, // Default RICOS
  userId,
  onClose,
  onApply,
}) => {
  const { project, smartRefresh } = useBOMViewer();
  const {
    loading: rulesLoading,
    applyBatchRecoding,
    resetHierarchyCache,
    // Funzioni logica semplificata
    getSimplifiedConfig,
    applySimplifiedBatchRecoding
  } = useRecodingRules();

  // Stati del wizard
  const [currentStep, setCurrentStep] = useState("configuration");
  const [recodingData, setRecodingData] = useState({});
  const [validationResults, setValidationResults] = useState({});
  const [isApplying, setIsApplying] = useState(false);
  const [applyProgress, setApplyProgress] = useState(0);
  const [applyResults, setApplyResults] = useState(null);

  // Configurazione logica semplificata
  const [simplifiedConfig, setSimplifiedConfig] = useState(null);
  const [loadingConfig, setLoadingConfig] = useState(true);

  // Filtra componenti bloccati
  const recodableItems = useMemo(() => {
    return items.filter(item => {
      const data = item.data || item;
      return data.stato_erp !== 1;
    });
  }, [items]);

  const lockedItems = useMemo(() => {
    return items.filter(item => {
      const data = item.data || item;
      return data.stato_erp === 1;
    });
  }, [items]);

  // Carica configurazione al mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        setLoadingConfig(true);
        const config = await getSimplifiedConfig();
        setSimplifiedConfig(config);
      } catch (error) {
        console.error("Error loading simplified config:", error);
        // Fallback su logica normale
        setSimplifiedConfig({ IsActive: false, CharactersToKeep: 7 });
      } finally {
        setLoadingConfig(false);
      }
    };

    loadConfig();
    resetHierarchyCache();
  }, [getSimplifiedConfig, resetHierarchyCache]);

  // Gestisce i cambiamenti dai componenti figli
  const handleDataChange = (data) => {
    setRecodingData(data);
    
    // Valida i dati
    const validation = {};
    let validCount = 0;
    let totalCount = 0;
    
    Object.entries(data).forEach(([itemId, item]) => {
      if (item.isModified) {
        totalCount++;
        
        // Se usa un articolo esistente, è sempre valido
        if (item.recodingData.useExistingArticle && item.recodingData.existingArticleId) {
          validation[itemId] = { isValid: true };
          validCount++;
        } 
        // Altrimenti verifica che il codice sia di 15 caratteri
        else if (item.recodingData.newCode && item.recodingData.newCode.length === 15) {
          validation[itemId] = { isValid: true };
          validCount++;
        } else if (item.recodingData.newCode) {
          validation[itemId] = { 
            isValid: false, 
            message: `Il codice deve essere di 15 caratteri (attuale: ${item.recodingData.newCode.length})` 
          };
        }
      }
    });
    
    setValidationResults({
      items: validation,
      validCount,
      totalCount,
      isComplete: validCount === totalCount && totalCount > 0
    });
  };

  // Prepara i dati per l'applicazione
  const prepareDataForSubmit = () => {
    const itemsToRecode = [];
    
    Object.entries(recodingData).forEach(([itemId, item]) => {
      if (item.isModified && (item.recodingData.newCode || item.recodingData.useExistingArticle)) {
        const recodingItem = {
          ItemId: parseInt(itemId),
          OldCode: item.ComponentItemCode || item.Item,
          NewCode: item.recodingData.newCode || item.ComponentItemCode || item.Item,
        };

        // Se è stato selezionato un articolo esistente
        if (item.recodingData.useExistingArticle && item.recodingData.existingArticleId) {
          // Assicurati che UseExistingArticleId sia un numero
          recodingItem.UseExistingArticleId = parseInt(item.recodingData.existingArticleId);
          recodingItem.ReplaceWithExisting = true;
          // Usa il codice dell'articolo esistente come NewCode
          recodingItem.NewCode = item.recodingData.existingArticleCode || item.recodingData.newCode;
        } else {
          // Ricodifica normale con nuovo codice
          recodingItem.NewDescription = item.recodingData.newDescription || item.Description;
          recodingItem.MacroFamilyId = item.recodingData.macroFamilyId ? parseInt(item.recodingData.macroFamilyId) : null;
          recodingItem.FamilyId = item.recodingData.familyId ? parseInt(item.recodingData.familyId) : null;
          recodingItem.TypeId = item.recodingData.typeId ? parseInt(item.recodingData.typeId) : null;
          recodingItem.AliasId = item.recodingData.aliasId ? parseInt(item.recodingData.aliasId) : null;
          recodingItem.Measures = item.recodingData.measures || "";
          recodingItem.Sequential = item.recodingData.sequential ? parseInt(item.recodingData.sequential) : null;
        }

        itemsToRecode.push(recodingItem);
      }
    });
    
    return itemsToRecode;
  };

  // Applica la ricodifica
  const handleApplyRecoding = async () => {
    try {
      setIsApplying(true);
      setApplyProgress(0);
      setCurrentStep("applying");
      
      const itemsToRecode = prepareDataForSubmit();
      
      if (itemsToRecode.length === 0) {
        toast({
          title: "Nessuna modifica",
          description: "Non ci sono componenti da ricodificare",
          variant: "destructive",
        });
        setCurrentStep("configuration");
        return;
      }
      
      // Simula progresso
      const progressInterval = setInterval(() => {
        setApplyProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      // Applica ricodifica usando la logica appropriata
      let result;
      if (simplifiedConfig?.IsActive) {
        // Usa logica semplificata
        result = await applySimplifiedBatchRecoding(itemsToRecode);
      } else {
        // Usa logica gerarchica tradizionale
        result = await applyBatchRecoding(companyId, userId || 1, itemsToRecode);
      }

      clearInterval(progressInterval);
      setApplyProgress(100);
      
      if (result.success) {
        setApplyResults(result);
        setCurrentStep("completed");
        
        toast({
          title: "Ricodifica completata",
          description: `${result.successCount} componenti ricodificati con successo`,
          variant: "success",
        });
        
        // Aggiorna la vista
        if (smartRefresh) {
          await smartRefresh();
        }
        
        // Callback al parent se fornito
        if (onApply) {
          onApply(result);
        }
        
        // Chiudi il wizard dopo 2 secondi per mostrare il risultato
        setTimeout(() => {
          onClose();
        }, 2000);
        
      } else {
        throw new Error(result.msg || "Errore durante la ricodifica");
      }
      
    } catch (error) {
      console.error("Errore nella ricodifica:", error);
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore durante la ricodifica",
        variant: "destructive",
      });
      setCurrentStep("configuration");
    } finally {
      setIsApplying(false);
    }
  };

  // Esporta report
  const handleExportReport = () => {
    if (!applyResults) return;
    
    // Prepara CSV
    const csvContent = [
      ["Codice Precedente", "Nuovo Codice", "Descrizione", "Stato"],
      ...prepareDataForSubmit().map(item => [
        item.OldCode,
        item.NewCode,
        recodingData[item.ItemId]?.recodingData?.newDescription || recodingData[item.ItemId]?.Description || "",
        applyResults.errors?.find(e => e.itemId === item.ItemId) ? "Errore" : "OK"
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
    
    // Download CSV
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `ricodifica_${project?.Code || "progetto"}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Calcola statistiche
  const statistics = useMemo(() => {
    const stats = {
      total: items.length,
      recodable: recodableItems.length,
      locked: lockedItems.length,
      modified: validationResults.totalCount || 0,
      valid: validationResults.validCount || 0,
    };
    return stats;
  }, [items, recodableItems, lockedItems, validationResults]);

  return (
    <Dialog open={true} onOpenChange={(open) => {
      if (!open && !isApplying) {
        onClose();
      }
    }}>
      <DialogContent className="max-w-[90vw] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Ricodifica Componenti - {project?.Description || "Progetto"}
            {simplifiedConfig?.IsActive && (
              <Badge variant="outline" className="ml-2">
                Modalità Semplificata
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Gestisci la ricodifica secondo le regole aziendali {companyId === 1 ? "RICOS" : ""}
            {simplifiedConfig?.IsActive && ` - Mantieni ${simplifiedConfig.CharactersToKeep} caratteri`}
          </DialogDescription>
        </DialogHeader>

        {/* Progress indicator */}
        {currentStep === "applying" && (
          <div className="space-y-2 py-4">
            <div className="flex items-center justify-between text-sm">
              <span>Applicazione ricodifica in corso...</span>
              <span>{applyProgress}%</span>
            </div>
            <Progress value={applyProgress} className="h-2" />
          </div>
        )}

        {/* Contenuto principale */}
        <div className="flex-1 overflow-hidden">
          {currentStep === "configuration" && (
            <div className="h-full flex flex-col space-y-4">
              {/* Alert per componenti bloccati */}
              {lockedItems.length > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{lockedItems.length} componenti</strong> sono presenti in ERP e non possono essere ricodificati.
                    Solo i componenti temporanei possono essere modificati.
                  </AlertDescription>
                </Alert>
              )}

              {/* Statistiche */}
              <div className="grid grid-cols-5 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold">{statistics.total}</div>
                  <div className="text-xs text-gray-500">Totali</div>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{statistics.recodable}</div>
                  <div className="text-xs text-gray-500">Ricodificabili</div>
                </div>
                <div className="text-center p-3 bg-gray-100 rounded-lg">
                  <div className="text-2xl font-bold text-gray-400">{statistics.locked}</div>
                  <div className="text-xs text-gray-500">Bloccati</div>
                </div>
                <div className="text-center p-3 bg-amber-50 rounded-lg">
                  <div className="text-2xl font-bold text-amber-600">{statistics.modified}</div>
                  <div className="text-xs text-gray-500">Modificati</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{statistics.valid}</div>
                  <div className="text-xs text-gray-500">Validi</div>
                </div>
              </div>

              {/* Tabella componenti */}
              <div className="flex-1 overflow-hidden">
                {loadingConfig ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                    <span className="ml-2 text-gray-500">Caricamento configurazione...</span>
                  </div>
                ) : (
                  <RecodingTable
                    items={recodableItems}
                    companyId={companyId}
                    onDataChange={handleDataChange}
                    loading={rulesLoading}
                    simplifiedConfig={simplifiedConfig}
                    className="h-full"
                  />
                )}
              </div>
            </div>
          )}

          {currentStep === "completed" && applyResults && (
            <div className="space-y-6 py-8">
              <div className="text-center">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-2xl font-semibold mb-2">Ricodifica Completata!</h3>
                <p className="text-gray-600">
                  La ricodifica è stata applicata con successo
                </p>
              </div>

              {/* Risultati */}
              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-3xl font-bold text-green-600">
                    {applyResults.successCount}
                  </div>
                  <div className="text-sm text-gray-600">Successi</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-3xl font-bold text-red-600">
                    {applyResults.errorCount}
                  </div>
                  <div className="text-sm text-gray-600">Errori</div>
                </div>
              </div>

              {/* Errori dettagliati */}
              {applyResults.errors && applyResults.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Errori riscontrati:</strong>
                    <ul className="mt-2 space-y-1">
                      {applyResults.errors.map((error, idx) => (
                        <li key={idx} className="text-sm">
                          • {error.itemCode}: {error.message}
                        </li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Azioni finali */}
              <div className="flex justify-center gap-3">
                <Button
                  variant="outline"
                  onClick={handleExportReport}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Esporta Report
                </Button>
                <Button onClick={onClose}>
                  Chiudi
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer con azioni */}
        {currentStep === "configuration" && (
          <DialogFooter className="border-t pt-4">
            <div className="flex items-center justify-between w-full">
              <div className="text-sm text-gray-500">
                {validationResults.isComplete ? (
                  <span className="text-green-600 flex items-center gap-1">
                    <CheckCircle className="h-4 w-4" />
                    Pronto per applicare le modifiche
                  </span>
                ) : validationResults.totalCount > 0 ? (
                  <span className="text-amber-600">
                    {validationResults.validCount} di {validationResults.totalCount} pronti
                  </span>
                ) : (
                  <span>
                    Compila i nuovi codici per i componenti da ricodificare
                  </span>
                )}
              </div>
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={onClose}
                  disabled={isApplying}
                >
                  Annulla
                </Button>
                <Button
                  onClick={handleApplyRecoding}
                  disabled={!validationResults.isComplete || isApplying}
                >
                  {isApplying ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Applicazione...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Applica Ricodifica ({validationResults.validCount || 0})
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default RecodingWizard;