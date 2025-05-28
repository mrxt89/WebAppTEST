import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Package,
  ShoppingCart,
  FileText,
  Search,
  Loader2,
  X,
  Plus,
  Copy,
  ListFilter,
  Filter,
  ChevronLeft,
  ChevronRight,
  Layers,
  Database,
} from "lucide-react";
import useProjectArticlesActions from "@/hooks/useProjectArticlesActions";
import BOMImportWizard from "./BOMImportWizard";
import { toast } from "@/components/ui/use-toast";

/**
 * ArticleSelectionModal - Componente modale per la selezione di articoli esistenti
 * @param {boolean} isOpen - Flag per aprire/chiudere il modale
 * @param {Function} onClose - Callback per la chiusura del modale
 * @param {Function} onSelectItem - Callback per la selezione di un articolo
 * @param {Function} onCreateNew - Callback per la creazione di un nuovo articolo
 * @param {Object} project - Il progetto corrente
 */
const ArticleSelectionModal = ({
  isOpen,
  onClose,
  onSelectItem,
  onCreateNew,
  project,
}) => {
  // Stati per i dati
  const [temporaryItems, setTemporaryItems] = useState([]);
  const [definedItems, setDefinedItems] = useState([]);
  const [selectedTab, setSelectedTab] = useState("temporary");

  // Stati per i filtri
  const [searchText, setSearchText] = useState("");
  const [temporaryFiltered, setTemporaryFiltered] = useState([]);
  const [definedFiltered, setDefinedFiltered] = useState([]);

  // Stato per opzione importazione distinta base (per articoli temporanei)
  const [importBOM, setImportBOM] = useState(true);

  // Stati per la paginazione
  const [currentTempPage, setCurrentTempPage] = useState(1);
  const [currentDefPage, setCurrentDefPage] = useState(1);
  const [definedTotalPages, setDefinedTotalPages] = useState(1);
  const [definedTotalItems, setDefinedTotalItems] = useState(0);
  const itemsPerPage = 50;

  // Stati per il wizard di importazione BOM
  const [showBOMWizard, setShowBOMWizard] = useState(false);
  const [selectedItemForWizard, setSelectedItemForWizard] = useState(null);
  const [wizardSource, setWizardSource] = useState(null); // 'temporary' o 'defined'

  // Hook per le azioni API - CORREZIONE: rimuovere projectArticlesActions
  const { 
    getAvailableItems, 
    getERPItemsPaginated, 
    getBOMByItemId, 
    loading,
    linkItemToProject,
    importERPItemWithSelection
  } = useProjectArticlesActions();

  // Caricamento degli articoli temporanei esistenti
  useEffect(() => {
    if (isOpen && project?.ProjectID) {
      loadData();
      // Reset delle pagine quando si apre il modale
      setCurrentTempPage(1);
      setCurrentDefPage(1);
    }
  }, [isOpen, project?.ProjectID]);

  // Aggiorna gli elenchi filtrati quando cambia il testo di ricerca
  useEffect(() => {
    if (searchText.trim() === "") {
      setTemporaryFiltered(temporaryItems);
      return;
    }

    const searchLower = searchText.toLowerCase();

    // Filtra gli articoli temporanei
    const filteredTemp = temporaryItems.filter(
      (item) =>
        item.Item.toLowerCase().includes(searchLower) ||
        (item.Description &&
          item.Description.toLowerCase().includes(searchLower)),
    );
    setTemporaryFiltered(filteredTemp);

    // Reset delle pagine quando cambia la ricerca
    setCurrentTempPage(1);
    setCurrentDefPage(1);
  }, [searchText, temporaryItems]);

  // Carica i dati all'apertura del modale
  const loadData = async () => {
    try {
      // Carica gli articoli temporanei disponibili
      const tempItems = await getAvailableItems(project.ProjectID);
      setTemporaryItems(tempItems || []);
      setTemporaryFiltered(tempItems || []);

      // Carica gli articoli dal gestionale con paginazione
      const erpData = await getERPItemsPaginated("", 0, itemsPerPage);
      setDefinedItems(erpData.items || []);
      setDefinedFiltered(erpData.items || []);
      setDefinedTotalPages(erpData.totalPages || 1);
      setDefinedTotalItems(erpData.total || 0);
    } catch (error) {
      console.error("Error loading data for selection modal:", error);
    }
  };

  // Cerca articoli dal gestionale quando si cambia tab o si preme invio nel campo di ricerca
  const handleSearchERPItems = async () => {
    if (selectedTab === "defined") {
      try {
        const erpData = await getERPItemsPaginated(searchText, currentDefPage - 1, itemsPerPage);
        setDefinedItems(erpData.items || []);
        setDefinedFiltered(erpData.items || []);
        setDefinedTotalPages(erpData.totalPages || 1);
        setDefinedTotalItems(erpData.total || 0);
      } catch (error) {
        console.error("Error searching ERP items:", error);
      }
    }
  };

  // Funzione per ottenere il badge della natura
  const getNatureBadge = (nature) => {
    switch (parseInt(nature)) {
      case 22413312: // Semilavorato
        return (
          <Badge className="bg-blue-100 text-blue-700 border-blue-200 flex items-center gap-1">
            <Package className="h-3 w-3" />
            <span>Semilavorato</span>
          </Badge>
        );
      case 22413313: // Prodotto Finito
        return (
          <Badge className="bg-green-100 text-green-700 border-green-200 flex items-center gap-1">
            <Package className="h-3 w-3" />
            <span>Prodotto Finito</span>
          </Badge>
        );
      case 22413314: // Acquisto
        return (
          <Badge className="bg-amber-100 text-amber-700 border-amber-200 flex items-center gap-1">
            <ShoppingCart className="h-3 w-3" />
            <span>Acquisto</span>
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-100 text-gray-700 border-gray-200 flex items-center gap-1">
            <FileText className="h-3 w-3" />
            <span>Altro</span>
          </Badge>
        );
    }
  };

  // Verifica se un articolo ha una distinta base
  const checkHasBOM = async (item) => {
    try {
      const bom = await getBOMByItemId(item.Id);
      return (
        bom && (bom.header || (bom.components && bom.components.length > 0))
      );
    } catch (error) {
      console.error("Error checking BOM:", error);
      return false;
    }
  };

  // Gestione della selezione di un articolo temporaneo
  const handleSelectTemporary = async (item) => {
    // Verifica se l'articolo ha una distinta base
    const hasBOM = await checkHasBOM(item);
    
    if (hasBOM && importBOM) {
      // Se ha una distinta e vogliamo importarla, apri il wizard
      setSelectedItemForWizard(item);
      setWizardSource('temporary');
      setShowBOMWizard(true);
    } else {
      // Altrimenti procedi con l'importazione semplice
      onSelectItem(item, "temporary", false);
    }
  };

  // Gestione della selezione di un articolo definito (da ERP)
  const handleSelectDefined = (item) => {
    // Per gli articoli da ERP, apri sempre il wizard
    setSelectedItemForWizard(item);
    setWizardSource('defined');
    setShowBOMWizard(true);
  };

  // Gestione conferma dal wizard - CORREZIONE
  const handleWizardConfirm = async (importData) => {
    try {
      setShowBOMWizard(false);
      
      console.log('Wizard confirm - Import data:', importData);
      
      // CORREZIONE: Usa importERPItemWithSelection direttamente, non projectArticlesActions
      const result = await importERPItemWithSelection(
        project.ProjectID,
        importData
      );

      console.log('Import result:', result);

      if (result && result.success) {
        toast({
          title: "Successo",
          description: result.msg || "Articolo e componenti selezionati importati con successo",
          variant: "success",
        });

        // Chiudi il modal
        onClose();
        
        // Notifica il parent per aggiornare la lista
        // IMPORTANTE: Passa false come terzo parametro per evitare una seconda importazione
        if (onSelectItem && result.item) {
          onSelectItem(result.item, "defined", false);
        }
      } else {
        throw new Error(result?.msg || "Errore durante l'importazione");
      }
      
    } catch (error) {
      console.error("Errore nell'importazione:", error);
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore durante l'importazione",
        variant: "destructive",
      });
    }
  };

  // Gestione del cambio tab
  const handleTabChange = (value) => {
    setSelectedTab(value);
    if (value === "defined" && definedItems.length === 0) {
      handleSearchERPItems();
    }
  };

  // Funzioni per cambiare pagina
  const goToNextDefPage = async () => {
    if (currentDefPage < definedTotalPages) {
      const newPage = currentDefPage + 1;
      setCurrentDefPage(newPage);
      const erpData = await getERPItemsPaginated(searchText, newPage - 1, itemsPerPage);
      setDefinedItems(erpData.items || []);
      setDefinedFiltered(erpData.items || []);
    }
  };

  const goToPrevDefPage = async () => {
    if (currentDefPage > 1) {
      const newPage = currentDefPage - 1;
      setCurrentDefPage(newPage);
      const erpData = await getERPItemsPaginated(searchText, newPage - 1, itemsPerPage);
      setDefinedItems(erpData.items || []);
      setDefinedFiltered(erpData.items || []);
    }
  };

  // Ottieni gli elementi paginati
  const paginatedTempItems = temporaryFiltered.slice((currentTempPage - 1) * itemsPerPage, currentTempPage * itemsPerPage);
  const paginatedDefItems = definedFiltered.slice((currentDefPage - 1) * itemsPerPage, currentDefPage * itemsPerPage);

  // Componente per i controlli di paginazione
  const PaginationControls = ({
    currentPage,
    totalPages,
    goToPrev,
    goToNext,
  }) => (
    <div className="flex items-center justify-between py-2 border-t">
      <div className="text-sm text-gray-500">
        Pagina {currentPage} di {totalPages || 1}
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={goToPrev}
          disabled={currentPage <= 1}
        >
          <ChevronLeft className="h-4 w-4" />
          Precedente
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={goToNext}
          disabled={currentPage >= totalPages}
        >
          Successiva
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>
              Seleziona un Articolo Esistente o Crea Nuovo
            </DialogTitle>
          </DialogHeader>

          <div className="relative">
            <Input
              placeholder="Cerca per codice o descrizione..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="mb-4 pl-8"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearchERPItems();
                }
              }}
            />
            <Search className="h-4 w-4 absolute top-3 left-2 text-gray-400" />
            {searchText && (
              <X
                className="h-4 w-4 absolute top-3 right-2 text-gray-400 cursor-pointer"
                onClick={() => {
                  setSearchText("");
                  loadData();
                }}
              />
            )}
          </div>

          {/* Opzione per importare la distinta base (solo per articoli temporanei) */}
          {selectedTab === "temporary" && (
            <div className="flex items-center w-full mb-4">
              <Checkbox
                id="import-bom"
                checked={importBOM}
                onCheckedChange={setImportBOM}
                className={`${importBOM ? "bg-primary" : "bg-gray-200"} `}
              />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor="import-bom" className="flex items-center gap-2">
                  <ListFilter className="h-4 w-4 text-blue-600" />
                  <span>Importa anche la distinta base (se disponibile)</span>
                </Label>
                <p className="text-sm text-muted-foreground">
                  Se l'articolo ha una distinta, potrai selezionare quali componenti importare
                </p>
              </div>
            </div>
          )}

          <Tabs
            value={selectedTab}
            onValueChange={handleTabChange}
            className="flex-1 flex flex-col min-h-0 " id="article-selection-modal"
          >
            <TabsList className="mb-4">
              <TabsTrigger value="temporary">
                <FileText className="h-4 w-4 mr-2" />
                Articoli Temporanei
              </TabsTrigger>
              <TabsTrigger value="defined">
                <Database className="h-4 w-4 mr-2" />
                Articoli da Gestionale
              </TabsTrigger>
              <TabsTrigger value="new">
                <Plus className="h-4 w-4 mr-2" />
                Nuovo Articolo
              </TabsTrigger>
            </TabsList>

            {/* Tab Articoli Temporanei */}
            <TabsContent
              value="temporary"
              className="flex-1 flex flex-col m-0 border-none p-0 min-h-0"
            >
              <div className="flex-1 overflow-auto min-h-0" id="article-selection-modal-temporary-content">
                {loading ? (
                  <div className="flex items-center justify-center h-20">
                    <Loader2 className="h-6 w-6 text-primary animate-spin" />
                  </div>
                ) : temporaryFiltered.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {temporaryItems.length === 0
                      ? "Nessun articolo temporaneo disponibile"
                      : "Nessun risultato per la ricerca corrente"}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Codice</TableHead>
                        <TableHead>Descrizione</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>UdM</TableHead>
                        <TableHead className="text-right">Azioni</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedTempItems.map((item) => (
                        <TableRow key={item.Id} className="hover:bg-slate-50">
                          <TableCell className="font-medium">
                            {item.Item}
                          </TableCell>
                          <TableCell className="max-w-[300px] truncate">
                            {item.Description}
                          </TableCell>
                          <TableCell>{getNatureBadge(item.Nature)}</TableCell>
                          <TableCell>{item.BaseUoM || "PZ"}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSelectTemporary(item)}
                              className="gap-1"
                            >
                              <Copy className="h-4 w-4" />
                              Seleziona
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>

              {/* Controlli di paginazione per articoli temporanei */}
              {temporaryFiltered.length > 0 && (
                <PaginationControls
                  currentPage={currentTempPage}
                  totalPages={temporaryFiltered.length / itemsPerPage}
                  goToPrev={() => setCurrentTempPage(currentTempPage - 1)}
                  goToNext={() => setCurrentTempPage(currentTempPage + 1)}
                />
              )}

              <div className="mt-2 text-sm text-gray-500">
                Gli articoli temporanei sono già stati creati per altri progetti e
                possono essere riutilizzati.
                {temporaryFiltered.length > 0 && (
                  <span className="ml-2 text-blue-600">
                    {temporaryFiltered.length} articoli trovati
                  </span>
                )}
              </div>
            </TabsContent>

            {/* Tab Articoli da Gestionale */}
            <TabsContent
              value="defined"
              className="flex-1 flex flex-col m-0 border-none p-0 min-h-0" id="article-selection-modal-defined-content"
            >
              <div className="flex-1 overflow-auto min-h-0" id="article-selection-modal-defined-content">
                {loading ? (
                  <div className="flex items-center justify-center h-20">
                    <Loader2 className="h-6 w-6 text-primary animate-spin" />
                  </div>
                ) : definedFiltered.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {definedItems.length === 0
                      ? "Nessun articolo definito disponibile. Effettua una ricerca."
                      : "Nessun risultato per la ricerca corrente"}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Codice</TableHead>
                        <TableHead>Descrizione</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>UdM</TableHead>
                        <TableHead className="text-right">Azioni</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedDefItems.map((item) => (
                        <TableRow key={item.Item} className="hover:bg-slate-50">
                          <TableCell className="font-medium">
                            {item.Item}
                          </TableCell>
                          <TableCell className="max-w-[300px] truncate">
                            {item.Description}
                          </TableCell>
                          <TableCell>{getNatureBadge(item.Nature)}</TableCell>
                          <TableCell>{item.BaseUoM || "PZ"}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSelectDefined(item)}
                              className="gap-1"
                            >
                              <Layers className="h-4 w-4" />
                              Seleziona e Configura
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>

              {/* Controlli di paginazione per articoli da gestionale */}
              {definedFiltered.length > 0 && (
                <PaginationControls
                  currentPage={currentDefPage}
                  totalPages={definedTotalPages}
                  goToPrev={goToPrevDefPage}
                  goToNext={goToNextDefPage}
                />
              )}

              <div className="mt-2 text-sm text-gray-500 flex items-center gap-2">
                <Database className="h-4 w-4 text-gray-400" />
                <span>
                  Gli articoli dal gestionale verranno importati dopo la configurazione della distinta.
                </span>
                {definedTotalItems > 0 && (
                  <span className="ml-2 text-blue-600">
                    {definedTotalItems} articoli trovati
                  </span>
                )}
              </div>
            </TabsContent>

            {/* Tab Nuovo Articolo */}
            <TabsContent
              value="new"
              className="flex-1 flex flex-col m-0 border-none p-0 min-h-0"
            >
              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <div className="rounded-full bg-primary/10 p-4">
                      <Package className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold">
                      Crea un Nuovo Articolo
                    </h3>
                    <p className="text-center text-gray-500 max-w-md">
                      Crea un nuovo articolo temporaneo da zero. Potrai
                      specificare tutti i dettagli nella schermata successiva.
                    </p>
                    <Button className="mt-4" onClick={onCreateNew}>
                      Crea Nuovo Articolo
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Annulla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Wizard per l'importazione della distinta */}
      <BOMImportWizard
        isOpen={showBOMWizard}
        onClose={() => {
          setShowBOMWizard(false);
          setSelectedItemForWizard(null);
          setWizardSource(null);
        }}
        sourceItem={selectedItemForWizard}
        onConfirm={handleWizardConfirm}
        project={project}
      />
    </>
  );
};

export default ArticleSelectionModal;