"use client";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface ChangeHistoryModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (reason: string) => void;
}

export default function ChangeHistoryModal({ isOpen, onOpenChange, onSave }: ChangeHistoryModalProps) {
  const [reason, setReason] = useState("");
  const { toast } = useToast();

  const handleSave = () => {
    if (!reason.trim()) {
      toast({
        title: "Justificativa Obrigatória",
        description: "Por favor, descreva o motivo da alteração nas datas.",
        variant: "destructive",
      });
      return;
    }
    onSave(reason);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Alteração no Cronograma</DialogTitle>
          <DialogDescription>
            As datas de início ou fim foram alteradas. Por favor, forneça uma justificativa para esta mudança.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="reason">Justificativa da Mudança</Label>
          <Textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex: Adiantamento devido à conclusão da fase de design."
            className="mt-2"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave}>Salvar Alteração e Registrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
