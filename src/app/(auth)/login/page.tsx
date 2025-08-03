
"use client";

import { useState, useEffect } from "react";
import { useRouter }from 'next/navigation';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import ForgotPasswordModal from "@/components/auth/forgot-password-modal";
import ResetPasswordModal from "@/components/auth/reset-password-modal";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
    const [isResetPasswordView, setIsResetPasswordView] = useState(false);
    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === "PASSWORD_RECOVERY") {
                setIsResetPasswordView(true);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);


    const handleLogin = async (event: React.FormEvent) => {
        event.preventDefault();
        setLoading(true);

        try {
            console.log('Tentando login para:', email);
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            console.log('Resposta da autenticação:', { authData, authError });

            if (authError) {
                throw authError;
            }

            if (authData.user) {
                console.log('Usuário autenticado, buscando perfil:', authData.user.id);
                const { data: userProfile, error: profileError } = await supabase
                    .from('users')
                    .select('role')
                    .eq('id', authData.user.id)
                    .single();

                console.log('Resposta do perfil:', { userProfile, profileError });

                if (profileError) {
                    await supabase.auth.signOut();
                    throw new Error(`Perfil de usuário não encontrado para o id ${authData.user.id}. Erro: ${profileError.message}`);
                }

                console.log('Redirecionando para o painel do role:', userProfile?.role);
                switch (userProfile?.role) {
                    case 'Admin':
                        router.push('/admin');
                        break;
                    case 'Gerente':
                        router.push('/dashboard');
                        break;
                    case 'Membro':
                        router.push('/member/my-tasks');
                        break;
                    default:
                        router.push('/login');
                        break;
                }
            } else {
                 throw new Error("Login bem-sucedido, mas nenhum usuário retornado.");
            }
        } catch (error: any) {
             console.error("Erro detalhado no handleLogin:", error);
             toast({
                title: "Erro de Login",
                description: error.message || "As credenciais fornecidas estão incorretas.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    }


  return (
    <>
      {isResetPasswordView ? (
        <ResetPasswordModal onPasswordUpdated={() => setIsResetPasswordView(false)} />
      ) : (
        <Card className="w-full max-w-sm">
          <form onSubmit={handleLogin}>
          <CardHeader>
            <CardTitle className="text-2xl">Login</CardTitle>
            <CardDescription>
              Digite seu email abaixo para fazer login em sua conta.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="m@example.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required 
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Senha</Label>
              <Input 
                id="password" 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
                />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button className="w-full" type="submit" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : "Entrar"}
            </Button>
            <div className="mt-4 text-center text-sm">
                <Button variant="link" type="button" onClick={() => setIsForgotModalOpen(true)} className="p-0">
                    Esqueceu sua senha?
                </Button>
            </div>
          </CardFooter>
          </form>
        </Card>
      )}
      <ForgotPasswordModal
          isOpen={isForgotModalOpen}
          onOpenChange={setIsForgotModalOpen}
        />
    </>
  );
}
