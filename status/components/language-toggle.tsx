'use client';

import { useTranslation } from '@/lib/i18n';
import { Globe } from 'lucide-react';

export function LanguageToggle() {
    const { language, setLanguage } = useTranslation();

    return (
        <button
            onClick={() => setLanguage(language === 'en' ? 'vi' : 'en')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        >
            <Globe size={16} />
            <span>{language.toUpperCase()}</span>
        </button>
    );
}
