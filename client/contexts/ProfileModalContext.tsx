'use client'

import React, { createContext, useContext, useState } from 'react'

interface ProfileModalContextType {
    isOpen: boolean
    openModal: () => void
    closeModal: () => void
}

const ProfileModalContext = createContext<ProfileModalContextType | undefined>(undefined)

export function ProfileModalProvider({ children }: { children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false)

    // Debug logging
    React.useEffect(() => {
        console.log('ProfileModalProvider mounted')
        return () => console.log('ProfileModalProvider unmounted')
    }, [])

    const openModal = () => {
        console.log('openModal called')
        setIsOpen(true)
    }
    const closeModal = () => setIsOpen(false)

    return (
        <ProfileModalContext.Provider value={{ isOpen, openModal, closeModal }}>
            {children}
        </ProfileModalContext.Provider>
    )
}

export function useProfileModal() {
    const context = useContext(ProfileModalContext)
    if (context === undefined) {
        throw new Error('useProfileModal must be used within ProfileModalProvider')
    }
    return context
}
