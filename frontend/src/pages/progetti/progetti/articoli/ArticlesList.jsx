import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Package,
  ShoppingCart,
  CircleSlash,
  TimerOff,
  AlertCircle,
  CheckCircle,
  Database,
  ListFilter,
  Eye
} from 'lucide-react';
import ArticleActionsDropdown from './ArticleActionsDropdown';

/**
 * ArticlesList - Componente per la visualizzazione della lista di articoli
 * @param {Array} items - Array di articoli da visualizzare
 * @param {boolean} loading - Flag che indica se è in corso un caricamento
 * @param {Function} onSelect - Callback per la selezione di un articolo
 * @param {Function} onViewBOM - Callback per la visualizzazione della distinta base
 * @param {Function} onCopy - Callback per la copia di un articolo
 * @param {boolean} canEdit - Flag che indica se l'utente ha i permessi di modifica
 * @param {Object} project - Oggetto contenente i dati del progetto corrente
 * @param {Function} onRefresh - Callback per aggiornare la lista degli articoli
 */
const ArticlesList = ({ 
  items = [], 
  loading, 
  onSelect, 
  onViewBOM, 
  onCopy, 
  canEdit, 
  project,
  onRefresh 
}) => {
  // Funzione per ottenere icona e colori in base alla natura dell'articolo
  const getNatureDetails = (nature) => {
    switch (nature) {
      case 22413312: // Semilavorato
        return {
          icon: <Package className="h-4 w-4" />,
          label: 'Semilavorato',
          color: 'bg-blue-100 text-blue-700 border-blue-200'
        };
      case 22413313: // Prodotto Finito
        return {
          icon: <Package className="h-4 w-4" />,
          label: 'Prodotto Finito',
          color: 'bg-green-100 text-green-700 border-green-200'
        };
      case 22413314: // Acquisto
        return {
          icon: <ShoppingCart className="h-4 w-4" />,
          label: 'Acquisto',
          color: 'bg-amber-100 text-amber-700 border-amber-200'
        };
      default:
        return {
          icon: <Package className="h-4 w-4" />,
          label: 'Altro',
          color: 'bg-gray-100 text-gray-700 border-gray-200'
        };
    }
  };

  // Funzione per ottenere icona e colori in base allo stato dell'articolo
  const getStatusDetails = (statusCode) => {
    switch (statusCode) {
      case 'BOZZA':
        return {
          icon: <AlertCircle className="h-4 w-4" />,
          color: 'bg-gray-100 text-gray-700 border-gray-200'
        };
      case 'IN_PROD':
        return {
          icon: <CheckCircle className="h-4 w-4" />,
          color: 'bg-blue-100 text-blue-700 border-blue-200'
        };
      case 'DEL':
        return {
          icon: <CircleSlash className="h-4 w-4" />,
          color: 'bg-red-100 text-red-700 border-red-200'
        };
      case 'STDBY':
        return {
          icon: <TimerOff className="h-4 w-4" />,
          color: 'bg-amber-100 text-amber-700 border-amber-200'
        };
      default:
        return {
          icon: <AlertCircle className="h-4 w-4" />,
          color: 'bg-gray-100 text-gray-700 border-gray-200'
        };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Nessun articolo trovato per questo progetto
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4">
        <Table>
          <TableHeader className="bg-slate-50 sticky top-0">
            <TableRow>
              <TableHead>Codice</TableHead>
              <TableHead>Descrizione</TableHead>
              <TableHead>Natura</TableHead>
              <TableHead>Stato</TableHead>
              <TableHead>In Mago?</TableHead>
              <TableHead>Dimensioni</TableHead>
              <TableHead className="text-right">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const natureDetails = getNatureDetails(item.Nature);
              const statusDetails = getStatusDetails(item.StatusCode);
              const isFromERP = item.stato_erp === 1;
              
              // Dimensioni
              const dimensions = [];
              if (item.Diameter) dimensions.push(`Ø${item.Diameter}`);
              if (item.Bxh) dimensions.push(`${item.Bxh}`);
              if (item.Depth) dimensions.push(`P${item.Depth}`);
              if (item.Length) dimensions.push(`L${item.Length}`);
              if (item.MediumRadius) dimensions.push(`R${item.MediumRadius}`);
              
              return (
                <TableRow key={item.Id} className="hover:bg-slate-50">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {item.Item}
                      {isFromERP && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Database className="h-4 w-4 text-blue-500" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Articolo dal gestionale</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </TableCell>
                  <TableCell 
                    className="max-w-[300px] truncate cursor-pointer hover:underline"
                    onClick={() => onSelect(item)}
                  >
                    {item.Description}
                    {item.CustomerItemReference && (
                      <div className="text-xs text-gray-500 mt-1">
                        Rif. Cliente: {item.CustomerItemReference}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={`flex items-center gap-1 ${natureDetails.color}`}>
                      {natureDetails.icon}
                      <span>{natureDetails.label}</span>
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={`flex items-center gap-1 ${statusDetails.color}`}>
                      {statusDetails.icon}
                      <span>{item.StatusDescription}</span>
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={`${isFromERP ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                      {isFromERP ? 'Sì' : 'No'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {dimensions.length > 0 ? (
                      <span className="text-xs text-gray-700">
                        {dimensions.join(' | ')}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end items-center gap-2">
                      {/* Aggiungiamo il bottone per la distinta base */}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                onViewBOM(item);
                              }}
                              className="h-8 w-8"
                            >
                              <ListFilter className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Visualizza distinta base</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      {/* Bottone per visualizzare i dettagli */}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelect(item);
                              }}
                              className="h-8 w-8"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Visualizza dettagli</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      {/* Menu azioni aggiuntive */}
                      <ArticleActionsDropdown 
                        item={item}
                        project={project}
                        canEdit={canEdit}
                        onViewDetails={() => onSelect(item)}
                        onViewBOM={() => onViewBOM(item)}
                        onEdit={() => onSelect(item)}
                        onRefresh={onRefresh}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </ScrollArea>
  );
};

export default ArticlesList;