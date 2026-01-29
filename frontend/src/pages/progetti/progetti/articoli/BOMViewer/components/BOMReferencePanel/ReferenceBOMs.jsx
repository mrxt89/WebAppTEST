// BOMViewer/components/BOMReferencePanel/ReferenceBOMs.jsx
import React, { useEffect, useState, useRef } from "react";
import { useBOMViewer } from "../../context/BOMViewerContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter, Plus } from "lucide-react";
import DraggableItem from "./DraggableItem";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ReferenceBOMs = ({ importOptions }) => {
  const {
    referenceBOMs,
    setReferenceBOMs,
    getReferenceBOMs,
    loading,
    setLoading,
    referenceFilter,
    setReferenceFilter,
    pagination,
    setPagination,
    addComponent,
    selectedBomId,
  } = useBOMViewer();

  const [searchText, setSearchText] = useState("");
  const [natureFilter, setNatureFilter] = useState("all");
  const [expandedItems, setExpandedItems] = useState({});
  const [pageSize, setPageSize] = useState(50);
  const [allItems, setAllItems] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const scrollContainerRef = useRef(null);
  const isRestoringScrollRef = useRef(false);
  const scrollTimeoutRef = useRef(null);
  const [autoLoadEnabled, setAutoLoadEnabled] = useState(true);

  // Load reference BOMs
  useEffect(() => {
    const loadReferenceBOMs = async (reset = true) => {
      try {
        if (reset) {
          setLoading(true);
          setAllItems([]);
        } else {
          setLoadingMore(true);
        }

        // Aggiorniamo il filtro con il filtro natura
        const updatedFilter = {
          ...referenceFilter,
          // Converti il valore del filtro natura in formato API
          nature:
            natureFilter === "all"
              ? ""
              : natureFilter === "semifinished"
                ? "22413312"
                : natureFilter === "finished"
                  ? "22413313"
                  : natureFilter === "purchased"
                    ? "22413314"
                    : "",
        };

        const currentPage = reset ? 1 : Math.floor(allItems.length / pageSize) + 1;
        const data = await getReferenceBOMs(
          updatedFilter,
          currentPage,
          pageSize,
        );

        if (data && data.items) {
          if (reset) {
            setAllItems(data.items);
            setReferenceBOMs(data.items);
          } else {
            const newItems = [...allItems, ...data.items];
            setAllItems(newItems);
            setReferenceBOMs(newItems);
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
        console.error("Error loading reference BOMs:", error);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    };

    loadReferenceBOMs(true);
  }, [
    getReferenceBOMs,
    setReferenceBOMs,
    setLoading,
    referenceFilter,
    natureFilter,
    pageSize,
  ]);

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
    try {
      setLoading(true);

      // Update filter with search text
      const newFilter = {
        ...referenceFilter,
        search: searchText,
      };

      setReferenceFilter(newFilter);

      // Reset pagination to page 1
      setPagination((prev) => ({
        ...prev,
        currentPage: 1,
      }));

      // Data will be loaded by useEffect
    } catch (error) {
      console.error("Error searching reference BOMs:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle pagination
  const handlePageChange = (page) => {
    setPagination((prev) => ({
      ...prev,
      currentPage: page,
    }));
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

      // Aggiorniamo il filtro con il filtro natura
      const updatedFilter = {
        ...referenceFilter,
        nature:
          natureFilter === "all"
            ? ""
            : natureFilter === "semifinished"
              ? "22413312"
              : natureFilter === "finished"
                ? "22413313"
                : natureFilter === "purchased"
                  ? "22413314"
                  : "",
      };

      const nextPage = Math.floor(allItems.length / pageSize) + 1;
      const data = await getReferenceBOMs(
        updatedFilter,
        nextPage,
        pageSize,
      );

      if (data && data.items && data.items.length > 0) {
        const newItems = [...allItems, ...data.items];
        setAllItems(newItems);
        setReferenceBOMs(newItems);
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

  // Handle filter change
  const handleFilterChange = (field, value) => {
    setReferenceFilter((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Reset pagination to page 1
    setPagination((prev) => ({
      ...prev,
      currentPage: 1,
    }));
  };

  // Toggle item expansion
  const handleToggleItem = (itemId) => {
    setExpandedItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  // Handle double-click or add button
  const handleAddItem = async (item) => {
    if (!selectedBomId) return;

    try {
      setLoading(true);

      // Prepare data for adding component
      const componentData = {
        ComponentId: item.id || item.Id || 0,
        ComponentCode: item.BOM || item.Code || "",
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
      {/* Filters */}
      <div className="p-3 border-b">
        {/* Search bar */}
        <div className="flex gap-2 mb-2">
          <div className="relative flex-1">
            <Input
              placeholder="Cerca distinte di riferimento..."
              className="pl-8"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
          <Button  onClick={handleSearch}>
            <Search className="h-4 w-4 text-gray-500" />
          </Button>
        </div>

        {/* Filters row */}
        <div className="flex gap-2">

          {/* Nature filter */}
          <Select value={natureFilter} onValueChange={setNatureFilter}>
            <SelectTrigger className="w-1/2">
              <SelectValue placeholder="Filtra per natura" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte le nature</SelectItem>
              <SelectItem value="semifinished">Semilavorati</SelectItem>
              <SelectItem value="finished">Prodotti Finiti</SelectItem>
              <SelectItem value="purchased">Acquisti</SelectItem>
            </SelectContent>
          </Select>

          {/* Only available filter */}
          <Button
            variant="outline"
            size="icon"
            onClick={() =>
              handleFilterChange(
                "onlyAvailable",
                !referenceFilter.onlyAvailable,
              )
            }
            className={referenceFilter.onlyAvailable ? "bg-blue-50" : ""}
            title={
              referenceFilter.onlyAvailable
                ? "Mostra tutti"
                : "Mostra solo disponibili"
            }
          >
            <Filter
              className={`h-4 w-4 ${referenceFilter.onlyAvailable ? "text-blue-500" : ""}`}
            />
          </Button>

          {/* Page size selector */}
          <Select value={pageSize.toString()} onValueChange={(value) => handlePageSizeChange(parseInt(value))}>
            <SelectTrigger className="w-20">
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
        ) : referenceBOMs.length > 0 ? (
          <div className="space-y-1 p-3 h-10">
            {referenceBOMs.map((bom) => (
              <div
                key={`ref-${bom.id || bom.Id}`}
                className="relative group"
                onDoubleClick={() => handleAddItem(bom)}
              >
                <DraggableItem
                  item={{
                    id: `ref-${bom.id || bom.Id}`,
                    type: "bom",
                    data: bom,
                  }}
                  expanded={!!expandedItems[`ref-${bom.id || bom.Id}`]}
                  onToggle={() => handleToggleItem(`ref-${bom.id || bom.Id}`)}
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
            <p>Nessuna distinta di riferimento trovata</p>
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

export default ReferenceBOMs;
