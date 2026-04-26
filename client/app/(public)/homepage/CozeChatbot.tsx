"use client";

import React, { useEffect, useRef } from "react";

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
                el?: HTMLElement;
            }) => unknown;
        };
    }
}

const COZE_BOT_ID = process.env.NEXT_PUBLIC_COZE_BOT_ID || "";
const COZE_TITLE = process.env.NEXT_PUBLIC_COZE_TITLE || "GEN-HUB AI";

/**
 * Coze AI Chatbot – embeds the Coze Web SDK floating chat widget.
 * Requires NEXT_PUBLIC_COZE_BOT_ID to be set.
 */
export function CozeChatbot() {
    const initialized = useRef(false);

    useEffect(() => {
        if (initialized.current || !COZE_BOT_ID) return;
        initialized.current = true;

        const script = document.createElement("script");
        script.src =
            "https://sf-cdn.coze.com/obj/unpkg-va/flow-platform/chat-app-sdk/1.0.0-beta.4/libs/oversea/index.js";
        script.async = true;

        script.onload = () => {
            if (window.CozeWebSDK) {
                new window.CozeWebSDK.WebChatClient({
                    config: {
                        bot_id: COZE_BOT_ID,
                    },
                    componentProps: {
                        title: COZE_TITLE,
                    },
                });
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
