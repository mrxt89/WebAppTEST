// ComponentDetail.jsx - Aggiornato per supportare il tracciamento delle modifiche

import React, { useState, useEffect } from "react";
import { useBOMViewer } from "../../context/BOMViewerContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Info,
  Package,
  ShoppingCart,
  CircuitBoard,
  AlertTriangle,
} from "lucide-react";

const ComponentDetail = ({ component, editMode }) => {
  const {
    unitsOfMeasure,
    pendingChanges,
    setPendingChanges,
    bomComponents,
  } = useBOMViewer();

  // Aggiungiamo uno stato per monitorare il componente padre
  const [parentComponent, setParentComponent] = useState(null);
  
  // Stato per i valori attualmente visualizzati nei campi
  const [formData, setFormData] = useState({
    // Campi BOM Component
    ComponentId: component?.ComponentId,
    ComponentType: component?.ComponentType || 7798784,
    Quantity: component?.Quantity || 1,
    UoM: component?.UoM || "PZ",
    UnitCost: component?.UnitCost || 0,
    FixedCost: component?.FixedCost || 0,

    // Campi Item
    Code: component?.ComponentItemCode || component?.ComponentCode || "",
    Description: component?.ComponentItemDescription || component?.Description || "",
    Notes: component?.Notes || "",
    Nature: component?.ComponentNature || component?.Nature || 22413312,
    Diameter: component?.Diameter || 0,
    Bxh: component?.Bxh || "",
    Depth: component?.Depth || 0,
    Length: component?.Length || 0,
    MediumRadius: component?.MediumRadius || 0,
    CustomerItemReference: component?.CustomerItemReference || "",
  });

  // Funzione per trovare il componente padre
  const findParentComponent = () => {
    if (
      !component ||
      !component.Path ||
      !Array.isArray(bomComponents) ||
      bomComponents.length === 0
    ) {
      setParentComponent(null);
      return;
    }

    // Se il componente è di livello 1 o 0, non ha un padre
    if (component.Level <= 1) {
      setParentComponent(null);
      return;
    }

    // Utilizziamo il Path per trovare il padre
    const pathParts = component.Path.split(".");
    if (pathParts.length < 2) {
      setParentComponent(null);
      return;
    }

    // Rimuoviamo l'ultimo elemento del path per ottenere il path del padre
    pathParts.pop();
    const parentPath = pathParts.join(".");

    // Cerchiamo il componente con il path del padre
    const parent = bomComponents.find(
      (comp) => comp.Path === parentPath && comp.Level === component.Level - 1,
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
        UoM: component.UoM || "PZ",
        UnitCost: component.UnitCost || 0,
        FixedCost: component.FixedCost || 0,

        // Campi Item
        Code: component.ComponentItemCode || component.ComponentCode || "",
        Description:
          component.Description || component.ComponentItemDescription || "",
        Notes: component.Notes || "",
        Nature: component.ComponentNature || component.Nature || 22413312,
        Diameter: component.Diameter || 0,
        Bxh: component.Bxh || "",
        Depth: component.Depth || 0,
        Length: component.Length || 0,
        MediumRadius: component.MediumRadius || 0,
        CustomerItemReference: component.CustomerItemReference || "",
      };

      setFormData(newData);

      // NON rimuovere le modifiche pendenti quando cambia il componente
      // Questo permette di mantenere le modifiche mentre si naviga tra i componenti
    }
  }, [component]);

  // Ripristina i dati del form quando le modifiche pendenti vengono cancellate
  useEffect(() => {
    if (component && !pendingChanges[component.ComponentId]) {
      // Se non ci sono più modifiche pendenti per questo componente, ripristina i dati originali
      const originalData = {
        // Campi BOM Component
        ComponentId: component.ComponentId,
        ComponentType: component.ComponentType || 7798784,
        Quantity: component.Quantity || 1,
        UoM: component.UoM || "PZ",
        UnitCost: component.UnitCost || 0,
        FixedCost: component.FixedCost || 0,

        // Campi Item
        Code: component.ComponentItemCode || component.ComponentCode || "",
        Description:
          component.Description || component.ComponentItemDescription || "",
        Notes: component.Notes || "",
        Nature: component.ComponentNature || component.Nature || 22413312,
        Diameter: component.Diameter || 0,
        Bxh: component.Bxh || "",
        Depth: component.Depth || 0,
        Length: component.Length || 0,
        MediumRadius: component.MediumRadius || 0,
        CustomerItemReference: component.CustomerItemReference || "",
      };

      setFormData(originalData);
    }
  }, [component, pendingChanges]);

  // Gestisce il cambiamento nei campi del form
  const handleChange = (field, value) => {
    // Aggiorna lo stato locale per riflettere il cambiamento nell'UI
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (editMode && component) {
      // Prepara i dati per l'aggiornamento differito
      const componentId = component.ComponentId;

      // Aggiorna le modifiche in sospeso per questo componente
      setPendingChanges((prev) => {
        const newChanges = { ...prev };
        
        // Se non ci sono modifiche precedenti per questo componente, inizializza
        if (!newChanges[componentId]) {
          newChanges[componentId] = {
            bomComponentChanges: {},
            itemDetailsChanges: {},
            original: component,
            // Il BOMId dovrebbe essere l'ID della distinta base che CONTIENE il componente
            // Per UPDATE_COMPONENT, dobbiamo sempre usare il ParentBOMId (la distinta che contiene il componente)
            // Il BOMId del componente è la sua distinta base, il ParentBOMId è la distinta che lo contiene
            bomId: component.ParentBOMId || component.BOMId,
            line: component.Line,
            parentBOMId: parentComponent?.BOMId || null,
          };
        }

        // Determina se il campo appartiene ai componenti BOM o ai dettagli dell'articolo
        const bomFields = ["ComponentType", "Quantity", "UoM", "UnitCost", "FixedCost"];
        const itemFields = ["Code", "Description", "Notes", "Nature", "Diameter", "Bxh", "Depth", "Length", "MediumRadius", "CustomerItemReference"];

        if (bomFields.includes(field)) {
          // Controlla se il valore è diverso dall'originale
          if (component[field] !== value) {
            newChanges[componentId].bomComponentChanges[field] = value;
            
            // Se è stata modificata la Quantity, UnitCost o FixedCost, ricalcola il TotalCost
            if (field === 'Quantity' || field === 'UnitCost' || field === 'FixedCost') {
              const currentUnitCost = field === 'UnitCost' ? value : (formData.UnitCost || 0);
              const currentQuantity = field === 'Quantity' ? value : (formData.Quantity || 1);
              const currentFixedCost = field === 'FixedCost' ? value : (formData.FixedCost || 0);
              
              const newTotalCost = (currentUnitCost * currentQuantity) + currentFixedCost;
              newChanges[componentId].bomComponentChanges.TotalCost = newTotalCost;
              
              console.log('Ricalcolo TotalCost:', {
                UnitCost: currentUnitCost,
                Quantity: currentQuantity,
                FixedCost: currentFixedCost,
                TotalCost: newTotalCost
              });
            }
          } else {
            // Se il valore è tornato all'originale, rimuovi la modifica
            delete newChanges[componentId].bomComponentChanges[field];
            
            // Se era stata modificata la Quantity, UnitCost o FixedCost, rimuovi anche il TotalCost
            if (field === 'Quantity' || field === 'UnitCost' || field === 'FixedCost') {
              delete newChanges[componentId].bomComponentChanges.TotalCost;
            }
          }
        } else if (itemFields.includes(field)) {
          // Per i campi dell'articolo, controlla contro i valori originali
          const originalField = field === "Code" ? (component.ComponentItemCode || component.ComponentCode) :
                               field === "Description" ? (component.ComponentItemDescription || component.Description) :
                               component[field];
          
          if (originalField !== value) {
            newChanges[componentId].itemDetailsChanges[field] = value;
          } else {
            delete newChanges[componentId].itemDetailsChanges[field];
          }
        }

        // Se non ci sono più modifiche per questo componente, rimuovilo
        if (
          Object.keys(newChanges[componentId].bomComponentChanges).length === 0 &&
          Object.keys(newChanges[componentId].itemDetailsChanges).length === 0
        ) {
          delete newChanges[componentId];
        }

        return newChanges;
      });
    }
  };

  // Function to get nature badge with icon
  const getNatureBadge = (nature) => {
    const natureCode =
      typeof nature === "string" ? parseInt(nature, 10) : nature;

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

  // Helper per verificare se un campo ha modifiche pendenti
  const hasFieldChange = (field) => {
    if (!component || !pendingChanges[component.ComponentId]) return false;
    
    const changes = pendingChanges[component.ComponentId];
    return changes.bomComponentChanges[field] !== undefined || 
           changes.itemDetailsChanges[field] !== undefined;
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
      <span className="font-medium">Componente padre:</span>{" "}
      {parentComponent.ComponentItemCode || "N/A"} -{" "}
      {parentComponent.ComponentItemDescription || "N/A"}
      {parentComponent.stato_erp === 1 && (
        <Badge className="ml-2 bg-blue-100 text-blue-700">ERP</Badge>
      )}
      {parentComponent.stato_erp === 1 && (
        <div className="flex items-center mt-1 text-xs text-amber-700">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Questo componente appartiene a una distinta presente in ERP. Le
          modifiche sono limitate.
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
        <div className="w-50">
          <Label htmlFor="componentCode">
            Codice
            {hasFieldChange("Code") && (
              <span className="ml-1 text-amber-600">*</span>
            )}
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id="componentCode"
              value={formData.Code || ""}
              onChange={(e) => handleChange("Code", e.target.value)}
              disabled={!editMode || component?.stato_erp == "1"}
              className={cn(
                component?.stato_erp == "1" ? "bg-gray-200" : "bg-white",
                hasFieldChange("Code") && "ring-2 ring-amber-500"
              )}
            />
            {component.stato_erp == "1" && (
              <Badge className="ml-1 bg-blue-100 text-blue-700">ERP</Badge>
            )}
          </div>
        </div>

        <div className="w-full">
          <Label htmlFor="Description">
            Descrizione
            {hasFieldChange("Description") && (
              <span className="ml-1 text-amber-600">*</span>
            )}
          </Label>
          <Textarea
            id="description"
            value={formData.Description || ""}
            onChange={(e) => handleChange("Description", e.target.value)}
            rows={3}
            disabled={!editMode || component?.stato_erp == "1"}
            className={cn(
              hasFieldChange("Description") && "ring-2 ring-amber-500"
            )}
          />
        </div>
      </div>
      
      <div className="grid grid-cols-4 gap-x-6 gap-y-3">
        <div>
          <Label htmlFor="componentType">
            Tipo
            {hasFieldChange("ComponentType") && (
              <span className="ml-1 text-amber-600">*</span>
            )}
          </Label>
          <Select
            value={String(formData.ComponentType)}
            onValueChange={(v) =>
              handleChange("ComponentType", parseInt(v, 10))
            }
            disabled={!editMode || component?.parentBOMStato_erp == "1"}
          >
            <SelectTrigger 
              id="componentType"
              className={cn(
                hasFieldChange("ComponentType") && "ring-2 ring-amber-500"
              )}
            >
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
          <Label htmlFor="nature">
            Natura
            {hasFieldChange("Nature") && (
              <span className="ml-1 text-amber-600">*</span>
            )}
          </Label>
          {editMode && !component?.stato_erp == "1" ? (
            <Select
              value={String(formData.Nature)}
              onValueChange={(v) => handleChange("Nature", parseInt(v, 10))}
              disabled={!editMode || component?.stato_erp == "1"}
            >
              <SelectTrigger 
                id="nature"
                className={cn(
                  hasFieldChange("Nature") && "ring-2 ring-amber-500"
                )}
              >
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
          <Label htmlFor="quantity">
            Quantità
            {hasFieldChange("Quantity") && (
              <span className="ml-1 text-amber-600">*</span>
            )}
          </Label>
          <Input
            id="quantity"
            type="number"
            step="0.1"
            value={formData.Quantity}
            onChange={(e) =>
              handleChange("Quantity", parseFloat(e.target.value))
            }
            disabled={!editMode || parentComponent?.parentBOMStato_erp == "1"}
            className={cn(
              hasFieldChange("Quantity") && "ring-2 ring-amber-500"
            )}
          />
        </div>

        <div>
          <Label htmlFor="uom">
            Unità di Misura
            {hasFieldChange("UoM") && (
              <span className="ml-1 text-amber-600">*</span>
            )}
          </Label>
          {editMode && unitsOfMeasure && unitsOfMeasure.length > 0 ? (
            <Select
              value={formData.UoM}
              onValueChange={(v) => handleChange("UoM", v)}
              disabled={!editMode || component?.parentBOMStato_erp == "1"}
            >
              <SelectTrigger 
                id="uom"
                className={cn(
                  hasFieldChange("UoM") && "ring-2 ring-amber-500"
                )}
              >
                <SelectValue placeholder="Unità di misura" />
              </SelectTrigger>
              <SelectContent>
                {unitsOfMeasure.map((uom) => (
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
              onChange={(e) => handleChange("UoM", e.target.value)}
              disabled={!editMode || component?.parentBOMStato_erp == "1"}
              className={cn(
                hasFieldChange("UoM") && "ring-2 ring-amber-500"
              )}
            />
          )}
        </div>
      </div>

      {/* Note */}
      <div>
        <Label htmlFor="notes">
          Note
          {hasFieldChange("Notes") && (
            <span className="ml-1 text-amber-600">*</span>
          )}
        </Label>
        <Textarea
          id="notes"
          value={formData.Notes || ""}
          onChange={(e) => handleChange("Notes", e.target.value)}
          rows={3}
          disabled={!editMode || component?.parentBOMStato_erp == "1"}
          className={cn(
            hasFieldChange("Notes") && "ring-2 ring-amber-500"
          )}
        />
      </div>

      {/* Dimensions */}
      <div className="border rounded-md p-3 bg-gray-50">
        <h4 className="text-sm font-medium mb-2">Dimensioni</h4>
        <div className="grid grid-cols-5 gap-3">
          <div>
            <Label htmlFor="diameter" className="text-xs">
              Diametro
              {hasFieldChange("Diameter") && (
                <span className="ml-1 text-amber-600">*</span>
              )}
            </Label>
            <Input
              id="diameter"
              type="number"
              step="0.10"
              min="0"
              value={formData.Diameter || 0}
              onChange={(e) =>
                handleChange("Diameter", parseFloat(e.target.value))
              }
              className={cn(
                "bg-white h-8 text-sm",
                hasFieldChange("Diameter") && "ring-2 ring-amber-500"
              )}
              disabled={!editMode || component?.stato_erp == "1"}
            />
          </div>

          <div>
            <Label htmlFor="bxh" className="text-xs">
              Base x Altezza
              {hasFieldChange("Bxh") && (
                <span className="ml-1 text-amber-600">*</span>
              )}
            </Label>
            <Input
              id="bxh"
              value={formData.Bxh || ""}
              onChange={(e) => handleChange("Bxh", e.target.value)}
              className={cn(
                "bg-white h-8 text-sm",
                hasFieldChange("Bxh") && "ring-2 ring-amber-500"
              )}
              disabled={!editMode || component?.stato_erp == "1"}
            />
          </div>

          <div>
            <Label htmlFor="depth" className="text-xs">
              Profondità
              {hasFieldChange("Depth") && (
                <span className="ml-1 text-amber-600">*</span>
              )}
            </Label>
            <Input
              id="depth"
              type="number"
              step="0.10"
              min="0"
              value={formData.Depth || 0}
              onChange={(e) =>
                handleChange("Depth", parseFloat(e.target.value))
              }
              className={cn(
                "bg-white h-8 text-sm",
                hasFieldChange("Depth") && "ring-2 ring-amber-500"
              )}
              disabled={!editMode || component?.stato_erp == "1"}
            />
          </div>

          <div>
            <Label htmlFor="length" className="text-xs">
              Lunghezza
              {hasFieldChange("Length") && (
                <span className="ml-1 text-amber-600">*</span>
              )}
            </Label>
            <Input
              id="length"
              type="number"
              step="0.10"
              min="0"
              value={formData.Length || 0}
              onChange={(e) =>
                handleChange("Length", parseFloat(e.target.value))
              }
              className={cn(
                "bg-white h-8 text-sm",
                hasFieldChange("Length") && "ring-2 ring-amber-500"
              )}
              disabled={!editMode || component?.stato_erp == "1"}
            />
          </div>

          <div>
            <Label htmlFor="radius" className="text-xs">
              Raggio Medio
              {hasFieldChange("MediumRadius") && (
                <span className="ml-1 text-amber-600">*</span>
              )}
            </Label>
            <Input
              id="radius"
              type="number"
              step="0.10"
              min="0"
              value={formData.MediumRadius || 0}
              onChange={(e) =>
                handleChange("MediumRadius", parseFloat(e.target.value))
              }
              className={cn(
                "bg-white h-8 text-sm",
                hasFieldChange("MediumRadius") && "ring-2 ring-amber-500"
              )}
              disabled={!editMode || component?.stato_erp == "1"}
            />
          </div>
        </div>
      </div>

      {/* Costi */}
      <div className="border rounded-md p-3 bg-green-50">
        <h4 className="text-sm font-medium mb-2 text-green-700">
          Costi Componente
        </h4>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label htmlFor="unitCost" className="text-xs text-green-700">
              Costo Unitario (€)
              {hasFieldChange("UnitCost") && (
                <span className="ml-1 text-amber-600">*</span>
              )}
            </Label>
            <Input
              id="unitCost"
              type="number"
              step="0.01"
              min="0"
              value={formData.UnitCost || 0}
              onChange={(e) =>
                handleChange("UnitCost", parseFloat(e.target.value) || 0)
              }
              className={cn(
                "bg-white h-8 text-sm",
                hasFieldChange("UnitCost") && "ring-2 ring-amber-500"
              )}
              disabled={!editMode || component?.parentBOMStato_erp == "1"}
            />
          </div>

          <div>
            <Label htmlFor="fixedCost" className="text-xs text-green-700">
              Costo Fisso (€)
              {hasFieldChange("FixedCost") && (
                <span className="ml-1 text-amber-600">*</span>
              )}
            </Label>
            <Input
              id="fixedCost"
              type="number"
              step="0.01"
              min="0"
              value={formData.FixedCost || 0}
              onChange={(e) =>
                handleChange("FixedCost", parseFloat(e.target.value) || 0)
              }
              className={cn(
                "bg-white h-8 text-sm",
                hasFieldChange("FixedCost") && "ring-2 ring-amber-500"
              )}
              disabled={!editMode || component?.parentBOMStato_erp == "1"}
            />
          </div>

          <div>
            <Label htmlFor="totalCost" className="text-xs text-green-700">
              Costo Totale (€)
            </Label>
            <div className="h-8 px-3 py-2 flex items-center border rounded-md bg-gray-100 text-sm font-medium">
              {(() => {
                const unitCost = formData.UnitCost || 0;
                const quantity = formData.Quantity || 1;
                const fixedCost = formData.FixedCost || 0;
                const totalCost = (unitCost * quantity) + fixedCost;
                return totalCost.toFixed(2) + ' €';
              })()}
            </div>
          </div>
        </div>
        <div className="mt-2 text-xs text-green-600">
          <strong>Formula:</strong> Costo Totale = (Costo Unitario × Quantità) + Costo Fisso
        </div>
      </div>
      
      {/* Customer Reference */}
      <div className="border rounded-md p-3 bg-blue-50">
        <h4 className="text-sm font-medium mb-2 text-blue-700">
          Riferimento Cliente
        </h4>
        <div className="space-y-2">
          <div>
            <Label htmlFor="customerRef" className="text-xs text-blue-700">
              Codice Cliente
              {hasFieldChange("CustomerItemReference") && (
                <span className="ml-1 text-amber-600">*</span>
              )}
            </Label>
            <Input
              id="customerRef"
              value={formData.CustomerItemReference || ""}
              onChange={(e) =>
                handleChange("CustomerItemReference", e.target.value)
              }
              disabled={!editMode || component?.stato_erp == "1"}
              className={cn(
                "bg-white h-8 text-sm",
                hasFieldChange("CustomerItemReference") && "ring-2 ring-amber-500"
              )}
            />
          </div>
        </div>
      </div>

      {/* Indicatore modifiche pendenti */}
      {editMode && pendingChanges[component.ComponentId] && (
        <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-md">
          <div className="flex items-center gap-2 text-xs text-amber-700">
            <AlertTriangle className="h-3 w-3" />
            <span className="font-medium">Modifiche non salvate</span>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function
const cn = (...classes) => {
  return classes.filter(Boolean).join(' ');
};

export default ComponentDetail;