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
import useProjectCustomersActions, { CUSTOMER_TYPE } from "../../../hooks/useProjectCustomersActions";


const ProjectEditModal = ({ project, isOpen, onClose, onSave, onChange, onDisable }) => {
  const { projectCustomers, loading: loadingCustomers, fetchProjectCustomers } = useProjectCustomersActions();
  const { categories, loading: loadingCategories, fetchCategories } = useCategoryActions();
  const [localProject, setLocalProject] = useState({ ...project, Disabled: project?.Disabled || 0 });
  const [selectedCategory, setSelectedCategory] = useState(project?.ProjectCategoryId || 0);
  const [selectedSubcategory, setSelectedSubcategory] = useState(project?.ProjectCategoryDetailLine || 0);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        fetchCategories(),
        fetchProjectCustomers(),
        fetchProjectStatuses()
      ]);
    };
    loadData();
  }, [fetchCategories, fetchProjectCustomers, fetchProjectStatuses]);

  useEffect(() => {
    if (project) {
      const updatedProject = {
        ...project,
        ProjectCategoryId: project.ProjectCategoryId || 0,
        ProjectCategoryDetailLine: project.ProjectCategoryDetailLine || 0,
        Disabled: project.Disabled || 0,
        ProjectErpID: project?.ProjectErpID || ''
      };
      setLocalProject(updatedProject);
      setSelectedCategory(updatedProject.ProjectCategoryId);
      setSelectedSubcategory(updatedProject.ProjectCategoryDetailLine);
    }
  }, [project]);

  useEffect(() => {
    if (project) {
      const updatedProject = {
        ...project,
        ProjectCategoryId: project.ProjectCategoryId || 0,
        ProjectCategoryDetailLine: project.ProjectCategoryDetailLine || 0,
        Disabled: project.Disabled || 0,
        ProjectErpID: project.ProjectErpID || ''
      };
      setLocalProject(updatedProject);
      setSelectedCategory(updatedProject.ProjectCategoryId);
      setSelectedSubcategory(updatedProject.ProjectCategoryDetailLine);
      // Trigger the onChange callback when the modal opens
      onChange && onChange(updatedProject);
    }
  }, [project, onChange]);

  const handleChange = (field, value) => {
    if (field === 'CustSupp') {
      // Assicuriamoci che CustSupp sia un valore singolo
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

  const handleCategoryChange = (value) => {
    const categoryId = value === "0" ? 0 : parseInt(value);
    setSelectedCategory(categoryId);
    setSelectedSubcategory(0);
    
    const updatedProject = {
      ...localProject,
      ProjectCategoryId: categoryId,
      ProjectCategoryDetailLine: 0
    };
    setLocalProject(updatedProject);
    onChange && onChange(updatedProject);
  };

  const handleSubcategoryChange = (value) => {
    const line = value === "0" ? 0 : parseInt(value);
    setSelectedSubcategory(line);
    
    const updatedProject = {
      ...localProject,
      ProjectCategoryDetailLine: line
    };
    setLocalProject(updatedProject);
    onChange && onChange(updatedProject);
  };

  const handleDisable = () => setConfirmModalOpen(true);
  const confirmDisable = () => {
    onDisable();
    setConfirmModalOpen(false);
    onClose();
  };

  
  if (!localProject) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose} id="project-edit-modal">
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle>Modifica Progetto</DialogTitle>
            <Button 
              variant="ghost" 
              size="icon"
              className="text-red-500 hover:text-red-700 hover:bg-red-100"
              onClick={handleDisable}
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div>
              <Label htmlFor="name">Nome Progetto</Label>
              <Input
                id="name"
                value={localProject.Name}
                onChange={(e) => handleChange('Name', e.target.value)}
              />
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
                  {statuses.map(status => (
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

            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="startDate">Data Inizio</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={localProject.StartDate?.split('T')[0]}
                  onChange={(e) => handleChange('StartDate', e.target.value)}
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="endDate">Data Fine</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={localProject.EndDate?.split('T')[0]}
                  min={localProject.StartDate?.split('T')[0]}
                  onChange={(e) => handleChange('EndDate', e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                Annulla
              </Button>
              <Button onClick={() => onSave(localProject)}>
                Salva Modifiche
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

export default ProjectEditModal;