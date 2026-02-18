"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Toggle } from "@/components/ui/toggle";
import { X } from "lucide-react";
import ReactMarkdown from "react-markdown";

const DIFFICULTIES = ["easy", "medium", "hard"] as const;
const QUESTION_TYPES = [
    { value: "true_false", label: "True / False" },
    { value: "single_choice", label: "Single Choice" },
    { value: "multiple_choice", label: "Multiple Choice" },
];

export default function Page() {
    const [documents, setDocuments] = useState<string[]>([]);
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    const [topic, setTopic] = useState("");
    const [questionCount, setQuestionCount] = useState(10);
    const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
    const [questionTypes, setQuestionTypes] = useState(["true_false", "single_choice", "multiple_choice"]);
    const [additionalPrompt, setAdditionalPrompt] = useState("");
    const [architecture, setArchitecture] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleUpload() {
        if (!file) return;
        setUploading(true);

        const form = new FormData();
        form.append("file", file);

        const res = await fetch("/api/upload", { method: "POST", body: form });
        const { id } = await res.json();

        setDocuments((prev) => [...prev, id]);
        setFile(null);
        setUploading(false);
    }

    const toggleType = (value: string) =>
        setQuestionTypes((prev) =>
            prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value]
        );

    const handleGenerate = async () => {
        setLoading(true);
        setArchitecture("");
        try {
            const res = await fetch("/api/architecture", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ documents, topic, questionCount, difficulty, questionTypes, additionalPrompt }),
            });
            if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
            const data = await res.json();
            setArchitecture(data.architecture);
        } catch (err) {
            alert(`Failed: ${err}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-row w-full max-w-full p-10 gap-6">
            <div className="flex flex-col gap-6">

                {/* Documents */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Documents</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                            <Input
                                type="file"
                                accept="application/pdf"
                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleUpload}
                                disabled={!file || uploading}
                            >
                                {uploading ? "Uploading..." : "Upload"}
                            </Button>
                        </div>

                        {documents.length > 0 && (
                            <div className="flex flex-col gap-1">
                                {documents.map((id) => (
                                    <div key={id} className="flex items-center justify-between">
                                        <span className="font-mono text-xs text-muted-foreground">{id}</span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-destructive"
                                            onClick={() => setDocuments((prev) => prev.filter((d) => d !== id))}
                                        >
                                            <X className="h-3 w-3" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Options */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Quiz Options</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-5">

                        <div className="flex flex-col gap-1.5">
                            <Label>Topic (optional)</Label>
                            <Input
                                placeholder="e.g. Gradient Descent"
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label>Questions — {questionCount}</Label>
                            <Slider
                                min={3}
                                max={30}
                                step={1}
                                value={[questionCount]}
                                onValueChange={([val]) => setQuestionCount(val)}
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <Label>Difficulty</Label>
                            <div className="flex gap-2">
                                {DIFFICULTIES.map((d) => (
                                    <Toggle
                                        key={d}
                                        pressed={difficulty === d}
                                        onPressedChange={() => setDifficulty(d)}
                                        variant="outline"
                                        size="sm"
                                        className="capitalize"
                                    >
                                        {d}
                                    </Toggle>
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <Label>Question Types</Label>
                            <div className="flex gap-2 flex-wrap">
                                {QUESTION_TYPES.map(({ value, label }) => (
                                    <Toggle
                                        key={value}
                                        pressed={questionTypes.includes(value)}
                                        onPressedChange={() => toggleType(value)}
                                        variant="outline"
                                        size="sm"
                                    >
                                        {label}
                                    </Toggle>
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <Label>Additional Instructions (optional)</Label>
                            <Textarea
                                placeholder="e.g. Focus on practical examples, avoid theory-heavy questions..."
                                rows={3}
                                value={additionalPrompt}
                                onChange={(e) => setAdditionalPrompt(e.target.value)}
                            />
                        </div>

                    </CardContent>
                </Card>

                <Button
                    onClick={handleGenerate}
                    disabled={loading || documents.length === 0}
                >
                    {loading ? "Generating..." : "Generate Architecture"}
                </Button>
            </div>

            {architecture && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Architecture</CardTitle>
                    </CardHeader>
                    <CardContent className=" overflow-y-auto h-[calc(100vh-200px)]">
                        <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground">
                            <ReactMarkdown>
                                {architecture}
                            </ReactMarkdown>
                        </div>
                    </CardContent>
                </Card>
            )}

        </div>
    );
}