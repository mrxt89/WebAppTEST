// src/pages/progetti/progetti/articoli/BOMViewer/components/codingRules/CodingHierarchySelector.jsx

import React, { useState, useEffect, useCallback, useRef } from "react";
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
import { Loader2, AlertCircle, Edit2, Wand2, CheckCircle, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import useRecodingRules from "@/hooks/useRecodingRules";
import ArticleSuggestions from "./ArticleSuggestions";
import CreateElementDialog from "./CreateElementDialog";
import TechnicalCharacteristicsSelector from "./TechnicalCharacteristicsSelector";
import { config } from "@/config";

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
   validateCode,
   resetHierarchyCache
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

 // Stato per i dati tecnici (Diameter, Bxh, Depth, Length, MediumRadius, Thickness)
 const [technicalData, setTechnicalData] = useState({
   Diameter: value.Diameter || null,
   Bxh: value.Bxh || null,
   Depth: value.Depth || null,
   Length: value.Length || null,
   MediumRadius: value.MediumRadius || null,
   Thickness: value.Thickness || null,
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
 
 // Stati per il dialog di creazione
 const [createDialogOpen, setCreateDialogOpen] = useState(false);
 const [createDialogType, setCreateDialogType] = useState("");
 const [createDialogParent, setCreateDialogParent] = useState(null);

 // Stato per memorizzare il codice suggerito
 const [suggestedCode, setSuggestedCode] = useState("");

 // Aggiorna suggestedCode ogni volta che viene generato un nuovo codice automatico
 useEffect(() => {
   if (selectedValues.newCode && selectedValues.newCode.length === 15) {
     setSuggestedCode(selectedValues.newCode);
   }
 }, [selectedValues.newCode]);

 // Carica categorie al mount
 useEffect(() => {
   if (companyId && !disabled) {
     loadInitialCategories();
   }
 }, [companyId, disabled]);

 // Genera descrizione automatica - FUNZIONE MIGLIORATA
 const generateDescription = useCallback((values = selectedValues) => {
   const parts = [];
   
   // NON aggiungere la categoria alla descrizione (Semilavorato, materia prima, prodotto finito)
   
   if (values.macroFamilyCode) {
     const macroFamily = macroFamilies.find(m => String(m.Id) === String(values.macroFamilyId));
     if (macroFamily) parts.push(macroFamily.Description);
   }
   
   if (values.familyCode && values.familyCode !== "000") {
     const family = families.find(f => String(f.Id) === String(values.familyId));
     if (family) parts.push(family.Description);
   }
   
   if (values.typeCode && values.typeCode !== "000") {
     const type = types.find(t => String(t.Id) === String(values.typeId));
     if (type) parts.push(type.Description);
   }
   
   if (values.aliasCode && values.aliasCode !== "000") {
     const alias = aliases.find(a => String(a.Id) === String(values.aliasId));
     if (alias) parts.push(alias.Description);
   }
   
   // Aggiungi misure se presenti
   if (values.measures && values.measures !== "00" && values.measures.trim() !== "") {
     parts.push(`M.${values.measures}`);
   }
   
   return parts.filter(p => p).join(" - ");
 }, [macroFamilies, families, types, aliases]);

 // Funzione per generare descrizione normalizzata con caratteristiche tecniche
 const generateNormalizedDescription = useCallback(async (baseDescription, techData, hierarchyData) => {
   try {
     const response = await fetch(`${config.API_BASE_URL}/codingRules/description/generate`, {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
         Authorization: `Bearer ${localStorage.getItem("token")}`,
       },
       body: JSON.stringify({
         baseDescription,
         technicalData: techData,
         hierarchyData: {
           MacroFamilyId: hierarchyData.macroFamilyId || null,
           FamilyId: hierarchyData.familyId || null,
           TypeId: hierarchyData.typeId || null,
         },
       }),
     });

    const data = await response.json();
    console.log('generateNormalizedDescription response:', data);
    if (data.success && data.data?.normalizedDescription) {
      const normalizedDesc = data.data.normalizedDescription;
      console.log('Returning normalized description:', normalizedDesc);
      return normalizedDesc;
    }
    console.log('No normalized description, returning base:', baseDescription);
    return baseDescription;
   } catch (error) {
     console.error('Errore nella generazione descrizione normalizzata:', error);
     return baseDescription;
   }
 }, []);

 // Funzione helper per aggiornare descrizione e stato
 const updateDescriptionAndState = useCallback(async (newValues, skipDescriptionUpdate = false, techDataOverride = null) => {
   const techDataToUse = techDataOverride !== null ? techDataOverride : technicalData;
   
   if (!skipDescriptionUpdate && !isEditingDescription && !newValues.useExistingArticle) {
     // Genera descrizione base dalla gerarchia
     const baseDescription = generateDescription(newValues);
     
     // Se abbiamo dati tecnici e almeno una parte della gerarchia, genera descrizione normalizzata
     const hasTechnicalData = Object.values(techDataToUse).some(v => v !== null && v !== '' && v !== undefined);
     const hasHierarchy = newValues.macroFamilyId || newValues.familyId || newValues.typeId;
     
     let finalDescription = baseDescription;
     
    if (hasTechnicalData && hasHierarchy) {
      console.log('Generating normalized description with:', { baseDescription, techDataToUse, hierarchyData: {
        macroFamilyId: newValues.macroFamilyId,
        familyId: newValues.familyId,
        typeId: newValues.typeId,
      }});
      finalDescription = await generateNormalizedDescription(
        baseDescription,
        techDataToUse,
        {
          macroFamilyId: newValues.macroFamilyId,
          familyId: newValues.familyId,
          typeId: newValues.typeId,
        }
      );
      console.log('Generated description:', finalDescription);
    }
    
    const updatedValues = { ...newValues, newDescription: finalDescription };
    console.log('Updating selectedValues with newDescription:', finalDescription);
    setSelectedValues(updatedValues);
    // Passa sia i valori aggiornati che i dati tecnici completi
    onChange({ ...updatedValues, ...techDataToUse });
    if (onDescriptionChange) {
      onDescriptionChange(finalDescription);
    }
   } else {
     setSelectedValues(newValues);
     onChange({ ...newValues, ...techDataToUse });
   }
 }, [generateDescription, isEditingDescription, onChange, onDescriptionChange, technicalData, generateNormalizedDescription]);

// Aggiorna stato quando cambiano le props e carica le liste corrispondenti
useEffect(() => {
  if (value && Object.keys(value).length > 0) {
    // Aggiorna selectedValues ma preserva newDescription se è stata generata automaticamente
    setSelectedValues(prev => {
      // Se abbiamo una newDescription in prev e non in value, preservala
      const updated = {
        ...prev,
        ...value
      };
      // Se prev ha una descrizione generata e value non la ha, preserva quella di prev
      if (prev.newDescription && !value.newDescription && prev.newDescription !== prev.newDescription) {
        // Mantieni la descrizione di prev solo se è diversa dalla base
        // (significa che è stata generata)
      }
      return updated;
    });
    
    // Inizializza i dati tecnici se presenti nel value (include Thickness)
    if (value.Diameter !== undefined || value.Bxh !== undefined || value.Depth !== undefined || 
        value.Length !== undefined || value.MediumRadius !== undefined || value.Thickness !== undefined) {
      setTechnicalData({
        Diameter: value.Diameter || null,
        Bxh: value.Bxh || null,
        Depth: value.Depth || null,
        Length: value.Length || null,
        MediumRadius: value.MediumRadius || null,
        Thickness: value.Thickness || null,
      });
    }
    
    // Carica le liste in base ai valori inizializzati
    const loadInitialData = async () => {
      setIsLoadingData(true);
      
      try {
        // Se abbiamo categoryId, carica le macroFamilies
        if (value.categoryId) {
          const macroFamiliesData = await loadMacroFamilies(companyId, value.categoryId);
          setMacroFamilies(macroFamiliesData);
          
          // Se abbiamo anche macroFamilyId, carica le families
          if (value.macroFamilyId) {
            const familiesData = await loadFamilies(companyId, value.macroFamilyId);
            setFamilies(familiesData);
            
            // Se abbiamo anche familyId, carica i types
            if (value.familyId) {
              const typesData = await loadTypes(companyId, value.familyId);
              setTypes(typesData);
              
              // Se abbiamo anche typeId, carica gli aliases
              if (value.typeId) {
                const aliasesData = await loadAliases(companyId, value.typeId);
                setAliases(aliasesData);
              }
            }
          }
        }
      } catch (error) {
        console.error("Errore nel caricamento dati iniziali:", error);
      } finally {
        setIsLoadingData(false);
      }
    };
    
    loadInitialData();
  }
}, [value, companyId, loadMacroFamilies, loadFamilies, loadTypes, loadAliases]);

 // Carica categorie iniziali
 const loadInitialCategories = async () => {
   const data = await loadCategories(companyId);
   setCategories(data);
 };

 // Funzione per completare il codice con defaults
 const completeCodeWithDefaults = useCallback(async (values, skipSequential = false) => {
   console.log("completeCodeWithDefaults chiamato con:", values, "skipSequential:", skipSequential);
   
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
   
   // Genera la descrizione con i valori completati
   if (!isEditingDescription && !completedValues.useExistingArticle) {
     completedValues.newDescription = generateDescription(completedValues);
   }
   
   console.log("Valori completati con defaults:", completedValues);
   
   // Aggiorna lo stato con i valori completati inclusa la descrizione
   updateDescriptionAndState(completedValues, true); // true per skip la rigenerazione della descrizione
   
   // Calcola il sequenziale solo se non è skipSequential
   if (!skipSequential) {
     await calculateSequential(completedValues);
   }
   
   return completedValues;
 }, [generateDescription, isEditingDescription, updateDescriptionAndState]);

 // Handler per aprire il dialog di creazione
 const handleOpenCreateDialog = (type, parent) => {
   setCreateDialogType(type);
   setCreateDialogParent(parent);
   setCreateDialogOpen(true);
 };
 
 // Handler per quando un nuovo elemento viene creato
 const handleElementCreated = async (newElement) => {
   console.log("Nuovo elemento creato:", newElement);
   
   // In base al tipo, aggiorna la lista appropriata e ricarica i dati
   switch (createDialogType) {
     case "macroFamily":
       // Ricarica le macrofamiglie per questa categoria
       const newMacroFamilies = await loadMacroFamilies(companyId, selectedValues.categoryId);
       setMacroFamilies(newMacroFamilies);
       // Seleziona automaticamente il nuovo elemento
       handleMacroFamilyChange(newElement.Id);
       break;
       
     case "family":
       // Ricarica le famiglie per questa macrofamiglia
       const newFamilies = await loadFamilies(companyId, selectedValues.macroFamilyId);
       setFamilies(newFamilies);
       handleFamilyChange(newElement.Id);
       break;
       
     case "type":
       // Ricarica i tipi per questa famiglia
       const newTypes = await loadTypes(companyId, selectedValues.familyId || "0");
       setTypes(newTypes);
       handleTypeChange(newElement.Id);
       break;
       
     case "alias":
       // Ricarica gli alias per questo tipo
       const newAliases = await loadAliases(companyId, selectedValues.typeId || "0");
       setAliases(newAliases);
       handleAliasChange(newElement.Id);
       break;
   }
   
   // Chiudi il dialog
   setCreateDialogOpen(false);
 };

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
     setIsEditingDescription(false);
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
     newDescription: "",
     useExistingArticle: false,
     existingArticleId: null
   };
   
   setSelectedValues(newValues);
   setIsEditingDescription(false);
   onChange(newValues);
   
   if (onDescriptionChange) {
     onDescriptionChange("");
   }
   
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
     // NON resettare la descrizione qui
     useExistingArticle: false,
     existingArticleId: null
   };
   
   // Aggiorna descrizione automaticamente
   updateDescriptionAndState(newValues);
   
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
     // NON resettare la descrizione qui
     useExistingArticle: false,
     existingArticleId: null
   };
   
   // Aggiorna descrizione automaticamente
   updateDescriptionAndState(newValues);
   
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
     // NON resettare la descrizione qui
     useExistingArticle: false,
     existingArticleId: null
   };
   
   // Aggiorna descrizione automaticamente
   updateDescriptionAndState(newValues);
   
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
     aliasCode: alias?.Code || (aliasId === "0" ? "000" : ""),
     sequential: "",
     newCode: "",
     // NON resettare la descrizione qui - mantieni quella esistente
     useExistingArticle: false,
     existingArticleId: null
   };
   
   console.log("Nuovi valori dopo selezione alias:", newValues);
   
   // Aggiorna descrizione automaticamente
   updateDescriptionAndState(newValues);
   
   // Calcola sempre il sequenziale quando abbiamo almeno la macrofamiglia
   if (newValues.macroFamilyCode) {
     console.log("Chiamo calculateSequential");
     // IMPORTANTE: Rigenera la descrizione con i nuovi valori completi prima di passarla
     const descriptionForSequential = !isEditingDescription && !newValues.useExistingArticle 
       ? generateDescription(newValues) 
       : newValues.newDescription || selectedValues.newDescription;
     
     const valuesWithDescription = {
       ...newValues,
       newDescription: descriptionForSequential
     };
     
     await calculateSequential(valuesWithDescription);
   } else {
     console.log("Macrofamiglia mancante, non calcolo sequenziale");
   }
 };

 // Effetto per gestire quando i dati vengono caricati ma sono vuoti
 useEffect(() => {
   // Se stiamo caricando dati o stiamo già calcolando il sequenziale, non fare nulla
   if (isLoadingData || isLoadingSequential || selectedValues.useExistingArticle) {
     return;
   }
   
   // Se abbiamo una macrofamiglia ma mancano altri livelli
   if (selectedValues.macroFamilyCode) {
     // Check se dobbiamo completare con defaults
     let shouldComplete = false;
     
     // Se abbiamo compilato fino a un certo livello e non ci sono opzioni disponibili sotto
     // O se l'utente ha esplicitamente selezionato di usare i default (value = "0")
     if (!selectedValues.familyCode && families.length === 0 && selectedValues.macroFamilyId) {
       shouldComplete = true;
     }
     else if (selectedValues.familyCode && !selectedValues.typeCode && types.length === 0 && selectedValues.familyId) {
       shouldComplete = true;
     }
     else if (selectedValues.typeCode && !selectedValues.aliasCode && aliases.length === 0 && selectedValues.typeId) {
       shouldComplete = true;
     }
     // Nuovo: se abbiamo compilato parzialmente (es. fino a tipo) e vogliamo salvare
     else if (selectedValues.typeCode && !selectedValues.aliasCode && selectedValues.typeId && aliases.length > 0) {
       // Permetti completamento con default alias se l'utente lo desidera
       // Questo verrà triggerato manualmente tramite un pulsante o automaticamente dopo un timeout
       const hasPartialCompletion = selectedValues.macroFamilyCode && 
                                  (selectedValues.familyCode || families.length === 0) &&
                                  (selectedValues.typeCode || types.length === 0);
       
       if (hasPartialCompletion) {
         // Completa automaticamente con 000 per i livelli mancanti
         console.log("Completamento parziale rilevato, applico defaults per i livelli mancanti");
         completeCodeWithDefaults(selectedValues, false);
       }
     }
     
     if (shouldComplete && !selectedValues.newCode) {
       console.log("Completamento automatico con defaults necessario");
       completeCodeWithDefaults(selectedValues);
     }
   }
 }, [families, types, aliases, selectedValues, isLoadingData, isLoadingSequential, completeCodeWithDefaults]);

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
   
   // Aggiorna descrizione automaticamente includendo le misure
   updateDescriptionAndState(newValues);
   
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
 };

 // Gestisce cambio descrizione manuale
 const handleDescriptionChange = (description) => {
   const newValues = {
     ...selectedValues,
     newDescription: description
   };
   
   setSelectedValues(newValues);
   onChange({ ...newValues, ...technicalData });
   
   if (onDescriptionChange) {
     onDescriptionChange(description);
   }
 };

