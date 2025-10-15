import React, { useState, useEffect } from 'react';
import { CheckCircle, FileText, RefreshCw, Building2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import IntercompanyBadge from './IntercompanyBadge';

const IntercompanySyncModal = ({
  open,
  onOpenChange,
  bomId,
  getBOMIntercompanySummary,
  syncIntercompanySharing,
  onSuccess,
}) => {
  const [components, setComponents] = useState([]);
  const [selectedComponents, setSelectedComponents] = useState(new Set());
  const [syncAttachments, setSyncAttachments] = useState(true);
  const [autoCreateReferences, setAutoCreateReferences] = useState(true);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && bomId) {
      loadComponents();
    }
  }, [open, bomId]);

  const loadComponents = async () => {
    try {
      setLoading(true);
      const data = await getBOMIntercompanySummary(bomId);

      // Filtra solo i componenti con TargetCompanyId valido (non nullo e non 0)
      const validComponents = (data.components || []).filter(
        comp => comp.TargetCompanyId && comp.TargetCompanyId > 0
      );
      setComponents(validComponents);

      // Auto-seleziona componenti senza reference o con status DRAFT
      const autoSelect = new Set();
      validComponents.forEach((comp) => {
        if (!comp.ExistingReferenceId || comp.ReferenceStatus === 'DRAFT') {
          autoSelect.add(comp.ComponentId);
        }
      });
      setSelectedComponents(autoSelect);
    } catch (error) {
      console.error('Error loading intercompany components:', error);
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: 'Impossibile caricare i componenti intercompany',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (selectedComponents.size === 0) {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: 'Seleziona almeno un componente da sincronizzare',
      });
      return;
    }

    try {
      setSyncing(true);
      const result = await syncIntercompanySharing(
        bomId,
        syncAttachments,
        autoCreateReferences
      );

      if (result.success) {
        toast({
          title: 'Sincronizzazione completata',
          description: result.msg,
        });
        onSuccess(result);
        onOpenChange(false);
      } else {
        throw new Error(result.msg || 'Errore durante la sincronizzazione');
      }
    } catch (error) {
      console.error('Error syncing intercompany sharing:', error);
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: error.message || 'Errore durante la sincronizzazione',
      });
    } finally {
      setSyncing(false);
    }
  };

  const toggleComponent = (componentId) => {
    const newSelected = new Set(selectedComponents);
    if (newSelected.has(componentId)) {
      newSelected.delete(componentId);
    } else {
      newSelected.add(componentId);
    }
    setSelectedComponents(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedComponents.size === components.length) {
      setSelectedComponents(new Set());
    } else {
      setSelectedComponents(new Set(components.map((c) => c.ComponentId)));
    }
  };

  // Raggruppa componenti per company
  const componentsByCompany = components.reduce((acc, comp) => {
    if (!acc[comp.TargetCompanyId]) {
      acc[comp.TargetCompanyId] = {
        companyName: comp.TargetCompanyName,
        components: [],
      };
    }
    acc[comp.TargetCompanyId].components.push(comp);
    return acc;
  }, {});

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[700px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Sincronizza Condivisioni Intercompany</DialogTitle>
          <DialogDescription>
            Seleziona i componenti da condividere con le altre company.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-y-auto">
          {/* Options */}
          <div className="space-y-2 bg-gray-50 p-3 rounded">
            <div className="flex items-center gap-2">
              <Checkbox
                id="sync-attachments"
                checked={syncAttachments}
                onCheckedChange={setSyncAttachments}
                className="bg-primary text-primary-foreground"
              />
              <label htmlFor="sync-attachments" className="text-sm cursor-pointer flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Condividi anche gli allegati tecnici
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="auto-create"
                checked={autoCreateReferences}
                onCheckedChange={setAutoCreateReferences}
                className="bg-primary text-primary-foreground"
              />
              <label htmlFor="auto-create" className="text-sm cursor-pointer flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                Crea automaticamente le richieste di condivisione
              </label>
            </div>
          </div>

          {/* Select all */}
          <div className="flex items-center justify-between bg-blue-50 p-2 rounded">
            <div className="flex items-center gap-2">
              <Checkbox
                id="select-all"
                checked={selectedComponents.size === components.length && components.length > 0}
                onCheckedChange={toggleSelectAll}
                className="bg-primary text-primary-foreground"
              />
              <label htmlFor="select-all" className="text-sm cursor-pointer font-medium">
                Seleziona tutti ({components.length})
              </label>
            </div>
            <Badge variant="secondary">
              {selectedComponents.size} / {components.length}
            </Badge>
          </div>

          {/* Components grouped by company */}
          {loading ? (
            <div className="text-center py-8 text-gray-500">Caricamento...</div>
          ) : Object.entries(componentsByCompany).length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Nessun componente intercompany trovato
            </div>
          ) : (
            Object.entries(componentsByCompany).map(([companyId, { companyName, components: comps }]) => (
              <Card key={companyId}>
                <CardHeader className="p-3 bg-gray-50">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-sm">{companyName}</span>
                    <Badge variant="outline" className="ml-auto text-[10px]">
                      {comps.length}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {comps.map((comp) => {
                    const isSelected = selectedComponents.has(comp.ComponentId);
                    const isDisabled = comp.ReferenceStatus === 'APPROVED';

                    return (
                      <div
                        key={comp.ComponentId}
                        className={`flex items-center gap-2 p-2 border-t hover:bg-gray-50 ${
                          isSelected ? 'bg-blue-50' : ''
                        }`}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleComponent(comp.ComponentId)}
                          disabled={isDisabled}
                          className="bg-primary text-primary-foreground"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{comp.ComponentCode}</span>
                            <IntercompanyBadge
                              type={comp.IntercompanyType}
                              targetCompanyName={companyName}
                              supplierCode={comp.SupplierCode}
                              status={comp.ReferenceStatus}
                            />
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {comp.ComponentDescription}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={syncing} className="bg-primary text-primary-foreground">
            Annulla
          </Button>
          <Button
            onClick={handleSync}
            disabled={selectedComponents.size === 0 || syncing}
          >
            {syncing ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Sincronizzazione...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Sincronizza ({selectedComponents.size})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default IntercompanySyncModal;
