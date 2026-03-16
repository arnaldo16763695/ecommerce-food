"use client";

import * as React from "react";
import { Bot, SquareTerminal } from "lucide-react";
import { useSession } from "next-auth/react";
import { NavMain } from "@/components/sidebar/nav-main";
import { NavUser } from "@/components/sidebar/nav-user";
import { TeamSwitcher } from "@/components/sidebar/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";

const navMain = [
  {
    title: "Administracion",
    url: "#",
    icon: SquareTerminal,
    isActive: true,
    items: [
      { title: "Usuarios", url: "/admin/users" },
      { title: "Productos", url: "/admin/products" },
      { title: "Categorias", url: "/admin/categories" },
      { title: "Grupos de opciones", url: "/admin/option-groups" },
      { title: "Tasa de cambio", url: "/admin/exchange-rates" },
      { title: "Reglas de delivery", url: "/admin/delivery-settings" },
      { title: "Auditoria", url: "/admin/audit" },
    ],
  },
  {
    title: "Pedidos",
    url: "#",
    icon: Bot,
    items: [{ title: "Pedidos", url: "/admin/orders" }],
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session } = useSession();

  const userName = session?.user?.name ?? "Usuario";
  const userEmail = session?.user?.email ?? "usuario@local";
  const userAvatar = session?.user?.image ?? "/avatars/arnaldo.jpg";

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={{ name: userName, email: userEmail, avatar: userAvatar }} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
