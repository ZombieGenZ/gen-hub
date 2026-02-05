"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    CheckIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    PaperAirplaneIcon,
} from '@heroicons/react/24/solid';

import { NotificationService } from "@/services/notification/notification.service";
import { authStorage } from "@/services/auth/auth-storage.service";
import { useToast } from "@/contexts/ToastContext";
import {
    useNotificationWizard,
    NotificationWizardProvider,
    NotificationWizardStep,
    WIZARD_STEPS
} from './NotificationWizardContext';

import { TargetAudienceStep } from './wizard-steps/TargetAudienceStep';
import { ContentComposerStep } from './wizard-steps/ContentComposerStep';
import { ReviewSendStep } from './wizard-steps/ReviewSendStep';

const notificationService = new NotificationService();

// ==================== PROGRESS BAR ====================

interface NotificationWizardProgressProps {
    className?: string;
}

export function NotificationWizardProgress({ className }: NotificationWizardProgressProps) {
    const { currentStep, stepIndex, goToStep } = useNotificationWizard();

    return (
        <div className={cn("w-full mb-6", className)}>
            <div className="flex items-center justify-between">
                {WIZARD_STEPS.map((step, index) => {
                    const isCompleted = index < stepIndex;
                    const isCurrent = step.id === currentStep;
                    const Icon = step.icon;

                    return (
                        <React.Fragment key={step.id}>
                            {/* Step Circle */}
                            <button
                                onClick={() => isCompleted && goToStep(step.id)}
                                disabled={index > stepIndex}
                                className={cn(
                                    "flex items-center gap-2 group",
                                    isCompleted && "cursor-pointer",
                                    index > stepIndex && "cursor-not-allowed opacity-50"
                                )}
                            >
                                <div
                                    className={cn(
                                        "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                                        isCompleted && "bg-[#0F766E] text-white",
                                        isCurrent && "bg-[#0F766E] text-white ring-4 ring-teal-100",
                                        !isCompleted && !isCurrent && "bg-slate-200 text-slate-500"
                                    )}
                                >
                                    {isCompleted ? (
                                        <CheckIcon className="w-5 h-5" />
                                    ) : (
                                        <Icon className="w-5 h-5" />
                                    )}
                                </div>
                                <span
                                    className={cn(
                                        "font-medium text-sm hidden sm:block",
                                        isCurrent && "text-[#0F766E]",
                                        isCompleted && "text-slate-700",
                                        !isCompleted && !isCurrent && "text-slate-400"
                                    )}
                                >
                                    {step.label}
                                </span>
                            </button>

                            {/* Connector Line */}
                            {index < WIZARD_STEPS.length - 1 && (
                                <div
                                    className={cn(
                                        "flex-1 h-1 mx-4 rounded-full transition-all",
                                        index < stepIndex ? "bg-[#0F766E]" : "bg-slate-200"
                                    )}
                                />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
}

// ==================== NAVIGATION BUTTONS ====================

interface NotificationWizardNavigationProps {
    onSubmit?: () => Promise<void>;
    onCancel?: () => void;
    className?: string;
}

export function NotificationWizardNavigation({
    onSubmit,
    onCancel,
    className
}: NotificationWizardNavigationProps) {
    const { stepIndex, prevStep, nextStep, canProceed, isSubmitting, currentStep } = useNotificationWizard();

    const isFirstStep = stepIndex === 0;
    const isLastStep = currentStep === 'review-send';

    const handleNext = async () => {
        if (isLastStep && onSubmit) {
            await onSubmit();
        } else {
            nextStep();
        }
    };

    return (
        <div className={cn("flex items-center justify-between pt-6 border-t border-slate-200", className)}>
            {/* Back/Cancel Button */}
            <Button
                type="button"
                variant="outline"
                onClick={isFirstStep ? onCancel : prevStep}
                disabled={isSubmitting}
                className="h-10 px-4 rounded-lg"
            >
                {isFirstStep ? (
                    "Hủy"
                ) : (
                    <>
                        <ChevronLeftIcon className="w-4 h-4 mr-2" />
                        Quay lại
                    </>
                )}
            </Button>

            {/* Next/Submit Button */}
            <Button
                type="button"
                onClick={handleNext}
                disabled={!canProceed || isSubmitting}
                className={cn(
                    "h-10 px-6 rounded-lg font-medium",
                    "bg-[#0F766E] hover:bg-[#0D655D]"
                )}
            >
                {isSubmitting ? (
                    <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Đang gửi...
                    </span>
                ) : (
                    <>
                        {isLastStep ? (
                            <>
                                <PaperAirplaneIcon className="w-4 h-4 mr-2" />
                                Gửi thông báo
                            </>
                        ) : (
                            <>
                                Tiếp tục
                                <ChevronRightIcon className="w-4 h-4 ml-2" />
                            </>
                        )}
                    </>
                )}
            </Button>
        </div>
    );
}

// ==================== STEP CONTAINER ====================

interface NotificationWizardStepContainerProps {
    step: NotificationWizardStep;
    children: React.ReactNode;
}

export function NotificationWizardStepContainer({ step, children }: NotificationWizardStepContainerProps) {
    const { currentStep } = useNotificationWizard();

    if (currentStep !== step) {
        return null;
    }

    return <>{children}</>;
}

// ==================== MAIN WIZARD COMPONENT ====================

interface NotificationWizardProps {
    onSuccess?: () => void;
    onCancel?: () => void;
}

export function NotificationWizard({ onSuccess, onCancel }: NotificationWizardProps) {
    return (
        <NotificationWizardProvider onSuccess={onSuccess} onCancel={onCancel}>
            <NotificationWizardContent onSuccess={onSuccess} onCancel={onCancel} />
        </NotificationWizardProvider>
    );
}

function NotificationWizardContent({ onSuccess, onCancel }: NotificationWizardProps) {
    const { data, setIsSubmitting } = useNotificationWizard();
    const { showToast } = useToast();

    const handleSubmit = async () => {
        setIsSubmitting(true);

        try {
            const token = authStorage.getAccessToken();
            if (!token) {
                showToast("Vui lòng đăng nhập lại", "error");
                return;
            }

            if (data.targetType === 'broadcast') {
                await notificationService.createGlobalNotification(token, {
                    title: data.title,
                    content: data.content,
                    type: data.type,
                    starts_at: !data.sendImmediately ? data.scheduledAt : undefined
                });
            } else if (data.targetType === 'individual' || data.targetType === 'import') {
                const userIds = data.targetType === 'individual'
                    ? data.selectedUsers
                    : data.importedUserIds;

                if (userIds.length === 0) {
                    showToast("Chưa chọn người nhận", "error");
                    setIsSubmitting(false);
                    return;
                }

                if (userIds.length === 1) {
                    await notificationService.sendNotification(token, {
                        user_id: userIds[0],
                        title: data.title,
                        content: data.content,
                        type: data.type,
                        scheduled_at: !data.sendImmediately ? data.scheduledAt : undefined
                    });
                } else {
                    await notificationService.sendBulkNotification(token, {
                        user_ids: userIds,
                        title: data.title,
                        content: data.content,
                        type: data.type,
                        scheduled_at: !data.sendImmediately ? data.scheduledAt : undefined
                    });
                }
            } else if (data.targetType === 'role') {
                // TODO: Fetch users by role and send bulk
                showToast("Gửi theo vai trò chưa được hỗ trợ", "warning");
                setIsSubmitting(false);
                return;
            }

            showToast("Gửi thông báo thành công", "success");
            onSuccess?.();

            // Clean up or reset if needed (though component might unmount)
        } catch (error: any) {
            console.error('Failed to send notification:', error);
            showToast(error.message || "Gửi thông báo thất bại", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="notification-wizard space-y-6">
            <NotificationWizardProgress />

            <div className="notification-wizard__content min-h-[300px]">
                <NotificationWizardStepContainer step="target-audience">
                    <TargetAudienceStep />
                </NotificationWizardStepContainer>

                <NotificationWizardStepContainer step="content-composer">
                    <ContentComposerStep />
                </NotificationWizardStepContainer>

                <NotificationWizardStepContainer step="review-send">
                    <ReviewSendStep />
                </NotificationWizardStepContainer>
            </div>

            <NotificationWizardNavigation onSubmit={handleSubmit} onCancel={onCancel} />
        </div>
    );
}
