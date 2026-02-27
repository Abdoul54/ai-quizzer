"use client"

import { Globe } from "lucide-react"
import { Avatar, AvatarFallback, } from "@/components/ui/avatar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from "@/components/ui/sidebar"
import { useUILanguage } from "@/providers/ui-language-provider"
import { getLanguageLabel, languages } from "@/lib/languages"

export function Language() {
    const { isMobile } = useSidebar()
    const { t, lang } = useUILanguage()


    const language = getLanguageLabel(lang, lang)

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                        >
                            <Avatar className="h-8 w-8 rounded-lg">
                                <AvatarFallback className="rounded-lg">
                                    <Globe className="size-4" />
                                </AvatarFallback>
                            </Avatar>
                            <div dir="rtl" className="font-medium">
                                {language}
                            </div>
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                        side={isMobile ? "bottom" : "right"}
                        align="end"
                        sideOffset={4}
                    >
                        <DropdownMenuLabel>
                            Languages
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                            {
                                languages?.map(language => (
                                    <DropdownMenuItem
                                        key={language?.code}
                                        data-active={language?.code === lang}
                                        onClick={() => console.log}
                                        className="data-[active=true]:bg-accent data-[active=true]:text-accent-foreground data-[active=true]:font-bold"
                                    >
                                        {getLanguageLabel(language?.code, lang)}
                                    </DropdownMenuItem>
                                ))
                            }
                        </DropdownMenuGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    )
}