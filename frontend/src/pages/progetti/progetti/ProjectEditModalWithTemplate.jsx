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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Trash2, 
  FileText, 
  User, 
  Calendar, 
  Bookmark, 
  Tag, 
  ListTodo, 
  Info,
  Hash
} from "lucide-react";
import useCategoryActions from "../../../hooks/useCategoryActions";
import { CustomerSearchSelect } from "./ProjectComponents";
import useTemplateActions from "../../../hooks/useTemplateActions";
import useProjectActions from "../../../hooks/useProjectManagementActions";
import useProjectCustomersActions, {
  CUSTOMER_TYPE,
} from "../../../hooks/useProjectCustomersActions";

const ProjectEditModalWithTemplate = ({
  project,
  isOpen,
  onClose,
  onSave,
  onChange,
  onDisable,
  formErrors = {},
}) => {
  const {
    projectCustomers,
    loading: loadingCustomers,
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

  // Caricamento dati iniziale
  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        fetchCategories(),
        fetchProjectCustomers(),
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
  ]);

  // Inizializzazione progetto quando si apre
  useEffect(() => {
    if (project) {
      const updatedProject = {
        ...project,
        ProjectCategoryId: project.ProjectCategoryId || 0,
        ProjectCategoryDetailLine: project.ProjectCategoryDetailLine || 0,
        Disabled: project.Disabled || 0,
        ProjectErpID: project?.ProjectErpID || "",
        TemplateID: project?.TemplateID || null,
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

  // Gestione generica delle modifiche ai campi
  const handleChange = (field, value) => {
    if (field === "CustSupp") {
      const custSuppValue = Array.isArray(value) ? value[0] : value;
      const updatedProject = { ...localProject, [field]: custSuppValue };
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
    onChange && onChange(updatedProject);

    // Carica i template filtrati per categoria e sottocategoria
    if (selectedCategory > 0) {
      await fetchFilteredTemplates(selectedCategory, line > 0 ? line : null);
    }
  };

  // Gestione cambio template - approccio migliorato
  const handleTemplateChange = (value) => {
    const templateId = value === "0" ? null : parseInt(value);
    console.log("Template selezionato:", templateId);

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
                      placeholder="Inserisci ID ERP"
                      className="mt-1"
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
                
                <div>
                  <Label htmlFor="customer" className="flex items-center text-sm">
                    <User className="h-3.5 w-3.5 mr-1.5 text-gray-500" />
                    Cliente
                  </Label>
                  <CustomerSearchSelect
                    value={localProject.CustSupp}
                    onChange={(value) => handleChange("CustSupp", value)}
                    projectCustomers={projectCustomers}
                    loading={loadingCustomers}
                    className="mt-1"
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
                          {template.Description}{" "}
                          {template.TaskCount > 0
                            ? `(${template.TaskCount} attività)`
                            : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedTemplateId && (
                    <p className="text-xs text-gray-500 mt-1 px-2 py-1 bg-blue-50 rounded border border-blue-100">
                      <Info className="h-3 w-3 inline mr-1" />
                      Le attività verranno create automaticamente dal template.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2 mt-2 border-t shrink-0">
            <Button variant="outline" onClick={onClose} className="px-4">
              Annulla
            </Button>
            <Button onClick={() => onSave(localProject)} className="px-5 shadow-sm">
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
