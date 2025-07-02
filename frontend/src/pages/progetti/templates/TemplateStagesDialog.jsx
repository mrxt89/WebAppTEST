import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Layers,
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  CheckCircle,
  List,
  AlertTriangle,
  Hash,
  Save,
  X,
  ArrowRight,
  Info,
  Maximize2,
  Minimize2,
  Pin,
  PinOff,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import useTemplateActions from "@/hooks/useTemplateActions";
import { toast } from "@/components/ui/use-toast";
import { swal } from "@/lib/common";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Componente per riga sortable
const SortableStageRow = ({ stage, onEdit, onDelete, onToggleChecklist }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stage.StageTemplateID });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style} className={isDragging ? "bg-gray-100" : ""}>
      <TableCell className="w-10">
        <div {...attributes} {...listeners} className="cursor-move">
          <GripVertical className="h-4 w-4 text-gray-400" />
        </div>
      </TableCell>
      <TableCell className="font-medium">{stage.StageName}</TableCell>
      <TableCell className="max-w-xs truncate text-sm text-gray-600 whitespace-pre-wrap">
        {stage.StageDescription || "-"}
      </TableCell>
      <TableCell>
        <div
          className="w-20 h-6 rounded"
          style={{ backgroundColor: stage.HexColor }}
        />
      </TableCell>
      <TableCell className="text-center">
        {stage.IsGateRequired ? (
          <CheckCircle className="h-4 w-4 text-green-600 mx-auto" />
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </TableCell>
      <TableCell className="text-center">
        <Badge variant="outline">
          {stage.checklistCount || 0}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onToggleChecklist(stage)}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(stage)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-red-500"
            onClick={() => onDelete(stage.StageTemplateID)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};

// Dialog per form di creazione/modifica stage
const StageFormDialog = ({ open, onOpenChange, stage, onSave }) => {
  const [formData, setFormData] = useState({
    StageName: "",
    StageDescription: "",
    StageSequence: 10,
    HexColor: "#3B82F6",
    Notes: "",
    IsGateRequired: true,
  });

  useEffect(() => {
    if (stage) {
      setFormData({
        StageTemplateID: stage.StageTemplateID,
        StageName: stage.StageName || "",
        StageDescription: stage.StageDescription || "",
        StageSequence: stage.StageSequence || 10,
        HexColor: stage.HexColor || "#3B82F6",
        Notes: stage.Notes || "",
        IsGateRequired: stage.IsGateRequired !== false,
      });
    } else {
      setFormData({
        StageName: "",
        StageDescription: "",
        StageSequence: 10,
        HexColor: "#3B82F6",
        Notes: "",
        IsGateRequired: true,
      });
    }
  }, [stage, open]);

  const handleSubmit = () => {
    if (!formData.StageName) {
      toast({
        title: "Errore",
        description: "Il nome della fase è obbligatorio",
        variant: "destructive",
      });
      return;
    }
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {stage ? "Modifica Fase" : "Nuova Fase"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div>
            <Label>Nome Fase *</Label>
            <Input
              value={formData.StageName}
              onChange={(e) => setFormData({ ...formData, StageName: e.target.value })}
              placeholder="Es. Analisi, Sviluppo, Test..."
            />
          </div>
          <div>
            <Label>Descrizione</Label>
            <Textarea
              value={formData.StageDescription}
              onChange={(e) => setFormData({ ...formData, StageDescription: e.target.value })}
              rows={3}
              placeholder="Descrizione dettagliata della fase"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Sequenza</Label>
              <Input
                type="number"
                value={formData.StageSequence}
                onChange={(e) => setFormData({ ...formData, StageSequence: parseInt(e.target.value) || 10 })}
              />
            </div>
            <div>
              <Label>Colore</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={formData.HexColor}
                  onChange={(e) => setFormData({ ...formData, HexColor: e.target.value })}
                  className="w-20 h-10"
                />
                <Input
                  value={formData.HexColor}
                  onChange={(e) => setFormData({ ...formData, HexColor: e.target.value })}
                  placeholder="#3B82F6"
                />
              </div>
            </div>
          </div>
          <div>
            <Label>Note</Label>
            <Textarea
              value={formData.Notes}
              onChange={(e) => setFormData({ ...formData, Notes: e.target.value })}
              rows={2}
              placeholder="Note aggiuntive"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={formData.IsGateRequired}
              onCheckedChange={(checked) => setFormData({ ...formData, IsGateRequired: checked })}
              className="bg-primary"
            />
            <Label className="cursor-pointer">
              Richiedi approvazione per completare la fase (Gate)
            </Label>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annulla
            </Button>
            <Button onClick={handleSubmit}>
              <Save className="h-4 w-4 mr-1" />
              Salva
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Dialog per checklist
const StageChecklistDialog = ({ open, onOpenChange, stage, onUpdate }) => {
  const [checklistItems, setChecklistItems] = useState([]);
  const [newItem, setNewItem] = useState({ text: "", description: "", isRequired: true });
  const [editingItem, setEditingItem] = useState(null);
  const { 
    fetchTemplateStages,
    addUpdateStageChecklistTemplate,
    deleteStageChecklistTemplate 
  } = useTemplateActions();

  useEffect(() => {
    if (stage && open) {
      // Carica gli elementi della checklist per questo stage
      loadChecklistItems();
    }
  }, [stage, open]);

  const loadChecklistItems = async () => {
    // In produzione, questo dovrebbe caricare gli items dal backend
    // Per ora useremo dati mock
    setChecklistItems(stage.checklistItems || []);
  };

  const handleAddItem = async () => {
    if (!newItem.text) {
      toast({
        title: "Errore",
        description: "Il testo dell'elemento è obbligatorio",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await addUpdateStageChecklistTemplate(stage.StageTemplateID, {
        CheckItemText: newItem.text,
        CheckItemDescription: newItem.description,
        IsRequired: newItem.isRequired,
        ItemSequence: checklistItems.length * 10 + 10,
      });

      if (result.success) {
        setNewItem({ text: "", description: "", isRequired: true });
        await onUpdate();
        toast({
          title: "Successo",
          description: "Elemento aggiunto alla checklist",
          variant: "success",
        });
      }
    } catch (error) {
      console.error("Error adding checklist item:", error);
      toast({
        title: "Errore",
        description: "Errore nell'aggiunta dell'elemento",
        variant: "destructive",
      });
    }
  };

  const handleDeleteItem = async (checklistTemplateId) => {
    try {
      const result = await deleteStageChecklistTemplate(checklistTemplateId);
      if (result.success) {
        await onUpdate();
        toast({
          title: "Successo",
          description: "Elemento rimosso dalla checklist",
          variant: "success",
        });
      }
    } catch (error) {
      console.error("Error deleting checklist item:", error);
      toast({
        title: "Errore",
        description: "Errore nella rimozione dell'elemento",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Checklist per fase: {stage?.StageName}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Form per nuovo elemento */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <h4 className="font-medium text-sm">Aggiungi elemento checklist</h4>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <Label>Testo *</Label>
                <Input
                  value={newItem.text}
                  onChange={(e) => setNewItem({ ...newItem, text: e.target.value })}
                  placeholder="Es. Documento di analisi completato"
                />
              </div>
              <div>
                <Label>Descrizione</Label>
                <Textarea
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  rows={2}
                  placeholder="Descrizione dettagliata (opzionale)"
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={newItem.isRequired}
                    onCheckedChange={(checked) => setNewItem({ ...newItem, isRequired: checked })}
                    className="bg-primary"
                  />
                  <Label className="cursor-pointer">Obbligatorio per il completamento</Label>
                </div>
                <Button size="sm" onClick={handleAddItem}>
                  <Plus className="h-4 w-4 mr-1" />
                  Aggiungi
                </Button>
              </div>
            </div>
          </div>

          {/* Lista elementi */}
          {checklistItems.length > 0 ? (
            <div className="space-y-2">
              {checklistItems.map((item) => (
                <div key={item.ChecklistTemplateID} className="border rounded-lg p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{item.CheckItemText}</span>
                        {item.IsRequired && (
                          <Badge variant="outline" className="text-xs">
                            Obbligatorio
                          </Badge>
                        )}
                      </div>
                      {item.CheckItemDescription && (
                        <p className="text-sm text-gray-600 mt-1">{item.CheckItemDescription}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500"
                      onClick={() => handleDeleteItem(item.ChecklistTemplateID)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Nessun elemento nella checklist
            </div>
          )}
        </div>
        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Chiudi
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Dialog principale per gestione stages
const TemplateStagesDialog = ({ open, onOpenChange, template, onUpdate }) => {
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingStage, setEditingStage] = useState(null);
  const [showStageForm, setShowStageForm] = useState(false);
  const [showChecklistDialog, setShowChecklistDialog] = useState(false);
  const [selectedStage, setSelectedStage] = useState(null);
  const [activeTab, setActiveTab] = useState("stages");
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [panelWidth, setPanelWidth] = useState(800);
  const [localTemplate, setLocalTemplate] = useState(template);

  const {
    fetchTemplateStages,
    addUpdateTemplateStage,
    deleteTemplateStage,
    reorderTemplateStages,
    toggleTemplateUseStages,
  } = useTemplateActions();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Sincronizza il template locale quando cambia
  useEffect(() => {
    setLocalTemplate(template);
  }, [template]);

  // Carica stages quando si apre il panel
  useEffect(() => {
    if (open && localTemplate?.TemplateID) {
      loadStages();
    }
  }, [open, localTemplate]);

  const loadStages = async () => {
    try {
      setLoading(true);
      const stagesData = await fetchTemplateStages(localTemplate.TemplateID);
      setStages(stagesData);
    } catch (error) {
      console.error("Error loading stages:", error);
      toast({
        title: "Errore",
        description: "Errore nel caricamento degli stages",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveStage = async (stageData) => {
    try {
      const result = await addUpdateTemplateStage(localTemplate.TemplateID, stageData);
      if (result.success) {
        await loadStages();
        setShowStageForm(false);
        setEditingStage(null);
        toast({
          title: "Successo",
          description: result.msg || "Stage salvato con successo",
          variant: "success",
        });
      }
    } catch (error) {
      console.error("Error saving stage:", error);
      toast({
        title: "Errore",
        description: "Errore nel salvataggio dello stage",
        variant: "destructive",
      });
    }
  };

  const handleDeleteStage = async (stageTemplateId) => {
    const confirm = await swal.fire({
      title: "Sei sicuro?",
      text: "L'eliminazione dello stage non può essere annullata!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Sì, elimina",
      cancelButtonText: "Annulla",
    });

    if (!confirm.isConfirmed) return;

    try {
      const result = await deleteTemplateStage(stageTemplateId);
      if (result.success) {
        await loadStages();
        toast({
          title: "Successo",
          description: "Stage eliminato con successo",
          variant: "success",
        });
      }
    } catch (error) {
      console.error("Error deleting stage:", error);
      toast({
        title: "Errore",
        description: "Errore nell'eliminazione dello stage",
        variant: "destructive",
      });
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = stages.findIndex((s) => s.StageTemplateID === active.id);
      const newIndex = stages.findIndex((s) => s.StageTemplateID === over.id);

      const newStages = arrayMove(stages, oldIndex, newIndex);
      setStages(newStages);

      // Prepara l'array di ordinamento
      const stageOrders = newStages.map((stage, index) => ({
        stageId: stage.StageTemplateID,
        sequence: (index + 1) * 10,
      }));

      try {
        await reorderTemplateStages(localTemplate.TemplateID, stageOrders);
        toast({
          title: "Successo",
          description: "Ordine degli stage aggiornato",
          variant: "success",
        });
      } catch (error) {
        console.error("Error reordering stages:", error);
        await loadStages(); // Ricarica in caso di errore
        toast({
          title: "Errore",
          description: "Errore nel riordinamento degli stage",
          variant: "destructive",
        });
      }
    }
  };

  const handleToggleUseStages = async () => {
    try {
      const newValue = !localTemplate.UseStages;
      
      // Aggiorna immediatamente il template locale per riflettere il cambiamento
      setLocalTemplate(prev => ({ ...prev, UseStages: newValue }));
      
      await toggleTemplateUseStages(localTemplate.TemplateID, newValue);
      
      // Aggiorna il template nel componente padre
      if (onUpdate) {
        onUpdate();
      }
      
      toast({
        title: "Successo",
        description: newValue ? "Stages abilitati" : "Stages disabilitati",
        variant: "success",
      });
    } catch (error) {
      console.error("Error toggling use stages:", error);
      
      // Ripristina il valore precedente in caso di errore
      setLocalTemplate(prev => ({ ...prev, UseStages: !prev.UseStages }));
      
      toast({
        title: "Errore",
        description: "Errore nell'aggiornamento",
        variant: "destructive",
      });
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    setIsMinimized(false);
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
    setIsFullscreen(false);
  };

  const togglePin = () => {
    setIsPinned(!isPinned);
  };

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-25 z-40"
            onClick={() => !isPinned && onOpenChange(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className={`fixed top-0 right-0 h-full bg-white shadow-2xl border-l z-50 flex flex-col ${
            isFullscreen ? "w-full" : isMinimized ? "w-16" : `w-[${panelWidth}px]`
          }`}
          style={{
            width: isFullscreen ? "100%" : isMinimized ? "64px" : `${panelWidth}px`,
          }}
        >
          {/* Header del panel */}
          <div className="flex items-center justify-between p-4 border-b bg-gray-50">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-purple-600" />
              <div className="flex-1">
                <h2 className="font-semibold text-lg">
                  Gestione Fasi di Lavoro
                </h2>
                <p className="text-sm text-gray-600">
                  {localTemplate?.Description}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={togglePin}
                className={isPinned ? "text-blue-600" : ""}
              >
                {isPinned ? <Pin className="h-4 w-4" /> : <PinOff className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleMinimize}
              >
                {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleFullscreen}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Contenuto del panel */}
          {!isMinimized && (
            <div className="flex-1 overflow-y-auto">
              <div className="p-4 space-y-4">
                {/* Toggle UseStages */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Abilita fasi di lavoro</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Le fasi permettono di organizzare il progetto in momenti ben definiti
                      </p>
                    </div>
                    <Checkbox
                      checked={localTemplate?.UseStages === 1 || localTemplate?.UseStages === true}
                      onCheckedChange={handleToggleUseStages}
                      className="bg-primary"
                    />
                  </div>
                </div>

                {(localTemplate?.UseStages === 1 || localTemplate?.UseStages === true) && (
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList>
                      <TabsTrigger value="stages">Fasi</TabsTrigger>
                      <TabsTrigger value="tasks">Assegnazione Task</TabsTrigger>
                    </TabsList>

                    <TabsContent value="stages" className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-medium">Fasi del template</h3>
                        <Button
                          size="sm"
                          onClick={() => {
                            setEditingStage(null);
                            setShowStageForm(true);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Aggiungi Fase
                        </Button>
                      </div>

                      {loading ? (
                        <div className="text-center py-8">Caricamento...</div>
                      ) : stages.length === 0 ? (
                        <div className="text-center py-8 bg-gray-50 rounded-lg">
                          <Layers className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-600">Nessuna fase definita</p>
                          <p className="text-sm text-gray-500 mt-1">
                            Aggiungi delle fasi per organizzare il template
                          </p>
                        </div>
                      ) : (
                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={handleDragEnd}
                        >
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-10"></TableHead>
                                <TableHead>Nome Fase</TableHead>
                                <TableHead>Descrizione</TableHead>
                                <TableHead>Colore</TableHead>
                                <TableHead className="text-center">Gate</TableHead>
                                <TableHead className="text-center">Checklist</TableHead>
                                <TableHead>Azioni</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              <SortableContext
                                items={stages.map((s) => s.StageTemplateID)}
                                strategy={verticalListSortingStrategy}
                              >
                                {stages.map((stage) => (
                                  <SortableStageRow
                                    key={stage.StageTemplateID}
                                    stage={stage}
                                    onEdit={(stage) => {
                                      setEditingStage(stage);
                                      setShowStageForm(true);
                                    }}
                                    onDelete={handleDeleteStage}
                                    onToggleChecklist={(stage) => {
                                      setSelectedStage(stage);
                                      setShowChecklistDialog(true);
                                    }}
                                  />
                                ))}
                              </SortableContext>
                            </TableBody>
                          </Table>
                        </DndContext>
                      )}
                    </TabsContent>

                    <TabsContent value="tasks" className="space-y-4">
                      <TaskStageAssignment 
                        template={localTemplate}
                        stages={stages}
                        onUpdate={async () => {
                          await loadStages();
                          if (onUpdate) onUpdate();
                        }}
                      />
                    </TabsContent>
                  </Tabs>
                )}
              </div>
            </div>
          )}

          {/* Footer del panel */}
          {!isMinimized && (
            <div className="border-t p-4 flex justify-end">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Chiudi
              </Button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Dialog per form stage */}
      <StageFormDialog
        open={showStageForm}
        onOpenChange={setShowStageForm}
        stage={editingStage}
        onSave={handleSaveStage}
      />

      {/* Dialog per checklist */}
      {selectedStage && (
        <StageChecklistDialog
          open={showChecklistDialog}
          onOpenChange={setShowChecklistDialog}
          stage={selectedStage}
          onUpdate={loadStages}
        />
      )}
    </>
  );
};

// Componente per l'assegnazione dei task alle fasi
const TaskStageAssignment = ({ template, stages, onUpdate }) => {
  const [tasks, setTasks] = useState([]);
  const [taskStageMapping, setTaskStageMapping] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const { assignTaskTemplateToStage } = useTemplateActions();

  useEffect(() => {
    if (template?.Details) {
      setTasks(template.Details);
      // Inizializza il mapping dalle assegnazioni esistenti
      const mapping = {};
      template.Details.forEach(task => {
        if (task.StageTemplateID) {
          mapping[task.TemplateDetailID] = task.StageTemplateID;
        }
      });
      
      console.log('Debug useEffect initialization:', {
        templateDetails: template.Details,
        mapping,
        tasks: template.Details.map(t => ({ id: t.TemplateDetailID, title: t.Title, stageId: t.StageTemplateID }))
      });
      
      setTaskStageMapping(mapping);
    }
  }, [template]);

  const handleStageChange = async (taskId, stageId) => {
    const newStageId = stageId === "none" ? null : parseInt(stageId);
    
    console.log('Debug handleStageChange:', {
      taskId,
      stageId,
      newStageId,
      currentMapping: taskStageMapping
    });
    
    // Aggiorna lo stato locale immediatamente
    setTaskStageMapping(prev => {
      const newMapping = {
        ...prev,
        [taskId]: newStageId
      };
      console.log('Debug new mapping:', newMapping);
      return newMapping;
    });

    try {
      setSaving(true);
      const result = await assignTaskTemplateToStage(
        taskId,
        newStageId,
        null // taskSequenceInStage sarà gestito dal backend
      );

      if (result.success) {
        // Aggiorna i dati del template dopo l'assegnazione
        if (onUpdate) {
          await onUpdate();
        }
        
        toast({
          title: "Successo",
          description: "Assegnazione aggiornata",
          variant: "success",
        });
      } else {
        // Ripristina lo stato precedente in caso di errore
        setTaskStageMapping(prev => {
          const newMapping = { ...prev };
          if (newStageId === null) {
            delete newMapping[taskId];
          } else {
            // Recupera il valore precedente
            const prevStageId = template.Details.find(t => t.TemplateDetailID === taskId)?.StageTemplateID;
            if (prevStageId) {
              newMapping[taskId] = prevStageId;
            } else {
              delete newMapping[taskId];
            }
          }
          return newMapping;
        });
        
        toast({
          title: "Errore",
          description: result.msg || "Errore nell'assegnazione",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error assigning task to stage:", error);
      
      // Ripristina lo stato precedente in caso di errore
      setTaskStageMapping(prev => {
        const newMapping = { ...prev };
        if (newStageId === null) {
          delete newMapping[taskId];
        } else {
          // Recupera il valore precedente
          const prevStageId = template.Details.find(t => t.TemplateDetailID === taskId)?.StageTemplateID;
          if (prevStageId) {
            newMapping[taskId] = prevStageId;
          } else {
            delete newMapping[taskId];
          }
        }
        return newMapping;
      });
      
      toast({
        title: "Errore",
        description: "Errore nell'assegnazione del task alla fase",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getUnassignedTasksCount = () => {
    const unassignedCount = tasks.filter(task => {
      const stageId = taskStageMapping[task.TemplateDetailID];
      return !stageId || stageId === null || stageId === undefined;
    }).length;
    
    console.log('Debug getUnassignedTasksCount:', {
      totalTasks: tasks.length,
      taskStageMapping,
      unassignedCount,
      tasks: tasks.map(t => ({ id: t.TemplateDetailID, title: t.Title, stageId: taskStageMapping[t.TemplateDetailID] }))
    });
    
    return unassignedCount;
  };

  const getTasksByStage = (stageId) => {
    return tasks.filter(task => taskStageMapping[task.TemplateDetailID] === stageId);
  };

  if (stages.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <Layers className="h-12 w-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600 font-medium">Nessuna fase definita</p>
        <p className="text-sm text-gray-500 mt-1">
          Crea prima delle fasi nella scheda "Fasi" per poter assegnare le attività
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <Info className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-800">
              Assegna le attività alle fasi
            </p>
            <p className="text-xs text-blue-700 mt-1">
              Le attività assegnate a una fase verranno automaticamente associate quando il template viene applicato a un progetto
            </p>
          </div>
        </div>
      </div>

      {getUnassignedTasksCount() > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-sm text-amber-800">
            <AlertTriangle className="h-4 w-4 inline mr-1" />
            {getUnassignedTasksCount()} attività non assegnate a nessuna fase
          </p>
        </div>
      )}

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">Seq.</TableHead>
              <TableHead>Attività</TableHead>
              <TableHead>Priorità</TableHead>
              <TableHead>Giorni</TableHead>
              <TableHead className="w-[250px]">Fase Assegnata</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                  Nessuna attività definita nel template
                </TableCell>
              </TableRow>
            ) : (
              tasks.map((task) => (
                <TableRow key={task.TemplateDetailID}>
                  <TableCell className="text-center text-sm text-gray-600">
                    {task.TaskSequence}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{task.Title}</p>
                      {task.Description && (
                        <p className="text-xs text-gray-600 mt-1 line-clamp-1 whitespace-pre-wrap">
                          {task.Description}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        task.Priority === "ALTA"
                          ? "destructive"
                          : task.Priority === "MEDIA"
                            ? "default"
                            : "outline"
                      }
                    >
                      {task.Priority}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {task.StandardDays}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={taskStageMapping[task.TemplateDetailID]?.toString() || "none"}
                      onValueChange={(value) => handleStageChange(task.TemplateDetailID, value)}
                      disabled={saving}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          <span className="text-gray-500">- Non assegnata -</span>
                        </SelectItem>
                        {stages.map((stage) => (
                          <SelectItem
                            key={stage.StageTemplateID}
                            value={stage.StageTemplateID.toString()}
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: stage.HexColor }}
                              />
                              {stage.StageName}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Riepilogo per fase */}
      <div className="mt-6">
        <h4 className="text-sm font-medium mb-3">Riepilogo attività per fase</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {stages.map((stage) => {
            const stageTasks = getTasksByStage(stage.StageTemplateID);
            return (
              <div
                key={stage.StageTemplateID}
                className="border rounded-lg p-3"
                style={{ borderColor: stage.HexColor + '50' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: stage.HexColor }}
                    />
                    <span className="font-medium text-sm">{stage.StageName}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {stageTasks.length} attività
                  </Badge>
                </div>
                {stageTasks.length > 0 && (
                  <div className="space-y-1">
                    {stageTasks.slice(0, 3).map((task) => (
                      <p key={task.TemplateDetailID} className="text-xs text-gray-600 pl-6">
                        • {task.Title}
                      </p>
                    ))}
                    {stageTasks.length > 3 && (
                      <p className="text-xs text-gray-500 pl-6">
                        ...e altre {stageTasks.length - 3}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TemplateStagesDialog;