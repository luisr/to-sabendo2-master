
"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SetBaselineModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string) => void;
}

export default function SetBaselineModal({ isOpen, onOpenChange, onSave }: SetBaselineModalProps) {
    const [name, setName] = useState("");

    useEffect(() => {
        if (isOpen) {
            // Reset name when modal opens
            setName(`Linha de Base - ${new Date().toLocaleDateString('pt-BR')}`);
        }
    }, [isOpen]);

    const handleSubmit = () => {
        if (name.trim()) {
            onSave(name.trim());
            onOpenChange(false);
        }
    };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Definir Nova Linha de Base</DialogTitle>
          <DialogDescription>
            Uma linha de base é uma "fotografia" do estado atual do cronograma do seu projeto. Dê um nome para esta fotografia para referência futura.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Nome</Label>
                <Input 
                    id="name" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    className="col-span-3" 
                />
            </div>
        </div>
        <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!name.trim()}>Salvar Linha de Base</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
