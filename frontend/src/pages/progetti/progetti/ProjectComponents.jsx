// src/components/projects/ProjectComponents.jsx
import React, { useState, useEffect, useMemo, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Calendar,
  ListTodo,
  Loader2,
  CheckCircle2,
  ClipboardList,
  Triangle,
  TriangleAlert,
  Lock 
} from "lucide-react";

// Componente per la card del progetto
export const ProjectCard = ({ project, onViewDetails, tasks }) => (
  <Card className="hover:bg-gray-50 transition-colors duration-200">
    <CardContent className="p-4">
      <div className="flex flex-col gap-2 min-h-[150px]">
        {/* Header della card con nome e status */}
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-2">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <h3 className="font-semibold text-base sm:text-lg line-clamp-1">
                {project.Name}
              </h3>
              <div className="flex items-center gap-2">
                <Badge
                  style={{
                    backgroundColor: project.StatusColor
                      ? `${project.StatusColor}20`
                      : "",
                    color: project.StatusColor || "currentColor",
                    borderColor: project.StatusColor
                      ? `${project.StatusColor}40`
                      : "",
                  }}
                  className="capitalize"
                >
                  {project.StatusDescription || project.Status}
                </Badge>
                {project.ProjectErpID && (
                  <Badge
                    variant="outline"
                    className="bg-blue-50 text-blue-700 border-blue-200"
                  >
                    {project.ProjectErpID}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails(project.ProjectID);
            }}
            className="shrink-0"
          >
            Dettagli
          </Button>
        </div>

        {/* Sezione cliente */}
        {project.CompanyName && (
          <div className="text-sm text-gray-600">
            <span className="font-medium">Cliente:</span> {project.CompanyName}
          </div>
        )}

        {/* Layout flessibile per descrizione e contatori */}
        <div className="flex gap-4">
          {/* Descrizione sulla sinistra */}
          <div className="flex-1">
            <div className="text-gray-600 text-sm line-clamp-2 min-h-[3em]">
              {project.Description || "Nessuna descrizione disponibile"}
            </div>
          </div>

          {/* Mini cards sulla destra */}
          <div className="flex gap-2">
            {/* Indicatore percentuale completamento */}
            {(() => {
              const totalTasks =
                project.TaskCompletate +
                project.TaskAperteInRitardo +
                project.TaskAperteNonRitardo;
              const completionPercentage =
                totalTasks > 0
                  ? Math.round((project.TaskCompletate / totalTasks) * 100)
                  : 0;

              // Determina il colore in base alla percentuale
              const getColorClasses = (percentage) => {
                if (percentage >= 90)
                  return "bg-green-100 hover:bg-green-200 text-green-700";
                if (percentage >= 70)
                  return "bg-blue-100 hover:bg-blue-200 text-blue-700";
                if (percentage >= 50)
                  return "bg-yellow-100 hover:bg-yellow-200 text-yellow-700";
                return "bg-gray-100 hover:bg-gray-200 text-gray-700";
              };

              const colorClasses = getColorClasses(completionPercentage);

              return (
                <div
                  className={`flex items-center px-2 py-1 rounded-md transition-colors ${colorClasses}`}
                >
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  <span className="text-xs font-medium">
                    {completionPercentage}%
                  </span>
                </div>
              );
            })()}

            <div className="flex items-center px-2 py-1 rounded-md bg-gray-100 hover:bg-gray-200 transition-colors">
              <ListTodo className="w-3 h-3 text-gray-700 mr-1" />
              <span className="text-xs font-medium text-gray-700">
                {project.TaskAperteNonRitardo}
              </span>
            </div>

            <div className="flex items-center px-2 py-1 rounded-md bg-red-100 hover:bg-red-200 transition-colors">
              <TriangleAlert className="w-3 h-3 text-red-700 mr-1" />
              <span className="text-xs font-medium text-red-700">
                {project.TaskAperteInRitardo}
              </span>
            </div>
          </div>
        </div>

        {/* Sezione categoria */}
        {project.CategoryDescription && (
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: project.CategoryColor || "#CCCCCC" }}
            />
            <span className="text-sm text-gray-600">
              {project.CategoryDescription}
              {project.SubCategoryDescription && (
                <span className="text-gray-400">
                  {" > "}
                  {project.SubCategoryDescription}
                </span>
              )}
            </span>
          </div>
        )}

        {/* Date del progetto */}
        <div className="flex gap-4 text-sm text-gray-500 mt-auto">
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            Inizio: {new Date(project.StartDate).toLocaleDateString()}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            Scadenza: {new Date(project.EndDate).toLocaleDateString()}
          </span>
        </div>
      </div>
    </CardContent>
  </Card>
);

