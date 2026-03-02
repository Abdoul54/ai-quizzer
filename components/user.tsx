"use client"

import {
    ChevronsUpDown,
    LogOut,
    Settings,
    User2,
} from "lucide-react"

import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar"
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
import { useRouter } from "next/navigation"
import { signOut, useSession } from "@/lib/auth-client"
import { useState } from "react"
import { toast } from "sonner"
import { useUILanguage } from "@/providers/ui-language-provider"

export function User() {
    const { isMobile } = useSidebar()
    const router = useRouter()
    const { t } = useUILanguage()

    const { data, isPending } = useSession()

    const [loading, setLoading] = useState(false);

    async function handleSignOut(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);

        const { error } = await signOut();

        if (error) {
            console.error(error.message ?? "Sign-out failed");
            toast.error(error.message ?? "Sign-out failed");
            setLoading(false);
        } else {
            router.push("/login");
        }
    }

    const initials = data?.user?.name
        ?.trim()
        .split(/\s+/)
        .map(word => word[0])
        .slice(0, 2)
        .join('')
        .toUpperCase() || '';

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                {isPending ? (
                    <SidebarMenuButton
                        size="lg"
                        className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                    >
                        <Avatar className="h-8 w-8 bg-accent animate-pulse rounded-md">
                            <AvatarFallback className="rounded-lg bg-primary">
                                <User2 className="size-4 stroke-primary-foreground" />
                            </AvatarFallback>
                        </Avatar>
                    </SidebarMenuButton>
                ) : (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <SidebarMenuButton
                                size="lg"
                                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                            >
                                <Avatar className="h-8 w-8 rounded-lg">
                                    <AvatarImage src={data?.user?.image || ""} alt={data?.user?.name} />
                                    <AvatarFallback className="rounded-lg bg-primary text-primary-foreground">
                                        <span>{initials ?? <User2 className="size-4" />}</span>
                                    </AvatarFallback>
                                </Avatar>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-medium">{data?.user?.name}</span>
                                    <span className="truncate text-xs text-muted-foreground">{data?.user?.email}</span>
                                </div>
                                <ChevronsUpDown className="ms-auto size-4" />
                            </SidebarMenuButton>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                            side={isMobile ? "bottom" : "right"}
                            align="end"
                            sideOffset={4}
                        >
                            <DropdownMenuLabel className="p-0 font-normal">
                                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                                    <Avatar className="h-8 w-8 rounded-lg">
                                        <AvatarImage src={data?.user?.image || ""} alt={data?.user?.name} />
                                        <AvatarFallback className="rounded-lg bg-primary text-primary-foreground">
                                            <span>{initials ?? <User2 className="size-4" />}</span>
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="grid flex-1 text-left text-sm leading-tight">
                                        <span className="truncate font-medium">{data?.user?.name}</span>
                                        <span className="truncate text-xs text-muted-foreground">{data?.user?.email}</span>
                                    </div>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuGroup>
                                <DropdownMenuItem onClick={() => router.push("/profile")}>
                                    <Settings className="me-2 size-4" />
                                    {t("user.profile")}
                                </DropdownMenuItem>
                            </DropdownMenuGroup>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleSignOut} disabled={loading}>
                                <LogOut className="me-2 size-4" />
                                {t("user.signOut")}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </SidebarMenuItem>
        </SidebarMenu>
    )
}