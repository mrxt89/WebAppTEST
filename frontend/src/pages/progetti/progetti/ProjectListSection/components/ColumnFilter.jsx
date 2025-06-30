// src/pages/progetti/progetti/ProjectListSection/components/ColumnFilter.jsx
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Filter } from "lucide-react";

const ColumnFilter = ({ column, value, onChange, options = [] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localValue, setLocalValue] = useState(value || "");

  useEffect(() => {
    setLocalValue(value || "");
  }, [value]);

  const handleApply = () => {
    onChange(localValue);
    setIsOpen(false);
  };

  const handleClear = () => {
    if (column === "multiselect") {
      setLocalValue([]);
      onChange([]);
    } else {
      setLocalValue("");
      onChange("");
    }
    setIsOpen(false);
  };

  const handleMultiSelectChange = (optionValue, checked) => {
    const currentValues = Array.isArray(localValue) ? localValue : [];
    if (checked) {
      setLocalValue([...currentValues, optionValue]);
    } else {
      setLocalValue(currentValues.filter(v => v !== optionValue));
    }
  };

  const isFiltered = column === "multiselect" 
    ? Array.isArray(value) && value.length > 0
    : !!value;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-4 w-4 p-0 ml-1 hover:bg-gray-200"
        >
          <Filter className={`h-3 w-3 ${isFiltered ? "text-blue-600" : "text-gray-400"}`} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        {column === "text" ? (
          <div className="space-y-2">
            <Input
              placeholder="Filtra..."
              value={localValue}
              onChange={(e) => setLocalValue(e.target.value)}
              className="h-8"
              onKeyDown={(e) => e.key === "Enter" && handleApply()}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleApply} className="h-7 flex-1">
                Applica
              </Button>
              <Button size="sm" variant="outline" onClick={handleClear} className="h-7 flex-1">
                Cancella
              </Button>
            </div>
          </div>
        ) : column === "multiselect" ? (
          <div className="space-y-2">
            <div className="max-h-48 overflow-y-auto space-y-2">
              {options.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
                >
                  <Checkbox
                    checked={Array.isArray(localValue) && localValue.includes(option.value)}
                    onCheckedChange={(checked) => handleMultiSelectChange(option.value, checked)}
                  />
                  <span className="text-sm">{option.label}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-2 pt-2 border-t">
              <Button size="sm" onClick={handleApply} className="h-7 flex-1">
                Applica
              </Button>
              <Button size="sm" variant="outline" onClick={handleClear} className="h-7 flex-1">
                Cancella
              </Button>
            </div>
          </div>
        ) : column === "date" ? (
          <div className="space-y-2">
            <Input
              type="date"
              value={localValue}
              onChange={(e) => setLocalValue(e.target.value)}
              className="h-8"
              onKeyDown={(e) => e.key === "Enter" && handleApply()}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleApply} className="h-7 flex-1">
                Applica
              </Button>
              <Button size="sm" variant="outline" onClick={handleClear} className="h-7 flex-1">
                Cancella
              </Button>
            </div>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
};

export default ColumnFilter;