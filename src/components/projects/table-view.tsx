"use client";
import { useState, useMemo, forwardRef, Fragment, useRef } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { MoreHorizontal, PlusCircle, Settings, Trash2, ChevronRight, Loader2, Printer, Expand } from 'lucide-react';
import type { Task, Tag } from '@/lib/types';
import { Progress } from '../ui/progress';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import TableManagerModal from './table-manager-modal';
import { useTableSettings } from '@/hooks/use-table-settings';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useReactToPrint } from 'react-to-print';

const TaskRow = ({ task, onSelect, isSelected, columns, isManager, onEditTask }: any) => {
    // ... (código existente do TaskRow)
};

const TableView = forwardRef<HTMLDivElement, any>(({ tasks, onEditTask, onAddTask, onDeleteSelected, loading, isManager, selectedTasks, setSelectedTasks }, ref) => {
    const { tags: allTags, visibleColumns } = useTableSettings();
    const [filterText, setFilterText] = useState("");
    const [filterTags, setFilterTags] = useState<string[]>([]);
    const [isManagerModalOpen, setIsManagerModalOpen] = useState(false);
    
    const printRef = useRef(null);
    
    const handlePrint = useReactToPrint({
        content: () => printRef.current,
    });

    // A funcionalidade de Tela Cheia foi removida para corrigir o bug.
    
    const columns = useMemo(() => [
        { id: 'assignee', name: 'Responsável' },
        { id: 'status', name: 'Status' },
        { id: 'priority', name: 'Prioridade' },
        { id: 'tags', name: 'Tags' },
        { id: 'progress', name: 'Progresso' },
        { id: 'start_date', name: 'Início' },
        { id: 'end_date', name: 'Fim' },
    ].filter(c => visibleColumns.includes(c.id)), [visibleColumns]);

    const filteredTasks = useMemo(() => {
        if (!Array.isArray(tasks)) return [];
        return tasks.filter((task: Task) => {
            const textMatch = task.name.toLowerCase().includes(filterText.toLowerCase());
            const tagMatch = filterTags.length === 0 || (Array.isArray(task.tags) && task.tags.some(tag => tag && filterTags.includes(tag.id)));
            return textMatch && tagMatch;
        });
    }, [tasks, filterText, filterTags]);

    return (
        <>
            <div className="flex justify-between items-center mb-4">
                {/* ... (filtros) ... */}
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handlePrint}><Printer className="h-4 w-4 mr-2" />Imprimir</Button>
                    {isManager && (
                         <Button variant="outline" size="sm" onClick={() => setIsManagerModalOpen(true)}><Settings className="h-4 w-4 mr-2" />Gerenciar Tabela</Button>
                    )}
                </div>
            </div>
            
            <div className="border rounded-md overflow-x-auto" ref={ref}>
                <div ref={printRef}>
                    <Table>
                        {/* ... (TableHeader e TableBody) ... */}
                    </Table>
                </div>
            </div>
            <TableManagerModal isOpen={isManagerModalOpen} onOpenChange={setIsManagerModalOpen} />
        </>
    );
});
TableView.displayName = "TableView";
export default TableView;