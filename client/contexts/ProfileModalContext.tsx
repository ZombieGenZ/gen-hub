import React, { createContext, useContext, useState, useCallback, useMemo } from 'react'

interface ProfileModalContextType {
    isOpen: boolean
    openModal: () => void
    closeModal: () => void
    // Deposit modal
    isDepositOpen: boolean
    opendepositModal: () => void
    closedepositModal: () => void
}

const ProfileModalContext = createContext<ProfileModalContextType | undefined>(undefined)

export function ProfileModalProvider({ children }: { children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false)
    const [isDepositOpen, setIsDepositOpen] = useState(false)

    const openModal = useCallback(() => {
        setIsOpen(true)
    }, [])

    const closeModal = useCallback(() => setIsOpen(false), [])

    const opendepositModal = useCallback(() => {
        setIsDepositOpen(true)
    }, [])

    const closedepositModal = useCallback(() => setIsDepositOpen(false), [])

    const value = useMemo(
        () => ({ isOpen, openModal, closeModal, isDepositOpen, opendepositModal, closedepositModal }),
        [isOpen, openModal, closeModal, isDepositOpen, opendepositModal, closedepositModal],
    )

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
