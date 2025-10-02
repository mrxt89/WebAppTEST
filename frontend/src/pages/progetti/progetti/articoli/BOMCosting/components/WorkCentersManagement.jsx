import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Settings, Plus, Edit, Trash2, Factory, Info, Lock } from 'lucide-react';
import axios from '@/lib/axios';
import { useAuth } from '@/context/AuthContext';
import { useCompany } from '@/context/CompanyContext';
import { swal } from '@/lib/common';

const WorkCentersManagement = ({ onDataChange }) => {
  const { user } = useAuth();
  const { company: selectedCompany } = useCompany();
  const [workCenters, setWorkCenters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWorkCenter, setEditingWorkCenter] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    outsourced: '0',
    hourlyCost: 0,
    waitTime: 0
  });

  // Carica centri di lavoro
  const loadWorkCenters = async () => {
    if (!selectedCompany?.CompanyId) {
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get('/utility/work-centers');
      if (response.data.success) {
        setWorkCenters(response.data.data);
      }
    } catch (error) {
      console.error('Error loading work centers:', error);
      swal.fire({
        title: 'Errore',
        text: 'Errore nel caricamento dei centri di lavoro',
        icon: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkCenters();
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
      outsourced: '0',
      hourlyCost: 0,
      waitTime: 0
    });
    setEditingWorkCenter(null);
  };

  const openDialog = (workCenter) => {
    if (!workCenter) {
      swal.fire({
        title: 'Errore',
        text: 'Nessun centro di lavoro selezionato',
        icon: 'error'
      });
      return;
    }

    setEditingWorkCenter(workCenter);
    setFormData({
      code: workCenter.Code,
      description: workCenter.Description,
      outsourced: workCenter.Outsourced,
      hourlyCost: workCenter.HourlyCost,
      waitTime: workCenter.WaitTime
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  // Salva solo i costi del centro di lavoro
  const handleSave = async () => {
    if (!editingWorkCenter) {
      swal.fire({
        title: 'Errore',
        text: 'Nessun centro di lavoro selezionato',
        icon: 'error'
      });
      return;
    }

    try {
      const response = await axios.put(`/utility/work-centers/${editingWorkCenter.OriginalId}`, {
        hourlyCost: formData.hourlyCost,
        waitTime: formData.waitTime
      });
      
      if (response.data.success) {
        swal.fire({
          title: 'Successo',
          text: 'Costi aggiornati con successo',
          icon: 'success'
        });
        loadWorkCenters();
        if (onDataChange) onDataChange();
        closeDialog();
      }
    } catch (error) {
      console.error('Error updating work center costs:', error);
      swal.fire({
        title: 'Errore',
        text: error.response?.data?.message || 'Errore nell\'aggiornamento dei costi',
        icon: 'error'
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Factory className="h-5 w-5 mr-2" />
            Gestione Centri di Lavoro
          </div>
        </CardTitle>
        <Alert className="mt-2 align-items-center">
          <AlertDescription>
            <strong>Nota:</strong> I centri di lavoro vengono sincronizzati automaticamente dal gestionale ERP. 
            È possibile modificare solo i <strong>costi</strong>.
          </AlertDescription>
        </Alert>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Caricamento...</p>
          </div>
        ) : workCenters.length === 0 ? (
          <div className="text-center py-8">
            <Factory className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">Nessun centro di lavoro configurato</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Codice</TableHead>
                <TableHead>Descrizione</TableHead>
                <TableHead>Esterno</TableHead>
                <TableHead>Costo Orario</TableHead>
                <TableHead>Tempo Attesa</TableHead>
                <TableHead>Operazioni</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workCenters.map((workCenter) => (
                <TableRow key={workCenter.OriginalId}>
                  <TableCell className="font-medium">{workCenter.Code}</TableCell>
                  <TableCell>{workCenter.Description}</TableCell>
                  <TableCell>
                    <Badge variant={workCenter.Outsourced === '1' ? 'destructive' : 'secondary'}>
                      {workCenter.Outsourced === '1' ? 'Sì' : 'No'}
                    </Badge>
                  </TableCell>
                  <TableCell>€{workCenter.HourlyCost?.toFixed(2) || '0.00'}</TableCell>
                  <TableCell>{workCenter.WaitTime} sec</TableCell>
                  <TableCell>
                    <Badge variant="outline">{workCenter.OperationsCount || 0}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDialog(workCenter)}
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
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                Modifica Costi Centro di Lavoro
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Alert>
                <Lock className="h-4 w-4" />
                <AlertDescription>
                  I dati del centro di lavoro vengono sincronizzati dal gestionale ERP. 
                  È possibile modificare solo i costi e i tempi.
                </AlertDescription>
              </Alert>
              
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
                <Label htmlFor="description">Descrizione</Label>
                <Input
                  id="description"
                  value={formData.description}
                  disabled
                  className="bg-gray-50"
                />
              </div>
              <div>
                <Label htmlFor="outsourced">Centro Esterno</Label>
                <Input
                  id="outsourced"
                  value={formData.outsourced === '1' ? 'Sì' : 'No'}
                  disabled
                  className="bg-gray-50"
                />
              </div>
              <div>
                <Label htmlFor="hourlyCost">Costo Orario (€) *</Label>
                <Input
                  id="hourlyCost"
                  type="number"
                  step="0.01"
                  value={formData.hourlyCost}
                  onChange={(e) => handleInputChange('hourlyCost', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="waitTime">Tempo Attesa (sec) *</Label>
                <Input
                  id="waitTime"
                  type="number"
                  value={formData.waitTime}
                  onChange={(e) => handleInputChange('waitTime', parseInt(e.target.value) || 0)}
                  placeholder="0"
                />
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

export default WorkCentersManagement;
