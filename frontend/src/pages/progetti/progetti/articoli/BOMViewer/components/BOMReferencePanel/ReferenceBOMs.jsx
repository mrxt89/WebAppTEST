// BOMViewer/components/BOMReferencePanel/ReferenceBOMs.jsx
import React, { useEffect, useState } from "react";
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
import { Pagination } from "@/components/ui/pagination";

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

  // Load reference BOMs
  useEffect(() => {
    const loadReferenceBOMs = async () => {
      try {
        setLoading(true);

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

        const data = await getReferenceBOMs(
          updatedFilter,
          pagination.currentPage,
          pagination.pageSize || 10,
        );

        if (data && data.items) {
          setReferenceBOMs(data.items);
          setPagination({
            currentPage: data.pagination?.currentPage || 1,
            pageSize: data.pagination?.pageSize || 10,
            totalItems: data.pagination?.totalItems || 0,
            totalPages: data.pagination?.totalPages || 1,
          });
        }
      } catch (error) {
        console.error("Error loading reference BOMs:", error);
      } finally {
        setLoading(false);
      }
    };

    loadReferenceBOMs();
  }, [
    getReferenceBOMs,
    setReferenceBOMs,
    setLoading,
    referenceFilter,
    pagination.currentPage,
    natureFilter,
  ]);

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
          <Button size="icon" onClick={handleSearch}>
            <Search className="h-4 w-4" />
          </Button>
        </div>

        {/* Filters row */}
        <div className="flex gap-2">
          {/* Category filter */}
          <Select
            value={referenceFilter.category}
            onValueChange={(value) => handleFilterChange("category", value)}
          >
            <SelectTrigger className="w-1/2">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti</SelectItem>
              <SelectItem value="prod_fin">Prodotti Finiti</SelectItem>
              <SelectItem value="semilav">Semilavorati</SelectItem>
              <SelectItem value="acquisto">Acquisto</SelectItem>
            </SelectContent>
          </Select>

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
        </div>
      </div>

      {/* BOMs list with fixed height and scrolling */}
      <div className="flex-1 overflow-auto">
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
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>Nessuna distinta di riferimento trovata</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="py-2 px-3 border-t flex justify-center">
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
};

export default ReferenceBOMs;
