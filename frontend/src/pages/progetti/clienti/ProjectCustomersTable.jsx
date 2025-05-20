import React, { useState, useCallback, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { debounce } from "lodash";
import {
  CUSTOMER_TYPE,
  SUPPLIER_TYPE,
} from "../../../hooks/useProjectCustomersActions";
import { swal } from "../../../lib/common";

const PAGE_SIZE = 50;

const columns = [
  {
    field: "Id",
    header: "ID",
    readOnly: true,
    fixed: true,
    minWidth: 100,
    maxWidth: 100,
  },
  {
    field: "CustomerCode",
    header: "Codice Cliente",
    fixed: true,
    minWidth: 150,
    maxWidth: 150,
  },
  {
    field: "CompanyName",
    header: "Ragione Sociale",
    fixed: true,
    minWidth: 350,
    maxWidth: 350,
  },
  {
    field: "TaxIdNumber",
    header: "P.IVA",
    minWidth: 150,
    maxWidth: 150,
  },
  {
    field: "Address",
    header: "Indirizzo",
    minWidth: 250,
    maxWidth: 250,
  },
  {
    field: "ZIPCode",
    header: "CAP",
    minWidth: 80,
    maxWidth: 80,
  },
  {
    field: "City",
    header: "Città",
    minWidth: 150,
    maxWidth: 150,
  },
  {
    field: "County",
    header: "Provincia",
    minWidth: 100,
    maxWidth: 100,
  },
  {
    field: "Country",
    header: "Nazione",
    minWidth: 150,
    maxWidth: 150,
  },
  {
    field: "Region",
    header: "Regione",
    minWidth: 150,
    maxWidth: 150,
  },
  {
    field: "ERPCustSupp",
    header: "Cliente ERP",
    readOnly: true,
    minWidth: 120,
    maxWidth: 120,
  },
  {
    field: "fscodice",
    header: "Codice FS",
    minWidth: 150,
    maxWidth: 150,
  },
  {
    field: "actions",
    header: "Azioni",
    type: "actions",
    minWidth: 200,
    maxWidth: 200,
  },
];

const ProjectCustomersTable = ({
  projectCustomers,
  loading,
  onUpdateCustomer,
  onAddCustomer,
  onExportExcel,
  onFileUpload,
  onLinkToErp,
}) => {
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState({ field: "Id", direction: "asc" });
  const [localChanges, setLocalChanges] = useState({});
  const [filters, setFilters] = useState({});
  const [activeFilterField, setActiveFilterField] = useState(null);

  // Gestione dei cambiamenti nelle celle
  const handleCellChange = useCallback(
    (rowIndex, field, value) => {
      const item = projectCustomers[rowIndex];
      if (!item) return;

      setLocalChanges((prev) => ({
        ...prev,
        [item.Id]: {
          ...(prev[item.Id] || {}),
          [field]: value,
        },
      }));
    },
    [projectCustomers],
  );

  // Salvataggio delle modifiche
  const handleSaveChanges = async () => {
    try {
      const changesEntries = Object.entries(localChanges);

      for (const [customerId, changes] of changesEntries) {
        await onUpdateCustomer(customerId, changes);
      }

      setLocalChanges({});

      swal.fire({
        title: "Successo",
        text: "Modifiche salvate con successo",
        icon: "success",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000,
      });
    } catch (error) {
      console.error("Error saving changes:", error);
      swal.fire("Errore", "Errore nel salvataggio delle modifiche", "error");
    }
  };

  // Gestione dell'ordinamento
  const handleSort = (field) => {
    setSort((prev) => ({
      field,
      direction:
        prev.field === field && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  // Gestione dei filtri con debounce
  const handleFilterChange = debounce((field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value || undefined,
    }));
  }, 300);

  // Ottiene i valori unici per ogni campo per i suggerimenti dei filtri
  const uniqueValues = useMemo(() => {
    const values = {};
    columns.forEach((column) => {
      if (column.type !== "actions") {
        const fieldValues = new Set(
          projectCustomers.map((item) => item[column.field]).filter(Boolean),
        );
        values[column.field] = Array.from(fieldValues).sort();
      }
    });
    return values;
  }, [projectCustomers]);

  // Gestione del click fuori dai suggerimenti
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".filter-suggestions")) {
        setActiveFilterField(null);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // Filtraggio e ordinamento dei dati
  const filteredAndSortedData = useMemo(() => {
    let result = [...projectCustomers];

    // Applica i filtri
    Object.entries(filters).forEach(([field, value]) => {
      if (value) {
        result = result.filter((item) =>
          String(item[field] || "")
            .toLowerCase()
            .includes(String(value).toLowerCase()),
        );
      }
    });

    // Applica l'ordinamento
    result.sort((a, b) => {
      const aValue = a[sort.field];
      const bValue = b[sort.field];

      if (sort.direction === "asc") {
        return aValue > bValue ? 1 : -1;
      }
      return aValue < bValue ? 1 : -1;
    });

    return result;
  }, [projectCustomers, filters, sort]);

  // Dati paginati
  const paginatedData = useMemo(() => {
    const start = page * PAGE_SIZE;
    return filteredAndSortedData.slice(start, start + PAGE_SIZE);
  }, [filteredAndSortedData, page]);

  // Rendering di una cella della tabella
  const renderCell = (item, column, columnIndex) => {
    const value =
      localChanges[item.Id]?.[column.field] !== undefined
        ? localChanges[item.Id][column.field]
        : item[column.field] !== undefined
          ? item[column.field]
          : "";

    const isFixed = column.fixed;
    const leftOffset = columns
      .slice(0, columnIndex)
      .filter((col) => col.fixed)
      .reduce((sum, col) => sum + col.minWidth, 0);

    // Colonna azioni
    if (column.type === "actions") {
      return (
        <div className="flex space-x-2">
          {/* Pulsante per collegare a cliente ERP esistente */}
          <Button
            onClick={() => onLinkToErp(item.Id)}
            className="h-8 px-2 bg-blue-500 hover:bg-blue-600"
            title="Collega a cliente ERP"
            disabled={!!item.ERPCustSupp} // Disabilitato se già collegato
          >
            <i className="fas fa-link mr-1"></i>
            ERP
          </Button>

          {/* Visualizzazione dello stato di collegamento */}
          {item.ERPCustSupp && (
            <span className="text-green-600 flex items-center">
              <i className="fas fa-check-circle mr-1"></i>
              Collegato
            </span>
          )}
        </div>
      );
    }

    // Celle normali
    return (
      <Input
        type="text"
        value={value}
        readOnly={column.readOnly || !!item.ERPCustSupp} // ReadOnly se collegato a ERP
        onChange={(e) =>
          handleCellChange(
            filteredAndSortedData.indexOf(item),
            column.field,
            e.target.value,
          )
        }
        className="w-full p-2"
        style={{
          position: isFixed ? "sticky" : "initial",
          left: isFixed ? `${leftOffset}px` : "initial",
          zIndex: isFixed ? 2 : "auto",
          backgroundColor: isFixed ? "#fff" : "inherit",
        }}
      />
    );
  };

  // Rendering dell'intestazione della tabella
  const renderHeaderCell = (column, columnIndex) => {
    const isFixed = column.fixed;
    const leftOffset = columns
      .slice(0, columnIndex)
      .filter((col) => col.fixed)
      .reduce((sum, col) => sum + col.minWidth, 0);

    return (
      <th
        key={column.field}
        className="border-b bg-gray-50 cursor-pointer select-none"
        onClick={() => column.type !== "actions" && handleSort(column.field)}
        style={{
          position: isFixed ? "sticky" : "initial",
          left: isFixed ? `${leftOffset}px` : "initial",
          zIndex: isFixed ? 3 : "auto",
          minWidth: column.minWidth,
          maxWidth: column.maxWidth,
          width: column.minWidth,
          boxShadow: isFixed ? "2px 0 4px rgba(0,0,0,0.1)" : "none",
        }}
      >
        <div className="px-3 py-2">
          <div className="flex items-center justify-between whitespace-nowrap">
            <span>{column.header}</span>
            {column.type !== "actions" && (
              <span className="ml-2">
                {sort.field === column.field
                  ? sort.direction === "asc"
                    ? "↑"
                    : "↓"
                  : ""}
              </span>
            )}
          </div>

          {column.type !== "actions" && (
            <div
              className="relative filter-suggestions"
              onClick={(e) => e.stopPropagation()}
            >
              <Input
                placeholder="Filtra..."
                value={filters[column.field] || ""}
                onChange={(e) =>
                  handleFilterChange(column.field, e.target.value)
                }
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveFilterField(column.field);
                }}
                className="mt-2 h-8 pr-8"
              />
              {filters[column.field] && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setFilters((prev) => {
                      const newFilters = { ...prev };
                      delete newFilters[column.field];
                      return newFilters;
                    });
                  }}
                  className="absolute right-2 top-1/2 mt-1 -translate-y-1/2 text-red-500 hover:text-red-700"
                >
                  ✕
                </button>
              )}
              {activeFilterField === column.field &&
                uniqueValues[column.field]?.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto bg-white border rounded-md shadow-lg">
                    {uniqueValues[column.field].map((value, idx) => (
                      <div
                        key={idx}
                        className="mx-2 p-1 hover:bg-gray-100 cursor-pointer"
                        onClick={() => {
                          setFilters((prev) => ({
                            ...prev,
                            [column.field]: value,
                          }));
                          setActiveFilterField(null);
                        }}
                      >
                        {value}
                      </div>
                    ))}
                  </div>
                )}
            </div>
          )}
        </div>
      </th>
    );
  };

  if (loading && projectCustomers.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        Caricamento...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header con pulsanti di azione */}
      <div className="flex justify-between items-center p-2 border-b bg-white">
        <div className="flex gap-2">
          <input
            type="file"
            accept=".csv"
            onChange={onFileUpload}
            className="hidden"
            id="csvFileInput"
          />
          <Button
            onClick={() => document.getElementById("csvFileInput").click()}
            className="bg-purple-500 hover:bg-purple-600"
          >
            <i className="fas fa-file-import mr-2" />
            Importa CSV
          </Button>
          <Button
            onClick={onAddCustomer}
            className="bg-blue-500 hover:bg-blue-600"
          >
            <i className="fas fa-plus mr-2" />
            Nuovo Cliente Prospect
          </Button>
          <Button
            onClick={onExportExcel}
            className="bg-yellow-500 hover:bg-yellow-600"
          >
            <i className="fas fa-file-export mr-2" />
            Esporta Excel
          </Button>
          <Button
            onClick={handleSaveChanges}
            disabled={Object.keys(localChanges).length === 0}
            className="bg-green-500 hover:bg-green-600"
          >
            <i className="fas fa-save mr-2" />
            Salva Modifiche ({Object.keys(localChanges).length})
          </Button>
        </div>
      </div>

      {/* Container per la tabella con scroll */}
      <div className="overflow-auto flex-1 relative">
        <table className="w-max border-collapse">
          <colgroup>
            {columns.map((col) => (
              <col
                key={col.field}
                style={{
                  minWidth: col.minWidth,
                  maxWidth: col.maxWidth,
                  width: col.minWidth,
                }}
              />
            ))}
          </colgroup>
          <thead className="sticky top-0 bg-white z-20">
            <tr>
              {columns.map((column, index) => renderHeaderCell(column, index))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((item) => (
              <tr
                key={item.Id}
                className={`hover:bg-gray-50 ${
                  localChanges[item.Id]
                    ? "bg-yellow-50 hover:bg-yellow-100"
                    : ""
                } ${item.Disabled ? "bg-red-50 hover:bg-red-100" : ""} ${
                  item.ERPCustSupp ? "bg-blue-50 hover:bg-blue-100" : ""
                }`}
              >
                {columns.map((column, index) => {
                  const isFixed = column.fixed;
                  const leftOffset = columns
                    .slice(0, index)
                    .filter((col) => col.fixed)
                    .reduce((sum, col) => sum + col.minWidth, 0);

                  return (
                    <td
                      key={`${item.Id}-${column.field}`}
                      className="border-b relative"
                      style={{
                        position: isFixed ? "sticky" : "initial",
                        left: isFixed ? `${leftOffset}px` : "initial",
                        minWidth: column.minWidth,
                        maxWidth: column.maxWidth,
                        width: column.minWidth,
                        backgroundColor: isFixed
                          ? "#fff"
                          : item.Disabled
                            ? "#fef2f2"
                            : item.ERPCustSupp
                              ? "#eff6ff"
                              : localChanges[item.Id]
                                ? "#fefce8"
                                : "inherit",
                        boxShadow: isFixed
                          ? "2px 0 4px rgba(0,0,0,0.1)"
                          : "none",
                      }}
                    >
                      <div className="px-3 py-1">
                        {renderCell(item, column, index)}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginazione in fondo, fissa */}
      <div className="flex justify-between items-center p-2 border-t bg-white">
        <div id="pageNumberSection">
          <span>
            Pagina {page + 1} di{" "}
            {Math.ceil(filteredAndSortedData.length / PAGE_SIZE)}
          </span>
        </div>
        <div id="paginationButtons" className="flex gap-2">
          <Button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="bg-blue-500 hover:bg-blue-600"
          >
            Precedente
          </Button>
          <Button
            onClick={() => setPage((p) => p + 1)}
            disabled={(page + 1) * PAGE_SIZE >= filteredAndSortedData.length}
            className="bg-blue-500 hover:bg-blue-600"
          >
            Successiva
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProjectCustomersTable;
