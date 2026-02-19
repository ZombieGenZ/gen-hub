"use client";

import { cn } from "@/lib/utils";
import { User2, CheckCircle2, Clock } from "lucide-react";

export interface Signer {
    name: string;
    role: string;
    signed: boolean;
    signedAt?: string;
    avatar?: string;
}

interface SignerBadgesProps {
    signers: Signer[];
    className?: string;
}

/** Aboard-inspired signer chip bar */
export function SignerBadges({ signers, className }: SignerBadgesProps) {
    if (signers.length === 0) return null;

    return (
        <div className={cn("flex items-center gap-2 flex-wrap", className)}>
            <span className="text-xs text-muted-foreground font-medium mr-1">Bên ký:</span>
            {signers.map((signer, i) => (
                <div
                    key={i}
                    className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
                        signer.signed
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800"
                            : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800",
                    )}
                >
                    {signer.avatar ? (
                        <img
                            src={signer.avatar}
                            alt={signer.name}
                            className="w-4 h-4 rounded-full object-cover"
                        />
                    ) : (
                        <User2 className="w-3.5 h-3.5" />
                    )}
                    <span>{signer.name}</span>
                    {signer.signed ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    ) : (
                        <Clock className="w-3 h-3 text-amber-600" />
                    )}
                    <span className="text-[10px] opacity-70">
                        {signer.signed ? "Đã ký" : "Chờ ký"}
                    </span>
                </div>
            ))}
        </div>
    );
}
