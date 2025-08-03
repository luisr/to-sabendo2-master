"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Project } from "@/lib/types";
import { Loader2 } from "lucide-react";
import { useProjects } from "@/hooks/use-projects";


interface ProjectSelectorProps {
  projects?: Project[];
  value: string;
  onValueChange: (value: string) => void;
  loading?: boolean;
  className?: string;
  showConsolidatedView?: boolean;
}

export default function ProjectSelector({ 
  projects = [], // Default to an empty array to prevent crash
  value, 
  onValueChange, 
  loading = false,
  className,
  showConsolidatedView = true,
}: ProjectSelectorProps) {

  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Carregando projetos...</span>
      </div>
    )
  }

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={className || "w-[280px]"}>
        <SelectValue placeholder="Selecione um projeto" />
      </SelectTrigger>
      <SelectContent>
        {showConsolidatedView && <SelectItem value="consolidated">Visão Consolidada</SelectItem>}
        {projects.map(project => (
          <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
