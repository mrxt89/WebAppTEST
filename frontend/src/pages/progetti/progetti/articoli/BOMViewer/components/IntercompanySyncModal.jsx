import React, { useState, useEffect } from 'react';
import { CheckCircle, FileText, RefreshCw, Building2, Info } from 'lucide-react';
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
import { config } from '@/config';

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
  const [showInfoModal, setShowInfoModal] = useState(false);
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
      
      // Prepara i componenti selezionati per la nuova API
      const componentsToSync = Array.from(selectedComponents).map(componentId => {
        const component = components.find(comp => comp.ComponentId === componentId);
        return {
          ComponentId: component.ComponentId,
          ComponentCode: component.ItemCode,
          ComponentDescription: component.ItemDescription,
          TargetCompanyId: component.TargetCompanyId,
          TargetCompanyName: component.TargetCompanyName,
          IntercompanyType: component.DataSource,
          SupplierCode: component.TempSupplierId || component.CustSupp,
          Nature: component.Nature,
          ExistingReferenceId: null // Da implementare se necessario
        };
      });

      // Debug: Log del body completo prima di inviarlo
      const requestBody = {
        components: componentsToSync,
        syncAttachments: syncAttachments
      };
      
      console.log('=== REQUEST BODY DEBUG ===');
      console.log('Components to sync:', componentsToSync);
      console.log('Sync attachments:', syncAttachments);
      console.log('Full request body:', JSON.stringify(requestBody, null, 2));
      console.log('========================');

      // Chiama la nuova API di sincronizzazione selettiva
      const token = localStorage.getItem('token');
      const response = await fetch(`${config.API_BASE_URL}/projectArticles/sync-intercompany-components`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      // Debug: Log della risposta
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      
      const responseText = await response.text();
      console.log('Response text:', responseText);
      
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError);
        console.error('Response text that failed to parse:', responseText);
        throw new Error(`Errore parsing JSON: ${parseError.message}. Risposta: ${responseText.substring(0, 200)}...`);
      }

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

          {/* Riepilogo statistico */}
          {components.length > 0 && (
            <div className="bg-gray-50 p-3 rounded-lg mb-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                <div>
                  <div className="text-lg font-semibold text-blue-600">{components.length}</div>
                  <div className="text-xs text-gray-500">Componenti</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-green-600">
                    {Object.keys(componentsByCompany).length}
                  </div>
                  <div className="text-xs text-gray-500">Aziende</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-orange-600">
                    {components.filter(c => c.DataSource === 'TEMP_SUPPLIER').length}
                  </div>
                  <div className="text-xs text-gray-500">Temporanei</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-purple-600">
                    {components.filter(c => c.DataSource === 'CONTO_LAVORO').length}
                  </div>
                  <div className="text-xs text-gray-500">Conto Lavoro</div>
                </div>
              </div>
            </div>
          )}

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
            <Badge variant="info">
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
              <Card key={`company-${companyId}`}>
                <CardHeader className="p-3 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-blue-600" />
                      <span className="font-medium text-sm">{companyName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        {comps.length} componenti
                      </Badge>
                      <Badge variant="info" className="text-[10px]">
                        {comps.reduce((sum, comp) => sum + comp.CalculatedQuantity, 0).toFixed(1)} qtà
                      </Badge>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {comps.map(comp => comp.ItemCode).join(', ')}
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
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-blue-700">{comp.ItemCode}</span>
                          
                              <div className="flex items-center gap-1">
                                {comp.TargetProjectItemCode ? (
                                  <>
                                    <span className="text-xs text-gray-500">→</span>
                                    <span className="text-xs font-medium text-green-600">{comp.TargetProjectItemCode}</span>
                                  </>
                                ) : (
                                  <span className="text-xs text-gray-400">(codice fornitore non configurato)</span>
                                )}
                                <button
                                  type="button"
                                  className="text-gray-400 hover:text-gray-600"
                                  onClick={() => setShowInfoModal(true)}
                                  title="Informazioni sul codice articolo fornitore"
                                >
                                  <Info className="w-3 h-3" />
                                </button>
                              </div>
                    
                            <Badge 
                              variant="outline" 
                              className="text-[10px] px-1 py-0"
                            >
                              {comp.NatureDescription}
                            </Badge>
                            <Badge 
                              variant="info" 
                              className="text-[10px] px-1 py-0"
                            >
                              {comp.DataSource === 'TEMP_SUPPLIER' ? 'Temporaneo' :
                               comp.DataSource === 'CONTO_LAVORO' ? 'Conto Lavoro' :
                               comp.DataSource === 'ACQUISTO' ? 'Acquisto' : comp.DataSource}
                            </Badge>
                          </div>
                          <div className="text-xs text-gray-600 mb-1">
                            {comp.ItemDescription}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-500">
                              Livello {comp.Level} • Qty: {comp.CalculatedQuantity} {comp.UoM}
                            </span>
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

      {/* Modal informativo */}
      <Dialog open={showInfoModal} onOpenChange={setShowInfoModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-600" />
              Codice Articolo Fornitore
            </DialogTitle>
            <DialogDescription>
              Come funziona il collegamento tra codici articolo cliente e fornitore
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-sm mb-2">📋 Configurazione nel Gestionale Mago</h4>
              <p className="text-sm text-gray-700">
                Per collegare automaticamente i codici articolo tra cliente e fornitore, 
                è necessario configurare il campo <strong>"Codifica presso il fornitore"</strong> 
                nella scheda <strong>"Fornitori dell'articolo"</strong> del gestionale Mago.
              </p>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-medium text-sm mb-2">✅ Quando è configurato</h4>
              <p className="text-sm text-gray-700">
                Se il collegamento è configurato, vedrai il codice fornitore accanto al codice cliente 
                con una freccia verde: <span className="text-green-600 font-mono">→ CODICE_FORNITORE</span>
              </p>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-sm mb-2">⚠️ Quando non è configurato</h4>
              <p className="text-sm text-gray-700">
                Se il collegamento non è configurato, vedrai il messaggio 
                <span className="text-gray-500 italic"> "(codice fornitore non configurato)"</span>
              </p>
            </div>
            
            <div className="bg-yellow-50 p-4 rounded-lg">
              <h4 className="font-medium text-sm mb-2">🔧 Come configurare</h4>
              <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
                <li>Apri il gestionale Mago</li>
                <li>Vai alla scheda dell'articolo</li>
                <li>Apri la sezione "Fornitori dell'articolo"</li>
                <li>Inserisci il codice fornitore nel campo "Codifica presso il fornitore"</li>
                <li>Salva le modifiche</li>
              </ol>
            </div>
          </div>
          
          <DialogFooter>
            <Button onClick={() => setShowInfoModal(false)} variant="outline">
              Chiudi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};

export default IntercompanySyncModal;
