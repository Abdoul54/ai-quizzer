"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import { useIsMobile } from "@/hooks/use-mobile"
import {
    Card,
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
import { useUsage } from "@/hooks/api/use-usage"

export const description = "An interactive area chart"

const chartConfig = {
    totalInputTokens: {
        label: "Input Tokens",
        color: "var(--primary)",
    },
    totalOutputTokens: {
        label: "Output Tokens",
        color: "var(--chart-2)",
    },
} satisfies ChartConfig

export function ChartAreaInteractive() {
    const { data } = useUsage()
    const isMobile = useIsMobile()
    const [timeRange, setTimeRange] = React.useState("90d")

    React.useEffect(() => {
        if (isMobile) setTimeRange("7d")
    }, [isMobile])

    const filteredData = React.useMemo(() => {
        if (!data) return []
        const now = new Date()
        const daysToSubtract = timeRange === "30d" ? 30 : timeRange === "7d" ? 7 : 90
        const startDate = new Date(now)
        startDate.setDate(startDate.getDate() - daysToSubtract)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return data.filter((item: any) => new Date(item.date) >= startDate)
    }, [data, timeRange])

    return (
        <Card className="@container/card">
            <CardHeader>
                <CardTitle>Token Usage</CardTitle>
                <CardDescription>
                    <span className="hidden @[540px]/card:block">
                        Input & output tokens over time
                    </span>
                    <span className="@[540px]/card:hidden">Token usage</span>
                </CardDescription>
                {/* ...CardAction stays the same... */}
            </CardHeader>
            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
                <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
                    <AreaChart data={filteredData}>
                        <defs>
                            <linearGradient id="fillInput" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--color-totalInputTokens)" stopOpacity={1.0} />
                                <stop offset="95%" stopColor="var(--color-totalInputTokens)" stopOpacity={0.1} />
                            </linearGradient>
                            <linearGradient id="fillOutput" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--color-totalOutputTokens)" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="var(--color-totalOutputTokens)" stopOpacity={0.1} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} />
                        <XAxis
                            dataKey="date"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            minTickGap={32}
                            tickFormatter={(value) =>
                                new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                            }
                        />
                        <ChartTooltip
                            cursor={false}
                            content={
                                <ChartTooltipContent
                                    labelFormatter={(value) =>
                                        new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                                    }
                                    indicator="dot"
                                />
                            }
                        />
                        <Area
                            dataKey="totalInputTokens"
                            type="natural"
                            fill="url(#fillInput)"
                            stroke="var(--color-totalInputTokens)"
                            stackId="a"
                        />
                        <Area
                            dataKey="totalOutputTokens"
                            type="natural"
                            fill="url(#fillOutput)"
                            stroke="var(--color-totalOutputTokens)"
                            stackId="a"
                        />
                    </AreaChart>
                </ChartContainer>
            </CardContent>
        </Card>
    )
}
