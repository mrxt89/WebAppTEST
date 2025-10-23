import React, { useState, useCallback, useEffect } from 'react';
import { Inbox, Send, RefreshCw, CheckCircle, XCircle, Building2, Package, Wrench, Filter, Search, Info } from 'lucide-react';
import IntercompanyRequestDetailsPanel from './components/IntercompanyRequestDetailsPanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
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
  const [detailsPanelOpen, setDetailsPanelOpen] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);

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

  const openDetail = (request) => {
    setSelectedRequest(request);
    setDetailsPanelOpen(true);
  };

  // Le funzioni per gestire dettagli, allegati e note sono ora nel panel

  // Le funzioni per gestire allegati, note e chat sono ora nel panel

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
                <div className="flex items-center gap-1 text-xs">
                  {request.TargetProjectItemCode ? (
                    <>
                      <span className="text-gray-500">→</span>
                      <span className="font-medium text-green-600">{request.TargetProjectItemCode}</span>
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
                <div className="text-xs text-gray-500 truncate max-w-[200px]">
                  {request.ComponentDescription}
                </div>
              </TableCell>
              <TableCell>{getTypeBadge(request.IntercompanyType)}</TableCell>
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
                  <Button size="sm" variant="outline"  onClick={() => openDetail(request)} className="h-7">
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

      {/* Sidebar Dettagli Richiesta */}
      <IntercompanyRequestDetailsPanel
        selectedRequest={selectedRequest}
        isOpen={detailsPanelOpen}
        onClose={() => setDetailsPanelOpen(false)}
        onRefresh={() => {
          if (activeTab === 'inbox') {
            loadRequests('IN', statusFilter);
          } else {
            loadRequests('OUT', statusFilter);
          }
        }}
        position="right"
        defaultWidth={800}
        minWidth={500}
        maxWidth={1200}
        topOffset={80}
      />
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

    </div>
  );
};

export default IntercompanyDashboard;
