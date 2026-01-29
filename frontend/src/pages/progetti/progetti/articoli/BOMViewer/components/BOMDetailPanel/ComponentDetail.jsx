// ComponentDetail.jsx - Aggiornato per supportare il tracciamento delle modifiche

import React, { useState, useEffect, useRef } from "react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Info,
  Package,
  ShoppingCart,
  CircuitBoard,
  AlertTriangle,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ComponentDetail = ({ component, editMode }) => {
  const {
    bom,
    unitsOfMeasure,
    pendingChanges,
    setPendingChanges,
    bomComponents,
    checkItemInGestionale,
    getSuppliersWithIntercompanyFlag,
  } = useBOMViewer();

  // Aggiungiamo uno stato per monitorare il componente padre
  const [parentComponent, setParentComponent] = useState(null);

  // Stati per gestione fornitori Intercompany
  const [suppliers, setSuppliers] = useState([]);
  const [codeCheckResult, setCodeCheckResult] = useState(null);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);

  // Ref per tracciare se l'utente sta modificando un campo
  const isUserEditingRef = useRef(false);
  const editingFieldRef = useRef(null);

  // Stato per i valori attualmente visualizzati nei campi
  const isRootComponent =
    component?.Level === 0 || component?.IsRoot || component?.isRoot;

  const [formData, setFormData] = useState({
    // Campi BOM Component
    ComponentId: component?.ComponentId,
    ComponentType: component?.ComponentType || 7798784,
    Quantity: component?.Quantity || 1,
    UoM: component?.UoM || "NR",
    UnitCost: component?.UnitCost || 0,
    FixedCost: component?.FixedCost || 0,
    ComponentNotes: isRootComponent ? bom?.Notes || "" : component?.Notes || "",

    // Campi Item
    Code: component?.ComponentItemCode || component?.ComponentCode || "",
    Description: component?.ComponentItemDescription || component?.Description || "",
    ItemNotes:
      component?.ItemNotes ||
      component?.ComponentItemNotes ||
      component?.Item?.Notes ||
      "",
    Nature: component?.ComponentNature || component?.Nature || 22413312,
    Diameter: component?.Diameter || 0,
    Bxh: component?.Bxh || "",
    Depth: component?.Depth || 0,
    Length: component?.Length || 0,
    MediumRadius: component?.MediumRadius || 0,
    CustomerItemReference: component?.CustomerItemReference || "",

    // Campi Fornitore Intercompany
    TempSupplierId: component?.TempSupplierId || null,
    TempIntercompanyTargetId: component?.TempIntercompanyTargetId || null,
    TempSupplierNotes: component?.TempSupplierNotes || "",
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
    // Reset del flag di modifica quando cambia il componente
    isUserEditingRef.current = false;
    editingFieldRef.current = null;
  }, [component, bomComponents]);

  // Aggiorna le note della BOM quando cambiano header o pendingChanges
  useEffect(() => {
    if (isRootComponent) {
      const pendingHeaderNotes = pendingChanges.header?.notes;
      const sourceNotes =
        pendingHeaderNotes !== undefined ? pendingHeaderNotes : bom?.Notes || "";

      setFormData((prev) => ({
        ...prev,
        ComponentNotes: sourceNotes,
      }));
    }
  }, [isRootComponent, bom?.Notes, pendingChanges.header?.notes]);

  // Aggiorna i dati quando cambia il componente
  useEffect(() => {
    // Non aggiornare se l'utente sta modificando un campo
    if (isUserEditingRef.current) {
      return;
    }

    if (component) {
      const componentId = component.ComponentId;
      
      // Controlla se ci sono modifiche pendenti per questo componente
      const componentChanges = pendingChanges[componentId];
      const bomComponentChanges = componentChanges?.bomComponentChanges || {};
      const itemChanges = componentChanges?.itemChanges || {};
      
      const newData = {
        // Campi BOM Component - usa valori modificati se presenti, altrimenti originali
        ComponentId: component.ComponentId,
        ComponentType: bomComponentChanges.ComponentType !== undefined ? bomComponentChanges.ComponentType : (component.ComponentType || 7798784),
        Quantity: bomComponentChanges.Quantity !== undefined ? bomComponentChanges.Quantity : (component.Quantity || 1),
        UoM: bomComponentChanges.UoM !== undefined ? bomComponentChanges.UoM : (component.UoM || "NR"),
        UnitCost: bomComponentChanges.UnitCost !== undefined ? bomComponentChanges.UnitCost : (component.UnitCost || 0),
        FixedCost: bomComponentChanges.FixedCost !== undefined ? bomComponentChanges.FixedCost : (component.FixedCost || 0),
        ComponentNotes: isRootComponent 
          ? (pendingChanges.header?.notes !== undefined ? pendingChanges.header.notes : (bom?.Notes || ""))
          : (bomComponentChanges.ComponentNotes !== undefined ? bomComponentChanges.ComponentNotes : (component.Notes || "")),

        // Campi Item - usa valori modificati se presenti, altrimenti originali
        Code: component.ComponentItemCode || component.ComponentCode || "",
        Description:
          itemChanges.Description !== undefined 
            ? itemChanges.Description 
            : (component.Description || component.ComponentItemDescription || ""),
        ItemNotes:
          itemChanges.ItemNotes !== undefined
            ? itemChanges.ItemNotes
            : (component.ItemNotes ||
                component.ComponentItemNotes ||
                component.Item?.Notes ||
                ""),
        Nature: itemChanges.Nature !== undefined ? itemChanges.Nature : (component.ComponentNature || component.Nature || 22413312),
        Diameter: itemChanges.Diameter !== undefined ? itemChanges.Diameter : (component.Diameter || 0),
        Bxh: itemChanges.Bxh !== undefined ? itemChanges.Bxh : (component.Bxh || ""),
        Depth: itemChanges.Depth !== undefined ? itemChanges.Depth : (component.Depth || 0),
        Length: itemChanges.Length !== undefined ? itemChanges.Length : (component.Length || 0),
        MediumRadius: itemChanges.MediumRadius !== undefined ? itemChanges.MediumRadius : (component.MediumRadius || 0),
        Thickness: itemChanges.Thickness !== undefined ? itemChanges.Thickness : (component.Thickness || 0),
        CustomerItemReference: itemChanges.CustomerItemReference !== undefined ? itemChanges.CustomerItemReference : (component.CustomerItemReference || ""),

        // Campi Fornitore Intercompany
        TempSupplierId: component.TempSupplierId || null,
        TempIntercompanyTargetId: component.TempIntercompanyTargetId || null,
        TempSupplierNotes: component.TempSupplierNotes || "",
      };

      setFormData(newData);
    }
  }, [component, pendingChanges, bom]);

  // Ripristina i dati del form quando le modifiche pendenti vengono cancellate
  useEffect(() => {
    if (!component) return;

    // Controlla se ci sono modifiche pendenti per questo componente
    const hasComponentChanges = pendingChanges[component.ComponentId];
    // Per il root component, controlla anche se ci sono modifiche all'header
    const hasHeaderChanges = isRootComponent && pendingChanges.header;

    // Se non ci sono modifiche pendenti, ripristina i dati originali
    if (!hasComponentChanges && !hasHeaderChanges) {
      const originalData = {
        // Campi BOM Component
        ComponentId: component.ComponentId,
        ComponentType: component.ComponentType || 7798784,
        Quantity: component.Quantity || 1,
        UoM: component.UoM || "NR",
        UnitCost: component.UnitCost || 0,
        FixedCost: component.FixedCost || 0,
        ComponentNotes: isRootComponent ? bom?.Notes || "" : component.Notes || "",

        // Campi Item
        Code: component.ComponentItemCode || component.ComponentCode || "",
        Description:
          component.Description || component.ComponentItemDescription || "",
        ItemNotes:
          component.ItemNotes ||
          component.ComponentItemNotes ||
          component.Item?.Notes ||
          "",
        Nature: component.ComponentNature || component.Nature || 22413312,
        Diameter: component.Diameter || 0,
        Bxh: component.Bxh || "",
        Depth: component.Depth || 0,
        Length: component.Length || 0,
        MediumRadius: component.MediumRadius || 0,
        Thickness: component.Thickness || 0,
        CustomerItemReference: component.CustomerItemReference || "",

        // Campi Fornitore Intercompany
        TempSupplierId: component.TempSupplierId || null,
        TempIntercompanyTargetId: component.TempIntercompanyTargetId || null,
        TempSupplierNotes: component.TempSupplierNotes || "",
      };

      setFormData(originalData);
    }
  }, [component?.ComponentId, pendingChanges[component?.ComponentId], pendingChanges.header, isRootComponent, bom?.Notes]);

  // Carica fornitori quando il componente viene montato o cambia
  useEffect(() => {
    const loadSuppliers = async () => {
      try {
        setLoadingSuppliers(true);
        // Carica SOLO i fornitori Intercompany (onlyIntercompany = true)
        const result = await getSuppliersWithIntercompanyFlag(true);
        if (result && result.suppliers) {
          setSuppliers(result.suppliers);
        }
      } catch (error) {
        console.error("Errore caricamento fornitori:", error);
      } finally {
        setLoadingSuppliers(false);
      }
    };

    loadSuppliers();
  }, [getSuppliersWithIntercompanyFlag]);

  // Verifica se il codice del componente esiste nel gestionale
  useEffect(() => {
    const checkCode = async () => {
      if (!component || !component.ComponentItemCode) {
        setCodeCheckResult(null);
        return;
      }

      try {
        const result = await checkItemInGestionale(component.ComponentItemCode);
        setCodeCheckResult(result);
      } catch (error) {
        console.error("Errore verifica codice:", error);
        setCodeCheckResult(null);
      }
    };

    checkCode();
  }, [component?.ComponentItemCode, checkItemInGestionale]);

  // Gestisce il blur (quando l'utente esce dal campo)
  const handleBlur = (field) => {
    // Reset del flag dopo un breve delay per permettere al handleChange di completare
    setTimeout(() => {
      if (editingFieldRef.current === field) {
        isUserEditingRef.current = false;
        editingFieldRef.current = null;
      }
    }, 100);
  };

  // Gestisce il cambiamento nei campi del form
  const handleChange = (field, value) => {
    // Segna che l'utente sta modificando questo campo
    isUserEditingRef.current = true;
    editingFieldRef.current = field;

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
        // IMPORTANTE: TempSupplier* vanno in bomComponentChanges perché vengono gestiti da UPDATE_COMPONENT
        // Gestione speciale per le note della BOM di livello 0
        if (isRootComponent && field === "ComponentNotes") {
          console.log('[ComponentDetail] Root notes change:', {
            newValue: value,
            originalNotes: bom?.Notes,
            isDifferent: value !== (bom?.Notes || "")
          });

          const originalNotes = bom?.Notes || "";

          if (value !== originalNotes) {
            console.log('[ComponentDetail] Setting header.notes in pendingChanges');
            newChanges.header = {
              ...(newChanges.header || {}),
              notes: value,
            };
          } else if (newChanges.header) {
            console.log('[ComponentDetail] Removing header.notes from pendingChanges');
            delete newChanges.header.notes;
            if (Object.keys(newChanges.header).length === 0) {
              delete newChanges.header;
            }
          }

          console.log('[ComponentDetail] Updated pendingChanges:', newChanges);
          return newChanges;
        }

        const bomFields = [
          "ComponentType",
          "Quantity",
          "UoM",
          "UnitCost",
          "FixedCost",
          "ComponentNotes",
          "TempSupplierId",
          "TempIntercompanyTargetId",
          "TempSupplierNotes",
        ];
        const itemFields = [
          "Code",
          "Description",
          "Nature",
          "Diameter",
          "Bxh",
          "Depth",
          "Length",
          "MediumRadius",
          "CustomerItemReference",
        ];

        if (bomFields.includes(field)) {
          // Controlla se il valore è diverso dall'originale
          if (component[field] !== value) {
            newChanges[componentId].bomComponentChanges[field] = value;
            
            // Se è stata modificata la Quantity o UnitCost, ricalcola il TotalCost
            // Il FixedCost non contribuisce al TotalCost del componente, viene salvato separatamente
            if (field === 'Quantity' || field === 'UnitCost') {
              const currentUnitCost = field === 'UnitCost' ? value : (formData.UnitCost || 0);
              const currentQuantity = field === 'Quantity' ? value : (formData.Quantity || 1);
              
              /* 2025.11.13 - Il costo fisso non contribuisce al costo totale del componente ma solo al costo finale della bom */
              const newTotalCost = (currentUnitCost * currentQuantity) || 0;
              newChanges[componentId].bomComponentChanges.TotalCost = newTotalCost;
              
              console.log('Ricalcolo TotalCost:', {
                UnitCost: currentUnitCost,
                Quantity: currentQuantity,
                TotalCost: newTotalCost
              });
            }
          } else {
            // Se il valore è tornato all'originale, rimuovi la modifica
            delete newChanges[componentId].bomComponentChanges[field];
            
            // Se era stata modificata la Quantity o UnitCost, rimuovi anche il TotalCost
            if (field === 'Quantity' || field === 'UnitCost') {
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

  // Controlla se il componente è in ERP
  const isComponentInERP = component?.stato_erp == "1" || component?.stato_erp === 1;
  const isParentInERP = parentComponent?.stato_erp == "1" || parentComponent?.stato_erp === 1;
console.log(component);
  return (
    <div className="space-y-4">
      {/* Avviso se il componente è in ERP */}
      {isComponentInERP && (
        <Alert className="bg-amber-50 border-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 text-sm">
            <strong>Componente presente in ERP (Mago):</strong> Questo articolo è bloccato e non può essere modificato.
            È possibile solo copiarlo per creare un nuovo codice.
          </AlertDescription>
        </Alert>
      )}

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
              name="componentCode"
              value={formData.Code || ""}
              onChange={(e) => handleChange("Code", e.target.value)}
              disabled={!editMode || isComponentInERP}
              className={cn(
                isComponentInERP ? "bg-gray-100" : "bg-white",
                hasFieldChange("Code") && "ring-2 ring-amber-500"
              )}
              title={isComponentInERP ? "Articolo presente in ERP - Campo non modificabile" : ""}
              autoComplete="off"
            />
            {isComponentInERP && (
              <Badge className="ml-1 bg-blue-100 text-blue-700">ERP</Badge>
            )}
          </div>
        </div>

        <div className="w-full">
          <Label htmlFor="description">
            Descrizione
            {hasFieldChange("Description") && (
              <span className="ml-1 text-amber-600">*</span>
            )}
          </Label>
          <Textarea
            id="description"
            name="description"
            value={formData.Description || ""}
            onChange={(e) => handleChange("Description", e.target.value)}
            onBlur={() => handleBlur("Description")}
            rows={3}
            disabled={!editMode || isComponentInERP}
            className={cn(
              isComponentInERP ? "bg-gray-100" : "bg-white",
              hasFieldChange("Description") && "ring-2 ring-amber-500"
            )}
            title={isComponentInERP ? "Articolo presente in ERP - Campo non modificabile" : ""}
            autoComplete="off"
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
          {editMode && !isComponentInERP ? (
            <Select
              value={String(formData.Nature)}
              onValueChange={(v) => handleChange("Nature", parseInt(v, 10))}
              disabled={!editMode || isComponentInERP}
            >
              <SelectTrigger
                id="nature"
                className={cn(
                  hasFieldChange("Nature") && "ring-2 ring-amber-500"
                )}
                title={isComponentInERP ? "Articolo presente in ERP - Campo non modificabile" : ""}
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
            name="quantity"
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
            autoComplete="off"
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
              name="uom"
              value={formData.UoM}
              onChange={(e) => handleChange("UoM", e.target.value)}
              disabled={!editMode || component?.parentBOMStato_erp == "1"}
              className={cn(
                hasFieldChange("UoM") && "ring-2 ring-amber-500"
              )}
              autoComplete="off"
            />
          )}
        </div>
      </div>

      {/* Note componente o BOM */}
      <div>
        <Label htmlFor="componentNotes">
          {isRootComponent ? "Note BOM" : "Note componente (BOM)"}
          {hasFieldChange("ComponentNotes") && (
            <span className="ml-1 text-amber-600">*</span>
          )}
        </Label>
          <Textarea
            id="componentNotes"
            name="componentNotes"
            value={formData.ComponentNotes || ""}
            onChange={(e) => handleChange("ComponentNotes", e.target.value)}
            rows={3}
            disabled={!editMode || component?.parentBOMStato_erp == "1"}
            className={cn(
              hasFieldChange("ComponentNotes") && "ring-2 ring-amber-500"
            )}
            autoComplete="off"
          />
      </div>

      {/* Dimensions */}
      <div className="border rounded-md p-3 bg-gray-50">
        <h4 className="text-sm font-medium mb-2">Dimensioni</h4>
        <div className="grid grid-cols-6 gap-3">
          <div>
            <Label htmlFor="diameter" className="text-xs">
              Diametro
              {hasFieldChange("Diameter") && (
                <span className="ml-1 text-amber-600">*</span>
              )}
            </Label>
            <Input
              id="diameter"
              name="diameter"
              type="number"
              step="0.10"
              min="0"
              value={formData.Diameter || 0}
              onChange={(e) =>
                handleChange("Diameter", parseFloat(e.target.value))
              }
              className={cn(
                isComponentInERP ? "bg-gray-100 h-8 text-sm" : "bg-white h-8 text-sm",
                hasFieldChange("Diameter") && "ring-2 ring-amber-500"
              )}
              disabled={!editMode || isComponentInERP}
              title={isComponentInERP ? "Articolo presente in ERP - Campo non modificabile" : ""}
              autoComplete="off"
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
              name="bxh"
              value={formData.Bxh || ""}
              onChange={(e) => handleChange("Bxh", e.target.value)}
              className={cn(
                isComponentInERP ? "bg-gray-100 h-8 text-sm" : "bg-white h-8 text-sm",
                hasFieldChange("Bxh") && "ring-2 ring-amber-500"
              )}
              disabled={!editMode || isComponentInERP}
              title={isComponentInERP ? "Articolo presente in ERP - Campo non modificabile" : ""}
              autoComplete="off"
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
              name="depth"
              type="number"
              step="0.10"
              min="0"
              value={formData.Depth || 0}
              onChange={(e) =>
                handleChange("Depth", parseFloat(e.target.value))
              }
              className={cn(
                isComponentInERP ? "bg-gray-100 h-8 text-sm" : "bg-white h-8 text-sm",
                hasFieldChange("Depth") && "ring-2 ring-amber-500"
              )}
              disabled={!editMode || isComponentInERP}
              title={isComponentInERP ? "Articolo presente in ERP - Campo non modificabile" : ""}
              autoComplete="off"
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
              name="length"
              type="number"
              step="0.10"
              min="0"
              value={formData.Length || 0}
              onChange={(e) =>
                handleChange("Length", parseFloat(e.target.value))
              }
              className={cn(
                isComponentInERP ? "bg-gray-100 h-8 text-sm" : "bg-white h-8 text-sm",
                hasFieldChange("Length") && "ring-2 ring-amber-500"
              )}
              disabled={!editMode || isComponentInERP}
              title={isComponentInERP ? "Articolo presente in ERP - Campo non modificabile" : ""}
              autoComplete="off"
            />
          </div>

          <div>
            <Label htmlFor="thickness" className="text-xs">
              Spessore
              {hasFieldChange("Thickness") && (
                <span className="ml-1 text-amber-600">*</span>
              )}
            </Label>
            <Input
              id="thickness"
              name="thickness"
              type="number"
              step="0.10"
              min="0"
              value={formData.Thickness || 0}
              onChange={(e) =>
                handleChange("Thickness", parseFloat(e.target.value))
              }
              className={cn(
                isComponentInERP ? "bg-gray-100 h-8 text-sm" : "bg-white h-8 text-sm",
                hasFieldChange("Thickness") && "ring-2 ring-amber-500"
              )}
              disabled={!editMode || isComponentInERP}
              title={isComponentInERP ? "Articolo presente in ERP - Campo non modificabile" : ""}
              autoComplete="off"
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
              name="radius"
              type="number"
              step="0.10"
              min="0"
              value={formData.MediumRadius || 0}
              onChange={(e) =>
                handleChange("MediumRadius", parseFloat(e.target.value))
              }
              className={cn(
                isComponentInERP ? "bg-gray-100 h-8 text-sm" : "bg-white h-8 text-sm",
                hasFieldChange("MediumRadius") && "ring-2 ring-amber-500"
              )}
              disabled={!editMode || isComponentInERP}
              title={isComponentInERP ? "Articolo presente in ERP - Campo non modificabile" : ""}
              autoComplete="off"
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
              name="unitCost"
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
              autoComplete="off"
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
              name="fixedCost"
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
              autoComplete="off"
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
                const totalCost = (unitCost * quantity);
                return totalCost.toFixed(2) + ' €';
              })()}
            </div>
          </div>
        </div>
        <div className="mt-2 text-xs text-green-600">
          <strong>Formula:</strong> Costo Totale = Costo Unitario × Quantità
          <br />
          <span className="text-gray-600">Nota: Il costo fisso viene salvato separatamente e contribuisce solo al costo finale della BOM.</span>
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
              disabled={!editMode || isComponentInERP}
              className={cn(
                isComponentInERP ? "bg-gray-100 h-8 text-sm" : "bg-white h-8 text-sm",
                hasFieldChange("CustomerItemReference") && "ring-2 ring-amber-500"
              )}
              title={isComponentInERP ? "Articolo presente in ERP - Campo non modificabile" : ""}
            />
          </div>
        </div>
      </div>

      {/* Fornitore Intercompany - Solo per articoli di Acquisto temporanei */}
      {editMode && formData.Nature === 22413314 && component?.stato_erp !== "1" && (
        <div className="border rounded-md p-3 bg-purple-50">
          <h4 className="text-sm font-medium mb-2 text-purple-700 flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Fornitore Intercompany
          </h4>

          {/* Info se codice esiste nel gestionale */}
          {codeCheckResult && codeCheckResult.exists && (
            <Alert className="mb-3">
              <Building2 className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-blue-50">
                    GESTIONALE
                  </Badge>
                  <span className="text-sm">
                    Dati fornitore provengono dal gestionale (sola lettura)
                  </span>
                </div>
                {codeCheckResult.supplierName && (
                  <p className="text-xs mt-1">
                    Fornitore: <strong>{codeCheckResult.supplierName}</strong>
                    {codeCheckResult.isIntercompany && (
                      <Badge variant="secondary" className="ml-2">
                        Intercompany → {codeCheckResult.intercompanyTargetName}
                      </Badge>
                    )}
                  </p>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Campi fornitore - editabili solo se codice è temporaneo */}
          <div className="space-y-3">
            <div>
              <Label htmlFor="supplier" className="text-xs text-purple-700">
                Fornitore Intercompany
                {hasFieldChange("TempSupplierId") && (
                  <span className="ml-1 text-amber-600">*</span>
                )}
              </Label>
              <Select
                value={formData.TempSupplierId || ""}
                onValueChange={(value) => {
                  const selectedSupplier = suppliers.find(s => s.SupplierId === value);
                  handleChange("TempSupplierId", value);
                  if (selectedSupplier) {
                    handleChange("TempIntercompanyTargetId", selectedSupplier.IntercompanyTargetId || null);
                  }
                }}
                disabled={!editMode || loadingSuppliers || (codeCheckResult && codeCheckResult.exists)}
              >
                <SelectTrigger
                  id="supplier"
                  className={cn(
                    "bg-white h-8 text-sm",
                    hasFieldChange("TempSupplierId") && "ring-2 ring-amber-500"
                  )}
                >
                  <SelectValue placeholder={loadingSuppliers ? "Caricamento..." : "Seleziona fornitore Intercompany (opzionale)"} />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.length === 0 ? (
                    <div className="p-2 text-sm text-gray-500 text-center">
                      Nessun fornitore Intercompany disponibile
                    </div>
                  ) : (
                    suppliers.map((supplier) => (
                      <SelectItem key={supplier.SupplierId} value={supplier.SupplierId}>
                        <div className="flex items-center gap-2">
                          <span>{supplier.SupplierName}</span>
                          <Badge variant="secondary" className="text-xs">
                            → {supplier.IntercompanyTargetName}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Info azienda Intercompany target */}
            {formData.TempSupplierId && formData.TempIntercompanyTargetId && (
              <div className="p-2 bg-purple-100 rounded text-xs text-purple-800">
                <Building2 className="h-3 w-3 inline mr-1" />
                <strong>Fornitore Intercompany:</strong> Questo componente sarà condiviso con l'azienda{" "}
                <strong>
                  {suppliers.find(s => s.SupplierId === formData.TempSupplierId)?.IntercompanyTargetName}
                </strong>
              </div>
            )}

            <div>
              <Label htmlFor="supplierNotes" className="text-xs text-purple-700">
                Note Fornitore
                {hasFieldChange("TempSupplierNotes") && (
                  <span className="ml-1 text-amber-600">*</span>
                )}
              </Label>
              <Textarea
                id="supplierNotes"
                value={formData.TempSupplierNotes || ""}
                onChange={(e) => handleChange("TempSupplierNotes", e.target.value)}
                rows={2}
                disabled={!editMode || (codeCheckResult && codeCheckResult.exists)}
                placeholder="Note opzionali sul fornitore..."
                className={cn(
                  "bg-white text-sm",
                  hasFieldChange("TempSupplierNotes") && "ring-2 ring-amber-500"
                )}
              />
            </div>
          </div>
        </div>
      )}

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

export default ComponentDetail;