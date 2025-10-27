import React, { useState, useCallback, useEffect } from 'react';
import { Inbox, Send, RefreshCw, CheckCircle, XCircle, Building2, Package, Wrench, Filter, Search, Info, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import IntercompanyRequestDetailsPanel from './components/IntercompanyRequestDetailsPanel';
import { ItemCodeDialog } from './components/ItemCodeDialog';
import { TemporaryItemsPanel } from './components/TemporaryItemsPanel';
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
  const { getIntercompanyRequests, respondToIntercompanyRequest, getReferenceAttachments, updateReferenceNotes, getTemporaryIntercompanyItems, replaceTemporaryItem } = useProjectArticlesActions();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState('inbox');
  const [inboxRequests, setInboxRequests] = useState([]);
  const [outboxRequests, setOutboxRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Stati per ordinamento e filtri avanzati
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [typeFilter, setTypeFilter] = useState('all');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [dateRangeFilter, setDateRangeFilter] = useState('all');
  
  // Stati per paginazione
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [respondModalOpen, setRespondModalOpen] = useState(false);
  const [respondAction, setRespondAction] = useState(null);
  const [responseNotes, setResponseNotes] = useState('');
  const [responding, setResponding] = useState(false);
  const [detailsPanelOpen, setDetailsPanelOpen] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);

  // Temporary items state
  const [temporaryItems, setTemporaryItems] = useState([]);
  const [loadingTemporaryItems, setLoadingTemporaryItems] = useState(false);

  // ItemCodeDialog state
  const [itemCodeDialogOpen, setItemCodeDialogOpen] = useState(false);
  const [itemCodeDialogData, setItemCodeDialogData] = useState(null);

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

  const loadTemporaryItems = useCallback(async () => {
    try {
      setLoadingTemporaryItems(true);
      const result = await getTemporaryIntercompanyItems();
      setTemporaryItems(result.items || []);
    } catch (error) {
      console.error('Error loading temporary items:', error);
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: 'Impossibile caricare gli articoli temporanei',
      });
    } finally {
      setLoadingTemporaryItems(false);
    }
  }, [getTemporaryIntercompanyItems, toast]);

  useEffect(() => {
    if (activeTab === 'inbox') {
      loadRequests('IN', statusFilter);
    } else if (activeTab === 'outbox') {
      loadRequests('OUT', statusFilter);
    } else if (activeTab === 'temporary') {
      loadTemporaryItems();
    }
  }, [activeTab, statusFilter, loadRequests, loadTemporaryItems]);

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

    if (action === 'APPROVE') {
      // Per l'approvazione, mostra ItemCodeDialog
      setItemCodeDialogData({
        SourceItemCode: request.ComponentCode,
        SourceItemDescription: request.ComponentDescription,
        SourceCompanyName: request.SourceCompanyName,
      });
      setItemCodeDialogOpen(true);
    } else {
      // Per il rifiuto, mostra il dialog normale
      setRespondModalOpen(true);
    }
  };

  const openDetail = (request) => {
    setSelectedRequest(request);
    setDetailsPanelOpen(true);
  };

  const handleApproveWithItemCode = async (targetItemCode, notes) => {
    if (!selectedRequest) return;

    try {
      setResponding(true);
      const result = await respondToIntercompanyRequest(
        selectedRequest.ReferenceId,
        'APPROVE',
        notes || null,
        targetItemCode || null,
        targetItemCode === null // createTemporaryIfMissing = true se targetItemCode è null
      );

      if (result.success) {
        toast({
          title: 'Richiesta approvata',
          description: result.msg,
        });
        loadRequests('IN', statusFilter);
        // Ricarica anche gli articoli temporanei se è stato creato un codice temporaneo
        if (!targetItemCode) {
          loadTemporaryItems();
        }
        setItemCodeDialogOpen(false);
        setSelectedRequest(null);
        setItemCodeDialogData(null);
      } else {
        throw new Error(result.msg);
      }
    } catch (error) {
      console.error('Error approving request:', error);
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: error.message || 'Errore durante l\'approvazione della richiesta',
      });
    } finally {
      setResponding(false);
    }
  };

  const handleReplaceTemporaryItem = async (itemId, definitiveItemCode) => {
    try {
      const result = await replaceTemporaryItem(itemId, definitiveItemCode);
      if (result.success) {
        toast({
          title: 'Articolo sostituito',
          description: result.msg,
        });
        loadTemporaryItems();
        loadRequests('IN', statusFilter); // Ricarica anche le richieste
      } else {
        throw new Error(result.msg);
      }
    } catch (error) {
      console.error('Error replacing temporary item:', error);
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: error.message || 'Errore durante la sostituzione dell\'articolo',
      });
    }
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

    const config = variants[status] || { variant: '', icon: RefreshCw, text: status };
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="text-xs">
        <Icon className="w-3 h-3 mr-1" />
        {config.text}
      </Badge>
    );
  };

  // Funzione per ordinamento
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Funzione per ordinare i dati
  const sortData = (data) => {
    if (!sortConfig.key) return data;
    
    return [...data].sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];
      
      // Gestione valori null/undefined
      if (aValue == null) aValue = '';
      if (bValue == null) bValue = '';
      
      // Conversione per date
      if (sortConfig.key === 'RequestDate') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }
      
      // Conversione per stringhe
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  // Funzione per filtrare i dati
  const filterRequests = (requests) => {
    let filtered = requests;
    
    // Filtro per ricerca testuale
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((req) =>
        req.ComponentCode?.toLowerCase().includes(query) ||
        req.ComponentDescription?.toLowerCase().includes(query) ||
        req.ProjectCode?.toLowerCase().includes(query) ||
        req.SourceCompanyName?.toLowerCase().includes(query) ||
        req.TargetCompanyName?.toLowerCase().includes(query) ||
        req.SourceProjectName?.toLowerCase().includes(query) ||
        req.TargetProjectName?.toLowerCase().includes(query) ||
        req.SourceProjectDescription?.toLowerCase().includes(query) ||
        req.TargetProjectDescription?.toLowerCase().includes(query)
      );
    }
    
    // Filtro per stato
    if (statusFilter !== 'all') {
      filtered = filtered.filter((req) => req.Status === statusFilter);
    }
    
    // Filtro per tipo
    if (typeFilter !== 'all') {
      filtered = filtered.filter((req) => req.IntercompanyType === typeFilter);
    }
    
    // Filtro per company
    if (companyFilter !== 'all') {
      filtered = filtered.filter((req) => 
        req.SourceCompanyName === companyFilter || 
        req.TargetCompanyName === companyFilter
      );
    }
    
    // Filtro per range di date
    if (dateRangeFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateRangeFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
        case 'quarter':
          filterDate.setMonth(now.getMonth() - 3);
          break;
        default:
          break;
      }
      
      filtered = filtered.filter((req) => new Date(req.RequestDate) >= filterDate);
    }
    
    return filtered;
  };

  // Funzione per ottenere le company uniche
  const getUniqueCompanies = (requests) => {
    const companies = new Set();
    requests.forEach(req => {
      if (req.SourceCompanyName) companies.add(req.SourceCompanyName);
      if (req.TargetCompanyName) companies.add(req.TargetCompanyName);
    });
    return Array.from(companies).sort();
  };

  // Funzioni per paginazione
  const getPaginatedData = (data) => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return data.slice(startIndex, endIndex);
  };

  const getTotalPages = (data) => {
    return Math.ceil(data.length / pageSize);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newPageSize) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset alla prima pagina
  };

  // Reset paginazione quando cambiano i filtri
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, typeFilter, companyFilter, dateRangeFilter]);

  const getStats = (requests) => {
    return {
      total: requests.length,
      pending: requests.filter((r) => r.Status === 'PENDING' || r.Status === 'DRAFT').length,
      approved: requests.filter((r) => r.Status === 'APPROVED').length,
      rejected: requests.filter((r) => r.Status === 'REJECTED').length,
    };
  };

  const currentRequests = activeTab === 'inbox' ? inboxRequests : outboxRequests;
  const stats = getStats(currentRequests);
  const filteredRequests = sortData(filterRequests(currentRequests));
  const paginatedRequests = getPaginatedData(filteredRequests);
  const totalPages = getTotalPages(filteredRequests);
  const uniqueCompanies = getUniqueCompanies(currentRequests);

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
      <div className="border rounded-lg">
        <div className="overflow-auto max-h-[600px]">
          <Table>
            <TableHeader className="sticky top-0 bg-white z-10">
              <TableRow>
            <TableHead>
              <button
                onClick={() => handleSort('ComponentCode')}
                className="flex items-center gap-1 hover:text-gray-600"
              >
                Componente
                {sortConfig.key === 'ComponentCode' ? (
                  sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                ) : (
                  <ArrowUpDown className="w-3 h-3 opacity-50" />
                )}
              </button>
            </TableHead>
            <TableHead>
              <button
                onClick={() => handleSort('IntercompanyType')}
                className="flex items-center gap-1 hover:text-gray-600"
              >
                Tipo
                {sortConfig.key === 'IntercompanyType' ? (
                  sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                ) : (
                  <ArrowUpDown className="w-3 h-3 opacity-50" />
                )}
              </button>
            </TableHead>
            <TableHead>
              <button
                onClick={() => handleSort('SourceProjectName')}
                className="flex items-center gap-1 hover:text-gray-600"
              >
                Progetto Source
                {sortConfig.key === 'SourceProjectName' ? (
                  sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                ) : (
                  <ArrowUpDown className="w-3 h-3 opacity-50" />
                )}
              </button>
            </TableHead>
            <TableHead>
              <button
                onClick={() => handleSort('TargetProjectName')}
                className="flex items-center gap-1 hover:text-gray-600"
              >
                Progetto Target
                {sortConfig.key === 'TargetProjectName' ? (
                  sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                ) : (
                  <ArrowUpDown className="w-3 h-3 opacity-50" />
                )}
              </button>
            </TableHead>
            <TableHead>
              <button
                onClick={() => handleSort(direction === 'IN' ? 'SourceCompanyName' : 'TargetCompanyName')}
                className="flex items-center gap-1 hover:text-gray-600"
              >
                {direction === 'IN' ? 'Da Company' : 'A Company'}
                {sortConfig.key === (direction === 'IN' ? 'SourceCompanyName' : 'TargetCompanyName') ? (
                  sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                ) : (
                  <ArrowUpDown className="w-3 h-3 opacity-50" />
                )}
              </button>
            </TableHead>
            <TableHead>
              <button
                onClick={() => handleSort('Status')}
                className="flex items-center gap-1 hover:text-gray-600"
              >
                Stato
                {sortConfig.key === 'Status' ? (
                  sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                ) : (
                  <ArrowUpDown className="w-3 h-3 opacity-50" />
                )}
              </button>
            </TableHead>
            <TableHead>
              <button
                onClick={() => handleSort('RequestDate')}
                className="flex items-center gap-1 hover:text-gray-600"
              >
                Data
                {sortConfig.key === 'RequestDate' ? (
                  sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                ) : (
                  <ArrowUpDown className="w-3 h-3 opacity-50" />
                )}
              </button>
            </TableHead>
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
                <div className="text-sm font-medium">
                  {request.SourceProjectName || 'N/A'}
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  <div className="font-medium">{request.TargetProjectName || 'N/A'}</div>
                  {request.TargetProjectDescription && (
                    <div className="text-xs text-gray-500 truncate max-w-[150px]">
                      {request.TargetProjectDescription}
                    </div>
                  )}
                </div>
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
                  <Button size="sm" variant="outline"  onClick={() => openDetail(request)} className="h-7">
                    Dettagli
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  };

  // Componente per la paginazione
  const PaginationControls = ({ currentPage, totalPages, onPageChange, pageSize, onPageSizeChange, totalItems, filteredItems }) => {
    if (totalPages <= 1) return null;

    const startItem = (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, filteredItems);

    const getPageNumbers = () => {
      const pages = [];
      const maxVisiblePages = 5;
      
      if (totalPages <= maxVisiblePages) {
        for (let i = 1; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        if (currentPage <= 3) {
          for (let i = 1; i <= 4; i++) pages.push(i);
          pages.push('...');
          pages.push(totalPages);
        } else if (currentPage >= totalPages - 2) {
          pages.push(1);
          pages.push('...');
          for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
        } else {
          pages.push(1);
          pages.push('...');
          for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
          pages.push('...');
          pages.push(totalPages);
        }
      }
      
      return pages;
    };

    return (
      <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            Mostrando {startItem}-{endItem} di {filteredItems} elementi
          </span>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Elementi per pagina:</span>
            <Select value={pageSize.toString()} onValueChange={(value) => onPageSizeChange(parseInt(value))}>
              <SelectTrigger className="w-20 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className="h-8 w-8 p-0"
          >
            <ChevronsLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          {getPageNumbers().map((page, index) => (
            <Button
              key={index}
              variant={page === currentPage ? "default" : "outline"}
              size="sm"
              onClick={() => typeof page === 'number' && onPageChange(page)}
              disabled={page === '...'}
              className="h-8 w-8 p-0"
            >
              {page}
            </Button>
          ))}
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="h-8 w-8 p-0"
          >
            <ChevronsRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
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
                <TabsTrigger value="temporary" className="relative">
                  <Package className="w-4 h-4 mr-2" />
                  Articoli Temporanei
                  {temporaryItems.length > 0 && (
                    <Badge variant="warning" className="ml-2 text-[10px] px-1">
                      {temporaryItems.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* Filtri */}
              <div className="flex gap-2 flex-wrap">
                <div className="relative w-64">
                  <Search className="absolute right-2 top-2.5 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Cerca componente, progetto source/target, company..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Stato" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti gli stati</SelectItem>
                    <SelectItem value="PENDING">In Attesa</SelectItem>
                    <SelectItem value="APPROVED">Approvate</SelectItem>
                    <SelectItem value="REJECTED">Rifiutate</SelectItem>
                    <SelectItem value="DRAFT">Bozze</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti i tipi</SelectItem>
                    <SelectItem value="ACQUISTO">Acquisto</SelectItem>
                    <SelectItem value="CONTO_LAVORO">Conto Lavoro</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={dateRangeFilter} onValueChange={setDateRangeFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Periodo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti i periodi</SelectItem>
                    <SelectItem value="today">Oggi</SelectItem>
                    <SelectItem value="week">Ultima settimana</SelectItem>
                    <SelectItem value="month">Ultimo mese</SelectItem>
                    <SelectItem value="quarter">Ultimo trimestre</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                    setTypeFilter('all');
                    setCompanyFilter('all');
                    setDateRangeFilter('all');
                    setSortConfig({ key: null, direction: 'asc' });
                    setCurrentPage(1);
                  }}
                  className="h-9"
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Reset
                </Button>
              </div>
            </div>
          </CardHeader>

          <TabsContent value="inbox" className="m-0">
            <div className="p-4 border-b bg-gray-50">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  Mostrando {filteredRequests.length} di {currentRequests.length} richieste
                  {(searchQuery || statusFilter !== 'all' || typeFilter !== 'all' || companyFilter !== 'all' || dateRangeFilter !== 'all') && (
                    <span className="text-blue-600 ml-1">(filtrate)</span>
                  )}
                </span>
                {sortConfig.key && (
                  <span className="text-xs text-gray-500">
                    Ordinato per: {sortConfig.key} ({sortConfig.direction === 'asc' ? 'A→Z' : 'Z→A'})
                  </span>
                )}
              </div>
            </div>
            {renderRequestTable(paginatedRequests, 'IN')}
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              pageSize={pageSize}
              onPageSizeChange={handlePageSizeChange}
              totalItems={currentRequests.length}
              filteredItems={filteredRequests.length}
            />
          </TabsContent>

          <TabsContent value="outbox" className="m-0">
            <div className="p-4 border-b bg-gray-50">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  Mostrando {filteredRequests.length} di {currentRequests.length} richieste
                  {(searchQuery || statusFilter !== 'all' || typeFilter !== 'all' || companyFilter !== 'all' || dateRangeFilter !== 'all') && (
                    <span className="text-blue-600 ml-1">(filtrate)</span>
                  )}
                </span>
                {sortConfig.key && (
                  <span className="text-xs text-gray-500">
                    Ordinato per: {sortConfig.key} ({sortConfig.direction === 'asc' ? 'A→Z' : 'Z→A'})
                  </span>
                )}
              </div>
            </div>
            {renderRequestTable(paginatedRequests, 'OUT')}
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              pageSize={pageSize}
              onPageSizeChange={handlePageSizeChange}
              totalItems={currentRequests.length}
              filteredItems={filteredRequests.length}
            />
          </TabsContent>

          <TabsContent value="temporary" className="m-0 p-6">
            <TemporaryItemsPanel
              items={temporaryItems}
              onReplace={handleReplaceTemporaryItem}
              onRefresh={loadTemporaryItems}
              loading={loadingTemporaryItems}
            />
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

      {/* ItemCodeDialog per approvazione con scelta codice */}
      <ItemCodeDialog
        open={itemCodeDialogOpen}
        onClose={() => {
          setItemCodeDialogOpen(false);
          setSelectedRequest(null);
          setItemCodeDialogData(null);
        }}
        onConfirm={handleApproveWithItemCode}
        referenceData={itemCodeDialogData}
      />

    </div>
  );
};

export default IntercompanyDashboard;
