
"use client";

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import type { Task } from '@/lib/types';

const GanttChart = dynamic(() => import('./gantt-chart'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>,
});

type TaskWithSubtasks = Task & { subtasks?: TaskWithSubtasks[] };

export default function GanttChartWrapper({ tasks, isConsolidated }: { tasks: TaskWithSubtasks[], isConsolidated: boolean }) {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <GanttChart tasks={tasks} isConsolidated={isConsolidated} />
    </Suspense>
  );
}
