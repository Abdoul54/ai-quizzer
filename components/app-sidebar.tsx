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
import { useUILanguage } from "@/providers/ui-language-provider"
import { Language } from "./language"


export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const { t, dir } = useUILanguage();

    const side = dir === 'rtl' ? 'right' : 'left'

    const nav = [
        {
            title: t("nav.quizzes"),
            url: "/quizzes",
            icon: ClipboardList,
        },
    ];

    return (
        <Sidebar collapsible="icon" side={side} {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <a href="#">
                                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                                    <Logo className="w-5 h-5 stroke-white" />
                                </div>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-medium">{t("app.name")}</span>
                                    <span className="truncate text-xs">IDEO</span>
                                </div>
                            </a>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                <Nav nav={nav} groupLabel={t("nav.platform")} />
            </SidebarContent>
            <SidebarFooter>
                <Language />
                <User />
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    )
}