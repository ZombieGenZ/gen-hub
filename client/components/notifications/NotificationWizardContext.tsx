"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import {
    NotificationType,
    TargetAudienceType,
    UserRole,
    NotificationActionType,
    ComposeNotificationData,
} from '@/types/notification/notification.type';
import {
    UsersIcon,
    DocumentTextIcon,
    PaperAirplaneIcon,
} from '@heroicons/react/24/solid';

// ==================== TYPES ====================

export type NotificationWizardStep = 'target-audience' | 'content-composer' | 'review-send';

export interface User {
    id: string;
    full_name: string;
    email: string;
}

// ==================== CONTEXT ====================

interface NotificationWizardContextValue {
    data: ComposeNotificationData;
    currentStep: NotificationWizardStep;
    stepIndex: number;
    setData: (data: Partial<ComposeNotificationData>) => void;
    nextStep: () => void;
    prevStep: () => void;
    goToStep: (step: NotificationWizardStep) => void;
    canProceed: boolean;
    setCanProceed: (value: boolean) => void;
    isSubmitting: boolean;
    setIsSubmitting: (value: boolean) => void;
    selectedUsers: User[];
    setSelectedUsers: (users: User[]) => void;
}

const NotificationWizardContext = createContext<NotificationWizardContextValue | null>(null);

export function useNotificationWizard() {
    const context = useContext(NotificationWizardContext);
    if (!context) {
        throw new Error('useNotificationWizard must be used within NotificationWizardProvider');
    }
    return context;
}

// ==================== STEPS CONFIG ====================

export const WIZARD_STEPS: { id: NotificationWizardStep; label: string; icon: any }[] = [
    { id: 'target-audience', label: 'Đối tượng', icon: UsersIcon },
    { id: 'content-composer', label: 'Nội dung', icon: DocumentTextIcon },
    { id: 'review-send', label: 'Gửi', icon: PaperAirplaneIcon },
];

const initialData: ComposeNotificationData = {
    targetType: 'individual',
    selectedUsers: [],
    selectedRoles: [],
    importedUserIds: [],
    type: 'INFO',
    title: '',
    content: '',
    actionType: 'none',
    actionLink: '',
    sendImmediately: true,
};

// ==================== PROVIDER ====================

interface NotificationWizardProviderProps {
    children: ReactNode;
    onSuccess?: () => void;
    onCancel?: () => void;
}

export function NotificationWizardProvider({
    children,
    onSuccess,
    onCancel
}: NotificationWizardProviderProps) {
    const [data, setDataState] = useState<ComposeNotificationData>(initialData);
    const [currentStep, setCurrentStep] = useState<NotificationWizardStep>('target-audience');
    const [canProceed, setCanProceed] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedUsers, setSelectedUsers] = useState<User[]>([]);

    const stepIndex = WIZARD_STEPS.findIndex(s => s.id === currentStep);

    const setData = useCallback((newData: Partial<ComposeNotificationData>) => {
        setDataState(prev => ({ ...prev, ...newData }));
    }, []);

    const nextStep = useCallback(() => {
        const nextIndex = stepIndex + 1;
        if (nextIndex < WIZARD_STEPS.length) {
            setCurrentStep(WIZARD_STEPS[nextIndex].id);
            setCanProceed(false);
        }
    }, [stepIndex]);

    const prevStep = useCallback(() => {
        const prevIndex = stepIndex - 1;
        if (prevIndex >= 0) {
            setCurrentStep(WIZARD_STEPS[prevIndex].id);
        }
    }, [stepIndex]);

    const goToStep = useCallback((step: NotificationWizardStep) => {
        const targetIndex = WIZARD_STEPS.findIndex(s => s.id === step);
        if (targetIndex <= stepIndex) {
            setCurrentStep(step);
        }
    }, [stepIndex]);

    return (
        <NotificationWizardContext.Provider
            value={{
                data,
                currentStep,
                stepIndex,
                setData,
                nextStep,
                prevStep,
                goToStep,
                canProceed,
                setCanProceed,
                isSubmitting,
                setIsSubmitting,
                selectedUsers,
                setSelectedUsers,
            }}
        >
            {children}
        </NotificationWizardContext.Provider>
    );
}
