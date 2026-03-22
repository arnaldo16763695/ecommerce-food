import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { PersistedSidebarProvider } from "@/components/sidebar/persisted-sidebar-provider";

import {
  SidebarInset,
} from "@/components/ui/sidebar";

async function layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  if (!session?.user) {
    redirect("/admin/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/");
  }

  return (
    <>
      <PersistedSidebarProvider>
        <AppSidebar />
        <SidebarInset>
          {children}
        </SidebarInset>
      </PersistedSidebarProvider>
    </>
  );
}

export default layout;
