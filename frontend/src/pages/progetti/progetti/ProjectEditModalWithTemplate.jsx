import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from 'lucide-react';
import useCategoryActions from '../../../hooks/useCategoryActions';
import { CustomerSearchSelect } from './ProjectComponents';
import useTemplateActions from '../../../hooks/useTemplateActions';
import useProjectActions from '../../../hooks/useProjectManagementActions';
import useProjectCustomersActions, { CUSTOMER_TYPE } from "../../../hooks/useProjectCustomersActions";

const ProjectEditModalWithTemplate = ({ project, isOpen, onClose, onSave, onChange, onDisable, formErrors = {} }) => {
  const { 
    projectCustomers,
    loading: loadingCustomers,
    fetchProjectCustomers
  } = useProjectCustomersActions();
  const { categories, loading: loadingCategories, fetchCategories } = useCategoryActions();
  const { templates, loading: loadingTemplates, fetchTemplates, fetchFilteredTemplates } = useTemplateActions();
  const { projectStatuses, fetchProjectStatuses } = useProjectActions();
  // Stato principale del progetto
  const [localProject, setLocalProject] = useState({ 
    ...project, 
    Disabled: project?.Disabled || 0,
    TemplateID: project?.TemplateID || null
  });
  
  // Stati separati per l'interfaccia utente
  const [selectedTemplateId, setSelectedTemplateId] = useState(project?.TemplateID || null);
  const [selectedCategory, setSelectedCategory] = useState(project?.ProjectCategoryId || 0);
  const [selectedSubcategory, setSelectedSubcategory] = useState(project?.ProjectCategoryDetailLine || 0);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  // Caricamento dati iniziale
  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        fetchCategories(),
        fetchProjectCustomers(),
        fetchTemplates(),
        fetchProjectStatuses()
      ]);
    };
    loadData();
  }, [fetchCategories, fetchProjectCustomers, fetchTemplates, fetchProjectStatuses]);

  // Inizializzazione progetto quando si apre
  useEffect(() => {
    if (project) {
      const updatedProject = {
        ...project,
        ProjectCategoryId: project.ProjectCategoryId || 0,
        ProjectCategoryDetailLine: project.ProjectCategoryDetailLine || 0,
        Disabled: project.Disabled || 0,
        ProjectErpID: project?.ProjectErpID || '',
        TemplateID: project?.TemplateID || null,
        // Se è un nuovo progetto e non ha uno stato, usa il primo stato attivo
        Status: project.Status || (projectStatuses && projectStatuses.length > 0 ? 
          projectStatuses.find(s => s.IsActive === 1)?.Id : '1A')
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
    if (field === 'CustSupp') {
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
      TemplateID: null
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
      TemplateID: null
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
      TemplateID: templateId
    };
    
    setLocalProject(updatedProject);
    onChange && onChange(updatedProject);
  };

  // Gestione disabilitazione progetto
  const handleDisable = () => setConfirmModalOpen(true);
  const confirmDisable = () => {
    onDisable();
    setConfirmModalOpen(false);
    onClose();
  };

  // Filtraggio template in base a categoria/sottocategoria
  const filteredTemplates = templates.filter(template => {
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
    ? projectStatuses.filter(status => status.IsActive === 1)
    : [];
  
  // Funzione per ottenere il nome del template selezionato
  const getSelectedTemplateName = () => {
    if (selectedTemplateId === null) return "Nessun template";
    const template = templates.find(t => t.TemplateID === selectedTemplateId);
    return template ? template.Description : "Template selezionato";
  };
  
  if (!localProject) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle>
              {project?.ProjectID ? 'Modifica Progetto' : 'Nuovo Progetto'}
            </DialogTitle>
            {project?.ProjectID && (
              <Button 
                variant="ghost" 
                size="icon"
                className="text-red-500 hover:text-red-700 hover:bg-red-100"
                onClick={handleDisable}
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            )}
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div>
              <Label htmlFor="name" className="flex items-center">
                Nome Progetto <span className="text-red-500 ml-1">*</span>
              </Label>
              <Input
                id="name"
                value={localProject.Name}
                onChange={(e) => handleChange('Name', e.target.value)}
                className={formErrors?.Name ? "border-red-500" : ""}
              />
              {formErrors?.Name && (
                <p className="text-sm text-red-500 mt-1">{formErrors.Name}</p>
              )}
            </div>
            <div>
              <Label htmlFor="projectErpId">ID ERP</Label>
              <Input
                id="projectErpId"
                value={localProject.ProjectErpID}
                onChange={(e) => handleChange('ProjectErpID', e.target.value)}
                placeholder="Inserisci ID ERP"
              />
            </div>
            <div>
              <Label htmlFor="description">Descrizione</Label>
              <Textarea
                id="description"
                value={localProject.Description}
                onChange={(e) => handleChange('Description', e.target.value)}
                rows={4}
              />
            </div>
            <div>
              <Label htmlFor="customer">Cliente</Label>
              <CustomerSearchSelect
                value={localProject.CustSupp}
                onChange={(value) => handleChange('CustSupp', value)}
                projectCustomers={projectCustomers}
                loading={loadingCustomers}
              />
            </div>
            <div>
              <Label htmlFor="status">Stato</Label>
              <Select
                value={localProject.Status}
                onValueChange={(value) => handleChange('Status', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona stato" />
                </SelectTrigger>
                <SelectContent>
                  {activeStatuses.map(status => (
                    <SelectItem 
                      key={status.Id} 
                      value={status.Id}
                    >
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

            <div>
              <Label htmlFor="category">Categoria</Label>
              <Select
                value={selectedCategory?.toString() || "0"}
                onValueChange={handleCategoryChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleziona categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Nessuna categoria</SelectItem>
                  {categories.map(category => (
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

            {selectedCategory > 0 && categories.find(c => c.ProjectCategoryId === selectedCategory)?.details?.length > 0 && (
              <div>
                <Label htmlFor="subcategory">Sottocategoria</Label>
                <Select
                  value={selectedSubcategory?.toString() || "0"}
                  onValueChange={handleSubcategoryChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleziona sottocategoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Nessuna sottocategoria</SelectItem>
                    {categories
                      .find(c => c.ProjectCategoryId === selectedCategory)
                      ?.details
                      ?.filter(d => !d.Disabled)
                      ?.map(subcategory => (
                        <SelectItem 
                          key={subcategory.Line} 
                          value={subcategory.Line.toString()}
                        >
                          {subcategory.Description}
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {/* Selezione template ottimizzata */}
            <div>
              <Label htmlFor="template">Template di Attività</Label>
              <Select
                value={selectedTemplateId !== null ? selectedTemplateId.toString() : "0"}
                onValueChange={handleTemplateChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleziona template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Nessun template</SelectItem>
                  {filteredTemplates.map(template => (
                      <SelectItem 
                        key={template.TemplateID} 
                        value={template.TemplateID.toString()}
                        style={{ display: template.IsActive == '1' ? 'block' : 'none' }}
                      >
                        {template.Description} {template.TaskCount > 0 ? `(${template.TaskCount} attività)` : ''}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              
              {selectedTemplateId && (
                <p className="text-xs text-gray-500 mt-1">
                  Le attività verranno create automaticamente in base al template selezionato.
                </p>
              )}
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="startDate" className="flex items-center">
                  Data Inizio <span className="text-red-500 ml-1">*</span>
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={localProject.StartDate?.split('T')[0]}
                  onChange={(e) => handleChange('StartDate', e.target.value)}
                  className={formErrors?.StartDate ? "border-red-500" : ""}
                />
                {formErrors?.StartDate && (
                  <p className="text-sm text-red-500 mt-1">{formErrors.StartDate}</p>
                )}
              </div>
              <div className="flex-1">
                <Label htmlFor="endDate" className="flex items-center">
                  Data Fine <span className="text-red-500 ml-1">*</span>
                </Label>
                <Input
                  id="endDate"
                  type="date"
                  value={localProject.EndDate?.split('T')[0]}
                  min={localProject.StartDate?.split('T')[0]}
                  onChange={(e) => handleChange('EndDate', e.target.value)}
                  className={formErrors?.EndDate ? "border-red-500" : ""}
                />
                {formErrors?.EndDate && (
                  <p className="text-sm text-red-500 mt-1">{formErrors.EndDate}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                Annulla
              </Button>
              <Button onClick={() => onSave(localProject)}>
                {project?.ProjectID ? 'Salva Modifiche' : 'Crea Progetto'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmModalOpen} onOpenChange={setConfirmModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-red-600">Sei sicuro?</DialogTitle>
          </DialogHeader>
          <p className="text-gray-700">
            Il progetto verrà disabilitato. Questa azione non può essere annullata!
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setConfirmModalOpen(false)}>
              Annulla
            </Button>
            <Button className="bg-red-600 text-white hover:bg-red-700" onClick={confirmDisable}>
              Sì, disabilita
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProjectEditModalWithTemplate;