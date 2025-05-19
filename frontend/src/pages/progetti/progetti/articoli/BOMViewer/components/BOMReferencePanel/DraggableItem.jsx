// BOMViewer/components/BOMReferencePanel/DraggableItem.jsx
import React from "react";
import { useDraggable } from "@dnd-kit/core";
import { Package, Circle, ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { getNatureDescription } from "../../helpers/bomHelpers";

const DraggableItem = ({ item, expanded = false, onToggle }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: item.id,
    data: item,
  });

  const hasChildren = item.data.Components && item.data.Components.length > 0;

  // Determina il colore del badge in base alla natura
  const getBadgeVariant = (nature) => {
    const natureCode =
      typeof nature === "string" ? parseInt(nature, 10) : nature;

    switch (natureCode) {
      case 22413312: // Semilavorato
        return "blue";
      case 22413313: // Prodotto Finito
        return "green";
      case 22413314: // Acquisto
        return "yellow";
      default:
        return "secondary";
    }
  };

  const itemIcon = (() => {
    if (item.type === "cycle") {
      return <Circle className="h-4 w-4 text-green-500 flex-shrink-0" />;
    }

    // Default for BOM/component
    return <Package className="h-4 w-4 text-blue-500 flex-shrink-0" />;
  })();

  // For BOMs or components with children, show expand/collapse toggle
  const toggleIcon = hasChildren ? (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onToggle && onToggle(item.id);
      }}
      className="mr-1"
    >
      {expanded ? (
        <ChevronDown className="h-4 w-4 text-gray-500" />
      ) : (
        <ChevronRight className="h-4 w-4 text-gray-500" />
      )}
    </button>
  ) : (
    <span className="w-4 mr-1" /> // Placeholder for alignment
  );

  // Get nature from item data
  const itemNature = item.data.Nature || item.data.ComponentNature || 0;
  const badgeVariant = getBadgeVariant(itemNature);
  const natureDescription = getNatureDescription(itemNature);

  return (
    <div>
      <div
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        className={cn(
          "flex items-center p-2 rounded border border-transparent",
          "hover:bg-gray-100 cursor-grab active:cursor-grabbing",
          isDragging && "opacity-50 border-dashed border-primary",
        )}
      >
        {toggleIcon}
        {itemIcon}
        <div className="ml-2 flex-1 min-w-0">
          <div className="flex items-center">
            <div className="truncate text-sm flex-1">
              {item.data.BOM || item.data.Item || item.data.ItemCode || "Item"}
            </div>

            {/* Display badge for nature */}
            <Badge
              variant="outline"
              className={cn(
                "ml-2 text-xs",
                badgeVariant === "blue" &&
                  "bg-blue-50 text-blue-700 border-blue-200",
                badgeVariant === "green" &&
                  "bg-green-50 text-green-700 border-green-200",
                badgeVariant === "yellow" &&
                  "bg-yellow-50 text-yellow-700 border-yellow-200",
              )}
            >
              {natureDescription}
            </Badge>
          </div>

          {/* Show additional info if available */}
          {(item.data.Description || item.data.ComponentDescription) && (
            <div className="text-xs text-gray-500 truncate">
              {item.data.Description || item.data.ComponentDescription}
            </div>
          )}
        </div>
      </div>

      {/* Render children if expanded */}
      {expanded && hasChildren && (
        <div className="pl-6 border-l-2 border-gray-100 ml-2">
          {item.data.Components.map((component) => (
            <DraggableItem
              key={`${item.id}-comp-${component.Component || component.ComponentId || component.id || Math.random().toString(36).substring(2)}`}
              item={{
                id: `${item.id}-comp-${component.Component || component.ComponentId || component.id || Math.random().toString(36).substring(2)}`,
                type: "component",
                data: component,
              }}
              expanded={false}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default DraggableItem;
