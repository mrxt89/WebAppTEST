import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { swal } from '@/lib/common';
import { config } from '@/config';
import {
  Package,
  ShoppingCart,
  Plus,
  Trash2,
  Save,
  Link,
  ArrowRight,
  AlertTriangle
} from 'lucide-react';

/**
 * ArticleReferences - Componente per gestire i riferimenti intercompany di un articolo
 * @param {Object} item - Articolo di cui gestire i riferimenti
 * @param {boolean} canEdit - Flag che indica se l'utente ha i permessi di modifica
 * @param {Function} onRefresh - Callback per aggiornare i dati dopo una modifica
 */
const ArticleReferences = ({ item, canEdit, onRefresh }) => {
  // Stati per la gestione delle referenze
  const [loading, setLoading] = useState(false);
  const [references, setReferences] = useState([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [targetItems, setTargetItems] = useState([]);
  
  // Stato per il form di aggiunta referenze
  const [newReference, setNewReference] = useState({
    SourceProjectItemId: item?.Id,
    SourceCompanyId: null,
    TargetCompanyId: null,
    TargetProjectItemId: null,
    Nature: 22413314 // Acquisto di default
  });
  
  // Caricamento iniziale dei riferimenti dell'articolo
  useEffect(() => {
    if (item?.Id) {
      loadReferences();
      loadCompanies();
    }
  }, [item?.Id]);
  
  // Caricamento dei riferimenti
  const loadReferences = async () => {
    try {
      setLoading(true);
      
      // Se l'articolo ha già dei riferimenti, li utilizziamo
      if (item.references && Array.isArray(item.references)) {
        setReferences(item.references);
        return;
      }
      
      // Altrimenti li carichiamo dall'API
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${config.API_BASE_URL}/projectArticles/references/item/${item.CompanyId}/${item.Id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      if (!response.ok) throw new Error('Errore nel caricamento dei riferimenti');
      
      const data = await response.json();
      setReferences(data);
    } catch (error) {
      console.error('Error loading references:', error);
      swal.fire({
        title: 'Errore',
        text: 'Si è verificato un errore nel caricamento dei riferimenti',
        icon: 'error'
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Caricamento delle aziende
  const loadCompanies = async () => {
    try {
      // In un'implementazione reale, questa funzione chiamerebbe un'API per ottenere
      // l'elenco delle aziende del gruppo. Per ora, utilizziamo dati di esempio.
      setCompanies([
        { CompanyId: 1, Description: 'CBL' },
        { CompanyId: 2, Description: 'Ricos' },
        { CompanyId: 3, Description: 'Tecnoline' }
      ]);
      
      // Inizializza l'azienda sorgente con l'azienda corrente dell'articolo
      setNewReference(prev => ({
        ...prev,
        SourceCompanyId: item.CompanyId
      }));
    } catch (error) {
      console.error('Error loading companies:', error);
    }
  };
  
  // Caricamento degli articoli disponibili per l'azienda target
  const loadTargetItems = async (targetCompanyId) => {
    try {
      setLoading(true);
      
      // In un'implementazione reale, questa funzione chiamerebbe un'API per ottenere
      // gli articoli dell'azienda target. Per ora, utilizziamo dati di esempio.
      setTimeout(() => {
        setTargetItems([
          { Id: 1001, Item: 'ART001', Description: 'Articolo Target 1', Nature: 22413312 },
          { Id: 1002, Item: 'ART002', Description: 'Articolo Target 2', Nature: 22413314 },
          { Id: 1003, Item: 'ART003', Description: 'Articolo Target 3', Nature: 22413313 }
        ]);
        setLoading(false);
      }, 500);
    } catch (error) {
      console.error('Error loading target items:', error);
      setLoading(false);
    }
  };
  
  // Gestione cambiamento del form
  const handleReferenceChange = (field, value) => {
    setNewReference(prev => ({ ...prev, [field]: value }));
    
    // Se è cambiata l'azienda target, carica gli articoli disponibili
    if (field === 'TargetCompanyId' && value) {
      loadTargetItems(value);
    }
  };
  
  // Aggiunta di un nuovo riferimento
  const handleAddReference = async () => {
    try {
      setLoading(true);
      
      // Validazione
      if (!newReference.SourceCompanyId || !newReference.TargetCompanyId || !newReference.Nature) {
        swal.fire({
          title: 'Errore',
          text: 'Compila tutti i campi obbligatori',
          icon: 'error'
        });
        return;
      }
      
      const token = localStorage.getItem('token');
      const payload = {
        action: 'ADD',
        referenceData: newReference
      };
      
      const response = await fetch(`${config.API_BASE_URL}/projectArticles/references`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) throw new Error('Errore nell\'aggiunta del riferimento');
      
      const result = await response.json();
      
      if (result.success) {
        swal.fire({
          title: 'Successo',
          text: 'Riferimento aggiunto con successo',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
        
        // Ricarica i riferimenti e chiudi il dialog
        await loadReferences();
        setShowAddDialog(false);
        
        // Reset del form
        setNewReference({
          SourceProjectItemId: item?.Id,
          SourceCompanyId: item.CompanyId,
          TargetCompanyId: null,
          TargetProjectItemId: null,
          Nature: 22413314
        });
        
        // Ricarica i dati dell'articolo
        if (onRefresh) onRefresh();
      } else {
        throw new Error(result.msg || 'Errore durante l\'aggiunta');
      }
    } catch (error) {
      console.error('Error adding reference:', error);
      swal.fire({
        title: 'Errore',
        text: error.message || 'Si è verificato un errore durante l\'aggiunta del riferimento',
        icon: 'error'
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Eliminazione di un riferimento
  const handleDeleteReference = async (referenceId) => {
    try {
      // Chiedi conferma prima di eliminare
      const confirmation = await swal.fire({
        title: 'Conferma eliminazione',
        text: 'Sei sicuro di voler eliminare questo riferimento?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sì, elimina',
        cancelButtonText: 'Annulla'
      });
      
      if (!confirmation.isConfirmed) return;
      
      setLoading(true);
      
      const token = localStorage.getItem('token');
      const payload = {
        action: 'DELETE',
        referenceData: {
          ReferenceID: referenceId
        }
      };
      
      const response = await fetch(`${config.API_BASE_URL}/projectArticles/references`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) throw new Error('Errore nell\'eliminazione del riferimento');
      
      const result = await response.json();
      
      if (result.success) {
        swal.fire({
          title: 'Successo',
          text: 'Riferimento eliminato con successo',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
        
        // Ricarica i riferimenti
        await loadReferences();
        
        // Ricarica i dati dell'articolo
        if (onRefresh) onRefresh();
      } else {
        throw new Error(result.msg || 'Errore durante l\'eliminazione');
      }
    } catch (error) {
      console.error('Error deleting reference:', error);
      swal.fire({
        title: 'Errore',
        text: error.message || 'Si è verificato un errore durante l\'eliminazione del riferimento',
        icon: 'error'
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Funzione per ottenere icona e colori in base alla natura dell'articolo
  const getNatureDetails = (nature) => {
    switch (nature) {
      case 22413312: // Semilavorato
        return {
          label: 'Conto Lavoro',
          icon: <Package className="h-4 w-4" />,
          color: 'bg-blue-100 text-blue-700 border-blue-200'
        };
      case 22413314: // Acquisto
        return {
          label: 'Acquisto',
          icon: <ShoppingCart className="h-4 w-4" />,
          color: 'bg-amber-100 text-amber-700 border-amber-200'
        };
      default:
        return {
          label: 'Altro',
          icon: <Package className="h-4 w-4" />,
          color: 'bg-gray-100 text-gray-700 border-gray-200'
        };
    }
  };
  
  if (!item) {
    return null;
  }
  
  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Link className="h-5 w-5" />
            Riferimenti Intercompany
          </CardTitle>
          
          {canEdit && (
            <Button
              onClick={() => setShowAddDialog(true)}
              className="flex items-center gap-2"
              variant="outline"
            >
              <Plus className="h-4 w-4" />
              Aggiungi Riferimento
            </Button>
          )}
        </CardHeader>
        
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : references.length > 0 ? (
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader className="bg-slate-50 sticky top-0">
                  <TableRow>
                    <TableHead>Azienda Sorgente</TableHead>
                    <TableHead>Articolo Sorgente</TableHead>
                    <TableHead className="text-center">Tipo</TableHead>
                    <TableHead>Azienda Target</TableHead>
                    <TableHead>Articolo Target</TableHead>
                    {canEdit && <TableHead className="text-right">Azioni</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {references.map((ref) => {
                    const natureDetails = getNatureDetails(ref.Nature);
                    
                    return (
                      <TableRow key={ref.ReferenceID}>
                        <TableCell>{ref.SourceCompanyName}</TableCell>
                        <TableCell>
                          <div className="font-medium">{ref.SourceItemCode}</div>
                          <div className="text-gray-500 text-sm">{ref.SourceItemDescription}</div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={natureDetails.color}>
                            {natureDetails.label}
                          </Badge>
                        </TableCell>
                        <TableCell>{ref.TargetCompanyName}</TableCell>
                        <TableCell>
                          {ref.TargetItemCode ? (
                            <>
                              <div className="font-medium">{ref.TargetItemCode}</div>
                              <div className="text-gray-500 text-sm">{ref.TargetItemDescription}</div>
                            </>
                          ) : (
                            <span className="text-gray-500 italic">Non definito</span>
                          )}
                        </TableCell>
                        {canEdit && (
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteReference(ref.ReferenceID)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          ) : (
            <div className="text-center py-8 text-gray-500 border border-dashed rounded-md">
              {canEdit ? (
                <>
                  <p>Nessun riferimento intercompany definito</p>
                  <p className="text-sm mt-2">
                    Clicca su "Aggiungi Riferimento" per collegare questo articolo ad articoli di altre aziende del gruppo
                  </p>
                </>
              ) : (
                'Nessun riferimento intercompany per questo articolo'
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Dialog per aggiungere un nuovo riferimento */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Aggiungi Riferimento Intercompany</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Dettagli articolo corrente */}
            <div className="p-3 border rounded-md bg-gray-50">
              <div className="font-medium">Articolo Sorgente</div>
              <div className="flex justify-between items-center mt-1">
                <div>
                  <div className="font-medium">{item.Item}</div>
                  <div className="text-sm text-gray-600">{item.Description}</div>
                </div>
                <Badge variant="outline" className="bg-gray-100">
                  {getNatureDetails(item.Nature).label}
                </Badge>
              </div>
            </div>
            
            {/* Form per nuovo riferimento */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="source-company">
                    Azienda Sorgente <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={newReference.SourceCompanyId?.toString()}
                    onValueChange={(value) => handleReferenceChange('SourceCompanyId', parseInt(value))}
                    disabled={true} // Disabilitato perché è l'azienda dell'articolo corrente
                  >
                    <SelectTrigger id="source-company">
                      <SelectValue placeholder="Seleziona azienda sorgente" />
                    </SelectTrigger>
                    <SelectContent>
                      {companies.map(company => (
                        <SelectItem key={company.CompanyId} value={company.CompanyId.toString()}>
                          {company.Description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="reference-nature">
                    Tipo Riferimento <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={newReference.Nature?.toString()}
                    onValueChange={(value) => handleReferenceChange('Nature', parseInt(value))}
                  >
                    <SelectTrigger id="reference-nature">
                      <SelectValue placeholder="Seleziona tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="22413314">Acquisto</SelectItem>
                      <SelectItem value="22413312">Conto Lavoro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex items-center justify-center gap-2 text-gray-500">
                <ArrowRight className="h-5 w-5" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="target-company">
                    Azienda Target <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={newReference.TargetCompanyId?.toString()}
                    onValueChange={(value) => handleReferenceChange('TargetCompanyId', parseInt(value))}
                  >
                    <SelectTrigger id="target-company">
                      <SelectValue placeholder="Seleziona azienda target" />
                    </SelectTrigger>
                    <SelectContent>
                      {companies
                        .filter(company => company.CompanyId !== newReference.SourceCompanyId)
                        .map(company => (
                          <SelectItem key={company.CompanyId} value={company.CompanyId.toString()}>
                            {company.Description}
                          </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="target-item">
                    Articolo Target
                  </Label>
                  <Select
                    value={newReference.TargetProjectItemId?.toString()}
                    onValueChange={(value) => handleReferenceChange('TargetProjectItemId', parseInt(value))}
                    disabled={!newReference.TargetCompanyId}
                  >
                    <SelectTrigger id="target-item">
                      <SelectValue placeholder="Seleziona articolo target" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Non definito</SelectItem>
                      {loading ? (
                        <SelectItem value="" disabled>Caricamento...</SelectItem>
                      ) : (
                        targetItems.map(item => (
                          <SelectItem key={item.Id} value={item.Id.toString()}>
                            {item.Item} - {item.Description}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex items-center p-3 bg-blue-50 text-blue-800 rounded-md">
                <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" />
                <p className="text-sm">
                  Se l'articolo target non esiste ancora, puoi crearlo manualmente o lasciare vuoto questo campo.
                </p>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Annulla
            </Button>
            <Button 
              onClick={handleAddReference}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              Salva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ArticleReferences;