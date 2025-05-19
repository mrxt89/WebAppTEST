import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { swal } from '../../../lib/common';

const PagesTab = ({ 
  pages, 
  groups, 
  enableDisablePage, 
  toggleInheritPermissions, 
  assignGroupToPage, 
  removeGroupFromPage, 
  fetchPages 
}) => {
  const [selectedPage, setSelectedPage] = useState(null);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [expandedPages, setExpandedPages] = useState({});
  const [applyToChildren, setApplyToChildren] = useState(false);
  const [pageDisabled, setPageDisabled] = useState(false);
  const [pageInheritPermissions, setPageInheritPermissions] = useState(false);
  
  const handleSelectPage = (page) => {
    setSelectedPage(page);
    setSelectedGroups([]);
    setApplyToChildren(false);
    setPageDisabled(page.disabled);
    setPageInheritPermissions(!!page.inheritPermissions);
  };

  const handleGroupCheckbox = (groupId) => {
    setSelectedGroups(prevSelected => {
      const isAlreadySelected = prevSelected.includes(groupId);
      
      if (isAlreadySelected) {
        return prevSelected.filter(id => id !== groupId);
      } else {
        return [...prevSelected, groupId];
      }
    });
  };

  const togglePageExpanded = (pageId) => {
    setExpandedPages(prev => ({
      ...prev,
      [pageId]: !prev[pageId]
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
          swal.fire({
            title: 'Attenzione',
            text: 'Disabilitando questa pagina verranno disabilitate anche tutte le pagine figlie. Vuoi continuare?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sì, disabilita',
            cancelButtonText: 'Annulla'
          }).then((result) => {
            if (result.isConfirmed) {
              updatePageStatus(newDisabledState);
            }
          });
        } else {
          // Nessun figlio, procedi direttamente
          updatePageStatus(newDisabledState);
        }
      } else {
        // Abilitazione: controlla se ha genitori disabilitati
        const hasDisabledParent = selectedPage.pageParent && 
          pages.some(page => page.pageId === selectedPage.pageParent && page.disabled);
        
        if (hasDisabledParent) {
          swal.fire({
            title: 'Informazione',
            text: 'Abilitando questa pagina verranno abilitate anche tutte le pagine genitore nella gerarchia. Vuoi continuare?',
            icon: 'info',
            showCancelButton: true,
            confirmButtonText: 'Sì, abilita',
            cancelButtonText: 'Annulla'
          }).then((result) => {
            if (result.isConfirmed) {
              updatePageStatus(newDisabledState);
            }
          });
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
        let message = '';
        
        if (newDisabledState) {
          message = 'Pagina disabilitata con successo';
          if (selectedPage.childCount > 0) {
            message += ', insieme a tutte le pagine figlie';
          }
        } else {
          message = 'Pagina abilitata con successo';
          if (selectedPage.pageParent) {
            message += ', insieme a tutte le pagine genitore nella gerarchia';
          }
        }
        
        swal.fire('Successo', message, 'success');
        
        // Aggiorna i dati delle pagine
        fetchPages();
        
        // Aggiorna l'oggetto selectedPage
        setSelectedPage(prev => ({
          ...prev,
          disabled: newDisabledState
        }));
      })
      .catch(error => {
        console.error("Errore durante la modifica dello stato della pagina:", error);
        // Ripristina lo stato locale in caso di errore
        setPageDisabled(!newDisabledState);
        swal.fire('Errore', 'Si è verificato un errore durante la modifica dello stato della pagina', 'error');
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
          setSelectedPage(prev => ({
            ...prev,
            inheritPermissions: checked ? 1 : 0
          }));
        })
        .catch(error => {
          console.error("Error toggling inheritance:", error);
          // Revert local state on error
          setPageInheritPermissions(!checked);
        });
    }
  };

  const handleAssignGroupsToPage = () => {
    if (selectedPage && selectedGroups.length > 0) {
      Promise.all(selectedGroups.map(groupId => 
        assignGroupToPage(selectedPage.pageId, groupId, applyToChildren)
      ))
        .then(() => {
          swal.fire('Successo', 'Gruppi assegnati alla pagina con successo.', 'success');
          fetchPages(); // Aggiorna le pagine
          setSelectedGroups([]); // Reset selezione
        })
        .catch((error) => {
          console.error('Errore durante l\'assegnazione dei gruppi alla pagina:', error);
          swal.fire('Errore', 'Errore durante l\'assegnazione dei gruppi alla pagina.', 'error');
        });
    }
  };

  const handleRemoveGroupsFromPage = () => {
    if (selectedPage && selectedGroups.length > 0) {
      Promise.all(selectedGroups.map(groupId => 
        removeGroupFromPage(selectedPage.pageId, groupId, applyToChildren)
      ))
        .then(() => {
          swal.fire('Successo', 'Gruppi rimossi dalla pagina con successo.', 'success');
          fetchPages(); // Aggiorna le pagine
          setSelectedGroups([]); // Reset selezione
        })
        .catch((error) => {
          console.error('Errore durante la rimozione dei gruppi dalla pagina:', error);
          swal.fire('Errore', 'Errore durante la rimozione dei gruppi dalla pagina.', 'error');
        });
    }
  };

  // Function to render the page hierarchy
  const renderPageHierarchy = (pagesList, level = 0, parentId = null) => {
    const filteredList = pagesList.filter(page => {
      if (parentId === null) {
        return !page.pageParent || page.pageParent === 0;
      }
      return page.pageParent === parentId;
    });

    return (
      <>
        {filteredList.map(page => {
          const hasChildren = page.childCount > 0;
          const isExpanded = expandedPages[page.pageId];
          const isSelected = selectedPage && selectedPage.pageId === page.pageId;
          
          return (
            <React.Fragment key={page.pageId}>
              <TableRow 
                className={`${page.disabled ? 'bg-red-100' : ''} ${isSelected ? 'bg-blue-100' : ''}`}
                onClick={() => handleSelectPage(page)}
              >
                <TableCell className="font-medium">
                  <div className="flex items-center" style={{ marginLeft: `${level * 20}px` }}>
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
                        <i className={`fa-solid ${isExpanded ? 'fa-chevron-down' : 'fa-chevron-right'}`}></i>
                      </Button>
                    )}
                    {!hasChildren && level > 0 && <div className="w-10 h-8"></div>}
                    <span
                        className='cursor-pointer hover:underline'
                    >
                        {page.pageName}
                    </span>
                    {page.inheritPermissions && (
                      <Badge variant="outline" className="ml-2">Eredita</Badge>
                    )}
                  </div>
                </TableCell>
              </TableRow>
              {hasChildren && isExpanded && renderPageHierarchy(pagesList, level + 1, page.pageId)}
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
          <p className="text-muted-foreground">Seleziona una pagina per visualizzare i dettagli</p>
        </div>
      );
    }

    // Lists of groups already assigned and available for assignment
    const pageGroups = selectedPage.groups || [];
    const availableGroups = groups.filter(group => !pageGroups.some(pg => pg.groupId === group.groupId));
    const hasChildren = selectedPage.childCount > 0;

    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium">{selectedPage.pageName}</h3>
          <p className="text-muted-foreground">{selectedPage.pageDescription || selectedPage.pageRoute}</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Switch 
              id="page-status" 
              checked={!pageDisabled}
              onChange={(e) => handlePageDisabledChange(e.target.checked)}
            />
            <Label htmlFor="page-status" className="cursor-pointer">
              Pagina {pageDisabled ? 'disabilitata' : 'attiva'}
            </Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch 
              id="page-inheritance" 
              checked={pageInheritPermissions}
              onChange={(e) => handleInheritanceChange(e.target.checked)}
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
                className={`${applyToChildren ? 'bg-primary' : ''}`}
                onCheckedChange={(checked) => {
                  setApplyToChildren(Boolean(checked));
                }}
              />
              <Label htmlFor="apply-to-children" className="cursor-pointer">
                Applica modifiche ai permessi anche alle pagine figlie con ereditarietà attiva
              </Label>
            </div>
          </div>
        )}
        
        <Separator />
        
        <div>
          <div className="flex justify-between items-center mb-2 h-14">
            <h4 className="text-md font-medium">Gruppi con accesso</h4>
            {selectedGroups.length > 0 && (
              <Button variant="destructive" size="sm" onClick={handleRemoveGroupsFromPage}>
                <i className="fa-solid fa-minus mr-2"></i>
                Rimuovi selezionati
              </Button>
            )}
          </div>
          
          <ScrollArea className="h-40 border rounded-md p-2">
            {pageGroups.length > 0 ? (
              <div className="space-y-2">
                {pageGroups.map(group => (
                  <div key={group.groupId} className="flex items-center space-x-2 p-2 hover:bg-accent rounded">
                    <div className="flex items-center space-x-2 w-full">
                      <Checkbox 
                        id={`page-group-${group.groupId}`} 
                        checked={selectedGroups.includes(group.groupId)}
                        className={`${selectedGroups.includes(group.groupId) ? 'bg-primary' : ''}`}
                        onCheckedChange={() => {
                          handleGroupCheckbox(group.groupId);
                        }}
                      />
                      <Label htmlFor={`page-group-${group.groupId}`} className="flex-1 cursor-pointer">
                        {group.groupName}
                      </Label>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground p-2">Nessun gruppo ha accesso a questa pagina</p>
            )}
          </ScrollArea>
        </div>
        
        <div>
          <div className="flex justify-between items-center mb-2 h-14">
            <h4 className="text-md font-medium">Gruppi disponibili</h4>
            {selectedGroups.length > 0 && (
              <Button variant="default" size="sm" onClick={handleAssignGroupsToPage}>
                <i className="fa-solid fa-plus mr-2"></i>
                Aggiungi selezionati
              </Button>
            )}
          </div>
          
          <ScrollArea className="h-40 border rounded-md p-2">
            {availableGroups.length > 0 ? (
              <div className="space-y-2">
                {availableGroups.map(group => (
                  <div key={group.groupId} className="flex items-center space-x-2 p-2 hover:bg-accent rounded">
                    <div className="flex items-center space-x-2 w-full">
                      <Checkbox 
                        id={`available-group-${group.groupId}`} 
                        checked={selectedGroups.includes(group.groupId)}
                        className={`${selectedGroups.includes(group.groupId) ? 'bg-primary' : ''}`}
                        onCheckedChange={() => {
                          handleGroupCheckbox(group.groupId);
                        }}
                      />
                      <Label htmlFor={`available-group-${group.groupId}`} className="flex-1 cursor-pointer">
                        {group.groupName}
                      </Label>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground p-2">Nessun gruppo disponibile</p>
            )}
          </ScrollArea>
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Left column - Pages list */}
      <Card>
        <CardHeader>
          <CardTitle>Pagine</CardTitle>
          <CardDescription>
            Gestisci le autorizzazioni delle pagine e l'ereditarietà dei permessi.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-230px)]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                 
                </TableRow>
              </TableHeader>
              <TableBody>
                {renderPageHierarchy(pages)}
              </TableBody>
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
  );
}

export default PagesTab;