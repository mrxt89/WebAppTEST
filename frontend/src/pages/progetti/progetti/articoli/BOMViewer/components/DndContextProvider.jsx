import React, { useState, useCallback, useEffect, useRef } from 'react';
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { useBOMViewer } from '../context/BOMViewerContext';
import DraggableItem from './BOMReferencePanel/DraggableItem';
import DropIndicator from './BOMTreeView/DropIndicator';
import EmptyBOMDropIndicator from './BOMTreeView/EmptyBOMDropIndicator';
import { toast } from "@/components/ui/use-toast";

const DndContextProvider = ({ children }) => {
const { 
  addComponent, 
  replaceComponent, 
  replaceWithNewComponent,
  selectedBomId,
  smartRefresh,
  bomComponents,  // Added to access all components for validation
} = useBOMViewer();

const [activeItem, setActiveItem] = useState(null);
const [draggingOver, setDraggingOver] = useState(null);
const [dropTarget, setDropTarget] = useState(null);
const [dropMode, setDropMode] = useState(null); // 'replace', 'addUnder', o 'addSibling'
const [debugInfo, setDebugInfo] = useState(null); // Per debug
const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
const [isDragging, setIsDragging] = useState(false);
const [forceReplaceMode, setForceReplaceMode] = useState(false);
const [isOverEmptyBOM, setIsOverEmptyBOM] = useState(false);

// Riferimento all'elemento attualmente in hover
const currentElementRef = useRef(null);

// Funzione per verificare se un nodo è di livello radice (0 o 1)
const isRootLevel = (node) => {
 
  if (!node) return false;
  
  return (node.level === 0 || node.level === 1) || 
         (node.data && (node.data.Level === 0 || node.data.Level === 1));
};

// Funzione corretta per verificare se un componente è bloccato
const isComponentLocked = (node, operation = 'modify') => {
  if (!node || !node.data) return false;
  
  // Get the component level
  const level = node.data.Level || 0;
  
  // CORREZIONE: Per i componenti di livello root (0 o 1)
  if (level === 0 || level === 1) {
    // Per operazioni su componenti root, controllare sempre parentBOMStato_erp
    // che indica lo stato della distinta principale (padre)
    if (node.data.parentBOMStato_erp === '1' || node.data.parentBOMStato_erp === 1) {
      return true;
    }
    // Altrimenti permetti l'operazione
    return false;
  }
  
  // Per componenti non-root, verifica in base all'operazione
  
  // Per qualsiasi operazione eccetto addSibling, se il componente stesso è in ERP, è bloccato
  if (operation !== 'addSibling' && (node.data.bomStato_erp === '1' || node.data.bomStato_erp === 1)) {
    return true;
  }
  
  // Per operazioni che richiedono modifiche al componente o ai suoi figli
  if (['modify', 'replace', 'addUnder', 'delete'].includes(operation)) {
    // Se il parent BOM è in ERP, queste operazioni sono bloccate
    if (node.data.parentBOMStato_erp === '1' || node.data.parentBOMStato_erp === 1) {

      return true;
    }
  }
  
  // Per l'aggiunta di un fratello, dobbiamo verificare il componente padre
  if (operation === 'addSibling') {
    // Se il padre è in ERP, blocca l'operazione
    const parentComponent = findParentComponent(node);
    if (parentComponent && (parentComponent.data.bomStato_erp === '1' || parentComponent.data.bomStato_erp === 1)) {

      return true;
    }
    
    // Altrimenti, permetti l'addSibling anche se il componente stesso è in ERP
    return false;
  }
  
  return false;
};

// IMPROVED: Function to check if a component can have children based on its nature and other properties
const canHaveChildren = (node) => {
  if (!node || !node.data) {

    return false;
  }
  
  // First check if the component is from ERP
  if (node.data.bomStato_erp === '1' || node.data.bomStato_erp === 1) {

    return false;
  }
  
  // Get component nature
  const nature = parseInt(node.data.Nature || node.data.ComponentNature || 0, 10);
  
  // Purchased components (nature 22413314) cannot have children
  if (nature === 22413314) {

    return false;
  }
  
  // Check if the component type allows children
  const componentType = parseInt(node.data.ComponentType || 0, 10);
  
  // Notes (7798789) cannot have children
  if (componentType === 7798789) {

    return false;
  }
  

  return true;
};

// 1. Effect for tracking mouse position
useEffect(() => {
const trackMousePosition = (e) => {
  // Only track position when dragging
  if (isDragging && currentElementRef.current && dropTarget) {
    // Update mouse position
    setMousePosition({ x: e.clientX, y: e.clientY });
    
    // Recalculate drop mode based on new position
    const rect = currentElementRef.current.getBoundingClientRect();
    const nodeIsRootLevel = isRootLevel(dropTarget);
    
    // Calculate mode
    let mode;
    
    // If SHIFT is pressed, always replace
    if (forceReplaceMode) {
      mode = 'replace';
    } else if (nodeIsRootLevel) {
      // Root nodes: 3 zones (33% - 34% - 33%)
      const leftThreshold = rect.left + (rect.width * 0.33);
      const rightThreshold = rect.left + (rect.width * 0.66);
      
      if (e.clientX < leftThreshold) {
        mode = 'replace';
      } else if (e.clientX >= rightThreshold) {
        mode = 'addSibling';
      } else {
        mode = 'addUnder';
      }
      
    } else {
      // Non-root nodes: 2 zones (50% - 50%)
      const threshold = rect.left + (rect.width / 2);
      
      if (e.clientX < threshold) {
        mode = 'replace';
      } else {
        mode = 'addUnder';
      }
    }
    
    // Update mode only if changed
    if (mode !== dropMode) {
      setDropMode(mode);
      
      // Update debug info
      setDebugInfo({
        mouseX: e.clientX,
        rectLeft: rect.left,
        rectWidth: rect.width,
        elementMidpoint: rect.left + (rect.width / 2),
        isRootLevel: nodeIsRootLevel,
        forcedMode: forceReplaceMode,
        mode: mode
      });
    }
  }
};

// Add mousemove event listener
window.addEventListener('mousemove', trackMousePosition);

return () => {
  window.removeEventListener('mousemove', trackMousePosition);
};
}, [isDragging, dropTarget, forceReplaceMode, dropMode]);

// Track key presses
useEffect(() => {
  const handleKeyDown = (e) => {
    if (e.shiftKey) {
      setForceReplaceMode(true);
    }
  };
  
  const handleKeyUp = (e) => {
    if (!e.shiftKey) {
      setForceReplaceMode(false);
    }
  };
  
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  
  return () => {
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
  };
}, []);

// Configure drag sensors
const sensors = useSensors(
  useSensor(PointerSensor, {
    // Increase distance before drag starts to avoid accidental activations
    activationConstraint: {
      distance: 8,
    },
  })
);

const handleDragStart = (event) => {
  const { active } = event;
  setActiveItem(active.data.current);
  setIsDragging(true);
};

const handleDragOver = (event) => {
  const { over } = event;
  
  if (!over) {
    setDraggingOver(null);
    setDropTarget(null);
    setDropMode(null);
    setDebugInfo(null);
    setIsOverEmptyBOM(false);
    currentElementRef.current = null;
    return;
  }
  
  // Check if dragging over empty BOM drop area
  if (over.id === 'empty-bom-drop-area' && over.data.current && over.data.current.isEmptyBOM) {
    setIsOverEmptyBOM(true);
    setDraggingOver(over.id);
    setDropTarget({
      id: 'empty-bom-root',
      type: 'empty-bom',
      data: {
        isEmptyBOM: true
      }
    });
    setDropMode('root');
    return;
  } else {
    setIsOverEmptyBOM(false);
  }
  
  // Check if dragging over a tree node
  if (over.data.current && over.data.current.type === 'component-node') {
    const nodeData = over.data.current.node;
    
    // Skip if it's a cycle
    if (nodeData.type === 'cycle') {
      return;
    }
    
    // Find DOM element
    const elemSelector = `[data-node-id="${nodeData.id}"]`;
    const element = document.querySelector(elemSelector);
    
    if (!element || element.getAttribute('data-node-id').startsWith('cycle-')) {
      return;
    }
    
    // Save current element and target
    currentElementRef.current = element;
    setDraggingOver(over.id);
    setDropTarget(nodeData);
    
    // Mode will be calculated by the mouse position effect
  } else {
    setDraggingOver(null);
    setDropTarget(null);
    setDropMode(null);
    setDebugInfo(null);
    currentElementRef.current = null;
  }
};

const handleDragEnd = async (event) => {
  const { active, over } = event;
  
  // Process drop only if over a valid element
  if (over && dropTarget) {
    try {
      // Special case: dropping on empty BOM
      if (isOverEmptyBOM && dropTarget.type === 'empty-bom') {
        await handleEmptyBOMDrop(activeItem);
        
        // Notify user
        toast({
          title: "Componente aggiunto",
          description: "Componente aggiunto come radice della distinta",
          variant: "success"
        });
        
        // Reload BOM structure
        await smartRefresh();
      }
      // Double-check it's not a cycle
      else if (dropTarget.type === 'cycle') {
        // Do nothing for cycles
        toast({
          title: "Operazione non consentita",
          description: "Non è possibile eseguire operazioni di drag & drop sui cicli di produzione",
          variant: "warning"
        });
        
        // Importante: reset immediato delle sezioni colorate
        setDraggingOver(null);
        setDropTarget(null);
        setDropMode(null);
      }
      // Replace case
      else if (dropMode === 'replace') {
        // Controlla se l'operazione è consentita
        if (isComponentLocked(dropTarget, 'replace')) {
          toast({
            title: "Operazione non consentita",
            description: "Non è possibile sostituire questo componente",
            variant: "warning"
          });
          
          // Reset immediato delle sezioni colorate
          setDraggingOver(null);
          setDropTarget(null);
          setDropMode(null);
          return;
        }
        
        await handleReplaceOperation(dropTarget, activeItem);
        
        // Notify user
        toast({
          title: "Componente sostituito",
          description: "Componente sostituito con successo",
          variant: "success"
        });
        
        // Reload BOM structure
        await smartRefresh();
      } 
      // Add under case
      else if (dropMode === 'addUnder') {
        // Controlla se l'operazione è consentita
        if (isComponentLocked(dropTarget, 'addUnder')) {
          toast({
            title: "Operazione non consentita",
            description: "Non è possibile aggiungere componenti sotto questo componente",
            variant: "warning"
          });
          
          // Reset immediato delle sezioni colorate
          setDraggingOver(null);
          setDropTarget(null);
          setDropMode(null);
          return;
        }
        
        // Check if target can have children
        if (!canHaveChildren(dropTarget)) {
          toast({
            title: "Operazione non consentita",
            description: "Non è possibile aggiungere componenti sotto un componente di acquisto",
            variant: "warning"
          });
          
          // Reset immediato delle sezioni colorate
          setDraggingOver(null);
          setDropTarget(null);
          setDropMode(null);
          return;
        }
        
        await handleAddUnderOperation(dropTarget, activeItem);
        
        // Notify user
        toast({
          title: "Componente aggiunto",
          description: "Componente aggiunto sotto il componente selezionato",
          variant: "success"
        });
        
        // Reload BOM structure
        await smartRefresh();
      }
      // Add as sibling case
      else if (dropMode === 'addSibling') {
        // Controlla se l'operazione è consentita
        if (isComponentLocked(dropTarget, 'addSibling')) {
          toast({
            title: "Operazione non consentita",
            description: "Non è possibile aggiungere componenti allo stesso livello di questo componente",
            variant: "warning"
          });
          
          // Reset immediato delle sezioni colorate
          setDraggingOver(null);
          setDropTarget(null);
          setDropMode(null);
          return;
        }
        
        await handleAddSiblingOperation(dropTarget, activeItem);
        
        // Notify user
        toast({
          title: "Componente aggiunto",
          description: "Componente aggiunto allo stesso livello del componente selezionato",
          variant: "success"
        });
        
        // Reload BOM structure
        await smartRefresh();
      }
      else {
        console.warn("Drop mode not recognized:", dropMode);
        toast({
          title: "Operazione non riconosciuta",
          description: "La modalità di trascinamento non è stata riconosciuta",
          variant: "warning"
        });
        
        // Reset immediato delle sezioni colorate anche per modalità non riconosciute
        setDraggingOver(null);
        setDropTarget(null);
        setDropMode(null);
      }
    } catch (error) {
      console.error('Error during drag and drop operation:', error);
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore durante l'operazione di drag and drop",
        variant: "destructive"
      });
      
      // Reset anche in caso di errore
      setDraggingOver(null);
      setDropTarget(null);
      setDropMode(null);
    }
  } else if (over && !dropTarget) {
    console.warn("Drop area detected but no valid target found");
    toast({
      title: "Area di drop non valida",
      description: "L'area di trascinamento non è valida per questo tipo di elemento",
      variant: "warning"
    });
  }
  
  // Reset completo degli stati alla fine dell'operazione
  setActiveItem(null);
  setDraggingOver(null);
  setDropTarget(null);
  setDropMode(null);
  setDebugInfo(null);
  setIsDragging(false);
  setForceReplaceMode(false);
  setIsOverEmptyBOM(false);
  currentElementRef.current = null;
};

