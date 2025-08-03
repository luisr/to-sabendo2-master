
"use client";

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

const GanttChart = dynamic(() => import('./gantt-chart'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>,
});

export default function GanttChartWrapper({ selectedProject }: { selectedProject: string | undefined }) {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <GanttChart selectedProject={selectedProject} />
    </Suspense>
  );
}
