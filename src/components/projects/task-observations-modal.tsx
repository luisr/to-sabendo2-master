"use client";
import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Paperclip, Send, Trash2, Loader2 } from "lucide-react";
import type { Task, Observation, User } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useUsers } from "@/hooks/use-users";

// ... (Componente ObservationItem)

export default function TaskObservationsModal({ isOpen, onOpenChange, task }: any) {
    const { toast } = useToast();
    const { user } = useUsers();
    const [observations, setObservations] = useState<Observation[]>([]);
    const [newObservation, setNewObservation] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchObservations = async () => {
        // ... (lógica de busca)
    };

    useEffect(() => {
        if (isOpen) fetchObservations();
    }, [isOpen, task]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files?.[0]) setFile(event.target.files[0]);
    };

    const handleDelete = async (observationId: string) => {
        // ... (lógica de exclusão)
    };

    const handleSubmit = async () => {
        if (!task || (!newObservation.trim() && !file) || !user) return;
        setIsSubmitting(true);
        let fileUrl = null;

        if (file) {
            const filePath = `public/tasks/${task.id}/${Date.now()}-${file.name}`;
            // **CORREÇÃO: Usando o nome correto do bucket**
            const { error: uploadError } = await supabase.storage.from('tosabendo2').upload(filePath, file);
            
            if (uploadError) {
                toast({ title: "Erro de Upload", description: uploadError.message, variant: "destructive" });
                setIsSubmitting(false); return;
            }
            // **CORREÇÃO: Usando o nome correto do bucket**
            const { data } = supabase.storage.from('tosabendo2').getPublicUrl(filePath);
            fileUrl = data.publicUrl;
        }

        const { data: newObsData, error: insertError } = await supabase.from('task_observations').insert({ task_id: task.id, user_id: user.id, content: newObservation.trim() || null, file_url: fileUrl }).select().single();

        if (insertError) {
            toast({ title: "Erro ao salvar", description: insertError.message, variant: "destructive" });
        } else if (newObsData) {
            await fetchObservations(); 
            setNewObservation("");
            setFile(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
        setIsSubmitting(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
           {/* ... (conteúdo do modal) */}
        </Dialog>
    );
}
