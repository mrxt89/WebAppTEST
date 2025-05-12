// ComponentDetail.jsx - Aggiornato per supportare le nuove funzionalità di sostituzione

import React, { useState, useEffect } from 'react';
import { useBOMViewer } from '../../context/BOMViewerContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectTrigger, 
  SelectValue, 
  SelectContent, 
  SelectItem 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Info, Package, ShoppingCart, CircuitBoard, AlertTriangle, Code } from 'lucide-react';

const ComponentDetail = ({ component, editMode }) => {
  const { 
    updateComponent, 
    updateItemDetails, 
    unitsOfMeasure,
    pendingChanges,
    setPendingChanges,
    bomComponents // Aggiungiamo questa proprietà dal contesto
  } = useBOMViewer();
  
  // Aggiungiamo uno stato per monitorare il componente padre
  const [parentComponent, setParentComponent] = useState(null);
  // Stato per i valori attualmente visualizzati nei campi
  const [formData, setFormData] = useState({
    // Campi BOM Component
    ComponentId: component?.ComponentId,
    ComponentType: component?.ComponentType || 7798784,
    Quantity: component?.Quantity || 1,
    UoM: component?.UoM || 'PZ',

    // Campi Item
    Code: component?.ComponentItemCode || component?.ComponentCode || '',
    Description: component?.ComponentItemDescription, 
    Notes: component?.Notes || '',
    Nature: component?.ComponentNature || component?.Nature || 22413312,
    Diameter: component?.Diameter || 0,
    Bxh: component?.Bxh || '',
    Depth: component?.Depth || 0,
    Length: component?.Length || 0,
    MediumRadius: component?.MediumRadius || 0,
    CustomerItemReference: component?.CustomerItemReference || '',
  });

  // Funzione per trovare il componente padre
  const findParentComponent = () => {
    if (!component || !component.Path || !Array.isArray(bomComponents) || bomComponents.length === 0) {
      setParentComponent(null);
      return;
    }

    // Se il componente è di livello 1 o 0, non ha un padre
    if (component.Level <= 1) {
      setParentComponent(null);
      return;
    }

    // Utilizziamo il Path per trovare il padre
    const pathParts = component.Path.split('.');
    if (pathParts.length < 2) {
      setParentComponent(null);
      return;
    }

    // Rimuoviamo l'ultimo elemento del path per ottenere il path del padre
    pathParts.pop();
    const parentPath = pathParts.join('.');

    // Cerchiamo il componente con il path del padre
    const parent = bomComponents.find(comp => 
      comp.Path === parentPath && comp.Level === component.Level - 1
    );

    setParentComponent(parent);
  };

  // Eseguiamo la ricerca del componente padre quando cambia il componente selezionato
  useEffect(() => {
    findParentComponent();
  }, [component, bomComponents]);

  // Aggiorna i dati quando cambia il componente
  useEffect(() => {
    if (component) {
      const newData = {
        // Campi BOM Component
        ComponentId: component.ComponentId,
        ComponentType: component.ComponentType || 7798784,
        Quantity: component.Quantity || 1,
        UoM: component.UoM || 'PZ',
        
        // Campi Item
        Code: component.ComponentItemCode || component.ComponentCode || '',
        Description: component.Description || component.ComponentItemDescription,
        Notes: component.Notes || '',
        Nature: component.ComponentNature || component.Nature || 22413312,
        Diameter: component.Diameter || 0,
        Bxh: component.Bxh || '',
        Depth: component.Depth || 0,
        Length: component.Length || 0,
        MediumRadius: component.MediumRadius || 0,
        CustomerItemReference: component.CustomerItemReference || '',
      };
      
      setFormData(newData);
      
      // Rimuovi le eventuali modifiche in sospeso per questo componente quando cambia
      if (pendingChanges[component.ComponentId]) {
        setPendingChanges(prev => {
          const newChanges = {...prev};
          delete newChanges[component.ComponentId];
          return newChanges;
        });
      }
    }
  }, [component, setPendingChanges]);

  // Gestisce il cambiamento nei campi del form
  const handleChange = (field, value) => {
    // Aggiorna lo stato locale per riflettere il cambiamento nell'UI
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    if (editMode && component) {
      // Prepara i dati per l'aggiornamento differito
      const componentId = component.ComponentId;
      
      // Aggiorna le modifiche in sospeso per questo componente
      setPendingChanges(prev => {
        // Se non ci sono modifiche precedenti per questo componente, inizializza
        if (!prev[componentId]) {
          prev[componentId] = {
            bomComponentChanges: {},
            itemDetailsChanges: {},
            original: component,
            bomId: component.BOMId,
            line: component.Line,
            parentBOMId: parentComponent?.BOMId || null // Aggiungiamo il parentBOMId
          };
        }
        
        // Aggiungi il campo modificato all'insieme appropriato
        if (['ComponentType', 'Quantity', 'UoM'].includes(field)) {
          prev[componentId].bomComponentChanges[field] = value;
        } else {
          prev[componentId].itemDetailsChanges[field] = value;
        }
        
        return {...prev};
      });
    }
  };

  // Function to get nature badge with icon
  const getNatureBadge = (nature) => {
    const natureCode = typeof nature === 'string' ? parseInt(nature, 10) : nature;
    
    switch (natureCode) {
      case 22413312: // Semilavorato
        return (
          <Badge className="flex items-center gap-1 bg-blue-100 text-blue-700 border-blue-200">
            <CircuitBoard className="h-3 w-3" />
            <span>Semilavorato</span>
          </Badge>
        );
      case 22413313: // Prodotto Finito
        return (
          <Badge className="flex items-center gap-1 bg-green-100 text-green-700 border-green-200">
            <Package className="h-3 w-3" />
            <span>Prodotto Finito</span>
          </Badge>
        );
      case 22413314: // Acquisto
        return (
          <Badge className="flex items-center gap-1 bg-amber-100 text-amber-700 border-amber-200">
            <ShoppingCart className="h-3 w-3" />
            <span>Acquisto</span>
          </Badge>
        );
      default:
        return (
          <Badge className="flex items-center gap-1 bg-gray-100 text-gray-700 border-gray-200">
            <Info className="h-3 w-3" />
            <span>Altro</span>
          </Badge>
        );
    }
  };



  // If no component is selected, show placeholder
  if (!component) {
    return (
      <div className="p-4 text-center text-gray-500">
        Seleziona un componente per visualizzarne i dettagli
      </div>
    );
  }

  // Aggiungiamo informazioni sul componente padre (se presente)
  const parentInfo = parentComponent ? (
    <div className="mb-3 p-2 bg-blue-50 rounded text-sm">
      <span className="font-medium">Componente padre:</span> 
      {parentComponent.ComponentItemCode || 'N/A'} - 
      {parentComponent.ComponentItemDescription || 'N/A'}
      {parentComponent.stato_erp === 1 && (
        <Badge className="ml-2 bg-blue-100 text-blue-700">ERP</Badge>
      )}
      {parentComponent.stato_erp === 1 && (
        <div className="flex items-center mt-1 text-xs text-amber-700">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Questo componente appartiene a una distinta presente in ERP. Le modifiche sono limitate.
        </div>
      )}
    </div>
  ) : null;

  return (
    <div className="space-y-4">
      {/* Mostriamo le informazioni sul componente padre se disponibili */}
      {parentInfo}
      
      {/* Component details */}
      <div className="d-flex gap-x-6 gap-y-4">
        <div className='w-50'>
          <Label htmlFor="componentCode">Codice</Label>
          <div className="flex items-center gap-2">
            <Input 
              id="componentCode" 
              value={formData.Code || ''}
              onChange={e => handleChange('Code', e.target.value)}
              disabled={!editMode || component?.stato_erp == '1'} 
              className={component?.stato_erp == '1' ? 'bg-gray-200' : 'bg-white'}
            />
            {component.stato_erp == '1' && (
              <Badge className="ml-1 bg-blue-100 text-blue-700">ERP</Badge>
            )}
          </div>
        </div>
        
        <div className='w-full'>
          <Label htmlFor="Description">Descrizione</Label>
          <Textarea 
            id="description" 
            value={formData.Description || ''}
            onChange={e => handleChange('Description', e.target.value)}
            rows={3}
            disabled={!editMode || component?.stato_erp == '1'}
          />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-x-6 gap-y-3">

          <div>
            <Label htmlFor="componentType">Tipo</Label>
            <Select 
              value={String(formData.ComponentType)} 
              onValueChange={v => handleChange('ComponentType', parseInt(v, 10))}
              disabled={!editMode || component?.parentBOMStato_erp == '1'}
            >
              <SelectTrigger id="componentType">
                <SelectValue placeholder="Tipo componente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7798784">Articolo</SelectItem>
                <SelectItem value="7798787">Fantasma</SelectItem>
                <SelectItem value="7798789">Nota</SelectItem>
              </SelectContent>
            </Select>
          </div>
        
          <div>
            <Label htmlFor="nature">Natura</Label>
            {editMode && !component?.stato_erp == '1' ? (
              <Select 
                value={String(formData.Nature)} 
                onValueChange={v => handleChange('Nature', parseInt(v, 10))}
                disabled={!editMode || component?.stato_erp == '1'}
              >
                <SelectTrigger id="nature">
                  <SelectValue placeholder="Natura articolo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="22413312">Semilavorato</SelectItem>
                  <SelectItem value="22413313">Prodotto Finito</SelectItem>
                  <SelectItem value="22413314">Acquisto</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="h-10 px-3 py-2 flex items-center border rounded-md bg-gray-50">
                {getNatureBadge(formData.Nature)}
              </div>
            )}
          </div>
        
          <div>
            <Label htmlFor="quantity">Quantità</Label>
            <Input 
              id="quantity" 
              type="number" 
              step="0.001"
              value={formData.Quantity} 
              onChange={e => handleChange('Quantity', parseFloat(e.target.value))}
              disabled={!editMode || parentComponent?.parentBOMStato_erp == '1'}
            />
          </div>
        
          <div>
            <Label htmlFor="uom">Unità di Misura</Label>
            {editMode && unitsOfMeasure && unitsOfMeasure.length > 0 ? (
              <Select 
                value={formData.UoM} 
                onValueChange={v => handleChange('UoM', v)}
                disabled={!editMode || component?.parentBOMStato_erp == '1'}
              >
                <SelectTrigger id="uom">
                  <SelectValue placeholder="Unità di misura" />
                </SelectTrigger>
                <SelectContent>
                  {unitsOfMeasure.map(uom => (
                    <SelectItem key={uom.BaseUoM} value={uom.BaseUoM}>
                      {uom.BaseUoM} - {uom.Description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input 
                id="uom" 
                value={formData.UoM} 
                onChange={e => handleChange('UoM', e.target.value)}
                disabled={!editMode || component?.parentBOMStato_erp == '1'}
              />
            )}
          </div>

      </div>

      {/* Note */}
      <div>
        <Label htmlFor="notes">Note</Label>
        <Textarea 
          id="notes" 
          value={formData.Notes || ''} 
          onChange={e => handleChange('Notes', e.target.value)}
          rows={3}
          disabled={!editMode || component?.parentBOMStato_erp == '1'}
        />
      </div>
      
      {/* Dimensions */}
        <div className="border rounded-md p-3 bg-gray-50">
          <h4 className="text-sm font-medium mb-2">Dimensioni</h4>
          <div className="grid grid-cols-5 gap-3">

              <div>
                <Label htmlFor="diameter" className="text-xs">Diametro</Label>
                <Input 
                  id="diameter" 
                  type="number"
                  step="0.10"
                  min="0"
                  value={formData.Diameter || 0}
                  onChange={e => handleChange('Diameter', parseFloat(e.target.value))}
                  className="bg-white h-8 text-sm"
                  disabled={!editMode || component?.stato_erp == '1'}
                />
              </div>

              <div>
                <Label htmlFor="bxh" className="text-xs">Base x Altezza</Label>
                <Input 
                  id="bxh" 
                  value={formData.Bxh || ''}
                  onChange={e => handleChange('Bxh', e.target.value)}
                  className="bg-white h-8 text-sm"
                  disabled={!editMode || component?.stato_erp == '1'}
                />
              </div>

              <div>
                <Label htmlFor="depth" className="text-xs">Profondità</Label>
                <Input 
                  id="depth" 
                  type="number"
                  step="0.10"
                  min="0"
                  value={formData.Depth || 0}
                  onChange={e => handleChange('Depth', parseFloat(e.target.value))}
                  className="bg-white h-8 text-sm"
                  disabled={!editMode || component?.stato_erp == '1'}
                />
              </div>

              <div>
                <Label htmlFor="length" className="text-xs">Lunghezza</Label>
                <Input 
                  id="length" 
                  type="number"
                  step="0.10"
                  min="0"
                  value={formData.Length || 0}
                  onChange={e => handleChange('Length', parseFloat(e.target.value))}
                  className="bg-white h-8 text-sm"
                  disabled={!editMode || component?.stato_erp == '1'}
                />
              </div>

              <div>
                <Label htmlFor="radius" className="text-xs">Raggio Medio</Label>
                <Input 
                  id="radius" 
                  type="number"
                  step="0.10"
                  min="0"
                  value={formData.MediumRadius || 0}
                  onChange={e => handleChange('MediumRadius', parseFloat(e.target.value))}
                  className="bg-white h-8 text-sm"
                  disabled={!editMode || component?.stato_erp == '1'}
                />
              </div>
          </div>
        </div>
      {/* Customer Reference */}

        <div className="border rounded-md p-3 bg-blue-50">
          <h4 className="text-sm font-medium mb-2 text-blue-700">Riferimento Cliente</h4>
          <div className="space-y-2">
            <div>
              <Label htmlFor="customerRef" className="text-xs text-blue-700">Codice Cliente</Label>
              <Input 
                id="customerRef" 
                value={formData.CustomerItemReference || ''} 
                onChange={e => handleChange('CustomerItemReference', e.target.value)}
                disabled={!editMode || component?.stato_erp == '1'}
                className="bg-white h-8 text-sm"
              />
            </div>
          </div>
        </div>

    </div>
  );
};

export default ComponentDetail;