// Gestisce cambio dati tecnici
const handleTechnicalDataChange = useCallback(async (newTechnicalData) => {
  console.log('handleTechnicalDataChange called with:', newTechnicalData);
  
  // Assicurati che tutti i campi siano presenti (incluso Thickness)
  // Mantieni i valori stringa come stringhe, non convertirli in null se sono stringhe non vuote
  const completeTechnicalData = {
    Diameter: newTechnicalData.Diameter !== undefined && newTechnicalData.Diameter !== '' ? newTechnicalData.Diameter : null,
    Bxh: newTechnicalData.Bxh !== undefined && newTechnicalData.Bxh !== '' ? newTechnicalData.Bxh : null,
    Depth: newTechnicalData.Depth !== undefined && newTechnicalData.Depth !== '' ? newTechnicalData.Depth : null,
    Length: newTechnicalData.Length !== undefined && newTechnicalData.Length !== '' ? newTechnicalData.Length : null,
    MediumRadius: newTechnicalData.MediumRadius !== undefined && newTechnicalData.MediumRadius !== '' ? newTechnicalData.MediumRadius : null,
    Thickness: newTechnicalData.Thickness !== undefined && newTechnicalData.Thickness !== '' ? newTechnicalData.Thickness : null,
  };
  
  console.log('Complete technical data:', completeTechnicalData);
  
  // Aggiorna i ref PRIMA di aggiornare lo stato per evitare che il useEffect si attivi
  prevTechnicalDataRef.current = { ...completeTechnicalData };
  setTechnicalData(completeTechnicalData);
  
  // Rigenera la descrizione con i nuovi dati tecnici
  if (!isEditingDescription && !selectedValues.useExistingArticle) {
    console.log('handleTechnicalDataChange: calling updateDescriptionAndState');
    // Imposta flag per evitare che useEffect si attivi
    isUpdatingFromHandler.current = true;
    // Aggiorna i ref PRIMA di chiamare updateDescriptionAndState per evitare che il useEffect si attivi
    prevTechnicalDataRef.current = { ...completeTechnicalData };
    await updateDescriptionAndState(selectedValues, false, completeTechnicalData);
    // Reset flag dopo un breve delay per permettere a setTechnicalData di completare
    setTimeout(() => {
      isUpdatingFromHandler.current = false;
    }, 100);
  } else {
    // Aggiorna solo i dati tecnici senza rigenerare la descrizione
    prevTechnicalDataRef.current = { ...completeTechnicalData };
    onChange({ ...selectedValues, ...completeTechnicalData });
  }
}, [selectedValues, isEditingDescription, updateDescriptionAndState, onChange]);

 // Genera descrizione automatica (forza aggiornamento)
 const handleGenerateDescription = async () => {
   setIsEditingDescription(false); // Reset flag modifica manuale
   await updateDescriptionAndState(selectedValues, false, technicalData);
 };

 // Ref per tracciare i valori precedenti e evitare loop infiniti
 const prevHierarchyRef = useRef({ macroFamilyId: null, familyId: null, typeId: null });
 const prevTechnicalDataRef = useRef({});
 const isInitialMount = useRef(true);
 const isUpdatingFromHandler = useRef(false); // Flag per evitare che useEffect si attivi durante handleTechnicalDataChange

 // Aggiorna descrizione quando cambia la gerarchia o i dati tecnici
 useEffect(() => {
   // Skip al primo mount (i dati vengono già inizializzati)
   if (isInitialMount.current) {
     isInitialMount.current = false;
     prevHierarchyRef.current = {
       macroFamilyId: selectedValues.macroFamilyId,
       familyId: selectedValues.familyId,
       typeId: selectedValues.typeId
     };
     prevTechnicalDataRef.current = { ...technicalData };
     return;
   }

   // Verifica se la gerarchia è cambiata
   const hierarchyChanged = 
     prevHierarchyRef.current.macroFamilyId !== selectedValues.macroFamilyId ||
     prevHierarchyRef.current.familyId !== selectedValues.familyId ||
     prevHierarchyRef.current.typeId !== selectedValues.typeId;

  // Verifica se i dati tecnici sono cambiati
  const technicalDataChanged = JSON.stringify(prevTechnicalDataRef.current) !== JSON.stringify(technicalData);
  
  console.log('useEffect check:', {
    hierarchyChanged,
    technicalDataChanged,
    prevTechnicalData: prevTechnicalDataRef.current,
    currentTechnicalData: technicalData,
    isEditingDescription,
    useExistingArticle: selectedValues.useExistingArticle
  });

  // Aggiorna solo se qualcosa è cambiato e non stiamo modificando manualmente
  // IMPORTANTE: Non aggiornare se handleTechnicalDataChange ha appena aggiornato i dati
  // (per evitare chiamate duplicate)
  if ((hierarchyChanged || technicalDataChanged) && !isEditingDescription && !selectedValues.useExistingArticle && selectedValues.macroFamilyId && !isUpdatingFromHandler.current) {
    const hasTechnicalData = Object.values(technicalData).some(v => v !== null && v !== '' && v !== undefined);
    const hasHierarchy = selectedValues.macroFamilyId || selectedValues.familyId || selectedValues.typeId;
    
    if (hasHierarchy) {
      console.log('useEffect calling updateDescriptionAndState with:', technicalData);
      updateDescriptionAndState(selectedValues, false, technicalData);
    }
  }

  // Aggiorna i ref dopo il controllo (ma solo se non è il mount iniziale)
  if (!isInitialMount.current) {
    prevHierarchyRef.current = {
      macroFamilyId: selectedValues.macroFamilyId,
      familyId: selectedValues.familyId,
      typeId: selectedValues.typeId
    };
    prevTechnicalDataRef.current = { ...technicalData };
  }
}, [selectedValues.macroFamilyId, selectedValues.familyId, selectedValues.typeId, technicalData, isEditingDescription, selectedValues.useExistingArticle, updateDescriptionAndState]);

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
     
     // Se non abbiamo almeno la macrofamiglia, non possiamo calcolare il sequenziale
     if (!macroCode || macroCode === "0") {
       console.log("Macrofamiglia mancante, impossibile calcolare il sequenziale");
       return;
     }
     
     const sequential = await getNextSequential(
       companyId,
       macroCode,
       famCode,
       tipCode,
       aliCode
     );
     
     console.log("Sequenziale ricevuto:", sequential);
     
     // Preserva la descrizione esistente
     const currentDescription = selectedValues.newDescription || values.newDescription || generateDescription(values);
     
     const newValues = {
       ...values,
       sequential: sequential,
       newDescription: currentDescription // Mantieni la descrizione
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

 // Funzione per forzare il refresh di tutte le gerarchie
 const handleRefreshHierarchy = async () => {
   if (loading) return;
   setIsLoadingData(true);
   // Reset cache hook
   if (typeof resetHierarchyCache === 'function') resetHierarchyCache();
   // Ricarica categorie
   const cats = await loadCategories(companyId, true);
   setCategories(cats);
   // Ricarica macrofamiglie se selezionata categoria
   if (selectedValues.categoryId) {
     const macros = await loadMacroFamilies(companyId, selectedValues.categoryId, true);
     setMacroFamilies(macros);
   }
   // Ricarica famiglie se selezionata macrofamiglia
   if (selectedValues.macroFamilyId) {
     const fams = await loadFamilies(companyId, selectedValues.macroFamilyId, true);
     setFamilies(fams);
   }
   // Ricarica tipi se selezionata famiglia
   if (selectedValues.familyId) {
     const tps = await loadTypes(companyId, selectedValues.familyId, true);
     setTypes(tps);
   }
   // Ricarica alias se selezionato tipo
   if (selectedValues.typeId) {
     const als = await loadAliases(companyId, selectedValues.typeId, true);
     setAliases(als);
   }
   setIsLoadingData(false);
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
     <div className="flex items-center justify-between mb-2">
       {renderRootBadge()}
       <Button
         size="sm"
         variant="outline"
         onClick={handleRefreshHierarchy}
         disabled={isLoadingData || loading}
         className="gap-1"
         title="Aggiorna gerarchia dal database"
       >
         <RefreshCw className={isLoadingData ? "animate-spin" : ""} size={16} />
         Aggiorna gerarchia
       </Button>
     </div>
     
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
         <div className="flex items-center justify-between mb-1">
           <Label className="text-xs">Macrofamiglia</Label>
           {selectedValues.categoryId && !selectedValues.useExistingArticle && (
             <Button
               size="icon"
               variant="ghost"
               className="h-5 w-5"
               onClick={() => handleOpenCreateDialog("macroFamily", {
                 id: selectedValues.categoryId,
                 code: selectedValues.categoryCode,
                 description: categories.find(c => String(c.Id) === String(selectedValues.categoryId))?.Description
               })}
               title="Crea nuova macrofamiglia"
             >
               <Plus className="h-3 w-3" />
             </Button>
           )}
         </div>
         <Select
           value={selectedValues.macroFamilyId}
           onValueChange={handleMacroFamilyChange}
           disabled={disabled || loading || !selectedValues.categoryId || selectedValues.useExistingArticle}
         >
           <SelectTrigger className="h-9">
             <SelectValue placeholder="Seleziona..." />
           </SelectTrigger>
           <SelectContent>
             {macroFamilies.map(mf => {
               const isUniversal = mf.IsUniversal === true || mf.IsUniversal === 1;
               return (
                 <SelectItem key={mf.Id} value={String(mf.Id)}>
                   <div className="flex items-center gap-2">
                     <span>{mf.Code} - {mf.Description}</span>
                     {isUniversal && (
                       <Badge variant="outline" className="text-xs">Universale</Badge>
                     )}
                   </div>
                 </SelectItem>
               );
             })}
           </SelectContent>
         </Select>
       </div>

       {/* Famiglia */}
       <div>
         <div className="flex items-center justify-between mb-1">
           <Label className="text-xs">Famiglia</Label>
           {selectedValues.macroFamilyId && !selectedValues.useExistingArticle && (
             <Button
               size="icon"
               variant="ghost"
               className="h-5 w-5"
               onClick={() => handleOpenCreateDialog("family", {
                 id: selectedValues.macroFamilyId,
                 code: selectedValues.macroFamilyCode,
                 description: macroFamilies.find(m => String(m.Id) === String(selectedValues.macroFamilyId))?.Description
               })}
               title="Crea nuova famiglia"
             >
               <Plus className="h-3 w-3" />
             </Button>
           )}
         </div>
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
               families.map(fam => {
                 const isUniversal = fam.IsUniversal === true || fam.IsUniversal === 1;
                 return (
                   <SelectItem key={fam.Id} value={String(fam.Id)}>
                     <div className="flex items-center gap-2">
                       <span>{fam.Code} - {fam.Description}</span>
                       {isUniversal && (
                         <Badge variant="outline" className="text-xs">Universale</Badge>
                       )}
                     </div>
                   </SelectItem>
                 );
               })
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
         <div className="flex items-center justify-between mb-1">
           <Label className="text-xs">Tipo</Label>
           {(selectedValues.familyId || (selectedValues.macroFamilyId && families.length === 0)) && !selectedValues.useExistingArticle && (
             <Button
               size="icon"
               variant="ghost"
               className="h-5 w-5"
               onClick={() => handleOpenCreateDialog("type", {
                 id: selectedValues.familyId || "0",
                 code: selectedValues.familyCode || "000",
                 description: families.find(f => String(f.Id) === String(selectedValues.familyId))?.Description || "Default"
               })}
               title="Crea nuovo tipo"
             >
               <Plus className="h-3 w-3" />
             </Button>
           )}
         </div>
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
               types.map(type => {
                 const isUniversal = type.IsUniversal === true || type.IsUniversal === 1;
                 return (
                   <SelectItem key={type.Id} value={String(type.Id)}>
                     <div className="flex items-center gap-2">
                       <span>{type.Code} - {type.Description}</span>
                       {isUniversal && (
                         <Badge variant="outline" className="text-xs">Universale</Badge>
                       )}
                     </div>
                   </SelectItem>
                 );
               })
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
         <div className="flex items-center justify-between mb-1">
           <Label className="text-xs">Alias</Label>
           {(selectedValues.typeId || (selectedValues.macroFamilyId && types.length === 0)) && !selectedValues.useExistingArticle && (
             <Button
               size="icon"
               variant="ghost"
               className="h-5 w-5"
               onClick={() => handleOpenCreateDialog("alias", {
                 id: selectedValues.typeId || "0",
                 code: selectedValues.typeCode || "000",
                 description: types.find(t => String(t.Id) === String(selectedValues.typeId))?.Description || "Default"
               })}
               title="Crea nuovo alias"
             >
               <Plus className="h-3 w-3" />
             </Button>
           )}
         </div>
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
               aliases.map(alias => {
                 const isUniversal = alias.IsUniversal === true || alias.IsUniversal === 1;
                 return (
                   <SelectItem key={alias.Id} value={String(alias.Id)}>
                     <div className="flex items-center gap-2">
                       <span>{alias.Code} - {alias.Description}</span>
                       {isUniversal && (
                         <Badge variant="outline" className="text-xs">Universale</Badge>
                       )}
                     </div>
                   </SelectItem>
                 );
               })
             ) : (selectedValues.typeId || types.length === 0) ? (
               <SelectItem value="0" disabled>
                 000 - Nessun alias disponibile
               </SelectItem>
             ) : null}
           </SelectContent>
         </Select>
       </div>
     </div>

     {/* Misure e Sequenziale con opzione completamento parziale */}
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
         <div className="relative flex gap-2 items-center">
           <Input
             value={selectedValues.newCode}
             onChange={e => {
               const newCode = e.target.value.toUpperCase();
               const newValues = { ...selectedValues, newCode };
               setSelectedValues(newValues);
               onChange(newValues);
               if (newCode.length === 15) {
                 validateCodeAsync(newCode);
               }
             }}
             className={`h-9 font-mono font-semibold ${
               validation.isValid ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
             }`}
             placeholder="Codice generato..."
             maxLength={15}
             disabled={disabled || selectedValues.useExistingArticle}
           />
           {/* Pulsante per ripristinare il codice suggerito */}
           <Button
             type="button"
             size="icon"
             variant="ghost"
             className="h-8 w-8"
             title="Ripristina codice suggerito"
             onClick={() => {
               if (suggestedCode) {
                 const newValues = { ...selectedValues, newCode: suggestedCode };
                 setSelectedValues(newValues);
                 onChange(newValues);
                 validateCodeAsync(suggestedCode);
               }
             }}
             disabled={selectedValues.newCode === suggestedCode || !suggestedCode || disabled || selectedValues.useExistingArticle}
           >
             <RefreshCw size={16} />
           </Button>
           {(!validation.isValid && validation.message) && (
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

     {/* Pulsante per completamento parziale */}
     {selectedValues.macroFamilyCode && !selectedValues.newCode && !selectedValues.useExistingArticle && (
       <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
         <div className="text-sm text-amber-700">
           <AlertCircle className="h-4 w-4 inline mr-1" />
           Codifica parziale rilevata. Puoi completare con valori di default.
         </div>
         <Button
           size="sm"
           variant="outline"
           onClick={() => completeCodeWithDefaults(selectedValues)}
           className="ml-2"
         >
           <Wand2 className="h-3 w-3 mr-1" />
           Completa con default
         </Button>
       </div>
     )}

     {/* Selettore Caratteristiche Tecniche */}
     {!selectedValues.useExistingArticle && selectedValues.macroFamilyId && (
       <div className="space-y-2">
         <Label className="text-xs">Caratteristiche Tecniche</Label>
         <TechnicalCharacteristicsSelector
           companyId={companyId}
           macroFamilyId={selectedValues.macroFamilyId}
           familyId={selectedValues.familyId}
           typeId={selectedValues.typeId}
           currentTechnicalData={technicalData}
           onTechnicalDataChange={handleTechnicalDataChange}
           disabled={disabled}
         />
       </div>
     )}

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
                 title="Aggiorna descrizione automaticamente"
               >
                 <RefreshCw className="h-3 w-3 mr-1" />
                 Aggiorna
               </Button>
               <Button
                 type="button"
                 variant="ghost"
                 size="sm"
                 onClick={() => setIsEditingDescription(!isEditingDescription)}
                 className={`h-7 px-2 ${isEditingDescription ? 'bg-blue-100' : ''}`}
                 title={isEditingDescription ? "Descrizione in modifica manuale" : "Modifica manualmente"}
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
       {isEditingDescription && (
         <div className="text-xs text-blue-600 flex items-center gap-1">
           <Edit2 className="h-3 w-3" />
           Modifica manuale attiva - la descrizione non si aggiornerà automaticamente
         </div>
       )}
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

     {/* Dialog per creazione nuovi elementi */}
     <CreateElementDialog
       open={createDialogOpen}
       onOpenChange={setCreateDialogOpen}
       elementType={createDialogType}
       parentId={createDialogParent?.id}
       parentCode={createDialogParent?.code}
       parentDescription={createDialogParent?.description}
       companyId={companyId}
       onSuccess={handleElementCreated}
       categorySelected={createDialogType === "macroFamily" ? macroFamilies :
                        createDialogType === "family" ? families :
                        createDialogType === "type" ? types :
                        createDialogType === "alias" ? aliases : null}
     />
   </div>
 );
};

export default CodingHierarchySelector;