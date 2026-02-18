"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient, useSession } from "@/lib/auth-client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, CheckCircle2 } from "lucide-react";

// ─── Supported languages ──────────────────────────────────────────────────────
const LANGUAGES = [
    { value: "en", label: "English" },
    { value: "fr", label: "Français" },
    { value: "ar", label: "العربية" },
    { value: "es", label: "Español" },
    { value: "de", label: "Deutsch" },
];

export default function Page() {
    const router = useRouter();
    const { data: session, isPending } = useSession();

    const [name, setName] = useState("");
    const [language, setLanguage] = useState("en");
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");

    const [infoStatus, setInfoStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [infoError, setInfoError] = useState<string | null>(null);

    const [passwordStatus, setPasswordStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [passwordError, setPasswordError] = useState<string | null>(null);

    // Seed form from session once loaded
    useEffect(() => {
        if (session?.user) {
            setName(session.user.name ?? "");
            setLanguage((session.user as any).language ?? "en");
        }
    }, [session]);

    // ── Update name + language ────────────────────────────────────────────────
    async function handleInfoSubmit(e: React.FormEvent) {
        e.preventDefault();
        setInfoStatus("loading");
        setInfoError(null);

        const { error } = await authClient.updateUser({ name, language } as any);

        if (error) {
            setInfoError(error.message ?? "Failed to update profile.");
            setInfoStatus("error");
        } else {
            setInfoStatus("success");
            setTimeout(() => setInfoStatus("idle"), 3000);
        }
    }

    // ── Change password ───────────────────────────────────────────────────────
    async function handlePasswordSubmit(e: React.FormEvent) {
        e.preventDefault();
        setPasswordStatus("loading");
        setPasswordError(null);

        const { error } = await authClient.changePassword({
            currentPassword,
            newPassword,
            revokeOtherSessions: true,
        });

        if (error) {
            setPasswordError(error.message ?? "Failed to change password.");
            setPasswordStatus("error");
        } else {
            setPasswordStatus("success");
            setCurrentPassword("");
            setNewPassword("");
            setTimeout(() => setPasswordStatus("idle"), 3000);
        }
    }

    if (isPending) {
        return (
            <div className="flex min-h-full items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const user = session?.user;
    const initials = user?.name
        ?.split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

    return (
        <main className="flex min-h-full flex-col gap-8 p-4">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 rounded-md">
                    <AvatarImage src={user?.image ?? undefined} alt={user?.name ?? ""} />
                    <AvatarFallback className="text-lg rounded-md">{initials}</AvatarFallback>
                </Avatar>
                <div>
                    <h1 className="text-2xl font-bold">{user?.name}</h1>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-2">

                {/* Profile info */}
                <Card>
                    <CardHeader>
                        <CardTitle>Profile</CardTitle>
                        <CardDescription>Update your name and preferred language.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleInfoSubmit} className="space-y-4">
                            {infoStatus === "error" && (
                                <Alert variant="destructive">
                                    <AlertDescription>{infoError}</AlertDescription>
                                </Alert>
                            )}
                            {infoStatus === "success" && (
                                <Alert>
                                    <CheckCircle2 className="h-4 w-4" />
                                    <AlertDescription>Profile updated successfully.</AlertDescription>
                                </Alert>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="name">Full name</Label>
                                <Input
                                    id="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    value={user?.email ?? ""}
                                    disabled
                                    className="cursor-not-allowed opacity-60"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Email cannot be changed here.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="language">Language</Label>
                                <Select value={language} onValueChange={setLanguage}>
                                    <SelectTrigger id="language">
                                        <SelectValue placeholder="Select a language" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {LANGUAGES.map((l) => (
                                            <SelectItem key={l.value} value={l.value}>
                                                {l.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button type="submit" disabled={infoStatus === "loading"}>
                                {infoStatus === "loading" && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                Save changes
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Change password */}
                <Card>
                    <CardHeader>
                        <CardTitle>Password</CardTitle>
                        <CardDescription>
                            Choose a strong password. Other sessions will be signed out.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handlePasswordSubmit} className="space-y-4">
                            {passwordStatus === "error" && (
                                <Alert variant="destructive">
                                    <AlertDescription>{passwordError}</AlertDescription>
                                </Alert>
                            )}
                            {passwordStatus === "success" && (
                                <Alert>
                                    <CheckCircle2 className="h-4 w-4" />
                                    <AlertDescription>Password changed successfully.</AlertDescription>
                                </Alert>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="current-password">Current password</Label>
                                <Input
                                    id="current-password"
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    required
                                    autoComplete="current-password"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="new-password">New password</Label>
                                <Input
                                    id="new-password"
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                    minLength={8}
                                    autoComplete="new-password"
                                />
                                <p className="text-xs text-muted-foreground">At least 8 characters.</p>
                            </div>

                            <Button type="submit" disabled={passwordStatus === "loading"}>
                                {passwordStatus === "loading" && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                Change password
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}