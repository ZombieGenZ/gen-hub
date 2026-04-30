"use client";
import { useEffect, useRef } from "react";
import { auth } from "@/lib/api";
import Cookies from "js-cookie";

const REFRESH_INTERVAL_MS = 10 * 60 * 1000; // 10 phút
const EXPIRY_THRESHOLD_MS = 6 * 60 * 1000;  // refresh khi còn < 6 phút
const ACCESS_TOKEN_KEY = process.env.NEXT_PUBLIC_ACCESS_TOKEN_KEY || "access_token";
const REFRESH_TOKEN_KEY = process.env.NEXT_PUBLIC_REFRESH_TOKEN_KEY || "refresh_token";

export function useTokenRefresh(isAuthenticated: boolean) {
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (!isAuthenticated) return;

        const refreshIfNeeded = async () => {
            if (document.visibilityState === "hidden") return;

            const token = Cookies.get(ACCESS_TOKEN_KEY);
            if (!token) return;

            try {
                const payload = JSON.parse(atob(token.split(".")[1]));
                const timeUntilExpiry = payload.exp * 1000 - Date.now();
                if (timeUntilExpiry > EXPIRY_THRESHOLD_MS) return;
            } catch {
                return;
            }

            const refreshToken = Cookies.get(REFRESH_TOKEN_KEY);
            if (!refreshToken) return; // axios interceptor 401 sẽ xử lý redirect

            try {
                await auth.refreshToken(refreshToken);
            } catch {
                // để interceptor 401 xử lý, không redirect tại đây
            }
        };

        intervalRef.current = setInterval(refreshIfNeeded, REFRESH_INTERVAL_MS);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isAuthenticated]);
}
