"use client";

import React from "react";
import {
    EnvelopeIcon,
    ChatBubbleLeftEllipsisIcon,
    DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

type Channel = 'EMAIL' | 'LIVE_CHAT' | 'FORM';

const channelConfig: Record<Channel, {
    label: string;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    color: string;
}> = {
    EMAIL: { label: "Email", icon: EnvelopeIcon, color: "text-blue-500" },
    LIVE_CHAT: { label: "Live Chat", icon: ChatBubbleLeftEllipsisIcon, color: "text-emerald-500" },
    FORM: { label: "Form", icon: DocumentTextIcon, color: "text-violet-500" },
};

interface ChannelIconProps {
    channel: string;
    showLabel?: boolean;
    className?: string;
}

export function ChannelIcon({ channel, showLabel = false, className }: ChannelIconProps) {
    const config = channelConfig[channel as Channel] || channelConfig.FORM;
    const Icon = config.icon;

    return (
        <span className={cn("inline-flex items-center gap-1.5", className)}>
            <Icon className={cn("w-4 h-4", config.color)} />
            {showLabel && (
                <span className="text-xs text-slate-500">{config.label}</span>
            )}
        </span>
    );
}
