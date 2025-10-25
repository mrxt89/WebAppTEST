import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, AlertCircle, Replace, RefreshCw, Package } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export const TemporaryItemsPanel = ({ items, onReplace, onRefresh, loading }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [replacingItemId, setReplacingItemId] = useState(null);
  const [newItemCode, setNewItemCode] = useState('');

  const filteredItems = items.filter(item =>
    item.TemporaryCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.Description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.DescriptionExtension?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleStartReplace = (itemId) => {
    setReplacingItemId(itemId);
    setNewItemCode('');
  };

  const handleReplace = async (itemId) => {
    if (!newItemCode.trim()) {
      alert('Inserisci un codice articolo valido');
      return;
    }

    try {
      await onReplace(itemId, newItemCode.trim());
      setReplacingItemId(null);
      setNewItemCode('');
    } catch (error) {
      console.error('Error replacing item:', error);
    }
  };

  const handleCancelReplace = () => {
    setReplacingItemId(null);
    setNewItemCode('');
  };

  return (
    <div className="space-y-4">
      {/* Header con search e refresh */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Cerca articoli temporanei..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={onRefresh} variant="outline" disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Aggiorna
        </Button>
      </div>

      {/* Info alert */}
      {items.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Codici Temporanei da Gestire</AlertTitle>
          <AlertDescription>
            Questi articoli sono stati creati automaticamente con codici temporanei.
            Sostituiscili con i codici definitivi dal tuo catalogo articoli.
          </AlertDescription>
        </Alert>
      )}

      {/* Lista articoli temporanei */}
      {filteredItems.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {searchTerm
                ? 'Nessun articolo trovato con i criteri di ricerca'
                : items.length === 0
                  ? 'Nessun articolo temporaneo da gestire'
                  : 'Tutti gli articoli temporanei sono stati sostituiti'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item) => (
            <Card key={item.Id} className="border-amber-200 bg-amber-50/50">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <AlertCircle className="h-5 w-5 text-amber-600" />
                      <span className="font-mono">{item.TemporaryCode}</span>
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {item.Description}
                    </CardDescription>
                  </div>
                  <Badge variant="warning" className="ml-2">
                    Temporaneo
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Info dettagliate */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="font-medium">Creato il:</span>{' '}
                      <span className="text-muted-foreground">
                        {format(new Date(item.CreatedDate), 'dd MMM yyyy HH:mm', { locale: it })}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Creato da:</span>{' '}
                      <span className="text-muted-foreground">
                        {item.CreatedByUsername || 'Sistema'}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Progetti collegati:</span>{' '}
                      <Badge variant="outline">{item.ProjectsCount || 0}</Badge>
                    </div>
                    <div>
                      <span className="font-medium">References:</span>{' '}
                      <Badge variant="outline">{item.ReferencesCount || 0}</Badge>
                    </div>
                  </div>

                  {/* Descrizione estesa */}
                  {item.DescriptionExtension && (
                    <div className="bg-muted/50 p-3 rounded text-sm">
                      <p className="font-medium mb-1">Dettagli:</p>
                      <p className="text-muted-foreground">{item.DescriptionExtension}</p>
                    </div>
                  )}

                  {/* Note */}
                  {item.Notes && (
                    <div className="text-sm">
                      <span className="font-medium">Note:</span>{' '}
                      <span className="text-muted-foreground">{item.Notes}</span>
                    </div>
                  )}

                  {/* Azione di sostituzione */}
                  {replacingItemId === item.Id ? (
                    <div className="flex gap-2 pt-2 border-t">
                      <Input
                        placeholder="Inserisci codice articolo definitivo..."
                        value={newItemCode}
                        onChange={(e) => setNewItemCode(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && newItemCode.trim()) {
                            handleReplace(item.Id);
                          }
                        }}
                        className="font-mono"
                        autoFocus
                      />
                      <Button
                        onClick={() => handleReplace(item.Id)}
                        disabled={!newItemCode.trim()}
                      >
                        Sostituisci
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleCancelReplace}
                      >
                        Annulla
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={() => handleStartReplace(item.Id)}
                      variant="default"
                      className="w-full mt-2"
                    >
                      <Replace className="mr-2 h-4 w-4" />
                      Sostituisci con codice definitivo
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Footer info */}
      {filteredItems.length > 0 && (
        <div className="text-sm text-muted-foreground text-center pt-2">
          Mostrando {filteredItems.length} di {items.length} articoli temporanei
        </div>
      )}
    </div>
  );
};
