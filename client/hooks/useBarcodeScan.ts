'use client';

import { useEffect, useCallback, useRef } from 'react';

/**
 * Hook luôn lắng nghe tín hiệu từ máy quét mã vạch (hardware barcode scanner).
 * Máy quét phần cứng gửi ký tự rất nhanh rồi kết thúc bằng Enter.
 * Hook phân biệt giữa bàn phím gõ tay (chậm) và máy quét (nhanh).
 */
export function useBarcodeScan(
    onScan: (barcode: string) => void,
    options?: {
        /** Ngưỡng thời gian tối đa giữa các phím (ms). Máy quét thường < 50ms */
        threshold?: number;
        /** Chiều dài mã tối thiểu để xem là barcode hợp lệ */
        minLength?: number;
        /** Tắt lắng nghe (VD khi đang focus input thủ công) */
        disabled?: boolean;
    },
) {
    const threshold = options?.threshold ?? 50;
    const minLength = options?.minLength ?? 4;
    const disabled = options?.disabled ?? false;

    const bufferRef = useRef('');
    const lastKeyTimeRef = useRef(0);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const onScanRef = useRef(onScan);

    // Keep callback stable
    useEffect(() => {
        onScanRef.current = onScan;
    }, [onScan]);

    const resetBuffer = useCallback(() => {
        bufferRef.current = '';
    }, []);

    useEffect(() => {
        if (disabled) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore modifier keys
            if (e.ctrlKey || e.altKey || e.metaKey) return;

            const now = Date.now();
            const elapsed = now - lastKeyTimeRef.current;
            lastKeyTimeRef.current = now;

            // Reset buffer if gap too large (typed by hand)
            if (elapsed > threshold && bufferRef.current.length > 0) {
                bufferRef.current = '';
            }

            if (e.key === 'Enter') {
                if (bufferRef.current.length >= minLength) {
                    e.preventDefault();
                    e.stopPropagation();
                    onScanRef.current(bufferRef.current);
                }
                bufferRef.current = '';
                return;
            }

            // Only accept printable single chars
            if (e.key.length === 1) {
                bufferRef.current += e.key;

                // Auto-clear after timeout
                if (timerRef.current) clearTimeout(timerRef.current);
                timerRef.current = setTimeout(() => {
                    bufferRef.current = '';
                }, 300);
            }
        };

        window.addEventListener('keydown', handleKeyDown, { capture: true });
        return () => {
            window.removeEventListener('keydown', handleKeyDown, { capture: true });
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [disabled, threshold, minLength]);

    return { resetBuffer };
}
