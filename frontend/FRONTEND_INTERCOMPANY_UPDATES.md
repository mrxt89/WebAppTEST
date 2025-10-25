# Aggiornamenti Frontend Intercompany con Gestione Progetti

## Panoramica

Questo documento descrive tutti gli aggiornamenti necessari al frontend per supportare la nuova gestione progetti Intercompany.

---

## 1. Hook: useProjectArticlesActions.js

**File**: `frontend/src/hooks/useProjectArticlesActions.js`

### Funzioni da Modificare:

#### A. `syncIntercompanyComponents`

**PRIMA:**
```javascript
const syncIntercompanyComponents = useCallback(
  async (components, syncAttachments = true) => {
    const url = `${config.API_BASE_URL}/projectArticles/sync-intercompany-components`;
    const data = await makeRequest(url, {
      method: 'POST',
      body: JSON.stringify({ components, syncAttachments })
    });
    return data;
  },
  [makeRequest]
);
```

**DOPO:**
```javascript
const syncIntercompanyComponents = useCallback(
  async (components, projectId, syncAttachments = true) => {
    const url = `${config.API_BASE_URL}/projectArticles/sync-intercompany-components`;
    const data = await makeRequest(url, {
      method: 'POST',
      body: JSON.stringify({
        components,
        projectId,  // NUOVO PARAMETRO OBBLIGATORIO
        syncAttachments
      })
    });
    return data;
  },
  [makeRequest]
);
```

#### B. `respondToIntercompanyRequest`

**PRIMA:**
```javascript
const respondToIntercompanyRequest = useCallback(
  async (referenceId, action, notes = null) => {
    const url = `${config.API_BASE_URL}/projectArticles/intercompany/references/${referenceId}/respond`;
    const data = await makeRequest(url, {
      method: 'POST',
      body: JSON.stringify({ action, notes })
    });
    return data;
  },
  [makeRequest]
);
```

**DOPO:**
```javascript
const respondToIntercompanyRequest = useCallback(
  async (referenceId, action, notes = null, targetItemCode = null, createTemporaryIfMissing = true) => {
    const url = `${config.API_BASE_URL}/projectArticles/intercompany/references/${referenceId}/respond`;
    const data = await makeRequest(url, {
      method: 'POST',
      body: JSON.stringify({
        action,
        notes,
        targetItemCode,              // NUOVO PARAMETRO
        createTemporaryIfMissing     // NUOVO PARAMETRO
      })
    });
    return data;
  },
  [makeRequest]
);
```

### Funzioni da Aggiungere:

```javascript
// 1. Recupera articoli temporanei Intercompany
const getTemporaryIntercompanyItems = useCallback(
  async () => {
    const url = `${config.API_BASE_URL}/projectArticles/intercompany/temporary-items`;
    const data = await makeRequest(url);
    return data || { items: [], totalItems: 0 };
  },
  [makeRequest]
);

// 2. Sostituisci articolo temporaneo con definitivo
const replaceTemporaryItem = useCallback(
  async (temporaryItemId, definitiveItemCode) => {
    const url = `${config.API_BASE_URL}/projectArticles/intercompany/temporary-items/${temporaryItemId}/replace`;
    const data = await makeRequest(url, {
      method: 'POST',
      body: JSON.stringify({ definitiveItemCode })
    });
    return data;
  },
  [makeRequest]
);

// 3. Recupera dettagli reference con progetti
const getReferenceWithProjects = useCallback(
  async (referenceId) => {
    const url = `${config.API_BASE_URL}/projectArticles/intercompany/references/${referenceId}/details`;
    const data = await makeRequest(url);
    return data || { reference: null };
  },
  [makeRequest]
);
```

### Export da Aggiornare:

```javascript
return {
  // ... funzioni esistenti ...
  syncIntercompanyComponents,
  respondToIntercompanyRequest,
  // AGGIUNGI QUESTE:
  getTemporaryIntercompanyItems,
  replaceTemporaryItem,
  getReferenceWithProjects
};
```

---

## 2. Componente: IntercompanyDashboard.jsx

**File**: `frontend/src/pages/progetti/intercompany/IntercompanyDashboard.jsx`

### Modifiche Necessarie:

