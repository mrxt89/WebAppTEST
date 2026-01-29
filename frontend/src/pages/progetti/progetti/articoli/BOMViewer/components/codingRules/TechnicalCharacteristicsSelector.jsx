// src/pages/progetti/progetti/articoli/BOMViewer/components/codingRules/TechnicalCharacteristicsSelector.jsx

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Loader2, Edit2, Trash2, Search } from "lucide-react";
import { config } from "@/config";

// Mapping tra CharacteristicCode e nome campo nel database/API
// Supporta sia codici inglesi che italiani
const CHARACTERISTIC_FIELD_MAP = {
  'DIAMETER': 'Diameter',
  'DIAMETRO': 'Diameter',
  'BxH': 'Bxh',
  'BXH': 'Bxh',
  'DEPTH': 'Depth',
  'PROFONDITA': 'Depth',
  'LENGTH': 'Length',
  'LUNGHEZZA': 'Length',
  'RADIUS': 'MediumRadius',
  'RAGGIO': 'MediumRadius',
  'RAGGIO_MEDIO': 'MediumRadius',
  'THICKNESS': 'Thickness',
  'SPESSORE': 'Thickness',
};

const TechnicalCharacteristicsSelector = ({
  companyId,
  macroFamilyId,
  familyId,
  typeId,
  currentTechnicalData = {},
  onTechnicalDataChange,
  disabled = false,
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [allCharacteristics, setAllCharacteristics] = useState([]);
  const [selectedCharacteristics, setSelectedCharacteristics] = useState(new Set());
  const [technicalValues, setTechnicalValues] = useState({});
  const [searchFilter, setSearchFilter] = useState("");

  // Carica le caratteristiche quando si apre il dialog
  useEffect(() => {
    if (dialogOpen && companyId) {
      loadCharacteristics();
    }
  }, [dialogOpen, companyId]);

  // Inizializza i valori tecnici quando cambiano i dati esterni
  useEffect(() => {
    if (currentTechnicalData) {
      setTechnicalValues(currentTechnicalData);
      
      // Determina quali caratteristiche sono già selezionate (hanno un valore)
      const selected = new Set();
      Object.entries(currentTechnicalData).forEach(([fieldName, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          // Trova il CharacteristicCode corrispondente - cerca tutte le possibili corrispondenze
          Object.entries(CHARACTERISTIC_FIELD_MAP).forEach(([charCode, field]) => {
            if (field === fieldName) {
              selected.add(charCode);
            }
          });
        }
      });
      setSelectedCharacteristics(selected);
    }
  }, [currentTechnicalData, dialogOpen]);

  const loadCharacteristics = async () => {
    try {
      setLoading(true);
      
      // Carica TUTTE le caratteristiche tecniche attive
      const charResponse = await fetch(
        `${config.API_BASE_URL}/codingRules/description/characteristics`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      const charData = await charResponse.json();
      
      if (charData.success) {
        const characteristics = charData.data || [];
        setAllCharacteristics(characteristics);
      }
    } catch (error) {
      console.error("Errore nel caricamento delle caratteristiche:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCharacteristic = (characteristicCode) => {
    const newSelected = new Set(selectedCharacteristics);
    if (newSelected.has(characteristicCode)) {
      // Rimuovi: deseleziona e cancella il valore
      newSelected.delete(characteristicCode);
      const fieldName = CHARACTERISTIC_FIELD_MAP[characteristicCode];
      if (fieldName) {
        setTechnicalValues(prev => {
          const updated = { ...prev };
          delete updated[fieldName];
          return updated;
        });
      }
    } else {
      // Aggiungi: seleziona
      newSelected.add(characteristicCode);
    }
    setSelectedCharacteristics(newSelected);
  };

  const handleValueChange = (characteristicCode, value) => {
    const fieldName = CHARACTERISTIC_FIELD_MAP[characteristicCode];
    if (fieldName) {
      const newValues = {
        ...technicalValues,
        [fieldName]: value,
      };
      setTechnicalValues(newValues);
    }
  };

  const handleRemoveCharacteristic = (characteristicCode) => {
    const newSelected = new Set(selectedCharacteristics);
    newSelected.delete(characteristicCode);
    setSelectedCharacteristics(newSelected);
    
    const fieldName = CHARACTERISTIC_FIELD_MAP[characteristicCode];
    if (fieldName) {
      setTechnicalValues(prev => {
        const updated = { ...prev };
        delete updated[fieldName];
        return updated;
      });
    }
  };

  const handleSave = async () => {
    // Notifica il parent dei nuovi valori tecnici
    if (onTechnicalDataChange) {
      onTechnicalDataChange(technicalValues);
    }
    setDialogOpen(false);
    setSearchFilter(""); // Reset filtro quando chiudi
  };

  const handleClear = () => {
    setTechnicalValues({});
    setSelectedCharacteristics(new Set());
    if (onTechnicalDataChange) {
      onTechnicalDataChange({});
    }
  };

  const getCurrentValue = (characteristicCode) => {
    const fieldName = CHARACTERISTIC_FIELD_MAP[characteristicCode];
    return fieldName ? (technicalValues[fieldName] || '') : '';
  };

  const hasAnyValue = () => {
    return Object.values(technicalValues).some(v => v !== '' && v !== null && v !== undefined);
  };

  const getFieldName = (characteristicCode) => {
    return CHARACTERISTIC_FIELD_MAP[characteristicCode] || null;
  };

  // Filtra e ordina le caratteristiche
  const filteredAndSortedCharacteristics = [...allCharacteristics]
    .filter(char => {
      if (!searchFilter) return true;
      const searchLower = searchFilter.toLowerCase();
      return (
        char.CharacteristicName?.toLowerCase().includes(searchLower) ||
        char.CharacteristicCode?.toLowerCase().includes(searchLower) ||
        char.UnitOfMeasure?.toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => (a.DisplayOrder || 999) - (b.DisplayOrder || 999));

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setDialogOpen(true)}
          disabled={disabled || !macroFamilyId}
          className="gap-1"
        >
          {hasAnyValue() ? (
            <>
              <Edit2 className="h-3 w-3" />
              Modifica Caratteristiche
            </>
          ) : (
            <>
              <Plus className="h-3 w-3" />
              Aggiungi Caratteristiche
            </>
          )}
        </Button>
        {hasAnyValue() && (
          <Badge variant="secondary" className="text-xs">
            {Object.values(technicalValues).filter(v => v !== '' && v !== null && v !== undefined).length} caratteristica/e
          </Badge>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl h-[85vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Caratteristiche Tecniche</DialogTitle>
            <DialogDescription>
              Seleziona le caratteristiche che vuoi aggiungere alla descrizione e inserisci i relativi valori.
            </DialogDescription>
          </DialogHeader>

          {/* Filtro di ricerca */}
          {allCharacteristics.length > 0 && (
            <div className="flex-shrink-0 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Cerca caratteristiche..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8 flex-1">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : allCharacteristics.length === 0 ? (
            <div className="py-8 text-center text-gray-500 flex-1">
              <p>Nessuna caratteristica tecnica configurata.</p>
              <p className="text-xs mt-2">
                Configura le caratteristiche dalla Dashboard Admin.
              </p>
            </div>
          ) : (
            <div className="space-y-4 py-4 overflow-y-auto flex-1">
              {/* Lista di tutte le caratteristiche disponibili */}
              {filteredAndSortedCharacteristics.length === 0 ? (
                <div className="py-8 text-center text-gray-500">
                  <p>Nessuna caratteristica trovata per "{searchFilter}"</p>
                </div>
              ) : (
                filteredAndSortedCharacteristics.map((char) => {
                const isSelected = selectedCharacteristics.has(char.CharacteristicCode);
                const fieldName = getFieldName(char.CharacteristicCode);
                const currentValue = fieldName ? getCurrentValue(char.CharacteristicCode) : '';
                const isBxh = fieldName === 'Bxh';
                const hasValue = currentValue !== '' && currentValue !== null && currentValue !== undefined;

                // Se non c'è mapping per questo CharacteristicCode, non mostrarlo
                if (!fieldName) {
                  return null;
                }

                return (
                  <div 
                    key={char.Id || char.CharacteristicCode} 
                    className={`border rounded-lg p-4 space-y-3 transition-all ${
                      isSelected ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    {/* Header con checkbox e nome */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <Checkbox
                          id={`char-${char.CharacteristicCode}`}
                          checked={isSelected}
                          className="data-[state=checked]:bg-blue-500 data-[state=checked]:text-white"
                          onCheckedChange={() => handleToggleCharacteristic(char.CharacteristicCode)}
                        />
                        <Label 
                          htmlFor={`char-${char.CharacteristicCode}`}
                          className="text-sm font-medium cursor-pointer flex-1"
                        >
                          {char.CharacteristicName}
                          {char.UnitOfMeasure && (
                            <span className="text-xs text-gray-500 ml-2">
                              ({char.UnitOfMeasure})
                            </span>
                          )}
                        </Label>
                      </div>
                      {isSelected && hasValue && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveCharacteristic(char.CharacteristicCode)}
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    {/* Campo input (mostrato solo se selezionato) */}
                    {isSelected && (
                      <div className="space-y-2 pl-7">
                        {char.FormatTemplate && (
                          <span className="text-xs text-gray-500 font-mono block">
                            Template: {char.FormatTemplate}
                          </span>
                        )}
                        <Input
                          type={isBxh ? "text" : "number"}
                          step={isBxh ? undefined : "0.01"}
                          value={currentValue}
                          onChange={(e) => handleValueChange(char.CharacteristicCode, e.target.value)}
                          placeholder={isBxh ? "es. 50x30" : `Inserisci ${char.CharacteristicName.toLowerCase()}`}
                          className="w-full"
                        />
                      </div>
                    )}
                  </div>
                );
                })
              )}
            </div>
          )}

          <DialogFooter className="flex-shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleClear}
              disabled={!hasAnyValue()}
            >
              <X className="h-4 w-4 mr-2" />
              Pulisci Tutto
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Annulla
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={loading}
            >
              Salva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TechnicalCharacteristicsSelector;
