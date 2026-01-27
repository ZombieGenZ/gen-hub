"use client"

import * as React from "react"
import { format } from "date-fns"
import { vi } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
    date?: Date
    onDateChange?: (date: Date | undefined) => void
    placeholder?: string
    className?: string
    disabled?: (date: Date) => boolean
    fromDate?: Date
    toDate?: Date
}

export function DatePicker({
    date,
    onDateChange,
    placeholder = "Chọn ngày",
    className,
    disabled,
    fromDate,
    toDate,
}: DatePickerProps) {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant={"outline"}
                    className={cn(
                        "w-full justify-start text-left font-normal h-12 rounded-xl border-slate-200",
                        !date && "text-muted-foreground",
                        className
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4 text-[#0F766E]" />
                    {date ? format(date, "d 'tháng' M, yyyy", { locale: vi }) : <span>{placeholder}</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="single"
                    selected={date}
                    onSelect={onDateChange}
                    initialFocus
                    showOutsideDays={false}
                    disabled={disabled}
                    fromDate={fromDate}
                    toDate={toDate}
                    className="rounded-xl border border-slate-100 shadow-lg"
                />
            </PopoverContent>
        </Popover>
    )
}
