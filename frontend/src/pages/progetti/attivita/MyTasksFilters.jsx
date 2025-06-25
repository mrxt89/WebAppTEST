import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, RotateCcw, Calendar, ArrowUpDown, Users, Filter, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const MyTasksFilters = ({
  filters,
  onFilterChange,
  onResetFilters,
  hasActiveFilters,
  uniqueProjects,
  allUsers = [], // Nuovo parametro per lista utenti
}) => {
  // Conta i filtri attivi
  const activeFiltersCount = Object.entries(filters).filter(([key, value]) => {
    // Escludi i campi che non sono filtri effettivi
    if (key === 'sortBy' || key === 'sortDirection') return false;
    // Conta solo valori non vuoti e diversi da "all"
    return value && value !== "all" && value !== "" && value !== null;
  }).length;

  return (
    <div className="mb-4">
      {/* Barra compatta con ricerca e toggle filtri */}
      <div className="flex items-center gap-3 mb-3">
        <div className="relative flex-1 max-w-md">
          <Input
            placeholder="Cerca attività..."
            value={filters.searchText}
            onChange={(e) => onFilterChange({ searchText: e.target.value })}
            className={`pl-9 pr-8 h-9 ${filters.searchText ? "border-blue-500 bg-blue-50" : ""}`}
          />
          <Search className="h-4 w-4 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          {filters.searchText && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              onClick={() => onFilterChange({ searchText: "" })}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        <Collapsible className="flex-1">
          <CollapsibleTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-3 flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              <span>Filtri</span>
              {activeFiltersCount > 0 && (
                <Badge variant="" className="ml-1 h-5 px-1.5 text-xs">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="mt-2">
            <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {/* Priorità */}
                  <div>
                    <Select
                      value={filters.priority}
                      onValueChange={(value) => onFilterChange({ priority: value })}
                    >
                      <SelectTrigger className={`h-8 text-xs ${filters.priority !== "all" ? "border-blue-500 bg-blue-50" : ""}`}>
                        <SelectValue placeholder="Priorità" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tutte</SelectItem>
                        <SelectItem value="ALTA">Alta</SelectItem>
                        <SelectItem value="MEDIA">Media</SelectItem>
                        <SelectItem value="BASSA">Bassa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Stato */}
                  <div>
                    <Select
                      value={filters.status}
                      onValueChange={(value) => onFilterChange({ status: value })}
                    >
                      <SelectTrigger className={`h-8 text-xs ${filters.status !== "all" ? "border-blue-500 bg-blue-50" : ""}`}>
                        <SelectValue placeholder="Stato" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tutti</SelectItem>
                        <SelectItem value="DA FARE">Da fare</SelectItem>
                        <SelectItem value="IN ESECUZIONE">In corso</SelectItem>
                        <SelectItem value="COMPLETATA">Completata</SelectItem>
                        <SelectItem value="BLOCCATA">Bloccata</SelectItem>
                        <SelectItem value="SOSPESA">Sospesa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Scadenza */}
                  <div>
                    <Select
                      value={filters.dueDate}
                      onValueChange={(value) => onFilterChange({ dueDate: value })}
                    >
                      <SelectTrigger className={`h-8 text-xs ${filters.dueDate !== "all" ? "border-blue-500 bg-blue-50" : ""}`}>
                        <SelectValue placeholder="Scadenza" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tutte</SelectItem>
                        <SelectItem value="today">Oggi</SelectItem>
                        <SelectItem value="tomorrow">Domani</SelectItem>
                        <SelectItem value="week">Settimana</SelectItem>
                        <SelectItem value="month">Mese</SelectItem>
                        <SelectItem value="late">In ritardo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Progetto */}
                  <div>
                    <Select
                      value={filters.projectId}
                      onValueChange={(value) => onFilterChange({ projectId: value })}
                    >
                      <SelectTrigger className={`h-8 text-xs ${filters.projectId !== "all" ? "border-blue-500 bg-blue-50" : ""}`}>
                        <SelectValue placeholder="Progetto" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tutti</SelectItem>
                        {uniqueProjects.map((project) => (
                          <SelectItem key={project.id} value={project.id.toString()}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Utente Coinvolto */}
                  {allUsers.length > 0 && (
                    <div>
                      <Select
                        value={filters.involvedUser || "all"}
                        onValueChange={(value) =>
                          onFilterChange({
                            involvedUser: value === "all" ? null : value,
                          })
                        }
                      >
                        <SelectTrigger className={`h-8 text-xs ${filters.involvedUser ? "border-blue-500 bg-blue-50" : ""}`}>
                          <SelectValue placeholder="Utente" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tutti</SelectItem>
                          {allUsers.map((user) => (
                            <SelectItem
                              key={user.userId}
                              value={user.userId.toString()}
                            >
                              {user.username || `${user.firstName} ${user.lastName}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Ordinamento */}
                  <div className="flex gap-1">
                    <Select
                      value={filters.sortBy}
                      onValueChange={(value) => onFilterChange({ sortBy: value })}
                    >
                      <SelectTrigger className="h-8 text-xs flex-1">
                        <SelectValue placeholder="Ordina" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dueDate">Scadenza</SelectItem>
                        <SelectItem value="priority">Priorità</SelectItem>
                        <SelectItem value="project">Progetto</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        onFilterChange({
                          sortDirection:
                            filters.sortDirection === "asc" ? "desc" : "asc",
                        })
                      }
                      className="h-8 w-8 p-0"
                    >
                      <ArrowUpDown className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Pulsante reset se ci sono filtri attivi */}
                {hasActiveFilters && (
                  <div className="flex justify-end mt-3 pt-3 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onResetFilters}
                      className="h-7 px-3 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Reset filtri
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Indicatori filtri attivi */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {filters.searchText && (
            <Badge variant="secondary" className="text-xs">
              Ricerca: "{filters.searchText}"
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                onClick={() => onFilterChange({ searchText: "" })}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          {filters.priority !== "all" && (
            <Badge variant="secondary" className="text-xs">
              Priorità: {filters.priority}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                onClick={() => onFilterChange({ priority: "all" })}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          {filters.status !== "all" && (
            <Badge variant="secondary" className="text-xs">
              Stato: {filters.status}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                onClick={() => onFilterChange({ status: "all" })}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          {filters.dueDate !== "all" && (
            <Badge variant="secondary" className="text-xs">
              Scadenza: {filters.dueDate}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                onClick={() => onFilterChange({ dueDate: "all" })}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          {filters.projectId !== "all" && (
            <Badge variant="secondary" className="text-xs">
              Progetto: {uniqueProjects.find(p => p.id.toString() === filters.projectId)?.name}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                onClick={() => onFilterChange({ projectId: "all" })}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          {filters.involvedUser && (
            <Badge variant="secondary" className="text-xs">
              Utente: {allUsers.find(u => u.userId.toString() === filters.involvedUser)?.username}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                onClick={() => onFilterChange({ involvedUser: null })}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};

export default MyTasksFilters;
