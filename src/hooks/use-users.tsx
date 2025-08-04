"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import type { User } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface UsersContextType {
  user: User | null;
  users: User[];
  loading: boolean;
  refetchUsers: () => void;
  updateUser: (userId: string, updates: Partial<User>) => Promise<boolean>;
  deleteUser: (userId: string) => Promise<boolean>;
}

const UsersContext = createContext<UsersContextType | undefined>(undefined);

export const UsersProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { toast } = useToast();

  const fetchUsers = useCallback(async () => {
    const { data, error } = await supabase.rpc("get_all_users");
    if (error) {
      console.error("Error fetching users:", error);
      toast({ title: "Erro ao carregar usuários", description: error.message, variant: "destructive" });
      setUsers([]);
    } else {
      setUsers(data || []);
    }
  }, [toast]);

  const fetchCurrentUser = useCallback(async (sessionUser: any) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", sessionUser.id)
      .single();

    if (error) {
      console.error("Error fetching current user profile:", error);
      setUser(null);
    } else {
      setUser(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUsers();
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchCurrentUser(session.user);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchCurrentUser(session.user);
      } else {
        setLoading(false);
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [fetchUsers, fetchCurrentUser]);

  const updateUser = async (userId: string, updates: Partial<User>): Promise<boolean> => {
    const { error } = await supabase.from('profiles').update(updates).eq('id', userId);
    if (error) {
        toast({ title: "Erro ao atualizar usuário", description: error.message, variant: "destructive" });
        return false;
    }
    toast({ title: "Usuário atualizado com sucesso!" });
    await fetchUsers();
    if (user?.id === userId) {
      const { data: sessionData } = await supabase.auth.getSession();
      if(sessionData.session?.user) {
        await fetchCurrentUser(sessionData.session.user);
      }
    }
    return true;
  };

  const deleteUser = async (userId: string): Promise<boolean> => {
    const { error: functionError } = await supabase.functions.invoke('delete-user', {
        body: { userId },
    });
    if (functionError) {
        toast({ title: "Erro ao excluir usuário", description: functionError.message, variant: "destructive" });
        return false;
    }
    toast({ title: "Usuário excluído com sucesso!" });
    fetchUsers();
    return true;
  };

  const contextValue = { user, users, loading, refetchUsers: fetchUsers, updateUser, deleteUser };

  return (
    <UsersContext.Provider value={contextValue}>
      {children}
    </UsersContext.Provider>
  );
};

export const useUsers = () => {
  const context = useContext(UsersContext);
  if (context === undefined) {
    throw new Error("useUsers must be used within a UsersProvider");
  }
  return context;
};
