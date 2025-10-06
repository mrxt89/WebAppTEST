import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Calculator, 
  Settings, 
  Download, 
  AlertTriangle, 
  CheckCircle, 
  Loader2, 
  Eye, 
  RefreshCw, 
  FileText, 
  Package, 
  Wrench, 
  TrendingUp, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight, 
  X, 
  Info,
  Database,
  Plus,
  Edit,
  Trash2,
  TestTube,
  ChevronUp,
  ChevronDown,
  ListFilter
} from 'lucide-react';
import { swal } from '@/lib/common';
import { useCompany } from '@/context/CompanyContext';
import axios from '@/lib/axios';
import UtilityManagement from './BOMCosting/components/UtilityManagement';
import CostTreeView from './BOMCosting/components/CostTreeView';
import CostTreeModal from './BOMCosting/components/CostTreeModal';
import BOMViewer from './BOMViewer';
import {
  parseBOMCostingDetails,
  parseBOMNotes,
  formatCurrency,
  formatPercentage,
  generateCostingSummary
} from '@/lib/bomCostingUtils';

/**
 * Componente per la costificazione automatica delle distinte base (BOM)
 * Implementa calcolo costi con esplosione ricorsiva, gestione scarto e ricarichi
 */
const BOMCosting = ({ selectedItem }) => {
  const { company: selectedCompany } = useCompany();
  const [searchParams] = useSearchParams();
  
  // Stati principali
  const [loading, setLoading] = useState(false);
  const [availableBOMs, setAvailableBOMs] = useState([]);
  const [selectedBOM, setSelectedBOM] = useState(null);
  const [costingResult, setCostingResult] = useState(null);
  const [parameters, setParameters] = useState([]);
  
  // Stati per paginazione
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 50,
    totalCount: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false
  });
  

  // Stato per visualizzazione albero costi
  const [showCostTree, setShowCostTree] = useState(false);
  const [treeData, setTreeData] = useState(null);
  const [loadingTree, setLoadingTree] = useState(false);
  
  // Stato per pannello opzioni compresso
  const [isOptionsPanelCollapsed, setIsOptionsPanelCollapsed] = useState(false);
  
  // Stati per il pannello draggabile
  const [panelPosition, setPanelPosition] = useState(() => {
    // Carica posizione salvata dal localStorage
    const saved = localStorage.getItem('bomCostingPanelPosition');
    return saved ? JSON.parse(saved) : { x: 20, y: 20 };
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  // Stati per cronologia costi
  const [costHistory, setCostHistory] = useState({
    searchText: '',
    results: [],
    selectedBOM: null,
    loading: false,
    pagination: {
      page: 1,
      pageSize: 50,
      totalCount: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false
    }
  });
  
  // Stati per filtri e opzioni
  const [filters, setFilters] = useState({
    searchText: '',
    bomStatus: '',
    nature: 'all'
  });
  
  // Stati per calcolo
  const [costingOptions, setCostingOptions] = useState({
    orderQuantity: '',
    scrapPercentage: '',
    useGranularMarkups: true, // Default a true per le nuove regole
    updateBOMRecord: true, // Default a true per aggiornare il record
    debug: false
  });
  
  const [activeTab, setActiveTab] = useState('bom-selection');
  const [activeParameterTab, setActiveParameterTab] = useState('standard');
  
  // Stati per dati noti
  const [knownData, setKnownData] = useState([]);
  const [knownDataLoading, setKnownDataLoading] = useState(false);
  const [showKnownDataModal, setShowKnownDataModal] = useState(false);
  const [editingKnownData, setEditingKnownData] = useState(null);
  const [knownDataForm, setKnownDataForm] = useState({
    itemCode: '',
    itemDescription: '',
    dataType: 'MATERIAL',
    parameters: [
      { name: '', value: '', unit: '', description: '' }
    ],
    isActive: true
  });

  // Carica dati iniziali
  useEffect(() => {
    if (selectedCompany?.CompanyId) {
      // Controlla se c'è un itemCode nei parametri URL
      const itemCode = searchParams.get('itemCode');
      if (itemCode) {
        setFilters(prev => ({ ...prev, searchText: itemCode }));
      }
      
      loadAvailableBOMs();
      loadParameters();
      loadKnownData();
    }
  }, [selectedCompany?.CompanyId, searchParams]);

  // Effetto per gestire selectedItem
  useEffect(() => {
    if (selectedItem?.Item) {
      setFilters(prev => ({ ...prev, searchText: selectedItem.Item }));
    }
  }, [selectedItem]);

  // Carica dati noti quando si entra nella scheda "Dati Noti"
  useEffect(() => {
    if (activeParameterTab === 'known-data' && selectedCompany?.CompanyId) {
      loadKnownData();
    }
  }, [activeParameterTab, selectedCompany?.CompanyId]);

  // Carica BOM disponibili con paginazione
  const loadAvailableBOMs = async (page = pagination.page, pageSize = pagination.pageSize) => {
    if (!selectedCompany?.CompanyId) {
      console.warn('Company non selezionata');
      return;
    }

    try {
      setLoading(true);
      
      // Pulisce i filtri vuoti prima di inviare la richiesta
      const cleanFilters = {};
      if (filters.searchText && filters.searchText.trim()) {
        cleanFilters.searchText = filters.searchText.trim();
      }
      if (filters.bomStatus && filters.bomStatus.trim()) {
        cleanFilters.bomStatus = filters.bomStatus;
      }
      if (filters.nature && filters.nature.trim() && filters.nature !== 'all') {
        cleanFilters.nature = filters.nature;
      }
      
      const response = await axios.get('/bom-costing/available-boms', {
        params: {
          ...cleanFilters,
          page,
          pageSize
        }
      });
      
      if (response.data.success) {
        setAvailableBOMs(response.data.data);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error('Error loading available BOMs:', error);
      swal.fire({
        title: 'Errore',
        text: 'Errore nel caricamento delle BOM disponibili',
        icon: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Carica parametri di costificazione
  const loadParameters = async () => {
    if (!selectedCompany?.CompanyId) {
      console.warn('Company non selezionata');
      return;
    }

    try {
      const response = await axios.get('/bom-costing/parameters');
      
      if (response.data.success) {
        setParameters(response.data.data);
      }
    } catch (error) {
      console.error('Error loading parameters:', error);
    }
  };


  // Carica dati noti
  const loadKnownData = async () => {
    if (!selectedCompany?.CompanyId) {
      console.warn('Company non selezionata');
      return;
    }

    try {
      setKnownDataLoading(true);
      const response = await axios.get('/known-data', {
        params: {
          companyId: selectedCompany.CompanyId
        }
      });
      
      if (response.data.success) {
      
        setKnownData(response.data.data);
      }
    } catch (error) {
      console.error('Error loading known data:', error);
    } finally {
      setKnownDataLoading(false);
    }
  };

  // Salva parametri dati noti
  const saveKnownDataParameter = async () => {
    try {
      setKnownDataLoading(true);
      
      // Filtra parametri vuoti
      const validParameters = knownDataForm.parameters.filter(p => {
        const name = p.name || '';
        const value = p.value || '';
        const unit = p.unit || '';
        return name.trim() && String(value).trim() && unit.trim();
      });
      
      if (validParameters.length === 0) {
        new swal('Errore', 'Inserisci almeno un parametro valido', 'error');
        return;
      }
      
      // Validazione: se itemCode è vuoto, itemDescription deve essere presente
      const itemCode = knownDataForm.itemCode || '';
      const itemDescription = knownDataForm.itemDescription || '';
      if (!itemCode.trim() && !itemDescription.trim()) {
        new swal('Errore', 'Inserisci il codice articolo o la descrizione', 'error');
        return;
      }
      
      // Se stiamo modificando, elimina i parametri esistenti e ricrea
      if (editingKnownData) {
        // Elimina tutti i parametri del gruppo esistente
        const deletePromises = editingKnownData.parameters.map(param => 
          axios.delete(`/known-data/parameter/${param.id}`, {
            params: {
              companyId: selectedCompany.CompanyId
            }
          })
        );
        await Promise.all(deletePromises);
      }
      
      // Crea un parametro per ogni valore valido
      const promises = validParameters.map(param => {
        const paramData = {
          companyId: selectedCompany.CompanyId,
          itemCode: itemCode.trim() || null, // Può essere null se usiamo solo descrizione
          itemDescription: itemDescription.trim(),
          dataType: knownDataForm.dataType,
          parameterName: param.name,
          parameterValue: param.value,
          unitOfMeasure: param.unit,
          description: param.description || '',
          isActive: knownDataForm.isActive
        };
        
     
        return axios.post('/known-data/parameter', paramData);
      });
      
      await Promise.all(promises);
      
      await loadKnownData();
      setShowKnownDataModal(false);
      resetKnownDataForm();
      new swal('Successo', 'Parametri salvati con successo', 'success');
    } catch (error) {
      console.error('Error saving known data parameters:', error);
      new swal('Errore', 'Errore nel salvataggio dei parametri', 'error');
    } finally {
      setKnownDataLoading(false);
    }
  };

  // Elimina parametro dati noti
  const deleteKnownDataParameter = async (parameterId) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo parametro?')) {
      return;
    }
    
    try {
      setKnownDataLoading(true);
      const response = await axios.delete(`/known-data/parameter/${parameterId}`, {
        params: {
          companyId: selectedCompany.CompanyId
        }
      });
      
      if (response.data.success) {
        await loadKnownData();
        new swal('Successo', 'Parametro eliminato con successo', 'success');
      }
    } catch (error) {
      console.error('Error deleting known data parameter:', error);
      new swal('Errore', 'Errore nell\'eliminazione del parametro', 'error');
    } finally {
      setKnownDataLoading(false);
    }
  };

  // Elimina gruppo di parametri dati noti
  const deleteKnownDataGroup = async (group) => {
    if (!selectedCompany?.CompanyId) {
      console.warn('Company non selezionata');
      return;
    }

    const result = await new swal({
      title: 'Conferma eliminazione',
      text: `Sei sicuro di voler eliminare tutti i parametri per "${group.itemCode || group.itemDescription}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sì, elimina',
      cancelButtonText: 'Annulla',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6'
    });

    if (!result.isConfirmed) {
      return;
    }
    
    try {
      setKnownDataLoading(true);
      
      // Elimina tutti i parametri del gruppo
      const promises = group.parameters.map(param => 
        axios.delete(`/known-data/parameter/${param.id}`, {
          params: {
            companyId: selectedCompany.CompanyId
          }
        })
      );
      
      await Promise.all(promises);
      await loadKnownData();
      new swal('Successo', 'Parametri eliminati con successo', 'success');
    } catch (error) {
      console.error('Error deleting known data group:', error);
      new swal('Errore', 'Errore durante l\'eliminazione dei parametri', 'error');
    } finally {
      setKnownDataLoading(false);
    }
  };

  // Reset form dati noti
  const resetKnownDataForm = () => {
    setKnownDataForm({
      itemCode: '',
      itemDescription: '',
      dataType: 'MATERIAL',
      parameters: [
        { name: '', value: '', unit: '', description: '' }
      ],
      isActive: true
    });
    setEditingKnownData(null);
  };

  // Apri modale per nuovo parametro
  const openNewKnownDataModal = () => {
    resetKnownDataForm();
    setShowKnownDataModal(true);
  };

  // Apri modale per modifica parametro
  const openEditKnownDataModal = (group) => {
    // Usa i parametri del gruppo passato
    setKnownDataForm({
      itemCode: group.itemCode,
      itemDescription: group.itemDescription,
      dataType: group.dataType,
      parameters: group.parameters.map(p => ({
        name: p.name,
        value: p.value,
        unit: p.unit,
        description: p.description
      })),
      isActive: group.isActive
    });
    setEditingKnownData(group);
    setShowKnownDataModal(true);
  };

  // Aggiungi nuovo parametro al form
  const addParameter = () => {
    setKnownDataForm({
      ...knownDataForm,
      parameters: [...knownDataForm.parameters, { name: '', value: '', unit: '', description: '' }]
    });
  };

  // Rimuovi parametro dal form
  const removeParameter = (index) => {
    if (knownDataForm.parameters.length > 1) {
      setKnownDataForm({
        ...knownDataForm,
        parameters: knownDataForm.parameters.filter((_, i) => i !== index)
      });
    }
  };

  // Aggiorna parametro specifico nel form
  const updateKnownDataParameter = (index, field, value) => {
    const newParameters = [...knownDataForm.parameters];
    newParameters[index] = { ...newParameters[index], [field]: value };
    setKnownDataForm({ ...knownDataForm, parameters: newParameters });
  };

  // Inizializza parametri di default
  const initializeParameters = async () => {
    if (!selectedCompany?.CompanyId) {
      console.warn('Company non selezionata');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post('/bom-costing/parameters/initialize', {});
      
      if (response.data.success) {
        swal.fire({
          title: 'Successo',
          text: 'Parametri inizializzati con successo',
          icon: 'success'
        });
        loadParameters();
      }
    } catch (error) {
      console.error('Error initializing parameters:', error);
      swal.fire({
        title: 'Errore',
        text: 'Errore nell\'inizializzazione dei parametri',
        icon: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Funzione per identificare se un parametro è una percentuale
  const isPercentageParameter = (parameterName) => {
    const percentageParams = [
      'RICARICO_MP',
      'RICARICO_OPE', 
      'RICARICO_TRASPORTO',
      'RICARICO_SCARTO',
      'RICARICO_TOTALE',
      'RICARICO_SCONTO'
    ];
    return percentageParams.includes(parameterName);
  };

  // Funzione per identificare parametri essenziali da mostrare
  const isEssentialParameter = (parameterName) => {
    const essentialParams = [
      'RICARICO_MP',
      'RICARICO_OPE', 
      'RICARICO_TRASPORTO',
      'RICARICO_SCARTO',
      'RICARICO_TOTALE',
      'RICARICO_SCONTO',
      'COSTO_ORARIO_STANDARD',
      'SCARTO_PERCENTUALE_DEFAULT',
      'LOTTO_PRODUZIONE_DEFAULT'
    ];
    return essentialParams.includes(parameterName);
  };

  // Funzione per convertire percentuale da UI a backend
  const convertPercentageToBackend = (value, parameterName) => {
    if (isPercentageParameter(parameterName)) {
      return parseFloat(value) / 100; // Converte 15 -> 0.15
    }
    return parseFloat(value);
  };

  // Funzione per convertire percentuale da backend a UI
  const convertPercentageToUI = (value, parameterName) => {
    if (isPercentageParameter(parameterName)) {
      return (parseFloat(value) * 100).toFixed(2); // Converte 0.15 -> 15.00
    }
    return value.toString();
  };

  // Aggiorna parametro
  const updateParameter = async (parameterId, newValue, parameterName) => {
    if (!selectedCompany?.CompanyId) {
      console.warn('Company non selezionata');
      return;
    }

    try {
      const backendValue = convertPercentageToBackend(newValue, parameterName);
      const response = await axios.put(`/bom-costing/parameters/${parameterId}`, {
        parameterValue: backendValue
      });
      
      if (response.data.success) {
        loadParameters();
        swal.fire({
          title: 'Successo',
          text: 'Parametro aggiornato con successo',
          icon: 'success',
          timer: 2000
        });
      }
    } catch (error) {
      console.error('Error updating parameter:', error);
      swal.fire({
        title: 'Errore',
        text: 'Errore nell\'aggiornamento del parametro',
        icon: 'error'
      });
    }
  };

  // Calcola costificazione
  const calculateCosting = async () => {
    if (!selectedBOM) {
      swal.fire({
        title: 'Attenzione',
        text: 'Seleziona una BOM per calcolare la costificazione',
        icon: 'warning'
      });
      return;
    }

    if (!selectedCompany?.CompanyId) {
      swal.fire({
        title: 'Errore',
        text: 'Company non selezionata',
        icon: 'error'
      });
      return;
    }

    try {
      setLoading(true);
      setCostingResult(null);
      
      const requestData = {};
      
      if (costingOptions.orderQuantity) {
        requestData.orderQuantity = parseFloat(costingOptions.orderQuantity);
      }
      
      if (costingOptions.scrapPercentage) {
        requestData.scrapPercentage = parseFloat(costingOptions.scrapPercentage) / 100; // Converti percentuale
      }
      
      requestData.useGranularMarkups = costingOptions.useGranularMarkups;
      requestData.updateBOMRecord = costingOptions.updateBOMRecord;
      requestData.debug = costingOptions.debug;
      
      const response = await axios.post(`/bom-costing/calculate/${selectedBOM.Id}`, requestData);
      
      if (response.data.success) {
        setCostingResult(response.data.data);
        setActiveTab('results');
        
        
        swal.fire({
          title: 'Successo',
          text: 'Costificazione calcolata con successo',
          icon: 'success',
          timer: 2000
        });
      }
    } catch (error) {
      console.error('Error calculating costing:', error);
      
      let errorMessage = 'Errore nel calcolo della costificazione';
      if (error.response?.status === 404) {
        errorMessage = 'BOM non trovata';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      swal.fire({
        title: 'Errore',
        text: errorMessage,
        icon: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Test calcolo con esempio

  // Esporta risultato
  const exportResult = async () => {
    if (!selectedBOM || !costingResult) return;
    
    if (!selectedCompany?.CompanyId) {
      swal.fire({
        title: 'Errore',
        text: 'Company non selezionata',
        icon: 'error'
      });
      return;
    }
    
    try {
      const response = await axios.get(`/bom-costing/export/${selectedBOM.Id}`);
      
      if (response.data.success) {
        // Crea e scarica file JSON
        const dataStr = JSON.stringify(response.data.data, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `bom_costing_${selectedBOM.BOMCode}_${new Date().toISOString().split('T')[0]}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
      }
    } catch (error) {
      console.error('Error exporting result:', error);
      swal.fire({
        title: 'Errore',
        text: 'Errore nell\'export del risultato',
        icon: 'error'
      });
    }
  };

  // Carica i dati per l'albero dei costi per una BOM specifica (usato dal pulsante Dettaglio nella tabella)
  const loadCostTreeForBOM = async (bomId, bomData) => {
    if (!bomId) return;

    try {
      setLoadingTree(true);

      console.log('Loading cost tree for BOM:', bomId);

      // Facciamo un calcolo con debug=true per ottenere i dettagli
      const requestData = {
        useGranularMarkups: costingOptions.useGranularMarkups,
        updateBOMRecord: false, // Non aggiorniamo la BOM, solo visualizziamo
        debug: true // IMPORTANTE: chiediamo i dettagli componenti
      };

      if (costingOptions.orderQuantity) {
        requestData.orderQuantity = parseFloat(costingOptions.orderQuantity);
      }

      if (costingOptions.scrapPercentage) {
        requestData.scrapPercentage = parseFloat(costingOptions.scrapPercentage) / 100;
      }

      console.log('Calling /bom-costing/calculate with:', requestData);

      const costResponse = await axios.post(`/bom-costing/calculate/${bomId}`, requestData);

      console.log('Cost response:', costResponse.data);

      if (costResponse.data.success) {
        // Carica anche la struttura BOM
        const bomResponse = await axios.get(`/projectArticles/boms/${bomId}`, {
          params: {
            action: 'GET_BOM_MULTILEVEL',
            maxLevel: 10,
            expandPhantoms: true,
            includeRouting: true
          }
        });

        const bomStructure = bomResponse.data.data || bomResponse.data;

        if (bomStructure && (bomStructure.components || bomStructure.routing)) {
          const bomComponents = bomStructure.components || [];
          const bomRouting = bomStructure.routing || [];
          const costComponents = costResponse.data.data.components || [];

          const costingRouting = costResponse.data.data.routing || [];
          const productionLot = costResponse.data.data.costing?.production_lot || 100;

          // Mappa 1: BOMId -> costi delle operazioni (da routing)
          const operationCostMap = new Map();
          costingRouting.forEach(route => {
            const bomId = route.BOMId?.toString();
            if (!bomId) return;

            const existing = operationCostMap.get(bomId) || {
              ProcessingCost: 0,
              FixedCostTotal: 0,
              OperationCost: 0
            };

            const processingCost = route.ProcessingCost || 0;
            const setupCost = route.SetupCost || 0;

            existing.ProcessingCost += processingCost;
            existing.FixedCostTotal += setupCost;
            existing.OperationCost += (processingCost + (setupCost / productionLot));

            operationCostMap.set(bomId, existing);
          });

          // Arricchisci i componenti BOM con i costi REALI da SP_CalculateBOMCosting
          // Usa matching per ComponentId + Quantity per gestire componenti duplicati con quantità diverse
          const enrichedComponents = bomComponents.map(bomComp => {
            const operationData = operationCostMap.get(bomComp.BOMId?.toString());

            // Cerca il componente corrispondente da SP_CalculateBOMCosting
            // Match per ComponentId + Quantity per gestire duplicati
            const componentId = bomComp.ComponentId?.toString();
            const quantity = bomComp.Quantity || 0;

            const materialData = costComponents.find(comp =>
              comp.ComponentId?.toString() === componentId &&
              Math.abs((comp.Quantity || 0) - quantity) < 0.0001 // Tolleranza per float
            );

            // Costi materiali da SP_CalculateBOMCosting (non da GET_BOM_MULTILEVEL)
            const materialCost = materialData?.CalculatedTotalCost || materialData?.TotalCost || 0;
            const operationCost = operationData?.OperationCost || 0;

            return {
              ...bomComp,
              OperationCost: operationData?.ProcessingCost || 0,
              FixedCost: operationData ? operationData.FixedCostTotal / productionLot : 0,
              FixedCostTotal: operationData?.FixedCostTotal || 0,
              MaterialCost: materialCost,
              TotalCost: materialCost + operationCost,
              CalculatedTotalCost: materialCost + operationCost,
              UnitCost: materialData?.UnitCost || 0,
              Quantity: bomComp.Quantity || materialData?.Quantity || 0
            };
          });

          // Aggiungi i cicli ai componenti
          const componentsWithCycles = enrichedComponents.map(comp => {
            const compCycles = bomRouting.filter(route =>
              route.BOMId?.toString() === comp.BOMId?.toString() ||
              route.ComponentId?.toString() === comp.ComponentId?.toString()
            );

            return {
              ...comp,
              operations: comp.operations || compCycles || []
            };
          });

          const finalTreeData = {
            ...costResponse.data.data,
            components: componentsWithCycles,
            routing: costingRouting, // USA i dati di routing con i costi da SP_CalculateBOMCosting
            bomCode: bomData?.ItemCode || bomData?.BOMCode,
            bomDescription: bomData?.ItemDescription || bomData?.Description
          };

          console.log('TreeData assembled:', finalTreeData);

          setTreeData(finalTreeData);
          setShowCostTree(true);
        }
      }
    } catch (error) {
      console.error('Error loading cost tree for BOM:', error);
      swal.fire({
        title: 'Errore',
        text: 'Errore nel caricamento dell\'albero costi',
        icon: 'error'
      });
    } finally {
      setLoadingTree(false);
    }
  };

  // Carica i dati per l'albero dei costi (usato dalla scheda Risultati)
  const loadCostTree = async () => {
    if (!selectedBOM || !costingResult) return;

    try {
      setLoadingTree(true);

      console.log('Loading cost tree...');
      console.log('costingResult:', costingResult);
      console.log('Has components?', costingResult.components && costingResult.components.length > 0);

      // Se abbiamo già i components dal debug, usiamo quelli
      if (costingResult.components && costingResult.components.length > 0) {
        console.log('Using existing components from debug mode');
        // Carica anche la struttura BOM per avere i Path corretti
        const bomResponse = await axios.get(`/projectArticles/boms/${selectedBOM.Id}`, {
          params: {
            action: 'GET_BOM_MULTILEVEL',
            maxLevel: 10,
            expandPhantoms: true,
            includeRouting: true
          }
        });

        const bomData = bomResponse.data.data || bomResponse.data;

        if (bomData && (bomData.components || bomData.routing)) {
          const bomComponents = bomData.components || [];
          const bomRouting = bomData.routing || [];

          const costingRouting = costingResult.routing || [];
          const costComponents = costingResult.components || [];
          const productionLot = costingResult.costing?.production_lot || 100;

          // Mappa 1: BOMId -> costi delle operazioni (da routing)
          const operationCostMap = new Map();
          costingRouting.forEach(route => {
            const bomId = route.BOMId?.toString();
            if (!bomId) return;

            const existing = operationCostMap.get(bomId) || {
              ProcessingCost: 0,
              FixedCostTotal: 0,
              OperationCost: 0
            };

            const processingCost = route.ProcessingCost || 0;
            const setupCost = route.SetupCost || 0;

            existing.ProcessingCost += processingCost;
            existing.FixedCostTotal += setupCost;
            existing.OperationCost += (processingCost + (setupCost / productionLot));

            operationCostMap.set(bomId, existing);
          });

          // Arricchisci i componenti BOM con i costi REALI da SP_CalculateBOMCosting
          // Usa matching per ComponentId + Quantity per gestire componenti duplicati con quantità diverse
          const enrichedComponents = bomComponents.map(bomComp => {
            const operationData = operationCostMap.get(bomComp.BOMId?.toString());

            // Cerca il componente corrispondente da SP_CalculateBOMCosting
            // Match per ComponentId + Quantity per gestire duplicati
            const componentId = bomComp.ComponentId?.toString();
            const quantity = bomComp.Quantity || 0;

            const materialData = costComponents.find(comp =>
              comp.ComponentId?.toString() === componentId &&
              Math.abs((comp.Quantity || 0) - quantity) < 0.0001 // Tolleranza per float
            );

            // Costi materiali da SP_CalculateBOMCosting (non da GET_BOM_MULTILEVEL)
            const materialCost = materialData?.CalculatedTotalCost || materialData?.TotalCost || 0;
            const operationCost = operationData?.OperationCost || 0;

            return {
              ...bomComp,
              OperationCost: operationData?.ProcessingCost || 0,
              FixedCost: operationData ? operationData.FixedCostTotal / productionLot : 0,
              FixedCostTotal: operationData?.FixedCostTotal || 0,
              MaterialCost: materialCost,
              TotalCost: materialCost + operationCost,
              CalculatedTotalCost: materialCost + operationCost,
              UnitCost: materialData?.UnitCost || 0,
              Quantity: bomComp.Quantity || materialData?.Quantity || 0
            };
          });

          // Aggiungi i cicli ai componenti
          const componentsWithCycles = enrichedComponents.map(comp => {
            const compCycles = bomRouting.filter(route =>
              route.BOMId?.toString() === comp.BOMId?.toString() ||
              route.ComponentId?.toString() === comp.ComponentId?.toString()
            );

            return {
              ...comp,
              operations: comp.operations || compCycles || []
            };
          });

          const finalTreeData = {
            ...costingResult,
            components: componentsWithCycles,
            routing: costingRouting, // USA i dati di routing con i costi da SP_CalculateBOMCosting
            bomCode: selectedBOM.ItemCode,
            bomDescription: selectedBOM.ItemDescription
          };

          console.log('TreeData assembled (from debug):', finalTreeData);
          console.log('Components count:', componentsWithCycles.length);

          setTreeData(finalTreeData);
          setShowCostTree(true);
        }
        return;
      }

      // Altrimenti, facciamo un nuovo calcolo con debug=true per ottenere i dettagli
      console.log('No components in costingResult, making new calculation with debug=true');

      const requestData = {};

      if (costingOptions.orderQuantity) {
        requestData.orderQuantity = parseFloat(costingOptions.orderQuantity);
      }

      if (costingOptions.scrapPercentage) {
        requestData.scrapPercentage = parseFloat(costingOptions.scrapPercentage) / 100;
      }

      requestData.useGranularMarkups = costingOptions.useGranularMarkups;
      requestData.updateBOMRecord = false; // Non aggiorniamo la BOM, solo visualizziamo
      requestData.debug = true; // IMPORTANTE: chiediamo i dettagli componenti

      console.log('Calling /bom-costing/calculate with:', requestData);

      const costResponse = await axios.post(`/bom-costing/calculate/${selectedBOM.Id}`, requestData);

      console.log('Cost response:', costResponse.data);
      console.log('Cost response components:', costResponse.data.data?.components);
      console.log('Components is array?', Array.isArray(costResponse.data.data?.components));
      console.log('Components length:', costResponse.data.data?.components?.length);

      if (costResponse.data.success && costResponse.data.data.components) {
        console.log('Cost response has components, proceeding...');
        // Carica anche la struttura BOM
        const bomResponse = await axios.get(`/projectArticles/boms/${selectedBOM.Id}`, {
          params: {
            action: 'GET_BOM_MULTILEVEL',
            maxLevel: 10,
            expandPhantoms: true,
            includeRouting: true
          }
        });

        console.log('BOM response received:', bomResponse.data);

        // La risposta di projectArticles/boms ha una struttura diversa
        // Non ha success/data wrapper, ma components e routing direttamente
        const bomData = bomResponse.data.data || bomResponse.data;

        if (bomData && (bomData.components || bomData.routing)) {
          const bomComponents = bomData.components || [];
          const bomRouting = bomData.routing || [];
          const costComponents = costResponse.data.data.components || [];

          console.log('BOM components:', bomComponents.length);
          console.log('BOM routing:', bomRouting.length);
          console.log('Cost components:', costComponents.length);

          const costingRouting = costResponse.data.data.routing || [];
          const productionLot = costResponse.data.data.costing?.production_lot || 100;

          console.log('Routing data:', costingRouting.length);
          console.log('Production lot:', productionLot);

          // Mappa 1: BOMId -> costi delle operazioni (da routing)
          const operationCostMap = new Map();
          costingRouting.forEach(route => {
            const bomId = route.BOMId?.toString();
            if (!bomId) return;

            const existing = operationCostMap.get(bomId) || {
              ProcessingCost: 0,
              FixedCostTotal: 0,
              OperationCost: 0
            };

            const processingCost = route.ProcessingCost || 0;
            const setupCost = route.SetupCost || 0;

            existing.ProcessingCost += processingCost;
            existing.FixedCostTotal += setupCost;
            existing.OperationCost += (processingCost + (setupCost / productionLot));

            operationCostMap.set(bomId, existing);
          });

          // Mappa 2: ComponentId -> costi dei materiali (da costComponents)
          const materialCostMap = new Map();
          costComponents.forEach(comp => {
            const componentId = comp.ComponentId?.toString();
            if (!componentId) return;

            materialCostMap.set(componentId, {
              UnitCost: comp.UnitCost || 0,
              CalculatedTotalCost: comp.CalculatedTotalCost || comp.TotalCost || 0,
              Quantity: comp.Quantity || 0
            });
          });

          console.log('Operation cost map size:', operationCostMap.size);
          console.log('Material cost map size:', materialCostMap.size);

          // Arricchisci i componenti BOM con i costi REALI da SP_CalculateBOMCosting
          const enrichedComponents = bomComponents.map(bomComp => {
            const operationData = operationCostMap.get(bomComp.BOMId?.toString());
            const materialData = materialCostMap.get(bomComp.ComponentId?.toString());

            // Costi materiali da SP_CalculateBOMCosting (non da GET_BOM_MULTILEVEL)
            const materialCost = materialData?.CalculatedTotalCost || 0;
            const operationCost = operationData?.OperationCost || 0;

            return {
              ...bomComp,
              OperationCost: operationData?.ProcessingCost || 0,
              FixedCost: operationData ? operationData.FixedCostTotal / productionLot : 0,
              FixedCostTotal: operationData?.FixedCostTotal || 0,
              MaterialCost: materialCost,
              TotalCost: materialCost + operationCost,
              CalculatedTotalCost: materialCost + operationCost,
              UnitCost: materialData?.UnitCost || 0,
              Quantity: bomComp.Quantity || materialData?.Quantity || 0
            };
          });

          console.log('Enriched components (all BOM components):', enrichedComponents.length);

          // Aggiungi i cicli
          const componentsWithCycles = enrichedComponents.map(comp => {
            const compCycles = bomRouting.filter(route =>
              route.BOMId?.toString() === comp.BOMId?.toString() ||
              route.ComponentId?.toString() === comp.ComponentId?.toString()
            );

            return {
              ...comp,
              operations: comp.operations || compCycles || []
            };
          });

          const finalTreeData = {
            ...costResponse.data.data,
            components: componentsWithCycles,
            routing: costingRouting, // USA i dati di routing con i costi da SP_CalculateBOMCosting
            bomCode: selectedBOM.ItemCode,
            bomDescription: selectedBOM.ItemDescription
          };

          console.log('TreeData assembled (from new calculation):', finalTreeData);
          console.log('Components count:', componentsWithCycles.length);

          setTreeData(finalTreeData);
          setShowCostTree(true);
          console.log('showCostTree set to true');
        } else {
          console.error('BOM response not successful');
        }
      } else {
        console.log('No components in cost response, using BOM structure only');

        // Anche se non abbiamo i dettagli di costo per componente,
        // possiamo comunque mostrare la struttura BOM con il costo totale
        const bomResponse = await axios.get(`/projectArticles/boms/${selectedBOM.Id}`, {
          params: {
            action: 'GET_BOM_MULTILEVEL',
            maxLevel: 10,
            expandPhantoms: true,
            includeRouting: true
          }
        });

        const bomData = bomResponse.data.data || bomResponse.data;

        if (bomData && (bomData.components || bomData.routing)) {
          const bomComponents = bomData.components || [];
          const bomRouting = bomData.routing || [];

          // Aggiungi i cicli ai componenti
          const componentsWithCycles = bomComponents.map(comp => {
            const compCycles = bomRouting.filter(route =>
              route.BOMId?.toString() === comp.ComponentBOMId?.toString() ||
              route.ComponentId?.toString() === comp.ComponentId?.toString()
            );

            return {
              ...comp,
              operations: compCycles || []
            };
          });

          const finalTreeData = {
            costing: costResponse.data.data.costing || {},
            components: componentsWithCycles,
            routing: bomRouting,
            bomCode: selectedBOM.ItemCode,
            bomDescription: selectedBOM.ItemDescription
          };

          console.log('TreeData assembled (BOM only):', finalTreeData);
          console.log('Components count:', componentsWithCycles.length);

          setTreeData(finalTreeData);
          setShowCostTree(true);
        }
      }
    } catch (error) {
      console.error('Error loading cost tree:', error);
      swal.fire({
        title: 'Errore',
        text: 'Errore nel caricamento dell\'albero costi',
        icon: 'error'
      });
    } finally {
      setLoadingTree(false);
    }
  };

  // Formatta valori monetari
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(value || 0);
  };

  // Formatta percentuali
  const formatPercentage = (value) => {
    return `${((value || 0) * 100).toFixed(2)}%`;
  };

  // Funzione per ordinare i componenti mantenendo la struttura gerarchica BOM
  const sortComponentsByBOMStructure = (components) => {
    if (!components || components.length === 0) return [];
    
    // Creiamo un Path per ogni componente basato sulla gerarchia
    const componentsWithPath = components.map(comp => {
      // Se il componente ha un Path dal backend, usalo
      if (comp.Path) {
        return { ...comp, displayLevel: comp.Level, sortPath: comp.Path };
      }
      
      // Altrimenti creiamo un Path basato su ComponentLine e Level
      // I componenti di livello 1 hanno Path = ComponentLine
      // I componenti di livello 2+ hanno Path = ParentPath.ComponentLine
      let sortPath = comp.ComponentLine.toString();
      
      // Per componenti di livello superiore, cerchiamo il padre
      if (comp.Level > 1) {
        // Cerchiamo il componente padre (stesso ComponentLine ma livello inferiore)
        const parent = components.find(p => 
          p.ComponentLine === comp.ComponentLine && 
          p.Level === comp.Level - 1
        );
        
        if (parent) {
          sortPath = `${parent.ComponentLine}.${comp.ComponentLine}`;
        }
      }
      
      return { ...comp, displayLevel: comp.Level, sortPath };
    });
    
    // Ordiniamo per Path (come fa la stored procedure)
    return componentsWithPath.sort((a, b) => {
      // Confronto stringa del Path
      return a.sortPath.localeCompare(b.sortPath, undefined, { numeric: true });
    });
  };

  // Funzioni per gestire la paginazione
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      loadAvailableBOMs(newPage, pagination.pageSize);
    }
  };

  const handlePageSizeChange = (newPageSize) => {
    setPagination(prev => ({ ...prev, pageSize: newPageSize }));
    loadAvailableBOMs(1, newPageSize); // Reset alla prima pagina
  };

  const handleFilterChange = () => {
    // Reset alla prima pagina quando cambiano i filtri
    loadAvailableBOMs(1, pagination.pageSize);
  };


  // Funzioni per cronologia costi
  const searchCostHistory = async (page = costHistory.pagination.page, pageSize = costHistory.pagination.pageSize) => {
    if (!selectedCompany?.CompanyId) {
      console.warn('Company non selezionata');
      return;
    }

    try {
      setCostHistory(prev => ({ ...prev, loading: true }));
      
      const response = await axios.get('/bom-costing/history/search', {
        params: {
          searchText: costHistory.searchText || null,
          page,
          pageSize
        }
      });
      
      if (response.data.success) {
        setCostHistory(prev => ({
          ...prev,
          results: response.data.data,
          pagination: response.data.pagination,
          loading: false
        }));
      }
    } catch (error) {
      console.error('Error searching cost history:', error);
      setCostHistory(prev => ({ ...prev, loading: false }));
      swal.fire({
        title: 'Errore',
        text: 'Errore nella ricerca della cronologia costi',
        icon: 'error'
      });
    }
  };

  const loadCostHistoryDetails = async (bomId) => {
    try {
      setCostDetailModal({
        isOpen: true,
        type: 'history', // Tipo specifico per i dettagli dalla cronologia
        loading: true,
        data: null
      });

      // Carica i dettagli della costificazione con calcolo aggiornato (senza aggiornare la BOM)
      const response = await axios.get(`/bom-costing/details/${bomId}`, {
        params: {
          updateBOMRecord: true, // Calcola i costi aggiornati senza aggiornare la BOM
          useKnownData: true,
          useGranularMarkups: true
        }
      });
      
      if (response.data.success) {
        setCostDetailModal(prev => ({
          ...prev,
          loading: false,
          data: response.data.data
        }));
      }
    } catch (error) {
      console.error('Error loading cost details:', error);
      setCostDetailModal(prev => ({
        ...prev,
        loading: false,
        data: null
      }));
      swal.fire({
        title: 'Errore',
        text: 'Errore nel caricamento del dettaglio costi',
        icon: 'error'
      });
    }
  };

  const handleCostHistorySearch = () => {
    searchCostHistory(1, costHistory.pagination.pageSize);
  };

  const handleCostHistoryPageChange = (newPage) => {
    if (newPage >= 1 && newPage <= costHistory.pagination.totalPages) {
      searchCostHistory(newPage, costHistory.pagination.pageSize);
    }
  };

  // Funzioni per il drag del pannello
  const handleMouseDown = (e) => {
    // Non iniziare il drag se si clicca su controlli o elementi interattivi
    if (e.target.closest('button') || 
        e.target.closest('input') || 
        e.target.closest('select') || 
        e.target.closest('label') ||
        e.target.closest('[role="button"]')) {
      return;
    }
    
    setIsDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    e.preventDefault();
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;
    
    // Limita il movimento all'interno della finestra
    const maxX = window.innerWidth - 400; // Larghezza approssimativa del pannello
    const maxY = window.innerHeight - 200; // Altezza approssimativa del pannello
    
    setPanelPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY))
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    // Salva la posizione nel localStorage
    localStorage.setItem('bomCostingPanelPosition', JSON.stringify(panelPosition));
  };

  // Aggiungi event listeners per il drag
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  // Se non c'è company selezionata, mostra messaggio
  if (!selectedCompany?.CompanyId) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <AlertTriangle className="h-16 w-16 mx-auto text-yellow-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Company Non Selezionata</h2>
          <p className="text-gray-600">
            Seleziona una company per accedere alla costificazione BOM
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-2 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Costificazione Distinte</h1>
          <p className="text-gray-600 mt-1">
            Calcolo automatico dei costi delle distinte base con esplosione ricorsiva
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            onClick={loadAvailableBOMs}
            variant="outline"
            size="sm"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Aggiorna
          </Button>
          {costingResult && (
            <Button
              onClick={exportResult}
              variant="outline"
              size="sm"
            >
              <Download className="h-4 w-4 mr-2" />
              Esporta
            </Button>
          )}
        </div>
      </div>

      {/* Tabs principali */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full navbar-style-tabs">
          <TabsTrigger value="bom-selection">
            <Package className="h-4 w-4 mr-2" />
            Calcolo costi
          </TabsTrigger>
          {/* <TabsTrigger value="parameters">
            <Settings className="h-4 w-4 mr-2" />
            Parametri
          </TabsTrigger> */}
          <TabsTrigger value="results" disabled={!costingResult}>
            <Calculator className="h-4 w-4 mr-2" />
            Risultati
          </TabsTrigger>
          {/* <TabsTrigger value="utility">
            <Wrench className="h-4 w-4 mr-2" />
            Utility
          </TabsTrigger> */}
          <TabsTrigger value="bom-viewer" disabled={!selectedBOM}>
            <ListFilter className="h-4 w-4 mr-2" />
            Distinta
          </TabsTrigger>
        </TabsList>

        {/* Tab Selezione BOM */}
        <TabsContent value="bom-selection" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="h-5 w-5 mr-2" />
                Selezione e Configurazione BOM
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Filtri */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <Label htmlFor="searchText">Ricerca</Label>
                  <Input
                    id="searchText"
                    placeholder="Codice BOM, descrizione o codice articolo..."
                    value={filters.searchText}
                    onChange={(e) => setFilters({...filters, searchText: e.target.value})}
                    onKeyPress={(e) => e.key === 'Enter' && handleFilterChange()}
                  />
                </div>
                <div>
                  <Label htmlFor="bomStatus">Stato BOM</Label>
                  <Select value={filters.bomStatus} onValueChange={(value) => setFilters({...filters, bomStatus: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tutti gli stati" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BOZZA">Bozza</SelectItem>
                      <SelectItem value="ATTIVA">Attiva</SelectItem>
                      <SelectItem value="OBSOLETA">Obsoleta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="nature">Natura Articolo</Label>
                  <Select value={filters.nature} onValueChange={(value) => setFilters({...filters, nature: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tutte le nature" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutte le nature</SelectItem>
                      <SelectItem value="22413313">Prodotto Finito</SelectItem>
                      <SelectItem value="22413312">Semilavorato</SelectItem>
                      <SelectItem value="22413314">Acquisto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col justify-end">
                  <Button onClick={handleFilterChange} disabled={loading} className="flex items-center">
                    {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Cerca BOM
                  </Button>
                </div>
                <div className="flex flex-col justify-end">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setFilters({searchText: '', bomStatus: '', nature: 'all'});
                      handleFilterChange();
                    }}
                    disabled={loading}
                  >
                    Reset Filtri
                  </Button>
                </div>
              </div>



              {/* Opzioni di calcolo - Draggable Panel */}
              {selectedBOM && (
                <div 
                  className="fixed z-50 w-96"
                  style={{
                    left: `${panelPosition.x}px`,
                    top: `${panelPosition.y}px`
                  }}
                >
                  {isOptionsPanelCollapsed ? (
                    // Pannello compresso - solo icona piccola
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsOptionsPanelCollapsed(false)}
                        className="bg-blue-100/80 backdrop-blur-sm hover:bg-blue-200/80 rounded-full p-2 shadow-lg border border-blue-300"
                      >
                        <Calculator className="h-4 w-4 text-blue-600" />
                      </Button>
                    </div>
                  ) : (
                    // Pannello espanso
                    <Card className="shadow-lg border-2 border-blue-200 bg-blue-50/80 backdrop-blur-sm">
                      <CardHeader 
                        className="pb-3 cursor-grab active:cursor-grabbing select-none"
                        onMouseDown={handleMouseDown}
                        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                      >
                         <div className="flex items-center justify-between">
                           <div className="flex items-center">
                             <Calculator className="h-5 w-5 text-blue-600" />
                           </div>
                           <div className="flex-1 text-center">
                             <CardTitle className="text-blue-800 text-lg">
                               {selectedBOM.BOMCode}
                             </CardTitle>
                           </div>
                           <div className="flex items-center">
                             <Button
                               variant="ghost"
                               size="sm"
                               onClick={() => setIsOptionsPanelCollapsed(true)}
                               className="text-blue-600 hover:text-blue-800"
                             >
                               <ChevronUp className="h-4 w-4" />
                             </Button>
                           </div>
                         </div>
                         <p className="text-sm text-blue-600 text-center mt-2">
                           Esegui il programma di ricalcolo costi per la BOM e versione selezionata
                         </p>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Campi nascosti per quantità ordine e scarto */}
                    
                        <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2 d-none">
                        <Switch
                          id="granularMarkups"
                          checked={costingOptions.useGranularMarkups}
                          onCheckedChange={(checked) => setCostingOptions({...costingOptions, useGranularMarkups: checked})}
                        />
                        <Label htmlFor="granularMarkups">Ricarichi Granulari</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button 
                          onClick={calculateCosting} 
                          disabled={loading}
                          className=""
                          size="lg"
                        >
                          {loading ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Calculator className="h-4 w-4 mr-2" />
                          )}
                          Calcola
                        </Button>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="updateBOMRecord"
                          checked={costingOptions.updateBOMRecord}
                          onCheckedChange={(checked) => setCostingOptions({...costingOptions, updateBOMRecord: checked})}
                        />
                        <Label htmlFor="updateBOMRecord">Aggiorna Record BOM</Label>
                      </div>
                      
                        </div>
                        <p className="text-xs text-gray-500 mt-3">
                              💡 Trascina per spostare il pannello
                            </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* Lista BOM */}
              {availableBOMs.length > 0 && (
                <div className={selectedBOM ? "" : ""}>
                <div className="space-y-4">
                  <div className="border rounded-lg overflow-x-auto max-h-[60vh] overflow-y-auto" style={{ minWidth: '800px' }}>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead></TableHead>
                          <TableHead>Codice BOM</TableHead>
                          <TableHead>Descrizione</TableHead>
                          <TableHead>Articolo</TableHead>
                          <TableHead>Natura</TableHead>
                          <TableHead>Versione</TableHead>
                          <TableHead>Stato ERP</TableHead>
                          <TableHead>Costo Totale</TableHead>
                          <TableHead>Azioni</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {availableBOMs.map((bom) => (
                          <TableRow 
                            key={bom.Id}
                            className={selectedBOM?.Id === bom.Id ? 'bg-blue-50' : ''}
                          >
                            <TableCell>
                              <input
                                type="radio"
                                name="selectedBOM"
                                checked={selectedBOM?.Id === bom.Id}
                                onChange={() => setSelectedBOM(bom)}
                                className="h-4 w-4 text-blue-600"
                              />
                            </TableCell>
                            <TableCell className="font-medium">{bom.BOMCode}</TableCell>
                            <TableCell>{bom.Description}</TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{bom.ItemCode}</div>
                                <div className="text-sm text-gray-500">{bom.ItemDescription}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={bom.NatureDescription === 'Prodotto Finito' ? 'default' : 'bg-info-subtle'}>
                                {bom.NatureDescription === 'Prodotto Finito' ? 'PF' : 
                                 bom.NatureDescription === 'Semilavorato' ? 'SML' : 
                                 bom.NatureDescription === 'Acquisto' ? 'MP' : bom.NatureDescription}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-mono">
                                v{bom.Version || 1}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={bom.stato_erp == '1' ? 'default' : 'bg-info-subtle'}>
                                {bom.StatoERPDescription || 'Non Esportato'}
                              </Badge>
                            </TableCell>
                            <TableCell>{formatCurrency(bom.LastCalculatedCost)}</TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => loadCostTreeForBOM(bom.Id, bom)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Dettaglio
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Controlli di paginazione */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-700">
                        Mostra
                      </span>
                      <Select value={pagination.pageSize.toString()} onValueChange={(value) => handlePageSizeChange(parseInt(value))}>
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="25">25</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                          <SelectItem value="200">200</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="text-sm text-gray-700">
                        di {pagination.totalCount} risultati
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-700">
                        Pagina {pagination.page} di {pagination.totalPages}
                      </span>
                      
                      <div className="flex space-x-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(1)}
                          disabled={!pagination.hasPreviousPage || loading}
                        >
                          <ChevronsLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(pagination.page - 1)}
                          disabled={!pagination.hasPreviousPage || loading}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(pagination.page + 1)}
                          disabled={!pagination.hasNextPage || loading}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(pagination.totalPages)}
                          disabled={!pagination.hasNextPage || loading}
                        >
                          <ChevronsRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                </div>
              )}

              {/* Messaggio quando non ci sono risultati */}
              {availableBOMs.length === 0 && !loading && (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600">Nessuna BOM trovata con i filtri selezionati</p>
                </div>
              )}

            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Cronologia Costi - NASCOSTO PER ORA */}

        {/* Tab Parametri - NASCOSTO */}

        {/* Tab Risultati */}
        <TabsContent value="results" className="space-y-4">
          {costingResult && (
            <>
              {/* Pulsante Visualizza Dettaglio Costi */}
              <div className="flex justify-start">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadCostTree()}
                  disabled={loadingTree}
                  className="flex items-center gap-2"
                >
                  {loadingTree ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <TrendingUp className="h-4 w-4" />
                  )}
                  Visualizza dettaglio costi
                </Button>
              </div>

              {/* Riepilogo Principale */}
              {(
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <span className="text-lg mr-2">€</span>
                      Risultato Costificazione - {selectedBOM?.BOMCode || 'N/A'}
                    </CardTitle>
                  </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div
                      className="bg-blue-50 p-4 rounded-lg"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Package className="h-8 w-8 text-blue-600" />
                          <div className="ml-3">
                            <p className="text-sm font-medium text-blue-600">Materiali</p>
                            <p className="text-2xl font-bold text-blue-900">
                              {formatCurrency(costingResult.costing.variable_costs_material)}
                            </p>
                          </div>
                        </div>
                        <Info className="h-5 w-5 text-blue-400" />
                      </div>
                    </div>

                    <div
                      className="bg-green-50 p-4 rounded-lg"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Wrench className="h-8 w-8 text-green-600" />
                          <div className="ml-3">
                            <p className="text-sm font-medium text-green-600">Operazioni</p>
                            <p className="text-2xl font-bold text-green-900">
                              {formatCurrency(costingResult.costing.variable_costs_operations)}
                            </p>
                          </div>
                        </div>
                        <Info className="h-5 w-5 text-green-400" />
                      </div>
                    </div>

                    <div
                      className="bg-gray-50 p-4 rounded-lg"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Settings className="h-8 w-8 text-gray-600" />
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-600">Costi Fissi</p>
                            <p className="text-2xl font-bold text-gray-900">
                              {formatCurrency(costingResult.costing.fixed_costs_per_lot)}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              per pezzo (lotto: {costingResult.costing.production_lot} pz)
                            </p>
                          </div>
                        </div>
                        <Info className="h-5 w-5 text-gray-400" />
                      </div>
                    </div>

                    <div
                      className="bg-orange-50 p-4 rounded-lg"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <TrendingUp className="h-8 w-8 text-orange-600" />
                          <div className="ml-3">
                            <p className="text-sm font-medium text-orange-600">Ricarichi</p>
                            <p className="text-2xl font-bold text-orange-900">
                              {formatCurrency(
                                costingResult.costing.ricarico_mp_amount +
                                costingResult.costing.ricarico_ope_amount +
                                costingResult.costing.ricarico_trasporto_amount +
                                costingResult.costing.ricarico_scarto_amount +
                                costingResult.costing.ricarico_totale_amount +
                                costingResult.costing.ricarico_sconto_amount
                              )}
                            </p>
                          </div>
                        </div>
                        <Info className="h-5 w-5 text-orange-400" />
                      </div>
                    </div>

                    <div
                      className="bg-purple-50 p-4 rounded-lg"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Calculator className="h-8 w-8 text-purple-600" />
                          <div className="ml-3">
                            <p className="text-sm font-medium text-purple-600">Totale</p>
                            <p className="text-2xl font-bold text-purple-900">
                              {formatCurrency(costingResult.costing.unit_cost_final)}
                            </p>
                          </div>
                        </div>
                        <Info className="h-5 w-5 text-purple-400" />
                      </div>
                    </div>
                  </div>


                </CardContent>
                </Card>
              )}

              {/* Dettaglio Componenti (se debug abilitato) */}
              {costingResult.components && costingResult.components.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Eye className="h-5 w-5 mr-2" />
                      Dettaglio Componenti (Debug)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Livello</TableHead>
                            <TableHead>Codice</TableHead>
                            <TableHead>Descrizione</TableHead>
                            <TableHead>Natura</TableHead>
                            <TableHead>Quantità</TableHead>
                            <TableHead>UM</TableHead>
                            <TableHead>Costo Unit.</TableHead>
                            <TableHead>Costo Fisso</TableHead>
                            <TableHead>Costo Tot.</TableHead>
                            <TableHead>Loop</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {costingResult.components.map((comp, index) => (
                            <TableRow key={index}>
                              <TableCell>
                                <Badge variant="outline">{comp.Level}</Badge>
                              </TableCell>
                              <TableCell className="font-medium">{comp.ComponentItemCode}</TableCell>
                              <TableCell>{comp.ComponentDescription}</TableCell>
                              <TableCell>
                                <Badge variant="secondary">{comp.ComponentNature}</Badge>
                              </TableCell>
                              <TableCell>{comp.Quantity?.toFixed(3)}</TableCell>
                              <TableCell>{comp.UoM}</TableCell>
                              <TableCell>{formatCurrency(comp.UnitCost)}</TableCell>
                              <TableCell>{formatCurrency(comp.FixedCost)}</TableCell>
                              <TableCell>{formatCurrency(comp.TotalCost)}</TableCell>
                              <TableCell>
                                {comp.IsLoop ? (
                                  <AlertTriangle className="h-4 w-4 text-red-500" />
                                ) : (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* Tab Utility - NASCOSTO */}

        {/* Tab Distinta Base */}
        <TabsContent value="bom-viewer" className="flex-1 overflow-hidden m-0 border-none">
          {selectedBOM ? (
            <BOMViewer
              item={{
                Id: selectedBOM.ItemId,
                Item: selectedBOM.ItemCode,
                Description: selectedBOM.ItemDescription,
                Nature: selectedBOM.Nature,
                BOMCode: selectedBOM.BOMCode,
                BOMDescription: selectedBOM.Description,
                Version: selectedBOM.Version
              }}
              project={null}
              canEdit={false}
              onRefresh={() => {}}
            />
          ) : (
            <div className="p-6 text-center text-muted-foreground">
              Seleziona una BOM per visualizzarne la distinta base
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal Albero Costi */}
      <CostTreeModal
        isOpen={showCostTree}
        treeData={treeData}
        loading={loadingTree}
        onClose={() => setShowCostTree(false)}
      />

      {/* Modal Dati Noti */}
      {showKnownDataModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">
                {editingKnownData ? 'Modifica Parametro' : 'Nuovo Parametro Dati Noti'}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowKnownDataModal(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="itemCode">Codice Articolo (opzionale)</Label>
                    <Input
                      id="itemCode"
                      value={knownDataForm.itemCode}
                      onChange={(e) => setKnownDataForm({...knownDataForm, itemCode: e.target.value})}
                      placeholder="es. TUBO (lascia vuoto per usare solo descrizione)"
                    />
                  </div>
                  <div>
                    <Label htmlFor="dataType">Tipo Dato</Label>
                    <Select
                      value={knownDataForm.dataType}
                      onValueChange={(value) => setKnownDataForm({...knownDataForm, dataType: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MATERIAL">Materiale</SelectItem>
                        <SelectItem value="OPERATION">Operazione</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="itemDescription">Descrizione</Label>
                  <Input
                    id="itemDescription"
                    value={knownDataForm.itemDescription}
                    onChange={(e) => setKnownDataForm({...knownDataForm, itemDescription: e.target.value})}
                    placeholder="es. TUBO IN ACCIAIO SPESSORE 2MM (obbligatoria se codice vuoto)"
                  />
                </div>

                {/* Parametri multipli */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <Label className="text-base font-medium">Parametri</Label>
                    <Button
                      type="button"
                      onClick={addParameter}
                      variant="outline"
                      size="sm"
                      className="flex items-center"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Aggiungi Parametro
                    </Button>
                  </div>
                  
                  <div className="space-y-4">
                    {knownDataForm.parameters.map((param, index) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-medium">Parametro {index + 1}</h4>
                          {knownDataForm.parameters.length > 1 && (
                            <Button
                              type="button"
                              onClick={() => removeParameter(index)}
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor={`paramName_${index}`}>Nome Parametro</Label>
                            <Input
                              id={`paramName_${index}`}
                              value={param.name}
                              onChange={(e) => updateKnownDataParameter(index, 'name', e.target.value)}
                              placeholder="es. €/kg, kg/mt, L, QTA"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`paramValue_${index}`}>Valore</Label>
                            <Input
                              id={`paramValue_${index}`}
                              type="number"
                              step="0.01"
                              value={param.value}
                              onChange={(e) => updateKnownDataParameter(index, 'value', e.target.value)}
                              placeholder="es. 6, 3, 650, 0.75"
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mt-4">
                          <div>
                            <Label htmlFor={`paramUnit_${index}`}>Unità di Misura</Label>
                            <Input
                              id={`paramUnit_${index}`}
                              value={param.unit}
                              onChange={(e) => updateKnownDataParameter(index, 'unit', e.target.value)}
                              placeholder="es. €/kg, kg/mt, mm, mt"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`paramDesc_${index}`}>Descrizione</Label>
                            <Input
                              id={`paramDesc_${index}`}
                              value={param.description}
                              onChange={(e) => updateKnownDataParameter(index, 'description', e.target.value)}
                              placeholder="Descrizione del parametro"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="isActive"
                    checked={knownDataForm.isActive}
                    onCheckedChange={(checked) => setKnownDataForm({...knownDataForm, isActive: checked})}
                  />
                  <Label htmlFor="isActive">Parametro attivo</Label>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 p-6 border-t bg-white flex-shrink-0">
              <Button
                variant="outline"
                onClick={() => setShowKnownDataModal(false)}
                disabled={knownDataLoading}
              >
                Annulla
              </Button>
              <Button
                onClick={saveKnownDataParameter}
                disabled={knownDataLoading}
                className="flex items-center"
              >
                {knownDataLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingKnownData ? 'Aggiorna' : 'Salva'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BOMCosting;
