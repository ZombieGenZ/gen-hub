"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckoutStep, CheckoutSession, PaymentMethod } from '@/types/checkout/checkout.type';
import { QuotationBreakdown } from '@/types/booking/booking.type';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    CheckIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    DocumentTextIcon,
    BuildingOffice2Icon,
    CreditCardIcon,
    UserIcon,
    CheckCircleIcon as CheckCircleSolidIcon
} from '@heroicons/react/24/solid';

// ==================== CONTEXT ====================

interface CheckoutContextValue {
    session: Partial<CheckoutSession>;
    currentStep: CheckoutStep;
    stepIndex: number;
    setSession: (data: Partial<CheckoutSession>) => void;
    nextStep: () => void;
    prevStep: () => void;
    goToStep: (step: CheckoutStep) => void;
    canProceed: boolean;
    setCanProceed: (value: boolean) => void;
    isSubmitting: boolean;
    setIsSubmitting: (value: boolean) => void;
}

const CheckoutContext = createContext<CheckoutContextValue | null>(null);

export function useCheckout() {
    const context = useContext(CheckoutContext);
    if (!context) {
        throw new Error('useCheckout must be used within CheckoutProvider');
    }
    return context;
}

// ==================== STEPS CONFIG ====================

const CHECKOUT_STEPS: { id: CheckoutStep; label: string; icon: React.ElementType }[] = [
    { id: 'rental-info', label: 'Thông tin thuê', icon: DocumentTextIcon },
    { id: 'business-info', label: 'Doanh nghiệp', icon: BuildingOffice2Icon },
    { id: 'representative-info', label: 'Người đại diện', icon: UserIcon },
    { id: 'payment', label: 'Thanh toán', icon: CreditCardIcon },
    { id: 'confirmation', label: 'Xác nhận', icon: CheckCircleSolidIcon },
];

// ==================== PROVIDER ====================

interface CheckoutProviderProps {
    children: ReactNode;
    initialSession?: Partial<CheckoutSession>;
}

export function CheckoutProvider({ children, initialSession }: CheckoutProviderProps) {
    const [session, setSessionState] = useState<Partial<CheckoutSession>>(initialSession || {});
    const [currentStep, setCurrentStep] = useState<CheckoutStep>('rental-info');
    const [canProceed, setCanProceed] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const stepIndex = CHECKOUT_STEPS.findIndex(s => s.id === currentStep);

    const setSession = useCallback((data: Partial<CheckoutSession>) => {
        setSessionState(prev => ({ ...prev, ...data }));
    }, []);

    const nextStep = useCallback(() => {
        const nextIndex = stepIndex + 1;
        if (nextIndex < CHECKOUT_STEPS.length) {
            setCurrentStep(CHECKOUT_STEPS[nextIndex].id);
            setCanProceed(false);
        }
    }, [stepIndex]);

    const prevStep = useCallback(() => {
        const prevIndex = stepIndex - 1;
        if (prevIndex >= 0) {
            setCurrentStep(CHECKOUT_STEPS[prevIndex].id);
        }
    }, [stepIndex]);

    const goToStep = useCallback((step: CheckoutStep) => {
        const targetIndex = CHECKOUT_STEPS.findIndex(s => s.id === step);
        if (targetIndex <= stepIndex) {
            setCurrentStep(step);
        }
    }, [stepIndex]);

    return (
        <CheckoutContext.Provider
            value={{
                session,
                currentStep,
                stepIndex,
                setSession,
                nextStep,
                prevStep,
                goToStep,
                canProceed,
                setCanProceed,
                isSubmitting,
                setIsSubmitting,
            }}
        >
            {children}
        </CheckoutContext.Provider>
    );
}

// ==================== PROGRESS BAR ====================

interface CheckoutProgressProps {
    className?: string;
}

export function CheckoutProgress({ className }: CheckoutProgressProps) {
    const { currentStep, stepIndex, goToStep } = useCheckout();

    return (
        <div className={cn("w-full", className)}>
            {/* Desktop Progress */}
            <div className="hidden md:flex items-center justify-between">
                {CHECKOUT_STEPS.map((step, index) => {
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
                                    "flex items-center gap-3 group",
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
                                        "font-medium text-sm hidden lg:block",
                                        isCurrent && "text-[#0F766E]",
                                        isCompleted && "text-slate-700",
                                        !isCompleted && !isCurrent && "text-slate-400"
                                    )}
                                >
                                    {step.label}
                                </span>
                            </button>

                            {/* Connector Line */}
                            {index < CHECKOUT_STEPS.length - 1 && (
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

            {/* Mobile Progress */}
            <div className="md:hidden">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">
                        Bước {stepIndex + 1}/{CHECKOUT_STEPS.length}
                    </span>
                    <span className="text-sm text-[#0F766E] font-medium">
                        {CHECKOUT_STEPS[stepIndex].label}
                    </span>
                </div>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-[#0F766E] transition-all duration-300"
                        style={{ width: `${((stepIndex + 1) / CHECKOUT_STEPS.length) * 100}%` }}
                    />
                </div>
            </div>
        </div>
    );
}

// ==================== NAVIGATION BUTTONS ====================

interface CheckoutNavigationProps {
    onSubmit?: () => Promise<void>;
    submitLabel?: string;
    className?: string;
}

export function CheckoutNavigation({
    onSubmit,
    submitLabel = "Xác nhận & Thanh toán",
    className
}: CheckoutNavigationProps) {
    const { stepIndex, prevStep, nextStep, canProceed, isSubmitting, currentStep } = useCheckout();

    const isFirstStep = stepIndex === 0;
    const isLastStep = currentStep === 'confirmation';
    const isPaymentStep = currentStep === 'payment';

    const handleNext = async () => {
        if (isLastStep && onSubmit) {
            await onSubmit();
        } else {
            nextStep();
        }
    };

    return (
        <div className={cn("flex items-center justify-between pt-6 border-t border-slate-200", className)}>
            {/* Back Button */}
            <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={isFirstStep || isSubmitting}
                className={cn(
                    "h-12 px-6 rounded-xl",
                    isFirstStep && "invisible"
                )}
            >
                <ChevronLeftIcon className="w-4 h-4 mr-2" />
                Quay lại
            </Button>

            {/* Next/Submit Button */}
            <Button
                type="button"
                onClick={handleNext}
                disabled={!canProceed || isSubmitting}
                className={cn(
                    "h-12 px-8 rounded-xl font-bold",
                    isLastStep || isPaymentStep
                        ? "bg-[#0F766E] hover:bg-[#0D655D]"
                        : "bg-[#0F766E] hover:bg-[#0D655D]"
                )}
            >
                {isSubmitting ? (
                    <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Đang xử lý...
                    </span>
                ) : (
                    <>
                        {isLastStep || isPaymentStep ? submitLabel : "Tiếp tục"}
                        {!isLastStep && !isPaymentStep && <ChevronRightIcon className="w-4 h-4 ml-2" />}
                    </>
                )}
            </Button>
        </div>
    );
}

// ==================== STEP CONTAINER ====================

interface CheckoutStepContainerProps {
    step: CheckoutStep;
    children: ReactNode;
}

export function CheckoutStepContainer({ step, children }: CheckoutStepContainerProps) {
    const { currentStep } = useCheckout();

    if (currentStep !== step) {
        return null;
    }

    return <>{children}</>;
}
