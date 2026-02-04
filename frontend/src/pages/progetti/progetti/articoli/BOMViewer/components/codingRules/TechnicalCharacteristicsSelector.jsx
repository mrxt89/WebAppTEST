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
  'RAGGIOM': 'MediumRadius', // NUOVO: Aggiunto RAGGIOM
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
  itemId = null, // NUOVO: ID articolo per salvataggio diretto
  onSaveOnly = null, // NUOVO: Callback per salvare solo caratteristiche senza ricodificare
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [allCharacteristics, setAllCharacteristics] = useState([]);
  const [selectedCharacteristics, setSelectedCharacteristics] = useState(new Set());
  const [technicalValues, setTechnicalValues] = useState({});
  const [searchFilter, setSearchFilter] = useState("");

  // Debug: log itemId quando cambia
  useEffect(() => {
    console.log('TechnicalCharacteristicsSelector - itemId ricevuto:', itemId);
  }, [itemId]);

  // Carica le caratteristiche quando si apre il dialog
  useEffect(() => {
    if (dialogOpen && companyId) {
      loadCharacteristics();
      // NUOVO: Carica TechnicalCharacteristicsJSON dal database quando si apre il dialog
      if (itemId) {
        loadTechnicalCharacteristicsFromDB();
      }
    }
  }, [dialogOpen, companyId, itemId]);

  // NUOVO: Carica TechnicalCharacteristicsJSON dal database
  const loadTechnicalCharacteristicsFromDB = async () => {
    if (!itemId) return;
    
    try {
      const response = await fetch(
        `${config.API_BASE_URL}/projectArticles/items/${itemId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      
      if (!response.ok) {
        console.error('Errore nella risposta API:', response.status, response.statusText);
        return;
      }
      
      const result = await response.json();
      
      // La route restituisce direttamente l'item, non un oggetto con success/data
      const item = result;
      
      if (item?.TechnicalCharacteristicsJSON) {
        let techJson = item.TechnicalCharacteristicsJSON;
        
        // Gestisci il caso in cui TechnicalCharacteristicsJSON è un array (problema backend)
        if (Array.isArray(techJson)) {
          // Prendi il primo elemento non vuoto
          techJson = techJson.find(j => j && j.trim() !== '') || null;
          if (!techJson) return;
        }
        
        if (typeof techJson === 'string' && techJson.trim() !== '') {
          try {
            techJson = JSON.parse(techJson);
          } catch (parseError) {
            console.error('Errore parsing TechnicalCharacteristicsJSON:', parseError);
            return;
          }
        }
        
        if (techJson && typeof techJson === 'object' && Object.keys(techJson).length > 0) {
          console.log('TechnicalCharacteristicsSelector - TechnicalCharacteristicsJSON caricato dal database:', techJson);
          
          // Aggiorna currentTechnicalData con i dati dal database
          // NUOVO APPROCCIO: Passa solo il JSON, senza mapping!
          if (onTechnicalDataChange) {
            onTechnicalDataChange({
              technicalCharacteristicsJSON: techJson
            });
          }
        }
      }
    } catch (error) {
      console.error('Errore nel caricamento TechnicalCharacteristicsJSON dal database:', error);
    }
  };

  // Inizializza i valori tecnici quando cambiano i dati esterni
  useEffect(() => {
    if (currentTechnicalData) {
      // NUOVO APPROCCIO: Usa direttamente CharacteristicCode dal JSON, senza mapping
      let valuesToUse = {};
      const selected = new Set();
      
      // Se c'è technicalCharacteristicsJSON, usa quello (formato nuovo - PREFERITO)
      if (currentTechnicalData.technicalCharacteristicsJSON && typeof currentTechnicalData.technicalCharacteristicsJSON === 'object') {
        // Formato nuovo: CharacteristicCode -> valore (es. {"DIAMETRO":"33","RAGGIOM":"44"})
        Object.entries(currentTechnicalData.technicalCharacteristicsJSON).forEach(([charCode, value]) => {
          if (value !== null && value !== undefined && value !== '') {
            // Salva direttamente con CharacteristicCode (senza mapping!)
            valuesToUse[charCode] = value;
            // Seleziona solo se la caratteristica esiste nel database
            if (allCharacteristics.some(char => char.CharacteristicCode === charCode)) {
              selected.add(charCode);
            }
          }
        });
      } else {
        // Formato vecchio (retrocompatibilità): usa mapping per convertire nomi campo -> CharacteristicCode
        const { technicalCharacteristicsJSON, ...rest } = currentTechnicalData;
        Object.entries(rest).forEach(([key, value]) => {
          if (value !== null && value !== undefined && value !== '') {
            // Cerca se la chiave è già un CharacteristicCode valido
            const matchingChar = allCharacteristics.find(char => char.CharacteristicCode === key);
            if (matchingChar) {
              // È già un CharacteristicCode valido
              valuesToUse[key] = value;
              selected.add(key);
            } else {
              // Prova con il mapping (solo per retrocompatibilità)
              Object.entries(CHARACTERISTIC_FIELD_MAP).forEach(([charCode, field]) => {
                if (field === key) {
                  // Trova il CharacteristicCode corrispondente nel database
                  const matchingChar = allCharacteristics.find(char => char.CharacteristicCode === charCode);
                  if (matchingChar) {
                    valuesToUse[charCode] = value;
                    selected.add(charCode);
                  }
                }
              });
            }
          }
        });
      }
      
      setTechnicalValues(valuesToUse);
      setSelectedCharacteristics(selected);
    }
  }, [currentTechnicalData, dialogOpen, allCharacteristics]);

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
      setTechnicalValues(prev => {
        const updated = { ...prev };
        // Rimuovi direttamente con CharacteristicCode (senza mapping!)
        delete updated[characteristicCode];
        return updated;
      });
    } else {
      // Aggiungi: seleziona
      newSelected.add(characteristicCode);
    }
    setSelectedCharacteristics(newSelected);
  };

  const handleValueChange = (characteristicCode, value) => {
    // NUOVO APPROCCIO: Salva direttamente con CharacteristicCode (senza mapping!)
    const newValues = {
      ...technicalValues,
      [characteristicCode]: value, // Usa direttamente CharacteristicCode (es. "DIAMETRO", "RAGGIOM")
    };
    setTechnicalValues(newValues);
  };

  const handleRemoveCharacteristic = (characteristicCode) => {
    const newSelected = new Set(selectedCharacteristics);
    newSelected.delete(characteristicCode);
    setSelectedCharacteristics(newSelected);
    
    setTechnicalValues(prev => {
      const updated = { ...prev };
      // Rimuovi direttamente con CharacteristicCode (senza mapping!)
      delete updated[characteristicCode];
      return updated;
    });
  };

  const prepareJSONData = () => {
    // NUOVO APPROCCIO: Usa direttamente CharacteristicCode dal JSON, senza mapping
    const jsonData = {};
    
    // Itera su tutte le caratteristiche selezionate e salva i valori
    // Usa direttamente CharacteristicCode come chiave (es. "DIAMETRO", "RAGGIOM")
    selectedCharacteristics.forEach(charCode => {
      // Cerca il valore direttamente con CharacteristicCode (senza mapping!)
      const value = technicalValues[charCode];
      
      if (value !== null && value !== undefined && value !== '') {
        jsonData[charCode] = String(value);
      }
    });
    
    return jsonData;
  };

  const handleSave = async () => {
    const jsonData = prepareJSONData();
    
    // Notifica il parent con i dati in formato JSON (CharacteristicCode -> valore)
    // NUOVO APPROCCIO: Passa solo il JSON, senza mapping!
    if (onTechnicalDataChange) {
      onTechnicalDataChange({
        technicalCharacteristicsJSON: jsonData
      });
    }
    setDialogOpen(false);
    setSearchFilter(""); // Reset filtro quando chiudi
  };

  // NUOVO: Salva solo le caratteristiche senza ricodificare
  const handleSaveOnly = async () => {
    console.log('handleSaveOnly chiamato', { itemId, technicalValues, selectedCharacteristics });
    
    if (!itemId) {
      console.error('ItemId mancante per salvataggio caratteristiche', { itemId });
      alert('Errore: ID articolo non disponibile. Impossibile salvare le caratteristiche.');
      return;
    }

    try {
      setLoading(true);
      const jsonData = prepareJSONData();
      console.log('JSON preparato per salvataggio:', jsonData);
      
      if (Object.keys(jsonData).length === 0) {
        alert('Nessuna caratteristica da salvare. Seleziona almeno una caratteristica e inserisci un valore.');
        setLoading(false);
        return;
      }
      
      const url = `${config.API_BASE_URL}/projectArticles/items/${itemId}/technical-characteristics`;
      console.log('Chiamata API:', url, { technicalCharacteristicsJSON: jsonData });
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          technicalCharacteristicsJSON: jsonData,
        }),
      });

      console.log('Risposta API:', response.status, response.statusText);
      const result = await response.json();
      console.log('Risultato API:', result);

      if (result.success) {
        // Notifica anche il parent per aggiornare lo stato locale
        // NUOVO APPROCCIO: Passa solo il JSON, senza mapping!
        if (onTechnicalDataChange) {
          onTechnicalDataChange({
            technicalCharacteristicsJSON: jsonData
          });
        }
        
        // Callback opzionale
        if (onSaveOnly) {
          onSaveOnly(result);
        }
        
       
        setDialogOpen(false);
        setSearchFilter("");
      } else {
        throw new Error(result.msg || 'Errore nel salvataggio');
      }
    } catch (error) {
      console.error('Errore nel salvataggio caratteristiche:', error);
      alert('Errore nel salvataggio: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setTechnicalValues({});
    setSelectedCharacteristics(new Set());
    if (onTechnicalDataChange) {
      // Passa oggetto vuoto sia per JSON che per formato vecchio
      onTechnicalDataChange({
        technicalCharacteristicsJSON: {},
        Diameter: null,
        Bxh: null,
        Depth: null,
        Length: null,
        MediumRadius: null,
        Thickness: null
      });
    }
  };

  const getCurrentValue = (characteristicCode) => {
    // NUOVO APPROCCIO: Usa direttamente CharacteristicCode (senza mapping!)
    return technicalValues[characteristicCode] || '';
  };

  const hasAnyValue = () => {
    const hasValue = Object.values(technicalValues).some(v => v !== '' && v !== null && v !== undefined);
    // Debug: log per capire perché potrebbe essere false
    if (!hasValue) {
      console.log('hasAnyValue = false', { technicalValues, selectedCharacteristics });
    }
    return hasValue;
  };

  // DEPRECATO: getFieldName non serve più, usiamo direttamente CharacteristicCode
  // Mantenuto solo per retrocompatibilità con codice esistente
  const getFieldName = (characteristicCode) => {
    // Non usiamo più il mapping, ma lo manteniamo per retrocompatibilità
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
          disabled={disabled}
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
                const currentValue = getCurrentValue(char.CharacteristicCode);
                // Determina se è Bxh guardando il CharacteristicCode
                const isBxh = char.CharacteristicCode === 'BxH' || char.CharacteristicCode === 'BXH';
                const hasValue = currentValue !== '' && currentValue !== null && currentValue !== undefined;

                // MOSTRA TUTTE le caratteristiche dal database
                // Usa direttamente CharacteristicCode, senza mapping!

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
            {/* NUOVO: Pulsante per salvare solo caratteristiche (se itemId disponibile) */}
            {itemId ? (
              <Button
                type="button"
                variant="default"
                onClick={() => {
                  console.log('Pulsante Salva Caratteristiche cliccato', {
                    itemId,
                    hasAnyValue: hasAnyValue(),
                    technicalValues,
                    selectedCharacteristics,
                    loading
                  });
                  handleSaveOnly();
                }}
                disabled={loading || !hasAnyValue()}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvataggio...
                  </>
                ) : (
                  'Salva Caratteristiche'
                )}
              </Button>
            ) : (
              <div className="text-xs text-gray-500">
                {/* Debug: mostra se itemId è disponibile */}
                {console.log('TechnicalCharacteristicsSelector - itemId NON disponibile:', itemId)}
                <span>ID articolo non disponibile</span>
              </div>
            )}
            <Button
              type="button"
              onClick={handleSave}
              disabled={loading}
            >
              Salva e Continua
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TechnicalCharacteristicsSelector;
