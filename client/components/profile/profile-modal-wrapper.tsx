'use client'

import { useProfileModal } from '@/contexts/ProfileModalContext'
import { ProfileDialog } from './profile-dialog'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

export function ProfileModalWrapper() {
    const { isOpen, closeModal } = useProfileModal()
    const pathname = usePathname()

    useEffect(() => {
        closeModal()
    }, [pathname, closeModal])

    return (
        <ProfileDialog
            open={isOpen}
            onOpenChange={(open) => {
                if (!open) closeModal()
            }}
        />
    )
}
