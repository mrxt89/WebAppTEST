import React, { useState, useCallback, useEffect } from 'react';
import { Inbox, Send, RefreshCw, CheckCircle, XCircle, Building2, Package, Wrench, Filter, Search, Download, Eye, MoreVertical, FileText, Upload, MessageCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import FileViewer from '@/components/ui/fileViewer';
import ItemAttachmentVersions from '@/components/itemAttachments/ItemAttachmentVersions';
import useProjectArticlesActions from '@/hooks/useProjectArticlesActions';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

const IntercompanyDashboard = ({ onExit }) => {
  const { getIntercompanyRequests, respondToIntercompanyRequest, getReferenceAttachments, updateReferenceNotes } = useProjectArticlesActions();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState('inbox');
  const [inboxRequests, setInboxRequests] = useState([]);
  const [outboxRequests, setOutboxRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [respondModalOpen, setRespondModalOpen] = useState(false);
  const [respondAction, setRespondAction] = useState(null);
  const [responseNotes, setResponseNotes] = useState('');
  const [responding, setResponding] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailAttachments, setDetailAttachments] = useState([]);
  const [detailReference, setDetailReference] = useState(null);
  const [requestNotes, setRequestNotes] = useState('');
  const [detailResponseNotes, setDetailResponseNotes] = useState('');
  const [selectedAttachment, setSelectedAttachment] = useState(null);
  const [fileViewerOpen, setFileViewerOpen] = useState(false);
  const [versionsModalOpen, setVersionsModalOpen] = useState(false);

  const loadRequests = useCallback(async (direction, status) => {
    try {
      setLoading(true);
      const result = await getIntercompanyRequests(direction, status === 'all' ? null : status);
      if (direction === 'IN') {
        setInboxRequests(result.requests || []);
      } else {
        setOutboxRequests(result.requests || []);
      }
    } catch (error) {
      console.error('Error loading requests:', error);
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: 'Impossibile caricare le richieste',
      });
    } finally {
      setLoading(false);
    }
  }, [getIntercompanyRequests, toast]);

  useEffect(() => {
    if (activeTab === 'inbox') {
      loadRequests('IN', statusFilter);
    } else {
      loadRequests('OUT', statusFilter);
    }
  }, [activeTab, statusFilter, loadRequests]);

  const handleRespond = async () => {
    if (!selectedRequest) return;

    try {
      setResponding(true);
      const result = await respondToIntercompanyRequest(
        selectedRequest.ReferenceId,
        respondAction,
        responseNotes || null
      );

      if (result.success) {
        toast({
          title: 'Risposta inviata',
          description: result.msg,
        });
        loadRequests('IN', statusFilter);
        setRespondModalOpen(false);
        setSelectedRequest(null);
        setResponseNotes('');
      } else {
        throw new Error(result.msg);
      }
    } catch (error) {
      console.error('Error responding to request:', error);
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: error.message || 'Errore durante la risposta alla richiesta',
      });
    } finally {
      setResponding(false);
    }
  };

  const openRespondModal = (request, action) => {
    setSelectedRequest(request);
    setRespondAction(action);
    setResponseNotes('');
    setRespondModalOpen(true);
  };

  const openDetail = async (request) => {
    setSelectedRequest(request);
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const attRes = await getReferenceAttachments(request.ReferenceId);
      setDetailAttachments(attRes.attachments || []);
      setDetailReference(attRes.reference || null);
      
      // Imposta le note in base alla reference
      if (attRes.reference) {
        setRequestNotes(attRes.reference.RequestNotes || '');
        setDetailResponseNotes(attRes.reference.ResponseNotes || '');
      } else {
        // Fallback: usa le note dalla richiesta se la reference non è disponibile
        setRequestNotes(request.Notes || '');
        setDetailResponseNotes(request.ResponseNotes || '');
      }
    } catch (e) {
      console.error('Error loading details:', e);
      toast({ variant: 'destructive', title: 'Errore', description: 'Impossibile caricare i dettagli' });
    } finally {
      setDetailLoading(false);
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
      
      // refresh lista corrente per riflettere le note
      if (activeTab === 'inbox') {
        loadRequests('IN', statusFilter);
      } else {
        loadRequests('OUT', statusFilter);
      }
    } catch (e) {
      toast({ variant: 'destructive', title: 'Errore', description: e.message || 'Aggiornamento note fallito' });
    }
  };

  // Funzioni per gestire gli allegati
  const handleViewAttachment = (attachment) => {
    setSelectedAttachment(attachment);
    setFileViewerOpen(true);
  };

  const handleDownloadAttachment = async (attachment) => {
    try {
      // Usa l'API di download esistente
      const response = await fetch(`/api/item-attachments/${attachment.AttachmentID}/download`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.FileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Successo',
        description: 'File scaricato con successo',
      });
    } catch (error) {
      console.error('Error downloading attachment:', error);
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: 'Impossibile scaricare il file',
      });
    }
  };

  // Verifica se l'utente può modificare un allegato
  const canEditAttachment = (attachment) => {
    // L'utente può modificare solo gli allegati della propria azienda
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return attachment.OwnerCompanyId === user.CompanyId || attachment.AccessLevel === 'owner';
  };

  // Verifica se l'utente può modificare le note di richiesta o risposta
  const canEditNotes = (noteType) => {
    if (!selectedRequest) return false;
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (noteType == 'request') {
      // Solo l'azienda che ha fatto la richiesta può modificare le RequestNotes
      return parseInt(user.CompanyId) === parseInt(selectedRequest.SourceCompanyId);
    } else {
      // Solo l'azienda destinataria può modificare le ResponseNotes
      return parseInt(user.CompanyId) === parseInt(selectedRequest.TargetCompanyId);
    }
  };

  // Ottieni il nome dell'azienda
  const getCompanyName = (companyId) => {
    if (!selectedRequest) return '';
    if (companyId === selectedRequest.SourceCompanyId) {
      return selectedRequest.SourceCompanyName;
    } else if (companyId === selectedRequest.TargetCompanyId) {
      return selectedRequest.TargetCompanyName;
    }
    return '';
  };

  // Formatta la dimensione del file
  const formatFileSize = (sizeKB) => {
    if (!sizeKB) return '0 KB';
    const size = sizeKB * 1024;
    const units = ['B', 'KB', 'MB', 'GB'];
    let unitIndex = 0;
    let fileSize = size;
    
    while (fileSize >= 1024 && unitIndex < units.length - 1) {
      fileSize /= 1024;
      unitIndex++;
    }
    
    return `${fileSize.toFixed(1)} ${units[unitIndex]}`;
  };

  // Gestione versioni allegato
  const handleAttachmentVersions = (attachment) => {
    setSelectedAttachment(attachment);
    setVersionsModalOpen(true);
  };

  // Apri chat dell'articolo
  const handleOpenChat = () => {
    if (!selectedRequest) return;
    
    // Apri la chat dell'articolo in una nuova finestra o tab
    const chatUrl = `/progetti/articoli/chat/${selectedRequest.ComponentCode}`;
    window.open(chatUrl, '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
  };

  const getTypeBadge = (type) => {
    if (type === 'ACQUISTO') {
      return (
        <Badge variant="outline" className="text-xs">
          <Package className="w-3 h-3 mr-1" />
          Acquisto
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-xs">
        <Wrench className="w-3 h-3 mr-1" />
        Conto Lavoro
      </Badge>
    );
  };

  const getStatusBadge = (status) => {
    const variants = {
      PENDING: { variant: 'warning', icon: RefreshCw, text: 'In Attesa' },
      APPROVED: { variant: 'success', icon: CheckCircle, text: 'Approvato' },
      REJECTED: { variant: 'destructive', icon: XCircle, text: 'Rifiutato' },
      DRAFT: { variant: 'outline', icon: RefreshCw, text: 'Bozza' },
    };

    const config = variants[status] || { variant: 'secondary', icon: RefreshCw, text: status };
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="text-xs">
        <Icon className="w-3 h-3 mr-1" />
        {config.text}
      </Badge>
    );
  };

  const filterRequests = (requests) => {
    if (!searchQuery) return requests;
    const query = searchQuery.toLowerCase();
    return requests.filter((req) =>
      req.ComponentCode?.toLowerCase().includes(query) ||
      req.ComponentDescription?.toLowerCase().includes(query) ||
      req.ProjectCode?.toLowerCase().includes(query) ||
      req.SourceCompanyName?.toLowerCase().includes(query) ||
      req.TargetCompanyName?.toLowerCase().includes(query)
    );
  };

  const getStats = (requests) => {
    return {
      total: requests.length,
      pending: requests.filter((r) => r.Status === 'PENDING' || r.Status === 'DRAFT').length,
      approved: requests.filter((r) => r.Status === 'APPROVED').length,
      rejected: requests.filter((r) => r.Status === 'REJECTED').length,
    };
  };

  const stats = getStats(activeTab === 'inbox' ? inboxRequests : outboxRequests);
  const filteredRequests = filterRequests(activeTab === 'inbox' ? inboxRequests : outboxRequests);

  const renderRequestTable = (requests, direction) => {
    if (loading) {
      return (
        <div className="flex justify-center items-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-500">Caricamento...</span>
        </div>
      );
    }

    if (requests.length === 0) {
      const Icon = direction === 'IN' ? Inbox : Send;
      return (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <Icon className="w-12 h-12 mb-3" />
          <p>Nessuna richiesta trovata</p>
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Componente</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Progetto</TableHead>
            <TableHead>{direction === 'IN' ? 'Da Company' : 'A Company'}</TableHead>
            <TableHead>Stato</TableHead>
            <TableHead>Data</TableHead>
            {direction === 'IN' && <TableHead className="text-right">Azioni</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((request) => (
            <TableRow key={request.ReferenceId}>
              <TableCell>
                <div className="font-medium">{request.ComponentCode}</div>
                <div className="text-xs text-gray-500 truncate max-w-[200px]">
                  {request.ComponentDescription}
                </div>
              </TableCell>
              <TableCell>{getTypeBadge(request.IntercompanyType)}</TableCell>
              <TableCell>
                <div className="font-medium text-sm">{request.ProjectCode}</div>
                <div className="text-xs text-gray-500">{request.ProjectDescription}</div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1 text-sm">
                  <Building2 className="w-3 h-3" />
                  {direction === 'IN' ? request.SourceCompanyName : request.TargetCompanyName}
                </div>
              </TableCell>
              <TableCell>{getStatusBadge(request.Status)}</TableCell>
              <TableCell className="text-sm">
                {format(new Date(request.RequestDate), 'dd/MM/yyyy', { locale: it })}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex gap-1 justify-end">
                  {direction === 'IN' && (request.Status === 'PENDING' || request.Status === 'DRAFT') && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => openRespondModal(request, 'APPROVE')} className="h-7">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Approva
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openRespondModal(request, 'REJECT')} className="h-7 text-red-600 hover:text-red-700">
                        <XCircle className="w-3 h-3 mr-1" />
                        Rifiuta
                      </Button>
                    </>
                  )}
                  <Button size="sm" variant=""  onClick={() => openDetail(request)} className="bg-primary h-7">
                    Dettagli
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="container mx-auto py-6 max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard Intercompany</h1>
          <p className="text-gray-500">Gestisci le richieste di condivisione tra company</p>
        </div>
        <Button onClick={() => loadRequests(activeTab === 'inbox' ? 'IN' : 'OUT', statusFilter)}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Aggiorna
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Totale</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">In Attesa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Approvate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Rifiutate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Card with Tabs */}
      <Card>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="inbox" className="relative">
                  <Inbox className="w-4 h-4 mr-2" />
                  Inbox
                  {stats.pending > 0 && activeTab === 'inbox' && (
                    <Badge variant="destructive" className="ml-2 text-[10px] px-1">
                      {stats.pending}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="outbox">
                  <Send className="w-4 h-4 mr-2" />
                  Outbox
                </TabsTrigger>
              </TabsList>

              {/* Filtri */}
              <div className="flex gap-2">
                <div className="relative w-64">
                  <Search className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Cerca..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti</SelectItem>
                    <SelectItem value="PENDING">In Attesa</SelectItem>
                    <SelectItem value="APPROVED">Approvate</SelectItem>
                    <SelectItem value="REJECTED">Rifiutate</SelectItem>
                    <SelectItem value="DRAFT">Bozze</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>

          <TabsContent value="inbox" className="m-0">
            {renderRequestTable(filteredRequests, 'IN')}
          </TabsContent>

          <TabsContent value="outbox" className="m-0">
            {renderRequestTable(filteredRequests, 'OUT')}
          </TabsContent>
        </Tabs>
      </Card>

      {/* Dialog Dettagli Reference */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Dettagli richiesta</DialogTitle>
              {selectedRequest && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleOpenChat}
                  className="h-8"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Chat Articolo
                </Button>
              )}
            </div>
          </DialogHeader>

          {detailLoading ? (
            <div className="flex items-center gap-2 text-gray-500">
              <RefreshCw className="w-4 h-4 animate-spin" /> Caricamento...
            </div>
          ) : selectedRequest ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-600">Componente</div>
                  <div className="font-medium">{selectedRequest.ComponentCode}</div>
                  <div className="text-xs text-gray-500">{selectedRequest.ComponentDescription}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Stato</div>
                  <div>{getStatusBadge(selectedRequest.Status)}</div>
                </div>
              </div>

              <div>
                <div className="text-sm font-medium mb-2">Allegati condivisi</div>
                {detailAttachments.length === 0 ? (
                  <div className="text-sm text-gray-500">Nessun allegato</div>
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
                          {canEditAttachment(attachment) && (
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
                                  Gestisci versioni
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

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
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="secondary" onClick={() => setDetailOpen(false)}>Chiudi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Modal Respond */}
      <Dialog open={respondModalOpen} onOpenChange={setRespondModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {respondAction === 'APPROVE' ? 'Approva' : 'Rifiuta'} Richiesta
            </DialogTitle>
          </DialogHeader>

          {selectedRequest && (
            <>
              <div className="bg-gray-50 p-4 rounded space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Componente:</span>
                  <span className="font-medium">{selectedRequest.ComponentCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Progetto:</span>
                  <span className="font-medium">{selectedRequest.ProjectCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Company:</span>
                  <span className="font-medium">{selectedRequest.SourceCompanyName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Tipo:</span>
                  {getTypeBadge(selectedRequest.IntercompanyType)}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Note {respondAction === 'REJECT' && <span className="text-red-500">*</span>}
                </label>
                <Textarea
                  placeholder={respondAction === 'REJECT' ? 'Motivo del rifiuto (obbligatorio)' : 'Note opzionali'}
                  value={responseNotes}
                  onChange={(e) => setResponseNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRespondModalOpen(false)}
              disabled={responding}
            >
              Annulla
            </Button>
            <Button
              onClick={handleRespond}
              disabled={responding || (respondAction === 'REJECT' && !responseNotes.trim())}
              variant={respondAction === 'APPROVE' ? 'default' : 'destructive'}
            >
              {responding ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Invio...
                </>
              ) : (
                <>
                  {respondAction === 'APPROVE' ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approva
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 mr-2" />
                      Rifiuta
                    </>
                  )}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* FileViewer per visualizzare gli allegati */}
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
    </div>
  );
};

export default IntercompanyDashboard;
