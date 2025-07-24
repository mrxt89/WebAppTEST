import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Plus, AlertCircle } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { config as appConfig } from "@/config";

const CreateElementDialog = ({
  open,
  onOpenChange,
  elementType,
  parentId,
  parentCode,
  parentDescription,
  companyId,
  onSuccess,
  categorySelected,
}) => {

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    code: "",
    description: "",
    isUniversal: false,
  });
  const [error, setError] = useState("");
  const [codeExists, setCodeExists] = useState(false);

  // Configurazione per tipo di elemento
  const elementConfig = {
    macroFamily: {
      title: "Nuova Macrofamiglia",
      codeLength: companyId === 1 ? 1 // Ricos
                    : companyId === 2 ? 1  // CBL
                    : 1, // Tecnoline
      codeHelp: `${companyId === 1 ? 1 : companyId === 2 ? 1 : 1} caratteri`,
      parentLabel: "Categoria",
      apiEndpoint: "/codingRules/macrofamilies",
    },
    family: {
      title: "Nuova Famiglia",
      codeLength:   companyId === 1 ? 3 // Ricos
                    : companyId === 2 ? 3  // CBL
                    : 3, // Tecnoline
      codeHelp: `${companyId === 1 ? 3 : companyId === 2 ? 3 : 3} caratteri`,
      parentLabel: "Macrofamiglia",
      apiEndpoint: "/codingRules/families",
    },
    type: {
      title: "Nuovo Tipo",
      codeLength: companyId === 1 ? 3 // Ricos
                    : companyId === 2 ? 3  // CBL
                    : 3, // Tecnoline
      codeHelp: `${companyId === 1 ? 3 : companyId === 2 ? 3 : 3} caratteri`,
      parentLabel: "Famiglia",
      apiEndpoint: "/codingRules/types",
    },
    alias: {
      title: "Nuovo Alias",
      codeLength: companyId === 1 ? 3 // Ricos
                    : companyId === 2 ? 3  // CBL
                    : 3, // Tecnoline
      codeHelp: `${companyId === 1 ? 3 : companyId === 2 ? 3 : 3} caratteri`,
      parentLabel: "Tipo",
      apiEndpoint: "/codingRules/aliases",
    },
  };

  // Reset form quando si apre - DEVE ESSERE PRIMA DEL RETURN CONDIZIONALE
  useEffect(() => {
    if (open) {
      setFormData({
        code: "",
        description: "",
        isUniversal: false,
      });
      setError("");
      setCodeExists(false);
    }
  }, [open]);

  // Controlla se il codice esiste già quando l'utente digita
  useEffect(() => {
    if (formData.code && categorySelected && categorySelected.length > 0) {
      const exists = categorySelected.some(
        item => item.Code.toUpperCase() === formData.code.toUpperCase()
      );
      setCodeExists(exists);
    } else {
      setCodeExists(false);
    }
  }, [formData.code, categorySelected]);

  const config = elementConfig[elementType];
  if (!config) return null;

  // Gestione submit
  const handleSubmit = async () => {
    setError("");

    // Validazione
    if (!formData.code || formData.code.length !== config.codeLength) {
      setError(`Il codice deve essere di ${config.codeLength} caratteri`);
      return;
    }

    if (!formData.description) {
      setError("La descrizione è obbligatoria");
      return;
    }

    if (codeExists) {
      setError("Il codice è già in uso");
      return;
    }

    try {
      setLoading(true);

      // Prepara i dati per l'API
      const requestData = {
        code: formData.code.toUpperCase(),
        description: formData.description,
        isUniversal: formData.isUniversal,
      };

      // Aggiungi il parent ID in base al tipo
      switch (elementType) {
        case "macroFamily":
          requestData.categoryId = parentId;
          break;
        case "family":
          requestData.macroFamilyId = parentId;
          break;
        case "type":
          requestData.familyId = parentId === "0" ? null : parentId;
          break;
        case "alias":
          requestData.typeId = parentId === "0" ? null : parentId;
          break;
      }

      // Chiamata API
      const response = await fetch(`${appConfig.API_BASE_URL}${config.apiEndpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(requestData),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Elemento creato",
          description: `${config.title} creato con successo`,
          variant: "success",
        });

        // Callback di successo con i dati del nuovo elemento
        if (onSuccess) {
          onSuccess(result.data);
        }

        // Chiudi il dialog
        onOpenChange(false);
      } else {
        throw new Error(result.msg || "Errore nella creazione");
      }
    } catch (err) {
      console.error("Error creating element:", err);
      
      // Gestione errori specifici
      let errorMessage = err.message || "Errore durante la creazione dell'elemento";
      
      // Controlla se è un errore di duplicazione
      if (errorMessage.includes("già esistente") || 
          errorMessage.includes("duplicate") || 
          errorMessage.includes("UQ_")) {
        errorMessage = `Il codice "${formData.code}" è già utilizzato per questo livello. Usa un codice diverso.`;
      }
      
      setError(errorMessage);
      
      // Mostra anche un toast per errori importanti
      if (errorMessage.includes("già")) {
        toast({
          title: "Codice duplicato",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            {config.title}
          </DialogTitle>
          <DialogDescription>
            Crea un nuovo elemento nella gerarchia di codifica
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Mostra il parent */}
          {parentCode && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <Label className="text-xs text-gray-500">{config.parentLabel}</Label>
              <div className="font-medium">
                {parentCode} - {parentDescription}
              </div>
            </div>
          )}

          {/* Campo codice */}
          <div className="space-y-2">
            <Label htmlFor="code">
              Codice <span className="text-gray-500">({config.codeHelp})</span>
            </Label>
            <div className="relative">
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase();
                  if (value.length <= config.codeLength) {
                    setFormData({ ...formData, code: value });
                  }
                }}
                placeholder={`Es: ${"X".repeat(config.codeLength)}`}
                maxLength={config.codeLength}
                className={`font-mono uppercase pr-8 ${
                  codeExists ? "border-red-500 focus:ring-red-500" : ""
                }`}
                disabled={loading}
                required
              />
              {codeExists && (
                <AlertCircle className="absolute right-2 top-2.5 h-4 w-4 text-red-500" />
              )}
            </div>
            {codeExists && (
              <p className="text-xs text-red-500">
                Questo codice è già utilizzato. Scegline uno diverso.
              </p>
            )}
          </div>

          {/* Campo descrizione */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrizione</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Inserisci una descrizione..."
              rows={3}
              disabled={loading}
              required
            />
          </div>

          {/* Switch universale - nascosto per ora */}
          <div className="flex items-center justify-between py-2 hidden">
            <div className="space-y-0.5">
              <Label htmlFor="universal">Elemento universale</Label>
              <p className="text-sm text-gray-500">
                Disponibile per tutte le aziende del gruppo
              </p>
            </div>
            <input
              type="checkbox"
              id="universal"
              checked={formData.isUniversal}
              onChange={e => setFormData({ ...formData, isUniversal: e.target.checked })}
              disabled={loading}
              className="w-5 h-5 accent-primary rounded border-gray-300 focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Messaggio di errore */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Annulla
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={loading || !formData.code || !formData.description || codeExists}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creazione...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Crea
                </>
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateElementDialog;