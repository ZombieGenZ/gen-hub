"use client";

import { useEffect, useRef } from "react";

declare global {
    interface Window {
        CozeWebSDK?: {
            WebChatClient: new (config: {
                config: {
                    bot_id: string;
                };
                componentProps?: {
                    title?: string;
                };
                auth?: {
                    type: string;
                    token: string;
                    onRefreshToken?: () => string;
                };
                el?: HTMLElement;
            }) => unknown;
        };
    }
}

const COZE_BOT_ID = process.env.NEXT_PUBLIC_COZE_BOT_ID || "";
const COZE_PAT_TOKEN = process.env.NEXT_PUBLIC_COZE_PAT_TOKEN || "";
const COZE_TITLE = process.env.NEXT_PUBLIC_COZE_TITLE || "GEN-HUB AI";

// SDK version matching the embed code from Coze dashboard
const COZE_SDK_URL =
    "https://sf-cdn.coze.com/obj/unpkg-va/flow-platform/chat-app-sdk/1.2.0-beta.6/libs/oversea/index.js";

/**
 * Coze AI Chatbot – embeds the Coze Web SDK floating chat widget.
 * Requires NEXT_PUBLIC_COZE_BOT_ID and NEXT_PUBLIC_COZE_PAT_TOKEN to be set.
 */
export function CozeChatbot() {
    const initialized = useRef(false);

    useEffect(() => {
        if (initialized.current || !COZE_BOT_ID) return;
        initialized.current = true;

        const script = document.createElement("script");
        script.src = COZE_SDK_URL;
        script.async = true;

        script.onload = () => {
            if (window.CozeWebSDK) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const clientConfig: Record<string, any> = {
                    config: {
                        bot_id: COZE_BOT_ID,
                    },
                    componentProps: {
                        title: COZE_TITLE,
                    },
                };

                // Add auth if PAT token is provided
                if (COZE_PAT_TOKEN) {
                    clientConfig.auth = {
                        type: "token",
                        token: COZE_PAT_TOKEN,
                        onRefreshToken: () => COZE_PAT_TOKEN,
                    };
                }

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                new window.CozeWebSDK.WebChatClient(clientConfig as any);
            }
        };

        document.body.appendChild(script);

        return () => {
            // Cleanup: remove Coze script and any injected DOM
            try {
                document.body.removeChild(script);
            } catch {
                /* noop */
            }

            // Remove Coze injected container if present
            const cozeContainer = document.getElementById("coze-chatbot-container");
            if (cozeContainer) {
                cozeContainer.remove();
            }
        };
    }, []);

    if (!COZE_BOT_ID) {
        console.warn(
            "[CozeChatbot] NEXT_PUBLIC_COZE_BOT_ID is not set. Chatbot will not render.",
        );
        return null;
    }

    return null; // Coze SDK injects its own floating widget
}
