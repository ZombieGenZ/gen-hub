"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { authStorage } from "@/services/auth/auth-storage.service";
import { authService } from "@/services/auth/auth.service";

const REFRESH_INTERVAL_MS = 10 * 60 * 1000; // 10 phút
const EXPIRY_THRESHOLD_MS = 6 * 60 * 1000;  // refresh khi còn < 6 phút

export function useTokenRefresh() {
    const router = useRouter();
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        const refreshIfNeeded = async () => {
            if (document.visibilityState === "hidden") return;

            const token = authStorage.getAccessToken();
            if (!token) return;

            try {
                const payload = JSON.parse(atob(token.split(".")[1]));
                const timeUntilExpiry = payload.exp * 1000 - Date.now();
                if (timeUntilExpiry > EXPIRY_THRESHOLD_MS) return;
            } catch {
                return;
            }

            const refreshToken = authStorage.getRefreshToken();
            if (!refreshToken) {
                router.push("/login");
                return;
            }

            try {
                await authService.getNewToken(refreshToken);
            } catch {
                router.push("/login");
            }
        };

        intervalRef.current = setInterval(refreshIfNeeded, REFRESH_INTERVAL_MS);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [router]);
}
