import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface ModalContextType {
    isWrapModalOpen: boolean;
    setIsWrapModalOpen: (open: boolean) => void;
    isUnwrapModalOpen: boolean;
    setIsUnwrapModalOpen: (open: boolean) => void;
    openWrapModal: () => void;
    closeWrapModal: () => void;
    openUnwrapModal: () => void;
    closeUnwrapModal: () => void;
    wrapAmount: string;
    setWrapAmount: (amount: string) => void;
    actionType: string;
    setActionType: (type: string) => void;
    isWrapping: boolean;
    setIsWrapping: (wrapping: boolean) => void;
    isUnwrapping: boolean;
    setIsUnwrapping: (unwrapping: boolean) => void;
    bnbBalance?: any;
    setBnbBalance: (balance: any) => void;
    wethBalance?: any;
    setWethBalance: (balance: any) => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isWrapModalOpen, setIsWrapModalOpen] = useState(false);
    const [isUnwrapModalOpen, setIsUnwrapModalOpen] = useState(false);
    const [wrapAmount, setWrapAmount] = useState('');
    const [actionType, setActionType] = useState('');
    const [isWrapping, setIsWrapping] = useState(false);
    const [isUnwrapping, setIsUnwrapping] = useState(false);
    const [bnbBalance, setBnbBalance] = useState<any>();
    const [wethBalance, setWethBalance] = useState<any>();

    const openWrapModal = useCallback(() => {
        setActionType('wrap');
        setIsWrapModalOpen(true);
    }, []);
    
    const closeWrapModal = useCallback(() => setIsWrapModalOpen(false), []);
    
    const openUnwrapModal = useCallback(() => {
        setActionType('unwrap');
        setIsUnwrapModalOpen(true);
    }, []);
    
    const closeUnwrapModal = useCallback(() => setIsUnwrapModalOpen(false), []);

    return (
        <ModalContext.Provider
            value={{
                isWrapModalOpen,
                setIsWrapModalOpen,
                isUnwrapModalOpen,
                setIsUnwrapModalOpen,
                openWrapModal,
                closeWrapModal,
                openUnwrapModal,
                closeUnwrapModal,
                wrapAmount,
                setWrapAmount,
                actionType,
                setActionType,
                isWrapping,
                setIsWrapping,
                isUnwrapping,
                setIsUnwrapping,
                bnbBalance,
                setBnbBalance,
                wethBalance,
                setWethBalance
            }}
        >
            {children}
        </ModalContext.Provider>
    );
};

export const useModal = () => {
    const context = useContext(ModalContext);
    if (!context) {
        throw new Error('useModal must be used within a ModalProvider');
    }
    return context;
};