"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { Toast, ToastType } from "@/components/ui/Toast";

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastData {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  action?: ToastAction;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number, action?: ToastAction) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const showToast = useCallback(
    (message: string, type: ToastType = "info", duration = 5000, action?: ToastAction) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => {
        const newToast = { id, message, type, duration, action };
        // Keep max 5 toasts for the stack effect
        const updatedToasts = [...prev, newToast];
        if (updatedToasts.length > 5) {
          return updatedToasts.slice(updatedToasts.length - 5);
        }
        return updatedToasts;
      });
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      {/* Toast Container - Top Right */}
      <div className="pointer-events-none fixed top-4 right-4 z-[9999] flex w-full max-w-[420px] flex-col items-end gap-2 p-0" style={{ perspective: "1000px" }}>
        <AnimatePresence mode="popLayout">
          {toasts.map((toast, index) => (
            <Toast
              key={toast.id}
              {...toast}
              action={toast.action}
              index={index}
              total={toasts.length}
              onDismiss={dismissToast}
            />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};
