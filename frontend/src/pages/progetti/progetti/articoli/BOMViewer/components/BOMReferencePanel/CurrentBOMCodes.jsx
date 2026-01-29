import React, { useMemo, useState } from "react";
import { useBOMViewer } from "../../context/BOMViewerContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, GripVertical } from "lucide-react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { getNatureDescription } from "../../helpers/bomHelpers";

const natureMap = {
  all: "Tutte le nature",
  semifinished: 22413312,
  finished: 22413313,
  purchased: 22413314,
};

const getNatureCode = (component) => {
  const value =
    component.ComponentNature ??
    component.Nature ??
    component.ItemNature ??
    component.componentNature;
  return typeof value === "string" ? parseInt(value, 10) : value;
};

const getCodeValue = (component) =>
  component.ComponentItemCode ||
  component.ComponentCode ||
  component.Component ||
  component.ItemCode ||
  component.Item ||
  component.Code ||
  "";

const getDescriptionValue = (component) =>
  component.ComponentItemDescription ||
  component.ComponentDescription ||
  component.Description ||
  component.ItemDescription ||
  "";

const flattenComponents = (components, parentPath = []) => {
  if (!Array.isArray(components)) return [];

  return components.reduce((acc, component) => {
    if (!component) {
      return acc;
    }

    const code = getCodeValue(component);
    const description = getDescriptionValue(component);
    const nature = getNatureCode(component);
    const componentId =
      component.ComponentId || component.ItemId || component.Id || null;
    const pathLabel = [...parentPath, code].filter(Boolean);

    acc.push({
      id: `${componentId || code}-${component.Line || pathLabel.join("-")}`,
      code,
      description,
      nature,
      component,
      quantity:
        component.Quantity ||
        component.ComponentQuantity ||
        component.Qty ||
        component.BaseQuantity ||
        1,
      uom: component.UoM || component.Unit || component.UnitOfMeasure || "NR",
      path: pathLabel.join(" › "),
    });

    if (Array.isArray(component.Components) && component.Components.length) {
      acc.push(...flattenComponents(component.Components, pathLabel));
    }

    return acc;
  }, []);
};

