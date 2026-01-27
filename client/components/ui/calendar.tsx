"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"
import { vi } from "date-fns/locale"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

// Custom Vietnamese locale with short weekday names for consistent width
const viCustomLocale = {
    ...vi,
    localize: {
        ...vi.localize,
        day: (n: number) => ["CN", "T2", "T3", "T4", "T5", "T6", "T7"][n],
    },
}

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
    className,
    classNames,
    showOutsideDays = true,
    locale,
    ...props
}: CalendarProps) {
    return (
        <DayPicker
            showOutsideDays={showOutsideDays}
            locale={locale || viCustomLocale}
            className={cn("p-3", className)}
            classNames={{
                months: "flex flex-col sm:flex-row gap-4",
                month: "flex flex-col gap-4",
                month_caption: "flex justify-center pt-1 relative items-center h-10",
                caption_label: "text-sm font-medium",
                nav: "flex items-center justify-between absolute inset-x-0 top-0 h-10 px-1",
                button_previous: cn(
                    buttonVariants({ variant: "outline" }),
                    "h-8 w-8 bg-transparent p-1.5 opacity-70 hover:opacity-100"
                ),
                button_next: cn(
                    buttonVariants({ variant: "outline" }),
                    "h-8 w-8 bg-transparent p-1.5 opacity-70 hover:opacity-100"
                ),
                month_grid: "w-full border-collapse mt-2",
                weekdays: "flex",
                weekday: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem] text-center",
                week: "flex w-full mt-2",
                day: "h-9 w-9 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
                day_button: cn(
                    buttonVariants({ variant: "ghost" }),
                    "h-9 w-9 p-0 font-normal hover:bg-brand/10 hover:text-brand aria-selected:opacity-100 rounded-full"
                ),
                range_end: "day-range-end",
                selected:
                    "!bg-brand !text-primary-foreground focus:!text-brand rounded-full",
                today: "bg-brand/10 text-brand font-semibold rounded-full",
                outside:
                    "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
                disabled: "text-muted-foreground opacity-50",
                range_middle:
                    "aria-selected:bg-accent aria-selected:text-accent-foreground",
                hidden: "invisible",
                ...classNames,
            }}
            components={{
                Chevron: ({ orientation }) => (
                    orientation === "left"
                        ? <ChevronLeft className="h-4 w-4" />
                        : <ChevronRight className="h-4 w-4" />
                ),
            }}
            {...props}
        />
    )
}
Calendar.displayName = "Calendar"

export { Calendar }
