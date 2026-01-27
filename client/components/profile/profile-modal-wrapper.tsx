'use client'

import { useProfileModal } from '@/contexts/ProfileModalContext'
import { ProfileDialog } from './profile-dialog'

export function ProfileModalWrapper() {
    const { isOpen, closeModal } = useProfileModal()

    return (
        <ProfileDialog
            open={isOpen}
            onOpenChange={(open) => {
                if (!open) closeModal()
            }}
        />
    )
}
