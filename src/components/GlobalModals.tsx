import React from 'react';
import Wrap from './Wrap';
import Unwrap from './Unwrap';
import { useModal } from '../contexts/ModalContext';

interface GlobalModalsProps {
    // Props that don't change frequently
    deposit?: () => void;
    withdraw?: () => void;
    exchangeHelperAddress?: string;
}

const GlobalModals: React.FC<GlobalModalsProps> = ({ deposit, withdraw, exchangeHelperAddress }) => {
    const {
        isWrapModalOpen,
        setIsWrapModalOpen,
        isUnwrapModalOpen,
        setIsUnwrapModalOpen,
        wrapAmount,
        setWrapAmount,
        actionType,
        setActionType,
        isWrapping,
        setIsWrapping,
        isUnwrapping,
        setIsUnwrapping,
        bnbBalance,
        wethBalance
    } = useModal();

    const handleWrapAction = () => {
        if (wrapAmount === '' || wrapAmount === '0') return;
        if (deposit && setIsWrapping) {
            setIsWrapping(true);
            deposit();
        }
    };

    const handleUnwrapAction = () => {
        if (wrapAmount === '' || wrapAmount === '0') return;
        if (withdraw && setIsUnwrapping) {
            setIsUnwrapping(true);
            withdraw();
        }
    };

    return (
        <>
            <Wrap
                wrapAmount={wrapAmount}
                isWrapping={isWrapping}
                setWrapAmount={setWrapAmount}
                handleAction={handleWrapAction}
                setActionType={setActionType}
                actionType={actionType}
                fontSize="sm"
                buttonSize="100%"
                bnbBalance={bnbBalance}
                size="lg"
                isOpen={isWrapModalOpen}
                setIsOpen={setIsWrapModalOpen}
            />
            <Unwrap
                isUnwrapping={isUnwrapping}
                setWrapAmount={setWrapAmount}
                handleAction={handleUnwrapAction}
                setActionType={setActionType}
                actionType={actionType}
                fontSize="sm"
                buttonSize="100%"
                token1Balance={wethBalance}
                wrapAmount={wrapAmount}
                size="lg"
                isOpen={isUnwrapModalOpen}
                setIsOpen={setIsUnwrapModalOpen}
            />
        </>
    );
};

export default GlobalModals;