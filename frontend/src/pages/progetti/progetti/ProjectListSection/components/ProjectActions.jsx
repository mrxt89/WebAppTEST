// src/pages/progetti/progetti/ProjectListSection/components/ProjectActions.jsx
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/use-toast";
import { MoreVertical, Eye, Pin, PinOff } from "lucide-react";

const ProjectActions = ({
  project,
  isPinned,
  onSelectProject,
  manageProjectPin,
  setPinnedProjects,
  fetchProjects,
  filters
}) => {
  const [pinLoading, setPinLoading] = useState(false);

  const handlePinProject = async (e) => {
    e.stopPropagation();
    
    try {
      setPinLoading(true);
      const action = isPinned ? 'UNPIN' : 'PIN';
      const result = await manageProjectPin(project.ProjectID, action);
      
      if (result.success) {
        setPinnedProjects(prev => {
          const newSet = new Set(prev);
          if (isPinned) {
            newSet.delete(project.ProjectID);
          } else {
            newSet.add(project.ProjectID);
          }
          return newSet;
        });
        
        toast({
          title: isPinned ? "Pin rimosso" : "Progetto fissato",
          description: result.msg,
          variant: "success",
          duration: 2000,
        });
        
        await fetchProjects(0, 100, filters);
      }
    } catch (error) {
      console.error("Error pinning project:", error);
      toast({
        title: "Errore",
        description: "Errore nella gestione del pin",
        variant: "destructive",
      });
    } finally {
      setPinLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-6 w-6 p-0"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem 
          onClick={(e) => {
            e.stopPropagation();
            onSelectProject(project.ProjectID);
          }}
        >
          <Eye className="mr-2 h-4 w-4" />
          Visualizza
        </DropdownMenuItem>
        
        <DropdownMenuItem
          onClick={handlePinProject}
          disabled={pinLoading}
        >
          {isPinned ? (
            <>
              <PinOff className="mr-2 h-4 w-4" />
              Rimuovi pin
            </>
          ) : (
            <>
              <Pin className="mr-2 h-4 w-4" />
              Fissa in alto
            </>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ProjectActions;