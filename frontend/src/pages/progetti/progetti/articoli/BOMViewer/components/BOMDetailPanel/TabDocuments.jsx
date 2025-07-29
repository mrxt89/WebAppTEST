// BOMViewer/components/BOMDetailPanel/TabDocuments.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useBOMViewer } from "../../context/BOMViewerContext";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  FileBox, 
  Cloud, 
  ChevronRight,
  ChevronDown,
  Package,
  Layers,
  Folder,
  FolderOpen
} from "lucide-react";
import BOMItemAttachments from "@/components/itemAttachments/BOMItemAttachments";
import useItemAttachmentsActions from "@/hooks/useItemAttachmentsActions";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const TabDocuments = () => {
  const { editMode, selectedNode, bom, item, selectedBomId } = useBOMViewer();
  const { 
    getAttachmentsByBOMHierarchy, 
    loading 
  } = useItemAttachmentsActions();

  const [activeTab, setActiveTab] = useState("item");
  const [viewMode, setViewMode] = useState('current'); // 'current' o 'hierarchy'
  const [hierarchicalAttachments, setHierarchicalAttachments] = useState({ raw: [], grouped: [] });
  const [expandedGroups, setExpandedGroups] = useState({});

  // Determinare quale item visualizzare
  const targetItem = selectedNode?.data || item;

  // Reset della tab quando cambia il nodo selezionato
  useEffect(() => {
    setActiveTab("item");
    setViewMode('current'); // Reset alla vista corrente quando cambia nodo
  }, [selectedNode]);

  // Determina se l'articolo è da ERP o dal sistema progetti
  const isFromERP = selectedNode?.data?.IsErpItem || targetItem?.stato_erp === 1;

  // Ottieni il codice o l'ID appropriato per l'articolo
  const itemCode = isFromERP
    ? targetItem?.Item || targetItem?.ComponentItemCode
    : null;
  const projectItemId = !isFromERP
    ? targetItem?.Id || targetItem?.ComponentId
    : null;

  // Nome visualizzato dell'articolo o componente
  const displayName = selectedNode?.data
    ? selectedNode.data.ComponentItemCode || selectedNode.data.Item || "(Senza nome)"
    : item?.Item || "(Articolo principale)";

  // Flag che indica se stiamo visualizzando un componente della distinta
  const isComponentItem = !!selectedNode;

  // Carica allegati gerarchici quando cambia la modalità
  useEffect(() => {
    if (viewMode === 'hierarchy' && selectedBomId) {
      loadHierarchicalAttachments();
    }
  }, [viewMode, selectedBomId]);

  const loadHierarchicalAttachments = async () => {
    try {
      const result = await getAttachmentsByBOMHierarchy(selectedBomId);
      setHierarchicalAttachments(result);
      
      // Espandi automaticamente il primo livello
      const initialExpanded = {};
      if (result.grouped) {
        result.grouped.forEach(group => {
          if (group.level === 0) {
            initialExpanded[group.itemCode] = true;
          }
        });
      }
      setExpandedGroups(initialExpanded);
    } catch (error) {
      console.error("Error loading hierarchical attachments:", error);
    }
  };

  // Toggle espansione gruppo
  const toggleGroup = (itemCode) => {
    setExpandedGroups(prev => ({
      ...prev,
      [itemCode]: !prev[itemCode]
    }));
  };

  // Espandi/comprimi tutti
  const expandAll = () => {
    const allExpanded = {};
    hierarchicalAttachments.grouped.forEach(group => {
      allExpanded[group.itemCode] = true;
    });
    setExpandedGroups(allExpanded);
  };

  const collapseAll = () => {
    setExpandedGroups({});
  };

  // Ottieni colore per il livello
  const getLevelColor = (level) => {
    const colors = [
      'text-gray-900', // Livello 0
      'text-blue-600', // Livello 1
      'text-green-600', // Livello 2
      'text-amber-600', // Livello 3
      'text-purple-600', // Livello 4
      'text-pink-600', // Livello 5
    ];
    return colors[level] || 'text-gray-600';
  };

  const getBorderColor = (level) => {
    const colors = [
      'border-gray-400', // Livello 0
      'border-blue-400', // Livello 1
      'border-green-400', // Livello 2
      'border-amber-400', // Livello 3
      'border-purple-400', // Livello 4
      'border-pink-400', // Livello 5
    ];
    return colors[level] || 'border-gray-400';
  };

  // Componente per visualizzare un gruppo di allegati
  const AttachmentGroup = ({ group }) => {
    const isExpanded = expandedGroups[group.itemCode];
    const hasAttachments = group.attachments.length > 0;
    
    // Determina se è ERP o progetto
    const isGroupFromERP = group.attachments.length > 0 && 
      group.attachments[0].ItemCode && 
      !group.attachments[0].ProjectItemId;
    
    return (
      <Card className={`mb-2 ${group.level === 0 ? 'shadow-sm' : ''}`}>
        <CardHeader className="p-0">
          <Collapsible open={isExpanded} onOpenChange={() => toggleGroup(group.itemCode)}>
            <CollapsibleTrigger className="w-full">
              <div className={`flex items-center justify-between p-3 rounded-t-lg hover:bg-gray-50 cursor-pointer transition-colors border-l-4 ${getBorderColor(group.level)}`}>
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-500" />
                  )}
                  {isExpanded ? (
                    <FolderOpen className={`h-4 w-4 ${getLevelColor(group.level)}`} />
                  ) : (
                    <Folder className={`h-4 w-4 ${getLevelColor(group.level)}`} />
                  )}
                  <span className={`font-medium ${getLevelColor(group.level)}`}>
                    {group.itemCode}
                  </span>
                  <span className="text-sm text-gray-500 truncate max-w-md">
                    {group.itemDescription}
                  </span>
                  {group.level > 0 && (
                    <Badge variant="outline" className="text-xs">
                      Livello {group.level}
                    </Badge>
                  )}
                </div>
                <Badge variant="secondary">
                  {group.attachments.length} {group.attachments.length === 1 ? 'allegato' : 'allegati'}
                </Badge>
              </div>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <CardContent className="p-0 border-t">
                {hasAttachments ? (
                  <div className="p-2">
                    {/* Riutilizza BOMItemAttachments con i dati filtrati */}
                    <BOMItemAttachments
                      itemCode={isGroupFromERP ? group.itemCode : null}
                      projectItemId={!isGroupFromERP && group.attachments[0]?.ProjectItemId ? group.attachments[0].ProjectItemId : null}
                      readOnly={!editMode}
                      isComponentItem={true}
                      componentName={`${group.itemCode} - ${group.itemDescription}`}
                      compact={true}
                      // Passa gli allegati già caricati per evitare un'altra chiamata API
                      preloadedAttachments={group.attachments}
                      hideHeader={true} // Nascondi l'header del componente
                      showFilters={false} // Nascondi i filtri
                    />
                  </div>
                ) : (
                  <div className="p-4 text-sm text-gray-500 text-center">
                    Nessun allegato per questo componente
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </CardHeader>
      </Card>
    );
  };

  // Vista gerarchica degli allegati
  const HierarchicalAttachmentsView = () => {
    const totalAttachments = hierarchicalAttachments.raw.length;
    const totalGroups = hierarchicalAttachments.grouped.length;
    
    return (
      <div className="flex flex-col h-full">
        {/* Header con statistiche e controlli */}
        <div className="flex items-center justify-between mb-4 pb-4 border-b">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-sm font-medium">Vista gerarchica allegati</p>
              <p className="text-xs text-gray-500">
                {totalAttachments} {totalAttachments === 1 ? 'allegato' : 'allegati'} totali in {totalGroups} {totalGroups === 1 ? 'componente' : 'componenti'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={expandAll}
            >
              Espandi tutto
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={collapseAll}
            >
              Comprimi tutto
            </Button>
          </div>
        </div>
        
        {/* Lista allegati raggruppati */}
        <ScrollArea className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-gray-500">Caricamento allegati...</p>
            </div>
          ) : hierarchicalAttachments.grouped.length > 0 ? (
            <div className="space-y-2">
              {hierarchicalAttachments.grouped
                .sort((a, b) => {
                  // Ordina per livello e poi per codice
                  if (a.level !== b.level) return a.level - b.level;
                  return a.itemCode.localeCompare(b.itemCode);
                })
                .map((group) => (
                  <AttachmentGroup key={group.itemCode} group={group} />
                ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-gray-500">
              <FileBox className="h-12 w-12 mb-2" />
              <p>Nessun allegato trovato nella distinta</p>
            </div>
          )}
        </ScrollArea>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col"
      >
        <TabsContent value="item" className="flex-1 p-0 m-0 overflow-auto">
          <div className="p-4 h-full flex flex-col">
            {/* Toggle per vista corrente/gerarchica */}
            <div className="mb-4 flex items-center justify-between">
              <ToggleGroup type="single" value={viewMode} onValueChange={setViewMode}>
                <ToggleGroupItem value="current" className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Solo componente corrente
                </ToggleGroupItem>
                <ToggleGroupItem value="hierarchy" className="flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  Tutti i sottocomponenti
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            <Separator className="mb-4" />

            {/* Vista allegati */}
            <div className="flex-1 overflow-hidden">
              {viewMode === 'current' ? (
                <BOMItemAttachments
                  itemCode={itemCode}
                  projectItemId={projectItemId}
                  readOnly={!editMode}
                  isComponentItem={isComponentItem}
                  componentName={displayName}
                  compact={true}
                />
              ) : (
                <HierarchicalAttachmentsView />
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="bom" className="flex-1 p-0 m-0 overflow-auto">
          {/* Mostra gli allegati della distinta (se implementato in futuro) */}
          <div className="flex items-center justify-center h-full">
            <div className="text-center p-8 max-w-md">
              <Cloud className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium mb-2">
                Allegati della Distinta Base
              </h3>
              <p className="text-sm text-gray-500">
                Gli allegati associati direttamente alla distinta base non sono
                ancora supportati in questa versione. Saranno implementati in un
                futuro aggiornamento.
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TabDocuments;