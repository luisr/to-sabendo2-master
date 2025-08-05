"use client";
import { useMemo, useState } from 'react';
import { Tree, TreeNode } from 'react-organizational-chart';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTasks } from '@/hooks/use-tasks';
import { Loader2, PlusSquare, MinusSquare } from 'lucide-react';
import type { Task } from '@/lib/types';
import { cn } from '@/lib/utils';

// Tipo estendido para o nó, com filhos (children)
type TaskNode = Task & { children: TaskNode[] };

// Componente para o nó da EAP
const WbsNode = ({ task, isCollapsed, onToggle }: { task: TaskNode; isCollapsed: boolean; onToggle: () => void; }) => (
    <Card className="w-72 inline-flex flex-col relative shadow-md">
        <CardHeader className="p-3">
            <CardTitle className="text-base">{task.name}</CardTitle>
            <CardDescription>{task.wbs_code || `TSK-${task.id.substring(0, 4)}`}</CardDescription>
        </CardHeader>
        <CardContent className="p-3 text-sm text-muted-foreground">
            <p>Progresso: {task.progress || 0}%</p>
            <p>Status: <span className="font-medium">{task.status_name || 'N/D'}</span></p>
        </CardContent>
        {task.children && task.children.length > 0 && (
            <div className="absolute -bottom-5 left-1/2 -translate-x-1/2">
                 <Button
                    variant="ghost"
                    size="icon"
                    onClick={onToggle}
                    className="h-10 w-10 rounded-full bg-background hover:bg-muted/90 border shadow"
                >
                    {isCollapsed ? <PlusSquare className="h-5 w-5" /> : <MinusSquare className="h-5 w-5" />}
                </Button>
            </div>
        )}
    </Card>
);

// Função recursiva para renderizar a árvore
const renderTree = (tasks: TaskNode[], collapsedNodes: Set<string>, toggleNode: (id: string) => void) => {
    if (tasks.length === 0) return null;
    
    return tasks.map(task => {
        const isCollapsed = collapsedNodes.has(task.id);
        return (
            <TreeNode
                key={task.id}
                label={<WbsNode task={task} isCollapsed={isCollapsed} onToggle={() => toggleNode(task.id)} />}
            >
                {!isCollapsed && task.children && task.children.length > 0 && renderTree(task.children, collapsedNodes, toggleNode)}
            </TreeNode>
        );
    });
};

export default function WbsView() {
    const { tasks, loading } = useTasks();
    const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());

    const toggleNode = (taskId: string) => {
        setCollapsedNodes(prev => {
            const newSet = new Set(prev);
            if (newSet.has(taskId)) {
                newSet.delete(taskId);
            } else {
                newSet.add(taskId);
            }
            return newSet;
        });
    };

    const taskTree = useMemo((): TaskNode[] => {
        if (!tasks || tasks.length === 0) return [];
        
        // Deep copy para evitar mutação do estado original
        const tasksWithChildren: TaskNode[] = JSON.parse(JSON.stringify(tasks)).map((t: Task) => ({ ...t, children: [] }));
        const taskMap = new Map(tasksWithChildren.map(t => [t.id, t]));
        const rootTasks: TaskNode[] = [];

        tasksWithChildren.forEach(task => {
            if (task.parent_id && taskMap.has(task.parent_id)) {
                const parent = taskMap.get(task.parent_id)!;
                // Garante que a propriedade children exista
                if (!parent.children) {
                    parent.children = [];
                }
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
        );
    }

    // Renderiza a EAP
    return (
        <div className="w-full h-full overflow-auto p-8 border rounded-lg bg-background/50">
            {taskTree.length > 0 ? (
                <Tree
                    lineWidth={'2px'}
                    lineColor={'hsl(var(--muted-foreground))'}
                    lineBorderRadius={'10px'}
                    label={<Card className="shadow-lg"><CardHeader><CardTitle>Estrutura Analítica do Projeto</CardTitle></CardHeader></Card>}
                >
                   {renderTree(taskTree, collapsedNodes, toggleNode)}
                </Tree>
            ) : (
                 <div className="flex items-center justify-center h-full text-muted-foreground">
                    Nenhuma tarefa para exibir na EAP. Adicione tarefas e defina suas hierarquias.
                </div>
            )}
        </div>
    );
}