// NEW: Improved function to find a component's parent
const findParentComponent = (component) => {
  if (!component || !component.data) {

    return null;
  }
  
  // Root level components (Level 0 or 1) have no parent
  if (component.data.Level === 0 || component.data.Level === 1) {

    return null;
  }
  
  // We need access to all components to find the parent
  if (!bomComponents || !Array.isArray(bomComponents) || bomComponents.length === 0) {
   
    return null;
  }
  
  // Use the Path to find the parent
  if (component.data.Path) {
    const pathParts = component.data.Path.split('.');
    if (pathParts.length < 2) {
     
      return null;
    }
    
    // Remove the last element to get the parent path
    pathParts.pop();
    const parentPath = pathParts.join('.');
    
    // Look for a component with the parent path
    const parent = bomComponents.find(comp => 
      comp.Path === parentPath && comp.Level === (component.data.Level - 1)
    );
    
    if (parent) {
   
      return {
        data: parent
      };
    }
  }
  
  // If Path doesn't work, try using Level as fallback
  // This is less reliable but can help in some cases

  
  const componentIndex = bomComponents.findIndex(comp => 
    comp.ComponentId === component.data.ComponentId && 
    comp.Line === component.data.Line
  );
  
  if (componentIndex >= 0) {
    // Look backward to find a component with Level = current Level - 1
    for (let i = componentIndex - 1; i >= 0; i--) {
      if (bomComponents[i].Level === component.data.Level - 1) {
       
        return {
          data: bomComponents[i]
        };
      }
    }
  }
  

  return null;
};