#### A. Importa le nuove funzioni hook:
```javascript
const {
  getIntercompanyRequests,
  respondToIntercompanyRequest,
  getReferenceAttachments,
  updateReferenceNotes,
  getTemporaryIntercompanyItems,      // NUOVO
  replaceTemporaryItem,               // NUOVO
  getReferenceWithProjects            // NUOVO
} = useProjectArticlesActions();
```

#### B. Aggiungi stato per articoli temporanei:
```javascript
const [temporaryItems, setTemporaryItems] = useState([]);
const [showTemporaryItemsDialog, setShowTemporaryItemsDialog] = useState(false);
const [showItemCodeDialog, setShowItemCodeDialog] = useState(false);
const [selectedReference, setSelectedReference] = useState(null);
```

#### C. Funzione per caricare articoli temporanei:
```javascript
const loadTemporaryItems = useCallback(async () => {
  try {
    const result = await getTemporaryIntercompanyItems();
    if (result.success) {
      setTemporaryItems(result.items);
    }
  } catch (error) {
    console.error('Error loading temporary items:', error);
  }
}, [getTemporaryIntercompanyItems]);

useEffect(() => {
  loadTemporaryItems();
}, [loadTemporaryItems]);
```

#### D. Modifica funzione handleApprove:

**PRIMA:**
```javascript
const handleApprove = async (referenceId, notes) => {
  try {
    setApproving(true);
    const result = await respondToIntercompanyRequest(referenceId, 'APPROVE', notes);
    if (result.success) {
      toast.success('Richiesta approvata con successo');
      await loadRequests();
    } else {
      toast.error(result.msg || 'Errore durante l\'approvazione');
    }
  } catch (error) {
    console.error('Error approving request:', error);
    toast.error('Errore durante l\'approvazione');
  } finally {
    setApproving(false);
  }
};
```

**DOPO:**
```javascript
const handleApprove = async (referenceId, notes, targetItemCode = null) => {
  try {
    setApproving(true);

    // Mostra dialog per scegliere se inserire codice manualmente o creare temporaneo
    if (!targetItemCode) {
      setSelectedReference(referenceId);
      setShowItemCodeDialog(true);
      return;
    }

    const result = await respondToIntercompanyRequest(
      referenceId,
      'APPROVE',
      notes,
      targetItemCode,           // Può essere NULL per creazione automatica
      !targetItemCode           // createTemporaryIfMissing = true se targetItemCode è NULL
    );

    if (result.success) {
      const message = result.targetProjectId
        ? `Richiesta approvata. Progetto: ${result.targetProjectId}, Articolo: ${result.targetItemCode}`
        : 'Richiesta approvata con successo';
      toast.success(message);
      await loadRequests();
      await loadTemporaryItems(); // Ricarica articoli temporanei
    } else {
      toast.error(result.msg || 'Errore durante l\'approvazione');
    }
  } catch (error) {
    console.error('Error approving request:', error);
    toast.error('Errore durante l\'approvazione');
  } finally {
    setApproving(false);
    setShowItemCodeDialog(false);
  }
};
```

#### E. Aggiungi nuovo tab "Articoli Temporanei":

Nella sezione tabs:
```javascript
<Tabs value={activeTab} onValueChange={setActiveTab}>
  <TabsList>
    <TabsTrigger value="inbox">In arrivo ({totalIncoming})</TabsTrigger>
    <TabsTrigger value="outbox">In uscita ({totalOutgoing})</TabsTrigger>
    <TabsTrigger value="temp-items">
      Articoli Temporanei
      {temporaryItems.length > 0 && (
        <Badge variant="destructive" className="ml-2">{temporaryItems.length}</Badge>
      )}
    </TabsTrigger>
  </TabsList>

  <TabsContent value="inbox">...</TabsContent>
  <TabsContent value="outbox">...</TabsContent>

  {/* NUOVO TAB */}
  <TabsContent value="temp-items">
    <TemporaryItemsPanel
      items={temporaryItems}
      onReplace={handleReplaceTemporaryItem}
      onRefresh={loadTemporaryItems}
    />
  </TabsContent>
</Tabs>
```

---

## 3. Nuovo Componente: ItemCodeDialog.jsx

**File**: `frontend/src/pages/progetti/intercompany/components/ItemCodeDialog.jsx`

