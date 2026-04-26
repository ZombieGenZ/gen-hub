"use client";

import React, { useEffect, useRef } from "react";

declare global {
    interface Window {
        difyChatbotConfig?: {
            token: string;
            baseUrl?: string;
            systemVariables?: Record<string, string>;
        };
    }
}

const DIFY_TOKEN = process.env.NEXT_PUBLIC_DIFY_TOKEN || "";
const DIFY_BASE_URL = process.env.NEXT_PUBLIC_DIFY_BASE_URL || "https://api.dify.ai/v1";

/**
 * Dify AI Chatbot – embeds the Dify chat bubble widget.
 * Requires NEXT_PUBLIC_DIFY_TOKEN to be set.
 */
export function DifyChatbot() {
    const initialized = useRef(false);

    useEffect(() => {
        if (initialized.current || !DIFY_TOKEN) return;
        initialized.current = true;

        // Set Dify config BEFORE loading the script
        window.difyChatbotConfig = {
            token: DIFY_TOKEN,
            baseUrl: DIFY_BASE_URL,
        };

        // Inject the Dify embed script
        const script = document.createElement("script");
        script.src = "https://udify.app/embed.min.js";
        script.id = "dify-chatbot-script";
        script.defer = true;

        document.body.appendChild(script);

        // Inject the default Dify chatbot styles
        const style = document.createElement("style");
        style.id = "dify-chatbot-style";
        style.textContent = `
            #dify-chatbot-bubble-button {
                background-color: #1C64F2 !important;
                width: 56px !important;
                height: 56px !important;
                bottom: 24px !important;
                right: 24px !important;
            }
            #dify-chatbot-bubble-window {
                width: 380px !important;
                height: min(600px, calc(100vh - 100px)) !important;
                bottom: 88px !important;
                right: 24px !important;
            }
        `;
        document.head.appendChild(style);

        return () => {
            // Cleanup
            try {
                document.body.removeChild(script);
            } catch {
                /* noop */
            }
            try {
                const styleEl = document.getElementById("dify-chatbot-style");
                if (styleEl) styleEl.remove();
            } catch {
                /* noop */
            }

            // Remove Dify injected elements
            const button = document.getElementById("dify-chatbot-bubble-button");
            if (button) button.remove();

            const chatWindow = document.getElementById("dify-chatbot-bubble-window");
            if (chatWindow) chatWindow.remove();

            delete window.difyChatbotConfig;
        };
    }, []);

    if (!DIFY_TOKEN) {
        console.warn(
            "[DifyChatbot] NEXT_PUBLIC_DIFY_TOKEN is not set. Chatbot will not render.",
        );
        return null;
    }

    return null; // Dify SDK injects its own floating widget
}
