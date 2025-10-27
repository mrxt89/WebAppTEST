import React, { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { BookOpen, Check, ChevronsUpDown, ExternalLink, Plus, Edit, Trash2, X } from "lucide-react";
import { swal } from "../../../lib/common";
import useWikiManagement from "@/hooks/useWikiManagement";
import axiosInstance from "@/lib/axios";

const PagesTab = ({
  pages,
  groups,
  enableDisablePage,
  toggleInheritPermissions,
  assignGroupToPage,
  removeGroupFromPage,
  fetchPages,
}) => {
  const [selectedPage, setSelectedPage] = useState(null);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [expandedPages, setExpandedPages] = useState({});
  const [applyToChildren, setApplyToChildren] = useState(false);
  const [pageDisabled, setPageDisabled] = useState(false);
  const [pageInheritPermissions, setPageInheritPermissions] = useState(false);

  // Stati per i dialoghi di conferma
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmTitle, setConfirmTitle] = useState("");

  // Stati per la gestione wiki components
  const [wikiPages, setWikiPages] = useState([]);
  const [wikiPageSearchOpen, setWikiPageSearchOpen] = useState(false);
  const [loadingWikiPages, setLoadingWikiPages] = useState(false);
  const [wikiComponents, setWikiComponents] = useState([]);
  const [loadingWikiComponents, setLoadingWikiComponents] = useState(false);
  const [wikiDialogOpen, setWikiDialogOpen] = useState(false);
  const [editingWikiComponent, setEditingWikiComponent] = useState(null);
  const [wikiFormData, setWikiFormData] = useState({
    componentName: "",
    componentDescription: "",
    wikiPageId: null,
    sequence: 0,
    iconName: "",
    isActive: true,
  });

  // Hook per wiki
  const {
    fetchWikiPages,
    fetchComponentsByPage,
    createComponent,
    updateComponent,
    deleteComponent,
  } = useWikiManagement();

  // Carica pagine wiki all'avvio
  useEffect(() => {
    const loadWikiPages = async () => {
      setLoadingWikiPages(true);
      const pages = await fetchWikiPages();
      setWikiPages(pages);
      setLoadingWikiPages(false);
    };
    loadWikiPages();
  }, [fetchWikiPages]);

  // Carica componenti wiki quando cambia la pagina selezionata
  useEffect(() => {
    if (selectedPage) {
      loadWikiComponentsForPage(selectedPage.pageId);
    } else {
      setWikiComponents([]);
    }
  }, [selectedPage]);

  const handleSelectPage = (page) => {
    setSelectedPage(page);
    setSelectedGroups([]);
    setApplyToChildren(false);
    setPageDisabled(page.disabled);
    setPageInheritPermissions(!!page.inheritPermissions);
  };

  // Funzioni per gestione componenti wiki
  const loadWikiComponentsForPage = async (pageId) => {
    setLoadingWikiComponents(true);
    try {
      const components = await fetchComponentsByPage(pageId);
      setWikiComponents(components);
    } catch (error) {
      console.error("Error loading wiki components:", error);
      setWikiComponents([]);
    } finally {
      setLoadingWikiComponents(false);
    }
  };

  const handleAddWikiComponent = () => {
    setEditingWikiComponent(null);
    setWikiFormData({
      componentName: "",
      componentDescription: "",
      wikiPageId: null,
      sequence: ((wikiComponents?.length || 0) + 1) * 10,
      iconName: "BookOpen",
      isActive: true,
    });
    setWikiDialogOpen(true);
  };

  const handleEditWikiComponent = (component) => {
    setEditingWikiComponent(component);
    setWikiFormData({
      componentName: component.componentName,
      componentDescription: component.componentDescription || "",
      wikiPageId: component.wikiPageId || null,
      sequence: component.sequence,
      iconName: component.iconName || "BookOpen",
      isActive: component.isActive,
    });
    setWikiDialogOpen(true);
  };

  const handleDeleteWikiComponent = async (componentId) => {
    if (!confirm("Sei sicuro di voler eliminare questo componente wiki?")) {
      return;
    }

    try {
      await deleteComponent(componentId);
      await loadWikiComponentsForPage(selectedPage.pageId);
      swal.fire("Successo", "Componente wiki eliminato con successo", "success");
    } catch (error) {
      console.error("Error deleting wiki component:", error);
    }
  };

  const handleSaveWikiComponent = async () => {
    if (!wikiFormData.componentName) {
      swal.fire("Attenzione", "Inserisci il nome del componente", "warning");
      return;
    }

    if (!wikiFormData.wikiPageId) {
      swal.fire("Attenzione", "Seleziona una pagina wiki", "warning");
      return;
    }

    try {
      const data = {
        ...wikiFormData,
        pageId: selectedPage.pageId,
        // componentKey sarà auto-generato dal backend se non fornito
      };

      if (editingWikiComponent) {
        await updateComponent(editingWikiComponent.componentId, data);
      } else {
        await createComponent(data);
      }

      setWikiDialogOpen(false);
      await loadWikiComponentsForPage(selectedPage.pageId);
      swal.fire("Successo", "Componente wiki salvato con successo", "success");
    } catch (error) {
      console.error("Error saving wiki component:", error);
    }
  };

  const handleGroupCheckbox = (groupId) => {
    setSelectedGroups((prevSelected) => {
      const isAlreadySelected = prevSelected.includes(groupId);

      if (isAlreadySelected) {
        return prevSelected.filter((id) => id !== groupId);
      } else {
        return [...prevSelected, groupId];
      }
    });
  };

  const togglePageExpanded = (pageId) => {
    setExpandedPages((prev) => ({
      ...prev,
      [pageId]: !prev[pageId],
    }));
  };

  // Fixed function for handling page enabled/disabled state
  const handlePageDisabledChange = (checked) => {
    if (selectedPage) {
      // Il nuovo stato disabled è l'opposto di checked
      const newDisabledState = !checked;

      if (newDisabledState) {
        // Disabilitazione: controlla se ha figli
        if (selectedPage.childCount > 0) {
          setConfirmTitle("Attenzione");
          setConfirmMessage("Disabilitando questa pagina verranno disabilitate anche tutte le pagine figlie. Vuoi continuare?");
          setConfirmAction(() => () => updatePageStatus(newDisabledState));
          setConfirmDialogOpen(true);
        } else {
          // Nessun figlio, procedi direttamente
          updatePageStatus(newDisabledState);
        }
      } else {
        // Abilitazione: controlla se ha genitori disabilitati
        const hasDisabledParent =
          selectedPage.pageParent &&
          pages.some(
            (page) => page.pageId === selectedPage.pageParent && page.disabled,
          );

        if (hasDisabledParent) {
          setConfirmTitle("Informazione");
          setConfirmMessage("Abilitando questa pagina verranno abilitate anche tutte le pagine genitore nella gerarchia. Vuoi continuare?");
          setConfirmAction(() => () => updatePageStatus(newDisabledState));
          setConfirmDialogOpen(true);
        } else {
          // Nessun genitore disabilitato, procedi direttamente
          updatePageStatus(newDisabledState);
        }
      }
    }
  };

  // Funzione helper per aggiornare lo stato della pagina
  const updatePageStatus = (newDisabledState) => {
    // Aggiorna lo stato locale immediatamente per una UI reattiva
    setPageDisabled(newDisabledState);

    // Chiamata all'API con il nuovo stato disabled
    enableDisablePage(selectedPage.pageId, newDisabledState)
      .then(() => {
        // Messaggio di successo con informazioni su cosa è stato modificato
        let message = "";

        if (newDisabledState) {
          message = "Pagina disabilitata con successo";
          if (selectedPage.childCount > 0) {
            message += ", insieme a tutte le pagine figlie";
          }
        } else {
          message = "Pagina abilitata con successo";
          if (selectedPage.pageParent) {
            message += ", insieme a tutte le pagine genitore nella gerarchia";
          }
        }

        swal.fire("Successo", message, "success");

        // Aggiorna i dati delle pagine
        fetchPages();

        // Aggiorna l'oggetto selectedPage
        setSelectedPage((prev) => ({
          ...prev,
          disabled: newDisabledState,
        }));
      })
      .catch((error) => {
        console.error(
          "Errore durante la modifica dello stato della pagina:",
          error,
        );
        // Ripristina lo stato locale in caso di errore
        setPageDisabled(!newDisabledState);
        swal.fire(
          "Errore",
          "Si è verificato un errore durante la modifica dello stato della pagina",
          "error",
        );
      });
  };

  // Fixed function for handling inheritance change
  const handleInheritanceChange = (checked) => {
    if (selectedPage) {
      // Update local state immediately for responsive UI
      setPageInheritPermissions(checked);

      // Call the API with the correct parameter (1 = inherit, 0 = don't inherit)
      const inheritValue = checked ? 1 : 0;

      toggleInheritPermissions(selectedPage.pageId, inheritValue)
        .then(() => {
          // Update the selected page
          setSelectedPage((prev) => ({
            ...prev,
            inheritPermissions: checked ? 1 : 0,
          }));
        })
        .catch((error) => {
          console.error("Error toggling inheritance:", error);
          // Revert local state on error
          setPageInheritPermissions(!checked);
        });
    }
  };

  const handleAssignGroupsToPage = () => {
    if (selectedPage && selectedGroups.length > 0) {
      Promise.all(
        selectedGroups.map((groupId) =>
          assignGroupToPage(selectedPage.pageId, groupId, applyToChildren),
        ),
      )
        .then(() => {
          swal.fire(
            "Successo",
            "Gruppi assegnati alla pagina con successo.",
            "success",
          );
          fetchPages(); // Aggiorna le pagine
          setSelectedGroups([]); // Reset selezione
        })
        .catch((error) => {
          console.error(
            "Errore durante l'assegnazione dei gruppi alla pagina:",
            error,
          );
          swal.fire(
            "Errore",
            "Errore durante l'assegnazione dei gruppi alla pagina.",
            "error",
          );
        });
    }
  };

  const handleRemoveGroupsFromPage = () => {
    if (selectedPage && selectedGroups.length > 0) {
      Promise.all(
        selectedGroups.map((groupId) =>
          removeGroupFromPage(selectedPage.pageId, groupId, applyToChildren),
        ),
      )
        .then(() => {
          swal.fire(
            "Successo",
            "Gruppi rimossi dalla pagina con successo.",
            "success",
          );
          fetchPages(); // Aggiorna le pagine
          setSelectedGroups([]); // Reset selezione
        })
        .catch((error) => {
          console.error(
            "Errore durante la rimozione dei gruppi dalla pagina:",
            error,
          );
          swal.fire(
            "Errore",
            "Errore durante la rimozione dei gruppi dalla pagina.",
            "error",
          );
        });
    }
  };

  // Function to render the page hierarchy
  const renderPageHierarchy = (pagesList, level = 0, parentId = null) => {
    const filteredList = pagesList.filter((page) => {
      if (parentId === null) {
        return !page.pageParent || page.pageParent === 0;
      }
      return page.pageParent === parentId;
    });

    return (
      <>
        {filteredList.map((page) => {
          const hasChildren = page.childCount > 0;
          const isExpanded = expandedPages[page.pageId];
          const isSelected =
            selectedPage && selectedPage.pageId === page.pageId;

          return (
            <React.Fragment key={page.pageId}>
              <TableRow
                className={`${page.disabled ? "bg-red-100" : ""} ${isSelected ? "bg-blue-100" : ""}`}
                onClick={() => handleSelectPage(page)}
              >
                <TableCell className="font-medium">
                  <div
                    className="flex items-center"
                    style={{ marginLeft: `${level * 20}px` }}
                  >
                    {hasChildren && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 mr-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePageExpanded(page.pageId);
                        }}
                      >
                        <i
                          className={`fa-solid ${isExpanded ? "fa-chevron-down" : "fa-chevron-right"}`}
                        ></i>
                      </Button>
                    )}
                    {!hasChildren && level > 0 && (
                      <div className="w-10 h-8"></div>
                    )}
                    <span className="cursor-pointer hover:underline">
                      {page.pageName}
                    </span>
                    {page.inheritPermissions && (
                      <Badge variant="outline" className="ml-2">
                        Eredita
                      </Badge>
                    )}
                  </div>
                </TableCell>
              </TableRow>
              {hasChildren &&
                isExpanded &&
                renderPageHierarchy(pagesList, level + 1, page.pageId)}
            </React.Fragment>
          );
        })}
      </>
    );
  };

  const renderPageDetails = () => {
    if (!selectedPage) {
      return (
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">
            Seleziona una pagina per visualizzare i dettagli
          </p>
        </div>
      );
    }

    // Lists of groups already assigned and available for assignment
    const pageGroups = selectedPage.groups || [];
    const availableGroups = groups.filter(
      (group) => !pageGroups.some((pg) => pg.groupId === group.groupId),
    );
    const hasChildren = selectedPage.childCount > 0;

    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium">{selectedPage.pageName}</h3>
          <p className="text-muted-foreground">
            {selectedPage.pageDescription || selectedPage.pageRoute}
          </p>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="page-status"
              checked={!pageDisabled}
              onCheckedChange={handlePageDisabledChange}
            />
            <Label htmlFor="page-status" className="cursor-pointer">
              Pagina {pageDisabled ? "disabilitata" : "attiva"}
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="page-inheritance"
              checked={pageInheritPermissions}
              onCheckedChange={handleInheritanceChange}
            />
            <Label htmlFor="page-inheritance" className="cursor-pointer">
              Eredita permessi
            </Label>
          </div>
        </div>

        {hasChildren && (
          <div className="flex items-center space-x-2 bg-accent p-3 rounded-md">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="apply-to-children"
                checked={applyToChildren}
                className={`${applyToChildren ? "bg-primary" : ""}`}
                onCheckedChange={(checked) => {
                  setApplyToChildren(Boolean(checked));
                }}
              />
              <Label htmlFor="apply-to-children" className="cursor-pointer">
                Applica modifiche ai permessi anche alle pagine figlie con
                ereditarietà attiva
              </Label>
            </div>
          </div>
        )}

        {/* Sezione componenti wiki collegati */}
        <div className="border rounded-md p-4 bg-muted/30">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-md font-medium flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Documentazione Wiki ({wikiComponents?.length || 0})
            </h4>
            <Button size="sm" onClick={handleAddWikiComponent} className="h-7">
              <Plus className="h-3 w-3 mr-1" />
              Aggiungi
            </Button>
          </div>

          {loadingWikiComponents ? (
            <div className="text-center py-4 text-sm text-muted-foreground">
              Caricamento componenti wiki...
            </div>
          ) : !wikiComponents || wikiComponents.length === 0 ? (
            <div className="text-center py-4 text-sm text-muted-foreground">
              Nessun componente wiki collegato
            </div>
          ) : (
            <div className="space-y-2">
              {wikiComponents.map((component) => {
                const wikiPage = wikiPages.find(p => p.id === component.wikiPageId);
                return (
                  <div
                    key={component.componentId}
                    className="flex items-center justify-between p-2 border rounded hover:bg-accent/50"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                        <span className="font-medium text-sm">{component.componentName}</span>
                        {component.componentDescription && (
                          <span className="text-xs text-muted-foreground truncate">
                            - {component.componentDescription}
                          </span>
                        )}
                      </div>
                      {wikiPage && (
                        <div className="text-xs text-muted-foreground ml-6 mt-1 font-mono truncate">
                          {wikiPage.path}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      {wikiPage && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => window.open(`${window.location.origin}/wiki${wikiPage.path}`, '_blank')}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => handleEditWikiComponent(component)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteWikiComponent(component.componentId)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <div className="flex justify-content-around items-center mb-2 h-11">
            <h4 className="text-md font-medium">Gruppi con accesso</h4>
            {selectedGroups.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleRemoveGroupsFromPage}
              >
                <i className="fa-solid fa-minus mr-2"></i>
                Rimuovi selezionati
              </Button>
            )}
          </div>

          <ScrollArea className="h-40 border rounded-md p-2">
            {pageGroups.length > 0 ? (
              <div className="space-y-2">
                {pageGroups.map((group) => (
                  <div
                    key={group.groupId}
                    className="flex items-center space-x-2 p-2 hover:bg-accent rounded"
                  >
                    <div className="flex items-center space-x-2 w-full">
                      <Checkbox
                        id={`page-group-${group.groupId}`}
                        checked={selectedGroups.includes(group.groupId)}
                        className={`${selectedGroups.includes(group.groupId) ? "bg-primary" : ""}`}
                        onCheckedChange={() => {
                          handleGroupCheckbox(group.groupId);
                        }}
                      />
                      <Label
                        htmlFor={`page-group-${group.groupId}`}
                        className="flex-1 cursor-pointer"
                      >
                        {group.groupName}
                      </Label>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground p-2">
                Nessun gruppo ha accesso a questa pagina
              </p>
            )}
          </ScrollArea>
        </div>

        <div>
          <div className="flex justify-content-around items-center mb-2 h-11">
            <h4 className="text-md font-medium">Gruppi disponibili</h4>
            {selectedGroups.length > 0 && (
              <Button
                variant="default"
                size="sm"
                onClick={handleAssignGroupsToPage}
              >
                <i className="fa-solid fa-plus mr-2"></i>
                Aggiungi selezionati
              </Button>
            )}
          </div>

          <ScrollArea className="h-40 border rounded-md p-2">
            {availableGroups.length > 0 ? (
              <div className="space-y-2">
                {availableGroups.map((group) => (
                  <div
                    key={group.groupId}
                    className="flex items-center space-x-2 p-2 hover:bg-accent rounded"
                  >
                    <div className="flex items-center space-x-2 w-full">
                      <Checkbox
                        id={`available-group-${group.groupId}`}
                        checked={selectedGroups.includes(group.groupId)}
                        className={`${selectedGroups.includes(group.groupId) ? "bg-primary" : ""}`}
                        onCheckedChange={() => {
                          handleGroupCheckbox(group.groupId);
                        }}
                      />
                      <Label
                        htmlFor={`available-group-${group.groupId}`}
                        className="flex-1 cursor-pointer"
                      >
                        {group.groupName}
                      </Label>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground p-2">
                Nessun gruppo disponibile
              </p>
            )}
          </ScrollArea>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left column - Pages list */}
        <Card>
          <CardHeader>
            <CardTitle>Pagine</CardTitle>
            <CardDescription>
              Gestisci le autorizzazioni delle pagine e l'ereditarietà dei
              permessi.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-230px)] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>{renderPageHierarchy(pages)}</TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Right column - Page details */}
        <Card>
          <CardHeader>
            <CardTitle>Dettagli pagina</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-230px)]">
              {renderPageDetails()}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Dialog gestione componente wiki */}
      <Dialog open={wikiDialogOpen} onOpenChange={setWikiDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingWikiComponent ? "Modifica Componente Wiki" : "Nuovo Componente Wiki"}
            </DialogTitle>
            <DialogDescription>
              Configura il componente wiki per la pagina {selectedPage?.pageName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="componentName">
                Nome Componente <span className="text-red-500">*</span>
              </Label>
              <Input
                id="componentName"
                value={wikiFormData.componentName}
                onChange={(e) => setWikiFormData({ ...wikiFormData, componentName: e.target.value })}
                placeholder="es. Dashboard Articoli"
              />
              <p className="text-xs text-muted-foreground">
                Nome visualizzato per questo collegamento wiki
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="componentDescription">Descrizione</Label>
              <Textarea
                id="componentDescription"
                value={wikiFormData.componentDescription}
                onChange={(e) => setWikiFormData({ ...wikiFormData, componentDescription: e.target.value })}
                placeholder="Descrizione del componente"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>
                Pagina Wiki <span className="text-red-500">*</span>
              </Label>
              <Popover open={wikiPageSearchOpen} onOpenChange={setWikiPageSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between"
                  >
                    {wikiFormData.wikiPageId ? (
                      <div className="flex items-center gap-2 truncate">
                        <BookOpen className="h-4 w-4" />
                        <span className="truncate">
                          {wikiPages.find(p => p.id === wikiFormData.wikiPageId)?.title || "Selezionata"}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Seleziona pagina wiki...</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[500px] p-0">
                  <Command>
                    <CommandInput placeholder="Cerca..." />
                    <CommandList>
                      <CommandEmpty>Nessuna pagina trovata.</CommandEmpty>
                      <CommandGroup>
                        {wikiPages.map((page) => (
                          <CommandItem
                            key={page.id}
                            value={`${page.title} ${page.path}`}
                            onSelect={() => {
                              setWikiFormData({ ...wikiFormData, wikiPageId: page.id });
                              setWikiPageSearchOpen(false);
                            }}
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${
                                wikiFormData.wikiPageId === page.id ? "opacity-100" : "opacity-0"
                              }`}
                            />
                            <div className="flex flex-col flex-1 min-w-0">
                              <span className="font-medium truncate">{page.title}</span>
                              <span className="text-xs text-muted-foreground font-mono truncate">
                                {page.path}
                              </span>
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

          <DialogFooter>
            <Button variant="outline" onClick={() => setWikiDialogOpen(false)}>
              Annulla
            </Button>
            <Button onClick={handleSaveWikiComponent}>
              {editingWikiComponent ? "Aggiorna" : "Crea"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog di conferma */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmTitle}</DialogTitle>
            <DialogDescription>
              {confirmMessage}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              Annulla
            </Button>
            <Button onClick={() => {
              if (confirmAction) {
                confirmAction();
              }
              setConfirmDialogOpen(false);
            }}>
              Conferma
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PagesTab;
