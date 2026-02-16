"use client";

import { Input } from "@/components/ui/input";
import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface FormattedNumberInputProps extends Omit<React.ComponentProps<"input">, "value" | "onChange"> {
    value: number | undefined | null;
    onChange: (value: number) => void;
    suffix?: string;
}

export function FormattedNumberInput({ value, onChange, suffix, className, ...props }: FormattedNumberInputProps) {
    const [display, setDisplay] = useState("");
    const [isFocused, setIsFocused] = useState(false);

    // Sync from parent when not focused
    useEffect(() => {
        if (!isFocused) {
            if (value !== undefined && value !== null) {
                setDisplay(new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 6 }).format(value));
            } else {
                setDisplay("");
            }
        }
    }, [value, isFocused]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value;

        // Allow only digits, dots, commas, minus
        if (!/^[-0-9.,]*$/.test(val)) return;

        setDisplay(val);

        // Parse: remove dots (thousands), replace comma with dot (decimal)
        const raw = val.replace(/\./g, "").replace(/,/g, ".");

        if (val === "" || val === "-") {
            onChange(0);
            return;
        }

        const num = parseFloat(raw);
        if (!isNaN(num)) {
            onChange(num);
        }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        setIsFocused(false);
        if (value !== undefined && value !== null) {
            setDisplay(new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 6 }).format(value));
        }
        props.onBlur?.(e);
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
        setIsFocused(true);
        props.onFocus?.(e);
    };

    return (
        <div className="relative">
            <Input
                {...props}
                value={display}
                onChange={handleChange}
                onBlur={handleBlur}
                onFocus={handleFocus}
                className={cn(className)}
                style={{ ...props.style, paddingRight: suffix ? "30px" : undefined, borderRadius: "12px" }}
            />
            {suffix && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                    {suffix}
                </span>
            )}
        </div>
    );
}
