import React, { useState, useRef, useEffect, forwardRef } from 'react';
import { 
  ChevronRight, ChevronLeft, Paperclip, Download, Trash2, 
  Search, Filter, MessageSquare, ArrowLeftRight, Calendar, 
  File, FileText, Image, Zap, ZapOff, Plus, Clock,
  CheckSquare, X, Edit, Link, ExternalLink, Unlink
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotifications } from '@/redux/features/notifications/notificationsHooks';
import FileViewer from '../ui/fileViewer';
import { swal } from '../../lib/common';
import useAIActions from '../../hooks/useAIActions';
import DocumentLinker from './DocumentLinker';

const ChatSidebar = forwardRef((props, ref) => {
  const { 
    notificationId, 
    visible = true, 
    onToggle,
    isMobile = false,
    hexColor,
    messages,
    users,
    currentUserId,
    selectedMessageId,
    selectedMessageText
  } = props;

  const [activeTab, setActiveTab] = useState('attachments');
  const [selectedFile, setSelectedFile] = useState(null);
  const [newHighlightText, setNewHighlightText] = useState('');
  const [showHighlightInput, setShowHighlightInput] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [documentLinkerOpen, setDocumentLinkerOpen] = useState(false);

  const { 
    // Allegati
    getNotificationAttachments, 
    downloadNotificationAttachment, 
    deleteNotificationAttachment,
    refreshAttachments,
    
    // Punti importanti
    highlights,
    loadingHighlights,
    fetchHighlights,
    addHighlight,
    removeHighlight,
    generateHighlights, 

    // Funzioni per i documenti
    getLinkedDocuments,
    unlinkDocument,
    removeUserFromChat 
  } = useNotifications();

  const { 
    generateConversationSummary, 
    loading: aiLoading 
  } = useAIActions();
  
  const [attachments, setAttachments] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Reference per gestire l'overflow e gli input
  const containerRef = useRef(null);
  const highlightInputRef = useRef(null);
  
  // Usa il colore della categoria o un colore predefinito
  const categoryColor = hexColor || '#3b82f6';
  
  // Carica gli allegati all'inizio e quando cambia la tab o la notifica
  useEffect(() => {
    const handleAttachmentsUpdate = (event) => {
      if (activeTab === 'attachments' && notificationId) {
        setLoading(true);
        getNotificationAttachments(notificationId)
        .then(data => {
          if (Array.isArray(data)) {
            setAttachments(data);
          } else {
            setAttachments([]);
          }
        })
        .catch(err => {
          console.error('Error loading attachments:', err);
          setAttachments([]);
        })
        .finally(() => {
          setLoading(false);
        });
      }
      if (activeTab === 'documents' && notificationId) {
        setLoading(true);
        getLinkedDocuments(notificationId)
        .then(data => {
          setDocuments(Array.isArray(data) ? data : []);
        })
        .catch(err => {
          console.error('Error loading documents:', err);
          setDocuments([]);
        })
        .finally(() => {
          setLoading(false);
        });
      }
    };

    handleAttachmentsUpdate();

    document.addEventListener('attachments-updated', handleAttachmentsUpdate);
    document.addEventListener('new-message-received', handleAttachmentsUpdate);
    return () => {
      document.removeEventListener('attachments-updated', handleAttachmentsUpdate);
      document.removeEventListener('new-message-received', handleAttachmentsUpdate);
    };
  }, [activeTab, notificationId, getNotificationAttachments]);

  // useEffect per caricare i documenti quando si apre la tab
  useEffect(() => {
    // Funzione per aggiornare i documenti quando vengono modificati
    const handleDocumentChange = () => {
      if (activeTab === 'documents' && notificationId) {
        setLoading(true);
        getLinkedDocuments(notificationId)
          .then(response => {
            if (response && response.documents) {
              setDocuments(response.documents);
            } else {
              setDocuments([]);
            }
          })
          .catch(error => {
            console.error('Error refreshing documents:', error);
          })
          .finally(() => {
            setLoading(false);
          });
      }
    };
  
    // Aggiungi listener per gli eventi di collegamento/scollegamento
    document.addEventListener('document-linked', handleDocumentChange);
    document.addEventListener('document-unlinked', handleDocumentChange);
    
    // Rimuovi i listener quando il componente viene smontato
    return () => {
      document.removeEventListener('document-linked', handleDocumentChange);
      document.removeEventListener('document-unlinked', handleDocumentChange);
    };
  }, [activeTab, notificationId, getLinkedDocuments]);
  
  
  // Carica i punti importanti quando si accede alla tab o cambia la notifica
  useEffect(() => {
    if (activeTab === 'highlights' && notificationId) {
      fetchHighlights(notificationId).catch(console.error);
    }
  }, [activeTab, notificationId, fetchHighlights]);
  
  useEffect(() => {
    if (showHighlightInput && highlightInputRef.current) {
      highlightInputRef.current.focus();
    }
  }, [showHighlightInput]);
  
  // Funzione per determinare l'icona in base al tipo di file
  const getFileIcon = (fileType) => {
    if (fileType?.startsWith('image/')) {
      return <Image className="h-5 w-5 text-blue-500" />;
    }
    if (fileType?.includes('pdf')) {
      return <FileText className="h-5 w-5 text-red-500" />;
    }
    if (fileType?.includes('word') || fileType?.includes('document')) {
      return <FileText className="h-5 w-5 text-blue-700" />;
    }
    if (fileType?.includes('excel') || fileType?.includes('spreadsheet')) {
      return <FileText className="h-5 w-5 text-green-600" />;
    }
    return <File className="h-5 w-5 text-gray-500" />;
  };
  
  // Gestione allegati
  const handleDownload = (attachment) => {
    downloadNotificationAttachment(attachment.AttachmentID, attachment.FileName);
  };
  
  const handleViewAttachment = (attachment) => {
    setSelectedFile(attachment);
  };
  
  const handleDeleteAttachment = async (attachmentId) => {
    try {
      // Chiedi conferma prima di eliminare
      const { isConfirmed } = await swal.fire({
        title: 'Conferma eliminazione',
        text: 'Sei sicuro di voler eliminare questo allegato?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sì, elimina',
        cancelButtonText: 'Annulla'
      });
      
      if (isConfirmed) {
        await deleteNotificationAttachment(attachmentId);
        // Aggiorna la lista degli allegati
        const updatedAttachments = await refreshAttachments(notificationId);
        setAttachments(updatedAttachments || []);
        swal.fire('Eliminato!', 'L\'allegato è stato eliminato.', 'success');
        // Aggiorna gli allegati
        getNotificationAttachments(notificationId)
        .then(data => {
          if (Array.isArray(data)) {
            setAttachments(data);
          } else {
            setAttachments([]);
          }
        })
        .catch(err => {
          console.error('Error loading attachments:', err);
          setAttachments([]);
        })
        .finally(() => {
          setLoading(false);
        });
      }
    } catch (error) {
      console.error('Error deleting attachment:', error);
      swal.fire('Errore', 'Si è verificato un errore durante l\'eliminazione.', 'error');
    }
  };
  
  
  // Gestione punti importanti
  const handleAddHighlight = async () => {
    if (!newHighlightText.trim()) {
      swal.fire('Attenzione', 'Inserisci il testo', 'warning');
      return;
    }
    
    try {
      await addHighlight(notificationId, newHighlightText, false);
      setNewHighlightText('');
      setShowHighlightInput(false);
      swal.fire({
        title: 'Punto aggiunto',
        icon: 'success',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
      });
    } catch (error) {
      console.error('Error adding highlight:', error);
      swal.fire('Errore', 'Impossibile aggiungere il testo', 'error');
    }
  };
  
  const handleRemoveHighlight = async (highlightId) => {
    try {
      // Chiedi conferma prima di eliminare
      const { isConfirmed } = await swal.fire({
        title: 'Conferma eliminazione',
        text: 'Sei sicuro di voler eliminare questo testo?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sì, elimina',
        cancelButtonText: 'Annulla'
      });
      
      if (isConfirmed) {
        await removeHighlight(highlightId, notificationId);
        swal.fire({
          title: 'Punto eliminato',
          icon: 'success',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000
        });
      }
    } catch (error) {
      console.error('Error removing highlight:', error);
      swal.fire('Errore', 'Impossibile eliminare il testo', 'error');
    }
  };
  
  const handleGenerateHighlights = async () => {
    try {
      // Mostra un indicatore di caricamento
      setSummaryLoading(true);
      
      if (!currentUserId) {
        throw new Error("Impossibile identificare l'utente corrente");
      }
      
      // Chiama il servizio di AI tramite il hook per generare il riepilogo
      const response = await generateConversationSummary(notificationId, currentUserId);
  
      // Controlla se abbiamo ricevuto generatedHighlights nella risposta (nuovo formato)
      // o se abbiamo ricevuto direttamente un array di highlight (vecchio formato)
      const summaryPoints = response.generatedHighlights || response;
      
      // Se abbiamo ricevuto dei punti salienti, aggiorna lo stato
      if (summaryPoints && summaryPoints.length > 0) {
        // Recupera tutti i punti salienti aggiornati dal database
        await fetchHighlights(notificationId);
        
        swal.fire({
          title: 'Riepilogo generato',
          icon: 'success',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000
        });
      } else {
        // Se non ci sono risultati, mostra un messaggio di avviso
        swal.fire({
          title: 'Attenzione',
          text: 'Non è stato possibile generare un riepilogo significativo per questa conversazione',
          icon: 'warning',
          timer: 3000
        });
      }
    } catch (error) {
      console.error('Error generating highlights:', error);
      swal.fire('Errore', 'Impossibile generare il riepilogo', 'error');
    } finally {
      setSummaryLoading(false);
    }
  };
  
  // Funzione per formattare la data
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('it-IT', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  // Contenuto basato sul tab attivo
  const renderTabContent = () => {
    switch (activeTab) {
      case 'attachments':
        return (
          <div className="px-2 py-4 h-full flex flex-col">
            <div className="flex items-center justify-between mb-3 px-2">
              <h3 className="text-sm font-medium">Allegati ({attachments.length})</h3>
              {/* La funzionalità di aggiunta di allegati è gestita dall'uploader principale */}
            </div>
            
            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : !Array.isArray(attachments) || attachments.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                <Paperclip className="h-10 w-10 text-gray-300 mb-2" />
                <p className="text-gray-500 text-sm">Nessun allegato presente</p>
                <p className="text-xs text-gray-400 mt-1">I file condivisi appariranno qui</p>
              </div>
            ) : (
              <div className="space-y-2 flex-1 overflow-y-auto px-1">
                {attachments.map((attachment) => (
                  <div 
                    key={attachment.AttachmentID}
                    className="bg-white border border-gray-100 rounded-lg shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div 
                      className="flex items-center p-2 cursor-pointer border-b border-gray-100"
                      onClick={() => handleViewAttachment(attachment)}
                    >
                      <div className="mr-2 p-2 bg-gray-50 rounded-lg">
                        {getFileIcon(attachment.FileType)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate" title={attachment.FileName}>
                          {attachment.FileName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {Math.round(attachment.FileSizeKB / 1024 * 100) / 100} MB
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex text-xs border-t border-gray-50">
                      <button 
                        className="flex-1 py-1.5 text-blue-600 hover:bg-blue-50 transition-colors rounded-bl-lg flex items-center justify-center"
                        onClick={() => handleDownload(attachment)}
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Scarica
                      </button>
                      <button 
                        className="flex-1 py-1.5 text-red-600 hover:bg-red-50 transition-colors rounded-br-lg flex items-center justify-center"
                        onClick={() => handleDeleteAttachment(attachment.AttachmentID)}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Elimina
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      
        case 'documents':
          return (
            <div className="px-2 py-4 h-full flex flex-col">
              <div className="flex items-center justify-between mb-3 px-2">
                <h3 className="text-sm font-medium">Documenti collegati ({documents.length})</h3>
                <button 
                  className="p-1 rounded-full transition-colors hover:bg-gray-100"
                  onClick={() => setDocumentLinkerOpen(true)}
                  title="Collega un documento"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              
              {loading ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : documents.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                  <Link className="h-10 w-10 text-gray-300 mb-2" />
                  <p className="text-gray-500 text-sm">Nessun documento collegato</p>
                  <p className="text-xs text-gray-400 mt-1">I documenti collegati appariranno qui</p>
                  <button 
                    className="mt-4 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs hover:bg-blue-100 transition-colors"
                    onClick={() => setDocumentLinkerOpen(true)}
                  >
                    Collega un documento
                  </button>
                </div>
              ) : (
                <div className="space-y-2 flex-1 overflow-y-auto px-1">
                  {documents.map((doc) => (
                    <div 
                      key={doc.LinkId}
                      className="bg-white border border-gray-100 rounded-lg shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="p-2 border-b border-gray-100">
                        <div className="flex items-center">
                          <div className="mr-2 p-2 bg-gray-50 rounded-lg">
                            <File className="h-5 w-5 text-blue-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium">
                              <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[10px] mr-1">
                                {doc.DocumentType}
                              </span>
                              {doc.DocumentNumber || ""}
                            </p>
                            <p className="text-xs text-gray-500 truncate" title={doc.DocumentDescription}>
                              {doc.DocumentDescription || ""}
                            </p>
                            {doc.DocumentDate && (
                              <p className="text-[10px] text-gray-400">
                                {new Date(doc.DocumentDate).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex text-xs border-t border-gray-50">
                        <button 
                          className="flex-1 py-1.5 text-red-600 hover:bg-red-50 transition-colors rounded-br-lg flex items-center justify-center"
                          onClick={async () => {
                            try {
                              if (!notificationId) {
                                console.error('NotificationId mancante');
                                swal.fire({
                                  title: 'Errore',
                                  text: 'ID notifica non valido',
                                  icon: 'error'
                                });
                                return;
                              }
                              
                              if (!doc || !doc.LinkId) {
                                console.error('LinkId mancante nel documento:', doc);
                                swal.fire({
                                  title: 'Errore',
                                  text: 'ID documento non valido',
                                  icon: 'error'
                                });
                                return;
                              }
                              
                              const params = {
                                notificationId: parseInt(notificationId),
                                linkId: parseInt(doc.LinkId)
                              };
                              
                              try {
                                const result = await unlinkDocument(params.notificationId, params.linkId);
                                
                                // Dopo lo scollegamento di un documento, si aggiorna la lista dei documenti
                                if (result) {
                                  // Aggiorna la lista dei documenti
                                  const updatedDocs = await getLinkedDocuments(notificationId);
                                  // Aggiorna lo stato locale con i documenti aggiornati
                                  if (updatedDocs && updatedDocs.documents) {
                                    setDocuments(updatedDocs.documents);
                                  }
                                  
                                  swal.fire({
                                    title: 'Successo',
                                    text: 'Documento scollegato con successo',
                                    icon: 'success',
                                    timer: 2000,
                                    showConfirmButton: false
                                  });
                                }
                              } catch (error) {
                                console.error('Errore durante lo scollegamento:', error);
                                swal.fire({
                                  title: 'Errore',
                                  text: error.message || 'Impossibile scollegare il documento',
                                  icon: 'error'
                                });
                              }
                            } catch (error) {
                              console.error('Errore durante lo scollegamento:', error);
                              swal.fire({
                                title: 'Errore',
                                text: error.message || 'Impossibile scollegare il documento',
                                icon: 'error'
                              });
                            }
                          }}
                        >
                          <Unlink className="h-3 w-3 mr-1" />
                          Scollega
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );

      case 'highlights':
        const notificationHighlights = highlights[notificationId] || [];
        return (
          <div className="px-2 py-4 h-full flex flex-col">
            <div className="flex items-center justify-between mb-3 px-2">
              <h3 className="text-sm font-medium">Consigli ({notificationHighlights.length})</h3>
              <div className="flex gap-1">
                <button 
                  className={`p-1 rounded-full transition-colors hover:bg-gray-100`}
                  onClick={() => setShowHighlightInput(true)}
                  title="Aggiungi punto di riepilogo"
                >
                  <Plus className="h-4 w-4" />
                </button>
                <button 
                  className={`p-1 rounded-full transition-colors ${
                    summaryLoading || aiLoading ? 'bg-blue-100 text-blue-600 animate-pulse' : 'hover:bg-gray-100'
                  }`}
                  onClick={handleGenerateHighlights}
                  disabled={summaryLoading || aiLoading}
                  title="Genera riepilogo"
                >
                  <Zap className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            {/* Input per aggiungere un nuovo punto importante */}
            {showHighlightInput && (
              <div className="mb-3 p-2 border border-gray-200 rounded-lg">
                <textarea
                  ref={highlightInputRef}
                  value={newHighlightText}
                  onChange={(e) => setNewHighlightText(e.target.value)}
                  placeholder="Inserisci il testo..."
                  className="w-full p-2 border border-gray-300 rounded text-sm mb-2"
                  rows={3}
                />
                <div className="flex justify-end gap-2">
                  <button 
                    className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded"
                    onClick={() => {
                      setShowHighlightInput(false);
                      setNewHighlightText('');
                    }}
                  >
                    Annulla
                  </button>
                  <button 
                    className="px-3 py-1 text-xs text-white bg-blue-600 hover:bg-blue-700 rounded"
                    onClick={handleAddHighlight}
                  >
                    Salva
                  </button>
                </div>
              </div>
            )}
            
            {loadingHighlights ? (
              <div className="flex-1 flex flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mb-2"></div>
                <p className="text-sm text-gray-500">Caricamento in corso...</p>
              </div>
            ) : notificationHighlights.length > 0 ? (
              <div className="space-y-3 flex-1 overflow-y-auto px-1" >
                {notificationHighlights.map((highlight) => (
                  <div 
                    key={highlight.HighlightID}
                    className={`border border-gray-100 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow ${
                      highlight.IsAutoGenerated ? 'border-l-4 border-l-blue-400 bg-white' : 'bg-gray-200'
                    }`}
                    
                  >
                    <div className="flex justify-between items-start mb-1">
                      <button 
                          className="text-red-500 hover:text-red-700 p-1"
                          onClick={() => handleRemoveHighlight(highlight.HighlightID)}
                        >
                        <X className="h-3 w-3" />
                      </button>
                      {highlight.IsAutoGenerated && (
                        <span className="text-xs text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-full">
                          Auto
                        </span>
                      )}

                    </div>
                    <p className="text-sm">{highlight.HighlightText}</p>
                    <div className="flex justify-between items-center mt-2 text-xs text-gray-400">
                      <span className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatDate(highlight.HighlightCreated)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                <ZapOff className="h-10 w-10 text-gray-300 mb-2" />
                <p className="text-gray-500 text-sm">Nessun punto evidenziato</p>
                <div className="flex gap-2 mt-3">
                  <button 
                    className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs hover:bg-gray-200 transition-colors"
                    onClick={() => setShowHighlightInput(true)}
                  >
                    Aggiungi manualmente
                  </button>
                  <button 
                    className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs hover:bg-blue-100 transition-colors"
                    onClick={handleGenerateHighlights}
                  >
                    Genera automaticamente
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      
      default:
        return null;
    }
  };
  
  return (
    <>
      {/* Toggle Button - Posizionato correttamente sul bordo della sidebar */}
      <button
        onClick={onToggle}
        className="absolute z-2 p-2 rounded-full shadow-md bg-white hover:bg-gray-100 transition-all"
        style={{ 
          left: visible ? '290px' : '5px',
          opacity: visible ? 1 : 0.8,
          top: '50%',
          transform: 'translateY(-50%)',
          transition: 'left 0.3s ease-in-out'
        }}
      >
        {visible ? (
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        ) : (
          <ChevronRight className="h-5 w-5 text-gray-600" />
        )}
      </button>
    
      {/* Main Sidebar */}
      <AnimatePresence>
        {visible && (
          <motion.div
            ref={containerRef}
            className="bg-gray-50 border-l border-gray-200 h-full flex flex-col"
            style={{ width: '300px' }}
            initial={{ width: 0, opacity: 0 }}
            animate={{ 
              width: '300px', 
              opacity: 1,
              transition: { 
                width: { duration: 0.3 },
                opacity: { duration: 0.2, delay: 0.1 }
              }
            }}
            exit={{ 
              width: 0, 
              opacity: 0,
              transition: { 
                width: { duration: 0.3 },
                opacity: { duration: 0.1 }
              }
            }}
          >
            {/* Tabs Navigation */}
            <div className="flex border-b border-gray-200 bg-white">
              {/* Tab for Attachments */}
              <button
                className={`flex-1 py-3 text-xs font-medium transition-colors relative ${
                  activeTab === 'attachments' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab('attachments')}
                style={{ 
                  color: activeTab === 'attachments' ? categoryColor : undefined
                }}
              >
                <Paperclip className="h-4 w-4 mx-auto" />
                {activeTab === 'attachments' && (
                  <motion.div 
                    className="absolute bottom-0 left-0 right-0 h-0.5"
                    style={{ backgroundColor: categoryColor }}
                    layoutId="activeTabIndicator"
                  />
                )}
              </button>
              {/* Tab for linked documents */}
              <button
                className={`flex-1 py-3 text-xs font-medium transition-colors relative ${
                  activeTab === 'documents' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab('documents')}
                style={{ 
                  color: activeTab === 'documents' ? categoryColor : undefined
                }}
              >
                <Link className="h-4 w-4 mx-auto" />
                {activeTab === 'documents' && (
                  <motion.div 
                    className="absolute bottom-0 left-0 right-0 h-0.5"
                    style={{ backgroundColor: categoryColor }}
                    layoutId="activeTabIndicator"
                  />
                )}
              </button>
              {/* Tab for Highlights */}
              <button
                className={`flex-1 py-3 text-xs font-medium transition-colors relative ${
                  activeTab === 'highlights' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab('highlights')}
                style={{ 
                  color: activeTab === 'highlights' ? categoryColor : undefined
                }}
              >
                <Zap className="h-4 w-4 mx-auto" />
                {activeTab === 'highlights' && (
                  <motion.div 
                    className="absolute bottom-0 left-0 right-0 h-0.5"
                    style={{ backgroundColor: categoryColor }}
                    layoutId="activeTabIndicator"
                  />
                )}
              </button>
            </div>
            
            {/* Tab content area */}
            <div className="flex-1 overflow-hidden">
              {renderTabContent()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* File Viewer Modal */}
      <FileViewer 
        file={selectedFile}
        isOpen={!!selectedFile}
        onClose={() => setSelectedFile(null)}
      />
      {/* Document Linker Modal */}
      <DocumentLinker
        notificationId={notificationId}
        isOpen={documentLinkerOpen}
        onClose={() => setDocumentLinkerOpen(false)}
      />
    </>
  );
});

ChatSidebar.displayName = 'ChatSidebar';

export default ChatSidebar;