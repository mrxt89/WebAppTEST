import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash2, Save, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { swal } from "@/lib/common";
import { config } from "@/config";

const DescriptionRulesTab = () => {
  const { user } = useAuth();
  const [characteristics, setCharacteristics] = useState([]);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState("characteristics");
  
  // Dialog states
  const [charDialogOpen, setCharDialogOpen] = useState(false);
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [editingChar, setEditingChar] = useState(null);
  const [editingRule, setEditingRule] = useState(null);
  
  // Form states
  const [charForm, setCharForm] = useState({
    CharacteristicCode: "",
    CharacteristicName: "",
    FormatTemplate: "",
    UnitOfMeasure: "",
    DisplayOrder: 0,
    IsActive: true
  });
  
  const [ruleForm, setRuleForm] = useState({
    MacroFamilyId: null,
    FamilyId: null,
    TypeId: null,
    CharacteristicCode: "",
    AppendOrder: 1,
    Separator: " - ",
    IsActive: true
  });

  // Load data
  useEffect(() => {
    loadCharacteristics();
    loadRules();
    loadCategoriesData();
  }, []);

  const loadCategoriesData = async () => {
    try {
      const cats = await loadCategories(user?.CompanyId || 1);
      setCategories(cats || []);
    } catch (error) {
      console.error("Error loading categories:", error);
    }
  };


  const loadCharacteristics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${config.API_BASE_URL}/codingRules/description/characteristics`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setCharacteristics(data.data || []);
      }
    } catch (error) {
      console.error("Error loading characteristics:", error);
      swal.fire({
        title: "Errore",
        text: "Errore nel caricamento delle caratteristiche",
        icon: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadRules = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${config.API_BASE_URL}/codingRules/description/rules`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setRules(data.data || []);
      }
    } catch (error) {
      console.error("Error loading rules:", error);
      swal.fire({
        title: "Errore",
        text: "Errore nel caricamento delle regole",
        icon: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCharacteristic = async () => {
    try {
      setLoading(true);
      const url = editingChar
        ? `${config.API_BASE_URL}/codingRules/description/characteristics/${editingChar.Id}`
        : `${config.API_BASE_URL}/codingRules/description/characteristics`;
      
      const method = editingChar ? "PUT" : "POST";
      
      // Salva la caratteristica
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(charForm),
      });
      
      const data = await response.json();
      
      if (data.success) {
        swal.fire({
          title: "Successo",
          text: editingChar ? "Caratteristica aggiornata" : "Caratteristica creata",
          icon: "success",
        });
        setCharDialogOpen(false);
        setEditingChar(null);
        setCharForm({
          CharacteristicCode: "",
          CharacteristicName: "",
          FormatTemplate: "",
          UnitOfMeasure: "",
          DisplayOrder: 0,
          IsActive: true
        });
        loadCharacteristics();
      } else {
        throw new Error(data.msg || "Errore nel salvataggio");
      }
    } catch (error) {
      console.error("Error saving characteristic:", error);
      swal.fire({
        title: "Errore",
        text: error.message || "Errore nel salvataggio della caratteristica",
        icon: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRule = async () => {
    try {
      setLoading(true);
      const url = editingRule
        ? `${config.API_BASE_URL}/codingRules/description/rules/${editingRule.Id}`
        : `${config.API_BASE_URL}/codingRules/description/rules`;
      
      const method = editingRule ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(ruleForm),
      });
      
      const data = await response.json();
      
      if (data.success) {
        swal.fire({
          title: "Successo",
          text: editingRule ? "Regola aggiornata" : "Regola creata",
          icon: "success",
        });
        setRuleDialogOpen(false);
        setEditingRule(null);
        setRuleForm({
          MacroFamilyId: null,
          FamilyId: null,
          TypeId: null,
          CharacteristicCode: "",
          AppendOrder: 1,
          Separator: " - ",
          IsActive: true
        });
        loadRules();
      } else {
        throw new Error(data.msg || "Errore nel salvataggio");
      }
    } catch (error) {
      console.error("Error saving rule:", error);
      swal.fire({
        title: "Errore",
        text: error.message || "Errore nel salvataggio della regola",
        icon: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCharacteristic = async (id) => {
    const result = await swal.fire({
      title: "Conferma eliminazione",
      text: "Sei sicuro di voler eliminare questa caratteristica?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Elimina",
      cancelButtonText: "Annulla",
    });

    if (result.isConfirmed) {
      try {
        setLoading(true);
        const response = await fetch(
          `${config.API_BASE_URL}/codingRules/description/characteristics/${id}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        const data = await response.json();
        
        if (data.success) {
          swal.fire({
            title: "Successo",
            text: "Caratteristica eliminata",
            icon: "success",
          });
          loadCharacteristics();
        } else {
          throw new Error(data.msg || "Errore nell'eliminazione");
        }
      } catch (error) {
        console.error("Error deleting characteristic:", error);
        swal.fire({
          title: "Errore",
          text: error.message || "Errore nell'eliminazione della caratteristica",
          icon: "error",
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDeleteRule = async (id) => {
    const result = await swal.fire({
      title: "Conferma eliminazione",
      text: "Sei sicuro di voler eliminare questa regola?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Elimina",
      cancelButtonText: "Annulla",
    });

    if (result.isConfirmed) {
      try {
        setLoading(true);
        const response = await fetch(
          `${config.API_BASE_URL}/codingRules/description/rules/${id}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        const data = await response.json();
        
        if (data.success) {
          swal.fire({
            title: "Successo",
            text: "Regola eliminata",
            icon: "success",
          });
          loadRules();
        } else {
          throw new Error(data.msg || "Errore nell'eliminazione");
        }
      } catch (error) {
        console.error("Error deleting rule:", error);
        swal.fire({
          title: "Errore",
          text: error.message || "Errore nell'eliminazione della regola",
          icon: "error",
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const openEditCharacteristic = (char) => {
    setEditingChar(char);
    setCharForm({
      CharacteristicCode: char.CharacteristicCode,
      CharacteristicName: char.CharacteristicName,
      FormatTemplate: char.FormatTemplate,
      UnitOfMeasure: char.UnitOfMeasure || "",
      DisplayOrder: char.DisplayOrder || 0,
      IsActive: char.IsActive !== false
    });
    
    setCharDialogOpen(true);
  };

  const openEditRule = (rule) => {
    setEditingRule(rule);
    setRuleForm({
      MacroFamilyId: rule.MacroFamilyId || null,
      FamilyId: rule.FamilyId || null,
      TypeId: rule.TypeId || null,
      CharacteristicCode: rule.CharacteristicCode,
      AppendOrder: rule.AppendOrder || 1,
      Separator: rule.Separator || " - ",
      IsActive: rule.IsActive !== false
    });
    setRuleDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <TabsList>
          <TabsTrigger value="characteristics">Caratteristiche Tecniche</TabsTrigger>
          <TabsTrigger value="rules">Regole di Descrizione</TabsTrigger>
        </TabsList>

        <TabsContent value="characteristics" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Caratteristiche Tecniche</h3>
            <Button onClick={() => {
              setEditingChar(null);
              setCharForm({
                CharacteristicCode: "",
                CharacteristicName: "",
                FormatTemplate: "",
                UnitOfMeasure: "",
                DisplayOrder: 0,
                IsActive: true
              });
              setCharDialogOpen(true);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Nuova Caratteristica
            </Button>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Codice</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Unita</TableHead>
                  <TableHead>Ordine</TableHead>
                  <TableHead>Attiva</TableHead>
                  <TableHead>Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {characteristics.map((char) => (
                  <TableRow key={char.Id}>
                    <TableCell>{char.CharacteristicCode}</TableCell>
                    <TableCell>{char.CharacteristicName}</TableCell>
                    <TableCell className="font-mono text-sm">{char.FormatTemplate}</TableCell>
                    <TableCell>{char.UnitOfMeasure || "-"}</TableCell>
                    <TableCell>{char.DisplayOrder}</TableCell>
                    <TableCell>{char.IsActive ? "Sì" : "No"}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditCharacteristic(char)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCharacteristic(char.Id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Regole di Descrizione</h3>
            <Button onClick={() => {
              setEditingRule(null);
              setRuleForm({
                MacroFamilyId: null,
                FamilyId: null,
                TypeId: null,
                CharacteristicCode: "",
                AppendOrder: 1,
                Separator: " - ",
                IsActive: true
              });
              setRuleDialogOpen(true);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Nuova Regola
            </Button>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Caratteristica</TableHead>
                  <TableHead>MacroFamiglia</TableHead>
                  <TableHead>Famiglia</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Ordine</TableHead>
                  <TableHead>Separatore</TableHead>
                  <TableHead>Attiva</TableHead>
                  <TableHead>Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.Id}>
                    <TableCell>{rule.CharacteristicName}</TableCell>
                    <TableCell>{rule.MacroFamilyId || "Tutte"}</TableCell>
                    <TableCell>{rule.FamilyId || "Tutte"}</TableCell>
                    <TableCell>{rule.TypeId || "Tutti"}</TableCell>
                    <TableCell>{rule.AppendOrder}</TableCell>
                    <TableCell>{rule.Separator}</TableCell>
                    <TableCell>{rule.IsActive ? "Sì" : "No"}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditRule(rule)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteRule(rule.Id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog Caratteristica */}
      <Dialog open={charDialogOpen} onOpenChange={setCharDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingChar ? "Modifica Caratteristica" : "Nuova Caratteristica"}
            </DialogTitle>
            <DialogDescription>
              Definisci una caratteristica tecnica e il suo template di formattazione
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Codice Caratteristica *</Label>
                <Input
                  value={charForm.CharacteristicCode}
                  onChange={(e) => setCharForm({ ...charForm, CharacteristicCode: e.target.value.toUpperCase() })}
                  placeholder="DIAMETER"
                  disabled={!!editingChar}
                />
              </div>
              <div>
                <Label>Nome *</Label>
                <Input
                  value={charForm.CharacteristicName}
                  onChange={(e) => setCharForm({ ...charForm, CharacteristicName: e.target.value })}
                  placeholder="Diametro"
                />
              </div>
            </div>
            <div>
              <Label>Template di Formattazione *</Label>
              <Input
                value={charForm.FormatTemplate}
                onChange={(e) => setCharForm({ ...charForm, FormatTemplate: e.target.value })}
                placeholder="D {value}mm"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Usa {"{value}"} come placeholder per il valore
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Unita di Misura</Label>
                <Input
                  value={charForm.UnitOfMeasure}
                  onChange={(e) => setCharForm({ ...charForm, UnitOfMeasure: e.target.value })}
                  placeholder="mm"
                />
              </div>
              <div>
                <Label>Ordine di Visualizzazione</Label>
                <Input
                  type="number"
                  value={charForm.DisplayOrder}
                  onChange={(e) => setCharForm({ ...charForm, DisplayOrder: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="charActive"
                checked={charForm.IsActive}
                onChange={(e) => setCharForm({ ...charForm, IsActive: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="charActive">Attiva</Label>
            </div>
            
            {/* Info: Le caratteristiche sono disponibili per tutte le gerarchie */}
            <div className="border rounded-md p-3 bg-blue-50">
              <p className="text-sm text-blue-700">
                <strong>Nota:</strong> Le caratteristiche tecniche sono disponibili per <strong>tutte le gerarchie</strong>.
                L'utente può scegliere quali caratteristiche inserire durante la ricodifica.
              </p>
              <p className="text-xs text-blue-600 mt-2">
                Le <strong>Regole di Descrizione</strong> definiscono invece <strong>quando</strong> applicare 
                una caratteristica nella descrizione normalizzata (in base a MacroFamiglia, Famiglia, Tipo).
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCharDialogOpen(false)}>
              <X className="h-4 w-4 mr-2" />
              Annulla
            </Button>
            <Button onClick={handleSaveCharacteristic} disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              Salva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Regola */}
      <Dialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingRule ? "Modifica Regola" : "Nuova Regola"}
            </DialogTitle>
            <DialogDescription>
              Definisci quando e come aggiungere una caratteristica alla descrizione
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Caratteristica *</Label>
              <select
                className="w-full p-2 border rounded"
                value={ruleForm.CharacteristicCode}
                onChange={(e) => setRuleForm({ ...ruleForm, CharacteristicCode: e.target.value })}
              >
                <option value="">Seleziona...</option>
                {characteristics
                  .filter(c => c.IsActive)
                  .map((char) => (
                    <option key={char.Id} value={char.CharacteristicCode}>
                      {char.CharacteristicName} ({char.CharacteristicCode})
                    </option>
                  ))}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>MacroFamiglia (opzionale)</Label>
                <Input
                  type="number"
                  value={ruleForm.MacroFamilyId || ""}
                  onChange={(e) => setRuleForm({ ...ruleForm, MacroFamilyId: e.target.value ? parseInt(e.target.value) : null })}
                  placeholder="Tutte se vuoto"
                />
              </div>
              <div>
                <Label>Famiglia (opzionale)</Label>
                <Input
                  type="number"
                  value={ruleForm.FamilyId || ""}
                  onChange={(e) => setRuleForm({ ...ruleForm, FamilyId: e.target.value ? parseInt(e.target.value) : null })}
                  placeholder="Tutte se vuoto"
                />
              </div>
              <div>
                <Label>Tipo (opzionale)</Label>
                <Input
                  type="number"
                  value={ruleForm.TypeId || ""}
                  onChange={(e) => setRuleForm({ ...ruleForm, TypeId: e.target.value ? parseInt(e.target.value) : null })}
                  placeholder="Tutti se vuoto"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Ordine di Aggiunta *</Label>
                <Input
                  type="number"
                  value={ruleForm.AppendOrder}
                  onChange={(e) => setRuleForm({ ...ruleForm, AppendOrder: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div>
                <Label>Separatore *</Label>
                <Input
                  value={ruleForm.Separator}
                  onChange={(e) => setRuleForm({ ...ruleForm, Separator: e.target.value })}
                  placeholder=" - "
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="ruleActive"
                checked={ruleForm.IsActive}
                onChange={(e) => setRuleForm({ ...ruleForm, IsActive: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="ruleActive">Attiva</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRuleDialogOpen(false)}>
              <X className="h-4 w-4 mr-2" />
              Annulla
            </Button>
            <Button onClick={handleSaveRule} disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              Salva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DescriptionRulesTab;

