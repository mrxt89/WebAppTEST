// BOMViewer/components/BOMReferencePanel/ProjectBOMs.jsx
import React, { useEffect, useState } from 'react';
import { useBOMViewer } from '../../context/BOMViewerContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DraggableItem from './DraggableItem';

const ProjectBOMs = ({ importOptions }) => {
  const { 
    projectBOMs, 
    setProjectBOMs,
    getBOMByItemId,
    loading,
    setLoading,
    project,
    addComponent,
    selectedBomId
  } = useBOMViewer();
  
  const [searchText, setSearchText] = useState('');
  const [natureFilter, setNatureFilter] = useState('all');
  const [expandedItems, setExpandedItems] = useState({});
  
  // Load project BOMs
  useEffect(() => {
    const loadProjectBOMs = async () => {
      if (!project?.ProjectID) return;
      
      try {
        setLoading(true);
        
        // In una implementazione reale, chiameresti un'API per ottenere le distinte dal progetto
        // Qui stiamo simulando con dati di esempio
        const dummyBOMs = [
          {
            id: 'project-bom-1',
            BOM: 'TBOM_001',
            Description: 'Distinta Progetto 1',
            ItemCode: 'ITEM001',
            Nature: 22413312, // Semilavorato
            Components: []
          },
          {
            id: 'project-bom-2',
            BOM: 'TBOM_002',
            Description: 'Distinta Progetto 2',
            ItemCode: 'ITEM002',
            Nature: 22413313, // Prodotto finito
            Components: []
          },
          {
            id: 'project-bom-3',
            BOM: 'TBOM_003',
            Description: 'Distinta Progetto 3',
            ItemCode: 'ITEM003',
            Nature: 22413314, // Acquisto
            Components: []
          }
        ];
        
        setProjectBOMs(dummyBOMs);
      } catch (error) {
        console.error('Error loading project BOMs:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadProjectBOMs();
  }, [project, setProjectBOMs, setLoading]);
  
  // Handle search
  const handleSearch = () => {
    // Filtra le distinte per testo di ricerca
    // In un'implementazione reale, chiameresti un'API con il parametro di ricerca
    if (!searchText.trim()) {
      // Se non c'è testo di ricerca, resetta il filtro
      loadProjectBOMs();
      return;
    }
    
    // Filtra localmente (simulazione)
    const filteredBOMs = projectBOMs.filter(bom => {
      const searchLower = searchText.toLowerCase();
      return (
        (bom.BOM && bom.BOM.toLowerCase().includes(searchLower)) ||
        (bom.Description && bom.Description.toLowerCase().includes(searchLower)) ||
        (bom.ItemCode && bom.ItemCode.toLowerCase().includes(searchLower))
      );
    });
    
    setProjectBOMs(filteredBOMs);
  };
  
  // Toggle item expansion
  const handleToggleItem = (itemId) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };
  
  // Filter BOMs by nature
  const filteredBOMs = natureFilter === 'all' 
    ? projectBOMs 
    : projectBOMs.filter(bom => {
        const bomNature = bom.Nature || bom.ComponentNature || 0;
        
        switch (natureFilter) {
          case 'semifinished':
            return bomNature === 22413312;
          case 'finished':
            return bomNature === 22413313;
          case 'purchased':
            return bomNature === 22413314;
          default:
            return true;
        }
      });
  
  // Handle double-click or add button
  const handleAddItem = async (item) => {
    if (!selectedBomId) return;
    
    try {
      setLoading(true);
      
      // Prepare data for adding component
      const componentData = {
        ComponentId: item.id || 0,
        ComponentCode: item.BOM || item.ItemCode || '',
        Quantity: 1,
        ImportBOM: importOptions.copyBOM,
        createTempComponent: importOptions.createTempComponent
      };
      
      const result = await addComponent(componentData);
      
      if (result) {
        console.log('Component added successfully');
      }
    } catch (error) {
      console.error('Error adding component:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="h-full flex flex-col">
      {/* Search and filter bar */}
      <div className="p-3 border-b">
        <div className="flex gap-2 mb-2">
          <div className="relative flex-1">
            <Input
              placeholder="Cerca distinte del progetto..."
              className="pl-8"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <Button size="icon" onClick={handleSearch}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Nature filter */}
        <div className="flex gap-2">
          <Select
            value={natureFilter}
            onValueChange={setNatureFilter}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Filtra per natura" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte le nature</SelectItem>
              <SelectItem value="semifinished">Semilavorati</SelectItem>
              <SelectItem value="finished">Prodotti Finiti</SelectItem>
              <SelectItem value="purchased">Acquisti</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            variant="outline" 
            size="icon" 
            title="Reimposta filtri"
            onClick={() => {
              setNatureFilter('all');
              setSearchText('');
              loadProjectBOMs();
            }}
          >
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* BOMs list with fixed height and scrolling */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : filteredBOMs.length > 0 ? (
          <div className="space-y-1 p-3 h-10">
            {filteredBOMs.map(bom => (
              <div 
                key={bom.id} 
                className="relative group"
                onDoubleClick={() => handleAddItem(bom)}
              >
                <DraggableItem
                  item={{
                    id: `project-${bom.id}`,
                    type: 'bom',
                    data: bom
                  }}
                  expanded={!!expandedItems[`project-${bom.id}`]}
                  onToggle={() => handleToggleItem(`project-${bom.id}`)}
                />
                
                {/* Quick add button */}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute right-1 top-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleAddItem(bom)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>Nessuna distinta trovata in questo progetto</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectBOMs;