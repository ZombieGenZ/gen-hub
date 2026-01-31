"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"
import { vi } from "date-fns/locale"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

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
                month_caption: "flex justify-center relative items-center h-10",
                caption_label: "text-sm font-medium",
                nav: "flex items-center justify-between absolute inset-x-0 top-0 h-10",
                button_previous: cn(
                    buttonVariants({ variant: "ghost" }),
                    "h-8 w-8 p-0 hover:bg-[#0F766E]/10 hover:text-[#0F766E] rounded-md transition-colors"
                ),
                button_next: cn(
                    buttonVariants({ variant: "ghost" }),
                    "h-8 w-8 p-0 hover:bg-[#0F766E]/10 hover:text-[#0F766E] rounded-md transition-colors"
                ),
                month_grid: "w-full border-collapse mt-2",
                weekdays: "flex",
                weekday: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem] text-center",
                week: "flex w-full mt-2",
                day: "h-9 w-9 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
                day_button: cn(
                    buttonVariants({ variant: "ghost" }),
                    "h-9 w-9 p-0 font-normal rounded-full transition-all duration-200",
                    "hover:bg-gradient-to-br hover:from-[#0F766E]/20 hover:to-[#0F766E]/10 hover:text-[#0F766E] hover:scale-105 hover:shadow-md",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]/50 focus-visible:ring-offset-2",
                    "aria-selected:!text-white [&[aria-selected=true]]:!text-white"
                ),
                range_end: "day-range-end",
                selected:
                    "!bg-gradient-to-br !from-[#0F766E] !to-[#0D9488] [&>*]:!text-white !text-white font-semibold hover:!from-[#0F766E]/95 hover:!to-[#0D9488]/95 hover:!text-white focus:!from-[#0F766E] rounded-full focus:!to-[#0D9488] focus:!text-white shadow-lg hover:shadow-xl transition-all",
                today: "bg-gradient-to-br from-[#0F766E]/10 to-transparent text-[#0F766E] font-semibold rounded-full ring-1 ring-[#0F766E]/20",
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
