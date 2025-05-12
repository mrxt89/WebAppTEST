import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { swal } from '@/lib/common';
import { config } from '@/config';
import {
  Package,
  ShoppingCart,
  Save,
  ArrowLeft,
  Copy,
  AlertTriangle,
  Info,
  Ruler,
  ScanBarcode,
  Database
} from 'lucide-react';

/**
 * ArticleForm - Componente per la creazione/modifica di un articolo di progetto
 * Supporta tre modalità:
 * - new: creazione di un nuovo articolo
 * - edit: modifica di un articolo esistente
 * - copy: copia di un articolo esistente
 */
const ArticleForm = ({ mode, projectId, itemId, onCancel, onSave }) => {
  
  // Stati del form
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    Item: '',
    Description: '',
    CustomerItemReference: '',
    CustomerDescription: '',
    Nature: 22413312, // Semilavorato di default
    StatusId: 1, // Bozza di default
    BaseUoM: 'PZ',
    Diameter: null,
    Bxh: '',
    Depth: null,
    Length: null,
    MediumRadius: null,
    Notes: '',
    fscodice: '',
    CategoryId: 0,
    FamilyId: null,
    MacrofamilyId: null,
    ItemTypeId: null,
    offset_acquisto: null,
    offset_autoconsumo: null,
    offset_vendita: null,
    stato_erp: 0, // 0 = non dall'ERP, 1 = dall'ERP
    data_sync_erp: null
  });
  
  // Stati per i dati correlati
  const [project, setProject] = useState(null);
  const [itemStatuses, setItemStatuses] = useState([]);
  const [sourceItem, setSourceItem] = useState(null);
  const [selectedTab, setSelectedTab] = useState('info');
  
  // Opzioni per la natura dell'articolo
  const NATURE_OPTIONS = [
    { id: 22413312, label: 'Semilavorato', icon: <Package className="h-4 w-4" /> },
    { id: 22413313, label: 'Prodotto Finito', icon: <Package className="h-4 w-4" /> },
    { id: 22413314, label: 'Acquisto', icon: <ShoppingCart className="h-4 w-4" /> }
  ];
  
  // Caricamento iniziale dei dati
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        
        // Carica stati degli articoli
        await loadItemStatuses();
        
        // Carica dati del progetto
        if (projectId) {
          await loadProject(projectId);
        }
        
        // Per modalità modifica o copia, carica l'articolo esistente
        if ((mode === 'edit' || mode === 'copy') && itemId) {
          await loadItem(itemId);
        }
      } catch (error) {
        console.error('Error loading initial data:', error);
        swal.fire({
          title: 'Errore',
          text: 'Si è verificato un errore nel caricamento dei dati',
          icon: 'error'
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadInitialData();
  }, [mode, projectId, itemId]);
  
  // Caricamento del progetto
  const loadProject = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${config.API_BASE_URL}/projects/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Errore nel caricamento del progetto');
      
      const data = await response.json();
      setProject(data);
    } catch (error) {
      console.error('Error loading project:', error);
      throw error;
    }
  };
  
  // Caricamento degli stati articolo
  const loadItemStatuses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${config.API_BASE_URL}/projectArticles/statuses`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Errore nel caricamento degli stati');
      
      const data = await response.json();
      setItemStatuses(data);
    } catch (error) {
      console.error('Error loading item statuses:', error);
      throw error;
    }
  };
  
  // Caricamento dell'articolo per modifica o copia
  const loadItem = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${config.API_BASE_URL}/projectArticles/items/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Errore nel caricamento dell\'articolo');
      
      const data = await response.json();
      
      // Se in modalità copy, conserviamo l'articolo originale per riferimento
      if (mode === 'copy') {
        setSourceItem(data);
        
        // Per la copia, impostiamo tutti i campi ma rimuoviamo l'Id e resettiamo stato_erp
        // perché la copia sarà un nuovo articolo che non proviene dall'ERP
        setFormData({
          ...data,
          Item: `COPY_${data.Item}`,
          CustomerItemReference: data.CustomerItemReference || '',
          stato_erp: 0, // Reset stato_erp perché è una nuova copia
          data_sync_erp: null // Reset data_sync_erp perché è una nuova copia
        });
      } else {
        // Per la modalità edit, impostiamo tutti i campi incluso l'Id
        setFormData(data);
      }
    } catch (error) {
      console.error('Error loading item:', error);
      throw error;
    }
  };
  
  // Gestione delle modifiche ai campi
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  // Funzione per tornare alla pagina precedente
  const handleGoBack = () => {
    if (onCancel) onCancel();
  };
  
  // Funzione per salvare l'articolo
  const handleSave = async () => {
    try {
      // Validazione dei campi obbligatori
      if (!formData.Item?.trim()) {
        swal.fire({
          title: 'Errore',
          text: 'Il codice articolo è obbligatorio',
          icon: 'error'
        });
        return;
      }
      
      if (!formData.Description?.trim()) {
        swal.fire({
          title: 'Errore',
          text: 'La descrizione è obbligatoria',
          icon: 'error'
        });
        return;
      }
      
      setLoading(true);
      
      const token = localStorage.getItem('token');
      const action = mode === 'edit' ? 'UPDATE' : mode === 'copy' ? 'COPY' : 'ADD';
      
      // Preparazione del payload con stato_erp e data_sync_erp
      const payload = {
        action,
        itemData: { 
          ...formData,
          stato_erp: formData.stato_erp || 0, // Assicuriamo che stato_erp sia sempre presente
          data_sync_erp: formData.data_sync_erp // Includiamo data_sync_erp se presente
        },
        projectId: parseInt(projectId),
      };
      
      // Se è una copia, aggiungi l'ID sorgente
      if (mode === 'copy' && sourceItem) {
        payload.sourceItemId = sourceItem.Id;
      }
      
      const response = await fetch(`${config.API_BASE_URL}/projectArticles/items`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) throw new Error('Errore nel salvataggio dell\'articolo');
      
      const result = await response.json();
      
      if (result.success) {
        swal.fire({
          title: 'Successo',
          text: mode === 'new' ? 'Articolo creato con successo' : 
                mode === 'copy' ? 'Articolo copiato con successo' : 
                'Articolo aggiornato con successo',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
        
        if (onSave) onSave(result.itemId);

    } else {
        throw new Error(result.msg || 'Errore durante il salvataggio');
      }
    } catch (error) {
      console.error('Error saving item:', error);
      swal.fire({
        title: 'Errore',
        text: error.message || 'Si è verificato un errore durante il salvataggio',
        icon: 'error'
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Genera il titolo appropriato in base alla modalità
  const getTitle = () => {
    if (mode === 'new') return 'Nuovo Articolo';
    if (mode === 'edit') return 'Modifica Articolo';
    if (mode === 'copy') return 'Copia Articolo';
    return 'Gestione Articolo';
  };
  
  // Natura dell'articolo
  const getNatureDetails = (nature) => {
    switch (nature) {
      case 22413312: // Semilavorato
        return {
          label: 'Semilavorato',
          icon: <Package className="h-4 w-4" />,
          color: 'bg-blue-100 text-blue-700 border-blue-200'
        };
      case 22413313: // Prodotto Finito
        return {
          label: 'Prodotto Finito',
          icon: <Package className="h-4 w-4" />,
          color: 'bg-green-100 text-green-700 border-green-200'
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

  // Verifica se l'articolo è dall'ERP
  const isFromERP = formData.stato_erp === 1;
  
  return (
    <div className="container mx-auto py-6 px-4 max-w-5xl">
      <div className="flex justify-between items-center mb-6">
        <Button 
          variant="outline" 
          onClick={handleGoBack}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Indietro
        </Button>
        
        <h1 className="text-2xl font-bold">{getTitle()}</h1>
        
        <Button 
          onClick={handleSave}
          disabled={loading}
          className="flex items-center gap-2"
        >
          <Save className="h-4 w-4" />
          {loading ? 'Salvataggio...' : 'Salva'}
        </Button>
      </div>
      
      {project && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Progetto:</span>
              <span className="font-medium">{project.Name}</span>
              <Badge variant="outline" className="ml-2">{project.StatusDescription}</Badge>
            </div>
          </CardContent>
        </Card>
      )}
      
      {sourceItem && mode === 'copy' && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Copy className="h-4 w-4 text-blue-600" />
              <span className="text-blue-600">Copia da:</span>
              <span className="font-medium">{sourceItem.Item} - {sourceItem.Description}</span>
              {sourceItem.Nature && (
                <Badge className={getNatureDetails(sourceItem.Nature).color}>
                  {getNatureDetails(sourceItem.Nature).label}
                </Badge>
              )}
              {sourceItem.stato_erp === 1 && (
                <Badge className="bg-blue-100 text-blue-700 border-blue-200 flex items-center gap-1">
                  <Database className="h-3 w-3" />
                  <span>Articolo ERP</span>
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Mostra un avviso se l'articolo è dall'ERP */}
      {isFromERP && mode === 'edit' && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-600" />
              <span className="text-blue-600">
                Questo articolo è stato importato dall'ERP. Alcuni campi non possono essere modificati.
              </span>
            </div>
          </CardContent>
        </Card>
      )}
      
      <Tabs 
        value={selectedTab} 
        onValueChange={setSelectedTab}
        className="mt-6"
      >
        <TabsList className="grid grid-cols-3 mb-6">
          <TabsTrigger value="info">
            <Info className="h-4 w-4 mr-2" />
            Informazioni Generali
          </TabsTrigger>
          <TabsTrigger value="dimensions">
            <Ruler className="h-4 w-4 mr-2" />
            Dimensioni
          </TabsTrigger>
          <TabsTrigger value="additional">
            <ScanBarcode className="h-4 w-4 mr-2" />
            Informazioni Aggiuntive
          </TabsTrigger>
        </TabsList>
        
        {/* Scheda Informazioni Generali */}
        <TabsContent value="info">
          <Card>
            <CardHeader>
              <CardTitle>Informazioni Articolo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="item-code">
                    Codice Articolo <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="item-code"
                    value={formData.Item || ''}
                    onChange={(e) => handleChange('Item', e.target.value)}
                    placeholder="Codice univoco dell'articolo"
                    disabled={loading || mode === 'edit' || isFromERP} // Disabilitato in edit o se è dall'ERP
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="item-nature">
                    Natura <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.Nature?.toString()}
                    onValueChange={(value) => handleChange('Nature', parseInt(value))}
                    disabled={loading || isFromERP} // Disabilitato se l'articolo è dall'ERP
                  >
                    <SelectTrigger id="item-nature">
                      <SelectValue placeholder="Seleziona natura" />
                    </SelectTrigger>
                    <SelectContent>
                      {NATURE_OPTIONS.map(option => (
                        <SelectItem key={option.id} value={option.id.toString()}>
                          <div className="flex items-center gap-2">
                            {option.icon}
                            <span>{option.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="item-description">
                    Descrizione <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="item-description"
                    value={formData.Description || ''}
                    onChange={(e) => handleChange('Description', e.target.value)}
                    placeholder="Descrizione dell'articolo"
                    disabled={loading || isFromERP} // Disabilitato se l'articolo è dall'ERP
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="item-status">Stato</Label>
                  <Select
                    value={formData.StatusId?.toString()}
                    onValueChange={(value) => handleChange('StatusId', parseInt(value))}
                    disabled={loading}
                  >
                    <SelectTrigger id="item-status">
                      <SelectValue placeholder="Seleziona stato" />
                    </SelectTrigger>
                    <SelectContent>
                      {itemStatuses.map(status => (
                        <SelectItem key={status.Id} value={status.Id.toString()}>
                          {status.Description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="item-uom">Unità di Misura</Label>
                  <Select
                    value={formData.BaseUoM || 'PZ'}
                    onValueChange={(value) => handleChange('BaseUoM', value)}
                    disabled={loading || isFromERP} // Disabilitato se l'articolo è dall'ERP
                  >
                    <SelectTrigger id="item-uom">
                      <SelectValue placeholder="Seleziona UoM" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PZ">Pezzi (PZ)</SelectItem>
                      <SelectItem value="MT">Metri (MT)</SelectItem>
                      <SelectItem value="KG">Kilogrammi (KG)</SelectItem>
                      <SelectItem value="LT">Litri (LT)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="item-customer-ref">Riferimento Cliente</Label>
                  <Input
                    id="item-customer-ref"
                    value={formData.CustomerItemReference || ''}
                    onChange={(e) => handleChange('CustomerItemReference', e.target.value)}
                    placeholder="Codice di riferimento del cliente"
                    disabled={loading}
                  />
                </div>
                
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="item-customer-desc">Descrizione Cliente</Label>
                  <Input
                    id="item-customer-desc"
                    value={formData.CustomerDescription || ''}
                    onChange={(e) => handleChange('CustomerDescription', e.target.value)}
                    placeholder="Descrizione dell'articolo secondo il cliente"
                    disabled={loading}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="item-notes">Note</Label>
                <Textarea
                  id="item-notes"
                  value={formData.Notes || ''}
                  onChange={(e) => handleChange('Notes', e.target.value)}
                  placeholder="Note aggiuntive sull'articolo"
                  rows={4}
                  disabled={loading}
                />
              </div>
            </CardContent>
            
            <CardFooter className="bg-gray-50 p-4 border-t">
              <div className="flex items-center p-3 bg-amber-50 text-amber-800 rounded-md">
                <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" />
                <p className="text-sm">
                  I campi contrassegnati con <span className="text-red-500">*</span> sono obbligatori.
                </p>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* Scheda Dimensioni */}
        <TabsContent value="dimensions">
          <Card>
            <CardHeader>
              <CardTitle>Dimensioni</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="item-diameter">Diametro (mm)</Label>
                  <Input
                    id="item-diameter"
                    type="number"
                    value={formData.Diameter || ''}
                    onChange={(e) => handleChange('Diameter', e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="Diametro in mm"
                    disabled={loading}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="item-bxh">Base x Altezza</Label>
                  <Input
                    id="item-bxh"
                    value={formData.Bxh || ''}
                    onChange={(e) => handleChange('Bxh', e.target.value)}
                    placeholder="Es: 100x200"
                    disabled={loading}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="item-depth">Profondità (mm)</Label>
                  <Input
                    id="item-depth"
                    type="number"
                    value={formData.Depth || ''}
                    onChange={(e) => handleChange('Depth', e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="Profondità in mm"
                    disabled={loading}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="item-length">Lunghezza (mm)</Label>
                  <Input
                    id="item-length"
                    type="number"
                    value={formData.Length || ''}
                    onChange={(e) => handleChange('Length', e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="Lunghezza in mm"
                    disabled={loading}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="item-radius">Raggio Medio (mm)</Label>
                  <Input
                    id="item-radius"
                    type="number"
                    value={formData.MediumRadius || ''}
                    onChange={(e) => handleChange('MediumRadius', e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="Raggio medio in mm"
                    disabled={loading}
                  />
                </div>
              </div>
              
              <div className="flex items-center p-3 bg-blue-50 text-blue-800 rounded-md">
                <Info className="h-5 w-5 mr-2 flex-shrink-0" />
                <p className="text-sm">
                  Specifica solo le dimensioni applicabili all'articolo. Ad esempio, per un tubo indicare diametro e lunghezza.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Scheda Informazioni Aggiuntive */}
        <TabsContent value="additional">
          <Card>
            <CardHeader>
              <CardTitle>Informazioni Aggiuntive</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="item-fscode">Codice FS</Label>
                  <Input
                    id="item-fscode"
                    value={formData.fscodice || ''}
                    onChange={(e) => handleChange('fscodice', e.target.value)}
                    placeholder="Codice FS"
                    disabled={loading}
                    maxLength={10}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="item-description-ext">Estensione Descrizione</Label>
                  <Input
                    id="item-description-ext"
                    value={formData.DescriptionExtension || ''}
                    onChange={(e) => handleChange('DescriptionExtension', e.target.value)}
                    placeholder="Estensione descrizione"
                    disabled={loading}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="item-offset-acquisto">Offset Acquisto</Label>
                  <Input
                    id="item-offset-acquisto"
                    value={formData.offset_acquisto || ''}
                    onChange={(e) => handleChange('offset_acquisto', e.target.value)}
                    placeholder="Offset acquisto"
                    disabled={loading}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="item-offset-autoconsumo">Offset Autoconsumo</Label>
                  <Input
                    id="item-offset-autoconsumo"
                    value={formData.offset_autoconsumo || ''}
                    onChange={(e) => handleChange('offset_autoconsumo', e.target.value)}
                    placeholder="Offset autoconsumo"
                    disabled={loading}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="item-offset-vendita">Offset Vendita</Label>
                  <Input
                    id="item-offset-vendita"
                    value={formData.offset_vendita || ''}
                    onChange={(e) => handleChange('offset_vendita', e.target.value)}
                    placeholder="Offset vendita"
                    disabled={loading}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="item-category">Categoria</Label>
                  <Input
                    id="item-category"
                    type="number"
                    value={formData.CategoryId || ''}
                    onChange={(e) => handleChange('CategoryId', e.target.value ? parseInt(e.target.value) : 0)}
                    placeholder="ID Categoria"
                    disabled={loading}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="item-family">Famiglia</Label>
                  <Input
                    id="item-family"
                    type="number"
                    value={formData.FamilyId || ''}
                    onChange={(e) => handleChange('FamilyId', e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="ID Famiglia"
                    disabled={loading}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="item-macrofamily">Macrofamiglia</Label>
                  <Input
                    id="item-macrofamily"
                    type="number"
                    value={formData.MacrofamilyId || ''}
                    onChange={(e) => handleChange('MacrofamilyId', e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="ID Macrofamiglia"
                    disabled={loading}
                  />
                </div>
              </div>
              
              <div className="flex items-center p-3 bg-blue-50 text-blue-800 rounded-md">
                <Info className="h-5 w-5 mr-2 flex-shrink-0" />
                <p className="text-sm">
                  Questi campi sono opzionali e vengono utilizzati principalmente per la sincronizzazione con il sistema ERP.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <div className="flex justify-end mt-6 space-x-2">
        <Button 
          variant="outline" 
          onClick={handleGoBack}
          disabled={loading}
        >
          Annulla
        </Button>
        
        <Button 
          onClick={handleSave}
          disabled={loading}
          className="flex items-center gap-2"
          >
          <Save className="h-4 w-4" />
          {loading ? 'Salvataggio...' : 'Salva'}
          </Button>
          </div>
          </div>
          );
          };

export default ArticleForm;