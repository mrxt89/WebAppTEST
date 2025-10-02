import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Package,
  Clock,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Loader2,
  Copy,
  Info,
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import axios from '@/lib/axios';

/**
 * BOMVersionSelector - Componente per selezionare la versione BOM da copiare
 * @param {boolean} isOpen - Se il dialog è aperto
 * @param {Function} onClose - Callback per chiudere il dialog
 * @param {Object} sourceItem - Articolo sorgente
 * @param {Function} onVersionSelected - Callback quando viene selezionata una versione
 * @param {Object} project - Progetto corrente
 */
const BOMVersionSelector = ({
  isOpen,
  onClose,
  sourceItem,
  onVersionSelected,
  project,
}) => {
  const [versions, setVersions] = useState([]);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Carica le versioni quando si apre il dialog
  useEffect(() => {
    if (isOpen && sourceItem) {
      loadBOMVersions();
    }
  }, [isOpen, sourceItem]);

  const loadBOMVersions = async () => {
    // Prova diverse proprietà per l'ID dell'articolo
    const itemId = sourceItem?.Id || sourceItem?.id || sourceItem?.ItemId || sourceItem?.itemId;
    
    if (!itemId) {
      setError('Articolo sorgente non valido - manca l\'ID');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const url = `/bom-costing/versions/${itemId}`;
      const response = await axios.get(url);
      
      if (response.data.success) {
        setVersions(response.data.data);
        
        // Se c'è solo una versione, selezionala automaticamente
        if (response.data.data.length === 1) {
          setSelectedVersion(response.data.data[0]);
        }
      } else {
        setError(response.data.message || 'Errore nel caricamento delle versioni');
      }
    } catch (error) {
      console.error('Error loading BOM versions:', error);
      
      if (error.response?.status === 404) {
        setError('Articolo non trovato nel sistema');
      } else if (error.response?.status === 500) {
        setError('Errore del server nel caricamento delle versioni');
      } else {
        setError(`Errore nel caricamento delle versioni BOM: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVersionSelect = (version) => {
    setSelectedVersion(version);
  };

  const handleConfirm = () => {
    if (!selectedVersion) {
      toast({
        title: "Errore",
        description: "Seleziona una versione BOM",
        variant: "destructive",
      });
      return;
    }

    // Chiama il callback con la versione selezionata
    onVersionSelected(selectedVersion);
    // NON chiudere il dialog - lascia che BOMImportWizard gestisca la transizione
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('it-IT', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };



  const getVersionPriority = (version) => {
    // Logica per determinare la priorità della versione
    if (version.BOMStatus === 2) return 1; // In Produzione ha priorità massima
    if (version.BOMStatus === 1) return 2; // Bozza ha priorità media
    return 3; // Altri stati hanno priorità bassa
  };

  // Ordina le versioni per priorità e data
  const sortedVersions = [...versions].sort((a, b) => {
    const priorityA = getVersionPriority(a);
    const priorityB = getVersionPriority(b);
    
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    
    // Se stessa priorità, ordina per data di creazione (più recente prima)
    return new Date(b.CreatedDate) - new Date(a.CreatedDate);
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Package className="h-5 w-5 mr-2" />
            Seleziona Versione BOM da Copiare
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Loader2 className="h-8 w-8 mx-auto animate-spin mb-4" />
                <p className="text-gray-600">Caricamento versioni BOM...</p>
              </div>
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : versions.length === 0 ? (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Nessuna versione BOM trovata per l'articolo "{sourceItem?.Item || sourceItem?.item || sourceItem?.BOM || sourceItem?.Description || sourceItem?.description}"
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {/* Informazioni articolo sorgente */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-gray-600">Articolo Sorgente</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center space-x-4">
                    <div>
                      <p className="font-medium">{sourceItem?.Item || sourceItem?.item || sourceItem?.BOM}</p>
                      <p className="text-sm text-gray-600">{sourceItem?.Description || sourceItem?.description}</p>
                    </div>
                    <Badge variant="outline">
                      {sourceItem?.Nature === 22413312 ? 'Semilavorato' :
                       sourceItem?.Nature === 22413313 ? 'Prodotto Finito' :
                       sourceItem?.Nature === 22413314 ? 'Acquisto' : 'Altro'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Lista versioni */}
              <div>
                <h3 className="text-lg font-medium mb-3">
                  Versioni Disponibili ({versions.length})
                </h3>
                <ScrollArea className="h-96">
                  <div className="space-y-3">
                    {sortedVersions.map((version) => (
                      <Card
                        key={version.Id}
                        className={`cursor-pointer transition-all ${
                          selectedVersion?.Id === version.Id
                            ? 'ring-2 ring-blue-500 bg-blue-50'
                            : 'hover:bg-gray-50'
                        }`}
                        onClick={() => handleVersionSelect(version)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h4 className="font-medium">
                                  Versione {version.Version}
                                </h4>
                                {version.Id === selectedVersion?.Id && (
                                  <CheckCircle className="h-5 w-5 text-blue-600" />
                                )}
                              </div>
                              
                              <p className="text-sm text-gray-600 mb-2">
                                {version.Description || 'Nessuna descrizione'}
                              </p>
                              
                              <div className="flex items-center space-x-4 text-sm text-gray-500">
                                <div className="flex items-center">
                                  <Clock className="h-4 w-4 mr-1" />
                                  Creata: {formatDate(version.CreatedDate)}
                                </div>
                                {version.LastCalculatedCost && (
                                  <div className="flex items-center">
                                    <DollarSign className="h-4 w-4 mr-1" />
                                    Costo: €{version.LastCalculatedCost.toFixed(2)}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <p className="text-sm font-medium text-gray-900">
                                BOM: {version.BOM}
                              </p>
                              <p className="text-xs text-gray-500">
                                ID: {version.Id}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annulla
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedVersion || loading}
            className="flex items-center"
          >
            <Copy className="h-4 w-4 mr-2" />
            Copia Versione Selezionata
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BOMVersionSelector;
