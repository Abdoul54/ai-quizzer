'use client'

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
} from "@/components/ui/sidebar"
import { Nav } from "./nav"
import { ClipboardList } from "lucide-react"
import { User } from "./user"
import { Logo } from "./logo"


const nav = [
    {
        title: "Quizzes",
        url: "/quizzes",
        icon: ClipboardList,
    },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <a href="#">
                                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                                    <Logo className="w-5 h-5 stroke-white" />
                                </div>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-medium">AI Quizzer</span>
                                    <span className="truncate text-xs">IDEO</span>
                                </div>
                            </a>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>

            </SidebarHeader>
            <SidebarContent>
                <Nav nav={nav} />
            </SidebarContent>
            <SidebarFooter>
                <User />
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    )
}
