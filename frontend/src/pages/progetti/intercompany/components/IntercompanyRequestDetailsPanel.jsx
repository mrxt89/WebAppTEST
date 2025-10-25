import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import {
  X,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  RefreshCw,
  Building2,
  Package,
  FileText,
  Download,
  Eye,
  MoreVertical,
  Upload,
  MessageCircle,
  Pin,
  PinOff,
  Info,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import FileViewer from "@/components/ui/fileViewer";
import ItemAttachmentVersions from "@/components/itemAttachments/ItemAttachmentVersions";
import IntercompanyChatsTab from "./IntercompanyChatsTab";
import useProjectArticlesActions from "@/hooks/useProjectArticlesActions";
import { format } from "date-fns";
import { it } from "date-fns/locale";

const IntercompanyRequestDetailsPanel = ({
  selectedRequest,
  isOpen,
  onClose,
  onRefresh,
  position = "right",
  defaultWidth = 800,
  minWidth = 500,
  maxWidth = 1200,
  topOffset = null,
}) => {
  const panelRef = useRef(null);
  const resizeRef = useRef(null);
  const dragControls = useDragControls();
  
  // Stati principali
  const [activeTab, setActiveTab] = useState("information");
  const [panelWidth, setPanelWidth] = useState(position === "right" ? defaultWidth : defaultWidth);
  const [isResizing, setIsResizing] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [panelPosition, setPanelPosition] = useState(position);
  
  // Stati per animazioni e transizioni
  const [isClosing, setIsClosing] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  
  // Stati per i dati
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailAttachments, setDetailAttachments] = useState([]);
  const [detailReference, setDetailReference] = useState(null);
  const [requestNotes, setRequestNotes] = useState('');
  const [detailResponseNotes, setDetailResponseNotes] = useState('');
  const [selectedAttachment, setSelectedAttachment] = useState(null);
  const [fileViewerOpen, setFileViewerOpen] = useState(false);
  const [versionsModalOpen, setVersionsModalOpen] = useState(false);

  const { getReferenceAttachments, updateReferenceNotes, getReferenceWithProjects } = useProjectArticlesActions();
  const { toast } = useToast();

  // Carica i dettagli quando si apre il panel
  const loadDetails = useCallback(async () => {
    if (!selectedRequest) return;

    try {
      setDetailLoading(true);

      // Carica riferimenti con informazioni progetti
      const refRes = await getReferenceWithProjects(selectedRequest.ReferenceId);
      setDetailReference(refRes.reference || null);

      // Carica anche gli allegati
      const attRes = await getReferenceAttachments(selectedRequest.ReferenceId);
      setDetailAttachments(attRes.attachments || []);

      // Imposta le note in base alla reference
      if (refRes.reference) {
        setRequestNotes(refRes.reference.RequestNotes || '');
        setDetailResponseNotes(refRes.reference.ResponseNotes || '');
      } else {
        // Fallback: usa le note dalla richiesta se la reference non è disponibile
        setRequestNotes(selectedRequest.Notes || '');
        setDetailResponseNotes(selectedRequest.ResponseNotes || '');
      }
    } catch (e) {
      console.error('Error loading details:', e);
      toast({ variant: 'destructive', title: 'Errore', description: 'Impossibile caricare i dettagli' });
    } finally {
      setDetailLoading(false);
    }
  }, [selectedRequest, getReferenceAttachments, getReferenceWithProjects, toast]);

  // Carica i dettagli quando cambia la richiesta selezionata
  useEffect(() => {
    if (selectedRequest && isOpen) {
      loadDetails();
    }
  }, [selectedRequest, isOpen, loadDetails]);

  // Gestione apertura/chiusura
  useEffect(() => {
    if (isOpen) {
      setShowContent(true);
      setIsClosing(false);
    } else {
      setIsClosing(true);
      setTimeout(() => {
        setShowContent(false);
      }, 300);
    }
  }, [isOpen]);

  // Funzioni per gestire gli allegati
  const handleViewAttachment = (attachment) => {
    setSelectedAttachment(attachment);
    setFileViewerOpen(true);
  };

  const handleDownloadAttachment = (attachment) => {
    // Implementa download
    const link = document.createElement('a');
    link.href = attachment.FilePath;
    link.download = attachment.FileName;
    link.click();
  };

  const handleAttachmentVersions = (attachment) => {
    setSelectedAttachment(attachment);
    setVersionsModalOpen(true);
  };

  const canEditAttachment = (attachment) => {
    // Implementa logica per verificare se l'utente può modificare l'allegato
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return parseInt(user.CompanyId) === parseInt(attachment.OwnerCompanyId);
  };

  const canViewAttachmentVersions = (attachment) => {
    // L'utente può visualizzare le versioni se:
    // 1. È il proprietario dell'allegato
    // 2. È l'azienda target della richiesta intercompany (destinatario della condivisione)
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isOwner = parseInt(user.CompanyId) === parseInt(attachment.OwnerCompanyId);
    const isTargetCompany = selectedRequest && parseInt(user.CompanyId) === parseInt(selectedRequest.TargetCompanyId);
    const isSourceCompany = selectedRequest && parseInt(user.CompanyId) === parseInt(selectedRequest.SourceCompanyId);

    // Può visualizzare se è proprietario o se è coinvolto nella richiesta intercompany
    return isOwner || isTargetCompany || isSourceCompany;
  };

  const canEditNotes = (noteType) => {
    if (!selectedRequest) return false;
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (noteType === 'request') {
      return parseInt(user.CompanyId) === parseInt(selectedRequest.SourceCompanyId);
    } else {
      return parseInt(user.CompanyId) === parseInt(selectedRequest.TargetCompanyId);
    }
  };

  const saveDetailNotes = async (noteType) => {
    if (!selectedRequest) return;
    
    const notes = noteType === 'request' ? requestNotes : detailResponseNotes;
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    try {
      const res = await updateReferenceNotes(selectedRequest.ReferenceId, user.CompanyId, notes);
      if (!res.success) throw new Error(res.msg);
      
      toast({ 
        title: 'Note aggiornate', 
        description: `${noteType === 'request' ? 'Note richiesta' : 'Note risposta'} salvate con successo` 
      });
      
      // Aggiorna la reference locale se disponibile
      if (detailReference) {
        setDetailReference(prev => ({
          ...prev,
          [noteType === 'request' ? 'RequestNotes' : 'ResponseNotes']: notes
        }));
      }
      
      // Refresh della lista
      if (onRefresh) {
        onRefresh();
      }
    } catch (e) {
      toast({ variant: 'destructive', title: 'Errore', description: e.message || 'Aggiornamento note fallito' });
    }
  };

  const getCompanyName = (companyId) => {
    if (!selectedRequest) return '';
    if (parseInt(companyId) === parseInt(selectedRequest.SourceCompanyId)) {
      return selectedRequest.SourceCompanyName;
    }
    if (parseInt(companyId) === parseInt(selectedRequest.TargetCompanyId)) {
      return selectedRequest.TargetCompanyName;
    }
    return '';
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'PENDING': { variant: 'warning', label: 'In Attesa' },
      'APPROVED': { variant: 'default', label: 'Approvata' },
      'REJECTED': { variant: 'destructive', label: 'Rifiutata' },
    };
    const config = statusConfig[status] || { variant: 'secondary', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatFileSize = (sizeKB) => {
    if (!sizeKB) return '0 KB';
    if (sizeKB < 1024) return `${sizeKB} KB`;
    return `${(sizeKB / 1024).toFixed(1)} MB`;
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  if (!isOpen || !selectedRequest) return null;

  return (
    <>
    <AnimatePresence>
      {showContent && (
        <motion.div
          ref={panelRef}
          initial={{ opacity: 0, x: position === "right" ? 300 : -300 }}
          animate={{ 
            opacity: isClosing ? 0 : 1, 
            x: isClosing ? (position === "right" ? 300 : -300) : 0 
          }}
          exit={{ opacity: 0, x: position === "right" ? 300 : -300 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className={`fixed ${position === "right" ? "right-0" : "left-0"} h-full bg-white border-l border-gray-200 shadow-2xl z-[1050] flex flex-col`}
          style={{
            width: isMinimized ? 60 : panelWidth,
            maxWidth: isFullscreen ? "100vw" : maxWidth,
            minWidth: isMinimized ? 60 : minWidth,
            top: topOffset || 0,
            height: topOffset ? `calc(100vh - ${topOffset}px)` : "100vh",
          }}
        >
          {/* Header */}
          <div className="flex-shrink-0 border-b border-gray-200 bg-gray-50 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                ref={resizeRef}
                className="cursor-col-resize p-1 hover:bg-gray-200 rounded"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setIsResizing(true);
                }}
              >
                <GripVertical className="w-4 h-4 text-gray-500" />
              </div>
              
              {!isMinimized && (
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  <div>
                    <h3 className="font-semibold text-sm">Dettagli Richiesta</h3>
                    <p className="text-xs text-gray-500">{selectedRequest.ComponentCode}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1">
              {!isMinimized && (
                <>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setIsPinned(!isPinned)}
                          className="h-8 w-8 p-0"
                        >
                          {isPinned ? <Pin className="w-4 h-4" /> : <PinOff className="w-4 h-4" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {isPinned ? "Sblocca pannello" : "Blocca pannello"}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setIsFullscreen(!isFullscreen)}
                          className="h-8 w-8 p-0"
                        >
                          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {isFullscreen ? "Riduci" : "Ingrandisci"}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </>
              )}

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsMinimized(!isMinimized)}
                      className="h-8 w-8 p-0"
                    >
                      {isMinimized ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isMinimized ? "Espandi" : "Riduci"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <Button
                size="sm"
                variant="ghost"
                onClick={handleClose}
                className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Content */}
          {!isMinimized && (
            <div className="flex-1 overflow-hidden">
              {detailLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="flex items-center gap-2 text-gray-500">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Caricamento...
                  </div>
                </div>
              ) : (
                <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                  <div className="flex-shrink-0 px-4 pt-4">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="information">Informazioni</TabsTrigger>
                      <TabsTrigger value="attachments">Allegati</TabsTrigger>
                      <TabsTrigger value="chats">Chat</TabsTrigger>
                    </TabsList>
                  </div>

                  <div className="flex-1 overflow-hidden">
                    <TabsContent value="information" className="h-full overflow-y-auto p-4 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-gray-600">Componente</div>
                          <div className="font-medium">{selectedRequest.ComponentCode}</div>
                          <div className="flex items-center gap-1 text-xs">
                            {selectedRequest.TargetProjectItemCode ? (
                              <>
                                <span className="text-gray-500">→</span>
                                <span className={`font-medium ${selectedRequest.TargetProjectItemCode?.startsWith('IC_TEMP_') ? 'text-amber-600' : 'text-green-600'}`}>
                                  {selectedRequest.TargetProjectItemCode}
                                </span>
                                {selectedRequest.TargetProjectItemCode?.startsWith('IC_TEMP_') && (
                                  <Badge variant="warning" className="text-[10px] px-1 py-0">TEMP</Badge>
                                )}
                              </>
                            ) : (
                              <span className="text-gray-400">(codice fornitore non configurato)</span>
                            )}
                            <button
                              type="button"
                              className="text-gray-400 hover:text-gray-600"
                              onClick={() => setShowInfoModal(true)}
                              title="Informazioni sul codice articolo fornitore"
                            >
                              <Info className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="text-xs text-gray-500">{selectedRequest.ComponentDescription}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">Stato</div>
                          <div>{getStatusBadge(selectedRequest.Status)}</div>
                        </div>
                      </div>

                      {/* Warning per codici temporanei */}
                      {detailReference?.TargetProjectItemCode?.startsWith('IC_TEMP_') && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                          <div className="flex items-start gap-2">
                            <Package className="w-4 h-4 text-amber-600 mt-0.5" />
                            <div className="flex-1">
                              <div className="text-sm font-medium text-amber-900">Codice Articolo Temporaneo</div>
                              <div className="text-xs text-amber-700 mt-1">
                                Questo articolo è stato creato con un codice temporaneo.
                                Sostituiscilo con il codice definitivo dalla sezione "Articoli Temporanei" nella Dashboard Intercompany.
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Informazioni Progetti */}
                      {(detailReference?.SourceProjectId || detailReference?.TargetProjectId) && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-3">
                          <div className="text-sm font-medium text-blue-900">Informazioni Progetti</div>

                          {detailReference?.SourceProjectId && (
                            <div className="space-y-1">
                              <div className="text-xs text-blue-700 font-medium">Progetto Sorgente</div>
                              <div className="text-sm text-blue-900">
                                {detailReference.SourceProjectName || `Progetto ID: ${detailReference.SourceProjectId}`}
                              </div>
                              {detailReference.SourceProjectDescription && (
                                <div className="text-xs text-blue-600">{detailReference.SourceProjectDescription}</div>
                              )}
                            </div>
                          )}

                          {detailReference?.TargetProjectId && (
                            <div className="space-y-1 border-t border-blue-200 pt-2">
                              <div className="text-xs text-blue-700 font-medium">Progetto Target</div>
                              <div className="text-sm text-blue-900">
                                {detailReference.TargetProjectName || `Progetto ID: ${detailReference.TargetProjectId}`}
                              </div>
                              {detailReference.TargetProjectDescription && (
                                <div className="text-xs text-blue-600">{detailReference.TargetProjectDescription}</div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Sezione Note Richiesta */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-sm font-medium">
                            Note Richiesta
                            <span className="text-xs text-gray-500 ml-2">
                              ({getCompanyName(selectedRequest?.SourceCompanyId)})
                            </span>
                          </div>
                          {canEditNotes('request') && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => saveDetailNotes('request')}
                              className="h-7 text-xs"
                            >
                              Salva
                            </Button>
                          )}
                        </div>
                        <Textarea 
                          value={requestNotes} 
                          onChange={(e) => setRequestNotes(e.target.value)} 
                          rows={3}
                          placeholder={canEditNotes('request') ? "Aggiungi note per la richiesta..." : "Nessuna nota di richiesta"}
                          disabled={!canEditNotes('request')}
                          className={!canEditNotes('request') ? 'bg-gray-50' : ''}
                        />
                      </div>

                      {/* Sezione Note Risposta */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-sm font-medium">
                            Note Risposta
                            <span className="text-xs text-gray-500 ml-2">
                              ({getCompanyName(selectedRequest?.TargetCompanyId)})
                            </span>
                          </div>
                          {canEditNotes('response') && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => saveDetailNotes('response')}
                              className="h-7 text-xs"
                            >
                              Salva
                            </Button>
                          )}
                        </div>
                        <Textarea 
                          value={detailResponseNotes} 
                          onChange={(e) => setDetailResponseNotes(e.target.value)} 
                          rows={3}
                          placeholder={canEditNotes('response') ? "Aggiungi note per la risposta..." : "Nessuna nota di risposta"}
                          disabled={!canEditNotes('response')}
                          className={!canEditNotes('response') ? 'bg-gray-50' : ''}
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="attachments" className="h-full overflow-y-auto p-4">
                      <div className="text-sm font-medium mb-3">Allegati condivisi</div>
                      {detailAttachments.length === 0 ? (
                        <div className="text-sm text-gray-500 text-center py-8">Nessun allegato</div>
                      ) : (
                        <div className="space-y-2">
                          {detailAttachments.map((attachment) => (
                            <div key={attachment.AttachmentID} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <FileText className="w-5 h-5 text-gray-500 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm truncate">{attachment.FileName}</div>
                                  <div className="text-xs text-gray-500">
                                    {formatFileSize(attachment.FileSizeKB)} • 
                                    {attachment.UploadedAt ? format(new Date(attachment.UploadedAt), 'dd/MM/yyyy HH:mm', { locale: it }) : '-'} • 
                                    Da {attachment.UploadedByFullName || attachment.UploadedByUsername}
                                    {attachment.OwnerCompanyName && ` (${attachment.OwnerCompanyName})`}
                                  </div>
                                  {attachment.Description && (
                                    <div className="text-xs text-gray-600 mt-1">{attachment.Description}</div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleViewAttachment(attachment)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDownloadAttachment(attachment)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                                {canViewAttachmentVersions(attachment) && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                                        <MoreVertical className="w-4 h-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => handleViewAttachment(attachment)}>
                                        <Eye className="w-4 h-4 mr-2" />
                                        Visualizza
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleDownloadAttachment(attachment)}>
                                        <Download className="w-4 h-4 mr-2" />
                                        Scarica
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleAttachmentVersions(attachment)}>
                                        <Upload className="w-4 h-4 mr-2" />
                                        {canEditAttachment(attachment) ? 'Gestisci versioni' : 'Visualizza versioni'}
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="chats" className="h-full overflow-hidden p-4">
                      <IntercompanyChatsTab 
                        selectedRequest={selectedRequest}
                        onRefresh={onRefresh}
                      />
                    </TabsContent>
                  </div>
                </Tabs>
              )}
            </div>
          )}

          {/* FileViewer */}
          {fileViewerOpen && selectedAttachment && (
            <FileViewer
              file={{
                AttachmentID: selectedAttachment.AttachmentID,
                FileName: selectedAttachment.FileName,
                FileType: selectedAttachment.FileType,
                FilePath: selectedAttachment.FilePath,
                ItemCode: selectedAttachment.ItemCode,
                ProjectItemId: selectedAttachment.ProjectItemId,
              }}
              isOpen={fileViewerOpen}
              onClose={() => {
                setFileViewerOpen(false);
                setSelectedAttachment(null);
              }}
            />
          )}

          {/* Modal per gestione versioni allegati */}
          {versionsModalOpen && selectedAttachment && (
            <ItemAttachmentVersions
              open={versionsModalOpen}
              attachment={selectedAttachment}
              onClose={() => {
                setVersionsModalOpen(false);
                setSelectedAttachment(null);
              }}
              readOnly={!canEditAttachment(selectedAttachment)}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>

    {/* Modal informativo */}
    <Dialog open={showInfoModal} onOpenChange={setShowInfoModal}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-600" />
            Codice Articolo Fornitore
          </DialogTitle>
          <DialogDescription>
            Come funziona il collegamento tra codici articolo cliente e fornitore
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-sm mb-2">📋 Configurazione nel Gestionale Mago</h4>
            <p className="text-sm text-gray-700">
              Per collegare automaticamente i codici articolo tra cliente e fornitore, 
              è necessario configurare il campo <strong>"Codifica presso il fornitore"</strong> 
              nella scheda <strong>"Fornitori dell'articolo"</strong> del gestionale Mago.
            </p>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="font-medium text-sm mb-2">✅ Quando è configurato</h4>
            <p className="text-sm text-gray-700">
              Se il collegamento è configurato, vedrai il codice fornitore accanto al codice cliente 
              con una freccia verde: <span className="text-green-600 font-mono">→ CODICE_FORNITORE</span>
            </p>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-sm mb-2">⚠️ Quando non è configurato</h4>
            <p className="text-sm text-gray-700">
              Se il collegamento non è configurato, vedrai il messaggio 
              <span className="text-gray-500 italic"> "(codice fornitore non configurato)"</span>
            </p>
          </div>
          
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h4 className="font-medium text-sm mb-2">🔧 Come configurare</h4>
            <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
              <li>Apri il gestionale Mago</li>
              <li>Vai alla scheda dell'articolo</li>
              <li>Apri la sezione "Fornitori dell'articolo"</li>
              <li>Inserisci il codice fornitore nel campo "Codifica presso il fornitore"</li>
              <li>Salva le modifiche</li>
            </ol>
          </div>
        </div>
        
        <DialogFooter>
          <Button onClick={() => setShowInfoModal(false)} variant="outline">
            Chiudi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default IntercompanyRequestDetailsPanel;
