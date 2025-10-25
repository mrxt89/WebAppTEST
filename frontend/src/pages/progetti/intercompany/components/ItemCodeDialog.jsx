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
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const ItemCodeDialog = ({ open, onClose, onConfirm, referenceData }) => {
  const [mode, setMode] = useState('auto'); // 'auto' o 'manual'
  const [itemCode, setItemCode] = useState('');
  const [notes, setNotes] = useState('');

  const handleConfirm = () => {
    if (mode === 'manual' && !itemCode.trim()) {
      alert('Inserisci un codice articolo valido');
      return;
    }

    onConfirm(
      mode === 'auto' ? null : itemCode.trim(),
      notes.trim() || null
    );
  };

  const handleClose = () => {
    setMode('auto');
    setItemCode('');
    setNotes('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Approva Richiesta Intercompany</DialogTitle>
          <DialogDescription>
            Scegli come gestire il codice articolo per questa richiesta
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {referenceData && (
            <div className="bg-muted p-3 rounded-lg space-y-1">
              <p className="text-sm font-medium">
                Articolo: <span className="font-normal">{referenceData.SourceItemCode}</span>
              </p>
              <p className="text-sm font-medium">
                Descrizione: <span className="font-normal">{referenceData.SourceItemDescription}</span>
              </p>
              {referenceData.SourceCompanyName && (
                <p className="text-sm font-medium">
                  Da: <span className="font-normal">{referenceData.SourceCompanyName}</span>
                </p>
              )}
            </div>
          )}

          <RadioGroup value={mode} onValueChange={setMode}>
            <div className="flex items-start space-x-3 space-y-0">
              <RadioGroupItem value="auto" id="auto" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="auto" className="font-semibold cursor-pointer">
                  Crea codice temporaneo automaticamente
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Verrà generato un codice temporaneo IC_TEMP_... che potrai sostituire
                  successivamente dalla sezione "Articoli Temporanei"
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 space-y-0">
              <RadioGroupItem value="manual" id="manual" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="manual" className="font-semibold cursor-pointer">
                  Usa codice esistente
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Specifica un codice articolo già presente nel tuo catalogo
                </p>
              </div>
            </div>
          </RadioGroup>

          {mode === 'manual' && (
            <div className="space-y-2 ml-7">
              <Label htmlFor="itemCode">Codice Articolo *</Label>
              <Input
                id="itemCode"
                value={itemCode}
                onChange={(e) => setItemCode(e.target.value)}
                placeholder="Es: PROD_001"
                className="font-mono"
              />
              {!itemCode.trim() && (
                <Alert variant="warning" className="py-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Assicurati che il codice esista nel tuo catalogo articoli
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Note Approvazione (opzionale)</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Aggiungi note per questa approvazione..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Annulla
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={mode === 'manual' && !itemCode.trim()}
          >
            Approva e Crea Progetto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
