import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Plus,
  MoreVertical,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  AlertCircle,
  Lock,
  Unlock,
  Edit2,
  Trash2,
  GripVertical,
  ListTodo,
  CheckCircle2,
  Clock,
  Users,
  FileText,
  Play,
  Info,
  Rocket,
  Target,
  TrendingUp,
  Layers,
  CheckCircle,
  Eye,
  EyeOff,
  RefreshCw,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { swal } from "@/lib/common";
import useProjectStages from "@/hooks/useProjectStages";

// Helper per ottenere l'icona della fase
const getStageIcon = (stageName, sequence) => {
  const lowerName = stageName.toLowerCase();
  if (lowerName.includes('avvio') || lowerName.includes('kick') || sequence === 0) {
    return <Rocket className="h-5 w-5" />;
  } else if (lowerName.includes('analisi') || lowerName.includes('pianif')) {
    return <Target className="h-5 w-5" />;
  } else if (lowerName.includes('svilupp') || lowerName.includes('esecuz')) {
    return <TrendingUp className="h-5 w-5" />;
  } else if (lowerName.includes('test') || lowerName.includes('collaudo')) {
    return <CheckCircle2 className="h-5 w-5" />;
  } else if (lowerName.includes('chiusura') || lowerName.includes('consegna')) {
    return <Lock className="h-5 w-5" />;
  }
  return <ListTodo className="h-5 w-5" />;
};

