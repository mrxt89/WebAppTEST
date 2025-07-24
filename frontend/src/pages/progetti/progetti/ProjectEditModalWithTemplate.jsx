import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Trash2, 
  FileText, 
  User, 
  Calendar, 
  Bookmark, 
  Tag, 
  ListTodo, 
  Info,
  Hash,
  Building2,
  Layers,
  HelpCircle,
  AlertTriangle,
} from "lucide-react";
import useCategoryActions from "../../../hooks/useCategoryActions";
import { CustomerSearchSelect } from "./ProjectComponents";
import useTemplateActions from "../../../hooks/useTemplateActions";
import useProjectActions from "../../../hooks/useProjectManagementActions";
import useProjectCustomersActions from "../../../hooks/useProjectCustomersActions";

const ProjectEditModalWithTemplate = ({
  project,
  isOpen,
  onClose,
  onSave,
  onChange,
  onDisable,
  formErrors = {},
  onProjectUpdated,
  customers,
}) => {
  const {
    projectCustomers,
    loading: loadingProjectCustomers,
    fetchProjectCustomers,
  } = useProjectCustomersActions();
  
  const {
    categories,
    loading: loadingCategories,
    fetchCategories,
  } = useCategoryActions();
  
  const {
    templates,
    loading: loadingTemplates,
    fetchTemplates,
    fetchFilteredTemplates,
  } = useTemplateActions();
  
  const { projectStatuses, fetchProjectStatuses } = useProjectActions();
  
  // Stato principale del progetto
  const [localProject, setLocalProject] = useState({
    ...project,
    Disabled: project?.Disabled || 0,
    TemplateID: project?.TemplateID || null,
    UseStages: project?.UseStages || false,
  });

  // Stati separati per l'interfaccia utente
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    project?.TemplateID || null,
  );
  const [selectedCategory, setSelectedCategory] = useState(
    project?.ProjectCategoryId || 0,
  );
  const [selectedSubcategory, setSelectedSubcategory] = useState(
    project?.ProjectCategoryDetailLine || 0,
  );
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [templateHasStages, setTemplateHasStages] = useState(false);
  const [showTemplateWarning, setShowTemplateWarning] = useState(false);

  // Usa customers o projectCustomers in base a quale è disponibile
  const availableCustomers = customers || projectCustomers || [];
  const loadingCustomers = !customers ? loadingProjectCustomers : false;

  // Caricamento dati iniziale
  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        fetchCategories(),
        !customers && fetchProjectCustomers(), // Carica solo se non abbiamo già customers
        fetchTemplates(),
        fetchProjectStatuses(),
      ]);
    };
    loadData();
  }, [
    fetchCategories,
    fetchProjectCustomers,
    fetchTemplates,
    fetchProjectStatuses,
    customers,
  ]);

  // Inizializzazione progetto quando si apre
  useEffect(() => {
    if (project) {
      // Gestione CustSupp: se è un array, prendi il primo valore
      let custSuppValue = project.CustSupp;
      if (Array.isArray(custSuppValue)) {
        custSuppValue = custSuppValue[0];
      }
      const custSuppInt = custSuppValue && custSuppValue !== "" ? parseInt(custSuppValue) : 0;

      const updatedProject = {
        ...project,
        ProjectCategoryId: project.ProjectCategoryId || 0,
        ProjectCategoryDetailLine: project.ProjectCategoryDetailLine || 0,
        Disabled: project.Disabled || 0,
        ProjectErpID: project?.ProjectErpID || "",
        TemplateID: project?.TemplateID || null,
        UseStages: project?.UseStages === 1 || project?.UseStages === true,
        CustSupp: custSuppInt, // Usa il valore convertito
        // Se è un nuovo progetto e non ha uno stato, usa il primo stato attivo
        Status:
          project.Status ||
          (projectStatuses && projectStatuses.length > 0
            ? projectStatuses.find((s) => s.IsActive === 1)?.Id
            : "1A"),
      };
      setLocalProject(updatedProject);
      setSelectedCategory(updatedProject.ProjectCategoryId);
      setSelectedSubcategory(updatedProject.ProjectCategoryDetailLine);
      setSelectedTemplateId(updatedProject.TemplateID);
      onChange && onChange(updatedProject);
    }
  }, [project, onChange, projectStatuses]);

  // Controlla se il template selezionato ha stages
  useEffect(() => {
    if (selectedTemplateId && templates.length > 0) {
      const selectedTemplate = templates.find(t => t.TemplateID === selectedTemplateId);
      if (selectedTemplate && selectedTemplate.UseStages) {
        setTemplateHasStages(true);
        // Se il template ha stages, abilita automaticamente UseStages
        const updatedProject = { ...localProject, UseStages: true };
        setLocalProject(updatedProject);
        onChange && onChange(updatedProject);
      } else {
        setTemplateHasStages(false);
      }
    } else {
      setTemplateHasStages(false);
    }
  }, [selectedTemplateId, templates]);

  // Gestione generica delle modifiche ai campi
  const handleChange = (field, value) => {
    if (field === "CustSupp") {
      // Se è un array, prendi sempre e solo il primo valore
      const custSuppValue = Array.isArray(value) ? value[0] : value;
      
      // Converti in intero se è un valore valido, altrimenti usa 0 (non null)
      const custSuppInt = custSuppValue && custSuppValue !== "" ? parseInt(custSuppValue) : 0;
      const updatedProject = { ...localProject, [field]: custSuppInt };
      setLocalProject(updatedProject);
      onChange && onChange(updatedProject);
    } else {
      const updatedProject = { ...localProject, [field]: value };
      setLocalProject(updatedProject);
      onChange && onChange(updatedProject);
    }
  };

  // Gestione cambio categoria
  const handleCategoryChange = async (value) => {
    const categoryId = value === "0" ? 0 : parseInt(value);
    setSelectedCategory(categoryId);
    setSelectedSubcategory(0);

    // Reset del template quando cambia la categoria
    const updatedProject = {
      ...localProject,
      ProjectCategoryId: categoryId,
      ProjectCategoryDetailLine: 0,
      TemplateID: null,
    };
    setLocalProject(updatedProject);
    setSelectedTemplateId(null);
    setShowTemplateWarning(false);
    onChange && onChange(updatedProject);

    // Carica i template filtrati per la categoria selezionata
    if (categoryId > 0) {
      await fetchFilteredTemplates(categoryId);
    } else {
      await fetchTemplates();
    }
  };

  // Gestione cambio sottocategoria
  const handleSubcategoryChange = async (value) => {
    const line = value === "0" ? 0 : parseInt(value);
    setSelectedSubcategory(line);

    // Reset del template quando cambia la sottocategoria
    const updatedProject = {
      ...localProject,
      ProjectCategoryDetailLine: line,
      TemplateID: null,
    };
    setLocalProject(updatedProject);
    setSelectedTemplateId(null);
    setShowTemplateWarning(false);
    onChange && onChange(updatedProject);

    // Carica i template filtrati per categoria e sottocategoria
    if (selectedCategory > 0) {
      await fetchFilteredTemplates(selectedCategory, line > 0 ? line : null);
    }
  };

  // Gestione cambio template
  const handleTemplateChange = (value) => {
    const templateId = value === "0" ? null : parseInt(value);
    console.log("Template selezionato:", templateId);

    // Se è un progetto esistente e viene selezionato un template, mostra avviso
    if (project?.ProjectID && templateId) {
      setShowTemplateWarning(true);
    } else {
      setShowTemplateWarning(false);
    }

    // Aggiorna lo stato
    setSelectedTemplateId(templateId);

    // Aggiorna anche il progetto
    const updatedProject = {
      ...localProject,
      TemplateID: templateId,
    };

    setLocalProject(updatedProject);
    onChange && onChange(updatedProject);
  };

  // Gestione disabilitazione progetto
  const handleDisable = () => setConfirmModalOpen(true);
  const confirmDisable = () => {
    onDisable(localProject.ProjectID);
    setConfirmModalOpen(false);
    onClose();
  };

  // Filtraggio template in base a categoria/sottocategoria
  const filteredTemplates = templates.filter((template) => {
    if (!selectedCategory) return true;

    if (selectedCategory && !selectedSubcategory) {
      return template.ProjectCategoryId === selectedCategory;
    }

    return (
      template.ProjectCategoryId === selectedCategory &&
      template.ProjectCategoryDetailLine === selectedSubcategory
    );
  });

  // Filtraggio stati attivi
  const activeStatuses = Array.isArray(projectStatuses)
    ? projectStatuses.filter((status) => status.IsActive === 1)
    : [];

  if (!localProject) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex flex-row items-center justify-between border-b pb-2 mb-2 shrink-0">
            <DialogTitle className="text-xl font-semibold">
              {project?.ProjectID ? "Modifica Progetto" : "Nuovo Progetto"}
            </DialogTitle>
            {project?.ProjectID && (
              <Button
                variant="ghost"
                size="icon"
                className="text-red-500 hover:text-red-700 hover:bg-red-100 rounded-full transition-colors"
                onClick={handleDisable}
                title="Disabilita progetto"
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            )}
          </DialogHeader>

          <div className="space-y-3 pt-0 overflow-y-auto pr-2">
            {/* Dati principali */}
            <div className="bg-gray-50 p-3 rounded-lg space-y-3">
              <h3 className="text-xs font-medium text-gray-500">Informazioni principali</h3>
              
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <Label htmlFor="name" className="flex items-center text-sm">
                    <FileText className="h-3.5 w-3.5 mr-1.5 text-gray-500" />
                    Nome Progetto <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={localProject.Name}
                    onChange={(e) => handleChange("Name", e.target.value)}
                    className={`mt-1 ${formErrors?.Name ? "border-red-500" : ""}`}
                    placeholder="Inserisci nome progetto"
                  />
                  {formErrors?.Name && (
                    <p className="text-xs text-red-500 mt-0.5">{formErrors.Name}</p>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="projectErpId" className="flex items-center text-sm">
                      <Hash className="h-3.5 w-3.5 mr-1.5 text-gray-500" />
                      ID ERP
                    </Label>
                    <Input
                      id="projectErpId"
                      value={localProject.ProjectErpID}
                      onChange={(e) => handleChange("ProjectErpID", e.target.value)}
                      placeholder="Automatico"
                      className="mt-1"
                      readOnly
                      disabled
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="status" className="flex items-center text-sm">
                      <Bookmark className="h-3.5 w-3.5 mr-1.5 text-gray-500" />
                      Stato
                    </Label>
                    <Select
                      value={localProject.Status}
                      onValueChange={(value) => handleChange("Status", value)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Seleziona stato" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeStatuses.map((status) => (
                          <SelectItem key={status.Id} value={status.Id}>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: status.HexColor }}
                              />
                              {status.StatusDescription}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="customer" className="flex items-center text-sm">
                    <Building2 className="h-3.5 w-3.5 mr-1.5 text-gray-500" />
                    Cliente
                  </Label>
                  <CustomerSearchSelect
                    value={localProject.CustSupp}
                    onChange={(value) => handleChange("CustSupp", value)}
                    projectCustomers={availableCustomers}
                    loading={loadingCustomers}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Dettagli progetto */}
              <div className="bg-gray-50 p-3 rounded-lg space-y-3">
                <h3 className="text-xs font-medium text-gray-500">Dettagli</h3>
                
                <div>
                  <Label htmlFor="description" className="flex items-center text-sm">
                    <Info className="h-3.5 w-3.5 mr-1.5 text-gray-500" />
                    Descrizione
                  </Label>
                  <Textarea
                    id="description"
                    value={localProject.Description}
                    onChange={(e) => handleChange("Description", e.target.value)}
                    rows={2}
                    className="mt-1"
                    placeholder="Inserisci descrizione progetto"
                  />
                </div>
              </div>
              
              {/* Date */}
              <div className="bg-gray-50 p-3 rounded-lg space-y-3">
                <h3 className="text-xs font-medium text-gray-500">Date</h3>
                
                <div>
                  <Label htmlFor="startDate" className="flex items-center text-sm">
                    <Calendar className="h-3.5 w-3.5 mr-1.5 text-gray-500" />
                    Data Inizio <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={localProject.StartDate?.split("T")[0]}
                    onChange={(e) => handleChange("StartDate", e.target.value)}
                    className={`mt-1 ${formErrors?.StartDate ? "border-red-500" : ""}`}
                  />
                  {formErrors?.StartDate && (
                    <p className="text-xs text-red-500 mt-0.5">
                      {formErrors.StartDate}
                    </p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="endDate" className="flex items-center text-sm">
                    <Calendar className="h-3.5 w-3.5 mr-1.5 text-gray-500" />
                    Data Fine
                  </Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={localProject.EndDate?.split("T")[0] || ""}
                    min={localProject.StartDate?.split("T")[0]}
                    onChange={(e) => handleChange("EndDate", e.target.value || null)}
                    className={`mt-1 ${formErrors?.EndDate ? "border-red-500" : ""}`}
                  />
                  {formErrors?.EndDate && (
                    <p className="text-xs text-red-500 mt-0.5">
                      {formErrors.EndDate}
                    </p>
                  )}
                </div>
              </div>
            </div>
            
            {/* Classificazione e template */}
            <div className="bg-gray-50 p-3 rounded-lg space-y-3">
              <h3 className="text-xs font-medium text-gray-500">Classificazione e template</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="category" className="flex items-center text-sm">
                    <Tag className="h-3.5 w-3.5 mr-1.5 text-gray-500" />
                    Categoria
                  </Label>
                  <Select
                    value={selectedCategory?.toString() || "0"}
                    onValueChange={handleCategoryChange}
                  >
                    <SelectTrigger className="w-full mt-1">
                      <SelectValue placeholder="Seleziona categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Nessuna categoria</SelectItem>
                      {categories.map((category) => (
                        <SelectItem
                          key={category.ProjectCategoryId}
                          value={category.ProjectCategoryId.toString()}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: category.HexColor }}
                            />
                            {category.Description}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedCategory > 0 &&
                  categories.find((c) => c.ProjectCategoryId === selectedCategory)
                    ?.details?.length > 0 ? (
                    <div>
                      <Label htmlFor="subcategory" className="flex items-center text-sm">
                        <Tag className="h-3.5 w-3.5 mr-1.5 text-gray-500" />
                        Sottocategoria
                      </Label>
                      <Select
                        value={selectedSubcategory?.toString() || "0"}
                        onValueChange={handleSubcategoryChange}
                      >
                        <SelectTrigger className="w-full mt-1">
                          <SelectValue placeholder="Seleziona sottocategoria" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Nessuna sottocategoria</SelectItem>
                          {categories
                            .find((c) => c.ProjectCategoryId === selectedCategory)
                            ?.details?.filter((d) => !d.Disabled)
                            ?.map((subcategory) => (
                              <SelectItem
                                key={subcategory.Line}
                                value={subcategory.Line.toString()}
                              >
                                {subcategory.Description}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="hidden md:block">
                      {/* Spazio vuoto nel caso non ci siano sottocategorie */}
                    </div>
                  )}

                <div className="md:col-span-2">
                  <Label htmlFor="template" className="flex items-center text-sm">
                    <ListTodo className="h-3.5 w-3.5 mr-1.5 text-gray-500" />
                    Template di Attività
                  </Label>
                  <Select
                    value={
                      selectedTemplateId !== null
                        ? selectedTemplateId.toString()
                        : "0"
                    }
                    onValueChange={handleTemplateChange}
                  >
                    <SelectTrigger className="w-full mt-1">
                      <SelectValue placeholder="Seleziona template" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Nessun template</SelectItem>
                      {filteredTemplates.map((template) => (
                        <SelectItem
                          key={template.TemplateID}
                          value={template.TemplateID.toString()}
                          style={{
                            display: template.IsActive == "1" ? "block" : "none",
                          }}
                        >
                          <div className="flex items-center gap-2">
                            {template.Description}
                            {template.TaskCount > 0 && (
                              <span className="text-gray-500">
                                ({template.TaskCount} attività)
                              </span>
                            )}
                            {template.UseStages && (
                              <Layers className="h-3 w-3 text-purple-600" />
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedTemplateId && !project?.ProjectID && (
                    <p className="text-xs text-gray-500 mt-1 px-2 py-1 bg-blue-50 rounded border border-blue-100">
                      <Info className="h-3 w-3 inline mr-1" />
                      Le attività verranno create automaticamente dal template.
                      {templateHasStages && " Il template include fasi di lavoro."}
                    </p>
                  )}

                  {project?.ProjectID && selectedTemplateId && showTemplateWarning && (
                    <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                      <div className="flex items-start">
                        <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
                        <div className="text-sm text-yellow-800">
                          <p className="font-semibold mb-1">Attenzione!</p>
                          <p>Applicando questo template:</p>
                          <ul className="list-disc list-inside mt-1 space-y-1">
                            <li>Verranno eliminate tutte le attività in stato "DA FARE"</li>
                            <li>Verranno create le nuove attività dal template selezionato</li>
                            <li>Le attività già avviate o completate non saranno modificate</li>
                          </ul>
                          <p className="mt-2 text-xs text-yellow-700">Questa operazione non può essere annullata.</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Opzioni avanzate */}
            <div className="bg-gray-50 p-3 rounded-lg space-y-3">
              <h3 className="text-xs font-medium text-gray-500">Opzioni avanzate</h3>
              
              <div className="space-y-3">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="useStages"
                    checked={localProject.UseStages}
                    onCheckedChange={(checked) => handleChange("UseStages", checked)}
                    disabled={templateHasStages} // Disabilita se il template ha già stages
                    className="mt-0.5 bg-primary"
                  />
                  <div className="flex-1">
                    <Label htmlFor="useStages" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                      <Layers className="h-3.5 w-3.5 text-purple-600" />
                      Usa fasi di lavoro
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-3 w-3 text-gray-400" />
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-xs">
                            <p>Le fasi di lavoro ti permettono di organizzare il progetto in momenti ben definiti (es. Analisi, Sviluppo, Test) con checklist di completamento per ogni fase.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Label>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Organizza il progetto in fasi con checklist di completamento
                    </p>
                    {templateHasStages && (
                      <p className="text-xs text-purple-600 mt-1">
                        <Info className="h-3 w-3 inline mr-1" />
                        Abilitato automaticamente dal template selezionato
                      </p>
                    )}
                  </div>
                </div>

                {!project?.ProjectID && localProject.UseStages && !selectedTemplateId && (
                  <div className="ml-6 p-2 bg-purple-50 rounded-md border border-purple-200">
                    <p className="text-xs text-purple-700">
                      <Info className="h-3 w-3 inline mr-1" />
                      Potrai definire le fasi dopo la creazione del progetto
                    </p>
                  </div>
                )}

                {project?.ProjectID && project?.UseStages !== localProject.UseStages && (
                  <div className="ml-6 p-2 bg-yellow-50 rounded-md border border-yellow-200">
                    <p className="text-xs text-yellow-700">
                      <Info className="h-3 w-3 inline mr-1" />
                      {localProject.UseStages 
                        ? "Abilitando le fasi, le attività esistenti dovranno essere assegnate manualmente alle varie fasi."
                        : "Disabilitando le fasi, le attività torneranno alla vista standard senza raggruppamenti."}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2 mt-2 border-t shrink-0">
            <Button variant="outline" onClick={onClose} className="px-4">
              Annulla
            </Button>
            <Button onClick={() => {
              onSave(localProject);
              onProjectUpdated && onProjectUpdated();
            }} className="px-5 shadow-sm">
              {project?.ProjectID ? "Salva Modifiche" : "Crea Progetto"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmModalOpen} onOpenChange={setConfirmModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader className="border-b pb-3 mb-3">
            <DialogTitle className="text-red-600 flex items-center">
              <Trash2 className="h-5 w-5 mr-2" />
              Sei sicuro?
            </DialogTitle>
          </DialogHeader>
          <p className="text-gray-700">
            Il progetto verrà disabilitato. Questa azione non può essere
            annullata!
          </p>
          <div className="flex justify-end gap-2 mt-4 pt-2 border-t">
            <Button
              variant="outline"
              onClick={() => setConfirmModalOpen(false)}
            >
              Annulla
            </Button>
            <Button
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={confirmDisable}
            >
              Sì, disabilita
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProjectEditModalWithTemplate;