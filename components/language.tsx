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
import { getLanguageLabel, LanguageCode, languages } from "@/lib/languages"
import { updateUser } from "@/lib/auth-client"

export function Language() {
    const { isMobile } = useSidebar()
    const { t, lang } = useUILanguage()

    const changeLanguage = async (lang: LanguageCode) => {
        await updateUser({ language: lang });
        window.location.reload();
    };

    const language = getLanguageLabel(lang, lang)

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground rounded-diagonal"
                        >
                            <Avatar className="h-8 w-8 rounded-diagonal">
                                <AvatarFallback className="rounded-diagonal">
                                    <Globe className="size-4 stroke-primary" />
                                </AvatarFallback>
                            </Avatar>
                            <div className="font-semibold">
                                {language}
                            </div>
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-diagonal"
                        side={isMobile ? "bottom" : "right"}
                        align="end"
                        sideOffset={4}
                    >
                        <DropdownMenuLabel>
                            {t('languages.label')}
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                            {
                                languages?.map(language => (
                                    <DropdownMenuItem
                                        key={language?.code}
                                        data-active={language?.code === lang}
                                        onClick={() => changeLanguage(language?.code)}
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