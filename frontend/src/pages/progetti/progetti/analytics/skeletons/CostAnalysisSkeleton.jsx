import React from 'react';
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton loader per l'analisi dei costi
 */
const CostAnalysisSkeleton = () => (
  <div className="space-y-4 animate-pulse">
    <div className="flex justify-between items-center">
      <h3 className="text-lg font-medium flex items-center gap-2">
        <Skeleton className="h-5 w-5 rounded-full" />
        <Skeleton className="h-6 w-40" />
      </h3>
      <Skeleton className="h-9 w-[180px] rounded-md" />
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Skeleton className="lg:col-span-2 h-[350px] w-full rounded-lg" />
      <Skeleton className="h-[350px] w-full rounded-lg" />
    </div>
  </div>
);

export default CostAnalysisSkeleton;