'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

type Language = 'en' | 'vi';

type Translations = {
    [key in Language]: {
        [key: string]: string;
    };
};

const translations: Translations = {
    en: {
        systemStatus: 'System Status',
        subtitle: 'Real-time status monitoring for GEN-HUB',
        client: 'Client',
        server: 'Server',
        databasePanel: 'Database Panel',
        featureFlagPanel: 'Feature Flag Panel',
        resourcesPanel: 'Resources Panel',
        latency: 'Latency',
        uptime: 'Uptime',
        operational: 'OPERATIONAL',
        down: 'DOWN',
        error: 'Error',
        lastChecked: 'Last checked',
        refresh: 'Refresh Now',
        refreshing: 'Refreshing...',
        autoRefresh: 'Auto-refreshes every 600s',
        failedData: 'Failed to load status data.',
        theme: 'Theme',
        language: 'Language',
        serviceHistory: 'Service History',
        apiService: 'API Service',
        noHistoryData: 'No history data available for the selected period.',
        tryAgain: 'Try Again',
    },
    vi: {
        systemStatus: 'Trạng thái hệ thống',
        subtitle: 'Theo dõi trạng thái thời gian thực cho GEN-HUB',
        client: 'Client',
        server: 'Server',
        databasePanel: 'Database Panel',
        featureFlagPanel: 'Feature Flag Panel',
        resourcesPanel: 'Resources Panel',
        latency: 'Độ trễ',
        uptime: 'Thời gian hoạt động',
        operational: 'HOẠT ĐỘNG',
        down: 'NGỪNG HOẠT ĐỘNG',
        error: 'Lỗi',
        lastChecked: 'Kiểm tra lần cuối',
        refresh: 'Làm mới ngay',
        refreshing: 'Đang làm mới...',
        autoRefresh: 'Tự động làm mới mỗi 600s',
        failedData: 'Không thể tải dữ liệu trạng thái.',
        theme: 'Giao diện',
        language: 'Ngôn ngữ',
        serviceHistory: 'Lịch sử dịch vụ',
        apiService: 'Dịch vụ API',
        noHistoryData: 'Không có dữ liệu lịch sử cho khoảng thời gian đã chọn.',
        tryAgain: 'Thử lại',
    },
};

type I18nContextType = {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
};

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
    const [language, setLanguage] = useState<Language>('en');

    // Load from local storage if available
    useEffect(() => {
        const saved = localStorage.getItem('language') as Language;
        if (saved && (saved === 'en' || saved === 'vi')) {
            setLanguage(saved);
        }
    }, []);

    const handleSetLanguage = (lang: Language) => {
        setLanguage(lang);
        localStorage.setItem('language', lang);
    };

    const t = (key: string) => {
        return translations[language][key] || key;
    };

    return (
        <I18nContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
            {children}
        </I18nContext.Provider>
    );
}

export function useTranslation() {
    const context = useContext(I18nContext);
    if (!context) {
        throw new Error('useTranslation must be used within an I18nProvider');
    }
    return context;
}
