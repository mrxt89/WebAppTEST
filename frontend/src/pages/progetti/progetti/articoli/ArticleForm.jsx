import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Save,
  Package,
  ShoppingCart,
  AlertTriangle,
  Loader2,
  X,
  Info,
} from "lucide-react";
import { swal } from "@/lib/common";
import ArticleCodeInput from "./ArticleCodeInput";
import useProjectArticlesActions from "@/hooks/useProjectArticlesActions";

/**
 * ArticleForm - Componente per la creazione, modifica e copia di articoli
 * @param {string} mode - Modalità del form: 'new', 'edit', 'copy'
 * @param {number} projectId - ID del progetto (obbligatorio per new e copy)
 * @param {number} itemId - ID dell'articolo (per edit e copy)
 * @param {Function} onCancel - Callback per annullare l'operazione
 * @param {Function} onSave - Callback chiamata dopo il salvataggio
 */
const ArticleForm = ({ mode, projectId, itemId, onCancel, onSave }) => {
  // Stati del form
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    Item: "",
    Description: "",
    CustomerItemReference: "",
    CustomerDescription: "",
    Diameter: null,
    Bxh: "",
    Depth: null,
    Length: null,
    MediumRadius: null,
    Notes: "",
    CategoryId: null,
    FamilyId: null,
    MacrofamilyId: null,
    ItemTypeId: null,
    Nature: null,
    StatusId: 1, // Default: BOZZA
    fscodice: "",
    DescriptionExtension: "",
    BaseUoM: "PZ",
    offset_acquisto: "",
    offset_autoconsumo: "",
    offset_vendita: "",
  });

  // Stati per validazione
  const [codeValidation, setCodeValidation] = useState({
    isValid: false,
    message: '',
    isWarning: false
  });

  // Stati per opzioni select
  const [statusOptions, setStatusOptions] = useState([]);

  // Hook per le API
  const {
    getItemById,
    fetchItemStatuses,
    addItem,
    updateItem,
    copyItem,
    loading: hookLoading,
  } = useProjectArticlesActions();

  // Loading combinato
  const isLoading = loading || hookLoading;

  // Caricamento dati iniziali
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);

        // Carica gli stati degli articoli
        const statuses = await fetchItemStatuses();
        if (statuses) {
          setStatusOptions(statuses);
        }

        // Se in modalità edit o copy, carica i dati dell'articolo
        if ((mode === "edit" || mode === "copy") && itemId) {
          const itemData = await getItemById(itemId);
          if (itemData) {
            setFormData({
              Item: mode === "copy" ? "" : itemData.Item || "",
              Description: itemData.Description || "",
              CustomerItemReference: itemData.CustomerItemReference || "",
              CustomerDescription: itemData.CustomerDescription || "",
              Diameter: itemData.Diameter,
              Bxh: itemData.Bxh || "",
              Depth: itemData.Depth,
              Length: itemData.Length,
              MediumRadius: itemData.MediumRadius,
              Notes: itemData.Notes || "",
              CategoryId: itemData.CategoryId,
              FamilyId: itemData.FamilyId,
              MacrofamilyId: itemData.MacrofamilyId,
              ItemTypeId: itemData.ItemTypeId,
              Nature: itemData.Nature,
              StatusId: itemData.StatusId || 1,
              fscodice: itemData.fscodice || "",
              DescriptionExtension: itemData.DescriptionExtension || "",
              BaseUoM: itemData.BaseUoM || "PZ",
              offset_acquisto: itemData.offset_acquisto || "",
              offset_autoconsumo: itemData.offset_autoconsumo || "",
              offset_vendita: itemData.offset_vendita || "",
            });

            // Se in modalità copy, resetta la validazione del codice
            if (mode === "copy") {
              setCodeValidation({
                isValid: false,
                message: '',
                isWarning: false
              });
            }
          }
        }
      } catch (error) {
        console.error("Error loading initial data:", error);
        swal.fire({
          title: "Errore",
          text: "Errore nel caricamento dei dati iniziali",
          icon: "error",
        });
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [mode, itemId, getItemById, fetchItemStatuses]);

  // Validazione form
  const isFormValid = () => {
    return (
      formData.Description.trim() !== '' &&
      formData.Nature !== null &&
      formData.StatusId !== null
    );
  };

  // Gestione cambio valori
  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Gestione submit
  const handleSubmit = async () => {
    // Verifica altri campi obbligatori
    if (!formData.Description.trim()) {
      swal.fire({
        title: "Campo Obbligatorio",
        text: "La descrizione è obbligatoria",
        icon: "error",
      });
      return;
    }

    if (!formData.Nature) {
      swal.fire({
        title: "Campo Obbligatorio", 
        text: "La natura dell'articolo è obbligatoria",
        icon: "error",
      });
      return;
    }

    try {
      setLoading(true);

      let result;
      const itemData = {
        ...formData,
        Code: formData.Item || '', // Permetti codice vuoto
      };

      if (mode === 'new') {
        result = await addItem(itemData, projectId);
      } else if (mode === 'edit') {
        result = await updateItem({ ...itemData, Id: itemId });
      } else if (mode === 'copy') {
        result = await copyItem(itemData, projectId, itemId);
      }

      if (result && result.success) {
        let successMessage = `Articolo ${mode === 'new' ? 'creato' : mode === 'edit' ? 'aggiornato' : 'copiato'} con successo`;
        
        // Se c'è un warning dal codice, mostralo
        if (codeValidation.isWarning) {
          successMessage += `\n\nAvviso: ${codeValidation.message}`;
        }

        await swal.fire({
          title: "Successo",
          text: successMessage,
          icon: codeValidation.isWarning ? "warning" : "success",
          timer: codeValidation.isWarning ? 3000 : 1500,
          showConfirmButton: codeValidation.isWarning,
        });

        if (onSave) {
          onSave(result);
        }
      } else {
        throw new Error(result?.msg || 'Errore durante il salvataggio');
      }
    } catch (error) {
      console.error(`Error ${mode}ing article:`, error);
      swal.fire({
        title: "Errore",
        text: error.message || `Errore durante ${mode === 'new' ? 'la creazione' : mode === 'edit' ? 'l\'aggiornamento' : 'la copia'} dell'articolo`,
        icon: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // Opzioni natura
  const natureOptions = [
    { id: 22413312, description: "Semilavorato", icon: <Package className="h-4 w-4" /> },
    { id: 22413313, description: "Prodotto Finito", icon: <Package className="h-4 w-4" /> },
    { id: 22413314, description: "Acquisto", icon: <ShoppingCart className="h-4 w-4" /> },
  ];

  // Ottieni dettagli natura selezionata
  const getSelectedNatureDetails = () => {
    const selected = natureOptions.find(n => n.id === formData.Nature);
    return selected || { id: null, description: "Seleziona natura", icon: null };
  };

  const selectedNature = getSelectedNatureDetails();

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-slate-50 px-6 py-4 border-b flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Package className="h-4 w-4" />
            <span>
              {mode === 'new' && 'Nuovo Articolo'}
              {mode === 'edit' && 'Modifica Articolo'}
              {mode === 'copy' && 'Copia Articolo'}
            </span>
          </h2>
          
          {selectedNature.id && (
            <Badge className="bg-blue-100 text-blue-700 border-blue-200 flex items-center gap-1">
              {selectedNature.icon}
              <span>{selectedNature.description}</span>
            </Badge>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={onCancel}
          disabled={isLoading}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Informazioni di base */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Informazioni Generali
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Codice e Natura */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ArticleCodeInput
                  value={formData.Item}
                  onChange={(value) => setFormData(prev => ({ ...prev, Item: value }))}
                  onValidation={setCodeValidation}
                  excludeItemId={mode === 'edit' ? itemId : null}
                  disabled={isLoading}
                  required={true}
                  placeholder="Es: ART001, COMP-001, etc."
                />

                <div className="space-y-2">
                  <Label htmlFor="nature">
                    Natura <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.Nature?.toString() || ""}
                    onValueChange={(value) => 
                      setFormData(prev => ({ ...prev, Nature: parseInt(value) }))
                    }
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona natura articolo" />
                    </SelectTrigger>
                    <SelectContent>
                      {natureOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id.toString()}>
                          <div className="flex items-center gap-2">
                            {option.icon}
                            <span>{option.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Descrizione */}
              <div className="space-y-2">
                <Label htmlFor="description">
                  Descrizione <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="description"
                  value={formData.Description}
                  onChange={(e) => handleChange("Description", e.target.value)}
                  placeholder="Inserisci una descrizione dettagliata dell'articolo"
                  rows={3}
                  disabled={isLoading}
                />
              </div>

              {/* Riferimento Cliente e Stato */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="customerRef">Riferimento Cliente</Label>
                  <Input
                    id="customerRef"
                    value={formData.CustomerItemReference}
                    onChange={(e) => handleChange("CustomerItemReference", e.target.value)}
                    placeholder="Codice riferimento del cliente"
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">
                    Stato <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.StatusId?.toString() || ""}
                    onValueChange={(value) => 
                      setFormData(prev => ({ ...prev, StatusId: parseInt(value) }))
                    }
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona stato" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.Id} value={option.Id.toString()}>
                          {option.Description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* UM Base e Codice FS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="uom">Unità di Misura Base</Label>
                  <Input
                    id="uom"
                    value={formData.BaseUoM}
                    onChange={(e) => handleChange("BaseUoM", e.target.value)}
                    placeholder="PZ"
                    maxLength={3}
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fscodice">Codice FS</Label>
                  <Input
                    id="fscodice"
                    value={formData.fscodice}
                    onChange={(e) => handleChange("fscodice", e.target.value)}
                    placeholder="Codice FS opzionale"
                    maxLength={10}
                    disabled={isLoading}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dimensioni */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Dimensioni
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="diameter">Diametro</Label>
                  <Input
                    id="diameter"
                    type="number"
                    step="0.01"
                    value={formData.Diameter || ""}
                    onChange={(e) =>
                      handleChange(
                        "Diameter",
                        e.target.value ? parseFloat(e.target.value) : null,
                      )
                    }
                    placeholder="0.00"
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bxh">Base x Altezza</Label>
                  <Input
                    id="bxh"
                    value={formData.Bxh}
                    onChange={(e) => handleChange("Bxh", e.target.value)}
                    placeholder="100x100"
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="depth">Profondità</Label>
                  <Input
                    id="depth"
                    type="number"
                    step="0.01"
                    value={formData.Depth || ""}
                    onChange={(e) =>
                      handleChange(
                        "Depth",
                        e.target.value ? parseFloat(e.target.value) : null,
                      )
                    }
                    placeholder="0.00"
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="length">Lunghezza</Label>
                  <Input
                    id="length"
                    type="number"
                    step="0.01"
                    value={formData.Length || ""}
                    onChange={(e) =>
                      handleChange(
                        "Length",
                        e.target.value ? parseFloat(e.target.value) : null,
                      )
                    }
                    placeholder="0.00"
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mediumRadius">Raggio Medio</Label>
                  <Input
                    id="mediumRadius"
                    type="number"
                    step="0.01"
                    value={formData.MediumRadius || ""}
                    onChange={(e) =>
                      handleChange(
                        "MediumRadius",
                        e.target.value ? parseFloat(e.target.value) : null,
                      )
                    }
                    placeholder="0.00"
                    disabled={isLoading}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Note e informazioni aggiuntive */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Note e Informazioni Aggiuntive
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="notes">Note</Label>
                <Textarea
                  id="notes"
                  value={formData.Notes}
                  onChange={(e) => handleChange("Notes", e.target.value)}
                  placeholder="Note aggiuntive sull'articolo"
                  rows={4}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descriptionExtension">Descrizione Estesa</Label>
                <Textarea
                  id="descriptionExtension"
                  value={formData.DescriptionExtension}
                  onChange={(e) => handleChange("DescriptionExtension", e.target.value)}
                  placeholder="Descrizione dettagliata aggiuntiva"
                  rows={3}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerDescription">Descrizione Cliente</Label>
                <Textarea
                  id="customerDescription"
                  value={formData.CustomerDescription}
                  onChange={(e) => handleChange("CustomerDescription", e.target.value)}
                  placeholder="Descrizione fornita dal cliente"
                  rows={2}
                  disabled={isLoading}
                />
              </div>
            </CardContent>
          </Card>

          {/* Indicatore di stato del form */}
          {!isFormValid() && (
            <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
              <div className="flex items-center gap-2 text-amber-700 mb-2">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">Campi da completare:</span>
              </div>
              <ul className="text-sm text-amber-600 list-disc list-inside space-y-1">
                {!formData.Description.trim() && <li>Descrizione articolo</li>}
                {!formData.Nature && <li>Natura articolo</li>}
                {!formData.StatusId && <li>Stato articolo</li>}
              </ul>
            </div>
          )}

          {/* Warning per codice esistente in Mago */}
          {codeValidation.isValid && codeValidation.isWarning && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex items-center gap-2 text-blue-700">
                <Info className="h-4 w-4" />
                <span className="text-sm font-medium">Informazione:</span>
              </div>
              <p className="text-sm text-blue-600 mt-1">
                {codeValidation.message}
              </p>
            </div>
          )}

          {/* Bottoni di azione */}
          <div className="flex justify-end gap-3 pt-6 border-t bg-white sticky bottom-0 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              Annulla
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isLoading || !isFormValid()}
              className="min-w-[120px]"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Salvataggio...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  <span>
                    {mode === 'new' ? 'Crea Articolo' : 
                     mode === 'edit' ? 'Aggiorna Articolo' : 
                     'Copia Articolo'}
                  </span>
                </div>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArticleForm;