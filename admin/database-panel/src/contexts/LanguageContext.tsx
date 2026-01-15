'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import enTranslations from '@/locales/en.json';
import viTranslations from '@/locales/vi.json';

type Language = 'en' | 'vi';

type TranslationKeys = typeof enTranslations;

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
    toggleLanguage: () => void;
}

const translations: Record<Language, TranslationKeys> = {
    en: enTranslations,
    vi: viTranslations,
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguageState] = useState<Language>('vi');

    // Load language from localStorage on mount
    useEffect(() => {
        const savedLang = localStorage.getItem('language') as Language;
        if (savedLang && (savedLang === 'en' || savedLang === 'vi')) {
            setLanguageState(savedLang);
        }
    }, []);

    const setLanguage = useCallback((lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem('language', lang);
    }, []);

    const toggleLanguage = useCallback(() => {
        const newLang = language === 'en' ? 'vi' : 'en';
        setLanguage(newLang);
    }, [language, setLanguage]);

    // Get translation by dot-notation key (e.g., "dashboard.title")
    const t = useCallback((key: string): string => {
        const keys = key.split('.');
        let value: unknown = translations[language];

        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = (value as Record<string, unknown>)[k];
            } else {
                // Return key if translation not found
                return key;
            }
        }

        return typeof value === 'string' ? value : key;
    }, [language]);

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t, toggleLanguage }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}

// Language Switcher Component
export function LanguageSwitcher({ className = '' }: { className?: string }) {
    const { language, setLanguage } = useLanguage();

    return (
        <div className={`flex items-center gap-1 p-1 rounded-lg bg-[var(--background-tertiary)] border border-[var(--border-primary)] ${className}`}>
            <button
                onClick={() => setLanguage('en')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${language === 'en'
                    ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-white hover:bg-[var(--background-secondary)]'
                    }`}
            >
                EN
            </button>
            <button
                onClick={() => setLanguage('vi')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${language === 'vi'
                    ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-white hover:bg-[var(--background-secondary)]'
                    }`}
            >
                VI
            </button>
        </div>
    );
}
