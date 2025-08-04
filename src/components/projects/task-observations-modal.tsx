"use client";
import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Paperclip, Send, Trash2, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Task, Observation, User } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useUsers } from "@/hooks/use-users";

interface ObservationItemProps {
    // A observação agora contém os dados do utilizador diretamente
    observation: Observation; 
    currentUser: User | null;
    onDelete: (id: string) => void;
}

const ObservationItem = ({ observation, currentUser, onDelete }: ObservationItemProps) => (
    <div className="flex items-start gap-4 p-4 border-b">
        <Avatar>
            {/* Usa os campos denormalizados */}
            <AvatarImage src={observation.user_avatar_url || undefined} />
            <AvatarFallback>{observation.user_name?.charAt(0) || 'U'}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
            <div className="flex justify-between items-center">
                {/* Usa os campos denormalizados */}
                <p className="font-semibold">{observation.user_name}</p>
                <span className="text-xs text-muted-foreground">
                    {new Date(observation.created_at).toLocaleString()}
                </span>
            </div>
            {observation.content && <p className="mt-1">{observation.content}</p>}
            {observation.file_url && (
                <a href={observation.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline mt-2 inline-block">
                    Ver Anexo
                </a>
            )}
        </div>
        {currentUser?.id === observation.user_id && (
            <Button variant="ghost" size="icon" onClick={() => onDelete(observation.id)}>
                <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
        )}
    </div>
);


interface TaskObservationsModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    task: Task | null;
}

export default function TaskObservationsModal({ isOpen, onOpenChange, task }: TaskObservationsModalProps) {
    const { toast } = useToast();
    const { user } = useUsers();
    const [observations, setObservations] = useState<Observation[]>([]);
    const [newObservation, setNewObservation] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchObservations = async () => {
        if (!task) return;
        setLoading(true);
        // CORREÇÃO: Fazer uma consulta simples e direta, sem RPC.
        const { data, error } = await supabase
            .from('task_observations')
            .select('*')
            .eq('task_id', task.id)
            .order('created_at', { ascending: false });

        if (error) {
            toast({ title: "Erro ao buscar observações", description: error.message, variant: "destructive" });
        } else if (data) {
            setObservations(data as Observation[]);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (isOpen && task) {
            fetchObservations();
        } else {
            setObservations([]);
            setNewObservation("");
            setFile(null);
        }
    }, [isOpen, task]);
    
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files?.[0]) setFile(event.target.files[0]);
    };

    const handleDelete = async (observationId: string) => {
        const { error } = await supabase.from('task_observations').delete().eq('id', observationId);
        if (error) {
            toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
        } else {
            setObservations(prev => prev.filter(obs => obs.id !== observationId));
            toast({ title: "Observação excluída com sucesso" });
        }
    };
    
    const handleSubmit = async () => {
        if (!task || (!newObservation.trim() && !file) || !user) return;
        setIsSubmitting(true);
        let fileUrl: string | null = null;

        if (file) {
            const filePath = `public/tasks/${task.id}/${Date.now()}-${file.name}`;
            const { error: uploadError } = await supabase.storage.from('tosabendo2').upload(filePath, file);
            
            if (uploadError) {
                toast({ title: "Erro de Upload", description: uploadError.message, variant: "destructive" });
                setIsSubmitting(false); return;
            }

            const { data } = await supabase.storage.from('tosabendo2').createSignedUrl(filePath, 60 * 60 * 24 * 365 * 10); // URL válida por 10 anos
            if (data?.signedUrl) {
                fileUrl = data.signedUrl;
            }
        }

        // CORREÇÃO: Salvar os dados do utilizador diretamente na observação.
        const { error: insertError } = await supabase.from('task_observations').insert({ 
            task_id: task.id, 
            user_id: user.id, 
            content: newObservation.trim() || null, 
            file_url: fileUrl,
            user_name: user.name, // Salvar o nome
            user_avatar_url: user.avatar_url // Salvar o avatar
        });

        if (insertError) {
            toast({ title: "Erro ao salvar", description: insertError.message, variant: "destructive" });
        } else {
            await fetchObservations(); 
            setNewObservation("");
            setFile(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
            toast({ title: "Observação adicionada com sucesso" });
        }
        setIsSubmitting(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Observações da Tarefa</DialogTitle>
                    <DialogDescription>{task ? task.name : 'Carregando...'}</DialogDescription>
                </DialogHeader>
                
                {!task ? (
                    <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin" /></div>
                ) : (
                    <>
                        <div className="mt-4">
                            <Textarea
                                placeholder="Adicione uma nova observação..."
                                value={newObservation}
                                onChange={(e) => setNewObservation(e.target.value)}
                                rows={3}
                            />
                            <div className="flex justify-between items-center mt-2">
                                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                                    <Paperclip className="h-4 w-4 mr-2" />
                                    Anexar
                                </Button>
                                <Input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                                <Button onClick={handleSubmit} disabled={isSubmitting}>
                                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                    <span className="ml-2">Enviar</span>
                                </Button>
                            </div>
                            {file && <p className="text-sm text-muted-foreground mt-2">Arquivo selecionado: {file.name}</p>}
                        </div>

                        <ScrollArea className="h-80 mt-4 border-t">
                            {loading ? (
                                <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>
                            ) : observations.length > 0 ? (
                                observations.map(obs => (
                                    <ObservationItem key={obs.id} observation={obs} currentUser={user} onDelete={handleDelete} />
                                ))
                            ) : (
                                <p className="text-center text-muted-foreground p-8">Nenhuma observação encontrada.</p>
                            )}
                        </ScrollArea>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
