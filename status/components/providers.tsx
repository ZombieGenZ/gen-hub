'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { I18nProvider } from '@/lib/i18n';

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <NextThemesProvider attribute="class" defaultTheme="dark" forcedTheme="dark" enableSystem={false}>
            <I18nProvider>
                {children}
            </I18nProvider>
        </NextThemesProvider>
    );
}
