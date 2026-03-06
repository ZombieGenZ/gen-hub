'use client'

import { ProfileModalProvider } from '@/contexts/ProfileModalContext'
import { ProfileModalWrapper } from '@/components/profile/profile-modal-wrapper'
import { GlobalDepositModal } from '@/components/modals/global-deposit-modal'

export function ProfileModalProviderWrapper({ children }: { children: React.ReactNode }) {
    return (
        <ProfileModalProvider>
            {children}
            <ProfileModalWrapper />
            <GlobalDepositModal />
        </ProfileModalProvider>
    )
}
