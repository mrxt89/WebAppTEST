import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Settings, Plus, Edit, Trash2, Cog, Power, Info, Lock } from 'lucide-react';
import axios from '@/lib/axios';
import { useAuth } from '@/context/AuthContext';
import { useCompany } from '@/context/CompanyContext';
import { swal } from '@/lib/common';
import { toast } from "@/components/ui/use-toast";

const OperationsManagement = ({ onDataChange }) => {
  const { user } = useAuth();
  const { company: selectedCompany } = useCompany();
  const [operations, setOperations] = useState([]);
  const [workCenters, setWorkCenters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOperation, setEditingOperation] = useState(null);
  const [highlightedRowId, setHighlightedRowId] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    unitCost: 0,
    fixedCost: 0,
    workCenterId: null,
    waitTime: 0,
    setupTime: 0,
    productionTime: 0,
    active: '1'
  });

  // Carica operazioni e centri di lavoro
  const loadData = async () => {
    if (!selectedCompany?.CompanyId) {
      return;
    }

    setLoading(true);
    try {
      const [operationsResponse, workCentersResponse] = await Promise.all([
        axios.get('/utility/operations'),
        axios.get('/utility/work-centers')
      ]);

      if (operationsResponse.data.success) {
        setOperations(operationsResponse.data.data);
      }
      if (workCentersResponse.data.success) {
        setWorkCenters(workCentersResponse.data.data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      swal.fire({
        title: 'Errore',
        text: 'Errore nel caricamento dei dati',
        icon: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedCompany?.CompanyId]);

  // Gestione form
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const resetForm = () => {
    setFormData({
      code: '',
      description: '',
      unitCost: 0,
      fixedCost: 0,
      workCenterId: null,
      waitTime: 0,
      setupTime: 0,
      productionTime: 0,
      active: '1'
    });
    setEditingOperation(null);
  };

  const openDialog = (operation) => {
    if (!operation) {
      swal.fire({
        title: 'Errore',
        text: 'Nessuna operazione selezionata',
        icon: 'error'
      });
      return;
    }

    setEditingOperation(operation);
    setFormData({
      code: operation.Code,
      description: operation.Description,
      unitCost: operation.UnitCost,
      fixedCost: operation.FixedCost,
      workCenterId: operation.WorkCenterId,
      waitTime: operation.WaitTime,
      setupTime: operation.SetupTime,
      productionTime: operation.ProductionTime,
      active: operation.Active
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  // Salva solo i costi dell'operazione
  const handleSave = async () => {
    if (!editingOperation) {
      swal.fire({
        title: 'Errore',
        text: 'Nessuna operazione selezionata',
        icon: 'error'
      });
      return;
    }

    try {
      const response = await axios.put(`/utility/operations/${editingOperation.OriginalId}`, {
        unitCost: formData.unitCost,
        fixedCost: formData.fixedCost,
        waitTime: formData.waitTime,
        setupTime: formData.setupTime,
        productionTime: formData.productionTime,
        active: formData.active
      });
      
      if (response.data.success) {
        swal.fire({
          title: 'Successo',
          text: 'Costi aggiornati con successo',
          icon: 'success'
        });
        
        // Evidenzia la riga modificata
        setHighlightedRowId(editingOperation.OriginalId);
        
        // Rimuovi l'evidenziazione dopo 2 secondi
        setTimeout(() => {
          setHighlightedRowId(null);
        }, 2000);
        
        loadData();
        if (onDataChange) onDataChange();
        closeDialog();
      }
    } catch (error) {
      console.error('Error updating operation costs:', error);
      swal.fire({
        title: 'Errore',
        text: error.response?.data?.message || 'Errore nell\'aggiornamento dei costi',
        icon: 'error'
      });
    }
  };

  // Toggle stato attivo/inattivo
  const handleToggleActive = async (originalId, currentActive) => {
    try {
      // Salva la posizione di scroll corrente
      const scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
      
      const newActive = currentActive === '1' ? '0' : '1';
      const response = await axios.put(`/utility/operations/${originalId}/toggle-active`, {
        active: newActive
      });
      
      if (response.data.success) {
        toast({
          title: "Successo",
          description: response.data.message,
        });
        
        // Evidenzia la riga modificata
        setHighlightedRowId(originalId);
        
        // Rimuovi l'evidenziazione dopo 2 secondi
        setTimeout(() => {
          setHighlightedRowId(null);
        }, 2000);
        
        // Aggiorna i dati e ripristina la posizione di scroll
        await loadData();
        if (onDataChange) onDataChange();
        
        // Ripristina la posizione di scroll dopo un breve delay per permettere il re-render
        setTimeout(() => {
          window.scrollTo(0, scrollPosition);
        }, 100);
      }
    } catch (error) {
      console.error('Error toggling operation status:', error);
      toast({
        title: "Errore",
        description: "Errore nel cambio stato dell'operazione",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Cog className="h-5 w-5 mr-2" />
            Gestione Operazioni
          </div>
        </CardTitle>
        <Alert className="mt-2 align-items-center">
          <AlertDescription>
            <strong>Nota:</strong> Le operazioni vengono sincronizzate automaticamente dal gestionale ERP. 
            È possibile modificare solo i <strong>costi</strong>, i <strong>tempi</strong> e lo <strong>stato attivo/inattivo</strong>.
          </AlertDescription>
        </Alert>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Caricamento...</p>
          </div>
        ) : operations.length === 0 ? (
          <div className="text-center py-8">
            <Cog className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">Nessuna operazione configurata</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Codice</TableHead>
                <TableHead>Descrizione</TableHead>
                <TableHead>Costo Unitario</TableHead>
                <TableHead>Costo Fisso</TableHead>
                <TableHead>Centro di Lavoro</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead>Utilizzi</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {operations.map((operation) => (
                <TableRow 
                  key={operation.OriginalId}
                  className={highlightedRowId === operation.OriginalId ? 'bg-green-100 animate-pulse' : ''}
                >
                  <TableCell className="font-medium">{operation.Code}</TableCell>
                  <TableCell>{operation.Description}</TableCell>
                  <TableCell>€{operation.UnitCost?.toFixed(2) || '0.00'}</TableCell>
                  <TableCell>€{operation.FixedCost?.toFixed(2) || '0.00'}</TableCell>
                  <TableCell>
                    {operation.WorkCenterCode ? (
                      <div>
                        <div className="font-medium">{operation.WorkCenterCode}</div>
                        <div className="text-sm text-gray-500">{operation.WorkCenterDescription}</div>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={operation.Active === '1'}
                        onCheckedChange={() => handleToggleActive(operation.OriginalId, operation.Active)}
                      />
                      <Badge variant={operation.Active === '1' ? 'default' : 'secondary'}>
                        {operation.Active === '1' ? 'Attiva' : 'Inattiva'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{operation.RoutingUsageCount || 0}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDialog(operation)}
                        title="Modifica costi e tempi"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Dialog per modifica costi */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Modifica Costi Operazione
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Alert>
                <Lock className="h-4 w-4" />
                <AlertDescription>
                  I dati dell'operazione vengono sincronizzati dal gestionale ERP. 
                  È possibile modificare solo i costi, i tempi e lo stato attivo/inattivo.
                </AlertDescription>
              </Alert>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="code">Codice</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
                <div>
                  <Label htmlFor="workCenterId">Centro di Lavoro</Label>
                  <Input
                    id="workCenterId"
                    value={formData.workCenterId ? 
                      workCenters.find(wc => wc.OriginalId === formData.workCenterId)?.Code || 'N/A' 
                      : 'Nessuno'
                    }
                    disabled
                    className="bg-gray-50"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="description">Descrizione</Label>
                <Input
                  id="description"
                  value={formData.description}
                  disabled
                  className="bg-gray-50"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="unitCost">Costo Unitario (€) *</Label>
                  <Input
                    id="unitCost"
                    type="number"
                    step="0.01"
                    value={formData.unitCost}
                    onChange={(e) => handleInputChange('unitCost', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="fixedCost">Costo Fisso (€) *</Label>
                  <Input
                    id="fixedCost"
                    type="number"
                    step="0.01"
                    value={formData.fixedCost}
                    onChange={(e) => handleInputChange('fixedCost', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="waitTime">Tempo Attesa (sec) *</Label>
                  <Input
                    id="waitTime"
                    type="number"
                    step="0.1"
                    value={formData.waitTime}
                    onChange={(e) => handleInputChange('waitTime', parseFloat(e.target.value) || 0)}
                    placeholder="0.0"
                  />
                </div>
                <div>
                  <Label htmlFor="setupTime">Tempo Setup (sec) *</Label>
                  <Input
                    id="setupTime"
                    type="number"
                    step="0.1"
                    value={formData.setupTime}
                    onChange={(e) => handleInputChange('setupTime', parseFloat(e.target.value) || 0)}
                    placeholder="0.0"
                  />
                </div>
                <div>
                  <Label htmlFor="productionTime">Tempo Produzione (sec) *</Label>
                  <Input
                    id="productionTime"
                    type="number"
                    step="0.1"
                    value={formData.productionTime}
                    onChange={(e) => handleInputChange('productionTime', parseFloat(e.target.value) || 0)}
                    placeholder="0.0"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="active">Stato *</Label>
                <Select
                  value={formData.active}
                  onValueChange={(value) => handleInputChange('active', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Attiva</SelectItem>
                    <SelectItem value="0">Inattiva</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={closeDialog}>
                  Annulla
                </Button>
                <Button onClick={handleSave}>
                  Aggiorna Costi
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default OperationsManagement;
