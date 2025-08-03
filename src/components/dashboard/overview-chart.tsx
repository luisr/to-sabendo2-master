
"use client";

import { useMemo } from 'react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { Task } from '@/lib/types';
import { useTableSettings } from '@/hooks/use-table-settings';
import { eachMonthOfInterval, startOfYear, endOfYear, format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface OverviewChartProps {
  tasks: Task[]; // Expects tasks to be passed as a prop
}

export default function OverviewChart({ tasks }: OverviewChartProps) {
  const { statuses } = useTableSettings();

  const chartData = useMemo(() => {
    const allTasks = tasks || [];
    const safeStatuses = statuses || [];
    const doneStatusId = safeStatuses.find(s => s.name.toLowerCase() === 'feito')?.id;

    const months = eachMonthOfInterval({
      start: startOfYear(new Date()),
      end: endOfYear(new Date()),
    });

    const monthlyData: { [key: string]: { completed: number, pending: number } } = {};
    months.forEach(month => {
      const monthName = format(month, 'MMM', { locale: ptBR });
      monthlyData[monthName] = { completed: 0, pending: 0 };
    });

    allTasks.forEach(task => {
        try {
            const taskDate = new Date(task.end_date);
            if (isNaN(taskDate.getTime())) return;

            const monthName = format(taskDate, 'MMM', { locale: ptBR });
            if (monthlyData.hasOwnProperty(monthName)) {
                if (task.status_id === doneStatusId) {
                    monthlyData[monthName].completed++;
                } else {
                    monthlyData[monthName].pending++;
                }
            }
        } catch (e) {
            console.error("Invalid date for task", task);
        }
    });
    
    return Object.entries(monthlyData).map(([name, values]) => ({ 
        name, 
        Concluídas: values.completed,
        Pendentes: values.pending 
    }));

  }, [tasks, statuses]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Visão Geral de Tarefas</CardTitle>
        <CardDescription>
          Contagem de tarefas concluídas vs. pendentes por mês.
        </CardDescription>
      </CardHeader>
      <CardContent className="pl-2">
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={chartData}>
            <XAxis
              dataKey="name"
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
                contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 'var(--radius)'
                }}
            />
            <Bar
              dataKey="Pendentes"
              stackId="a"
              fill="hsl(var(--chart-2))"
              radius={[0, 0, 4, 4]}
            />
             <Bar
              dataKey="Concluídas"
              stackId="a"
              fill="hsl(var(--chart-1))"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
