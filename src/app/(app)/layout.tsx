"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { ProjectsProvider } from '@/hooks/use-projects';
import { TasksProvider } from '@/hooks/use-tasks';
import { UsersProvider } from '@/hooks/use-users';
import { TableSettingsProvider } from '@/hooks/use-table-settings';
import { DashboardPreferencesProvider } from '@/hooks/use-dashboard-preferences';
import { supabase } from '@/lib/supabase';
import { Toaster } from "@/components/ui/toaster";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
      }
    };
    checkSession();
  }, [router]);

  return (
    <UsersProvider>
      <ProjectsProvider>
        <TasksProvider>
          <TableSettingsProvider>
            <DashboardPreferencesProvider>
              <div className="flex min-h-screen w-full flex-col bg-muted/40">
                <Sidebar />
                <div className="flex flex-col sm:pl-14 flex-1">
                  <Header />
                  <main className="flex flex-1 flex-col overflow-hidden">
                    {children}
                  </main>
                </div>
              </div>
              <Toaster />
            </DashboardPreferencesProvider>
          </TableSettingsProvider>
        </TasksProvider>
      </ProjectsProvider>
    </UsersProvider>
  );
}