// Function to handle adding a sibling node - CORREZIONE
const handleAddSiblingOperation = async (target, draggedItem) => {
  if (!selectedBomId || !target?.data) {
    throw new Error("Dati insufficienti per l'operazione di aggiunta di nodo fratello");
  }
  
  // Get dragged component data
  const { data: sourceItem } = draggedItem;
  
  // Use default value if dragSettings not defined
  const dragSettings = draggedItem.dragSettings || {};
  const createTempComponent = dragSettings.createTempComponent || false;
  const copyBOM = dragSettings.copyBOM || false;

  // Verifica se il componente target è di livello root (0 o 1)
  const isRootComponent = target.data.Level === 0 || target.data.Level === 1;
  
  // CORREZIONE: Per i componenti di livello root, controlliamo solo lo stato della distinta principale
  if (isRootComponent) {
    // Per i nodi di livello 0 o 1, controlliamo il parentBOMStato_erp che indica lo stato della distinta principale
    if (target.data.parentBOMStato_erp === '1' || target.data.parentBOMStato_erp === 1) {
      toast({
        title: "Errore",
        description: "Non puoi aggiungere un componente fratello quando la distinta principale è presente in Mago.",
        variant: "destructive"
      });
      return;
    }
  } 
  // Per componenti non root, verifica solo lo stato del padre
  else {
    // Trova il componente padre
    const parentComponent = findParentComponent(target);
    if (parentComponent && (parentComponent.data.bomStato_erp === '1' || parentComponent.data.bomStato_erp === 1)) {
      toast({
        title: "Errore",
        description: "Non puoi aggiungere un componente fratello quando il componente padre è presente in Mago.",
        variant: "destructive"
      });
      return;
    }
  }
  
  // Check if source component is valid
  if (!sourceItem) {
    toast({
      title: "Errore",
      description: "Componente sorgente non valido.",
      variant: "destructive"
    });
    return;
  }

  // Creating temporary component
  if (createTempComponent) {
    // Prepare meaningful description based on source component
    const description = sourceItem.Description || sourceItem.ComponentDescription || 
                      `Temporaneo da ${sourceItem.ItemCode || sourceItem.BOM || sourceItem.Item || 'componente'}`;
    
    // Use source component nature if available, otherwise use semi-finished as default
    const nature = sourceItem.Nature || sourceItem.ComponentNature || 22413312; // Default to Semi-finished
    
    // Use source component UoM if available
    const uom = sourceItem.BaseUoM || sourceItem.UoM || 'PZ';
    
    // CORREZIONE: Determinare correttamente parentComponentId in base al livello del nodo
    let parentComponentId = null;
    
    if (isRootComponent) {
      // Per livello 0 o 1, non c'è parentComponentId (aggiunta diretta alla distinta)
      parentComponentId = null;
    } else {
      // Per livelli più profondi, usa il parentComponentId del target
      const parentComponent = findParentComponent(target);
      parentComponentId = parentComponent ? parentComponent.data.ComponentId : null;
    }
    
    // Call API to add temporary component
    const payload = {
      createTempComponent: true,
      tempComponentPrefix: "",
      componentDescription: description,
      quantity: 1,
      nature: nature,
      uom: uom,
      importBOM: copyBOM, // Pass option to copy BOM
      // Use correct parentComponentId
      parentComponentId: parentComponentId,
      // Pass source component ID to correctly copy BOM
      sourceComponentId: sourceItem.ItemId || sourceItem.Id || sourceItem.ComponentId || 0,
      // If we have BOMId (from JOIN), pass it to directly use that BOM
      sourceBOMId: sourceItem.BOMId || 0,
      sourceItemCode: sourceItem.BOM || sourceItem.Item || ''
    };
    

    return await addComponent(selectedBomId, payload);
  } else {
    // Otherwise, add existing component
    // If available, use ItemId (from LEFT JOIN with MA_ProjectArticles_Items)
    const componentId = sourceItem.ItemId || sourceItem.Id || 0;
    const componentCode = sourceItem.ItemCode || sourceItem.BOM || sourceItem.Item || '';
    
    // CORREZIONE: Determinare correttamente ParentComponentId in base al livello del nodo
    let parentComponentId = null;
    
    if (isRootComponent) {
      // Per livello 0 o 1, non c'è ParentComponentId (aggiunta diretta alla distinta)
      parentComponentId = null;
    } else {
      // Per livelli più profondi, usa il ParentComponentId del target
      const parentComponent = findParentComponent(target);
      parentComponentId = parentComponent ? parentComponent.data.ComponentId : null;
    }
    
    const payload = {
      ComponentId: componentId,
      ComponentCode: componentCode,
      ComponentType: 7798784, // Articolo
      Quantity: 1,
      // Use correct ParentComponentId
      ParentComponentId: parentComponentId,
      ImportBOM: true // Always import BOM for existing components
    };
  
    return await addComponent(selectedBomId, payload);
  }
};

