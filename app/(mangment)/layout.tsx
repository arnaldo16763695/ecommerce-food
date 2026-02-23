import { AppSidebar } from "@/components/sidebar/app-sidebar"

import {
  SidebarInset,
  SidebarProvider,

} from "@/components/ui/sidebar"

function layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
          {children}
      </SidebarInset>
    </SidebarProvider>
    </>
  );
}

export default layout;
