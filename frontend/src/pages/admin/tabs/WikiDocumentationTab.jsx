import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  FileText,
  Plus,
  Edit,
  Trash2,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  Search,
  Filter,
  X,
  Check,
  ChevronsUpDown,
  BookOpen,
  Layers,
  Eye,
  EyeOff,
} from "lucide-react";
import useWikiManagement from "@/hooks/useWikiManagement";

const WikiDocumentationTab = ({ pages }) => {
  const [selectedPage, setSelectedPage] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState(null);
  const [expandedComponents, setExpandedComponents] = useState(new Set());

  // Nuovi stati per la ricerca avanzata
  const [pageSearchOpen, setPageSearchOpen] = useState(false);
  const [componentSearchQuery, setComponentSearchQuery] = useState("");
  const [filterActive, setFilterActive] = useState("all"); // all, active, inactive
  const [viewMode, setViewMode] = useState("tree"); // tree, list

  // Stati per le pagine wiki
  const [wikiPages, setWikiPages] = useState([]);
  const [wikiPageSearchOpen, setWikiPageSearchOpen] = useState(false);
  const [loadingWikiPages, setLoadingWikiPages] = useState(false);

  // Use custom hook
  const {
    components,
    loading,
    fetchComponentsByPage,
    createComponent,
    updateComponent,
    deleteComponent,
    fetchWikiPages,
  } = useWikiManagement();

  // Form state
  const [formData, setFormData] = useState({
    componentKey: "",
    componentName: "",
    componentDescription: "",
    wikiSlug: "",
    wikiPageId: null,
    parentComponentId: null,
    sequence: 0,
    iconName: "",
    isActive: true,
  });

  // Load wiki pages on component mount
  useEffect(() => {
    const loadWikiPages = async () => {
      setLoadingWikiPages(true);
      const pages = await fetchWikiPages();
      setWikiPages(pages);
      setLoadingWikiPages(false);
    };
    loadWikiPages();
  }, [fetchWikiPages]);

  // Load components when page is selected
  useEffect(() => {
    if (selectedPage) {
      fetchComponentsByPage(selectedPage.pageId);
    }
  }, [selectedPage, fetchComponentsByPage]);

  // Filtra i componenti in base alla ricerca e ai filtri
  const filteredComponents = useMemo(() => {
    let filtered = components;

    // Filtro per stato attivo/inattivo
    if (filterActive !== "all") {
      const isActive = filterActive === "active";
      filtered = filtered.filter(c => c.isActive === isActive);
    }

    // Filtro per ricerca testuale
    if (componentSearchQuery) {
      const query = componentSearchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.componentName.toLowerCase().includes(query) ||
        c.componentKey.toLowerCase().includes(query) ||
        (c.componentDescription && c.componentDescription.toLowerCase().includes(query)) ||
        (c.wikiSlug && c.wikiSlug.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [components, componentSearchQuery, filterActive]);

  // Filtra le pagine per la ricerca
  const filteredPages = useMemo(() => {
    return pages.filter(page =>
      page.pageName.toLowerCase().includes(componentSearchQuery.toLowerCase()) ||
      (page.pageRoute && page.pageRoute.toLowerCase().includes(componentSearchQuery.toLowerCase()))
    );
  }, [pages, componentSearchQuery]);

  const handleAddComponent = () => {
    setEditingComponent(null);
    setFormData({
      componentKey: "",
      componentName: "",
      componentDescription: "",
      wikiSlug: "",
      wikiPageId: null,
      parentComponentId: null,
      sequence: (components.length + 1) * 10,
      iconName: "",
      isActive: true,
    });
    setDialogOpen(true);
  };

  const handleEditComponent = (component) => {
    setEditingComponent(component);
    setFormData({
      componentKey: component.componentKey,
      componentName: component.componentName,
      componentDescription: component.componentDescription || "",
      wikiSlug: component.wikiSlug || "",
      wikiPageId: component.wikiPageId || null,
      parentComponentId: component.parentComponentId,
      sequence: component.sequence,
      iconName: component.iconName || "",
      isActive: component.isActive,
    });
    setDialogOpen(true);
  };

  const handleDeleteComponent = async (componentId) => {
    if (!confirm("Sei sicuro di voler eliminare questo componente? Verranno eliminati anche tutti i componenti figli.")) {
      return;
    }

    try {
      await deleteComponent(componentId);
      // Reload components after successful deletion
      fetchComponentsByPage(selectedPage.pageId);
    } catch (error) {
      // Error already handled by the hook
    }
  };

  const handleSaveComponent = async () => {
    if (!formData.componentKey || !formData.componentName) {
      toast.error("Compila i campi obbligatori");
      return;
    }

    try {
      const data = {
        ...formData,
        pageId: selectedPage.pageId,
      };

      if (editingComponent) {
        await updateComponent(editingComponent.componentId, data);
      } else {
        await createComponent(data);
      }

      setDialogOpen(false);
      // Reload components after successful save
      fetchComponentsByPage(selectedPage.pageId);
    } catch (error) {
      // Error already handled by the hook
    }
  };

  const toggleExpand = (componentId) => {
    const newExpanded = new Set(expandedComponents);
    if (newExpanded.has(componentId)) {
      newExpanded.delete(componentId);
    } else {
      newExpanded.add(componentId);
    }
    setExpandedComponents(newExpanded);
  };

  const renderComponentTree = (parentId = null, level = 0) => {
    const children = filteredComponents.filter((c) => c.parentComponentId === parentId);

    return children.map((component) => {
      const hasChildren = filteredComponents.some((c) => c.parentComponentId === component.componentId);
      const isExpanded = expandedComponents.has(component.componentId);

      return (
        <React.Fragment key={component.componentId}>
          <TableRow className="hover:bg-muted/50">
            <TableCell style={{ paddingLeft: `${level * 24 + 12}px` }}>
              <div className="flex items-center gap-2">
                {hasChildren && (
                  <button
                    onClick={() => toggleExpand(component.componentId)}
                    className="p-0 hover:bg-transparent hover:text-primary transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                )}
                {!hasChildren && <div className="w-4" />}
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{component.componentName}</span>
                {component.componentDescription && (
                  <span className="text-xs text-muted-foreground ml-2">
                    - {component.componentDescription}
                  </span>
                )}
              </div>
            </TableCell>
            <TableCell>
              <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                {component.componentKey}
              </code>
            </TableCell>
            <TableCell>
              {component.wikiSlug ? (
                <a
                  href={component.wikiSlug}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1 hover:text-blue-800 transition-colors"
                >
                  {component.wikiSlug}
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <span className="text-xs text-muted-foreground">Non configurato</span>
              )}
            </TableCell>
            <TableCell>
              <Badge variant={component.isActive ? "default" : "secondary"} className="flex items-center gap-1">
                {component.isActive ? (
                  <>
                    <Eye className="h-3 w-3" />
                    Attivo
                  </>
                ) : (
                  <>
                    <EyeOff className="h-3 w-3" />
                    Disattivo
                  </>
                )}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex gap-2 justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEditComponent(component)}
                  className="hover:bg-primary/10 hover:text-primary"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteComponent(component.componentId)}
                  className="hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
          {hasChildren && isExpanded && renderComponentTree(component.componentId, level + 1)}
        </React.Fragment>
      );
    });
  };

  // Render componenti in vista lista (senza gerarchia)
  const renderComponentList = () => {
    return filteredComponents.map((component) => (
      <TableRow key={component.componentId} className="hover:bg-muted/50">
        <TableCell>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{component.componentName}</span>
            {component.componentDescription && (
              <span className="text-xs text-muted-foreground ml-2">
                - {component.componentDescription}
              </span>
            )}
          </div>
        </TableCell>
        <TableCell>
          <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
            {component.componentKey}
          </code>
        </TableCell>
        <TableCell>
          {component.wikiSlug ? (
            <a
              href={component.wikiSlug}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline flex items-center gap-1 hover:text-blue-800 transition-colors"
            >
              {component.wikiSlug}
              <ExternalLink className="h-3 w-3" />
            </a>
          ) : (
            <span className="text-xs text-muted-foreground">Non configurato</span>
          )}
        </TableCell>
        <TableCell>
          <Badge variant={component.isActive ? "default" : "secondary"} className="flex items-center gap-1">
            {component.isActive ? (
              <>
                <Eye className="h-3 w-3" />
                Attivo
              </>
            ) : (
              <>
                <EyeOff className="h-3 w-3" />
                Disattivo
              </>
            )}
          </Badge>
        </TableCell>
        <TableCell className="text-right">
          <div className="flex gap-2 justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEditComponent(component)}
              className="hover:bg-primary/10 hover:text-primary"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeleteComponent(component.componentId)}
              className="hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    ));
  };

  return (
    <div className="space-y-6">
      {/* Header con statistiche */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Pagine Totali</p>
                <p className="text-2xl font-bold">{pages.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium">Componenti Totali</p>
                <p className="text-2xl font-bold">{components.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="text-sm font-medium">Attivi</p>
                <p className="text-2xl font-bold">{components.filter(c => c.isActive).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <EyeOff className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm font-medium">Disattivi</p>
                <p className="text-2xl font-bold">{components.filter(c => !c.isActive).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Gestione Documentazione Wiki
            </CardTitle>
            {selectedPage && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  {selectedPage.pageName}
                </Badge>
                <Button onClick={handleAddComponent} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Nuovo Componente
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Selettore Pagina con Ricerca Avanzata */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">Seleziona Pagina</Label>
              <div className="flex gap-4 items-start">
                <div className="flex-1">
                  <Popover open={pageSearchOpen} onOpenChange={setPageSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={pageSearchOpen}
                        className="w-full justify-between"
                      >
                        {selectedPage ? (
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            <span>{selectedPage.pageName}</span>
                            {selectedPage.pageRoute && (
                              <span className="text-muted-foreground">({selectedPage.pageRoute})</span>
                            )}
                          </div>
                        ) : (
                          "Seleziona una pagina..."
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Cerca pagina..." />
                        <CommandList>
                          <CommandEmpty>Nessuna pagina trovata.</CommandEmpty>
                          <CommandGroup>
                            {pages.map((page) => (
                              <CommandItem
                                key={page.pageId}
                                value={`${page.pageName} ${page.pageRoute || ''}`}
                                onSelect={() => {
                                  setSelectedPage(page);
                                  setPageSearchOpen(false);
                                }}
                              >
                                <Check
                                  className={`mr-2 h-4 w-4 ${
                                    selectedPage?.pageId === page.pageId ? "opacity-100" : "opacity-0"
                                  }`}
                                />
                                <div className="flex items-center gap-2">
                                  <FileText className="h-4 w-4" />
                                  <span>{page.pageName}</span>
                                  {page.pageRoute && (
                                    <span className="text-muted-foreground">({page.pageRoute})</span>
                                  )}
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            {/* Barra di Ricerca e Filtri */}
            {selectedPage && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <div className="flex flex-col sm:flex-row gap-4 flex-1">
                    {/* Ricerca Componenti */}
                    <div className="relative flex-1 max-w-md">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Cerca componenti..."
                        value={componentSearchQuery}
                        onChange={(e) => setComponentSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                      {componentSearchQuery && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                          onClick={() => setComponentSearchQuery("")}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>

                    {/* Filtro Stato */}
                    <Select value={filterActive} onValueChange={setFilterActive}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tutti</SelectItem>
                        <SelectItem value="active">Solo Attivi</SelectItem>
                        <SelectItem value="inactive">Solo Disattivi</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Vista */}
                    <div className="flex border rounded-md">
                      <Button
                        variant={viewMode === "tree" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setViewMode("tree")}
                        className="rounded-r-none"
                      >
                        <Layers className="h-4 w-4 mr-1" />
                        Albero
                      </Button>
                      <Button
                        variant={viewMode === "list" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setViewMode("list")}
                        className="rounded-l-none"
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        Lista
                      </Button>
                    </div>
                  </div>

                  {/* Statistiche Filtri */}
                  <div className="text-sm text-muted-foreground">
                    {filteredComponents.length} di {components.length} componenti
                  </div>
                </div>

                {/* Tabella Componenti */}
                <div className="border rounded-lg overflow-hidden">
                  {loading ? (
                    <div className="p-8 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                      <p className="text-muted-foreground">Caricamento componenti...</p>
                    </div>
                  ) : components.length === 0 ? (
                    <div className="p-8 text-center">
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Nessun componente documentato</h3>
                      <p className="text-muted-foreground mb-4">
                        Questa pagina non ha ancora componenti documentati.
                      </p>
                      <Button onClick={handleAddComponent}>
                        <Plus className="h-4 w-4 mr-2" />
                        Crea Primo Componente
                      </Button>
                    </div>
                  ) : filteredComponents.length === 0 ? (
                    <div className="p-8 text-center">
                      <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Nessun risultato trovato</h3>
                      <p className="text-muted-foreground mb-4">
                        Prova a modificare i filtri o la ricerca.
                      </p>
                      <Button variant="outline" onClick={() => {
                        setComponentSearchQuery("");
                        setFilterActive("all");
                      }}>
                        <X className="h-4 w-4 mr-2" />
                        Rimuovi Filtri
                      </Button>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome Componente</TableHead>
                          <TableHead>Chiave</TableHead>
                          <TableHead>Wiki Slug</TableHead>
                          <TableHead>Stato</TableHead>
                          <TableHead className="text-right">Azioni</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {viewMode === "tree" ? renderComponentTree() : renderComponentList()}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingComponent ? (
                <>
                  <Edit className="h-5 w-5" />
                  Modifica Componente
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5" />
                  Nuovo Componente
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {editingComponent
                ? "Modifica i dettagli del componente wiki"
                : "Aggiungi un nuovo componente documentato per questa pagina"}
              {selectedPage && (
                <div className="mt-2 p-2 bg-muted rounded-md">
                  <span className="text-sm font-medium">Pagina:</span> {selectedPage.pageName}
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            {/* Sezione Principale */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Informazioni Principali
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="componentKey" className="flex items-center gap-1">
                    Chiave Componente <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="componentKey"
                    value={formData.componentKey}
                    onChange={(e) =>
                      setFormData({ ...formData, componentKey: e.target.value })
                    }
                    placeholder="es. overview, tasks, articles"
                    className="font-mono"
                  />
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Il valore ESATTO di <code className="bg-muted px-1 rounded">value="..."</code> nel TabsTrigger del codice React.</p>
                    <p><strong>Esempio:</strong> se nel codice c'è <code className="bg-muted px-1 rounded">&lt;TabsTrigger value="articles"&gt;</code>, scrivi <code className="bg-muted px-1 rounded">articles</code></p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="componentName" className="flex items-center gap-1">
                    Nome Visualizzato <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="componentName"
                    value={formData.componentName}
                    onChange={(e) =>
                      setFormData({ ...formData, componentName: e.target.value })
                    }
                    placeholder="es. Gestione Articoli"
                  />
                  <p className="text-xs text-muted-foreground">
                    Nome che apparirà nella documentazione e nel menu
                  </p>
                </div>
              </div>
            </div>

            {/* Sezione Descrizione e Wiki */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Documentazione
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="componentDescription">Descrizione</Label>
                  <Textarea
                    id="componentDescription"
                    value={formData.componentDescription}
                    onChange={(e) =>
                      setFormData({ ...formData, componentDescription: e.target.value })
                    }
                    placeholder="Descrizione dettagliata del componente e delle sue funzionalità..."
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    Descrizione che apparirà come tooltip e nella documentazione
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wikiPage" className="flex items-center gap-1">
                    Pagina Wiki <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex items-center gap-2 flex-1">
                    <Popover open={wikiPageSearchOpen} onOpenChange={setWikiPageSearchOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={wikiPageSearchOpen}
                          className="w-full justify-between font-mono text-sm"
                        >
                          {formData.wikiPageId ? (
                            <div className="flex items-center gap-2 truncate">
                              <BookOpen className="h-4 w-4 flex-shrink-0" />
                              <span className="truncate">
                                {wikiPages.find(p => p.id === formData.wikiPageId)?.title || "Pagina selezionata"}
                              </span>
                              <span className="text-muted-foreground text-xs truncate">
                                ({wikiPages.find(p => p.id === formData.wikiPageId)?.path})
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Seleziona una pagina wiki...</span>
                          )}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[600px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Cerca pagina wiki..." />
                          <CommandList>
                            <CommandEmpty>Nessuna pagina wiki trovata.</CommandEmpty>
                            <CommandGroup>
                              {loadingWikiPages ? (
                                <div className="p-4 text-center text-sm text-muted-foreground">
                                  Caricamento pagine wiki...
                                </div>
                              ) : (
                                wikiPages.map((page) => (
                                  <CommandItem
                                    key={page.id}
                                    value={`${page.title} ${page.path}`}
                                    onSelect={() => {
                                      setFormData({ ...formData, wikiPageId: page.id, wikiSlug: "" });
                                      setWikiPageSearchOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={`mr-2 h-4 w-4 ${
                                        formData.wikiPageId === page.id ? "opacity-100" : "opacity-0"
                                      }`}
                                    />
                                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <BookOpen className="h-4 w-4 flex-shrink-0" />
                                        <span className="font-medium truncate">{page.title}</span>
                                      </div>
                                      <span className="text-xs text-muted-foreground font-mono truncate">
                                        {page.path}
                                      </span>
                                      {page.description && (
                                        <span className="text-xs text-muted-foreground truncate">
                                          {page.description}
                                        </span>
                                      )}
                                    </div>
                                  </CommandItem>
                                ))
                              )}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {formData.wikiPageId && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const selectedPage = wikiPages.find(p => p.id === formData.wikiPageId);
                          if (selectedPage) {
                            window.open(`${window.location.origin}/wiki${selectedPage.path}`, '_blank');
                          }
                        }}
                        className="flex items-center gap-1 flex-shrink-0"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Anteprima
                      </Button>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Seleziona la pagina wiki dal database WikiJS. Il collegamento è basato su ID immutabile.</p>
                    <p><strong>Vantaggi:</strong> Se rinomini il path nel wiki, il collegamento funziona ancora.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sezione Configurazione Avanzata */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Configurazione Avanzata
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="parentComponent">Componente Padre</Label>
                  <Select
                    value={formData.parentComponentId?.toString() || "none"}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        parentComponentId: value === "none" ? null : parseInt(value),
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Nessuno" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nessuno (Root)</SelectItem>
                      {components
                        .filter(
                          (c) =>
                            !editingComponent ||
                            c.componentId !== editingComponent.componentId
                        )
                        .map((c) => (
                          <SelectItem key={c.componentId} value={c.componentId.toString()}>
                            {c.componentName}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Seleziona un componente padre per creare una gerarchia
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sequence">Ordine di Visualizzazione</Label>
                  <Input
                    id="sequence"
                    type="number"
                    value={formData.sequence}
                    onChange={(e) =>
                      setFormData({ ...formData, sequence: parseInt(e.target.value) || 0 })
                    }
                    placeholder="0"
                  />
                  <p className="text-xs text-muted-foreground">
                    Numero per ordinare i componenti (0 = primo)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="iconName">Icona (Lucide)</Label>
                  <Input
                    id="iconName"
                    value={formData.iconName}
                    onChange={(e) =>
                      setFormData({ ...formData, iconName: e.target.value })
                    }
                    placeholder="Package"
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Nome dell'icona Lucide (es. Package, FileText, Settings)
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 p-4 bg-muted rounded-lg">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData({ ...formData, isActive: e.target.checked })
                  }
                  className="rounded border-gray-300"
                />
                <Label htmlFor="isActive" className="flex items-center gap-2">
                  {formData.isActive ? (
                    <>
                      <Eye className="h-4 w-4 text-green-600" />
                      Componente Attivo
                    </>
                  ) : (
                    <>
                      <EyeOff className="h-4 w-4 text-orange-600" />
                      Componente Disattivo
                    </>
                  )}
                </Label>
                <p className="text-xs text-muted-foreground ml-4">
                  I componenti disattivi non appariranno nella documentazione
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              {editingComponent ? "Modifica in corso..." : "Creazione nuovo componente"}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Annulla
              </Button>
              <Button onClick={handleSaveComponent} className="flex items-center gap-2">
                {editingComponent ? (
                  <>
                    <Edit className="h-4 w-4" />
                    Salva Modifiche
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Crea Componente
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WikiDocumentationTab;
