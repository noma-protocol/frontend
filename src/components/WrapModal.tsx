import React, { memo } from 'react';
import Wrap from './Wrap';

interface WrapModalProps {
    wrapAmount: string;
    isWrapping: boolean;
    setWrapAmount: (amount: string) => void;
    handleAction: () => void;
    setActionType: (type: string) => void;
    actionType: string;
    fontSize?: string;
    buttonSize?: string;
    bnbBalance?: any;
    size?: string;
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
}

const WrapModal = memo((props: WrapModalProps) => {
    return <Wrap {...props} />;
}, (prevProps, nextProps) => {
    // Custom comparison to prevent unnecessary re-renders
    // Only re-render if these specific props change
    return (
        prevProps.isOpen === nextProps.isOpen &&
        prevProps.wrapAmount === nextProps.wrapAmount &&
        prevProps.isWrapping === nextProps.isWrapping &&
        prevProps.actionType === nextProps.actionType &&
        prevProps.bnbBalance?.toString() === nextProps.bnbBalance?.toString()
    );
});

WrapModal.displayName = 'WrapModal';

export default WrapModal;