// Componente per visualizzare un singolo task
const TaskCard = ({ task, onTaskClick, isStageBlocked, onRemoveFromStage, canEdit }) => {
  const getPriorityColor = (priority) => {
    switch (priority) {
      case "ALTA":
        return "border-red-200 bg-red-50";
      case "MEDIA":
        return "border-yellow-200 bg-yellow-50";
      case "BASSA":
        return "border-green-200 bg-green-50";
      default:
        return "border-gray-200";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "COMPLETATA":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "IN ESECUZIONE":
        return <Play className="h-4 w-4 text-blue-600" />;
      case "BLOCCATA":
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div
      className={`p-3 border rounded-md cursor-pointer hover:shadow-md transition-all relative group ${
        isStageBlocked ? "opacity-50 cursor-not-allowed" : ""
      } ${getPriorityColor(task.Priority)} ${task.TaskDisabled ? "opacity-50" : ""}`}
      onClick={() => !isStageBlocked && onTaskClick(task)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-medium text-sm line-clamp-2">{task.Title}</h4>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge variant="outline" className="text-xs">
              {isStageBlocked ? "BLOCCATA" : task.Status}
            </Badge>
            {task.AssignedToName && (
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Users className="h-3 w-3" />
                {task.AssignedToName}
              </span>
            )}
            {task.DueDate && (
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(task.DueDate).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {isStageBlocked ? (
            <Lock className="h-4 w-4 text-gray-400" />
          ) : (
            getStatusIcon(task.Status)
          )}
          
          {/* Menu contestuale per rimuovere dalla fase */}
          {canEdit && task.StageID && !isStageBlocked && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveFromStage(task.TaskID);
                  }}
                  className="text-orange-600"
                >
                  <AlertCircle className="mr-2 h-4 w-4" />
                  Rimuovi dalla fase
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
      {isStageBlocked && (
        <div className="mt-2 text-xs text-orange-600 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Fase precedente non completata
        </div>
      )}
    </div>
  );
};

// Componente per un singolo stage
const StageCard = ({ 
  stage, 
  isExpanded, 
  onToggle, 
  onEdit, 
  onDelete, 
  onGateAction, 
  onChecklistUpdate, 
  onAddChecklistItem, 
  onTaskClick,
  onMoveTask,
  canEdit,
  isFirstStage,
  isLastStage,
  stageIndex,
  isBlocked,
  refreshProject
}) => {
  const [showChecklist, setShowChecklist] = useState(false);
  const [newCheckItem, setNewCheckItem] = useState("");
  const [editingChecklistItem, setEditingChecklistItem] = useState(null);
  const [editChecklistForm, setEditChecklistForm] = useState({
    CheckItemText: "",
    CheckItemDescription: "",
    IsRequired: false
  });
  const [isDragOver, setIsDragOver] = useState(false);

  const handleCheckItem = async (item, checked) => {
    if (stage.GateStatus === "APPROVED") {
      toast({
        title: "Azione non consentita",
        description: "Questa fase è già stata approvata",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    const result = await onChecklistUpdate(item.ChecklistID, checked);
    if (result.success) {
      toast({
        title: checked ? "Completato" : "Da completare",
        description: `"${item.CheckItemText}" è stato ${checked ? 'completato' : 'riaperto'}`,
        variant: "success",
        duration: 2000,
      });
      
      // Forza il refresh immediato per aggiornare la vista
      await refreshProject();
    }
  };

  const handleAddChecklistItem = async () => {
    if (newCheckItem.trim()) {
      await onAddChecklistItem(stage.StageID, {
        CheckItemText: newCheckItem,
        CheckItemDescription: "",
        IsRequired: false,
      });
      setNewCheckItem("");
      refreshProject();
    }
  };

  const handleEditChecklistItem = (item) => {
    setEditingChecklistItem(item);
    setEditChecklistForm({
      CheckItemText: item.CheckItemText,
      CheckItemDescription: item.CheckItemDescription || "",
      IsRequired: item.IsRequired
    });
  };

  const handleSaveChecklistItem = async () => {
    if (!editChecklistForm.CheckItemText.trim()) {
      toast({
        title: "Errore",
        description: "Il testo dell'elemento è obbligatorio",
        variant: "destructive",
      });
      return;
    }

    const result = await onAddChecklistItem(stage.StageID, {
      ...editChecklistForm,
      ChecklistID: editingChecklistItem.ChecklistID
    });

    if (result.success) {
      setEditingChecklistItem(null);
      setEditChecklistForm({
        CheckItemText: "",
        CheckItemDescription: "",
        IsRequired: false
      });
      refreshProject();
      toast({
        title: "Elemento aggiornato",
        description: "L'elemento della checklist è stato modificato",
        variant: "success",
      });
    }
  };

  // Calcola se la checklist è completata
  const isChecklistCompleted = stage.IsGateRequired && 
    stage.CheckedItems > 0 && 
    stage.TotalChecklistItems > 0 && 
    stage.CheckedItems >= stage.TotalChecklistItems;

  // Determina il colore dello stage in base al completamento della checklist
  const getStageColor = () => {
    if (stage.GateStatus === "APPROVED") {
      return "#10B981"; // Verde per fasi approvate
    } else if (isChecklistCompleted) {
      return "#10B981"; // Verde per checklist completate
    } else if (stage.CheckedItems > 0) {
      return "#3B82F6"; // Blu per checklist parzialmente completate
    } else {
      return stage.HexColor; // Colore originale per checklist vuote
    }
  };

  const getGateStatusBadge = (status) => {
    switch (status) {
      case "APPROVED":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Approvato
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            <X className="h-3 w-3 mr-1" />
            Rifiutato
          </Badge>
        );
      default:
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <Clock className="h-3 w-3 mr-1" />
            In attesa
          </Badge>
        );
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const taskData = JSON.parse(e.dataTransfer.getData("task"));
    if (taskData.StageID !== stage.StageID) {
      await onMoveTask(taskData.TaskID, stage.StageID);
    }
  };

  // Gestione drag & drop per l'header (anche quando compresso)
  const handleHeaderDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.classList.add('ring-2', 'ring-orange-400', 'bg-orange-50');
  };

  const handleHeaderDragLeave = (e) => {
    e.currentTarget.classList.remove('ring-2', 'ring-orange-400', 'bg-orange-50');
  };

  const handleHeaderDrop = async (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('ring-2', 'ring-orange-400', 'bg-orange-50');
    
    const taskData = JSON.parse(e.dataTransfer.getData("task"));
    if (taskData.StageID !== stage.StageID) {
      await onMoveTask(taskData.TaskID, stage.StageID);
    }
  };

  const completionPercentage = stage.TotalTasks > 0 
    ? Math.round((stage.CompletedTasks / stage.TotalTasks) * 100)
    : 0;

  return (
    <Card className={`mb-4 transition-all ${isDragOver ? "ring-2 ring-blue-400 shadow-lg" : ""} ${
      stage.GateStatus === "APPROVED" ? "opacity-75" : ""
    }`}>
      <CardHeader 
        className="pb-3 cursor-pointer"
        onDragOver={handleHeaderDragOver}
        onDragLeave={handleHeaderDragLeave}
        onDrop={handleHeaderDrop}
        title="Trascina qui le attività per assegnarle a questa fase"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <button
              onClick={onToggle}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              title={isExpanded ? "Comprimi fase" : "Espandi fase"}
            >
              {isExpanded ? (
                <ChevronDown className="h-5 w-5" />
              ) : (
                <ChevronRight className="h-5 w-5" />
              )}
            </button>
            
            <div className="flex items-center gap-2">
              {getStageIcon(stage.StageName, stageIndex)}
              <div
                className="w-4 h-4 rounded-full shrink-0"
                style={{ backgroundColor: getStageColor() }}
              />
            </div>
            
            <div className="flex-1">
              <CardTitle className="text-lg flex items-center gap-2">
                {stage.StageName}
                <Badge variant="outline" className="ml-2 font-normal">
                  {stage.CompletedTasks || 0}/{stage.TotalTasks || 0} attività
                </Badge>
                {isChecklistCompleted && stage.GateStatus !== "APPROVED" && (
                  <Badge className="ml-2 bg-green-100 text-green-800 border-green-200">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Checklist completata
                  </Badge>
                )}
              </CardTitle>
              {stage.StageDescription && (
                <p className="text-sm text-gray-600 mt-1">{stage.StageDescription}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {stage.IsGateRequired && (
              <div className="flex items-center gap-2">
                {getGateStatusBadge(stage.GateStatus)}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowChecklist(!showChecklist)}
                  className="flex items-center gap-1"
                >
                  {showChecklist ? (
                    <>
                      <EyeOff className="h-4 w-4" />
                      Nascondi
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4" />
                      Checklist ({stage.CheckedItems || 0}/{stage.TotalChecklistItems || 0})
                    </>
                  )}
                </Button>
              </div>
            )}
            
            <div className="flex flex-col items-end gap-1 min-w-[120px]">
              <Progress 
                value={completionPercentage} 
                className="w-full h-2"
              />
              <span className="text-xs text-gray-500">
                {completionPercentage}% completato
              </span>
            </div>
            
            {canEdit && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onEdit}>
                    <Edit2 className="mr-2 h-4 w-4" />
                    Modifica fase
                  </DropdownMenuItem>
                  
                  {stage.IsGateRequired && (
                    <>
                      <DropdownMenuSeparator />
                      
                      {stage.GateStatus !== "APPROVED" && stage.canApprove && (
                        <DropdownMenuItem 
                          onClick={() => onGateAction("APPROVED")}
                          className="text-green-600"
                        >
                          <Check className="mr-2 h-4 w-4" />
                          Approva e procedi
                        </DropdownMenuItem>
                      )}
                      
                      {stage.GateStatus === "APPROVED" && (
                        <DropdownMenuItem 
                          onClick={() => onGateAction("PENDING")}
                          className="text-orange-600"
                        >
                          <Unlock className="mr-2 h-4 w-4" />
                          Riapri fase
                        </DropdownMenuItem>
                      )}
                    </>
                  )}
                  
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={onDelete}
                    className="text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Elimina fase
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardHeader>
      
      <Collapsible open={isExpanded}>
        <CollapsibleContent>
          <CardContent>
            {/* Checklist Section */}
            {stage.IsGateRequired && (
              <div className="mb-4  bg-gray-50 rounded-lg border border-gray-200 p-3">
                <div className="mb-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <ListTodo className="h-4 w-4" />
                    Checklist di completamento
                    <Badge variant="outline" className="ml-auto">
                      {stage.CheckedItems || 0}/{stage.TotalChecklistItems || 0}
                    </Badge>
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Completa tutti gli elementi richiesti per poter procedere alla fase successiva
                  </p>
                </div>
                
                <div className="space-y-2 mb-3">
                  {stage.ChecklistItems?.length === 0 ? (
                    <p className="text-sm text-gray-500 italic py-2">
                      Nessun elemento nella checklist. Aggiungi elementi per controllare il completamento.
                    </p>
                  ) : (
                    stage.ChecklistItems?.map((item) => (
                      <div key={item.ChecklistID} className="flex items-start gap-2 p-2 hover:bg-gray-100 rounded">
                        <Checkbox
                          checked={item.IsChecked}
                          onCheckedChange={(checked) => handleCheckItem(item, checked)}
                          disabled={!canEdit || stage.GateStatus === "APPROVED"}
                          className="mt-0.5 bg-primary"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium cursor-pointer">
                              {item.CheckItemText}
                              {item.IsRequired && (
                                <span className="text-red-500 ml-1">*</span>
                              )}
                            </label>
                            { canEdit && stage.GateStatus !== "APPROVED" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditChecklistItem(item)}
                                className="h-6 w-6 p-0"
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                          {item.CheckItemDescription && (
                            <p className="text-xs text-gray-500 mt-1">
                              {item.CheckItemDescription}
                            </p>
                          )}
                          {item.CheckedAt && (
                            <p className="text-xs text-gray-400 mt-1">
                              ✓ Completato da {item.CheckedByName} il{" "}
                              {new Date(item.CheckedAt).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                
                {canEdit && stage.GateStatus !== "APPROVED" && (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Aggiungi elemento checklist..."
                      value={newCheckItem}
                      onChange={(e) => setNewCheckItem(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleAddChecklistItem()}
                      className="flex-1"
                    />
                    <Button 
                      size="sm" 
                      onClick={handleAddChecklistItem}
                      disabled={!newCheckItem.trim()}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                
                {stage.IsGateRequired && stage.RequiredChecklistItems > 0 && !stage.canApprove && (
                  <Alert className="mt-3">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Completa tutti gli elementi obbligatori (*) per poter approvare questa fase
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
            
            {/* Tasks Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm text-gray-700">Attività in questa fase</h4>
                {canEdit && stage.Tasks?.length > 0 && (
                  <span className="text-xs text-gray-500">
                    Trascina le attività per spostarle tra le fasi
                  </span>
                )}
              </div>
              
              <div 
                className={`space-y-2 min-h-[100px] rounded-lg border-2 border-dashed p-4 transition-colors ${
                  isDragOver ? "border-blue-400 bg-blue-50" : "border-gray-200"
                } ${stage.Tasks?.length === 0 ? "bg-gray-50" : ""}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {stage.Tasks?.length > 0 ? (
                  stage.Tasks.map((task) => (
                    <div
                      key={task.TaskID}
                      draggable={canEdit && stage.GateStatus !== "APPROVED"}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("task", JSON.stringify({
                          TaskID: task.TaskID,
                          StageID: stage.StageID
                        }));
                      }}
                      className={canEdit && stage.GateStatus !== "APPROVED" ? "cursor-move" : ""}
                    >
                      <TaskCard 
                        task={task} 
                        onTaskClick={onTaskClick} 
                        isStageBlocked={false} 
                        onRemoveFromStage={(taskId) => handleMoveTask(taskId, null)}
                        canEdit={canEdit} 
                      />
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <ListTodo className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">
                      Nessuna attività in questa fase
                    </p>
                    {canEdit && (
                      <p className="text-xs text-gray-400 mt-1">
                        Trascina qui le attività per assegnarle a questa fase
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>

      {/* Dialog per modificare elemento checklist */}
      <Dialog open={!!editingChecklistItem} onOpenChange={() => setEditingChecklistItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modifica elemento checklist</DialogTitle>
            <DialogDescription>
              Modifica il testo e le proprietà di questo elemento della checklist.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="checkItemText">Testo dell'elemento *</Label>
              <Input
                id="checkItemText"
                value={editChecklistForm.CheckItemText}
                onChange={(e) => setEditChecklistForm(prev => ({
                  ...prev,
                  CheckItemText: e.target.value
                }))}
                placeholder="Inserisci il testo dell'elemento..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="checkItemDescription">Descrizione (opzionale)</Label>
              <Textarea
                id="checkItemDescription"
                value={editChecklistForm.CheckItemDescription}
                onChange={(e) => setEditChecklistForm(prev => ({
                  ...prev,
                  CheckItemDescription: e.target.value
                }))}
                placeholder="Aggiungi una descrizione dettagliata..."
                rows={3}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isRequired"
                checked={editChecklistForm.IsRequired}
                onCheckedChange={(checked) => setEditChecklistForm(prev => ({
                  ...prev,
                  IsRequired: checked
                }))}
                className="bg-primary"
              />
              <Label htmlFor="isRequired" className="text-sm">
                Elemento obbligatorio per completare la fase
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingChecklistItem(null)}>
              Annulla
            </Button>
            <Button onClick={handleSaveChecklistItem}>
              Salva modifiche
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

// Componente principale
const ProjectStages = ({ project, onTaskClick, canEdit, refreshProject }) => {
  const {
    stages,
    unassignedTasks,
    loading,
    fetchProjectStages,
    addUpdateStage,
    deleteStage,
    assignTaskToStage,
    updateChecklistItemStatus,
    manageGate,
    addUpdateChecklistItem,
    getStageProgress,
    canApproveGate,
  } = useProjectStages();

  const [expandedStages, setExpandedStages] = useState(() => {
    // Recupera lo stato dal localStorage
    const saved = localStorage.getItem('expandedStages');
    return saved ? JSON.parse(saved) : {};
  });
  const [isStageDialogOpen, setIsStageDialogOpen] = useState(false);
  const [editingStage, setEditingStage] = useState(null);
  const [stageForm, setStageForm] = useState({
    StageName: "",
    StageDescription: "",
    HexColor: "#3B82F6",
    IsGateRequired: true,
  });
  const [showIntro, setShowIntro] = useState(false);
  const [unassignedTasksFixed, setUnassignedTasksFixed] = useState(() => {
    // Recupera lo stato dal localStorage
    const saved = localStorage.getItem('unassignedTasksFixed');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    if (project?.ProjectID) {
      loadStages();
    }
  }, [project?.ProjectID]);

  useEffect(() => {
    // Espandi automaticamente la prima fase non completata solo se non ci sono preferenze salvate
    if (stages.length > 0 && Object.keys(expandedStages).length === 0) {
      const firstIncompleteStage = stages.find(s => s.GateStatus !== "APPROVED");
      if (firstIncompleteStage) {
        setExpandedStages({ [firstIncompleteStage.StageID]: true });
      } else if (stages.length > 0) {
        setExpandedStages({ [stages[0].StageID]: true });
      }
    }
  }, [stages, expandedStages]);

  useEffect(() => {
    // Salva lo stato nel localStorage quando cambia
    localStorage.setItem('unassignedTasksFixed', JSON.stringify(unassignedTasksFixed));
  }, [unassignedTasksFixed]);

  useEffect(() => {
    // Salva lo stato delle sezioni aperte nel localStorage quando cambia
    localStorage.setItem('expandedStages', JSON.stringify(expandedStages));
  }, [expandedStages]);

  const loadStages = async () => {
    await fetchProjectStages(project.ProjectID);
  };

  const toggleStage = (stageId) => {
    setExpandedStages((prev) => ({
      ...prev,
      [stageId]: !prev[stageId],
    }));
  };

  // Funzione per resettare le preferenze salvate
  const resetPreferences = () => {
    setExpandedStages({});
    setUnassignedTasksFixed(false);
    localStorage.removeItem('expandedStages');
    localStorage.removeItem('unassignedTasksFixed');
    
    // Espandi automaticamente la prima fase non completata
    if (stages.length > 0) {
      const firstIncompleteStage = stages.find(s => s.GateStatus !== "APPROVED");
      if (firstIncompleteStage) {
        setExpandedStages({ [firstIncompleteStage.StageID]: true });
      } else if (stages.length > 0) {
        setExpandedStages({ [stages[0].StageID]: true });
      }
    }
  };

  // Funzione per scrollare verso uno stage specifico
  const scrollToStage = (stageId) => {
    // Chiudi tutti gli stage tranne quello cliccato
    const newExpandedStages = {};
    stages.forEach(stage => {
      newExpandedStages[stage.StageID] = stage.StageID === stageId;
    });
    
    // Salva le nuove preferenze
    localStorage.setItem(`project-${project.ProjectID}-expanded-stages`, JSON.stringify(newExpandedStages));
    
    // Aggiorna lo stato
    setExpandedStages(newExpandedStages);
    
    // Funzione per scrollare con retry
    const attemptScroll = (attempts = 0) => {
      const stageElement = document.getElementById(`stage-${stageId}`);
      if (stageElement) {
        // Calcola la posizione considerando l'header sticky e la sezione attività non assegnate
        const overviewCard = document.querySelector('.sticky.top-0');
        const unassignedCard = document.querySelector('.sticky.z-10');
        
        let headerHeight = overviewCard ? overviewCard.offsetHeight + 20 : 120;
        
        // Se la sezione attività non assegnate è fissa, aggiungi la sua altezza
        if (unassignedCard && unassignedTasksFixed) {
          headerHeight += unassignedCard.offsetHeight + 20;
        }
        
        const elementTop = stageElement.offsetTop - headerHeight;
        
        window.scrollTo({
          top: Math.max(0, elementTop), // Assicura che non scrolli sopra il top
          behavior: 'smooth'
        });
      } else if (attempts < 10) {
        // Se l'elemento non è ancora presente, riprova dopo 100ms
        setTimeout(() => attemptScroll(attempts + 1), 100);
      }
    };
    
    // Inizia il tentativo di scroll dopo un delay iniziale
    setTimeout(() => attemptScroll(), 300);
  };

  const handleEditStage = (stage) => {
    setEditingStage(stage);
    setStageForm({
      StageName: stage.StageName,
      StageDescription: stage.StageDescription || "",
      HexColor: stage.HexColor,
      IsGateRequired: stage.IsGateRequired,
    });
    setIsStageDialogOpen(true);
  };

  const handleDeleteStage = async (stageId) => {
    const result = await swal.fire({
      title: "Elimina fase?",
      text: "Le attività di questa fase torneranno tra le attività non assegnate",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Elimina",
      cancelButtonText: "Annulla",
      confirmButtonColor: "#ef4444",
    });

    if (result.isConfirmed) {
      const response = await deleteStage(stageId);
      if (response.success) {
        await loadStages();
        refreshProject();
      }
    }
  };

  const handleSaveStage = async () => {
    if (!stageForm.StageName.trim()) {
      toast({
        title: "Errore",
        description: "Il nome della fase è obbligatorio",
        variant: "destructive",
      });
      return;
    }

    const stageData = {
      ...stageForm,
      StageID: editingStage?.StageID,
      StageSequence: editingStage?.StageSequence || stages.length * 10 + 10,
    };

    const result = await addUpdateStage(project.ProjectID, stageData);
    if (result.success) {
      setIsStageDialogOpen(false);
      setEditingStage(null);
      setStageForm({
        StageName: "",
        StageDescription: "",
        HexColor: "#3B82F6",
        IsGateRequired: true,
      });
      await loadStages();
    }
  };

  const handleGateAction = async (stageId, action) => {
    if (action === "APPROVED") {
      const result = await swal.fire({
        title: "Approva fase?",
        text: "Confermando, questa fase sarà completata e potrai procedere con la successiva.",
        icon: "info",
        showCancelButton: true,
        confirmButtonText: "Approva",
        cancelButtonText: "Annulla",
        confirmButtonColor: "#10B981",
      });

      if (!result.isConfirmed) return;
    }

    const response = await manageGate(stageId, action);
    if (response.success) {
      await loadStages();
    }
  };

  const handleMoveTask = async (taskId, targetStageId) => {
    const result = await assignTaskToStage(taskId, targetStageId);
    if (result.success) {
      await loadStages();
      refreshProject();
      toast({
        title: "Attività spostata",
        description: "L'attività è stata assegnata alla nuova fase",
        variant: "success",
        duration: 2000,
      });
    }
  };

  // Funzione per verificare se una fase è bloccata - SEMPRE FALSE (rimuovo il blocco sequenziale)
  const isStageBlocked = (stageIndex) => {
    return false; // Rimuovo il blocco sequenziale - tutte le fasi sono sempre accessibili
  };

  // Prepara i dati per il rendering con progress calcolato
  const enrichedStages = stages.map((stage, index) => {
    const isChecklistCompleted = stage.IsGateRequired && 
      stage.CheckedItems > 0 && 
      stage.TotalChecklistItems > 0 && 
      stage.CheckedItems >= stage.TotalChecklistItems;
      
    return {
      ...stage,
      taskProgress: getStageProgress(stage),
      canApprove: canApproveGate(stage),
      isBlocked: isStageBlocked(index),
      isChecklistCompleted
    };
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500">Caricamento fasi...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Fasi del Progetto
          </h3>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowIntro(true)}
                  className="p-1"
                >
                  <Info className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Come funzionano le fasi di lavoro?</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetPreferences}
                  className="p-1"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Ripristina layout predefinito</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {canEdit && (
            <Button 
              onClick={() => setIsStageDialogOpen(true)}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nuova Fase
            </Button>
          )}
        </div>
      </div>

      {/* Intro Dialog */}
      <Dialog open={showIntro} onOpenChange={setShowIntro}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Come funzionano le Fasi di Lavoro
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Target className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h4 className="font-medium">Organizza il lavoro in fasi</h4>
                <p className="text-sm text-gray-600">
                  Le fasi ti permettono di suddividere il progetto in momenti ben definiti, 
                  come "Analisi", "Sviluppo", "Test" e "Consegna".
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h4 className="font-medium">Checklist di completamento</h4>
                <p className="text-sm text-gray-600">
                  Ogni fase può avere una checklist che ti assicura di non dimenticare nulla 
                  prima di passare alla fase successiva.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Lock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <h4 className="font-medium">Lavoro flessibile</h4>
                <p className="text-sm text-gray-600">
                  Puoi lavorare su qualsiasi fase in qualsiasi momento, 
                  permettendo un flusso di lavoro più flessibile e adattivo.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <GripVertical className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h4 className="font-medium">Trascina le attività</h4>
                <p className="text-sm text-gray-600">
                  Puoi spostare facilmente le attività da una fase all'altra semplicemente 
                  trascinandole con il mouse (solo nelle fasi sbloccate).
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowIntro(false)}>Ho capito</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stages Progress Overview */}
      {enrichedStages.length > 0 && (
        <Card className="mb-4 bg-gradient-to-r from-blue-50 to-green-50 sticky z-20 shadow-sm" style={{ top: '-24px' }}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-2 p-2 shadow-sm">
              <h4 className="text-sm font-medium text-gray-700">Progresso complessivo</h4>
              <span className="text-sm text-gray-600">
                {enrichedStages.filter(s => s.GateStatus === "APPROVED").length} di {enrichedStages.length} fasi completate
              </span>
            </div>
            <div className="flex gap-2">
              {enrichedStages.map((stage, index) => (
                <TooltipProvider key={stage.StageID}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div 
                        className={`flex-1 h-2 rounded-full transition-all cursor-pointer hover:h-3 hover:shadow-sm ${
                          stage.GateStatus === "APPROVED" 
                            ? "bg-green-500" 
                            : stage.isChecklistCompleted
                            ? "bg-green-500"
                            : index === enrichedStages.findIndex(s => s.GateStatus !== "APPROVED")
                            ? "bg-blue-500 animate-pulse"
                            : "bg-gray-300"
                        }`}
                        onClick={() => scrollToStage(stage.StageID)}
                        title={`Clicca per andare a ${stage.StageName}`}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{stage.StageName}</p>
                      <p className="text-xs">
                        {stage.isChecklistCompleted && stage.GateStatus !== "APPROVED"
                          ? "Checklist completata - Pronta per approvazione"
                          : `${stage.taskProgress}% completato`}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Clicca per espandere e andare alla fase</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Unassigned Tasks */}
      {enrichedStages.length > 0 && (
        <Card className={`border-orange-200 bg-orange-50 ${unassignedTasksFixed ? 'sticky z-10 shadow-sm' : ''}`} style={unassignedTasksFixed ? { top: '120px' } : {}}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                Attività da assegnare
                <Badge variant="outline" className="ml-2 bg-orange-100 text-orange-800 border-orange-300">
                  {unassignedTasks.length}
                </Badge>
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setUnassignedTasksFixed(!unassignedTasksFixed)}
                className="flex items-center gap-1"
                title={unassignedTasksFixed ? "Rimuovi dalla posizione fissa" : "Mantieni fissa in alto"}
              >
                {unassignedTasksFixed ? (
                  <>
                    <EyeOff className="h-4 w-4" />
                    Scorrevole
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4" />
                    Fissa
                  </>
                )}
              </Button>
            </div>
            <p className="text-sm text-gray-600">
              Queste attività non sono ancora state assegnate a una fase. Trascinale nella fase appropriata o trascina qui le attività dalle fasi per rimuoverle.
            </p>
          </CardHeader>
          <CardContent className="pt-0">
            <div 
              className="min-h-[120px] max-h-[250px] rounded-lg border-2 border-dashed p-3 transition-colors border-orange-300 overflow-y-auto"
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.classList.add('border-orange-500', 'bg-orange-100');
              }}
              onDragLeave={(e) => {
                e.currentTarget.classList.remove('border-orange-500', 'bg-orange-100');
              }}
              onDrop={async (e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('border-orange-500', 'bg-orange-100');
                
                const taskData = JSON.parse(e.dataTransfer.getData("task"));
                if (taskData.StageID) {
                  // Rimuovi l'attività dallo stage (assegnandola a null)
                  await handleMoveTask(taskData.TaskID, null);
                }
              }}
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {unassignedTasks.map((task) => (
                  <div
                    key={task.TaskID}
                    draggable={canEdit}
                    onDragStart={(e) => {
                      e.dataTransfer.setData("task", JSON.stringify({
                        TaskID: task.TaskID,
                        StageID: null
                      }));
                    }}
                    className={canEdit ? "cursor-move" : ""}
                  >
                    <TaskCard 
                      task={task} 
                      onTaskClick={onTaskClick} 
                      isStageBlocked={false} 
                      onRemoveFromStage={null}
                      canEdit={canEdit} 
                    />
                  </div>
                ))}
                {unassignedTasks.length === 0 && (
                  <div className="col-span-2 text-center py-4">
                    <AlertCircle className="h-8 w-8 text-orange-400 mx-auto mb-2" />
                    <p className="text-sm text-orange-600">
                      Trascina qui le attività dalle fasi per rimuoverle
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stages */}
      {enrichedStages.length > 0 ? (
        enrichedStages.map((stage, index) => (
          <div key={stage.StageID} id={`stage-${stage.StageID}`}>
            <StageCard
              stage={stage}
              stageIndex={index}
              isExpanded={expandedStages[stage.StageID] || false}
              isFirstStage={index === 0}
              isLastStage={index === enrichedStages.length - 1}
              isBlocked={stage.isBlocked}
              onToggle={() => toggleStage(stage.StageID)}
              onEdit={() => handleEditStage(stage)}
              onDelete={() => handleDeleteStage(stage.StageID)}
              onGateAction={(action) => handleGateAction(stage.StageID, action)}
              onChecklistUpdate={updateChecklistItemStatus}
              onAddChecklistItem={addUpdateChecklistItem}
              onTaskClick={onTaskClick}
              onMoveTask={handleMoveTask}
              canEdit={canEdit}
              refreshProject={refreshProject}
            />
          </div>
        ))
      ) : !project?.UseStages ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Layers className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">
              Organizza meglio il tuo progetto con le fasi
            </h3>
            <p className="text-gray-500 mb-4 max-w-md mx-auto">
              Le fasi ti aiutano a suddividere il lavoro in momenti ben definiti, 
              con checklist di completamento per non dimenticare nulla.
            </p>
            {canEdit && (
              <Button 
                onClick={async () => {
                  // Abilita gli stage creando il primo
                  setIsStageDialogOpen(true);
                }}
              >
                <Rocket className="h-4 w-4 mr-2" />
                Inizia con le fasi
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8">
            <ListTodo className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-center text-gray-500">
              Nessuna fase definita per questo progetto.
              {canEdit && " Clicca su 'Nuova Fase' per iniziare."}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Stage Dialog */}
      <Dialog open={isStageDialogOpen} onOpenChange={setIsStageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingStage ? "Modifica Fase" : "Nuova Fase"}
            </DialogTitle>
            <DialogDescription>
              Le fasi aiutano a organizzare il progetto in momenti ben definiti
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="stageName">Nome della fase *</Label>
              <Input
                id="stageName"
                value={stageForm.StageName}
                onChange={(e) =>
                  setStageForm({ ...stageForm, StageName: e.target.value })
                }
                placeholder="es. Analisi, Sviluppo, Test..."
              />
            </div>
            
            <div>
              <Label htmlFor="stageDescription">Descrizione (opzionale)</Label>
              <Textarea
                id="stageDescription"
                value={stageForm.StageDescription}
                onChange={(e) =>
                  setStageForm({ ...stageForm, StageDescription: e.target.value })
                }
                rows={3}
                placeholder="Descrivi cosa deve essere fatto in questa fase..."
              />
            </div>
            
            <div>
              <Label htmlFor="stageColor">Colore identificativo</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="stageColor"
                  type="color"
                  value={stageForm.HexColor}
                  onChange={(e) =>
                    setStageForm({ ...stageForm, HexColor: e.target.value })
                  }
                  className="w-20 cursor-pointer"
                />
                <span className="text-sm text-gray-500">{stageForm.HexColor}</span>
              </div>
            </div>
            
            <div className="flex items-start gap-2">
              <Checkbox
                id="gateRequired"
                checked={stageForm.IsGateRequired}
                onCheckedChange={(checked) =>
                  setStageForm({ ...stageForm, IsGateRequired: checked })
                }
                className="mt-1 bg-primary"
              />
              <div className="space-y-1">
                <Label htmlFor="gateRequired" className="cursor-pointer font-medium">
                  Richiedi approvazione per completare la fase
                </Label>
                <p className="text-sm text-gray-500">
                  Se attivo, dovrai confermare il completamento della checklist prima di procedere
                </p>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsStageDialogOpen(false);
                setEditingStage(null);
                setStageForm({
                  StageName: "",
                  StageDescription: "",
                  HexColor: "#3B82F6",
                  IsGateRequired: true,
                });
              }}
            >
              Annulla
            </Button>
            <Button onClick={handleSaveStage}>
              {editingStage ? "Salva modifiche" : "Crea fase"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectStages;