import React from 'react';
import { Building2, Wrench, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const IntercompanyBadge = ({
  type,
  targetCompanyName,
  supplierCode,
  status,
  className = '',
}) => {
  // Determina icona e testo in base al tipo
  const TypeIcon = type === 'ACQUISTO' ? Building2 : Wrench;
  const badgeText = type === 'ACQUISTO' ? 'IC-ACQ' : 'IC-CL';

  // Determina variant del badge in base allo status
  const getBadgeVariant = () => {
    if (!status) return 'secondary';
    switch (status) {
      case 'APPROVED':
        return 'success';
      case 'REJECTED':
        return 'destructive';
      case 'PENDING':
        return 'warning';
      case 'DRAFT':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  // Determina icona di status
  const getStatusIcon = () => {
    if (!status) return null;
    switch (status) {
      case 'APPROVED':
        return <CheckCircle className="w-3 h-3" />;
      case 'REJECTED':
        return <XCircle className="w-3 h-3" />;
      case 'PENDING':
        return <Clock className="w-3 h-3" />;
      case 'DRAFT':
        return <AlertCircle className="w-3 h-3" />;
      default:
        return null;
    }
  };

  // Testo status per tooltip
  const getStatusText = (status) => {
    switch (status) {
      case 'APPROVED':
        return 'Approvato';
      case 'REJECTED':
        return 'Rifiutato';
      case 'PENDING':
        return 'In Attesa';
      case 'DRAFT':
        return 'Bozza';
      default:
        return '';
    }
  };

  const StatusIcon = getStatusIcon();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant={getBadgeVariant()}
            className={`text-[10px] px-1.5 py-0.5 gap-1 cursor-help ${className}`}
          >
            <TypeIcon className="w-3 h-3" />
            <span>{badgeText}</span>
            {StatusIcon}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs">
          <div className="space-y-1">
            <div className="font-semibold">
              {type === 'ACQUISTO' ? 'Acquisto Intercompany' : 'Conto Lavoro Intercompany'}
            </div>
            <div className="text-xs">
              <div><strong>Company:</strong> {targetCompanyName}</div>
              <div><strong>Fornitore:</strong> {supplierCode}</div>
              {status && <div><strong>Stato:</strong> {getStatusText(status)}</div>}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default IntercompanyBadge;
