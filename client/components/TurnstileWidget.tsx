'use client';

import { useEffect, useRef, useCallback } from 'react';

interface TurnstileWidgetProps {
    onSuccess: (token: string) => void;
    onError?: () => void;
    onExpire?: () => void;
    theme?: 'light' | 'dark' | 'auto';
    size?: 'normal' | 'compact';
}

declare global {
    interface Window {
        turnstile?: {
            render: (
                container: HTMLElement,
                options: {
                    sitekey: string;
                    callback: (token: string) => void;
                    'error-callback'?: () => void;
                    'expired-callback'?: () => void;
                    theme?: 'light' | 'dark' | 'auto';
                    size?: 'normal' | 'compact';
                }
            ) => string;
            reset: (widgetId: string) => void;
            remove: (widgetId: string) => void;
        };
    }
}

/**
 * Cloudflare Turnstile Widget Component
 * Hiển thị captcha và trả về token khi người dùng hoàn thành
 */
export default function TurnstileWidget({
    onSuccess,
    onError,
    onExpire,
    theme = 'auto',
    size = 'normal',
}: TurnstileWidgetProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);

    const siteKey = process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITEKEY;
    const isEnabled = process.env.NEXT_PUBLIC_USE_CLOUDFLARE_CAPTCHA === 'true';

    const renderWidget = useCallback(() => {
        if (!containerRef.current || !window.turnstile || !siteKey) return;

        // Remove existing widget if any
        if (widgetIdRef.current) {
            window.turnstile.remove(widgetIdRef.current);
        }

        widgetIdRef.current = window.turnstile.render(containerRef.current, {
            sitekey: siteKey,
            callback: onSuccess,
            'error-callback': onError,
            'expired-callback': onExpire,
            theme,
            size,
        });
    }, [siteKey, onSuccess, onError, onExpire, theme, size]);

    useEffect(() => {
        // Skip if captcha is disabled
        if (!isEnabled) {
            // Tự động gọi onSuccess với empty token để bypass
            onSuccess('');
            return;
        }

        // Load Turnstile script if not loaded
        if (!window.turnstile) {
            const script = document.createElement('script');
            script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
            script.async = true;
            script.onload = () => {
                renderWidget();
            };
            document.head.appendChild(script);
        } else {
            renderWidget();
        }

        return () => {
            if (widgetIdRef.current && window.turnstile) {
                window.turnstile.remove(widgetIdRef.current);
            }
        };
    }, [isEnabled, renderWidget, onSuccess]);

    // Không render nếu captcha bị tắt
    if (!isEnabled) {
        return null;
    }

    return (
        <div
            ref={containerRef}
            className="flex justify-center my-4"
            data-testid="turnstile-widget"
        />
    );
}
