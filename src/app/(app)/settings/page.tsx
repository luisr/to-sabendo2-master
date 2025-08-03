
"use client";

import { useState } from 'react';
import PageHeader from "@/components/shared/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useTasks } from "@/hooks/use-tasks";
import type { Task } from "@/lib/types";

export default function SettingsPage() {
  const [contact, setContact] = useState("(11) 92222-2222");
  const { tasks } = useTasks();

  const handleContactChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 11) {
        value = value.substring(0, 11);
    }

    if (value.length > 10) {
      value = value.replace(/^(\d\d)(\d{5})(\d{4}).*/, "($1) $2-$3");
    } else if (value.length > 5) {
      value = value.replace(/^(\d\d)(\d{4})(\d{0,4}).*/, "($1) $2-$3");
    } else if (value.length > 2) {
      value = value.replace(/^(\d\d)(\d{0,5}).*/, "($1) $2");
    } else {
      value = value.replace(/^(\d*)/, "($1");
    }

    setContact(value);
  };

  const handleExportCSV = () => {

    const headers = [
      "id", "project", "name", "assignee", "status", "priority", 
      "start", "end", "progress", "parentId", "tags"
    ];

    const csvContent = [
      headers.join(","),
      ...tasks.map(task => [
        task.id,
        `"${task.project}"`,
        `"${task.name}"`,
        `"${task.assignee}"`,
        `"${task.status}"`,
        `"${task.priority}"`,
        task.start.toISOString(),
        task.end.toISOString(),
        task.progress ?? 0,
        task.parentId ?? "",
        `"${(task.tags || []).join(";")}"`
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.href) {
      URL.revokeObjectURL(link.href);
    }
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute("download", `tarefas-exportadas-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Configurações" />
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Perfil</CardTitle>
            <CardDescription>
              Atualize suas informações pessoais.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" defaultValue="Gerente de Projeto" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" defaultValue="gp@example.com" />
            </div>
             <div className="space-y-2">
              <Label htmlFor="contact">Contato</Label>
              <Input id="contact" value={contact} onChange={handleContactChange} />
            </div>
            <Button>Salvar Perfil</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Importação de Dados</CardTitle>
            <CardDescription>
              Importe dados de projetos de outras ferramentas. Suporta os formatos .CSV e .xlsx.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="space-y-2">
              <Label htmlFor="import-file">Arquivo do Projeto</Label>
              <Input id="import-file" type="file" />
            </div>
            <Button>Importar Dados</Button>
          </CardContent>
        </Card>
         <Card>
          <CardHeader>
            <CardTitle>Exportação de Dados</CardTitle>
            <CardDescription>
              Exporte seus dados de projeto para os formatos .CSV ou .xlsx.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleExportCSV}>Exportar Dados para CSV</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
