// ComponentDialogs.jsx - Componenti riutilizzabili per dialoghi di sostituzione e aggiunta

import React, { useState, useEffect } from "react";
import { useBOMViewer } from "../../context/BOMViewerContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Code, Plus, Search, Replace } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

// Componente dialog per scegliere il tipo di operazione (nuovo codice, manuale, esistente)
export const OperationTypeDialog = ({
  open,
  onOpenChange,
  onTypeSelect,
  title = "Scegli tipo di operazione",
  operations = [],
}) => {
  // Operazioni predefinite se non fornite
  const defaultOperations = [
    {
      id: "temp",
      icon: <Code className="h-4 w-4" />,
      title: "Nuovo codice temporaneo",
      description: "Crea automaticamente un nuovo codice temporaneo",
      color: "text-blue-600",
    },
    {
      id: "manual",
      icon: <Plus className="h-4 w-4" />,
      title: "Nuovo codice manuale",
      description: "Inserisci manualmente il codice e la descrizione",
      color: "text-green-600",
    },
    {
      id: "existing",
      icon: <Replace className="h-4 w-4" />,
      title: "Codice da ERP-Progetti",
      description: "Seleziona un codice esistente nel sistema",
      color: "text-amber-600",
    },
  ];

  // Usa le operazioni fornite o quelle predefinite
  const displayOperations =
    operations.length > 0 ? operations : defaultOperations;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {displayOperations.map((op) => (
            <div
              key={op.id}
              className="p-3 border rounded-md cursor-pointer hover:bg-gray-50"
              onClick={() => onTypeSelect(op.id)}
            >
              <div
                className={`flex items-center gap-2 font-medium ${op.color}`}
              >
                {op.icon}
                {op.title}
              </div>
              <p className="text-sm text-gray-500 mt-1">{op.description}</p>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Componente dialog per inserimento manuale di un nuovo codice
export const ManualCodeDialog = ({
  open,
  onOpenChange,
  onSave,
  initialData = {},
  title = "Inserisci nuovo codice manuale",
}) => {
  const [formData, setFormData] = useState({
    code: "",
    description: "",
    nature: "22413312", // Semilavorato di default
    uom: "PZ",
    quantity: 1,
    ...initialData,
  });

  // Aggiorna lo stato quando cambiano i dati iniziali
  useEffect(() => {
    if (initialData) {
      setFormData((prev) => ({
        ...prev,
        ...initialData,
      }));
    }
  }, [initialData]);

  const handleSave = () => {
    // Validazione dei campi obbligatori
    if (!formData.code || !formData.description) {
      toast({
        title: "Dati incompleti",
        description: "Codice e descrizione sono campi obbligatori",
        variant: "destructive",
      });
      return;
    }

    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="manualCode">Codice Articolo*</Label>
              <Input
                id="manualCode"
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value })
                }
                placeholder="Inserisci un codice univoco"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="manualDescription">Descrizione*</Label>
              <Input
                id="manualDescription"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Descrizione del nuovo articolo"
              />
            </div>

            <div>
              <Label htmlFor="manualNature">Natura</Label>
              <Select
                value={formData.nature}
                onValueChange={(value) =>
                  setFormData({ ...formData, nature: value })
                }
              >
                <SelectTrigger id="manualNature">
                  <SelectValue placeholder="Natura articolo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="22413312">Semilavorato</SelectItem>
                  <SelectItem value="22413313">Prodotto Finito</SelectItem>
                  <SelectItem value="22413314">Acquisto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="manualUoM">Unità di Misura</Label>
              <Input
                id="manualUoM"
                value={formData.uom}
                onChange={(e) =>
                  setFormData({ ...formData, uom: e.target.value })
                }
                placeholder="PZ"
              />
            </div>

            {/* Campo quantità - mostrato se necessario per l'aggiunta */}
            {formData.showQuantity && (
              <div>
                <Label htmlFor="quantity">Quantità</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.001"
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      quantity: parseFloat(e.target.value) || 1,
                    })
                  }
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button onClick={handleSave}>
            {formData.actionLabel || "Salva"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Componente per la selezione di un codice esistente (da ERP o progetti)
export const ExistingCodeDialog = ({
  open,
  onOpenChange,
  onSelect,
  title = "Seleziona codice esistente",
}) => {
  const { getERPItems, getAvailableItems } = useBOMViewer();

  const [activeTab, setActiveTab] = useState("erp");
  const [searchQuery, setSearchQuery] = useState("");
  const [erpItems, setErpItems] = useState([]);
  const [projectItems, setProjectItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // Funzione per eseguire la ricerca in base alla tab attiva
  const handleSearch = async () => {
    try {
      setLoading(true);

      if (activeTab === "erp") {
        const items = await getERPItems(searchQuery);
        setErpItems(Array.isArray(items) ? items : []);
      } else if (activeTab === "projects") {
        const items = await getAvailableItems(searchQuery);
        setProjectItems(Array.isArray(items) ? items : []);
      }
    } catch (error) {
      console.error("Errore nella ricerca articoli:", error);
      toast({
        title: "Errore",
        description:
          "Si è verificato un errore durante la ricerca degli articoli",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Carica i dati iniziali quando si apre il dialog
  useEffect(() => {
    if (open) {
      handleSearch();
    }
  }, [open, activeTab]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="erp">Codici ERP</TabsTrigger>
              <TabsTrigger value="projects">Codici Progetti</TabsTrigger>
            </TabsList>

            <div className="flex gap-2 mt-4">
              <div className="flex-1">
                <Input
                  placeholder="Cerca articolo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
              <Button onClick={handleSearch} disabled={loading}>
                <Search className="h-4 w-4 mr-2" />
                Cerca
              </Button>
            </div>

            <TabsContent
              value="erp"
              className="border rounded mt-2 max-h-[300px] overflow-auto"
            >
              {loading ? (
                <div className="p-4 text-center">
                  <p className="text-gray-500">Caricamento in corso...</p>
                </div>
              ) : erpItems.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  Nessun risultato trovato. Prova a cercare un codice.
                </div>
              ) : (
                <div className="divide-y">
                  {erpItems.map((item) => (
                    <div
                      key={item.Item}
                      className="p-3 hover:bg-gray-50 cursor-pointer"
                      onClick={() => onSelect(item)}
                    >
                      <div className="font-medium">{item.Item}</div>
                      <div className="text-sm text-gray-500">
                        {item.Description}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        UoM: {item.BaseUoM || "PZ"} | Natura:{" "}
                        {item.Nature === 22413312
                          ? "Semilavorato"
                          : item.Nature === 22413313
                            ? "Prodotto Finito"
                            : item.Nature === 22413314
                              ? "Acquisto"
                              : "Altro"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent
              value="projects"
              className="border rounded mt-2 max-h-[300px] overflow-auto"
            >
              {loading ? (
                <div className="p-4 text-center">
                  <p className="text-gray-500">Caricamento in corso...</p>
                </div>
              ) : projectItems.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  Nessun risultato trovato. Prova a cercare un codice progetto.
                </div>
              ) : (
                <div className="divide-y">
                  {projectItems.map((item) => (
                    <div
                      key={item.Id}
                      className="p-3 hover:bg-gray-50 cursor-pointer"
                      onClick={() => onSelect(item)}
                    >
                      <div className="font-medium">{item.Item}</div>
                      <div className="text-sm text-gray-500">
                        {item.Description}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        UoM: {item.BaseUoM || "PZ"} | Natura:{" "}
                        {item.Nature === 22413312
                          ? "Semilavorato"
                          : item.Nature === 22413313
                            ? "Prodotto Finito"
                            : item.Nature === 22413314
                              ? "Acquisto"
                              : "Altro"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
