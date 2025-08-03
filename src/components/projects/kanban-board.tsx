"use client"
import { useMemo } from 'react';
import { DragDropContext, Draggable, DropResult } from 'react-beautiful-dnd';
import { StrictModeDroppable } from '@/components/shared/strict-mode-droppable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Loader2 } from 'lucide-react';
import type { Task, Tag } from '@/lib/types'; // Importando o tipo Tag
import type { TaskStatus } from '@/hooks/use-table-settings';

interface KanbanBoardProps {
  tasks: Task[];
  statuses: TaskStatus[];
  onDragEnd: (result: DropResult) => void;
  loading: boolean;
}

export default function KanbanBoard({ tasks, statuses, onDragEnd, loading }: KanbanBoardProps) {
    
    const columns = useMemo(() => {
        if (!Array.isArray(statuses) || statuses.length === 0) {
            return [];
        }
        const tasksByStatus: { [key: string]: Task[] } = {};
        statuses.forEach(status => {
            tasksByStatus[status.id] = [];
        });
        if (Array.isArray(tasks)) {
             tasks.forEach(task => {
                if (task.status_id && tasksByStatus[task.status_id]) {
                    tasksByStatus[task.status_id].push(task);
                }
            });
        }
        return statuses.map(status => ({
            id: status.id,
            name: status.name,
            tasks: tasksByStatus[status.id] || []
        }));
    }, [tasks, statuses]);
    
    if (loading) {
         return (
             <div className="flex items-center justify-center h-full">
                 <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                 <span className="ml-2">Carregando quadro...</span>
             </div>
         );
     }

    return (
        <div className="w-full h-full overflow-x-auto p-4">
            <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex gap-4">
                    {columns.map(column => (
                        <StrictModeDroppable key={column.id} droppableId={column.id} isDropDisabled={false} isCombineEnabled={false} ignoreContainerClipping={false}>
                            {(provided) => (
                                <div
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                    className="bg-muted rounded-lg w-72 flex-shrink-0"
                                >
                                    <h3 className="p-4 font-semibold">{column.name} ({column.tasks.length})</h3>
                                    <div className="p-2 space-y-2 h-[calc(100vh-18rem)] overflow-y-auto">
                                        {column.tasks.map((task, index) => (
                                            <Draggable key={task.id} draggableId={task.id} index={index}>
                                                {(provided) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                    >
                                                        <Card>
                                                            <CardHeader className="p-3">
                                                                <CardTitle className="text-sm">{task.name}</CardTitle>
                                                            </CardHeader>
                                                            <CardContent className="p-3 flex justify-between items-center">
                                                                <div className="flex gap-1 flex-wrap">
                                                                    {/* CORREÇÃO FINAL AQUI */}
                                                                    {task.tags && Array.isArray(task.tags) && task.tags.map(tag => tag && <Badge key={tag.id} variant="secondary">{tag.name}</Badge>)}
                                                                </div>
                                                                 <Avatar className="h-8 w-8">
                                                                    <AvatarFallback>{task.assignee_name ? task.assignee_name.substring(0,2).toUpperCase() : 'N/A'}</AvatarFallback>
                                                                </Avatar>
                                                            </CardContent>
                                                        </Card>
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                    </div>
                                </div>
                            )}
                        </StrictModeDroppable>
                    ))}
                </div>
            </DragDropContext>
        </div>
    );
}
