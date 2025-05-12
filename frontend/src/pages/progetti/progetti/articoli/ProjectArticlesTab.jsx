import React, { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Package, 
  Plus, 
  Search, 
  Filter, 
  X,
  ListFilter,
  Copy,
  FileSpreadsheet
} from 'lucide-react';
import { swal } from '@/lib/common';
import ArticleForm from './ArticleForm';
import ArticlesList from './ArticlesList';
import ArticleDetails from './ArticleDetails';
import BOMViewer from './BOMViewer';
import ArticleSelectionModal from './ArticleSelectionModal';
import useProjectArticlesActions from '@/hooks/useProjectArticlesActions';

/**
 * ProjectArticlesTab - Componente principale per la gestione degli articoli di progetto
 * @param {Object} project - Oggetto contenente i dati del progetto corrente
 * @param {boolean} canEdit - Flag che indica se l'utente ha i permessi di modifica
 */
const ProjectArticlesTab = ({ project, canEdit }) => {
  // Stati base
  const [loading, setLoading] = useState(false);
  const [articles, setArticles] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedTab, setSelectedTab] = useState('list');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  
  // Stati per form integrato
  const [formMode, setFormMode] = useState(null); // 'new', 'copy', o null
  const [sourceItemId, setSourceItemId] = useState(null); // per la modalità copy
  
  // Stato per il modale di selezione articoli
  const [showSelectionModal, setShowSelectionModal] = useState(false);

  // Utilizziamo gli hooks per le API
  const { 
    fetchItems,
    getAvailableItems,
    getERPItems,
    importERPItem,
    linkItemToProject,
    copyBOMFromItem,
    getBOMByItemId,
    loading: hookLoading,
    error: hookError
  } = useProjectArticlesActions();
  
  // Combiniamo il loading locale con quello dell'hook
  const isLoading = loading || hookLoading;
  
  // Filtri
  const [filters, setFilters] = useState({
    statusId: 0,
    nature: 0,
    searchText: '',
    projectId: project?.ProjectID || 0,
    fromERP: 'all' // Fixed: Using 'all' instead of empty string
  });

  // Opzioni per i filtri
  const natureOptions = [
    { id: 0, description: 'Tutti' },
    { id: 22413312, description: 'Semilavorato' },
    { id: 22413313, description: 'Prodotto Finito' },
    { id: 22413314, description: 'Acquisto' }
  ];

  const statusOptions = [
    { id: 0, description: 'Tutti' },
    { id: 1, description: 'Bozza' },
    { id: 2, description: 'In Produzione' },
    { id: 3, description: 'Annullato' },
    { id: 4, description: 'Sospeso' }
  ];

  // Fixed: Using 'all' instead of empty string
  const erpOptions = [
    { id: 'all', description: 'Tutti' },
    { id: 'true', description: 'Da Mago' },
    { id: 'false', description: 'Temporanei' }
  ];

  // Caricamento articoli
  const loadArticles = useCallback(async () => {
    if (!project?.ProjectID) return;
    
    try {
      // Utilizziamo l'hook per ottenere gli articoli con paginazione
      // L'hook gestisce già il loading, quindi non settiamo setLoading qui
      const queryFilters = { ...filters, projectId: project.ProjectID };
      
      // Fixed: Convert 'all' to empty string for API
      if (queryFilters.fromERP === 'all') {
        delete queryFilters.fromERP;
      }
      
      const result = await fetchItems(page, pageSize, queryFilters);
      
      if (result) {
        setArticles(result.items || []);
        setTotalCount(result.total || 0);
      }
    } catch (error) {
      console.error('Error loading articles:', error);
      swal.fire({
        title: 'Errore',
        text: 'Si è verificato un errore nel caricamento degli articoli',
        icon: 'error',
      });
    }
  }, [project?.ProjectID, page, pageSize, filters, fetchItems]);

  // Caricamento articoli quando cambia il progetto o i filtri
  useEffect(() => {
    if (project?.ProjectID) {
      loadArticles();
    }
  }, [project?.ProjectID, loadArticles, page, pageSize]);

  // Gestione selezione item
  const handleItemSelect = (item) => {
    setSelectedItem(item);
    setSelectedTab("details");
  };

  // Gestione apertura modale per selezionare articoli esistenti o crearne uno nuovo
  const handleAddItem = () => {
    setShowSelectionModal(true);
  };

  // Gestione selezione di un articolo dal modale
  const handleItemSelection = async (item, source, importBOM = false, processMultilevelBOM = true, maxLevels = 5) => {
    try {
      setShowSelectionModal(false);
      setLoading(true);
      
      let result;
      let newItemId;
      
      if (source === 'temporary') {
        // Utilizziamo l'hook per associare l'articolo temporaneo esistente al progetto
        result = await linkItemToProject(project.ProjectID, item.Id);
        newItemId = item.Id;
      } else if (source === 'defined') {
        // Utilizziamo l'hook per importare l'articolo dal gestionale
        // con i nuovi parametri per la distinta base multilivello
        result = await importERPItem(
          project.ProjectID, 
          item.Item, 
          importBOM, 
          processMultilevelBOM, 
          maxLevels
        );
        newItemId = result.itemId;
      }
      
      console.log('Item import result:', result);
      if (result && result.success) {
        // Se l'importazione è avvenuta con successo, mostra un messaggio
        swal.fire({
          title: 'Successo',
          text: source === 'temporary' ? 
            'Articolo esistente associato al progetto' : 
            (importBOM ? 'Articolo e distinta base importati con successo' : 'Articolo importato con successo'),
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
        
        // Ricarica la lista degli articoli
        loadArticles();
      } else {
        throw new Error((result && result.msg) || 'Errore nell\'operazione');
      }
    } catch (error) {
      console.error('Error in item selection:', error);
      swal.fire({
        title: 'Errore',
        text: error.message || 'Si è verificato un errore nell\'operazione',
        icon: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  // Gestione creazione nuovo articolo dal modale
  const handleCreateNew = () => {
    setShowSelectionModal(false);
    setFormMode('new');
    setSourceItemId(null);
    setSelectedTab('form');
  };

  // Gestione copia articoli (senza navigate)
  const handleCopyItem = (sourceItem) => {
    setFormMode('copy');
    setSourceItemId(sourceItem.Id);
    setSelectedTab('form');
  };

  // Gestione ritorno alla lista
  const handleBackToList = () => {
    setFormMode(null);
    setSourceItemId(null);
    setSelectedTab('list');
  };

  // Gestione completamento del form (salvataggio)
  const handleFormComplete = () => {
    handleBackToList();
    loadArticles(); // Ricarichiamo gli articoli dopo il salvataggio
  };

  // Gestione visualizzazione/modifica distinta base
  const handleViewBOM = (item) => {
    setSelectedItem(item);
    setSelectedTab("bom");
  };

  // Gestione cambio filtri
  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPage(0); // Reset alla prima pagina quando cambiano i filtri
  };

  // Gestione reset filtri
  const handleResetFilters = () => {
    setFilters({
      statusId: 0,
      nature: 0,
      searchText: '',
      projectId: project?.ProjectID || 0,
      fromERP: 'all' // Fixed: Using 'all' instead of empty string
    });
    setPage(0);
  };

  // Controlla se ci sono filtri attivi
  const hasActiveFilters = () => {
    return (
      filters.statusId !== 0 || 
      filters.nature !== 0 || 
      filters.searchText !== '' ||
      filters.fromERP !== 'all' // Fixed: Changed to check against 'all'
    );
  };

  return (
    <Card className="border h-full flex flex-col">
      <CardContent className="p-0 flex-1 flex flex-col">
        <Tabs 
          value={selectedTab} 
          onValueChange={setSelectedTab}
          className="flex-1 flex flex-col"
        >
          <div className="px-6 pt-4 border-b">
            <TabsList>
              <TabsTrigger value="list" onClick={() => setSelectedTab("list")}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Lista Articoli
              </TabsTrigger>
              {selectedItem && (
                <>
                  <TabsTrigger value="details" onClick={() => setSelectedTab("details")}>
                    <Package className="h-4 w-4 mr-2" />
                    Dettagli Articolo
                  </TabsTrigger>
                  <TabsTrigger value="bom" onClick={() => setSelectedTab("bom")}>
                    <ListFilter className="h-4 w-4 mr-2" />
                    Distinta Base
                  </TabsTrigger>
                </>
              )}
              {formMode && (
                <TabsTrigger value="form" onClick={() => setSelectedTab("form")}>
                  <Plus className="h-4 w-4 mr-2" />
                  {formMode === 'new' ? 'Nuovo Articolo' : 'Copia Articolo'}
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          {/* Tab Lista Articoli */}
          <TabsContent value="list" className="flex-1 flex flex-col overflow-hidden m-0 border-none">
            {/* Header con filtri e bottone Nuovo Articolo */}
            <div className="px-6 py-4 border-b bg-slate-50 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3 flex-1">
                <div className="flex-grow-0 w-auto">
                  <Select
                    value={filters.statusId?.toString()}
                    onValueChange={(value) => handleFilterChange('statusId', parseInt(value))}
                  >
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Stato" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map(option => (
                        <SelectItem key={option.id} value={option.id.toString()}>
                          {option.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex-grow-0 w-auto">
                  <Select
                    value={filters.nature?.toString()}
                    onValueChange={(value) => handleFilterChange('nature', parseInt(value))}
                  >
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Natura" />
                    </SelectTrigger>
                    <SelectContent>
                      {natureOptions.map(option => (
                        <SelectItem key={option.id} value={option.id.toString()}>
                          {option.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex-grow-0 w-auto">
                  <Select
                    value={filters.fromERP}
                    onValueChange={(value) => handleFilterChange('fromERP', value)}
                  >
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Origine" />
                    </SelectTrigger>
                    <SelectContent>
                      {erpOptions.map(option => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex-grow w-auto min-w-[200px]">
                  <div className="relative">
                    <Input
                      placeholder="Cerca per codice, descrizione..."
                      value={filters.searchText}
                      onChange={(e) => handleFilterChange('searchText', e.target.value)}
                      className="pl-8"
                    />
                    {filters.searchText && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => handleFilterChange('searchText', '')}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                
                {/* Bottone "Nuovo Articolo" spostato qui */}
              
                  <Button onClick={handleAddItem} className="whitespace-nowrap">
                    <Plus className="h-4 w-4 mr-2" />
                    Nuovo Articolo
                  </Button>
                
                
                {hasActiveFilters() && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleResetFilters}
                    className="ml-2"
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Reset
                  </Button>
                )}
              </div>
            </div>
            
            {/* Contatore risultati */}
            {totalCount > 0 && (
              <div className="px-6 py-2 text-sm text-muted-foreground border-b">
                {totalCount} articoli trovati
              </div>
            )}
            
            {/* Lista articoli */}
            <div className="flex-1 overflow-hidden">
              <ArticlesList
                items={articles}
                loading={isLoading}
                onSelect={handleItemSelect}
                onViewBOM={handleViewBOM}
                onCopy={canEdit ? handleCopyItem : undefined}
                canEdit={canEdit}
                project={project}
                onRefresh={loadArticles} // Pass the refresh callback
              />
            </div>
            
            {/* Modale di selezione articoli */}
            <ArticleSelectionModal
              isOpen={showSelectionModal}
              onClose={() => setShowSelectionModal(false)}
              onSelectItem={handleItemSelection}
              onCreateNew={handleCreateNew}
              project={project}
            />
          </TabsContent>

          {/* Tab Dettagli Articolo */}
          <TabsContent value="details" className="flex-1 overflow-hidden m-0 border-none">
            {selectedItem ? (
              <ArticleDetails
                item={selectedItem}
                project={project}
                canEdit={canEdit}
                onBOMView={handleViewBOM}
                onRefresh={loadArticles}
                onBack={handleBackToList} // Add onBack for navigation
              />
            ) : (
              <div className="p-6 text-center text-muted-foreground">
                Seleziona un articolo per visualizzarne i dettagli
              </div>
            )}
          </TabsContent>

          {/* Tab Distinta Base */}
          <TabsContent value="bom" className="flex-1 overflow-hidden m-0 border-none">
            {selectedItem ? (
              <BOMViewer
                item={selectedItem}
                project={project}
                canEdit={canEdit}
                onRefresh={loadArticles}
              />
            ) : (
              <div className="p-6 text-center text-muted-foreground">
                Seleziona un articolo per visualizzarne la distinta base
              </div>
            )}
          </TabsContent>
          
          {/* Tab Form Articolo */}
          <TabsContent value="form" className="flex-1 overflow-hidden m-0 border-none">
            {formMode && (
              <ArticleForm 
                mode={formMode} 
                projectId={project.ProjectID} 
                itemId={formMode === 'copy' ? sourceItemId : null}
                onCancel={handleBackToList}
                onSave={handleFormComplete}
              />
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ProjectArticlesTab;