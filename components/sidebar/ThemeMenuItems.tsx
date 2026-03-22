// components/ThemeMenuItem.tsx
"use client"

import {
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { useTheme } from "next-themes"
import { Sun } from "lucide-react"

export function ThemeMenuItems() {
  const { setTheme } = useTheme()

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <Sun className=" h-4 w-4" />
        Tema
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <DropdownMenuItem onClick={() => setTheme("light")}>
          Claro
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          Oscuro
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          Sistema
        </DropdownMenuItem>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  )
}
