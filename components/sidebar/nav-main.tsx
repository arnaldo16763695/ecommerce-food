"use client"

import * as React from "react"
import { ChevronRight, type LucideIcon } from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"

const NAV_MAIN_OPEN_STATE_KEY = "admin_nav_main_open_state"

type NavMainItem = {
  title: string
  url: string
  icon?: LucideIcon
  isActive?: boolean
  items?: {
    title: string
    url: string
  }[]
}

function buildNavMainItemKey(item: NavMainItem) {
  return `${item.title}::${item.url}`
}

export function NavMain({
  items,
}: {
  items: NavMainItem[]
}) {
  const [openStateByKey, setOpenStateByKey] = React.useState<Record<string, boolean>>({})

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(NAV_MAIN_OPEN_STATE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as Record<string, boolean>
      if (parsed && typeof parsed === "object") {
        setOpenStateByKey(parsed)
      }
    } catch {
      // Ignore malformed localStorage values.
    }
  }, [])

  const handleOpenChange = React.useCallback((itemKey: string, nextOpen: boolean) => {
    setOpenStateByKey((prev) => {
      const next = { ...prev, [itemKey]: nextOpen }
      try {
        window.localStorage.setItem(NAV_MAIN_OPEN_STATE_KEY, JSON.stringify(next))
      } catch {
        // Ignore localStorage access errors.
      }
      return next
    })
  }, [])

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Panel</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const itemKey = buildNavMainItemKey(item)
          const isOpen = openStateByKey[itemKey] ?? Boolean(item.isActive)

          return (
          <Collapsible
            key={item.title}
            asChild
            open={isOpen}
            onOpenChange={(nextOpen) => handleOpenChange(itemKey, nextOpen)}
            className="group/collapsible"
          >
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton tooltip={item.title}>
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                  <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub>
                  {item.items?.map((subItem) => (
                    <SidebarMenuSubItem key={subItem.title}>
                      <SidebarMenuSubButton asChild>
                        <a href={subItem.url}>
                          <span>{subItem.title}</span>
                        </a>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </CollapsibleContent>
            </SidebarMenuItem>
          </Collapsible>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
