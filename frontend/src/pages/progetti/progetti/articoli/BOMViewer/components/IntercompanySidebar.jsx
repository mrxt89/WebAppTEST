import React, { useState, useEffect } from 'react';
import { Building2, ChevronRight, RefreshCw, Package, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';

const IntercompanySidebar = ({
  bomId,
  getBOMIntercompanySummary,
  onSyncClick,
  isCollapsed,
  onToggleCollapse,
  className = '',
  refreshKey = 0,
}) => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedCompanies, setExpandedCompanies] = useState(new Set());
  const { toast } = useToast();

  const loadSummary = async () => {
    if (!bomId) return;

    try {
      setLoading(true);
      const data = await getBOMIntercompanySummary(bomId);
      setSummary(data);
    } catch (error) {
      console.error('Error loading intercompany summary:', error);
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: 'Impossibile caricare il riepilogo intercompany',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, [bomId, refreshKey]);

  const toggleCompany = (companyId) => {
    const newExpanded = new Set(expandedCompanies);
    if (newExpanded.has(companyId)) {
      newExpanded.delete(companyId);
    } else {
      newExpanded.add(companyId);
    }
    setExpandedCompanies(newExpanded);
  };

  // Se non ci sono componenti intercompany e non siamo in loading, nascondi la sidebar
  if (!loading && summary && summary.totalIntercompanyComponents === 0) {
    return null;
  }

  // Vista collapsed
  if (isCollapsed) {
    return (
      <div className={`w-12 border-l border-gray-200 flex flex-col items-center py-2 gap-2 ${className}`}>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          className="p-1 h-8 w-8"
        >
          <ChevronRight className="w-4 h-4 rotate-180" />
        </Button>
        {summary && summary.totalIntercompanyComponents > 0 && (
          <Badge variant="destructive" className="text-[10px] px-1">
            {summary.totalIntercompanyComponents}
          </Badge>
        )}
      </div>
    );
  }

  // Vista espansa
  return (
    <div className={`w-80 border-l border-gray-200 flex flex-col bg-gray-50 ${className}`}>
      {/* Header */}
      <div className="p-3 border-b border-gray-200 flex items-center justify-between bg-white">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-blue-600" />
          <span className="font-semibold text-sm">Intercompany</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={loadSummary}
            disabled={loading}
            className="h-7 w-7 p-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
            className="h-7 w-7 p-0"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {loading ? (
          <div className="text-center text-sm text-gray-500 py-4">
            Caricamento...
          </div>
        ) : summary ? (
          <>
            {/* Card riepilogo */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-3 pb-3 px-3 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Componenti IC:</span>
                  <span className="font-semibold">{summary.totalIntercompanyComponents}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Company:</span>
                  <span className="font-semibold">{summary.totalTargetCompanies}</span>
                </div>
              </CardContent>
            </Card>

            {/* Lista company */}
            {summary.summaryByCompany && summary.summaryByCompany.map((company) => {
              const isExpanded = expandedCompanies.has(company.TargetCompanyId);
              const ChevronIcon = isExpanded ? ChevronRight : ChevronRight;

              return (
                <Card key={company.TargetCompanyId} className="overflow-hidden">
                  <CardHeader
                    className="p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleCompany(company.TargetCompanyId)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <ChevronIcon
                          className={`w-4 h-4 text-gray-400 transition-transform ${
                            isExpanded ? 'rotate-90' : ''
                          }`}
                        />
                        <Building2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        <span className="text-sm font-medium truncate">
                          {company.TargetCompanyName}
                        </span>
                      </div>
                      <Badge variant="secondary" className="text-[10px] ml-2">
                        {company.TotalComponents}
                      </Badge>
                    </div>
                  </CardHeader>

                  {isExpanded && (
                    <CardContent className="p-3 pt-0 space-y-2">
                      {/* Acquisti */}
                      {company.PurchaseComponents > 0 && (
                        <div className="flex items-center justify-between p-2 bg-green-50 rounded text-xs">
                          <div className="flex items-center gap-2">
                            <Package className="w-3 h-3 text-green-600" />
                            <span>Acquisto</span>
                          </div>
                          <Badge variant="outline" className="text-[10px]">
                            {company.PurchaseComponents}
                          </Badge>
                        </div>
                      )}

                      {/* Conto Lavoro */}
                      {company.SubcontractingComponents > 0 && (
                        <div className="flex items-center justify-between p-2 bg-orange-50 rounded text-xs">
                          <div className="flex items-center gap-2">
                            <Wrench className="w-3 h-3 text-orange-600" />
                            <span>Conto Lavoro</span>
                          </div>
                          <Badge variant="outline" className="text-[10px]">
                            {company.SubcontractingComponents}
                          </Badge>
                        </div>
                      )}

                      {/* Fornitori */}
                      {company.Suppliers && (
                        <div className="text-[10px] text-gray-500 pt-1">
                          <span className="font-medium">Fornitori:</span>{' '}
                          {company.Suppliers}
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              );
            })}

            {/* Button Sincronizza */}
            <Button
              onClick={onSyncClick}
              disabled={loading || summary.totalIntercompanyComponents === 0}
              className="w-full"
              size="sm"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-2" />
              Sincronizza Condivisioni
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default IntercompanySidebar;
