import React, { useState } from 'react';
import { Card, CardHeader } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Filter, X, Search } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const FiltersSummary = ({ filters, isExpanded }) => {
    const getActiveFiltersCount = () => {
        return Object.entries(filters).reduce((count, [key, value]) => {
          if (value === null || value === undefined || value === '') return count;
          if (value === 'all') return count;
          if (key === 'custSupp' && !value) return count;
          if (key === 'categoryId' && (!value || value === '0')) return count;
          if (key === 'taskAssignedTo' && value === null) return count;
          return count + 1;
        }, 0);
      };

      const getFiltersSummary = () => {
        const summary = [];
        if (filters.status && filters.status !== 'all') summary.push(`Stato: ${filters.status}`);
        if (filters.searchText) summary.push(`Ricerca: ${filters.searchText}`);
        if (filters.custSupp) summary.push('Cliente filtrato');
        if (filters.categoryId && filters.categoryId !== '0') summary.push('Categoria filtrata');
        if (filters.projectErpId) summary.push(`ERP: ${filters.projectErpId}`);
        if (filters.taskAssignedTo) summary.push('Assegnato filtrato');
        if (filters.dueDate) summary.push('Data filtrata');
        return summary;
      };

      const activeCount = getActiveFiltersCount();
      const summary = getFiltersSummary();
    
      if (activeCount === 0) return null;
    
      return (
        <div className="flex items-center gap-2 text-sm">
          <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100">
            {activeCount} {activeCount === 1 ? 'filtro attivo' : 'filtri attivi'}
          </Badge>
          {!isExpanded && summary.length > 0 && (
            <span className="text-gray-500 text-xs truncate max-w-md">
              {summary.slice(0, 2).join(', ')}
              {summary.length > 2 && ' ...'}
            </span>
          )}
        </div>
      );
    };

const CollapsibleFilters = ({ 
  children,
  onResetFilters,
  filters,
  hasActiveFilters = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Separa il dialog dagli altri children
  const dialog = React.Children.toArray(children).find(child => 
    React.isValidElement(child) && child.type === Dialog
  );
  
  const filterElements = React.Children.toArray(children).filter(child => 
    React.isValidElement(child) && child.type !== Dialog
  );

  return (
    <TooltipProvider>
      <Card className="overflow-hidden bg-white/50 backdrop-blur-sm border-none shadow-sm">
        <CardHeader className="p-3">
          <div className="space-y-3">
            {/* Header with title and filters summary */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Filter className={`h-4 w-4 ${hasActiveFilters ? 'text-blue-500' : 'text-gray-400'}`} />
                  <span className="text-sm font-medium text-gray-700">Filtri</span>
                </div>
                <FiltersSummary filters={filters} isExpanded={isExpanded} />
              </div>
              <div className="flex items-center gap-2">
                {hasActiveFilters && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onResetFilters}
                        className="h-8 px-2 text-gray-500 hover:text-red-600 hover:bg-red-50"
                      >
                        <X className="h-4 w-4" />
                        <span className="sr-only">Rimuovi filtri</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Rimuovi tutti i filtri</TooltipContent>
                  </Tooltip>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsExpanded(!isExpanded)}
                      className="h-8 px-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                      <span className="sr-only">{isExpanded ? 'Comprimi' : 'Espandi'}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{isExpanded ? 'Comprimi filtri' : 'Espandi filtri'}</TooltipContent>
                </Tooltip>
                {/* New Project button */}
                <div className="shrink-0 ml-2">
                  {dialog}
                </div>
              </div>
            </div>
            
            {/* Animated collapsible content */}
            <div
              className={`grid transition-all duration-300 ease-in-out overflow-hidden ${
                isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
              }`}
            >
              <div className="overflow-hidden">
                {filterElements}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>
    </TooltipProvider>
  );
};

export default CollapsibleFilters;