// Function to handle drop on empty BOM
const handleEmptyBOMDrop = async (draggedItem) => {
  if (!selectedBomId) {
    throw new Error("BOM ID non disponibile");
  }
  
  try {
    // Get dragged component data
    const { data: sourceItem } = draggedItem;
    
    // Use default value if dragSettings not defined
    const dragSettings = draggedItem.dragSettings || {};
    const createTempComponent = dragSettings.createTempComponent || false;
    const copyBOM = dragSettings.copyBOM || false;
    
    // Creating temporary component
    if (createTempComponent) {
      const payload = {
        createTempComponent: true,
        tempComponentPrefix: "",
        componentDescription: sourceItem.Description || sourceItem.ComponentDescription || `Temporaneo da ${sourceItem.ItemCode || sourceItem.BOM || sourceItem.Item || 'componente'}`,
        quantity: 1,
        nature: sourceItem.Nature || sourceItem.ComponentNature || 22413312, // Default to Semi-finished
        uom: sourceItem.BaseUoM || sourceItem.UoM || 'PZ',
        importBOM: copyBOM, // Pass option to copy BOM
        // Pass source component ID to copy BOM
        sourceComponentId: sourceItem.ItemId || sourceItem.Id || sourceItem.ComponentId || 0,
        sourceBOMId: sourceItem.BOMId || 0
      };
      
 
      return await addComponent(selectedBomId, payload);
    } else {
      // Otherwise, add existing component
      const componentId = sourceItem.ItemId || sourceItem.Id || 0;
      const componentCode = sourceItem.ItemCode || sourceItem.BOM || sourceItem.Item || '';
      
      const payload = {
        ComponentId: componentId,
        ComponentCode: componentCode,
        ComponentType: 7798784, // Articolo
        Quantity: 1,
        ImportBOM: true // Always import BOM for existing components
      };
      

      return await addComponent(selectedBomId, payload);
    }
  } catch (error) {
    console.error("Error adding component to empty BOM:", error);
    throw error;
  }
};

// Handle component replacement - versione corretta
const handleReplaceOperation = async (target, draggedItem) => {
  if (!selectedBomId || !target?.data) {
    throw new Error("Dati insufficienti per l'operazione di sostituzione");
  }
  
  // Get BOM ID for target component
  const bomId = target.data.ParentBOMId || target.data.BOMId || selectedBomId;
  const componentLine = target.data.Line;
  
  // Get dragged component data
  const { data: sourceItem } = draggedItem;
  
  // Use default value if dragSettings not defined
  const dragSettings = draggedItem.dragSettings || {};
  const createTempComponent = dragSettings.createTempComponent || false;
  const copyBOM = dragSettings.copyBOM || false;

  // MODIFIED: Check if the component is at root level (0 or 1)
  const isRootComponent = target.data.Level === 0 || target.data.Level === 1;

  
  // Per i componenti di livello root, controlliamo parentBOMStato_erp (già verificato da isComponentLocked)
  if (isRootComponent) {
    // Controllo aggiuntivo di debug - questo non dovrebbe mai essere eseguito
    // se isComponentLocked è stato corretto correttamente
    if (target.data.parentBOMStato_erp === '1' || target.data.parentBOMStato_erp === 1) {
      console.error("ERRORE: Controllo parentBOMStato_erp mancato in isComponentLocked");
      toast({
        title: "Errore",
        description: "Non puoi sostituire questo componente perché la distinta principale è presente in Mago.",
        variant: "destructive"
      });
      return;
    }

  } 
  // For non-root components, double check both the component and parent states
  else {
    if (target.data.bomStato_erp === '1' || target.data.bomStato_erp === 1) {
      console.error("ERRORE: Controllo bomStato_erp mancato in isComponentLocked");
      toast({
        title: "Errore",
        description: "Non puoi sostituire questo componente perché è presente in Mago.",
        variant: "destructive"
      });
      return;
    }
    
    if (target.data.parentBOMStato_erp === '1' || target.data.parentBOMStato_erp === 1) {
      console.error("ERRORE: Controllo parentBOMStato_erp mancato in isComponentLocked");
      toast({
        title: "Errore",
        description: "Non puoi sostituire questo componente perché il padre è presente in Mago.",
        variant: "destructive"
      });
      return;
    }

  }

  try {
    // Creating temporary component
    if (createTempComponent) {
      // Call API to replace with a new temporary component
      const payload = {
        createTempComponent: true,
        tempComponentPrefix: "",
        Description: sourceItem.Description || sourceItem.ComponentDescription || `Temporaneo per ${sourceItem.ItemCode || sourceItem.BOM || sourceItem.Item || 'componente'}`,
        Quantity: target.data.Quantity || 1,
        Nature: sourceItem.Nature || sourceItem.ComponentNature || 22413312, // Default to Semi-finished
        BaseUoM: sourceItem.BaseUoM || target.data.UoM || 'PZ',
        CopyBOM: copyBOM, // Pass option to copy BOM
        // Pass source component ID to copy BOM
        SourceComponentId: sourceItem.ItemId || sourceItem.Id || sourceItem.ComponentId || 0
      };
      
  
      return await replaceWithNewComponent(bomId, componentLine, payload);
    } else {
      // Otherwise, replace with existing component
      const componentId = sourceItem.ItemId || sourceItem.Id || 0;
      const componentCode = sourceItem.ItemCode || sourceItem.BOM || sourceItem.Item || '';



      return await replaceComponent(
        bomId,
        componentLine,
        componentId,
        componentCode
      );
    }
  } catch (error) {
    console.error("Error in handleReplaceOperation:", error);
    toast({
      title: "Errore",
      description: error.message || "Si è verificato un errore durante la sostituzione del componente",
      variant: "destructive"
    });
    throw error;
  }
};

