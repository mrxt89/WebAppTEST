// BOMViewer/components/BOMReferencePanel/ProjectBOMs.jsx
import React, { useEffect, useState } from "react";
import { useBOMViewer } from "../../context/BOMViewerContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, Filter } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import DraggableItem from "./DraggableItem";

const ProjectBOMs = ({ importOptions }) => {
  const {
    projectBOMs,
    setProjectBOMs,
    getProjectItemsAndBOMs,
    loading,
    setLoading,
    project,
    addComponent,
    selectedBomId,
  } = useBOMViewer();

  const [searchText, setSearchText] = useState("");
  const [natureFilter, setNatureFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all"); // all, bom, item
  const [expandedItems, setExpandedItems] = useState({});
  const [pageSize, setPageSize] = useState(50);
  const [allItems, setAllItems] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    pageSize: 50,
    totalItems: 0,
    totalPages: 1,
  });

  // Converti il filtro natura in valore numerico
  const getNatureValue = () => {
    switch (natureFilter) {
      case "semifinished":
        return 22413312;
      case "finished":
        return 22413313;
      case "purchased":
        return 22413314;
      default:
        return null;
    }
  };

  // Load project BOMs and Items
  useEffect(() => {
    const loadProjectBOMs = async (reset = true) => {
      if (!project?.ProjectID) return;

      try {
        if (reset) {
          setLoading(true);
          setAllItems([]);
        } else {
          setLoadingMore(true);
        }

        const currentPage = reset ? 1 : Math.floor(allItems.length / pageSize) + 1;
        const natureValue = getNatureValue();
        const data = await getProjectItemsAndBOMs(
          project.ProjectID,
          searchText,
          currentPage,
          pageSize,
          natureValue,
          typeFilter
        );

        if (data && data.items) {
          if (reset) {
            setAllItems(data.items);
            setProjectBOMs(data.items);
          } else {
            const newItems = [...allItems, ...data.items];
            setAllItems(newItems);
            setProjectBOMs(newItems);
          }
          
          setHasMore(data.items.length === pageSize);
          setPagination({
            currentPage: data.pagination?.currentPage || 1,
            pageSize: data.pagination?.pageSize || pageSize,
            totalItems: data.pagination?.totalItems || 0,
            totalPages: data.pagination?.totalPages || 1,
          });
        }
      } catch (error) {
        console.error("Error loading project BOMs and items:", error);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    };

    loadProjectBOMs(true);
  }, [project, getProjectItemsAndBOMs, setProjectBOMs, setLoading, searchText, pageSize, natureFilter, typeFilter]);

  // Handle search
  const handleSearch = () => {
    // La ricerca viene gestita automaticamente dal useEffect
  };

  // Toggle item expansion
  const handleToggleItem = (itemId) => {
    setExpandedItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  // Non serve più filtrare lato client, il filtro è applicato lato server
  const filteredBOMs = allItems;

  // Handle double-click or add button
  const handleAddItem = async (item) => {
    if (!selectedBomId) return;

    try {
      setLoading(true);

      // Prepare data for adding component
      const componentData = {
        ComponentId: item.id || 0,
        ComponentCode: item.BOM || item.ItemCode || "",

        ComponentBOMId: item.BOMId || null,  // NUOVO: passa BOMId se disponibile per specificare versione
        Quantity: 1,
        ImportBOM: importOptions.copyBOM,
        createTempComponent: importOptions.createTempComponent,
      };

      const result = await addComponent(componentData);

      if (result) {
        console.log("Component added successfully");
      }
    } catch (error) {
      console.error("Error adding component:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Search and filter bar */}
      <div className="p-3 border-b">
        <div className="flex gap-2 mb-2">
          <div className="relative flex-1">
            <Input
              placeholder="Cerca distinte del progetto..."
              className="pl-8"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
          <Button size="icon" onClick={handleSearch}>
            <Search className="h-4 w-4" />
          </Button>
        </div>

        {/* Nature and Type filters */}
        <div className="flex gap-2">
          <Select value={natureFilter} onValueChange={setNatureFilter}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Filtra per natura" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte le nature</SelectItem>
              <SelectItem value="semifinished">Semilavorati</SelectItem>
              <SelectItem value="finished">Prodotti Finiti</SelectItem>
              <SelectItem value="purchased">Acquisti</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti</SelectItem>
              <SelectItem value="bom">BOM</SelectItem>
              <SelectItem value="item">Item</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            title="Reimposta filtri"
            onClick={() => {
              setNatureFilter("all");
              setTypeFilter("all");
              setSearchText("");
              setAllItems([]);
            }}
          >
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* BOMs list with fixed height and scrolling */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : filteredBOMs.length > 0 ? (
          <div className="space-y-1 p-3 h-10">
            {filteredBOMs.map((bom) => {
              const itemId = bom.BOMId || bom.ItemId || bom.Code || `project-${bom.id || Math.random()}`;
              return (
                <div
                  key={itemId}
                  className="relative group"
                  onDoubleClick={() => handleAddItem(bom)}
                >
                  <DraggableItem
                    item={{
                      id: `project-${itemId}`,
                      type: bom.ItemType === 'BOM' ? "bom" : "item",
                      data: bom,
                    }}
                    expanded={!!expandedItems[`project-${itemId}`]}
                    onToggle={() => handleToggleItem(`project-${itemId}`)}
                  />

                {/* Quick add button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleAddItem(bom)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>Nessuna distinta trovata in questo progetto</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectBOMs;
