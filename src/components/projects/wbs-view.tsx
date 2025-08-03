
"use client"
import { useMemo } from 'react';
import { Tree, TreeNode } from 'react-organizational-chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTasks } from '@/hooks/use-tasks';
import { Loader2 } from 'lucide-react';
import type { Task } from '@/lib/types';

interface WbsViewProps {
  selectedProject: string;
  userRole?: 'admin' | 'manager';
}

const WbsNode = ({ task }: { task: Task & { children: Task[] } }) => (
    <Card className="w-64">
      <CardHeader className="p-2">
        <CardTitle className="text-sm">{task.name}</CardTitle>
      </CardHeader>
      <CardContent className="p-2 text-xs text-muted-foreground">
        <p>Progresso: {task.progress || 0}%</p>
      </CardContent>
    </Card>
);

const renderTree = (tasks: (Task & { children: Task[] })[]) => {
    if (tasks.length === 0) return null;
    
    return tasks.map(task => (
        <TreeNode key={task.id} label={<WbsNode task={task} />}>
            {task.children && task.children.length > 0 && renderTree(task.children)}
        </TreeNode>
    ));
}

export default function WbsView({ selectedProject }: WbsViewProps) {
    const { tasks, loading } = useTasks();

    const taskTree = useMemo(() => {
        const allTasks = tasks || [];
        const tasksWithChildren: (Task & { children: Task[] })[] = JSON.parse(JSON.stringify(allTasks)).map((t: Task) => ({ ...t, children: [] }));
        const taskMap = new Map(tasksWithChildren.map(t => [t.id, t]));
        const rootTasks: (Task & { children: Task[] })[] = [];

        tasksWithChildren.forEach(task => {
            if (task.parent_id && taskMap.has(task.parent_id)) {
                const parent = taskMap.get(task.parent_id)!;
                parent.children.push(task);
            } else {
                rootTasks.push(task);
            }
        });
        
        return rootTasks;
    }, [tasks]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <span className="ml-2">Carregando EAP...</span>
            </div>
        )
    }

    return (
        <div className="w-full h-full overflow-auto p-4 border rounded-lg bg-card">
            {taskTree.length > 0 ? (
                <Tree
                    lineWidth={'2px'}
                    lineColor={'hsl(var(--muted-foreground))'}
                    lineBorderRadius={'10px'}
                    label={<div className="font-bold text-lg">Projeto</div>}
                >
                   {renderTree(taskTree)}
                </Tree>
            ) : (
                 <div className="flex items-center justify-center h-full text-muted-foreground">
                    Nenhuma tarefa para exibir na EAP.
                </div>
            )}
        </div>
    );
}