// Componente per la ricerca e selezione del cliente
export const CustomerSearchSelect = ({
  value,
  onChange,
  projectCustomers,
  loading,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);


  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        if (!value) {
          setSearchTerm("");
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [value]);

  // Funzione per normalizzare i dati cliente (supporta entrambe le strutture)
  const normalizeCustomer = (customer) => {
    if (!customer) return null;
    
    return {
      id: customer.Id || customer.CustSupp || customer.id,
      name: customer.CompanyName || customer.Name || customer.name,
      code: customer.CustomerCode || customer.Code || customer.code,
      disabled: customer.Disabled || customer.disabled || false
    };
  };

  // Normalizza e filtra i clienti
  const uniqueCustomers = useMemo(() => {
    if (!Array.isArray(projectCustomers)) {
      console.warn("projectCustomers non è un array:", projectCustomers);
      return [];
    }

    const unique = new Map();
    projectCustomers.forEach((customer) => {
      const normalized = normalizeCustomer(customer);
      if (normalized && normalized.id && !normalized.disabled) {
        unique.set(normalized.id, normalized);
      }
    });
    
    const result = Array.from(unique.values());
    return result;
  }, [projectCustomers]);

  const filteredCustomers = useMemo(() => {
    if (!searchTerm.trim()) return uniqueCustomers;
    return uniqueCustomers.filter(
      (customer) =>
        customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.code?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [uniqueCustomers, searchTerm]);

  const handleSelect = (customer) => {
    onChange(customer.id);
    setSearchTerm(customer.name);
    setIsOpen(false);
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    setIsOpen(true);
    if (!newValue) {
      onChange(null);
    }
  };

  // Clear button
  const handleClear = () => {
    setSearchTerm("");
    onChange(null);
    setIsOpen(false);
  };

  useEffect(() => {
    if (value) {
      const selectedCustomer = uniqueCustomers.find((c) => c.id == value);
      if (selectedCustomer) {
        setSearchTerm(selectedCustomer.name);
      }
    } else {
      setSearchTerm("");
    }
  }, [value, uniqueCustomers]);

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="relative">
        <Input
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={loading ? "Caricamento clienti..." : "Cerca cliente..."}
          className="w-full pr-8"
          disabled={loading}
        />
        {searchTerm && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            onClick={handleClear}
          >
            ×
          </Button>
        )}
      </div>
      
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
          {loading ? (
            <div className="p-2 text-gray-500 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Caricamento...
            </div>
          ) : filteredCustomers.length > 0 ? (
            <>
              {/* Opzione "Tutti i clienti" */}
              <div
                className="p-2 hover:bg-gray-100 cursor-pointer border-b"
                onClick={() => {
                  onChange(null);
                  setSearchTerm("");
                  setIsOpen(false);
                }}
              >
                <div className="font-medium text-gray-600">Tutti i clienti</div>
              </div>
              {filteredCustomers.map((customer) => (
                <div
                  key={`customer-${customer.id}`}
                  className="p-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => handleSelect(customer)}
                >
                  <div className="font-medium">{customer.name}</div>
                  {customer.code && (
                    <div className="text-sm text-gray-500">{customer.code}</div>
                  )}
                </div>
              ))}
            </>
          ) : (
            <div className="p-2 text-gray-500">
              {projectCustomers?.length === 0 
                ? "Nessun cliente disponibile" 
                : "Nessun cliente trovato"
              }
            </div>
          )}
        </div>
      )}
    </div>
  );
};
