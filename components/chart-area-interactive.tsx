"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { useIsMobile } from "@/hooks/use-mobile"
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from "@/components/ui/chart"
import { UsageDataPoint, UsageRange, useUsage } from "@/hooks/api/use-usage"
import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Button } from "./ui/button"
import { RotateCw } from "lucide-react"
import { Spinner } from "./ui/spinner"

export const description = "An interactive area chart"

const chartConfig = {
    totalInputTokens: {
        label: "Input",
        color: "var(--chart-1)",
    },
    totalOutputTokens: {
        label: "Output",
        color: "var(--chart-2)",
    },
} satisfies ChartConfig

export function ChartAreaInteractive() {
    const isMobile = useIsMobile()
    const [timeRange, setTimeRange] = React.useState<UsageRange>("7d")
    const { data, refetch, isRefetching } = useUsage(timeRange)

    React.useEffect(() => {
        if (isMobile) setTimeRange("7d")
    }, [isMobile])

    function parseDate(value: string): Date {
        if (value.length === 13) return new Date(value + ":00:00") // "2025-03-06T14"
        if (value.length === 7) return new Date(value + "-01")     // "2025-03"
        return new Date(value)                                      // "2025-03-06"
    }

    const tickFormatter = (value: string) => {
        const date = parseDate(value)
        if (timeRange === "1d") return date.toLocaleTimeString("en-US", { hour: "numeric", hour12: true })
        if (timeRange === "7d") return date.toLocaleDateString("en-US", { weekday: "short" })
        if (timeRange === "1m") return date.toLocaleDateString("en-US", { day: "numeric" })
        if (timeRange === "1y") return date.toLocaleDateString("en-US", { month: "short" })
        return value
    }

    const labelFormatter = (value: string) => {
        const date = parseDate(value)
        if (timeRange === "1d") return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    }

    function generateFullRange(range: UsageRange, data: UsageDataPoint[]): UsageDataPoint[] {
        const now = new Date()

        const keyLength = range === "1y" ? 7 : range === "1d" ? 13 : 10
        const map = new Map(data.map((d) => [d.date.slice(0, keyLength), d]))
        const points: UsageDataPoint[] = []

        if (range === "7d") {
            for (let i = 6; i >= 0; i--) {
                const d = new Date(now)
                d.setDate(d.getDate() - i)
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
                points.push(map.get(key) ?? { date: key, totalInputTokens: 0, totalOutputTokens: 0 })
            }
        } else if (range === "1m") {
            const year = now.getFullYear()
            const month = now.getMonth()
            const daysInMonth = new Date(year, month + 1, 0).getDate()
            for (let day = 1; day <= daysInMonth; day++) {
                const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                points.push(map.get(key) ?? { date: key, totalInputTokens: 0, totalOutputTokens: 0 })
            }
        } else if (range === "1y") {
            const year = now.getFullYear()
            for (let month = 0; month < 12; month++) {
                const key = `${year}-${String(month + 1).padStart(2, "0")}`
                points.push(map.get(key) ?? { date: key, totalInputTokens: 0, totalOutputTokens: 0 })
            }
        } else if (range === "1d") {
            const today = new Date(now)
            today.setUTCHours(0, 0, 0, 0)
            for (let hour = 0; hour < 24; hour++) {
                const d = new Date(today)
                d.setUTCHours(hour)
                const key = d.toISOString().slice(0, 13) // "2025-03-06T14"
                points.push(map.get(key) ?? { date: d.toISOString(), totalInputTokens: 0, totalOutputTokens: 0 })
            }
        }

        return points
    }


    return (
        <Card className="@container/card rounded-tl-none rounded-br-none ">
            <CardHeader>
                <CardTitle>Token Usage</CardTitle>
                <CardDescription>
                    <span className="hidden @[540px]/card:block">
                        Input & output tokens over time
                    </span>
                    <span className="@[540px]/card:hidden">Token usage</span>
                </CardDescription>
                <CardAction className="flex items-center gap-2">
                    <Button size="icon-sm" onClick={() => refetch()} className="transition rounded-tr-none rounded-bl-none" >
                        {isRefetching ? <Spinner /> : <RotateCw />}
                    </Button>
                    <ToggleGroup
                        type="single"
                        size="sm"
                        value={timeRange}
                        onValueChange={(value) => setTimeRange(value as UsageRange)}
                        variant="outline"
                        className="hidden *:data-[slot=toggle-group-item]:px-4! @[767px]/card:flex"
                    >
                        <ToggleGroupItem value="1y" className="rounded-tl-none!">This Year</ToggleGroupItem>
                        <ToggleGroupItem value="1m">This Month</ToggleGroupItem>
                        <ToggleGroupItem value="7d">This Week</ToggleGroupItem>
                        <ToggleGroupItem value="1d" className="rounded-br-none!">Today</ToggleGroupItem>
                    </ToggleGroup>
                    <Select value={timeRange} onValueChange={(value) => setTimeRange(value as UsageRange)}>
                        <SelectTrigger
                            className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
                            size="sm"
                            aria-label="Select a value"
                        >
                            <SelectValue placeholder="Last 3 months" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            <SelectItem value="1y" className="rounded-lg">
                                This Year
                            </SelectItem>
                            <SelectItem value="1m" className="rounded-lg">
                                This Month
                            </SelectItem>
                            <SelectItem value="7d" className="rounded-lg">
                                This Week
                            </SelectItem>
                            <SelectItem value="1d" className="rounded-lg">
                                Today
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </CardAction>

            </CardHeader>
            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
                <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
                    <BarChart data={generateFullRange(timeRange, data ?? [])}>
                        <CartesianGrid vertical={false} />
                        <XAxis
                            dataKey="date"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            minTickGap={32}
                            tickFormatter={tickFormatter}
                        />
                        <YAxis
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}
                            width={36}
                        />
                        <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent labelFormatter={labelFormatter} indicator="dot" />}
                        />
                        <Bar dataKey="totalInputTokens" fill="var(--color-totalInputTokens)" radius={[10, 0, 10, 0]} />
                        <Bar dataKey="totalOutputTokens" fill="var(--color-totalOutputTokens)" radius={[0, 10, 0, 10]} />
                    </BarChart>
                </ChartContainer>
            </CardContent>
        </Card>
    )
}
