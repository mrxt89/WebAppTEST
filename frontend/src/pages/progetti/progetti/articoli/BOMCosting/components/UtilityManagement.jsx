import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Factory, Cog, BarChart3 } from 'lucide-react';
import axios from '@/lib/axios';
import { useCompany } from '@/context/CompanyContext';
import WorkCentersManagement from './WorkCentersManagement';
import OperationsManagement from './OperationsManagement';

const UtilityManagement = () => {
  const { company: selectedCompany } = useCompany();
  const [stats, setStats] = useState({
    TotalWorkCenters: 0,
    TotalOperations: 0,
    ActiveOperations: 0,
    InactiveOperations: 0,
    UnusedWorkCenters: 0
  });
  const [loading, setLoading] = useState(false);

  // Carica statistiche
  const loadStats = async () => {
    if (!selectedCompany?.CompanyId) {
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get('/utility/stats');
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Error loading utility stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [selectedCompany?.CompanyId]);

  return (
    <div className="space-y-6">
      {/* Statistiche */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Statistiche Utility
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Factory className="h-8 w-8 mx-auto text-blue-600 mb-2" />
              <div className="text-2xl font-bold text-blue-600">{stats.TotalWorkCenters}</div>
              <div className="text-sm text-gray-600">Centri di Lavoro</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <Cog className="h-8 w-8 mx-auto text-green-600 mb-2" />
              <div className="text-2xl font-bold text-green-600">{stats.TotalOperations}</div>
              <div className="text-sm text-gray-600">Operazioni Totali</div>
            </div>
            <div className="text-center p-4 bg-emerald-50 rounded-lg">
              <Cog className="h-8 w-8 mx-auto text-emerald-600 mb-2" />
              <div className="text-2xl font-bold text-emerald-600">{stats.ActiveOperations}</div>
              <div className="text-sm text-gray-600">Operazioni Attive</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <Cog className="h-8 w-8 mx-auto text-gray-600 mb-2" />
              <div className="text-2xl font-bold text-gray-600">{stats.InactiveOperations}</div>
              <div className="text-sm text-gray-600">Operazioni Inattive</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <Factory className="h-8 w-8 mx-auto text-orange-600 mb-2" />
              <div className="text-2xl font-bold text-orange-600">{stats.UnusedWorkCenters}</div>
              <div className="text-sm text-gray-600">CDL Non Utilizzati</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs per gestione */}
      <Tabs defaultValue="work-centers" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="work-centers" className="flex items-center">
            <Factory className="h-4 w-4 mr-2" />
            Centri di Lavoro
          </TabsTrigger>
          <TabsTrigger value="operations" className="flex items-center">
            <Cog className="h-4 w-4 mr-2" />
            Operazioni
          </TabsTrigger>
        </TabsList>

        <TabsContent value="work-centers">
          <WorkCentersManagement onDataChange={loadStats} />
        </TabsContent>

        <TabsContent value="operations">
          <OperationsManagement onDataChange={loadStats} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UtilityManagement;
