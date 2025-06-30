// src/components/ui/multi-select.jsx
import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

export function MultiSelect({
  options = [],
  value = [],
  onChange,
  placeholder = "Seleziona...",
  renderOption,
  className,
  searchable = true,
}) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const selectedValues = Array.isArray(value) ? value : [];

  const handleSelect = (optionValue) => {
    const newValues = selectedValues.includes(optionValue)
      ? selectedValues.filter((v) => v !== optionValue)
      : [...selectedValues, optionValue];
    onChange(newValues);
  };

  const handleClear = (e, optionValue) => {
    e.stopPropagation();
    onChange(selectedValues.filter((v) => v !== optionValue));
  };

  const handleClearAll = (e) => {
    e.stopPropagation();
    onChange([]);
  };

  const selectedOptions = options.filter((opt) => 
    selectedValues.includes(opt.value)
  );

  // Filtra le opzioni in base alla ricerca
  const filteredOptions = searchQuery
    ? options.filter((option) =>
        option.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between h-8", className)}
        >
          {selectedOptions.length > 0 ? (
            <div className="flex items-center gap-1 flex-wrap max-w-full overflow-hidden">
              {selectedOptions.slice(0, 2).map((option) => (
                <Badge
                  key={option.value}
                  variant="transparent"
                  className="h-5 px-1 bg-green-200 text-gray-700"
                >
                  <span className="truncate max-w-[100px]">{option.label}</span>
                  <button
                    className="ml-1 hover:bg-secondary rounded"
                    onClick={(e) => handleClear(e, option.value)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {selectedOptions.length > 2 && (
                <Badge variant="" className="h-5 px-1">
                  +{selectedOptions.length - 2}
                </Badge>
              )}
              {selectedOptions.length > 0 && (
                <button
                  className="ml-1 hover:bg-secondary rounded p-0.5"
                  onClick={handleClearAll}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          {searchable && (
            <CommandInput 
              placeholder="Cerca..." 
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
          )}
          <CommandList>
            {filteredOptions.length === 0 ? (
              <CommandEmpty>Nessun risultato trovato.</CommandEmpty>
            ) : (
              <CommandGroup>
                {filteredOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => handleSelect(option.value)}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedValues.includes(option.value) 
                          ? "opacity-100" 
                          : "opacity-0"
                      )}
                    />
                    {renderOption ? renderOption(option) : option.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}