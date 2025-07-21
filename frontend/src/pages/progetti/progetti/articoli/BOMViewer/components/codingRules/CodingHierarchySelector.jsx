// src/pages/progetti/progetti/articoli/BOMViewer/components/codingRules/CodingHierarchySelector.jsx

import React, { useState, useEffect, useCallback } from "react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, Edit2, Wand2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import useRecodingRules from "@/hooks/useRecodingRules";
import ArticleSuggestions from "./ArticleSuggestions";

const CodingHierarchySelector = ({
  companyId,
  componentId,
  currentCode,
  currentDescription,
  isRoot = false,
  value = {},
  onChange,
  onDescriptionChange,
  disabled = false,
  className = ""
}) => {
  const {
    loading,
    loadCategories,
    loadMacroFamilies,
    loadFamilies,
    loadTypes,
    loadAliases,
    getNextSequential,
    generateCodePreview,
    validateCode
  } = useRecodingRules();

  // Stati locali per le opzioni
  const [categories, setCategories] = useState([]);
  const [macroFamilies, setMacroFamilies] = useState([]);
  const [families, setFamilies] = useState([]);
  const [types, setTypes] = useState([]);
  const [aliases, setAliases] = useState([]);
  
  // Stati per i valori selezionati
  const [selectedValues, setSelectedValues] = useState({
    categoryId: value.categoryId || "",
    categoryCode: value.categoryCode || "",
    macroFamilyId: value.macroFamilyId || "",
    macroFamilyCode: value.macroFamilyCode || "",
    familyId: value.familyId || "",
    familyCode: value.familyCode || "",
    typeId: value.typeId || "",
    typeCode: value.typeCode || "",
    aliasId: value.aliasId || "",
    aliasCode: value.aliasCode || "",
    measures: value.measures || "",
    sequential: value.sequential || "",
    newCode: value.newCode || "",
    newDescription: value.newDescription || currentDescription || "",
    useExistingArticle: value.useExistingArticle || false,
    existingArticleId: value.existingArticleId || null
  });

  // Stati per validazione
  const [validation, setValidation] = useState({
    isValid: true,
    message: ""
  });
  
  const [isLoadingSequential, setIsLoadingSequential] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);

  // Flag per tracciare se stiamo caricando dati
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Carica categorie al mount
  useEffect(() => {
    if (companyId && !disabled) {
      loadInitialCategories();
    }
  }, [companyId, disabled]);

  // Genera descrizione automatica
  const generateDescription = useCallback(() => {
    const parts = [];
    
    // Aggiungi componenti della gerarchia alla descrizione
    if (selectedValues.categoryCode) {
      const category = categories.find(c => String(c.Id) === String(selectedValues.categoryId));
      if (category) parts.push(category.Description);
    }
    
    if (selectedValues.macroFamilyCode) {
      const macroFamily = macroFamilies.find(m => String(m.Id) === String(selectedValues.macroFamilyId));
      if (macroFamily) parts.push(macroFamily.Description);
    }
    
    if (selectedValues.familyCode && selectedValues.familyCode !== "000") {
      const family = families.find(f => String(f.Id) === String(selectedValues.familyId));
      if (family) parts.push(family.Description);
    }
    
    if (selectedValues.typeCode && selectedValues.typeCode !== "000") {
      const type = types.find(t => String(t.Id) === String(selectedValues.typeId));
      if (type) parts.push(type.Description);
    }
    
    if (selectedValues.aliasCode && selectedValues.aliasCode !== "000") {
      const alias = aliases.find(a => String(a.Id) === String(selectedValues.aliasId));
      if (alias) parts.push(alias.Description);
    }
    
    // Aggiungi misure se presenti
    if (selectedValues.measures && selectedValues.measures !== "00") {
      parts.push(`M.${selectedValues.measures}`);
    }
    
    return parts.filter(p => p).join(" - ");
  }, [selectedValues, categories, macroFamilies, families, types, aliases]);

  // Aggiorna stato quando cambiano le props
  useEffect(() => {
    if (value && Object.keys(value).length > 0) {
      setSelectedValues(prev => ({
        ...prev,
        ...value
      }));
    }
  }, [value]);

  // Carica categorie iniziali
  const loadInitialCategories = async () => {
    const data = await loadCategories(companyId);
    setCategories(data);
  };

  // Funzione helper per completare il codice con defaults
  const completeCodeWithDefaults = useCallback(async (values) => {
    console.log("completeCodeWithDefaults chiamato con:", values);
    
    // Se non abbiamo almeno una macrofamiglia, non possiamo procedere
    if (!values.macroFamilyCode) {
      console.log("Macrofamiglia mancante, non posso completare il codice");
      return values;
    }
    
    // Applica i default per i campi mancanti
    const completedValues = {
      ...values,
      familyCode: values.familyCode || "000",
      typeCode: values.typeCode || "000", 
      aliasCode: values.aliasCode || "000",
      measures: values.measures || "",
      useExistingArticle: false,
      existingArticleId: null
    };
    
    console.log("Valori completati con defaults:", completedValues);
    
    // Calcola il sequenziale
    await calculateSequential(completedValues);
    
    return completedValues;
  }, []);

  // Gestisce selezione categoria
  const handleCategoryChange = async (categoryId) => {
    setIsLoadingData(true);
    
    // Se categoryId è vuoto (deselezionato), resetta tutto
    if (!categoryId) {
      const resetValues = {
        categoryId: "",
        categoryCode: "",
        macroFamilyId: "",
        macroFamilyCode: "",
        familyId: "",
        familyCode: "",
        typeId: "",
        typeCode: "",
        aliasId: "",
        aliasCode: "",
        measures: "",
        sequential: "",
        newCode: "",
        newDescription: "",
        isValid: false,
        validationMessage: "",
        useExistingArticle: false,
        existingArticleId: null
      };
      
      setSelectedValues(resetValues);
      setMacroFamilies([]);
      setFamilies([]);
      setTypes([]);
      setAliases([]);
      onChange(resetValues);
      
      if (onDescriptionChange) {
        onDescriptionChange("");
      }
      
      setIsLoadingData(false);
      return;
    }
    
    const category = categories.find(c => String(c.Id) === String(categoryId));
    console.log("Categoria selezionata:", category);
    
    // Reset cascade
    setMacroFamilies([]);
    setFamilies([]);
    setTypes([]);
    setAliases([]);
    
    const newValues = {
      ...selectedValues,
      categoryId: categoryId,
      categoryCode: category?.Code || "",
      macroFamilyId: "",
      macroFamilyCode: "",
      familyId: "",
      familyCode: "",
      typeId: "",
      typeCode: "",
      aliasId: "",
      aliasCode: "",
      sequential: "",
      newCode: "",
      useExistingArticle: false,
      existingArticleId: null
    };
    
    setSelectedValues(newValues);
    
    // Aggiorna descrizione automaticamente se non è stata modificata manualmente
    if (!isEditingDescription && !newValues.useExistingArticle) {
      const newDescription = generateDescription();
      newValues.newDescription = newDescription;
      setSelectedValues(prev => ({ ...prev, newDescription }));
      if (onDescriptionChange) {
        onDescriptionChange(newDescription);
      }
    }
    
    onChange(newValues);
    
    // Carica macrofamiglie
    if (categoryId) {
      const data = await loadMacroFamilies(companyId, categoryId);
      setMacroFamilies(data);
    }
    
    setIsLoadingData(false);
  };

  // Gestisce selezione macrofamiglia
  const handleMacroFamilyChange = async (macroFamilyId) => {
    setIsLoadingData(true);
    
    const macroFamily = macroFamilies.find(m => String(m.Id) === String(macroFamilyId));
    console.log("Macrofamiglia selezionata:", macroFamily);
    
    // Reset cascade
    setFamilies([]);
    setTypes([]);
    setAliases([]);
    
    const newValues = {
      ...selectedValues,
      macroFamilyId: macroFamilyId,
      macroFamilyCode: macroFamily?.Code || "",
      familyId: "",
      familyCode: "",
      typeId: "",
      typeCode: "",
      aliasId: "",
      aliasCode: "",
      sequential: "",
      newCode: "",
      useExistingArticle: false,
      existingArticleId: null
    };
    
    setSelectedValues(newValues);
    
    // Aggiorna descrizione automaticamente
    if (!isEditingDescription && !newValues.useExistingArticle) {
      const newDescription = generateDescription();
      newValues.newDescription = newDescription;
      setSelectedValues(prev => ({ ...prev, newDescription }));
      if (onDescriptionChange) {
        onDescriptionChange(newDescription);
      }
    }
    
    onChange(newValues);
    
    // Carica famiglie
    if (macroFamilyId) {
      const data = await loadFamilies(companyId, macroFamilyId);
      setFamilies(data);
      
      // Se non ci sono famiglie, completa il codice con i defaults
      if (data.length === 0) {
        console.log("Nessuna famiglia disponibile, completo con defaults");
        await completeCodeWithDefaults(newValues);
      }
    }
    
    setIsLoadingData(false);
  };

  // Gestisce selezione famiglia
  const handleFamilyChange = async (familyId) => {
    setIsLoadingData(true);
    
    const family = families.find(f => String(f.Id) === String(familyId));
    console.log("Famiglia selezionata:", family);
    
    // Reset cascade
    setTypes([]);
    setAliases([]);
    
    const newValues = {
      ...selectedValues,
      familyId: familyId,
      familyCode: family?.Code || "",
      typeId: "",
      typeCode: "",
      aliasId: "",
      aliasCode: "",
      sequential: "",
      newCode: "",
      useExistingArticle: false,
      existingArticleId: null
    };
    
    setSelectedValues(newValues);
    
    // Aggiorna descrizione automaticamente
    if (!isEditingDescription && !newValues.useExistingArticle) {
      const newDescription = generateDescription();
      newValues.newDescription = newDescription;
      setSelectedValues(prev => ({ ...prev, newDescription }));
      if (onDescriptionChange) {
        onDescriptionChange(newDescription);
      }
    }
    
    onChange(newValues);
    
    // Carica tipi
    if (familyId) {
      const data = await loadTypes(companyId, familyId);
      setTypes(data);
      
      // Se non ci sono tipi, completa il codice con i defaults
      if (data.length === 0) {
        console.log("Nessun tipo disponibile, completo con defaults");
        await completeCodeWithDefaults(newValues);
      }
    }
    
    setIsLoadingData(false);
  };

  // Gestisce selezione tipo
  const handleTypeChange = async (typeId) => {
    setIsLoadingData(true);
    
    console.log("handleTypeChange chiamato con typeId:", typeId);
    const type = types.find(t => String(t.Id) === String(typeId));
    console.log("Tipo selezionato:", type);
    
    // Reset cascade
    setAliases([]);
    
    const newValues = {
      ...selectedValues,
      typeId: typeId,
      typeCode: type?.Code || "",
      aliasId: "",
      aliasCode: "",
      sequential: "",
      newCode: "",
      useExistingArticle: false,
      existingArticleId: null
    };
    
    setSelectedValues(newValues);
    
    // Aggiorna descrizione automaticamente
    if (!isEditingDescription && !newValues.useExistingArticle) {
      const newDescription = generateDescription();
      newValues.newDescription = newDescription;
      setSelectedValues(prev => ({ ...prev, newDescription }));
      if (onDescriptionChange) {
        onDescriptionChange(newDescription);
      }
    }
    
    onChange(newValues);
    
    // Carica alias
    if (typeId) {
      console.log("Carico alias per tipo:", typeId);
      const data = await loadAliases(companyId, typeId);
      setAliases(data);
      console.log("Alias caricati:", data.length);
      
      // Se non ci sono alias, completa il codice con i defaults
      if (data.length === 0) {
        console.log("Nessun alias disponibile, completo con defaults");
        await completeCodeWithDefaults(newValues);
      }
    }
    
    setIsLoadingData(false);
  };

  // Gestisce selezione alias
  const handleAliasChange = async (aliasId) => {
    console.log("handleAliasChange chiamato con aliasId:", aliasId);
    const alias = aliases.find(a => String(a.Id) === String(aliasId));
    console.log("Alias selezionato:", alias);
    
    const newValues = {
      ...selectedValues,
      aliasId: aliasId,
      aliasCode: alias?.Code || (aliasId === "0" ? "000" : ""),  // Default a "000" se aliasId è "0"
      sequential: "",
      newCode: "",
      useExistingArticle: false,
      existingArticleId: null
    };
    
    console.log("Nuovi valori dopo selezione alias:", newValues);
    
    setSelectedValues(newValues);
    
    // Aggiorna descrizione automaticamente
    if (!isEditingDescription && !newValues.useExistingArticle) {
      const newDescription = generateDescription();
      newValues.newDescription = newDescription;
      setSelectedValues(prev => ({ ...prev, newDescription }));
      if (onDescriptionChange) {
        onDescriptionChange(newDescription);
      }
    }
    
    // Calcola sempre il sequenziale quando abbiamo almeno la macrofamiglia
    if (newValues.macroFamilyCode) {
      console.log("Chiamo calculateSequential");
      await calculateSequential(newValues);
    } else {
      console.log("Macrofamiglia mancante, non calcolo sequenziale");
      onChange(newValues);
    }
  };

  // Effetto per gestire quando i dati vengono caricati ma sono vuoti
  useEffect(() => {
    // Se stiamo caricando dati o stiamo già calcolando il sequenziale, non fare nulla
    if (isLoadingData || isLoadingSequential || selectedValues.useExistingArticle) {
      return;
    }
    
    // Se abbiamo una macrofamiglia ma mancano altri livelli e non ci sono opzioni disponibili
    if (selectedValues.macroFamilyCode) {
      // Check se dobbiamo completare con defaults
      let shouldComplete = false;
      
      // Se abbiamo solo macrofamiglia e famiglie è vuoto
      if (!selectedValues.familyCode && families.length === 0 && selectedValues.macroFamilyId) {
        shouldComplete = true;
      }
      // Se abbiamo famiglia ma tipi è vuoto
      else if (selectedValues.familyCode && !selectedValues.typeCode && types.length === 0 && selectedValues.familyId) {
        shouldComplete = true;
      }
      // Se abbiamo tipo ma alias è vuoto
      else if (selectedValues.typeCode && !selectedValues.aliasCode && aliases.length === 0 && selectedValues.typeId) {
        shouldComplete = true;
      }
      
      if (shouldComplete && !selectedValues.newCode) {
        console.log("Completamento automatico con defaults necessario");
        completeCodeWithDefaults(selectedValues);
      }
    }
  }, [families, types, aliases, selectedValues, isLoadingData, isLoadingSequential]);

  // Gestisce cambio misure
  const handleMeasuresChange = (measures) => {
    // Limita a 2 caratteri e converte in maiuscolo
    const formattedMeasures = measures.toUpperCase().substring(0, 2);
    
    const newValues = {
      ...selectedValues,
      measures: formattedMeasures,
      useExistingArticle: false,
      existingArticleId: null
    };
    
    setSelectedValues(newValues);
    
    // Aggiorna descrizione automaticamente
    if (!isEditingDescription && !newValues.useExistingArticle) {
      const newDescription = generateDescription();
      newValues.newDescription = newDescription;
      setSelectedValues(prev => ({ ...prev, newDescription }));
      if (onDescriptionChange) {
        onDescriptionChange(newDescription);
      }
    }
    
    // Rigenera preview sempre quando cambiano le misure
    if (newValues.macroFamilyCode && newValues.sequential) {
      const preview = generateCodePreview(
        newValues.macroFamilyCode,
        newValues.familyCode || "000",
        newValues.typeCode || "000",
        newValues.aliasCode || "000",
        newValues.measures || "",
        newValues.sequential
      );
      
      newValues.newCode = preview;
      newValues.isValid = preview.length === 15;
      validateCodeAsync(preview);
    }
    
    onChange(newValues);
  };

  // Gestisce cambio descrizione manuale
  const handleDescriptionChange = (description) => {
    const newValues = {
      ...selectedValues,
      newDescription: description
    };
    
    setSelectedValues(newValues);
    onChange(newValues);
    
    if (onDescriptionChange) {
      onDescriptionChange(description);
    }
  };

  // Genera descrizione automatica
  const handleGenerateDescription = () => {
    const newDescription = generateDescription();
    const newValues = {
      ...selectedValues,
      newDescription
    };
    
    setSelectedValues(newValues);
    onChange(newValues);
    
    if (onDescriptionChange) {
      onDescriptionChange(newDescription);
    }
    
    setIsEditingDescription(false);
  };

  // Calcola il sequenziale
  const calculateSequential = async (values) => {
    console.log("calculateSequential chiamato con:", values);
    
    // Se è un articolo esistente, non calcolare il sequenziale
    if (values.useExistingArticle) {
      console.log("Articolo esistente, skip calcolo sequenziale");
      return;
    }
    
    setIsLoadingSequential(true);
    
    try {
      // Usa i valori completati con defaults
      const macroCode = values.macroFamilyCode || "0";
      const famCode = values.familyCode || "000";
      const tipCode = values.typeCode || "000";
      const aliCode = values.aliasCode || "000";
      
      const sequential = await getNextSequential(
        companyId,
        macroCode,
        famCode,
        tipCode,
        aliCode
      );
      
      console.log("Sequenziale ricevuto:", sequential);
      
      const newValues = {
        ...values,
        sequential: sequential
      };
      
      // Genera preview codice (misure opzionali, default a "00")
      const preview = generateCodePreview(
        newValues.macroFamilyCode,
        newValues.familyCode || "000",
        newValues.typeCode || "000",
        newValues.aliasCode || "000",
        newValues.measures || "",
        sequential
      );
      
      console.log("Preview generata:", preview, "Lunghezza:", preview.length);
      
      newValues.newCode = preview;
      newValues.isValid = preview.length === 15;
      newValues.validationMessage = preview.length !== 15 ? 
        `Il codice deve essere di 15 caratteri (attuale: ${preview.length})` : "";
      
      setSelectedValues(newValues);
      onChange(newValues);
      
      // Valida il codice
      if (preview.length === 15) {
        validateCodeAsync(preview);
      }
      
    } catch (error) {
      console.error("Errore nel calcolo del sequenziale:", error);
      // Mostra l'errore all'utente
      const newValues = {
        ...values,
        validationMessage: "Errore nel calcolo del sequenziale"
      };
      setSelectedValues(newValues);
      onChange(newValues);
    } finally {
      setIsLoadingSequential(false);
    }
  };

  // Valida il codice in modo asincrono
  const validateCodeAsync = useCallback(async (code) => {
    if (!code || code.length !== 15) {
      setValidation({
        isValid: false,
        message: "Il codice deve essere di 15 caratteri"
      });
      return;
    }
    
    const result = await validateCode(companyId, code);
    setValidation(result);
  }, [companyId, validateCode]);

  // Gestisce la selezione di un articolo esistente dai suggerimenti
  const handleSelectExistingArticle = (article) => {
    console.log("Articolo esistente selezionato:", article);
    
    // Estrai le componenti dal codice esistente (se possibile)
    let extractedData = {};
    if (article.Item && article.Item.length === 15) {
      extractedData = {
        macroFamilyCode: article.Item.substring(0, 1),
        familyCode: article.Item.substring(1, 4),
        typeCode: article.Item.substring(4, 7),
        aliasCode: article.Item.substring(7, 10),
        measures: article.Item.substring(10, 12),
        sequential: article.Item.substring(12, 15)
      };
    }
    
    const newValues = {
      ...selectedValues,
      // Mantieni i dati dell'articolo selezionato
      categoryId: article.CategoryId || selectedValues.categoryId,
      macroFamilyId: article.MacrofamilyId || selectedValues.macroFamilyId,
      familyId: article.FamilyId || selectedValues.familyId,
      typeId: article.ItemTypeId || selectedValues.typeId,
      aliasId: article.AliasId || selectedValues.aliasId,
      ...extractedData,
      newCode: article.Item,
      newDescription: article.Description,
      isValid: true,
      // Flag per indicare che è stato selezionato un articolo esistente
      useExistingArticle: true,
      existingArticleId: article.Id,
      existingArticleCode: article.Item // Aggiungiamo anche il codice per sicurezza
    };
    
    setSelectedValues(newValues);
    onChange(newValues);
    
    if (onDescriptionChange) {
      onDescriptionChange(article.Description);
    }
    
    // Disabilita l'editing della descrizione quando si usa un articolo esistente
    setIsEditingDescription(false);
  };

  // Render del badge stato per l'articolo root
  const renderRootBadge = () => {
    if (!isRoot) return null;
    
    return (
      <Badge variant="secondary" className="mb-2">
        Articolo Principale
      </Badge>
    );
  };

  // Calcola la radice del codice per i suggerimenti
  const currentRootCode = generateCodePreview(
    selectedValues.macroFamilyCode,
    selectedValues.familyCode || "000",
    selectedValues.typeCode || "000",
    selectedValues.aliasCode || "000",
    "",
    ""
  ).substring(0, 10).trim();

  return (
    <div className={`space-y-4 ${className}`}>
      {renderRootBadge()}
      
      {/* Suggerimenti articoli simili - Mostra solo se non è già stato selezionato un articolo esistente */}
      {!selectedValues.useExistingArticle && (
        <ArticleSuggestions
          companyId={companyId}
          rootCode={currentRootCode}
          description={selectedValues.newDescription}
          currentItemId={componentId}
          onSelectArticle={handleSelectExistingArticle}
        />
      )}
      
      {/* Mostra avviso se è stato selezionato un articolo esistente */}
      {selectedValues.useExistingArticle && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">
                Utilizzo articolo esistente: {selectedValues.newCode}
              </span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                // Reset selezione articolo esistente
                const newValues = {
                  ...selectedValues,
                  useExistingArticle: false,
                  existingArticleId: null,
                  existingArticleCode: null,
                  newCode: "",
                  sequential: ""
                };
                setSelectedValues(newValues);
                onChange(newValues);
              }}
            >
              Cambia
            </Button>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-5 gap-3">
        {/* Categoria */}
        <div>
          <Label className="text-xs">Categoria</Label>
          <Select
            value={selectedValues.categoryId}
            onValueChange={handleCategoryChange}
            disabled={disabled || loading || selectedValues.useExistingArticle}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Seleziona..." />
            </SelectTrigger>
            <SelectContent>
              {categories.map(cat => (
                <SelectItem key={cat.Id} value={String(cat.Id)}>
                  {cat.Code} - {cat.Description}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Macrofamiglia */}
        <div>
          <Label className="text-xs">Macrofamiglia</Label>
          <Select
            value={selectedValues.macroFamilyId}
            onValueChange={handleMacroFamilyChange}
            disabled={disabled || loading || !selectedValues.categoryId || selectedValues.useExistingArticle}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Seleziona..." />
            </SelectTrigger>
            <SelectContent>
              {macroFamilies.map(mf => (
                <SelectItem key={mf.Id} value={String(mf.Id)}>
                  {mf.Code} - {mf.Description}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Famiglia */}
        <div>
          <Label className="text-xs">Famiglia</Label>
          <Select
            value={selectedValues.familyId}
            onValueChange={handleFamilyChange}
            disabled={disabled || loading || !selectedValues.macroFamilyId || selectedValues.useExistingArticle}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder={families.length === 0 && selectedValues.macroFamilyId ? "000 - Default" : "Seleziona..."} />
            </SelectTrigger>
            <SelectContent>
              {families.length > 0 ? (
                families.map(fam => (
                  <SelectItem key={fam.Id} value={String(fam.Id)}>
                    {fam.Code} - {fam.Description}
                  </SelectItem>
                ))
              ) : selectedValues.macroFamilyId ? (
                <SelectItem value="0" disabled>
                  000 - Nessuna famiglia disponibile
                </SelectItem>
              ) : null}
            </SelectContent>
          </Select>
        </div>

        {/* Tipo */}
        <div>
          <Label className="text-xs">Tipo</Label>
          <Select
            value={selectedValues.typeId}
            onValueChange={handleTypeChange}
            disabled={disabled || loading || (!selectedValues.familyId && families.length > 0) || selectedValues.useExistingArticle}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder={types.length === 0 && (selectedValues.familyId || families.length === 0) ? "000 - Default" : "Seleziona..."} />
            </SelectTrigger>
            <SelectContent>
              {types.length > 0 ? (
                types.map(type => (
                  <SelectItem key={type.Id} value={String(type.Id)}>
                    {type.Code} - {type.Description}
                  </SelectItem>
                ))
              ) : (selectedValues.familyId || families.length === 0) ? (
                <SelectItem value="0" disabled>
                  000 - Nessun tipo disponibile
                </SelectItem>
              ) : null}
            </SelectContent>
          </Select>
        </div>

        {/* Alias */}
        <div>
          <Label className="text-xs">Alias</Label>
          <Select
            value={selectedValues.aliasId}
            onValueChange={handleAliasChange}
            disabled={disabled || loading || (!selectedValues.typeId && types.length > 0) || selectedValues.useExistingArticle}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder={aliases.length === 0 && (selectedValues.typeId || types.length === 0) ? "000 - Default" : "Seleziona..."} />
            </SelectTrigger>
            <SelectContent>
              {aliases.length > 0 ? (
                aliases.map(alias => (
                  <SelectItem key={alias.Id} value={String(alias.Id)}>
                    {alias.Code} - {alias.Description}
                  </SelectItem>
                ))
              ) : (selectedValues.typeId || types.length === 0) ? (
                <SelectItem value="0" disabled>
                  000 - Nessun alias disponibile
                </SelectItem>
              ) : null}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Misure e Sequenziale */}
      <div className="grid grid-cols-6 gap-3 items-end">
        <div>
          <Label className="text-xs">Misure</Label>
          <Input
            value={selectedValues.measures}
            onChange={(e) => handleMeasuresChange(e.target.value)}
            placeholder="XX"
            maxLength={2}
            className="h-9 text-center font-mono"
            disabled={disabled || !selectedValues.macroFamilyCode || selectedValues.useExistingArticle}
          />
        </div>

        <div>
          <Label className="text-xs">Sequenziale</Label>
          <div className="relative">
            <Input
              value={selectedValues.sequential}
              readOnly
              className="h-9 text-center font-mono bg-gray-50"
              placeholder="000"
            />
            {isLoadingSequential && (
              <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin" />
            )}
          </div>
        </div>

        {/* Preview codice */}
        <div className="col-span-3">
          <Label className="text-xs">Nuovo Codice</Label>
          <div className="relative">
            <Input
              value={selectedValues.newCode}
              readOnly
              className={`h-9 font-mono font-semibold ${
                validation.isValid ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
              }`}
              placeholder="Codice generato..."
            />
            {!validation.isValid && validation.message && (
              <AlertCircle className="absolute right-2 top-2.5 h-4 w-4 text-red-500" />
            )}
          </div>
        </div>

        {/* Codice attuale per confronto */}
        <div>
          <Label className="text-xs text-gray-500">Codice Attuale</Label>
          <Input
            value={currentCode}
            readOnly
            className="h-9 font-mono text-gray-500 bg-gray-50"
          />
        </div>
      </div>

      {/* Nuova Descrizione */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Nuova Descrizione</Label>
          <div className="flex gap-1">
            {!selectedValues.useExistingArticle && (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleGenerateDescription}
                  className="h-7 px-2"
                  title="Genera descrizione automatica"
                >
                  <Wand2 className="h-3 w-3 mr-1" />
                  Genera
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditingDescription(!isEditingDescription)}
                  className="h-7 px-2"
                  title="Modifica manualmente"
                >
                  <Edit2 className="h-3 w-3" />
                </Button>
              </>
            )}
          </div>
        </div>
        <Input
          value={selectedValues.newDescription}
          onChange={(e) => {
            setIsEditingDescription(true);
            handleDescriptionChange(e.target.value);
          }}
          placeholder="Descrizione articolo..."
          className="h-9"
          disabled={disabled || selectedValues.useExistingArticle}
        />
        <div className="text-xs text-gray-500">
          Descrizione attuale: {currentDescription}
        </div>
      </div>

      {/* Messaggio di validazione */}
      {!validation.isValid && validation.message && !selectedValues.useExistingArticle && (
        <div className="flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" />
          <span>{validation.message}</span>
        </div>
      )}
    </div>
  );
};

export default CodingHierarchySelector;