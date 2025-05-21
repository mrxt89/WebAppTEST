import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ClipboardCopy, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import useProjectActions from "@/hooks/useProjectManagementActions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const TemplateDialog = ({
  open,
  onOpenChange,
  currentTemplate,
  setCurrentTemplate,
  categories = [],
  subcategories = [],
  handleCategoryChange,
  handleSaveTemplate,
}) => {
  const [activeTab, setActiveTab] = useState("base");
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("default");
  const [loading, setLoading] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [previewProject, setPreviewProject] = useState(null);
  const [previewData, setPreviewData] = useState({
    Description: "",
    Notes: "",
    ProjectCategoryId: null,
    ProjectCategoryDetailLine: null
  });
  
  // Utilizziamo l'hook useProjectActions per accedere alle funzioni di gestione progetti
  const { fetchAllProjects, getProjectById } = useProjectActions();
  
  // Ref per gestire il focus
  const initialFocusRef = useRef(null);

  // Gestore personalizzato per onOpenChange che assicura che il focus sia gestito correttamente
  const handleOpenChange = (open) => {
    // Se stiamo chiudendo il dialog, resettiamo i dati
    if (!open) {
      // Diamo tempo all'animazione di completarsi e assicuriamo che il focus sia spostato
      // prima che l'elemento diventi aria-hidden
      setTimeout(() => {
        setSelectedProjectId("default");
        setPreviewProject(null);
        setPreviewData({
          Description: "",
          Notes: "",
          ProjectCategoryId: null,
          ProjectCategoryDetailLine: null
        });
        setShowWarning(false);
        setActiveTab("base");
      }, 100);
    }
    
    // Chiamiamo la funzione onOpenChange originale
    onOpenChange(open);
  };

  // Carica la lista dei progetti quando il dialogo viene aperto
  useEffect(() => {
    const loadProjects = async () => {
      if (!open) return;
      
      try {
        setLoading(true);
        // Utilizza fetchAllProjects per ottenere tutti i progetti
        const projectsData = await fetchAllProjects();
        
        // Ordina i progetti per nome
        const sortedProjects = projectsData.sort((a, b) => 
          a.Name.localeCompare(b.Name)
        );
        
        setProjects(sortedProjects);
      } catch (error) {
        console.error("Errore nel caricamento dei progetti:", error);
      } finally {
        setLoading(false);
      }
    };

    loadProjects();
  }, [open, fetchAllProjects]);

  // Carica l'anteprima quando cambia il progetto selezionato
  useEffect(() => {
    const loadProjectPreview = async () => {
      if (!selectedProjectId || selectedProjectId === "default") {
        setPreviewProject(null);
        setPreviewData({
          Description: "",
          Notes: "",
          ProjectCategoryId: null,
          ProjectCategoryDetailLine: null
        });
        return;
      }
      
      try {
        setLoading(true);
        
        // Utilizza getProjectById per ottenere i dettagli del progetto selezionato
        const projectData = await getProjectById(parseInt(selectedProjectId));
        
        if (!projectData) {
          throw new Error("Errore nel caricamento dei dettagli del progetto");
        }

        // Prepara i dati per l'anteprima
        setPreviewProject(projectData);
        
        // Assicuriamoci che i valori siano nel formato corretto per evitare problemi
        const categoryId = projectData.ProjectCategoryId ? parseInt(projectData.ProjectCategoryId) : null;
        const categoryDetailLine = projectData.ProjectCategoryDetailLine ? parseInt(projectData.ProjectCategoryDetailLine) : null;
        
        setPreviewData({
          Description: projectData.Name || "",
          Notes: projectData.Description || "",
          ProjectCategoryId: categoryId,
          ProjectCategoryDetailLine: categoryDetailLine
        });
        
        // Non chiamiamo handleCategoryChange qui per evitare cicli infiniti
        // Per le sottocategorie, il componente padre dovrà occuparsene quando cambierà ProjectCategoryId
      } catch (error) {
        console.error("Errore durante il caricamento dell'anteprima:", error);
      } finally {
        setLoading(false);
      }
    };
    
    loadProjectPreview();
  }, [selectedProjectId]);

  // Effetto separato per gestire il cambio di categoria nei dati di anteprima
  useEffect(() => {
    if (previewData.ProjectCategoryId && activeTab === "copy") {
      // Quando cambia la categoria nei dati di anteprima, aggiorna le sottocategorie tramite il padre
      handleCategoryChange(previewData.ProjectCategoryId.toString());
    }
  }, [previewData.ProjectCategoryId, activeTab, handleCategoryChange]);

  // Funzione per copiare i dati da un progetto esistente
  const handleSaveFromProject = () => {
    try {
      // Mostra warning se il template ha già dei dati
      if (currentTemplate?.Description && !showWarning) {
        setShowWarning(true);
        return;
      }

      // Assicuriamoci che i dati siano validi prima di copiarli
      if (!previewData.Description) {
        console.error("Descrizione mancante");
        return;
      }

      // Crea un nuovo oggetto template per evitare riferimenti condivisi
      const updatedTemplate = {
        ...currentTemplate,
        Description: previewData.Description,
        Notes: previewData.Notes || "",
        ProjectCategoryId: previewData.ProjectCategoryId,
        ProjectCategoryDetailLine: previewData.ProjectCategoryDetailLine,
      };

      // Log per debug
      console.log("Template aggiornato:", updatedTemplate);
      
      // Aggiorna il template nello stato del componente padre
      setCurrentTemplate(updatedTemplate);

      // Esegui il salvataggio
      handleSaveTemplate();
    } catch (error) {
      console.error("Errore durante il salvataggio del template:", error);
    }
  };

  // Gestisce la conferma dopo il warning
  const handleConfirmCopy = () => {
    setShowWarning(false);
    handleSaveFromProject();
  };

  // Gestisce il cambio di categoria nell'anteprima
  const handlePreviewCategoryChange = (value) => {
    const categoryId = value === "null" ? null : parseInt(value);
    
    // Aggiorniamo immediatamente lo stato locale
    setPreviewData({
      ...previewData,
      ProjectCategoryId: categoryId,
      ProjectCategoryDetailLine: null
    });
    
    // Aggiorna le sottocategorie tramite il padre
    handleCategoryChange(categoryId ? categoryId.toString() : "null");
  };

  // Funzione per salvare il template a seconda della tab attiva
  const handleSave = () => {
    if (activeTab === "base") {
      handleSaveTemplate();
    } else {
      handleSaveFromProject();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[650px]">
        <DialogHeader>
          <DialogTitle>
            {currentTemplate?.TemplateID ? "Modifica Template" : "Nuovo Template"}
          </DialogTitle>
          <DialogDescription>
            {currentTemplate?.TemplateID 
              ? "Modifica le informazioni del template esistente" 
              : "Inserisci le informazioni per creare un nuovo template o copia i dati da un progetto esistente"}
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="base">Crea Nuovo</TabsTrigger>
            <TabsTrigger value="copy">Copia da Progetto</TabsTrigger>
          </TabsList>
          
          <TabsContent value="base" className="space-y-4 pt-4">
            <div>
              <Label>Descrizione *</Label>
              <Input
                ref={initialFocusRef}
                value={currentTemplate?.Description || ""}
                onChange={(e) =>
                  setCurrentTemplate({
                    ...currentTemplate,
                    Description: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <Label>Note</Label>
              <Textarea
                value={currentTemplate?.Notes || ""}
                onChange={(e) =>
                  setCurrentTemplate({
                    ...currentTemplate,
                    Notes: e.target.value,
                  })
                }
                rows={3}
              />
            </div>
            <div>
              <Label>Categoria</Label>
              <Select
                value={currentTemplate?.ProjectCategoryId?.toString() || "null"}
                onValueChange={handleCategoryChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="null">- Nessuna categoria -</SelectItem>
                  {categories.map((category) => (
                    <SelectItem
                      key={category.ProjectCategoryId}
                      value={category.ProjectCategoryId.toString()}
                    >
                      {category.Description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {currentTemplate?.ProjectCategoryId && (
              <div>
                <Label>Sottocategoria</Label>
                <Select
                  value={currentTemplate?.ProjectCategoryDetailLine?.toString() || "null"}
                  onValueChange={(value) =>
                    setCurrentTemplate({
                      ...currentTemplate,
                      ProjectCategoryDetailLine:
                        value === "null" ? null : parseInt(value),
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona sottocategoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="null">- Nessuna sottocategoria -</SelectItem>
                    {subcategories.map((subcategory) => (
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
            )}
          </TabsContent>
          
          <TabsContent value="copy" className="space-y-4 pt-4">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <ClipboardCopy className="h-5 w-5 text-primary" />
                <Label className="text-lg font-medium">Copia dati da un progetto esistente</Label>
              </div>
              
              <p className="text-sm text-muted-foreground mb-4">
                Seleziona un progetto per visualizzare e personalizzare i dati prima di creare il template.
              </p>
              
              <div className="mb-6">
                <Label>Progetto</Label>
                <Select
                  value={selectedProjectId}
                  onValueChange={setSelectedProjectId}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona un progetto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">- Seleziona progetto -</SelectItem>
                    {projects.map((project) => (
                      <SelectItem
                        key={project.ProjectID}
                        value={project.ProjectID.toString()}
                      >
                        {project.Name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {loading && (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                </div>
              )}
              
              {!loading && selectedProjectId !== "default" && previewProject && (
                <>
                  <div className="bg-primary/5 px-3 py-2 rounded-md text-sm text-primary mb-4 flex items-center">
                    <CheckCircle className="h-4 w-4 mr-2" /> 
                    <span>Le modifiche verranno applicate solo al nuovo template, non al progetto originale.</span>
                  </div>
                
                  <Card className="border-primary/20">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-primary text-lg">Dati Template</CardTitle>
                        <div className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-md">
                          Da: {previewProject?.Name}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-2">
                      <div>
                        <Label>Descrizione Template *</Label>
                        <Input
                          value={previewData.Description}
                          onChange={(e) => setPreviewData({...previewData, Description: e.target.value})}
                        />
                      </div>
                      
                      <div>
                        <Label>Note</Label>
                        <Textarea
                          value={previewData.Notes}
                          onChange={(e) => setPreviewData({...previewData, Notes: e.target.value})}
                          rows={3}
                        />
                      </div>
                      
                      <div>
                        <Label>Categoria</Label>
                        <Select
                          value={previewData.ProjectCategoryId?.toString() || "null"}
                          onValueChange={handlePreviewCategoryChange}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona categoria" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="null">- Nessuna categoria -</SelectItem>
                            {categories.map((category) => (
                              <SelectItem
                                key={category.ProjectCategoryId}
                                value={category.ProjectCategoryId.toString()}
                              >
                                {category.Description}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {previewData.ProjectCategoryId && (
                        <div>
                          <Label>Sottocategoria</Label>
                          <Select
                            value={previewData.ProjectCategoryDetailLine?.toString() || "null"}
                            onValueChange={(value) =>
                              setPreviewData({
                                ...previewData,
                                ProjectCategoryDetailLine:
                                  value === "null" ? null : parseInt(value),
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleziona sottocategoria" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="null">- Nessuna sottocategoria -</SelectItem>
                              {subcategories.map((subcategory) => (
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
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
              
              {!loading && selectedProjectId === "default" && (
                <div className="text-center py-10 text-muted-foreground">
                  Seleziona un progetto dall'elenco per visualizzarne i dati
                </div>
              )}
            </div>
            
            {showWarning && (
              <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mt-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">
                      Attenzione: il template contiene già dei dati
                    </p>
                    <p className="text-xs text-amber-700 mt-1">
                      Procedendo con il salvataggio, i dati attuali verranno sovrascritti con quelli del progetto selezionato.
                    </p>
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" variant="outline" onClick={() => setShowWarning(false)}>
                        Annulla
                      </Button>
                      <Button size="sm" variant="default" onClick={handleConfirmCopy}>
                        Procedi
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
        
        <Separator className="my-2" />
        
        <Button 
          className="w-full" 
          onClick={handleSave}
          disabled={(activeTab === "copy" && (selectedProjectId === "default" || !previewData.Description))}
        >
          Salva
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default TemplateDialog; 