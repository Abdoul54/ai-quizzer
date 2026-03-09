"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, User, Mail } from "lucide-react";
import { UserInfo } from "@/types";

interface InfoStepProps {
    title: string;
    description?: string;
    onContinue: (info: UserInfo) => void;
}

export const InfoStep = ({ title, description, onContinue }: InfoStepProps) => {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");

    const isValid = name.trim().length > 0 && email.trim().includes("@");

    function handleSubmit() {
        if (!isValid) return;
        onContinue({ name: name.trim(), email: email.trim() });
    }

    function handleKeyDown(e: React.KeyboardEvent) {
        if (e.key === "Enter" && isValid) handleSubmit();
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen px-4 bg-background">
            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-10">
                <StepDot active />
                <StepLine />
                <StepDot />
                <StepLine />
                <StepDot />
            </div>

            {/* Header */}
            <div className="flex flex-col items-center gap-2 text-center mb-8 max-w-md">
                <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
                {description && (
                    <p className="text-sm text-muted-foreground">{description}</p>
                )}
            </div>

            {/* Card */}
            <Card className="w-full max-w-sm shadow-sm">
                <CardContent className="pt-6 flex flex-col gap-5">
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="name" className="flex items-center gap-1.5">
                            <User className="size-3.5 text-muted-foreground" />
                            Full name
                        </Label>
                        <Input
                            id="name"
                            autoFocus
                            placeholder="Jane Doe"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onKeyDown={handleKeyDown}
                            autoComplete="name"
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="email" className="flex items-center gap-1.5">
                            <Mail className="size-3.5 text-muted-foreground" />
                            Email
                        </Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="jane@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onKeyDown={handleKeyDown}
                            autoComplete="email"
                        />
                    </div>
                </CardContent>
            </Card>

            <Button
                className="mt-6 w-full max-w-sm gap-2"
                onClick={handleSubmit}
                disabled={!isValid}
            >
                Continue
                <ArrowRight className="size-4" />
            </Button>

            <p className="text-xs text-muted-foreground mt-4">
                Your info is only used to track your quiz results.
            </p>
        </div>
    );
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const StepDot = ({ active }: { active?: boolean }) => (
    <div className={`size-2.5 rounded-full transition-colors ${active ? "bg-primary" : "bg-border"}`} />
);

const StepLine = () => (
    <div className="w-10 h-px bg-border" />
);