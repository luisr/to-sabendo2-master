
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BrainCircuit,
  Calendar,
  ClipboardList,
  KanbanSquare,
  LayoutDashboard,
  Package2,
  Settings,
  Book,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const navItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Painel" },
    { href: "/projects", icon: KanbanSquare, label: "Projetos" },
    { href: "/my-tasks", icon: ClipboardList, label: "Minhas Tarefas" },
    { href: "/backlog", icon: Book, label: "Backlog" },
    { href: "/calendar", icon: Calendar, label: "Calendário" },
    { href: "/ai-tools", icon: BrainCircuit, label: "Ferramentas de IA" },
]

export default function AppSidebar() {
  const pathname = usePathname();
  
  const checkActive = (href: string) => {
    if (href === '/dashboard') {
        return pathname === href;
    }
    return pathname.startsWith(href);
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-10 hidden w-14 flex-col border-r bg-background sm:flex">
      <TooltipProvider>
        <nav className="flex flex-col items-center gap-4 px-2 sm:py-5">
          <Link
            href="/dashboard"
            className="group flex h-9 w-9 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:h-8 md:w-8 md:text-base"
          >
            <Package2 className="h-5 w-5 transition-all group-hover:scale-110" />
            <span className="sr-only">To Sabendo</span>
          </Link>
          {navItems.map((item) => (
             <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                <Link
                    href={item.href}
                    className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:text-foreground md:h-8 md:w-8 ${checkActive(item.href) ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}
                >
                    <item.icon className="h-5 w-5" />
                    <span className="sr-only">{item.label}</span>
                </Link>
                </TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          ))}
        </nav>
        <nav className="mt-auto flex flex-col items-center gap-4 px-2 sm:py-5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/settings"
                className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:text-foreground md:h-8 md:w-8 ${checkActive('/settings') ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}
              >
                <Settings className="h-5 w-5" />
                <span className="sr-only">Configurações</span>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">Configurações</TooltipContent>
          </Tooltip>
        </nav>
      </TooltipProvider>
    </aside>
  );
}
