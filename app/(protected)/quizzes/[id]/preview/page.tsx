'use client'

import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardTitle } from "@/components/ui/card"
import { Item, ItemHeader } from "@/components/ui/item"
import { useState } from "react"

const Page = () => {
    const questions = [
        {
            options: [
                { isCorrect: false, optionText: "To eliminate all computer viruses" },
                { isCorrect: true, optionText: "To protect data from unauthorized access and attacks" },
                { isCorrect: false, optionText: "To give access to as many users as possible" },
                { isCorrect: false, optionText: "To develop the fastest software solutions" },
            ],
            questionText: "What is a primary goal of cybersecurity?",
            questionType: "single_choice",
        },
        {
            options: [
                { isCorrect: true, optionText: "A potential for exploitation that can lead to a security breach" },
                { isCorrect: false, optionText: "An attack that causes damage to systems" },
                { isCorrect: false, optionText: "A measure taken to protect information assets" },
                { isCorrect: false, optionText: "A well-defined security policy" },
            ],
            questionText: "Which of the following defines a vulnerability in cybersecurity?",
            questionType: "single_choice",
        },
        {
            options: [
                { isCorrect: true, optionText: "Confidentiality" },
                { isCorrect: true, optionText: "Integrity" },
                { isCorrect: true, optionText: "Availability" },
                { isCorrect: false, optionText: "Authentication" },
            ],
            questionText: "The CIA triad in cybersecurity stands for which of the following principles?",
            questionType: "multiple_choice",
        },
        {
            options: [
                { isCorrect: true, optionText: "Malware" },
                { isCorrect: true, optionText: "Phishing" },
                { isCorrect: false, optionText: "Software updates" },
                { isCorrect: false, optionText: "User accounts" },
            ],
            questionText: "Which of the following is considered a common threat in cybersecurity?",
            questionType: "multiple_choice",
        },
        {
            options: [
                { isCorrect: false, optionText: "The effectiveness of antivirus solutions" },
                { isCorrect: true, optionText: "The potential impact of threats on an organization's assets" },
                { isCorrect: false, optionText: "The speed of network connections" },
                { isCorrect: false, optionText: "The cost of hardware upgrades" },
            ],
            questionText: "What does a risk assessment methodology typically evaluate?",
            questionType: "single_choice",
        },
        {
            options: [
                { isCorrect: true, optionText: "Regular software updates" },
                { isCorrect: true, optionText: "User training and awareness programs" },
                { isCorrect: false, optionText: "Ignoring feedback from security audits" },
                { isCorrect: false, optionText: "Delaying password changes" },
            ],
            questionText: "Which of the following best practices can reduce security vulnerabilities?",
            questionType: "multiple_choice",
        },
        {
            options: [
                { isCorrect: false, optionText: "To allow unrestricted access to data" },
                { isCorrect: true, optionText: "To provide a framework for protecting information assets" },
                { isCorrect: false, optionText: "To ensure compliance with hardware standards" },
                { isCorrect: false, optionText: "To reduce the number of devices in use" },
            ],
            questionText: "What is the importance of security policies in an organization?",
            questionType: "single_choice",
        },
        {
            options: [
                { isCorrect: false, optionText: "It helps users become programmers" },
                { isCorrect: true, optionText: "It minimizes the risk of human error leading to security breaches" },
                { isCorrect: false, optionText: "It guarantees the absence of all security threats" },
                { isCorrect: false, optionText: "It takes the burden off IT teams completely" },
            ],
            questionText: "Why is user education critical in cybersecurity?",
            questionType: "single_choice",
        },
        {
            options: [
                { isCorrect: true, optionText: "Definition of incident types" },
                { isCorrect: true, optionText: "Communication strategies during an incident" },
                { isCorrect: false, optionText: "Minimizing budget allocations" },
                { isCorrect: false, optionText: "Ignoring past incidents" },
            ],
            questionText: "Which of the following elements is critical in incident response planning?",
            questionType: "multiple_choice",
        },
        {
            options: [
                { isCorrect: false, optionText: "A single layer of security for networks" },
                { isCorrect: true, optionText: "Multiple layers of security controls to protect information systems" },
                { isCorrect: false, optionText: "Using only firewalls for protection" },
                { isCorrect: false, optionText: "The complete elimination of all threats" },
            ],
            questionText: "What does 'defense-in-depth' refer to in cybersecurity?",
            questionType: "single_choice",
        },
    ]

    const [current, setCurrent] = useState(0)
    const [answers, setAnswers] = useState<Record<number, string[]>>({})
    const [submitted, setSubmitted] = useState(false)

    const q = questions[current]
    const total = questions.length
    const selected = answers[current] ?? []
    const hasAnswer = selected.length > 0
    const isLast = current === total - 1

    function handleSelect(optionText: string) {
        if (submitted) return
        setAnswers((prev) => {
            const current_sel = prev[current] ?? []
            if (q.questionType === "single_choice") {
                return { ...prev, [current]: [optionText] }
            }
            const next = current_sel.includes(optionText)
                ? current_sel.filter((o) => o !== optionText)
                : [...current_sel, optionText]
            return { ...prev, [current]: next }
        })
    }

    function calcScore() {
        return questions.reduce((acc, q, i) => {
            const sel = answers[i] ?? []
            const correct = q.options.filter((o) => o.isCorrect).map((o) => o.optionText)
            const isCorrect = correct.length === sel.length && correct.every((c) => sel.includes(c))
            return acc + (isCorrect ? 1 : 0)
        }, 0)
    }

    if (submitted) {
        const score = calcScore()
        return (
            <div className="flex flex-col justify-center h-full">
                <div className="h-full w-full px-4">
                    <h1 className="text-3xl font-bold text-gray-900 mb-6">Results</h1>
                    <Card>
                        <CardContent>
                            <p className="text-4xl font-bold">{score} / {total}</p>
                            <p className="text-muted-foreground text-sm mt-1">
                                {score === total ? "Perfect score!" : score >= total * 0.7 ? "Well done!" : "Keep practicing."}
                            </p>
                            <Button
                                onClick={() => { setAnswers({}); setCurrent(0); setSubmitted(false) }}
                            >
                                Retry
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col justify-center h-full max-w-full">
            <div className="flex items-center justify-center w-full">
                <Card className="w-4xl">
                    <CardContent>
                        <CardTitle>{q.questionText}</CardTitle>
                        <CardDescription>
                            {q.questionType === "true_false" && "True/False"}
                            {q.questionType === "single_choice" && "Single choice"}
                            {q.questionType === "multiple_choice" && "Multiple choice"}
                        </CardDescription>
                        <div className="flex flex-col gap-2 mt-4">
                            {q.options.map((o) => {
                                const isSelected = selected.includes(o.optionText)
                                return (
                                    <Item
                                        key={o.optionText}
                                        variant="outline"
                                        onClick={() => handleSelect(o.optionText)}
                                        data-selected={isSelected}
                                        className="data-[selected=true]:bg-info/20 data-[selected=true]:text-info data-[selected=true]:border-info cursor-pointer"
                                    >
                                        <ItemHeader>{o.optionText}</ItemHeader>
                                    </Item>
                                )
                            })}
                        </div>
                        <CardAction className="mt-4 flex justify-between items-center w-full">
                            <Button
                                onClick={() => setCurrent((c) => c - 1)}
                                disabled={current === 0}
                                variant="outline"
                            >
                                Back
                            </Button>
                            {isLast ? (
                                <Button
                                    disabled={!hasAnswer}
                                    onClick={() => setSubmitted(true)}
                                >
                                    Submit
                                </Button>
                            ) : (
                                <Button
                                    disabled={!hasAnswer}
                                    onClick={() => setCurrent((c) => c + 1)}
                                >
                                    Next
                                </Button>
                            )}
                        </CardAction>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

export default Page