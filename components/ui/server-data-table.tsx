"use client"

import * as React from "react"
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    useReactTable,
    SortingState,
    PaginationState,
} from "@tanstack/react-table"
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUp, ArrowDown, ArrowUpDown, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

const PAGE_SIZE_OPTIONS = [10, 20, 50]

export interface ServerDataTableProps<TData> {
    columns: ColumnDef<TData>[]
    data: TData[]
    totalCount: number
    isLoading?: boolean
    // controlled state
    pagination: PaginationState
    onPaginationChange: (p: PaginationState) => void
    sorting: SortingState
    onSortingChange: (s: SortingState) => void
    search: string
    onSearchChange: (s: string) => void
    searchPlaceholder?: string
    // optional top-right slot
    actions?: React.ReactNode
}

export function ServerDataTable<TData>({
    columns,
    data,
    totalCount,
    isLoading,
    pagination,
    onPaginationChange,
    sorting,
    onSortingChange,
    search,
    onSearchChange,
    searchPlaceholder = "Search…",
    actions,
}: ServerDataTableProps<TData>) {
    const pageCount = Math.ceil(totalCount / pagination.pageSize)

    // eslint-disable-next-line react-hooks/incompatible-library
    const table = useReactTable({
        data,
        columns,
        pageCount,
        state: { pagination, sorting },
        onPaginationChange: (updater) =>
            onPaginationChange(
                typeof updater === "function" ? updater(pagination) : updater
            ),
        onSortingChange: (updater) =>
            onSortingChange(
                typeof updater === "function" ? updater(sorting) : updater
            ),
        getCoreRowModel: getCoreRowModel(),
        manualPagination: true,
        manualSorting: true,
    })

    return (
        <div className="space-y-3">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-2">
                <Input
                    placeholder={searchPlaceholder}
                    value={search}
                    onChange={(e) => {
                        onSearchChange(e.target.value)
                        // reset to first page on search
                        onPaginationChange({ ...pagination, pageIndex: 0 })
                    }}
                    className="h-8 w-64 text-sm bg-background"
                />
                {actions && <div className="flex items-center gap-2">{actions}</div>}
            </div>

            {/* Table */}
            <div className="rounded-diagonal border bg-background h-[calc(100vh-240px)] overflow-y-auto no-scrollbar">
                <Table>
                    <TableHeader className="sticky top-0 z-10 bg-background shadow">
                        {table.getHeaderGroups().map((hg) => (
                            <TableRow key={hg.id}>
                                {hg.headers.map((header) => {
                                    const canSort = header.column.getCanSort()
                                    const sorted = header.column.getIsSorted()
                                    return (
                                        <TableHead
                                            key={header.id}
                                            style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                                        >
                                            {header.isPlaceholder ? null : (
                                                <button
                                                    className={cn(
                                                        "flex items-center gap-1.5 text-xs font-medium select-none",
                                                        canSort && "cursor-pointer hover:text-foreground"
                                                    )}
                                                    onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                                                >
                                                    {flexRender(header.column.columnDef.header, header.getContext())}
                                                    {canSort && (
                                                        <span className="text-muted-foreground">
                                                            {sorted === "asc" ? (
                                                                <ArrowUp className="w-3 h-3" />
                                                            ) : sorted === "desc" ? (
                                                                <ArrowDown className="w-3 h-3" />
                                                            ) : (
                                                                <ArrowUpDown className="w-3 h-3" />
                                                            )}
                                                        </span>
                                                    )}
                                                </button>
                                            )}
                                        </TableHead>
                                    )
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: pagination.pageSize > 5 ? 5 : pagination.pageSize }).map((_, i) => (
                                <TableRow key={i}>
                                    {columns.map((_, j) => (
                                        <TableCell key={j}>
                                            <div className="h-4 rounded bg-muted animate-pulse" style={{ width: `${60 + (j * 20) % 40}%` }} />
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : table.getRowModel().rows.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-32 text-center text-sm text-muted-foreground">
                                    No results found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            table.getRowModel().rows.map((row) => (
                                <TableRow key={row.id}>
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination footer */}
            <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="bg-background p-1 rounded-diagonal border font-semibold  tabular-nums">
                    {isLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                        `${totalCount} Row${totalCount !== 1 ? "s" : ""}`
                    )}
                </div>
                <div className="flex items-center bg-background p-1 rounded-diagonal border font-semibold gap-4">
                    <div className="flex items-center gap-1.5">
                        <Select
                            value={String(pagination.pageSize)}
                            onValueChange={(v) => onPaginationChange({ pageIndex: 0, pageSize: Number(v) })}
                        >
                            <SelectTrigger className="text-xs [&>svg]:hidden  h-7 tabular-nums">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {PAGE_SIZE_OPTIONS.map((s) => (
                                    <SelectItem key={s} value={String(s)} className="text-xs">{s}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button size="icon" className="h-7 w-7 reverse-rounded-diagonal"
                            onClick={() => onPaginationChange({ ...pagination, pageIndex: 0 })}
                            disabled={table.getCanPreviousPage()}>
                            <ChevronsLeft className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-7 w-7 reverse-rounded-diagonal"
                            onClick={() => onPaginationChange({ ...pagination, pageIndex: pagination.pageIndex - 1 })}
                            disabled={table.getCanPreviousPage()}>
                            <ChevronLeft className="w-3.5 h-3.5" />
                        </Button>
                        <span className="text-xs tabular-nums">
                            {pagination.pageIndex + 1} / {Math.max(pageCount, 1)}
                        </span>
                        <Button variant="outline" size="icon" className="h-7 w-7"
                            onClick={() => onPaginationChange({ ...pagination, pageIndex: pagination.pageIndex + 1 })}
                            disabled={table.getCanNextPage()}>
                            <ChevronRight className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="icon" className="h-7 w-7"
                            onClick={() => onPaginationChange({ ...pagination, pageIndex: pageCount - 1 })}
                            disabled={table.getCanNextPage()}>
                            <ChevronsRight className="w-3.5 h-3.5" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}