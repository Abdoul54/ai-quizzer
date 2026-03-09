"use client"

import {
    type LucideIcon,
} from "lucide-react"

import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar"
import { usePathname, useRouter } from "next/navigation"

export function Nav({
    nav,
    groupLabel = "Platform",
}: {
    nav: {
        title: string
        url: string
        icon?: LucideIcon
        isActive?: boolean
    }[]
    groupLabel?: string
}) {
    const pathname = usePathname()
    const router = useRouter()

    return (
        <SidebarGroup>
            <SidebarGroupLabel>{groupLabel}</SidebarGroupLabel>
            <SidebarMenu>
                {nav.map((item, idx) => (
                    <SidebarMenuItem key={idx}>
                        <SidebarMenuButton
                            isActive={item.url === pathname}
                            tooltip={item.title} onClick={() => {
                                router.push(item.url)
                            }}
                            className="rounded-diagonal data-[active=true]:bg-secondary data-[active=true]:text-secondary-foreground"
                        >
                            {item.icon && <item.icon />}
                            <span>{item.title}</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                ))}
            </SidebarMenu>
        </SidebarGroup>
    )
}