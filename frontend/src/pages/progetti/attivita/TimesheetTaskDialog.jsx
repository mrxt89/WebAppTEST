import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from '@/context/AuthContext';
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import NewTaskForm from '@/pages/progetti/progetti/NewTaskForm';
import useProjectActions from '@/hooks/useProjectManagementActions';

const TimesheetTaskDialog = ({ 
  isOpen, 
  onClose, 
  onTaskCreated,
  users = [] 
}) => {
  const [loading, setLoading] = useState(false);
  const [userProjects, setUserProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectTasks, setProjectTasks] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [initialized, setInitialized] = useState(false);
  
  const { user } = useAuth();
  const projectActions = useProjectActions();
  
  // Effetto per reset dello stato quando il dialog viene chiuso
  useEffect(() => {
    if (!isOpen) {
      setShowForm(false);
      setSelectedProject(null);
      setProjectTasks([]);
      setInitialized(false);
    }
  }, [isOpen]);
  
  // Effetto per caricare i progetti solo una volta quando il dialog viene aperto
  useEffect(() => {
    // Previene il caricamento se il dialog è chiuso o se è già stato inizializzato
    if (!isOpen || initialized) return;
    
    const loadUserProjects = async () => {
      try {
        setLoading(true);
        const projects = await projectActions.getUserMemberProjects();
        
        // Filtra solo i progetti attivi in cui l'utente può creare attività
        const filteredProjects = projects.filter(project => 
          project.Status !== 'COMPLETATO' && 
          (project.Role === 'ADMIN' || project.Role === 'MANAGER' || project.Role === 'USER')
        );
        
        setUserProjects(filteredProjects);
        // Imposta il flag di inizializzazione per evitare caricamenti ripetuti
        setInitialized(true);
      } catch (error) {
        console.error('Error loading user projects:', error);
        toast({
          title: "Errore",
          description: "Impossibile caricare i progetti",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadUserProjects();
  }, [isOpen, initialized, projectActions]);
  
  // Funzione per gestire la selezione del progetto
  const handleProjectSelect = async (projectId) => {
    try {
      setLoading(true);
      
      // Trova il progetto selezionato
      const project = userProjects.find(p => p.ProjectID === parseInt(projectId));
      setSelectedProject(project);
      
      // Carica le attività del progetto
      const projectDetails = await projectActions.getProjectById(parseInt(projectId));
      setProjectTasks(projectDetails?.tasks || []);
      
      // Mostra il form solo dopo aver caricato le attività
      setShowForm(true);
    } catch (error) {
      console.error('Error loading project details:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare i dettagli del progetto",
        variant: "destructive"
      });
      setShowForm(false);
    } finally {
      setLoading(false);
    }
  };
  
  // Gestisce la creazione di una nuova attività
  const handleCreateTask = async (taskData) => {
    try {
      if (!selectedProject) {
        toast({
          title: "Errore",
          description: "Seleziona un progetto prima di creare l'attività",
          variant: "destructive"
        });
        return;
      }
      
      // Aggiungi l'ID del progetto ai dati dell'attività
      const completeTaskData = {
        ...taskData,
        ProjectID: selectedProject.ProjectID
      };
      
      const result = await projectActions.addUpdateProjectTask(completeTaskData);
      
      if (result.success) {
        toast({
          title: "Attività creata",
          description: "La nuova attività è stata creata con successo",
          style: { backgroundColor: '#2c7a7b', color: '#fff' }
        });
        
        // Notifica il componente padre
        if (onTaskCreated) {
          onTaskCreated();
        }
        
        // Chiudi il dialog
        onClose();
      } else {
        throw new Error("Errore nella creazione dell'attività");
      }
    } catch (error) {
      console.error('Error creating task:', error);
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore durante la creazione dell'attività",
        variant: "destructive"
      });
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Crea Nuova Attività</DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-gray-500">Caricamento in corso...</p>
          </div>
        ) : userProjects.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-gray-500">Non sei membro di nessun progetto con permessi sufficienti per creare attività.</p>
          </div>
        ) : !showForm ? (
          // Mostra solo il selettore di progetti
          <div className="p-6">
            <h3 className="text-lg font-medium mb-4">Seleziona un progetto per iniziare</h3>
            <div className="space-y-4">
              {userProjects.map(project => (
                <Button
                  key={project.ProjectID}
                  variant="outline"
                  className="w-full justify-start text-left h-auto py-3 px-4"
                  onClick={() => handleProjectSelect(project.ProjectID)}
                >
                  <div>
                    <div className="font-medium">{project.Name}</div>
                    <div className="text-sm text-gray-500 mt-1">
                      {project.Description && project.Description.length > 100 
                        ? `${project.Description.substring(0, 100)}...` 
                        : project.Description}
                    </div>
                    <div className="flex items-center mt-2">
                      <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                        {project.Role}
                      </span>
                      <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-800 ml-2">
                        {project.Status}
                      </span>
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        ) : (
          // Mostra il form di creazione attività
          <div className="p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">Progetto selezionato:</div>
                <div className="font-medium">{selectedProject?.Name}</div>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setShowForm(false);
                  setSelectedProject(null);
                  setProjectTasks([]);
                }}
              >
                Cambia progetto
              </Button>
            </div>
            
            <NewTaskForm 
              onSubmit={handleCreateTask}
              onCancel={onClose}
              projectTasks={projectTasks}
              projectId={selectedProject?.ProjectID}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TimesheetTaskDialog;