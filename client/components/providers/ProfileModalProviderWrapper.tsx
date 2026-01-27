'use client'

import { ProfileModalProvider } from '@/contexts/ProfileModalContext'
import { ProfileModalWrapper } from '@/components/profile/profile-modal-wrapper'

export function ProfileModalProviderWrapper({ children }: { children: React.ReactNode }) {
    return (
        <ProfileModalProvider>
            {children}
            <ProfileModalWrapper />
        </ProfileModalProvider>
    )
}