const CurrentBOMCodes = ({ importOptions }) => {
  const { bomComponents, selectedBomId, addComponent, setLoading, loading } =
    useBOMViewer();
  const [searchText, setSearchText] = useState("");
  const [natureFilter, setNatureFilter] = useState("all");
  const [onlyUniqueCodes, setOnlyUniqueCodes] = useState(true);

  const flattenedComponents = useMemo(
    () => flattenComponents(bomComponents),
    [bomComponents],
  );

  const filteredComponents = useMemo(() => {
    const baseList = onlyUniqueCodes
      ? Array.from(
          flattenedComponents.reduce((map, entry) => {
            if (!entry.code) {
              return map;
            }
            if (!map.has(entry.code)) {
              map.set(entry.code, entry);
            }
            return map;
          }, new Map()).values(),
        )
      : flattenedComponents;

    const loweredSearch = searchText.trim().toLowerCase();
    const filterNatureCode =
      natureFilter !== "all" ? natureMap[natureFilter] : null;

    return baseList.filter((entry) => {
      const matchesText =
        !loweredSearch ||
        entry.code.toLowerCase().includes(loweredSearch) ||
        entry.description.toLowerCase().includes(loweredSearch) ||
        entry.path.toLowerCase().includes(loweredSearch);

      const matchesNature = filterNatureCode
        ? getNatureCode(entry.component) === filterNatureCode
        : true;

      return matchesText && matchesNature;
    });
  }, [flattenedComponents, onlyUniqueCodes, searchText, natureFilter]);

  const handleAddItem = async (entry) => {
    if (!selectedBomId || !entry?.component) return;

    try {
      setLoading(true);
      await addComponent({
        ComponentId:
          entry.component.ComponentId ||
          entry.component.ItemId ||
          entry.component.Id ||
          0,
        ComponentCode: entry.code,
        ComponentBOMId: entry.component.BOMId || entry.component.ComponentBOMId || null,  // NUOVO: passa BOMId se disponibile per specificare versione
        Quantity: entry.component.Quantity || 1,
        ImportBOM: importOptions.copyBOM,
        createTempComponent: importOptions.createTempComponent,
      });
    } catch (error) {
      console.error("Errore durante l'aggiunta del componente corrente:", error);
    } finally {
      setLoading(false);
    }
  };

  const buildDraggableData = (entry) => ({
    Component: entry.code,
    ComponentCode: entry.code,
    Description: entry.description,
    Quantity: entry.quantity || 1,
    UoM: entry.uom || "NR",
    ComponentType: entry.component?.ComponentType || 7798784,
    ComponentId:
      entry.component?.ComponentId ||
      entry.component?.Id ||
      entry.component?.ItemId ||
      null,
    ItemId: entry.component?.ItemId || null,
    Path: entry.path,
    Source: "current-bom",
  });

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              placeholder="Cerca nei codici correnti..."
              className="pl-8"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
            />
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
          </div>
          <Button
            variant="outline"
            onClick={() => setSearchText("")}
            disabled={!searchText}
          >
            Pulisci
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Select value={natureFilter} onValueChange={setNatureFilter}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Filtra per natura" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte le nature</SelectItem>
              <SelectItem value="semifinished">Semilavorati</SelectItem>
              <SelectItem value="finished">Prodotti finiti</SelectItem>
              <SelectItem value="purchased">Acquisti</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Checkbox
              id="uniqueCodes"
              className="data-[state=checked]:bg-blue-500 data-[state=checked]:text-white"
              checked={onlyUniqueCodes}
              onCheckedChange={(checked) => setOnlyUniqueCodes(!!checked)}
            />
            <Label htmlFor="uniqueCodes" className="text-xs text-gray-600">
              Solo codici univoci
            </Label>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {filteredComponents.length ? (
          <div className="divide-y">
            {filteredComponents.map((entry) => (
              <CurrentCodeRow
                key={entry.id}
                entry={entry}
                disabled={loading}
                onAdd={handleAddItem}
                draggableData={buildDraggableData(entry)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 py-8">
            Nessun componente trovato con i filtri attuali
          </div>
        )}
      </div>

      <div className="py-2 px-3 border-t text-xs text-gray-500 flex justify-between">
        <span>
          Mostrati {filteredComponents.length} di {flattenedComponents.length}{" "}
          righe totali
        </span>
        <span>{onlyUniqueCodes ? "Vista univoca" : "Vista completa"}</span>
      </div>
    </div>
  );
};

const CurrentCodeRow = ({ entry, disabled, onAdd, draggableData }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `current-code-${entry.id}`,
      data: {
        type: "component",
        data: draggableData,
      },
    });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "p-3 transition-colors cursor-pointer group border border-transparent",
        "hover:bg-gray-50",
        isDragging && "opacity-60 border-dashed border-primary bg-blue-50/30",
      )}
      onDoubleClick={() => onAdd(entry)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="text-gray-400 hover:text-gray-600 cursor-grab"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <div>
            <div className="font-medium text-sm truncate">
              {entry.code || "Codice non disponibile"}
            </div>
            <div className="text-xs text-gray-600 mt-1 truncate">
              {entry.description || "Senza descrizione"}
            </div>
          </div>
        </div>
        <Badge variant="outline" className="text-[10px]">
          {getNatureDescription(entry.nature) || "N/D"}
        </Badge>
      </div>
      <div className="text-[11px] text-gray-400 mt-1 truncate">{entry.path}</div>
      <div className="flex items-center justify-between mt-2 text-[11px] text-gray-500">
        <span>
          Q.tà di riferimento: {entry.quantity} {entry.uom}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            onAdd(entry);
          }}
          disabled={disabled}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};

export default CurrentBOMCodes;

