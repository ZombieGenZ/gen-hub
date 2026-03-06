"use client";

import { useEffect, useState } from "react";
import { DepositModal } from "@/components/modals/deposit-modal";
import { useProfileModal } from "@/contexts/ProfileModalContext";
import { authStorage } from "@/services/auth/auth-storage.service";
import { orgHelper } from "@/lib/organization.utils";
import {
    accountBalanceService,
} from "@/services/account-balance/account-balance.service";

/**
 * A globally mounted DepositModal driven by ProfileModalContext.
 * Resolves orgId + currentBalance on-the-fly when opened.
 */
export function GlobalDepositModal() {
    const { isDepositOpen, closedepositModal } = useProfileModal();
    const [orgId, setOrgId] = useState<string | undefined>(undefined);
    const [currentBalance, setCurrentBalance] = useState<number>(0);

    // Resolve org + balance each time the modal opens
    useEffect(() => {
        if (!isDepositOpen) return;
        (async () => {
            try {
                const token = authStorage.getAccessToken();
                if (!token) return;
                const id = await orgHelper.getOrgId(token);
                setOrgId(id);
                const bal = await accountBalanceService.getOrganizationBalance(token, id);
                setCurrentBalance(bal.balance ?? 0);
            } catch {
                // Silently fail — modal will still open with defaults
            }
        })();
    }, [isDepositOpen]);

    return (
        <DepositModal
            open={isDepositOpen}
            onOpenChange={(open) => { if (!open) closedepositModal(); }}
            orgId={orgId}
            currentBalance={currentBalance}
        />
    );
}
