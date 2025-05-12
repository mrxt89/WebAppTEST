import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Search, 
  RotateCcw, 
  Calendar, 
  ArrowUpDown,
  Users
} from 'lucide-react';

const MyTasksFilters = ({ 
  filters, 
  onFilterChange, 
  onResetFilters, 
  hasActiveFilters,
  uniqueProjects,
  allUsers = [] // Nuovo parametro per lista utenti
}) => {

  return (
    <Card className="bg-gray-50 shadow-sm">
      <CardContent className="p-4 pt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
          {/* Filtro di ricerca - esteso per miglior visibilità su schermi piccoli */}
          <div className="relative md:col-span-2 lg:col-span-1">
            <Input
              placeholder="Cerca attività..."
              value={filters.searchText}
              onChange={(e) => onFilterChange({ searchText: e.target.value })}
              className={`pl-8 ${filters.searchText ? 'border-blue-500' : ''}`}
            />
            <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-gray-400" />
          </div>

          {/* Filtri di stato e priorità sulla stessa riga in schermi medi */}
          <div className="md:col-span-2 lg:col-span-1">
            <Select 
              value={filters.priority}
              onValueChange={(value) => onFilterChange({ priority: value })}
            >
              <SelectTrigger className={filters.priority !== 'all' ? 'border-blue-500' : ''}>
                <SelectValue placeholder="Priorità" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte le priorità</SelectItem>
                <SelectItem value="ALTA">Alta</SelectItem>
                <SelectItem value="MEDIA">Media</SelectItem>
                <SelectItem value="BASSA">Bassa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-2 lg:col-span-1">
            <Select 
              value={filters.status}
              onValueChange={(value) => onFilterChange({ status: value })}
            >
              <SelectTrigger className={filters.status !== 'all' ? 'border-blue-500' : ''}>
                <SelectValue placeholder="Stato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti gli stati</SelectItem>
                <SelectItem value="DA FARE">Da fare</SelectItem>
                <SelectItem value="IN ESECUZIONE">In corso</SelectItem>
                <SelectItem value="COMPLETATA">Completata</SelectItem>
                <SelectItem value="BLOCCATA">Bloccata</SelectItem>
                <SelectItem value="SOSPESA">Sospesa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Altri filtri */}
          <div>
            <Select 
              value={filters.dueDate}
              onValueChange={(value) => onFilterChange({ dueDate: value })}
            >
              <SelectTrigger className={filters.dueDate !== 'all' ? 'border-blue-500' : ''}>
                <SelectValue placeholder="Scadenza" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte le scadenze</SelectItem>
                <SelectItem value="today">Oggi</SelectItem>
                <SelectItem value="tomorrow">Domani</SelectItem>
                <SelectItem value="week">Questa settimana</SelectItem>
                <SelectItem value="month">Questo mese</SelectItem>
                <SelectItem value="late">In ritardo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Select 
              value={filters.projectId}
              onValueChange={(value) => onFilterChange({ projectId: value })}
            >
              <SelectTrigger className={filters.projectId !== 'all' ? 'border-blue-500' : ''}>
                <SelectValue placeholder="Progetto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti i progetti</SelectItem>
                {uniqueProjects.map(project => (
                  <SelectItem key={project.id} value={project.id.toString()}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filtro di Utente Coinvolto */}
          {allUsers.length > 0 && (
            <div>
              <Select 
                value={filters.involvedUser || 'all'}
                onValueChange={(value) => onFilterChange({ involvedUser: value === 'all' ? null : value })}
              >
                <SelectTrigger className={filters.involvedUser ? 'border-blue-500' : ''}>
                  <div className="flex items-center">
                    <Users className="h-4 w-4 mr-2 text-gray-500" />
                    <SelectValue placeholder="Utente Coinvolto" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti gli utenti</SelectItem>
                  {allUsers.map(user => (
                    <SelectItem key={user.userId} value={user.userId.toString()}>
                      {user.username || `${user.firstName} ${user.lastName}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Select 
              value={filters.sortBy}
              onValueChange={(value) => onFilterChange({ sortBy: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Ordina per" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dueDate">Scadenza</SelectItem>
                <SelectItem value="priority">Priorità</SelectItem>
                <SelectItem value="project">Progetto</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Button
              variant="outline"
              onClick={() => onFilterChange({ 
                sortDirection: filters.sortDirection === 'asc' ? 'desc' : 'asc' 
              })}
              className="flex items-center gap-2 w-full"
            >
              <ArrowUpDown className="h-4 w-4" />
              {filters.sortDirection === 'asc' ? 'Crescente' : 'Decrescente'}
            </Button>
          </div>

          {/* Pulsante reset */}
          {hasActiveFilters && (
            <Button 
              variant="ghost" 
              onClick={onResetFilters}
              className="flex items-center gap-2 text-blue-600 md:col-span-2 lg:col-span-3 xl:col-span-1"
            >
              <RotateCcw className="h-4 w-4" />
              Reset filtri
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MyTasksFilters;