```javascript
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export const ItemCodeDialog = ({ open, onClose, onConfirm, referenceId }) => {
  const [mode, setMode] = useState('auto'); // 'auto' o 'manual'
  const [itemCode, setItemCode] = useState('');

  const handleConfirm = () => {
    if (mode === 'auto') {
      onConfirm(referenceId, null, null); // Crea codice temporaneo
    } else {
      onConfirm(referenceId, null, itemCode); // Usa codice manuale
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-width-[500px]">
        <DialogHeader>
          <DialogTitle>Codice Articolo</DialogTitle>
          <DialogDescription>
            Scegli come gestire il codice articolo per questa richiesta
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <RadioGroup value={mode} onValueChange={setMode}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="auto" id="auto" />
              <Label htmlFor="auto">
                Crea codice temporaneo automaticamente
                <p className="text-sm text-muted-foreground">
                  Verrà creato un codice IC_TEMP_... che potrai sostituire successivamente
                </p>
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <RadioGroupItem value="manual" id="manual" />
              <Label htmlFor="manual">
                Inserisci codice esistente
                <p className="text-sm text-muted-foreground">
                  Specifica un codice articolo già presente nel tuo catalogo
                </p>
              </Label>
            </div>
          </RadioGroup>

          {mode === 'manual' && (
            <div className="space-y-2">
              <Label htmlFor="itemCode">Codice Articolo</Label>
              <Input
                id="itemCode"
                value={itemCode}
                onChange={(e) => setItemCode(e.target.value)}
                placeholder="Inserisci codice articolo..."
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annulla
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={mode === 'manual' && !itemCode.trim()}
          >
            Conferma
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
```

---

## 4. Nuovo Componente: TemporaryItemsPanel.jsx

**File**: `frontend/src/pages/progetti/intercompany/components/TemporaryItemsPanel.jsx`

```javascript
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, AlertCircle, Replace } from 'lucide-react';
import { format } from 'date-fns';

export const TemporaryItemsPanel = ({ items, onReplace, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [replacingItemId, setReplacingItemId] = useState(null);
  const [newItemCode, setNewItemCode] = useState('');

  const filteredItems = items.filter(item =>
    item.TemporaryCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.Description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleReplace = async (itemId) => {
    if (!newItemCode.trim()) {
      alert('Inserisci un codice articolo valido');
      return;
    }

    await onReplace(itemId, newItemCode);
    setReplacingItemId(null);
    setNewItemCode('');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Cerca articoli temporanei..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={onRefresh} variant="outline">
          Aggiorna
        </Button>
      </div>

      {filteredItems.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {searchTerm ? 'Nessun articolo trovato' : 'Nessun articolo temporaneo da gestire'}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item) => (
            <Card key={item.Id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-amber-500" />
                      {item.TemporaryCode}
                    </CardTitle>
                    <CardDescription>{item.Description}</CardDescription>
                  </div>
                  <Badge variant="warning">Temporaneo</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground">
                    <p>Creato il: {format(new Date(item.CreatedDate), 'dd/MM/yyyy HH:mm')}</p>
                    <p>Creato da: {item.CreatedByUsername}</p>
                    <p>Progetti: {item.ProjectsCount} | References: {item.ReferencesCount}</p>
                  </div>

                  {item.DescriptionExtension && (
                    <p className="text-sm bg-muted p-2 rounded">{item.DescriptionExtension}</p>
                  )}

                  {replacingItemId === item.Id ? (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Codice articolo definitivo..."
                        value={newItemCode}
                        onChange={(e) => setNewItemCode(e.target.value)}
                      />
                      <Button onClick={() => handleReplace(item.Id)}>
                        Sostituisci
                      </Button>
                      <Button variant="outline" onClick={() => setReplacingItemId(null)}>
                        Annulla
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={() => setReplacingItemId(item.Id)}
                      variant="outline"
                      className="w-full"
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
    </div>
  );
};
```

---

## 5. Aggiornamento IntercompanyRequestDetailsPanel.jsx

**File**: `frontend/src/pages/progetti/intercompany/components/IntercompanyRequestDetailsPanel.jsx`

### Modifiche:

#### A. Usa getReferenceWithProjects invece delle chiamate separate:

**PRIMA:**
```javascript
const loadReferenceDetails = async () => {
  // Carica dettagli...
};
```

