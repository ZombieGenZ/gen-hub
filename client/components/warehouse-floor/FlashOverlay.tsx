'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

type FlashType = 'success' | 'error' | 'warning' | null;

/**
 * Overlay chớp viền màn hình – phản hồi thị giác cho thao tác sàn kho.
 * Mount 1 lần ở layout, gọi flash() từ bất kỳ đâu qua context / ref.
 */
export function useFlashOverlay() {
    const [flash, setFlash] = useState<FlashType>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const triggerFlash = useCallback((type: 'success' | 'error' | 'warning') => {
        if (timerRef.current) clearTimeout(timerRef.current);
        setFlash(null);
        // Force reflow so re-animation triggers
        requestAnimationFrame(() => {
            setFlash(type);
            timerRef.current = setTimeout(() => setFlash(null), type === 'error' ? 900 : 600);
        });
    }, []);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    return { flash, triggerFlash };
}

export function FlashOverlay({ flash }: { flash: FlashType }) {
    if (!flash) return null;
    return (
        <div
            className={cn(
                'floor-flash-overlay',
                flash === 'success' && 'flash-success',
                flash === 'error' && 'flash-error',
                flash === 'warning' && 'flash-warning',
            )}
        />
    );
}
