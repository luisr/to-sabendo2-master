
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Wand2, Pencil } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";

interface ProjectCreationChoiceModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onChoice: (choice: 'manual' | 'ai') => void;
}

export default function ProjectCreationChoiceModal({
  isOpen,
  onOpenChange,
  onChoice,
}: ProjectCreationChoiceModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Como você quer criar seu projeto?</DialogTitle>
          <DialogDescription>
            Escolha entre começar do zero ou usar nosso assistente de IA.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <Card className="cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors" onClick={() => onChoice('manual')}>
                <CardHeader className="items-center text-center">
                    <Pencil className="h-8 w-8 mb-2"/>
                    <CardTitle>Criação Manual</CardTitle>
                </CardHeader>
                <CardContent className="text-center text-sm">
                    Ideal para quem já tem um plano claro e quer total controle.
                </CardContent>
            </Card>
             <Card className="cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors" onClick={() => onChoice('ai')}>
                <CardHeader className="items-center text-center">
                    <Wand2 className="h-8 w-8 mb-2"/>
                    <CardTitle>Assistente de IA</CardTitle>
                </CardHeader>
                <CardContent className="text-center text-sm">
                    Deixe a IA sugerir tarefas e um cronograma para seu projeto.
                </CardContent>
            </Card>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
