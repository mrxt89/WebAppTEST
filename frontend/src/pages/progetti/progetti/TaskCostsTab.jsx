import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ConfirmDialog from '@/components/ui/confirmDialog';
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Info } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import useProjectActions from '../../../hooks/useProjectManagementActions';
import { swal } from '../../../lib/common';

const CostDialog = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  initialData = null,
  costCategories = [],  
  unitsOfMeasure = []   
}) => {
  const [formData, setFormData] = useState({
    categoryId: initialData?.CategoryID || '',
    description: initialData?.Description || '',
    notes: initialData?.Notes || '',
    qty: initialData?.Qty?.toString() || '',
    unitCost: initialData?.UnitCost?.toString() || '',
    uom: initialData?.UoM || '' 
  });
    const [errors, setErrors] = useState({});
    const [calculatedTotal, setCalculatedTotal] = useState(0);
  
    useEffect(() => {
      if (initialData) {
        setFormData({
          categoryId: initialData.CategoryID || '', 
          description: initialData.Description || '',
          notes: initialData.Notes || '',
          qty: initialData.Qty?.toString() || '',
          unitCost: initialData.UnitCost?.toString() || '',
          uom: initialData.UoM || ''
        });
      } else if (!isOpen) {
        setFormData({
          categoryId: '',
          description: '',
          notes: '',
          qty: '',
          unitCost: '',
          uom: ''
        });
      }
      setErrors({});
    }, [initialData, isOpen]);

    // Quando cambia la categoria, imposta l'UoM predefinita
    useEffect(() => {
      if (formData.categoryId) {  
        const selectedCategory = costCategories.find(
          cat => cat.CategoryID === parseInt(formData.categoryId) 
        );
        if (selectedCategory?.UoM && !formData.uom) {
          setFormData(prev => ({ ...prev, uom: selectedCategory.UoM }));
        }
      }
    }, [formData.categoryId, costCategories]); 
  
    useEffect(() => {
      const qty = parseFloat(formData.qty) || 0;
      const unitCost = parseFloat(formData.unitCost) || 0;
      setCalculatedTotal(qty * unitCost);
    }, [formData.qty, formData.unitCost]);
  
    const validateForm = () => {
      const newErrors = {};
      if (!formData.categoryId) newErrors.categoryId = 'Seleziona una categoria';
      if (!formData.qty || parseFloat(formData.qty) <= 0) newErrors.qty = 'Inserisci una quantità valida';
      if (!formData.unitCost || parseFloat(formData.unitCost) <= 0) newErrors.unitCost = 'Inserisci un costo unitario valido';
      
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    };

  // Gestione del cambio categoria
  const handleCategoryChange = (value) => {
    const categoryId = parseInt(value);
    const selectedCategory = costCategories.find(cat => cat.CategoryID === categoryId);
    if (selectedCategory) {
      setFormData(prev => ({ 
        ...prev, 
        categoryId: categoryId,  // Salviamo l'ID
        uom: selectedCategory.UoM || prev.uom
      }));
      setErrors(prev => ({ ...prev, categoryId: undefined }));
    }
  };
  
    const handleSubmit = (e) => {
      e.preventDefault();
      if (!validateForm()) return;
  
      onSubmit({
        ...formData,
        categoryId: parseInt(formData.categoryId), 
        qty: parseFloat(formData.qty),
        unitCost: parseFloat(formData.unitCost)
      });
    };
  
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>{initialData ? 'Modifica Costo' : 'Nuovo Costo'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  Categoria *
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-gray-400" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Seleziona la categoria che meglio descrive questo costo</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <Select 
                value={formData.categoryId?.toString() || ''}
                onValueChange={handleCategoryChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleziona categoria" />
                </SelectTrigger>
                <SelectContent>
                  {costCategories.map(cat => (
                    <SelectItem key={cat.CategoryID} value={cat.CategoryID.toString()}>
                      {cat.Name} {cat.Description && cat.Description !== cat.Name ? ` - ${cat.Description}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && <p className="text-sm text-red-500">{errors.category}</p>}
            </div>
  
              <div className="space-y-2">
                <Label>Descrizione</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, description: e.target.value }));
                    setErrors(prev => ({ ...prev, description: undefined }));
                  }}
                  placeholder="Breve descrizione del costo"
                />
                {errors.description && <p className="text-sm text-red-500">{errors.description}</p>}
              </div>
  
              <div className="space-y-2">
                <Label>Note Aggiuntive</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Inserisci eventuali note o dettagli aggiuntivi"
                  rows={3}
                />
              </div>
  
              <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                      <Label>Quantità *</Label>
                      <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.qty}
                          onChange={(e) => {
                              setFormData(prev => ({ ...prev, qty: e.target.value }));
                              setErrors(prev => ({ ...prev, qty: undefined }));
                          }}
                          placeholder="0.00"
                      />
                      {errors.qty && <p className="text-sm text-red-500">{errors.qty}</p>}
                  </div>
                  <div className="space-y-2">
                      <Label>Unità di Misura *</Label>
                      <Select
                          value={formData.uom}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, uom: value }))}
                      >
                          <SelectTrigger>
                              <SelectValue placeholder="Seleziona UM" />
                          </SelectTrigger>
                          <SelectContent>
                              {unitsOfMeasure.map(uom => (
                                  <SelectItem key={uom.BaseUoM} value={uom.BaseUoM}>
                                      {uom.Description} ({uom.Symbol || uom.BaseUoM})
                                  </SelectItem>
                              ))}
                          </SelectContent>
                      </Select>
                      {errors.uom && <p className="text-sm text-red-500">{errors.uom}</p>}
                  </div>
                  <div className="space-y-2">
                      <Label>Costo Unitario (€) *</Label>
                      <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.unitCost}
                          onChange={(e) => {
                              setFormData(prev => ({ ...prev, unitCost: e.target.value }));
                              setErrors(prev => ({ ...prev, unitCost: undefined }));
                          }}
                          placeholder="0.00"
                      />
                      {errors.unitCost && <p className="text-sm text-red-500">{errors.unitCost}</p>}
                  </div>
              </div>
            </div>
  
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Annulla
              </Button>
              <Button type="submit">
                {initialData ? 'Salva Modifiche' : 'Aggiungi'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    );
  };
  
  const TaskCostsTab = ({ task, canEdit, onCostChange }) => {
    const [costs, setCosts] = useState([]);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingCost, setEditingCost] = useState(null);
    const [confirmDialog, setConfirmDialog] = useState({ open: false, lineId: null });
    const [costCategories, setCostCategories] = useState([]); 
    const [unitsOfMeasure, setUnitsOfMeasure] = useState([]); 
    const { 
        loading, 
        addCost, 
        updateCost, 
        deleteCost, 
        getTaskCosts, 
        fetchUnitsOfMeasure, 
        fetchCostCategories 
    } = useProjectActions();
  
// Caricamento dati iniziale
useEffect(() => {
  const loadData = async () => {
      try {
          const [uoms, categories] = await Promise.all([
              fetchUnitsOfMeasure(),
              fetchCostCategories()
          ]);
          console.log('Categorie caricate:', categories); // Debug
          setUnitsOfMeasure(uoms);
          setCostCategories(categories);
      } catch (error) {
          console.error('Error loading reference data:', error);
      }
  };
  loadData();
}, [fetchUnitsOfMeasure, fetchCostCategories]);

 // Inizializzazione costi dal task e successivo aggiornamento
 useEffect(() => {
  // Prima impostiamo i costi dal task
  if (task?.Costs) {
    try {
      const initialCosts = typeof task.Costs === 'string' ? JSON.parse(task.Costs) : task.Costs;
      setCosts(Array.isArray(initialCosts) ? initialCosts : []);
    } catch (error) {
      console.error('Error parsing initial costs:', error);
      setCosts([]);
    }
  }

  // Poi facciamo la chiamata per aggiornare i costi
  if (task?.TaskID) {
    getTaskCosts(task.TaskID)
      .then(costsData => {
        if (costsData && Array.isArray(costsData)) {
          setCosts(costsData);
        }
      })
      .catch(error => {
        console.error('Error loading costs:', error);
      });
  }
}, [task?.TaskID]);

  // Inizializzazione quando il task cambia
  useEffect(() => {
    reloadCosts();
  }, [task?.TaskID]);

 // Funzione per ricaricare i costi
 const reloadCosts = async () => {
  if (task?.TaskID) {
    try {
      const response = await getTaskCosts(task.TaskID);
      
      // Se la risposta è un oggetto, lo convertiamo in array
      if (response && !Array.isArray(response)) {
        console.log('Response from getTaskCosts:', response);
        // Se è un recordset
        if (response.recordset) {
          setCosts(response.recordset);
        } else {
          // Se è un oggetto singolo
          setCosts([response]);
        }
      } else {
        // Se è già un array
        setCosts(response || []);
      }
    } catch (error) {
      console.error('Error reloading costs:', error);
      setCosts([]);
    }
  }
};
  

const handleSubmit = async (formData) => {
  try {
    const processedData = {
      categoryId: parseInt(formData.categoryId),
      description: formData.description,
      notes: formData.notes,
      qty: parseFloat(formData.qty),
      unitCost: parseFloat(formData.unitCost),
      uom: formData.uom
    };

    if (editingCost) {
      await updateCost(task.TaskID, editingCost.LineID, processedData);
    } else {
      await addCost(task.TaskID, processedData);
    }
    
    await reloadCosts();
    setDialogOpen(false);
    setEditingCost(null);
  } catch (error) {
    console.error('Error managing costs:', error);
  }
};

const handleDelete = async () => {
  try {
    await deleteCost(task.TaskID, confirmDialog.lineId);
    await reloadCosts(); // Ricarica i costi dopo l'eliminazione
    setConfirmDialog({ open: false, lineId: null });
  } catch (error) {
    console.error('Error deleting cost:', error);

  }
};

// Calcoliamo il totale solo se costs è un array e contiene elementi
const totalCost = (Array.isArray(costs) && costs.length > 0) 
  ? costs.reduce((sum, cost) => sum + (cost.TotalCost || 0), 0) 
  : 0;


    return (
      <>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Costi Attività</h3>
            {canEdit && (
              <Button 
                onClick={() => {
                  setEditingCost(null);
                  setDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Aggiungi Costo
              </Button>
            )}
          </div>
  
          <Card className="p-4">
            <ScrollArea className="h-[450px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Descrizione</TableHead>
                    <TableHead className="text-right">Qtà</TableHead>
                    <TableHead className="text-right">Costo Unit.</TableHead>
                    <TableHead className="text-right">Totale</TableHead>
                    {canEdit && <TableHead className="w-[100px]">Azioni</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {costs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={canEdit ? 6 : 5} className="text-center text-gray-500">
                      </TableCell>
                    </TableRow>
                  ) : (
                    costs.map((cost) => (
                      <TableRow key={cost.LineID}>
                        <TableCell className="font-medium">{cost.Category}</TableCell>
                        <TableCell>
                          <div>{cost.Description}</div>
                          {cost.Notes && (
                            <div className="text-sm text-gray-500 mt-1">{cost.Notes}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">{cost.Qty.toFixed(2)}</TableCell>
                        <TableCell className="text-right">€ {cost.UnitCost.toFixed(2)}</TableCell>
                        <TableCell className="text-right">€ {cost.TotalCost.toFixed(2)}</TableCell>
                        {canEdit && (
                          <TableCell>
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setEditingCost(cost);
                                  setDialogOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setConfirmDialog({ 
                                  open: true, 
                                  lineId: cost.LineID 
                                })}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
                <TableBody>
                  <TableRow className="border-t-2">
                    <TableCell colSpan={4} className="text-right font-bold">
                      Totale Complessivo
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      € {totalCost.toFixed(2)}
                    </TableCell>
                    {canEdit && <TableCell />}
                  </TableRow>
                </TableBody>
              </Table>
            </ScrollArea>
          </Card>
  
          <CostDialog
            isOpen={dialogOpen}
            onClose={() => {
              setDialogOpen(false);
              setEditingCost(null);
            }}
            onSubmit={handleSubmit}
            initialData={editingCost}
            costCategories={costCategories}     
            unitsOfMeasure={unitsOfMeasure}
          />
  
          <ConfirmDialog
            isOpen={confirmDialog.open}
            onConfirm={handleDelete}
            onCancel={() => setConfirmDialog({ open: false, lineId: null })}
            title="Conferma eliminazione"
            description="Sei sicuro di voler eliminare questo costo? L'operazione non può essere annullata."
          />
        </div>
      </>
    );
  };
  

export default TaskCostsTab;