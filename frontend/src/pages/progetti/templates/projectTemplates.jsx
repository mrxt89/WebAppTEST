// src/pages/progetti/templates/page.jsx
import React, { useState, useEffect } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import useTemplateActions from "../../../hooks/useTemplateActions";
import { swal } from "../../../lib/common";
import { toast } from "@/components/ui/use-toast";
import TemplateDialog from "./TemplateDialog";

const TemplatesPage = () => {
  const {
    templates,
    loading,
    fetchTemplates,
    addUpdateTemplate,
    addUpdateTemplateDetail,
    toggleTemplateStatus,
    deleteTemplateDetail,
    fetchCategories,
    fetchUsers,
    fetchGroups,
  } = useTemplateActions();

  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]); // Add this state for groups
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState(null);
  const [currentTask, setCurrentTask] = useState(null);
  const [expandedTemplates, setExpandedTemplates] = useState({});
  const [subcategories, setSubcategories] = useState([]);
  const [showInlineWarning, setShowInlineWarning] = useState(false);

  useEffect(() => {
    console.log("Fetching templates and reference data...");
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      await fetchTemplates();
      console.log("templates:", templates);
      const categoriesData = await fetchCategories();
      const usersData = await fetchUsers();
      const groupsData = await fetchGroups(); // Add this line
      setCategories(categoriesData);
      setUsers(usersData);
      setGroups(groupsData); // Add this line
    } catch (error) {
      console.error("Error loading initial data:", error);
      swal.fire("Errore", "Errore nel caricamento dei dati", "error");
    }
  };

  const handleCategoryChange = (value) => {
    // Se il valore è "null", significa che è stato selezionato "Nessuna categoria"
    if (value === "null") {
      setCurrentTemplate({
        ...currentTemplate,
        ProjectCategoryId: null,
        ProjectCategoryDetailLine: null,
      });
      setSubcategories([]);
      return;
    }

    const categoryId = parseInt(value);

    // Aggiorna il template con il nuovo valore di categoria
    setCurrentTemplate({
      ...currentTemplate,
      ProjectCategoryId: categoryId,
      ProjectCategoryDetailLine: null, // Reset subcategory when category changes
    });

    // Carica le sottocategorie per questa categoria
    const selectedCategory = categories.find(
      (c) => c.ProjectCategoryId === categoryId,
    );
    setSubcategories(selectedCategory?.details || []);
  };

  const handleSaveTemplate = async () => {
    try {
      if (!currentTemplate?.Description) {
        setShowInlineWarning(true);
        return;
      }
      setShowInlineWarning(false);

      const result = await addUpdateTemplate({
        TemplateID: currentTemplate.TemplateID,
        Description: currentTemplate.Description,
        Notes: currentTemplate.Notes,
        ProjectCategoryId: currentTemplate.ProjectCategoryId,
        ProjectCategoryDetailLine: currentTemplate.ProjectCategoryDetailLine,
        IsActive: currentTemplate.IsActive !== false,
      });

      if (result.success) {
        await fetchTemplates();
        setIsTemplateDialogOpen(false);
        setCurrentTemplate(null);
        swal.fire("Successo", "Template salvato con successo", "success");
      }
    } catch (error) {
      console.error("Error saving template:", error);
      swal.fire("Errore", "Errore nel salvataggio del template", "error");
    }
  };

  const handleSaveTask = async () => {
    try {
      if (!currentTask?.Title) {
        swal.fire(
          "Attenzione",
          "Il titolo dell'attività è obbligatorio",
          "warning",
        );
        return;
      }

      // Determina il TaskSequence se non è specificato
      if (!currentTask.TaskSequence) {
        // Trova l'ultimo task per questo template e incrementa di 10
        const templateTasks =
          templates.find((t) => t.TemplateID === currentTask.TemplateID)
            ?.Details || [];

        const lastSequence =
          templateTasks.length > 0
            ? Math.max(...templateTasks.map((t) => t.TaskSequence || 0))
            : 0;

        currentTask.TaskSequence = lastSequence + 10;
      }

      const result = await addUpdateTemplateDetail({
        TemplateDetailID: currentTask.TemplateDetailID,
        TemplateID: currentTask.TemplateID,
        TaskSequence: currentTask.TaskSequence,
        Title: currentTask.Title,
        Description: currentTask.Description,
        DefaultAssignedTo: currentTask.DefaultAssignedTo,
        DefaultGroupId: currentTask.DefaultGroupId, // Add this line for group
        Priority: currentTask.Priority || "MEDIA",
        StandardDays: currentTask.StandardDays || 1,
        PredecessorDetailID: currentTask.PredecessorDetailID,
      });

      if (result.success) {
        await fetchTemplates();
        setIsTaskDialogOpen(false);
        setCurrentTask(null);
        swal.fire("Successo", "Attività salvata con successo", "success");
      }
    } catch (error) {
      console.error("Error saving task:", error);
      swal.fire("Errore", "Errore nel salvataggio dell'attività", "error");
    }
  };

  const handleToggleTemplate = async (templateId) => {
    try {
      const result = await toggleTemplateStatus(templateId);
      if (result.success) {
        await fetchTemplates();
        toast({
          title: "Template Aggiornato",
          variant: "success",
          duration: 3000,
          style: { backgroundColor: "#2c7a7b", color: "#fff" },
        });
      }
    } catch (error) {
      console.error("Error toggling template:", error);
      swal.fire("Errore", "Errore nell'aggiornamento dello stato", "error");
    }
  };

  const handleDeleteTask = async (templateDetailId) => {
    try {
      // Chiedi conferma prima di eliminare
      const confirm = await swal.fire({
        title: "Sei sicuro?",
        text: "L'eliminazione dell'attività non può essere annullata!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: "Sì, elimina",
        cancelButtonText: "Annulla",
      });

      if (!confirm.isConfirmed) {
        return;
      }

      const result = await deleteTemplateDetail(templateDetailId);
      if (result.success) {
        await fetchTemplates();
        toast({
          title: result.msg || "Attività Eliminata",
          variant: "success",
          duration: 3000,
        });
      } else {
        swal.fire(
          "Attenzione",
          result.msg || "Impossibile eliminare l'attività",
          "warning",
        );
      }
    } catch (error) {
      console.error("Error deleting task:", error);
      swal.fire("Errore", "Errore nell'eliminazione dell'attività", "error");
    }
  };

  const toggleExpandTemplate = (templateId) => {
    setExpandedTemplates((prev) => ({
      ...prev,
      [templateId]: !prev[templateId],
    }));
  };

  if (loading && templates.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <span className="text-gray-500">Caricamento...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gestione Template Attività</h1>
        <Button
          onClick={() => {
            setCurrentTemplate({ Description: "", Notes: "", IsActive: true });
            setIsTemplateDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nuovo Template
        </Button>
      </div>

      {showInlineWarning && (
        <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mb-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">
                Attenzione: la descrizione del template è obbligatoria
              </p>
            </div>
          </div>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12"></TableHead>
            <TableHead>Descrizione</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Sottocategoria</TableHead>
            <TableHead>Num. Attività</TableHead>
            <TableHead>Stato</TableHead>
            <TableHead className="w-[120px]">Azioni</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {templates.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-4">
                Nessun template disponibile. Clicca su "Nuovo Template" per
                crearne uno.
              </TableCell>
            </TableRow>
          ) : (
            templates.map((template) => (
              <React.Fragment key={template.TemplateID}>
                <TableRow className="cursor-pointer hover:bg-gray-50">
                  <TableCell
                    onClick={() => toggleExpandTemplate(template.TemplateID)}
                  >
                    {expandedTemplates[template.TemplateID] ? (
                      <ChevronDown className="h-5 w-5" />
                    ) : (
                      <ChevronRight className="h-5 w-5" />
                    )}
                  </TableCell>
                  <TableCell
                    className="font-medium"
                    onClick={() => toggleExpandTemplate(template.TemplateID)}
                  >
                    {template.Description}
                  </TableCell>
                  <TableCell
                    onClick={() => toggleExpandTemplate(template.TemplateID)}
                  >
                    {template.CategoryName || "-"}
                  </TableCell>
                  <TableCell
                    onClick={() => toggleExpandTemplate(template.TemplateID)}
                  >
                    {template.SubCategoryName || "-"}
                  </TableCell>
                  <TableCell
                    onClick={() => toggleExpandTemplate(template.TemplateID)}
                  >
                    {template.Details?.length || 0}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        template.IsActive == "1" ? "success" : "destructive"
                      }
                    >
                      {template.IsActive == "1" ? "Attivo" : "Disabilitato"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setCurrentTemplate(template);
                          setIsTemplateDialogOpen(true);
                          // Carica le sottocategorie per questa categoria
                          if (template.ProjectCategoryId) {
                            const selectedCategory = categories.find(
                              (c) =>
                                c.ProjectCategoryId ===
                                template.ProjectCategoryId,
                            );
                            setSubcategories(selectedCategory?.details || []);
                          } else {
                            setSubcategories([]);
                          }
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          handleToggleTemplate(template.TemplateID)
                        }
                      >
                        {template.IsActive ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>

                {/* Template details/tasks */}
                {expandedTemplates[template.TemplateID] && (
                  <TableRow>
                    <TableCell colSpan={7} className="p-0 border-t-0">
                      <div className="bg-gray-50 p-4">
                        <div className="flex justify-between items-center mb-3">
                          <h3 className="text-md font-semibold">
                            Attività del Template
                          </h3>
                          <Button
                            size="sm"
                            onClick={() => {
                              setCurrentTask({
                                TemplateID: template.TemplateID,
                                Priority: "MEDIA",
                                StandardDays: 1,
                              });
                              setIsTaskDialogOpen(true);
                            }}
                          >
                            <Plus className="mr-1 h-3 w-3" />
                            Aggiungi Attività
                          </Button>
                        </div>

                        {template.Details?.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Sequenza</TableHead>
                                <TableHead>Titolo</TableHead>
                                <TableHead>Priorità</TableHead>
                                <TableHead>Assegnato a</TableHead>
                                <TableHead>Gruppo</TableHead>{" "}
                                {/* Add this column */}
                                <TableHead>Giorni</TableHead>
                                <TableHead>Predecessore</TableHead>
                                <TableHead className="w-[100px]">
                                  Azioni
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {template.Details.map((task) => (
                                <TableRow key={task.TemplateDetailID}>
                                  <TableCell>{task.TaskSequence}</TableCell>
                                  <TableCell className="font-medium">
                                    {task.Title}
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
                                  <TableCell>
                                    {task.AssigneeName || "-"}
                                  </TableCell>
                                  <TableCell>{task.GroupName || "-"}</TableCell>{" "}
                                  {/* Add this cell */}
                                  <TableCell>{task.StandardDays}</TableCell>
                                  <TableCell>
                                    {task.PredecessorTitle || "-"}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex gap-1">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => {
                                          setCurrentTask({
                                            ...task,
                                            TemplateID: template.TemplateID,
                                          });
                                          setIsTaskDialogOpen(true);
                                        }}
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-red-500"
                                        onClick={() =>
                                          handleDeleteTask(
                                            task.TemplateDetailID,
                                          )
                                        }
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <div className="text-center py-4 text-gray-500">
                            Nessuna attività definita per questo template.
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))
          )}
        </TableBody>
      </Table>

      {/* Dialog per template */}
      <TemplateDialog
        open={isTemplateDialogOpen}
        onOpenChange={setIsTemplateDialogOpen}
        currentTemplate={currentTemplate}
        setCurrentTemplate={setCurrentTemplate}
        categories={categories}
        subcategories={subcategories}
        handleCategoryChange={handleCategoryChange}
        handleSaveTemplate={handleSaveTemplate}
      />

      {/* Dialog per attività */}
      <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {currentTask?.TemplateDetailID
                ? "Modifica Attività"
                : "Nuova Attività"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label>Titolo *</Label>
              <Input
                value={currentTask?.Title || ""}
                onChange={(e) =>
                  setCurrentTask({
                    ...currentTask,
                    Title: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <Label>Descrizione</Label>
              <Textarea
                value={currentTask?.Description || ""}
                onChange={(e) =>
                  setCurrentTask({
                    ...currentTask,
                    Description: e.target.value,
                  })
                }
                rows={3}
              />
            </div>
            <div>
              <Label>Sequenza</Label>
              <Input
                type="number"
                value={currentTask?.TaskSequence || ""}
                onChange={(e) =>
                  setCurrentTask({
                    ...currentTask,
                    TaskSequence: parseInt(e.target.value) || "",
                  })
                }
                placeholder="La sequenza determina l'ordine delle attività"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Priorità</Label>
                <Select
                  value={currentTask?.Priority || "MEDIA"}
                  onValueChange={(value) =>
                    setCurrentTask({
                      ...currentTask,
                      Priority: value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona priorità" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALTA">ALTA</SelectItem>
                    <SelectItem value="MEDIA">MEDIA</SelectItem>
                    <SelectItem value="BASSA">BASSA</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Giorni Standard</Label>
                <Input
                  type="number"
                  value={currentTask?.StandardDays || 1}
                  onChange={(e) =>
                    setCurrentTask({
                      ...currentTask,
                      StandardDays: parseInt(e.target.value) || 1,
                    })
                  }
                  min={1}
                />
              </div>
            </div>
            <div>
              <Label>Assegnato a</Label>
              <Select
                value={currentTask?.DefaultAssignedTo?.toString() || "null"}
                onValueChange={(value) =>
                  setCurrentTask({
                    ...currentTask,
                    DefaultAssignedTo:
                      value === "null" ? null : parseInt(value),
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona utente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="null">- Nessun assegnatario -</SelectItem>
                  {users.map((user) => (
                    <SelectItem
                      key={user.userId}
                      value={user.userId.toString()}
                    >
                      {user.firstName} {user.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Aggiunta selezione gruppo */}
            <div>
              <Label>Gruppo</Label>
              <Select
                value={currentTask?.DefaultGroupId?.toString() || "null"}
                onValueChange={(value) =>
                  setCurrentTask({
                    ...currentTask,
                    DefaultGroupId: value === "null" ? null : parseInt(value),
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona gruppo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="null">- Nessun gruppo -</SelectItem>
                  {groups.map((group) => (
                    <SelectItem
                      key={group.groupId}
                      value={group.groupId.toString()}
                    >
                      {group.groupName} - {group.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                Se selezionato, l'attività verrà assegnata a tutti i membri del
                gruppo
              </p>
            </div>
            <div>
              <Label>Attività Predecessore</Label>
              <Select
                value={currentTask?.PredecessorDetailID?.toString() || "null"}
                onValueChange={(value) =>
                  setCurrentTask({
                    ...currentTask,
                    PredecessorDetailID:
                      value === "null" ? null : parseInt(value),
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona predecessore" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="null">- Nessun predecessore -</SelectItem>
                  {templates
                    .find((t) => t.TemplateID === currentTask?.TemplateID)
                    ?.Details.filter(
                      (task) =>
                        task.TemplateDetailID !== currentTask?.TemplateDetailID,
                    )
                    .map((task) => (
                      <SelectItem
                        key={task.TemplateDetailID}
                        value={task.TemplateDetailID.toString()}
                      >
                        {task.TaskSequence} - {task.Title}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={handleSaveTask}>
              Salva
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TemplatesPage;
