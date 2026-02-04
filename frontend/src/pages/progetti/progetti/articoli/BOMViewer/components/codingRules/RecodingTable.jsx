// src/pages/progetti/progetti/articoli/BOMViewer/components/codingRules/RecodingTable.jsx

import React, { useState, useEffect, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertCircle,
  CheckCircle,
  Edit2,
  Copy,
  RotateCcw,
  Lock,
  Package,
  Layers,
  ShoppingCart,
} from "lucide-react";
import CodingHierarchySelector from "./CodingHierarchySelector";
import SimplifiedRecodingSelector from "./SimplifiedRecodingSelector";
import { ScrollArea } from "@/components/ui/scroll-area";
import useRecodingRules from "@/hooks/useRecodingRules";
import { config } from "@/config";

const RecodingTable = ({
  items = [],
  companyId,
  onDataChange,
  loading = false,
  simplifiedConfig = null,
  forceHierarchicalMode = false, // Forza uso logica gerarchica anche se semplificata è attiva
  className = ""
}) => {
  // Stati per gestire i dati della tabella
  const [tableData, setTableData] = useState({});
  const [expandedRows, setExpandedRows] = useState({});
  const [selectedRows, setSelectedRows] = useState({});
  const [editingMode, setEditingMode] = useState({}); // 'hierarchy' o 'manual' per ogni riga

  // Hook per estrarre componenti codice
  const { extractCodeComponents } = useRecodingRules();

  // Inizializza i dati della tabella quando cambiano gli items
  useEffect(() => {
    const initializeData = async () => {
      const initialData = {};
      
      // Estrai componenti per ogni item con codice esistente
      for (const item of items) {
        const itemId = item.data?.ComponentId || item.data?.Id || item.id;
        const itemCode = item.data?.ComponentItemCode || item.data?.Item || item.data?.ItemCode || "";
        
        // Inizializza con valori vuoti
        let recodingData = {
          categoryId: "",
          categoryCode: "",
          macroFamilyId: "",
          macroFamilyCode: "",
          familyId: "",
          familyCode: "",
          typeId: "",
          typeCode: "",
          aliasId: "",
          aliasCode: "",
          measures: "",
          sequential: "",
          newCode: "",
          newDescription: item.data?.Description || "",
          isValid: false,
          validationMessage: ""
        };
        
        // Se c'è un codice esistente, estrai le componenti
        if (itemCode && itemCode.length > 0) {
          try {
            const components = await extractCodeComponents(itemCode);
            
            if (components) {
              // Precompila i campi con i valori estratti
              recodingData = {
                ...recodingData,
                categoryId: components.CategoryId ? String(components.CategoryId) : "",
                categoryCode: components.CategoryCode || "",
                macroFamilyId: components.MacroFamilyId ? String(components.MacroFamilyId) : "",
                macroFamilyCode: components.MacroFamilyCode || "",
                familyId: components.FamilyId ? String(components.FamilyId) : "",
                familyCode: components.FamilyCode || "",
                typeId: components.TypeId ? String(components.TypeId) : "",
                typeCode: components.TypeCode || "",
                aliasId: components.AliasId ? String(components.AliasId) : "",
                aliasCode: components.AliasCode || "",
                measures: components.Measures || "",
                sequential: components.Sequential || "",
                newCode: itemCode, // Mantieni il codice originale come punto di partenza
              };
            }
          } catch (error) {
            console.error(`Errore estrazione componenti per codice ${itemCode}:`, error);
            // Continua con valori vuoti se l'estrazione fallisce
          }
        }
        
        // NUOVO: Carica TechnicalCharacteristicsJSON dal database
        // Prima prova da item.data (se già caricato), altrimenti carica dal database
        if (itemId) {
          try {
            let techJson = null;
            
            // Prova prima da item.data (se già presente)
            if (item.data?.TechnicalCharacteristicsJSON) {
              techJson = item.data.TechnicalCharacteristicsJSON;
              if (typeof techJson === 'string' && techJson.trim() !== '') {
                techJson = JSON.parse(techJson);
              }
            } else {
              // Se non presente, carica dal database
              try {
                const response = await fetch(
                  `${config.API_BASE_URL}/projectArticles/items/${itemId}`,
                  {
                    headers: {
                      Authorization: `Bearer ${localStorage.getItem("token")}`,
                    },
                  }
                );
                
                if (response.ok) {
                  const itemData = await response.json();
                  if (itemData?.TechnicalCharacteristicsJSON) {
                    techJson = itemData.TechnicalCharacteristicsJSON;
                    
                    // Gestisci il caso in cui TechnicalCharacteristicsJSON è un array (problema backend)
                    if (Array.isArray(techJson)) {
                      // Prendi il primo elemento non vuoto
                      techJson = techJson.find(j => j && j.trim() !== '') || null;
                      if (!techJson) {
                        console.log(`RecodingTable - TechnicalCharacteristicsJSON è array vuoto per item ${itemId}`);
                        continue; // Passa al prossimo item
                      }
                    }
                    
                    if (typeof techJson === 'string' && techJson.trim() !== '') {
                      techJson = JSON.parse(techJson);
                    }
                  }
                }
              } catch (fetchError) {
                console.error(`Errore caricamento TechnicalCharacteristicsJSON dal database per item ${itemId}:`, fetchError);
              }
            }
            
            // Se abbiamo JSON valido, aggiungilo ai recodingData
            if (techJson && typeof techJson === 'object' && Object.keys(techJson).length > 0) {
              recodingData.technicalCharacteristicsJSON = techJson;
              console.log(`RecodingTable - TechnicalCharacteristicsJSON caricato per item ${itemId}:`, techJson);
            } else {
              console.log(`RecodingTable - Nessun TechnicalCharacteristicsJSON trovato per item ${itemId}`);
            }
          } catch (error) {
            console.error(`Errore parsing TechnicalCharacteristicsJSON per item ${itemId}:`, error);
          }
        }
        
        initialData[itemId] = {
          ...item.data,
          recodingData,
          isModified: false,
          isManualEdit: false
        };
      }
      
      setTableData(initialData);
    };
    
    initializeData();
  }, [items, extractCodeComponents]);

  // Callback per aggiornamenti dai selettori
  const handleSelectorChange = (itemId, newData) => {
    setTableData(prev => {
      const updated = {
        ...prev,
        [itemId]: {
          ...prev[itemId],
          recodingData: newData,
          isModified: true,
          isManualEdit: false
        }
      };
      
      // Notifica immediatamente il parent dei cambiamenti
      if (onDataChange) {
        onDataChange(updated);
      }
      
      return updated;
    });
  };

  // Gestisce la modifica della descrizione
  const handleDescriptionChange = (itemId, newDescription) => {
    setTableData(prev => {
      const updated = {
        ...prev,
        [itemId]: {
          ...prev[itemId],
          recodingData: {
            ...prev[itemId].recodingData,
            newDescription
          }
        }
      };
      
      // Notifica il parent
      if (onDataChange) {
        onDataChange(updated);
      }
      
      return updated;
    });
  };

  // Gestisce la modifica manuale del codice
  const handleManualCodeChange = (itemId, newCode) => {
    setTableData(prev => {
      const updated = {
        ...prev,
        [itemId]: {
          ...prev[itemId],
          recodingData: {
            ...prev[itemId].recodingData,
            newCode: newCode,
            // Reset dei campi gerarchici quando si modifica manualmente
            categoryId: "",
            macroFamilyId: "",
            familyId: "",
            typeId: "",
            aliasId: "",
            sequential: ""
          },
          isModified: true,
          isManualEdit: true
        }
      };
      
      // Usa setTimeout per evitare l'errore di setState durante il render
      setTimeout(() => {
        if (onDataChange) {
          onDataChange(updated);
        }
      }, 0);
      
      return updated;
    });
  };

  // Toggle espansione riga
  const toggleRowExpansion = (itemId) => {
    setExpandedRows(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  // Toggle selezione riga
  const toggleRowSelection = (itemId) => {
    setSelectedRows(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  // Seleziona/deseleziona tutti
  const toggleSelectAll = () => {
    const allSelected = Object.keys(tableData).every(id => 
      selectedRows[id] || tableData[id].stato_erp === 1
    );
    
    const newSelection = {};
    Object.keys(tableData).forEach(id => {
      if (tableData[id].stato_erp !== 1) {
        newSelection[id] = !allSelected;
      }
    });
    setSelectedRows(newSelection);
  };

  // Copia codice da un altro componente
  const copyCodeFromComponent = (targetId, sourceId) => {
    const sourceData = tableData[sourceId];
    if (sourceData && sourceData.recodingData.newCode) {
      setTableData(prev => ({
        ...prev,
        [targetId]: {
          ...prev[targetId],
          recodingData: {
            ...sourceData.recodingData
          },
          isModified: true,
          isManualEdit: sourceData.isManualEdit
        }
      }));
    }
  };

  // Reset modifiche per un componente
  const resetComponent = (itemId) => {
    setTableData(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        recodingData: {
          categoryId: "",
          categoryCode: "",
          macroFamilyId: "",
          macroFamilyCode: "",
          familyId: "",
          familyCode: "",
          typeId: "",
          typeCode: "",
          aliasId: "",
          aliasCode: "",
          measures: "",
          sequential: "",
          newCode: "",
          newDescription: prev[itemId].Description || "",
          isValid: false,
          validationMessage: ""
        },
        isModified: false,
        isManualEdit: false
      }
    }));
    
    // Chiudi la riga espansa
    setExpandedRows(prev => ({
      ...prev,
      [itemId]: false
    }));
  };

  // Icona natura articolo
  const getNatureIcon = (nature) => {
    switch (parseInt(nature)) {
      case 22413312:
        return <Layers className="h-4 w-4 text-blue-500" />;
      case 22413313:
        return <Package className="h-4 w-4 text-green-500" />;
      case 22413314:
        return <ShoppingCart className="h-4 w-4 text-orange-500" />;
      default:
        return null;
    }
  };

  // Tooltip natura articolo
  const getNatureTooltip = (nature) => {
    switch (parseInt(nature)) {
      case 22413312:
        return "Semilavorato";
      case 22413313:
        return "Prodotto Finito";
      case 22413314:
        return "Acquisto";
      default:
        return "Altro";
    }
  };

  // Calcola statistiche
  const statistics = useMemo(() => {
    const stats = {
      total: Object.keys(tableData).length,
      modified: 0,
      valid: 0,
      locked: 0
    };
    
    Object.values(tableData).forEach(item => {
      if (item.stato_erp === 1) stats.locked++;
      if (item.isModified) stats.modified++;
      if (item.recodingData.isValid) stats.valid++;
    });
    
    return stats;
  }, [tableData]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header con statistiche */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-6">
          <div className="text-sm">
            <span className="text-gray-500">Totale:</span>
            <span className="ml-2 font-semibold">{statistics.total}</span>
          </div>
          <div className="text-sm">
            <span className="text-gray-500">Modificati:</span>
            <span className="ml-2 font-semibold text-blue-600">{statistics.modified}</span>
          </div>
          <div className="text-sm">
            <span className="text-gray-500">Validi:</span>
            <span className="ml-2 font-semibold text-green-600">{statistics.valid}</span>
          </div>
          <div className="text-sm">
            <span className="text-gray-500">Bloccati:</span>
            <span className="ml-2 font-semibold text-gray-400">{statistics.locked}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Checkbox
            checked={Object.keys(tableData).every(id => 
              selectedRows[id] || tableData[id].stato_erp === 1
            )}
            onCheckedChange={toggleSelectAll}
            className="h-4 w-4 bg-primary"
          />
          <span className="text-sm text-gray-600">Seleziona tutti</span>
        </div>
      </div>

      {/* Tabella */}
      <ScrollArea className="h-[600px] rounded-md border">
        <Table>
          <TableHeader className="sticky top-0 bg-white z-10">
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Codice Attuale</TableHead>
              <TableHead>Descrizione</TableHead>
              <TableHead className="text-center">Natura</TableHead>
              <TableHead>Nuovo Codice</TableHead>
              <TableHead>Nuova Descrizione</TableHead>
              <TableHead className="text-center">Stato</TableHead>
              <TableHead className="text-right">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          
          <TableBody>
            {Object.entries(tableData).map(([itemId, item]) => {
              const isLocked = item.stato_erp === 1;
              const isExpanded = expandedRows[itemId];
              const isSelected = selectedRows[itemId];
              const isRoot = item.Level === 0;
              
              return (
                <React.Fragment key={itemId}>
                  {/* Riga principale */}
                  <TableRow 
                    className={`
                      ${isLocked ? 'opacity-50 bg-gray-50' : ''}
                      ${isSelected ? 'bg-blue-50' : ''}
                      ${item.isModified ? 'border-l-4 border-l-blue-500' : ''}
                    `}
                  >
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleRowSelection(itemId)}
                        disabled={isLocked}
                        className="h-4 w-4 bg-primary"
                      />
                    </TableCell>
                    
                    <TableCell className="font-mono font-medium">
                      <div className="flex items-center gap-2">
                        {item.ComponentItemCode || item.Item}
                        {isRoot && (
                          <Badge variant="" className="text-xs">
                            Principale
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="max-w-xs truncate" title={item.Description}>
                        {item.Description}
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-center">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            {getNatureIcon(item.Nature)}
                          </TooltipTrigger>
                          <TooltipContent>
                            {getNatureTooltip(item.Nature)}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    
                    <TableCell>
                      {item.isManualEdit ? (
                        <Input
                          value={item.recodingData.newCode || ""}
                          onChange={(e) => handleManualCodeChange(itemId, e.target.value)}
                          className="w-40 font-mono"
                          placeholder="Inserisci codice..."
                          disabled={isLocked}
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className={`font-mono ${
                            item.recodingData.isValid ? 'text-green-600' : ''
                          }`}>
                            {item.recodingData.newCode || "-"}
                          </span>
                          {item.recodingData.isValid && (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          )}
                        </div>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      <div className="max-w-xs truncate" title={item.recodingData.newDescription}>
                        {item.recodingData.newDescription || item.Description}
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-center">
                      {isLocked ? (
                        <Badge variant="" className="bg-gray-100">
                          <Lock className="h-3 w-3 mr-1" />
                          ERP
                        </Badge>
                      ) : item.isModified ? (
                        <Badge variant="default" className="bg-blue-100 text-blue-700">
                          Modificato
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          Da compilare
                        </Badge>
                      )}
                    </TableCell>
                    
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={() => toggleRowExpansion(itemId)}
                                disabled={isLocked}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {isExpanded ? "Chiudi" : "Modifica"}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        
                        {item.isModified && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8"
                                  onClick={() => resetComponent(itemId)}
                                >
                                  <RotateCcw className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                Reset modifiche
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  
                  {/* Riga espansa con selettore (gerarchico o semplificato) */}
                  {isExpanded && !isLocked && (
                    <TableRow>
                      <TableCell colSpan={8} className="bg-gray-50 p-4">
                        {simplifiedConfig?.IsActive && !forceHierarchicalMode ? (
                          // Logica semplificata (solo se non forzata la gerarchica)
                          <SimplifiedRecodingSelector
                            item={item}
                            charactersToKeep={simplifiedConfig.CharactersToKeep}
                            onPreviewGenerated={(previewData) => {
                              // Aggiorna i dati con il preview generato
                              handleSelectorChange(itemId, {
                                newCode: previewData.previewCode,
                                newDescription: item.Description, // Mantieni descrizione originale
                                // Copia i campi gerarchia dall'articolo originale
                                macroFamilyId: item.MacrofamilyId,
                                familyId: item.FamilyId,
                                typeId: item.ItemTypeId,
                                aliasId: item.AliasId,
                                categoryId: item.CategoryId,
                                isValid: true
                              });
                            }}
                            disabled={loading}
                          />
                        ) : (
                          // Logica gerarchica tradizionale (sempre quando forceHierarchicalMode è true o semplificata non attiva)
                          <CodingHierarchySelector
                            companyId={companyId}
                            componentId={itemId}
                            currentCode={item.ComponentItemCode || item.Item}
                            currentDescription={item.Description}
                            isRoot={isRoot}
                            value={item.recodingData}
                            onChange={(data) => handleSelectorChange(itemId, data)}
                            onDescriptionChange={(desc) => handleDescriptionChange(itemId, desc)}
                            disabled={loading}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
};

export default RecodingTable;