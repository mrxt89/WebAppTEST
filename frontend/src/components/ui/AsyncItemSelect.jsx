import React, { useState, useEffect, useCallback } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search } from "lucide-react";
import debounce from "lodash/debounce";
import { config } from "@/config";

const AsyncItemSelect = ({
  value,
  onValueChange,
  onItemSelect,
  onBlur,
  placeholder,
  className,
  error,
  disabled,
  formatOption = (item) => ({
    value: item.Item,
    label: `${item.Item} - ${item.Description}`,
  }),
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [options, setOptions] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [selectedLabel, setSelectedLabel] = useState("");
  const [itemsMap, setItemsMap] = useState({});

  const loadOptions = useCallback(
    async (search, pageNum) => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem("token");
        if (!token) throw new Error("No token found");

        const filters = {};
        if (search?.trim()) {
          filters.searchTerm = search.trim();
        }

        const params = new URLSearchParams({
          page: pageNum.toString(),
          pageSize: "20",
          filters: JSON.stringify(filters),
        });

        const response = await fetch(
          `${config.API_BASE_URL}/articoli/paginated?${params.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          },
        );

        if (!response.ok)
          throw new Error(`Network response was not ok: ${response.status}`);

        const data = await response.json();
        const formattedOptions = data.items.map(formatOption);

        // Store full items data in the map
        const newItemsMap = {};
        data.items.forEach((item) => {
          newItemsMap[item.Item] = item;
        });
        setItemsMap((prev) => ({ ...prev, ...newItemsMap }));

        if (pageNum === 0) {
          setOptions(formattedOptions);
        } else {
          setOptions((prev) => [...prev, ...formattedOptions]);
        }

        setTotal(data.total);
        setHasMore(formattedOptions.length === 20);
      } catch (error) {
        console.error("Error loading options:", error);
        if (pageNum === 0) {
          setOptions([]);
        }
        setHasMore(false);
        setTotal(0);
      } finally {
        setIsLoading(false);
      }
    },
    [formatOption],
  );

  useEffect(() => {
    const loadSelectedItem = async () => {
      if (value && !selectedLabel) {
        try {
          setIsLoading(true);
          const token = localStorage.getItem("token");
          const response = await fetch(
            `${config.API_BASE_URL}/articoli/${encodeURIComponent(value)}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            },
          );

          if (response.ok) {
            const item = await response.json();
            const option = formatOption(item);
            setSelectedLabel(option.label);
            setOptions([option]);
            setItemsMap((prev) => ({ ...prev, [item.Item]: item }));
          }
        } catch (error) {
          console.error("Error loading selected item:", error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadSelectedItem();
  }, [value, selectedLabel, formatOption]);

  const debouncedLoadOptions = useCallback(
    debounce((search) => {
      if (search.trim().length >= 3) {
        setPage(0);
        loadOptions(search, 0);
      }
    }, 300),
    [loadOptions],
  );

  const handleSearch = useCallback(() => {
    if (searchTerm.trim().length >= 3) {
      setPage(0);
      loadOptions(searchTerm, 0);
    }
  }, [searchTerm, loadOptions]);

  const handleScroll = useCallback(
    (e) => {
      const element = e.target;
      if (
        element.scrollHeight - element.scrollTop === element.clientHeight &&
        hasMore &&
        !isLoading
      ) {
        const nextPage = page + 1;
        setPage(nextPage);
        loadOptions(searchTerm, nextPage);
      }
    },
    [hasMore, isLoading, page, searchTerm, loadOptions],
  );

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (searchTerm.trim().length >= 3) {
          handleSearch();
        }
      }
    },
    [searchTerm, handleSearch],
  );

  const handleSelect = useCallback(
    (newValue) => {
      const selectedItem = itemsMap[newValue];

      if (selectedItem) {
        const option = formatOption(selectedItem);
        setSelectedLabel(option.label);

        // Prima chiamiamo onItemSelect
        if (onItemSelect) {
          onItemSelect(selectedItem);
        }

        // Poi chiamiamo onValueChange
        if (onValueChange) {
          onValueChange(newValue);
        }
      }
    },
    [itemsMap, formatOption, onItemSelect, onValueChange],
  );

  return (
    <Select
      value={value}
      onValueChange={(newValue) => {
        handleSelect(newValue);
      }}
      disabled={disabled}
    >
      <SelectTrigger
        className={`${className} ${error ? "border-red-500" : ""}`}
        onBlur={() => onBlur?.(value)}
      >
        <SelectValue placeholder={placeholder}>
          {selectedLabel || placeholder}
        </SelectValue>
      </SelectTrigger>
      <SelectContent onScroll={handleScroll}>
        <div className="flex flex-col gap-2 p-2">
          <div className="flex gap-2">
            <Input
              placeholder="Cerca (min. 3 caratteri)..."
              value={searchTerm}
              onChange={(e) => {
                e.stopPropagation();
                const newValue = e.target.value;
                setSearchTerm(newValue);
                if (newValue.length >= 3) {
                  debouncedLoadOptions(newValue);
                }
              }}
              onKeyDown={handleKeyDown}
              className="h-8 flex-1"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleSearch();
              }}
              disabled={searchTerm.trim().length < 3 || isLoading}
              className="h-8 px-2"
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
          <div className="max-h-[200px] overflow-y-auto">
            {options.map((opt) => (
              <SelectItem
                key={opt.value}
                value={opt.value}
                className="cursor-pointer hover:bg-gray-100"
                onClick={() => {
                  console.log("SelectItem clicked:", opt.value);
                }}
              >
                <div className="flex flex-col">
                  <span className="font-medium">{opt.value}</span>
                  <span className="text-sm text-gray-500">
                    {opt.label.split(" - ")[1]}
                  </span>
                </div>
              </SelectItem>
            ))}
            {!isLoading && options.length === 0 && searchTerm && (
              <div className="text-sm text-gray-500 p-2 text-center">
                {searchTerm.length < 3
                  ? "Inserisci almeno 3 caratteri per cercare"
                  : "Nessun risultato trovato"}
              </div>
            )}
            {isLoading && (
              <div className="flex justify-center p-2">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            )}
          </div>
          {!isLoading && options.length > 0 && (
            <div className="text-sm text-gray-500 text-center">
              Mostrati {options.length} di {total} risultati
            </div>
          )}
        </div>
      </SelectContent>
    </Select>
  );
};

export default AsyncItemSelect;