**DOPO:**
```javascript
const loadReferenceDetails = async () => {
  try {
    const result = await getReferenceWithProjects(request.ReferenceID);
    if (result.success && result.reference) {
      setReferenceDetails(result.reference);

      // Mostra informazioni progetto
      if (result.reference.SourceProjectName) {
        console.log('Progetto sorgente:', result.reference.SourceProjectName);
      }
      if (result.reference.TargetProjectName) {
        console.log('Progetto target:', result.reference.TargetProjectName);
      }
      if (result.reference.IsTemporaryCode) {
        // Mostra badge o warning per codice temporaneo
      }
    }
  } catch (error) {
    console.error('Error loading reference details:', error);
  }
};
```

#### B. Aggiungi sezione per visualizzare progetti:

```javascript
{referenceDetails && (
  <div className="space-y-4">
    {/* Progetto Sorgente */}
    {referenceDetails.SourceProjectName && (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Progetto Sorgente</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-semibold">{referenceDetails.SourceProjectName}</p>
          <p className="text-sm text-muted-foreground">{referenceDetails.SourceProjectDescription}</p>
          <Badge variant="outline">{referenceDetails.SourceProjectStatus}</Badge>
        </CardContent>
      </Card>
    )}

    {/* Progetto Target (se approvato) */}
    {referenceDetails.TargetProjectName && (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Progetto Target Creato</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-semibold">{referenceDetails.TargetProjectName}</p>
          <p className="text-sm text-muted-foreground">{referenceDetails.TargetProjectDescription}</p>
          <Badge variant="outline">{referenceDetails.TargetProjectStatus}</Badge>
        </CardContent>
      </Card>
    )}

    {/* Warning per codice temporaneo */}
    {referenceDetails.IsTemporaryCode === 1 && (
      <Alert variant="warning">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Codice Temporaneo</AlertTitle>
        <AlertDescription>
          Questo articolo usa un codice temporaneo ({referenceDetails.TargetItemCode}).
          Sostituiscilo con un codice definitivo dalla sezione "Articoli Temporanei".
        </AlertDescription>
      </Alert>
    )}
  </div>
)}
```

---

## 6. Aggiornamento BOMViewer per passare projectId

**File**: `frontend/src/pages/progetti/progetti/articoli/BOMViewer/index.jsx`

### Modifica chiamata sincronizzazione:

**PRIMA:**
```javascript
const handleSync = async (selectedComponents) => {
  await syncIntercompanyComponents(selectedComponents, true);
};
```

**DOPO:**
```javascript
const handleSync = async (selectedComponents) => {
  // Assumi che projectId sia disponibile nel contesto o props
  await syncIntercompanyComponents(selectedComponents, projectId, true);
};
```

---

## Riepilogo Modifiche

### Backend ✅ COMPLETATO
- [x] Aggiornate queries in `projectArticlesManagement.js`
- [x] Aggiornate routes in `projectArticlesRoutes.js`
- [x] Aggiunte nuove stored procedures SQL

### Frontend 📝 DA FARE
- [ ] Aggiornare `useProjectArticlesActions.js`
- [ ] Creare `ItemCodeDialog.jsx`
- [ ] Creare `TemporaryItemsPanel.jsx`
- [ ] Aggiornare `IntercompanyDashboard.jsx`
- [ ] Aggiornare `IntercompanyRequestDetailsPanel.jsx`
- [ ] Aggiornare `BOMViewer/index.jsx`

### File da creare/modificare:
1. `frontend/src/hooks/useProjectArticlesActions.js` - MODIFICARE
2. `frontend/src/pages/progetti/intercompany/IntercompanyDashboard.jsx` - MODIFICARE
3. `frontend/src/pages/progetti/intercompany/components/ItemCodeDialog.jsx` - CREARE
4. `frontend/src/pages/progetti/intercompany/components/TemporaryItemsPanel.jsx` - CREARE
5. `frontend/src/pages/progetti/intercompany/components/IntercompanyRequestDetailsPanel.jsx` - MODIFICARE
6. `frontend/src/pages/progetti/progetti/articoli/BOMViewer/index.jsx` - MODIFICARE

---

## Note Importanti

1. **projectId** è ora OBBLIGATORIO quando si sincronizzano componenti
2. Quando si approva, il backend crea automaticamente:
   - Il progetto target (se non esiste)
   - L'articolo (temporaneo o specificato)
3. Gli articoli temporanei hanno prefisso `IC_TEMP_`
4. Devono essere sostituiti con codici definitivi
