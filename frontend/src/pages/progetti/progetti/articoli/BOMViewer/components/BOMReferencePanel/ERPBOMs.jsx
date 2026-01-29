// BOMViewer/components/BOMReferencePanel/ERPBOMs.jsx
import React, { useEffect, useState, useRef } from "react";
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

const ERPBOMs = ({ importOptions }) => {
  const {
    erpBOMs,
    setErpBOMs,
    getERPItemsAndBOMs,
    loading,
    setLoading,
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
  const scrollContainerRef = useRef(null);
  const isRestoringScrollRef = useRef(false);
  const scrollTimeoutRef = useRef(null);
  const [autoLoadEnabled, setAutoLoadEnabled] = useState(true);

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

  // Load ERP BOMs
  useEffect(() => {
    const loadERPBOMs = async (reset = true) => {
      try {
        if (reset) {
          setLoading(true);
          setAllItems([]);
        } else {
          setLoadingMore(true);
        }

        const currentPage = reset ? 1 : Math.floor(allItems.length / pageSize) + 1;
        const natureValue = getNatureValue();
        const data = await getERPItemsAndBOMs(searchText, currentPage, pageSize, natureValue, typeFilter);

        if (data && data.items) {
          if (reset) {
            setAllItems(data.items);
            setErpBOMs(data.items);
          } else {
            const newItems = [...allItems, ...data.items];
            setAllItems(newItems);
            setErpBOMs(newItems);
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
        console.error("Error loading ERP BOMs:", error);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    };

    loadERPBOMs(true);
  }, [getERPItemsAndBOMs, setErpBOMs, setLoading, searchText, pageSize, natureFilter, typeFilter]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Handle search
  const handleSearch = async () => {
    // La ricerca viene gestita automaticamente dal useEffect
    // quando cambia searchText
  };

  // Handle page size change
  const handlePageSizeChange = (newPageSize) => {
    setPageSize(newPageSize);
    setPagination((prev) => ({
      ...prev,
      currentPage: 1, // Reset to first page when changing page size
    }));
  };

  // Load more items for infinite scroll
  const loadMoreItems = async () => {
    if (!hasMore || loadingMore) return;
    
    try {
      setLoadingMore(true);

      // Salva la posizione di scroll corrente
      const scrollContainer = scrollContainerRef.current;
      const currentScrollTop = scrollContainer ? scrollContainer.scrollTop : 0;
      const currentScrollHeight = scrollContainer ? scrollContainer.scrollHeight : 0;

      const nextPage = Math.floor(allItems.length / pageSize) + 1;
      const natureValue = getNatureValue();
      const data = await getERPItemsAndBOMs(searchText, nextPage, pageSize, natureValue, typeFilter);

      if (data && data.items && data.items.length > 0) {
        const newItems = [...allItems, ...data.items];
        setAllItems(newItems);
        setErpBOMs(newItems);
        setHasMore(data.items.length === pageSize);

        // Ripristina la posizione di scroll dopo il re-render
        setTimeout(() => {
          if (scrollContainer) {
            isRestoringScrollRef.current = true;
            const newScrollHeight = scrollContainer.scrollHeight;
            const heightDifference = newScrollHeight - currentScrollHeight;
            scrollContainer.scrollTop = currentScrollTop + heightDifference;
            // Reset del flag dopo un breve delay
            setTimeout(() => {
              isRestoringScrollRef.current = false;
            }, 100);
          }
        }, 0);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error loading more items:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  // Handle scroll for infinite loading
  const handleScroll = (e) => {
    // Evita il loop infinito quando stiamo ripristinando la posizione di scroll
    if (isRestoringScrollRef.current) return;
    
    // Se l'auto-loading è disabilitato, non fare nulla
    if (!autoLoadEnabled) return;
    
    // Cancella il timeout precedente se esiste
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    // Debounce: aspetta 300ms prima di controllare se caricare
    scrollTimeoutRef.current = setTimeout(() => {
      const { scrollTop, scrollHeight, clientHeight } = e.target;
      const isNearBottom = scrollTop + clientHeight >= scrollHeight - 300; // Aumentata soglia
      
      if (isNearBottom && hasMore && !loadingMore) {
        loadMoreItems();
      }
    }, 300);
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
        ComponentId: item.Id || 0,
        ComponentCode: item.BOM || item.Item || "",
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
              placeholder="Cerca distinte ERP..."
              className="pl-8"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
          <Button onClick={handleSearch}>
            <Search className="h-4 " />
          </Button>
          {/* Page size selector */}
          <Select value={pageSize.toString()} onValueChange={(value) => handlePageSizeChange(parseInt(value))}>
            <SelectTrigger className="w-15">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
              <SelectItem value="200">200</SelectItem>
            </SelectContent>
          </Select>
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
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-auto" 
        onScroll={handleScroll}
      >
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : filteredBOMs.length > 0 ? (
          <div className="space-y-1 p-3 h-10">
            {filteredBOMs.map((bom, index) => (
              <div
                key={`erp-${bom.BOM || bom.Item}-${index}`}
                className="relative group"
                onDoubleClick={() => handleAddItem(bom)}
              >
                <DraggableItem
                  item={{
                    id: `erp-${bom.BOM || bom.Item}-${index}`,
                    type: "bom",
                    data: bom,
                  }}
                  expanded={!!expandedItems[`erp-${bom.BOM || bom.Item}-${index}`]}
                  onToggle={() =>
                    handleToggleItem(`erp-${bom.BOM || bom.Item}-${index}`)
                  }
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
            ))}
            
            {/* Loading more indicator */}
            {loadingMore && (
              <div className="flex justify-center items-center py-4">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                <span className="ml-2 text-sm text-gray-500">Caricamento...</span>
              </div>
            )}
            
            {/* End of list indicator */}
            {!hasMore && allItems.length > 0 && (
              <div className="text-center py-4 text-gray-500 text-sm">
                Tutti gli elementi sono stati caricati
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>Nessuna distinta trovata</p>
          </div>
        )}
      </div>

      {/* Info footer */}
      <div className="py-2 px-3 border-t flex justify-between items-center text-sm text-gray-500">
        <div className="flex flex-col">
          <span>
            {allItems.length} elementi caricati
            {pagination.totalItems > 0 && ` di ${pagination.totalItems} totali`}
          </span>
          {!autoLoadEnabled && hasMore && (
            <span className="text-xs text-orange-600">
              Caricamento automatico disabilitato
            </span>
          )}
        </div>
        {hasMore && (
          <Button
            variant="default"
            size="sm"
            onClick={loadMoreItems}
            disabled={loadingMore}
            className="min-w-[120px]"
          >
            {loadingMore ? "Caricamento..." : "Carica altri"}
          </Button>
        )}
      </div>
    </div>
  );
};

export default ERPBOMs;
