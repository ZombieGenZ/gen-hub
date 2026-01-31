import React, { createContext, useContext, useState, useCallback, useMemo } from 'react'

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

    const openModal = useCallback(() => {
        console.log('openModal called')
        setIsOpen(true)
    }, [])

    const closeModal = useCallback(() => setIsOpen(false), [])

    const value = useMemo(() => ({ isOpen, openModal, closeModal }), [isOpen, openModal, closeModal])

    return (
        <ProfileModalContext.Provider value={value}>
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