// Handle adding a component under another
const handleAddUnderOperation = async (target, draggedItem) => {
if (!selectedBomId || !target?.data) {
throw new Error("Dati insufficienti per l'operazione di inserimento");
}

// Get dragged component data
const { data: sourceItem } = draggedItem;

// Use default value if dragSettings not defined
const dragSettings = draggedItem.dragSettings || {};
const createTempComponent = dragSettings.createTempComponent || false;
const copyBOM = dragSettings.copyBOM || false;

// Verifica se il componente target è di livello root (0 o 1)
const isRootComponent = target.data.Level === 0 || target.data.Level === 1;

// Per i componenti di livello root, controlliamo direttamente lo stato della distinta
if (isRootComponent) {
// Check if the BOM itself is from ERP
if (target.data.bomStato_erp === '1' || target.data.bomStato_erp === 1) {
  toast({
    title: "Errore",
    description: "Non puoi aggiungere componenti sotto a una distinta già presente in Mago.",
    variant: "destructive"
  });
  return;
}
} else {
// Per componenti non root, verifica il componente stesso
if (target.data.bomStato_erp === '1' || target.data.bomStato_erp === 1) {
  toast({
    title: "Errore",
    description: "Non puoi aggiungere componenti a una distinta già presente in Mago.",
    variant: "destructive"
  });
  return;
}
}

// NEW: Check if target can have children (nature check)
const nature = parseInt(target.data.Nature || target.data.ComponentNature || 0, 10);
if (nature === 22413314) { // Purchase component
toast({
  title: "Errore",
  description: "Non puoi aggiungere componenti sotto un componente di acquisto.",
  variant: "destructive"
});
return;
}

// Check if source component is valid
if (!sourceItem) {
toast({
  title: "Errore",
  description: "Componente sorgente non valido.",
  variant: "destructive"
});
return;
}

// Creating temporary component
if (createTempComponent) {
// Prepare meaningful description based on source component
const description = sourceItem.Description || sourceItem.ComponentDescription || 
                   `Temporaneo da ${sourceItem.ItemCode || sourceItem.BOM || sourceItem.Item || 'componente'}`;

// Use source component nature if available, otherwise use semi-finished as default
const nature = sourceItem.Nature || sourceItem.ComponentNature || 22413312; // Default to Semi-finished

// Use source component UoM if available
const uom = sourceItem.BaseUoM || sourceItem.UoM || 'PZ';

// Call API to add new temporary component
const payload = {
  createTempComponent: true,
  tempComponentPrefix: "",
  componentDescription: description,
  quantity: 1,
  nature: nature,
  uom: uom,
  parentComponentId: target.data.ComponentId, // Important: pass parent component ID
  importBOM: copyBOM, // Pass option to copy BOM
  // Pass source component ID to correctly copy BOM
  sourceComponentId: sourceItem.ItemId || sourceItem.Id || sourceItem.ComponentId || 0,
  // If we have BOMId (from JOIN), pass it to directly use that BOM
  sourceBOMId: sourceItem.BOMId || 0,
  sourceItemCode: sourceItem.BOM || sourceItem.Item || ''
};

return await addComponent(selectedBomId, payload);
} else {
// Otherwise, add existing component
const componentId = sourceItem.ItemId || sourceItem.Id || 0;
const componentCode = sourceItem.ItemCode || sourceItem.BOM || sourceItem.Item || '';

const payload = {
  ComponentId: componentId,
  ComponentCode: componentCode,
  ComponentType: 7798784, // Articolo
  Quantity: 1,
  ParentComponentId: target.data.ComponentId, // Important: pass parent component ID
  ImportBOM: true
};


return await addComponent(selectedBomId, payload);
}
};

