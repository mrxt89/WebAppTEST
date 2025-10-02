import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ChevronRight,
  ChevronDown,
  Package,
  ShoppingCart,
  Wrench,
  Paperclip,
  Plus,
  Eye,
  Database,
  AlertCircle,
  CheckCircle,
  CircleSlash,
  TimerOff,
  Download,
  Edit,
  Trash2,
  MoreVertical,
  Upload,
  Info,
  FileText
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { swal } from '@/lib/common';
import useItemAttachmentsActions from '@/hooks/useItemAttachmentsActions';
import ItemAttachmentUploader from '@/components/itemAttachments/ItemAttachmentUploader';
import ItemAttachmentDetails from '@/components/itemAttachments/ItemAttachmentDetails';
import FileViewer from '@/components/ui/fileViewer';

/**
 * ArticleBOMExpansion - Componente per l'espansione ad albero della BOM nella lista articoli
 * @param {Object} item - Articolo principale
 * @param {Object} project - Progetto corrente
 * @param {boolean} canEdit - Flag per permessi di modifica
 * @param {Function} onRefresh - Callback per aggiornare i dati
 * @param {Object} bomData - Dati BOM già caricati dal hook
 * @param {boolean} loading - Flag di caricamento dal hook
 */
const ArticleBOMExpansion = ({ 
  item, 
  project, 
  canEdit, 
  onRefresh, 
  bomData, 
  loading, 
  loadItemAttachments, 
  loadComponentAttachments 
}) => {
  const [expandedComponents, setExpandedComponents] = useState({});
  const [componentAttachments, setComponentAttachments] = useState({});
  const [loadingAttachments, setLoadingAttachments] = useState({});
  const [allAttachmentsLoaded, setAllAttachmentsLoaded] = useState(false);
  
  // Stati per i dialog e modali
  const [uploaderOpen, setUploaderOpen] = useState(false);
  const [currentUploadComponent, setCurrentUploadComponent] = useState(null);
  const [selectedAttachment, setSelectedAttachment] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Hook per le azioni sugli allegati
  const {
    downloadAttachment,
    downloadAllAttachmentsByItemCode,
    downloadAllAttachmentsByProjectItemId,
    deleteAttachment,
  } = useItemAttachmentsActions();

  // Usa useMemo per evitare ricreazioni inutili dell'array di componenti
  const componentsToLoad = useMemo(() => {
    if (!bomData?.components) return [];
    
    const getAllComponents = (components) => {
      let result = [];
      components.forEach(component => {
        result.push(component);
        if (component.children && component.children.length > 0) {
          result = result.concat(getAllComponents(component.children));
        }
      });
      return result;
    };
    
    return getAllComponents(bomData.components);
  }, [bomData?.components]);

  // Filtra i componenti che hanno allegati (inclusi i figli)
  const componentsWithAttachments = useMemo(() => {
    if (!bomData?.components) return [];
    
    const filterComponentsWithAttachments = (components) => {
      return components.filter(component => {
        const attachments = componentAttachments[component.ComponentId];
        const hasAttachments = attachments && attachments.length > 0;
        
        // Se il componente ha allegati, includilo
        if (hasAttachments) {
          return true;
        }
        
        // Se il componente ha figli con allegati, includilo
        if (component.children && component.children.length > 0) {
          const childrenWithAttachments = filterComponentsWithAttachments(component.children);
          if (childrenWithAttachments.length > 0) {
            // Aggiorna i children del componente per includere solo quelli con allegati
            component.children = childrenWithAttachments;
            return true;
          }
        }
        
        return false;
      });
    };
    
    return filterComponentsWithAttachments(bomData.components);
  }, [bomData?.components, componentAttachments]);

  // Memoizza la funzione di caricamento allegati per evitare re-creazioni
  const loadComponentAttachmentsData = useCallback(async (componentId, component) => {
    // Verifica se gli allegati sono già stati caricati o sono in caricamento
    if (componentAttachments[componentId] !== undefined || loadingAttachments[componentId]) {
      return;
    }

    try {
      setLoadingAttachments(prev => ({ ...prev, [componentId]: true }));
      
      let attachments = [];
      
      // Se è un articolo ERP (stato_erp = 1), usa il codice articolo
      if (component.stato_erp === 1 && component.ComponentItemCode) {
        attachments = await loadItemAttachments(component.ComponentItemCode);
      } 
      // Se è un articolo progetto (stato_erp = 0), usa l'ID componente
      else if (component.stato_erp === 0 && component.ComponentId) {
        attachments = await loadComponentAttachments(component.ComponentId, true);
      }
      
      setComponentAttachments(prev => ({
        ...prev,
        [componentId]: attachments || []
      }));
    } catch (error) {
      console.error('Error loading component attachments:', error);
      setComponentAttachments(prev => ({
        ...prev,
        [componentId]: []
      }));
    } finally {
      setLoadingAttachments(prev => ({ ...prev, [componentId]: false }));
    }
  }, [loadItemAttachments, loadComponentAttachments, componentAttachments, loadingAttachments]);

  // Carica gli allegati per tutti i componenti quando i dati BOM sono disponibili
  useEffect(() => {
    if (componentsToLoad.length === 0) {
      setAllAttachmentsLoaded(true);
      return;
    }

    const loadAllAttachments = async () => {
      setAllAttachmentsLoaded(false);
      
      for (const component of componentsToLoad) {
        if (component.ComponentId && componentAttachments[component.ComponentId] === undefined) {
          await loadComponentAttachmentsData(component.ComponentId, component);
        }
      }
      
      setAllAttachmentsLoaded(true);
    };

    loadAllAttachments();
  }, [componentsToLoad, loadComponentAttachmentsData, componentAttachments]);


  const toggleComponentExpansion = useCallback((componentId) => {
    setExpandedComponents(prev => ({
      ...prev,
      [componentId]: !prev[componentId]
    }));
  }, []);

  // Refresh degli allegati per un componente specifico
  const refreshComponentAttachments = useCallback(async (component) => {
    setComponentAttachments(prev => ({ ...prev, [component.ComponentId]: undefined }));
    await loadComponentAttachmentsData(component.ComponentId, component);
  }, [loadComponentAttachmentsData]);

  // Funzioni per gestire le azioni sugli allegati
  const handleUploadOpen = useCallback((component) => {
    setCurrentUploadComponent(component);
    setUploaderOpen(true);
  }, []);

  const handleUploadClose = useCallback(() => {
    setUploaderOpen(false);
    if (currentUploadComponent) {
      refreshComponentAttachments(currentUploadComponent);
    }
    setCurrentUploadComponent(null);
  }, [currentUploadComponent, refreshComponentAttachments]);

  const handleDownloadAttachment = useCallback((attachment) => {
    downloadAttachment(attachment.AttachmentID, attachment.FileName);
  }, [downloadAttachment]);

  const handleDownloadAllAttachments = useCallback((component) => {
    if (component.stato_erp === 1 && component.ComponentItemCode) {
      downloadAllAttachmentsByItemCode(component.ComponentItemCode);
    } else if (component.stato_erp === 0 && component.ComponentId) {
      downloadAllAttachmentsByProjectItemId(component.ComponentId);
    }
  }, [downloadAllAttachmentsByItemCode, downloadAllAttachmentsByProjectItemId]);

  const handleViewPreview = useCallback((attachment) => {
    setSelectedAttachment(attachment);
    setIsPreviewOpen(true);
  }, []);

  const handleViewDetails = useCallback((attachment) => {
    setSelectedAttachment(attachment);
    setDetailsOpen(true);
  }, []);

  const handleDeleteAttachment = useCallback(async (attachment, component) => {
    try {
      const result = await swal.fire({
        title: "Conferma eliminazione",
        text: `Sei sicuro di voler eliminare l'allegato "${attachment.FileName}"?`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Sì, elimina",
        cancelButtonText: "Annulla",
        confirmButtonColor: "#d33",
      });

      if (result.isConfirmed) {
        await deleteAttachment(attachment.AttachmentID);
        await refreshComponentAttachments(component);
        swal.fire("Eliminato!", "L'allegato è stato eliminato con successo.", "success");
      }
    } catch (error) {
      console.error("Errore nell'eliminazione dell'allegato:", error);
      swal.fire("Errore", "Si è verificato un errore durante l'eliminazione dell'allegato.", "error");
    }
  }, [deleteAttachment, refreshComponentAttachments]);

  // Funzione per ottenere icona e colori in base alla natura del componente
  const getNatureDetails = useCallback((nature) => {
    switch (nature) {
      case 22413312: // Semilavorato
        return {
          icon: <Package className="h-4 w-4" />,
          label: "Semilavorato",
          color: "bg-blue-100 text-blue-700 border-blue-200",
        };
      case 22413313: // Prodotto Finito
        return {
          icon: <Package className="h-4 w-4" />,
          label: "Prodotto Finito",
          color: "bg-green-100 text-green-700 border-green-200",
        };
      case 22413314: // Acquisto
        return {
          icon: <ShoppingCart className="h-4 w-4" />,
          label: "Acquisto",
          color: "bg-amber-100 text-amber-700 border-amber-200",
        };
      default:
        return {
          icon: <Package className="h-4 w-4" />,
          label: "Altro",
          color: "bg-gray-100 text-gray-700 border-gray-200",
        };
    }
  }, []);

  // Funzione per ottenere icona e colori in base allo stato del componente
  const getStatusDetails = useCallback((statusCode) => {
    switch (statusCode) {
      case "BOZZA":
        return {
          icon: <AlertCircle className="h-4 w-4" />,
          color: "bg-gray-100 text-gray-700 border-gray-200",
        };
      case "IN_PROD":
        return {
          icon: <CheckCircle className="h-4 w-4" />,
          color: "bg-blue-100 text-blue-700 border-blue-200",
        };
      case "DEL":
        return {
          icon: <CircleSlash className="h-4 w-4" />,
          color: "bg-red-100 text-red-700 border-red-200",
        };
      case "STDBY":
        return {
          icon: <TimerOff className="h-4 w-4" />,
          color: "bg-amber-100 text-amber-700 border-amber-200",
        };
      default:
        return {
          icon: <AlertCircle className="h-4 w-4" />,
          color: "bg-gray-100 text-gray-700 border-gray-200",
        };
    }
  }, []);

  // Formatta dimensione file
  const formatBytes = useCallback((bytes, decimals = 2) => {
    if (!bytes) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  }, []);

  // Componente per renderizzare gli allegati in modo minimal
  const AttachmentsSection = useCallback(({ attachments, component, isLoading }) => {
    if (isLoading) {
      return (
        <div className="mt-1 ml-4">
          <div className="border-l-2 border-blue-400 pl-2 py-1 bg-blue-50 rounded-sm w-50">
            <div className="flex items-center py-1">
              <div className="animate-spin rounded-full h-3 w-3 border border-blue-600 border-t-transparent"></div>
              <span className="ml-2 text-xs text-gray-600">Caricamento...</span>
            </div>
          </div>
        </div>
      );
    }

    if (!attachments || attachments.length === 0) {
      return null;
    }

    return (
      <div className="mt-1 ml-4">
        <div className="border-l-2 border-blue-400 pl-2 py-1 bg-blue-50 rounded-sm w-50">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2">
              <Paperclip className="h-3 w-3 text-blue-600" />
              <span className="text-xs font-medium text-blue-700">
                Allegati ({attachments.length})
              </span>
            </div>
            <div className="flex items-center gap-1">
              {canEdit && (
                <>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-6 px-2 text-xs"
                    onClick={() => handleUploadOpen(component)}
                  >
                    <Upload className="h-3 w-3 mr-1" />
                    Carica
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-6 px-2 text-xs"
                    onClick={() => handleDownloadAllAttachments(component)}
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Tutti
                  </Button>
                </>
              )}
            </div>
          </div>
          
          <div className="space-y-0.5 max-h-48 overflow-y-auto">
            {attachments.map((attachment) => (
              <div key={attachment.AttachmentID} className="flex items-center justify-between py-0.5 px-1 hover:bg-blue-100 rounded text-xs">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <FileText className="h-3 w-3 text-gray-500 shrink-0" />
                  <span className="truncate text-gray-700 text-xs">
                    {attachment.FileName}
                  </span>
                  <span className="text-xs text-gray-500 shrink-0">
                    {formatBytes(attachment.FileSizeKB * 1024)}
                  </span>
                </div>
                <div className="flex items-center gap-0.5 ml-2">
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-4 w-4 p-0"
                    onClick={() => handleDownloadAttachment(attachment)}
                    title="Scarica"
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-4 w-4 p-0"
                    onClick={() => handleViewPreview(attachment)}
                    title="Visualizza"
                  >
                    <Eye className="h-3 w-3" />
                  </Button>
                  {canEdit && (
                    <>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-4 w-4 p-0"
                        onClick={() => handleViewDetails(attachment)}
                        title="Modifica"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="ghost" className="h-4 w-4 p-0" title="Altro">
                            <MoreVertical className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-32">
                          <DropdownMenuItem 
                            className="text-xs py-1"
                            onClick={() => handleViewDetails(attachment)}
                          >
                            <Info className="h-3 w-3 mr-2" />
                            Dettagli
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-xs py-1 text-red-600"
                            onClick={() => handleDeleteAttachment(attachment, component)}
                          >
                            <Trash2 className="h-3 w-3 mr-2" />
                            Elimina
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }, [canEdit, formatBytes, handleUploadOpen, handleDownloadAttachment, handleDownloadAllAttachments, handleViewPreview, handleViewDetails, handleDeleteAttachment]);

  // Componente per renderizzare un singolo componente della BOM
  const BOMComponent = useCallback(({ component, level = 0 }) => {
    const natureDetails = getNatureDetails(component.ComponentNature);
    const statusDetails = getStatusDetails(component.StatusCode);
    const isExpanded = expandedComponents[component.ComponentId];
    const hasChildren = component.children && component.children.length > 0;
    const hasRouting = component.routing && component.routing.length > 0;
    
    // Ottieni gli allegati per questo componente
    const attachmentsForComponent = componentAttachments[component.ComponentId] || [];
    const isLoadingAttachments = loadingAttachments[component.ComponentId];
    const hasAttachments = attachmentsForComponent.length > 0;

    return (
      <div className={`ml-${level * 4} border-l-2 border-gray-200 pl-4 mb-2`}>
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3 flex-1">
            {/* Icona espansione */}
            {hasChildren && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleComponentExpansion(component.ComponentId)}
                className="h-6 w-6 p-0"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            )}

            {/* Informazioni componente */}
            <div className="flex items-center gap-3">
              {/* Sinistra: Codice e icona ERP */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="font-medium text-sm">
                  {component.ComponentItemCode || component.Item}
                </span>
                {component.stato_erp == '1' && (
                  <Database className="h-3 w-3 text-blue-500" />
                )}
              </div>
              
              {/* Centro: Descrizione */}
              <div className="text-xs text-gray-600 flex-1 text-center px-2">
                {component.ComponentItemDescription}
              </div>

              {/* Destra: Badge gruppo - sempre a destra */}
              <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
                {/* Natura */}
                <Badge className={`flex items-center gap-1 ${natureDetails.color}`}>
                  {natureDetails.icon}
                  <span className="text-xs">{natureDetails.label}</span>
                </Badge>

                {/* Quantità */}
                <Badge variant="outline" className="text-xs">
                  Qty: {component.Quantity} {component.UoM}
                </Badge>

                {/* Badge allegati */}
                {hasAttachments && (
                  <Badge variant="outline" className="flex items-center gap-1 text-xs">
                    <Paperclip className="h-3 w-3" />
                    {attachmentsForComponent.length}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Azioni */}
          <div className="flex items-center gap-1">
            {/* Pulsante routing */}
            {hasRouting && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                title="Mostra fasi di lavoro"
              >
                <Wrench className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Allegati del componente */}
        {(hasAttachments || isLoadingAttachments) && (
          <AttachmentsSection 
            attachments={attachmentsForComponent}
            component={component}
            isLoading={isLoadingAttachments}
          />
        )}

        {/* Routing del componente */}
        {hasRouting && (
          <div className="mt-2 ml-4">
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="p-3">
                <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                  <Wrench className="h-4 w-4" />
                  Fasi di Lavoro ({component.routing.length})
                </h4>
                
                <div className="space-y-1">
                  {component.routing.map((routing, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs bg-gray-50 p-2 rounded">
                      <span>{routing.OperationDescription}</span>
                      <span className="text-gray-500">
                        {routing.ProcessingTime}min
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Componenti figli */}
        {isExpanded && hasChildren && (
          <div className="mt-2">
            {component.children.map((child) => (
              <BOMComponent
                key={child.ComponentId}
                component={child}
                level={level + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  }, [expandedComponents, toggleComponentExpansion, getNatureDetails, getStatusDetails, componentAttachments, loadingAttachments, AttachmentsSection]);

  if (loading) {
    return (
      <div className="p-4">
        <div className="border rounded-lg h-96 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto"></div>
            <p className="text-sm text-gray-500 mt-2">Caricamento struttura BOM...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!bomData || !bomData.components || bomData.components.length === 0) {
    return (
      <div className="p-4">
        <div className="border rounded-lg h-96 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <Package className="h-6 w-6 mx-auto mb-1" />
            <p className="text-sm">
              {bomData?.message || 'Nessuna distinta base trovata per questo articolo'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      {!allAttachmentsLoaded ? (
        <div className="border rounded-lg h-96 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto"></div>
            <p className="text-sm text-gray-500 mt-2">Caricamento documenti allegati...</p>
          </div>
        </div>
      ) : componentsWithAttachments.length > 0 ? (
        <ScrollArea className="h-96 border rounded-lg">
          <div className="space-y-2 p-2">
            {/* Indicatore scroll per molti documenti */}
            {componentsWithAttachments.length > 3 && (
              <div className="text-xs text-gray-400 text-center py-1 border-b border-gray-100">
                📄 {componentsWithAttachments.length} componenti con documenti - scorri per vedere tutti
              </div>
            )}
            {componentsWithAttachments.map((component) => (
              <BOMComponent
                key={component.ComponentId}
                component={component}
                level={0}
              />
            ))}
          </div>
        </ScrollArea>
      ) : (
        <div className="border rounded-lg py-4 text-center text-gray-500">
          <FileText className="h-6 w-6 mx-auto mb-1" />
          <p className="text-sm">Nessun documento allegato</p>
        </div>
      )}

      {/* Uploader per allegati */}
      {uploaderOpen && currentUploadComponent && (
        <ItemAttachmentUploader
          open={uploaderOpen}
          onClose={handleUploadClose}
          itemCode={currentUploadComponent.stato_erp === 1 ? currentUploadComponent.ComponentItemCode : null}
          projectItemId={currentUploadComponent.stato_erp === 0 ? currentUploadComponent.ComponentId : null}
          onUploadComplete={handleUploadClose}
        />
      )}

      {/* Dialog dettagli allegato */}
      {detailsOpen && selectedAttachment && (
        <ItemAttachmentDetails
          open={detailsOpen}
          attachment={selectedAttachment}
          onClose={() => {
            setDetailsOpen(false);
            setSelectedAttachment(null);
          }}
          readOnly={!canEdit}
        />
      )}

      {/* FileViewer per la preview dell'allegato */}
      {isPreviewOpen && selectedAttachment && (
        <FileViewer
          file={{
            AttachmentID: selectedAttachment.AttachmentID,
            FileName: selectedAttachment.FileName,
            FileType: selectedAttachment.FileType,
            FilePath: selectedAttachment.FilePath,
            ItemCode: selectedAttachment.ItemCode,
          }}
          isOpen={isPreviewOpen}
          onClose={() => {
            setIsPreviewOpen(false);
            setSelectedAttachment(null);
          }}
        />
      )}
    </div>
  );
};

export default ArticleBOMExpansion;