// Set drag settings for dragged element
const setDragSettings = useCallback((settings) => {
if (activeItem) {
setActiveItem(prev => ({
  ...prev,
  dragSettings: settings
}));
}
}, [activeItem]);

// If children are a function, use render props pattern
const childrenContent = typeof children === 'function' 
? children({ 
  draggingOver, 
  dropTarget, 
  dropMode, 
  activeItem, 
  setDragSettings, 
  debugInfo, 
  forceReplaceMode,
  isOverEmptyBOM
})
: React.Children.map(children, child => {
  if (React.isValidElement(child)) {
    return React.cloneElement(child, { 
      draggingOver,
      dropTarget,
      dropMode,
      activeItem,
      setDragSettings,
      debugInfo,
      forceReplaceMode,
      isOverEmptyBOM
    });
  }
  return child;
});

return (
<DndContext
sensors={sensors}
onDragStart={handleDragStart}
onDragOver={handleDragOver}
onDragEnd={handleDragEnd}
>
{childrenContent}

<DragOverlay>
  {activeItem ? (
    <div className="border border-primary bg-white rounded shadow-lg">
      <DraggableItem item={activeItem} />
    </div>
  ) : null}
</DragOverlay>

{/* Drop indicator - only when NOT on empty BOM */}
{dropTarget && dropMode && dropTarget.type !== 'cycle' && dropTarget.type !== 'empty-bom' && (
  <DropIndicator 
    target={dropTarget} 
    mode={dropMode}
    debugInfo={debugInfo}
    forceReplaceMode={forceReplaceMode}
  />
)}

{/* Special drop indicator for empty BOM */}
{isOverEmptyBOM && dropTarget && dropTarget.type === 'empty-bom' && (
  <EmptyBOMDropIndicator active={true} />
)}

{/* Information on using Shift key when dragging */}
{activeItem && (
  <div style={{
    position: 'fixed',
    top: '10px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: 'rgba(59, 130, 246, 0.9)',
    color: 'white',
    padding: '5px 15px',
    borderRadius: '20px',
    fontSize: '14px',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  }}>
    <span>Tieni premuto</span>
    <kbd style={{
      backgroundColor: 'white',
      color: '#3b82f6',
      padding: '1px 6px',
      borderRadius: '4px',
      fontWeight: 'bold'
    }}>SHIFT</kbd>
    <span>per forzare modalità</span>
    <strong>SOSTITUISCI</strong>
  </div>
)}
</DndContext>
);
};

export default DndContextProvider;