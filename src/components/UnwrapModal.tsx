import React, { memo } from 'react';
import Unwrap from './Unwrap';

interface UnwrapModalProps {
    isUnwrapping: boolean;
    setWrapAmount: (amount: string) => void;
    handleAction: () => void;
    setActionType: (type: string) => void;
    actionType: string;
    fontSize?: string;
    buttonSize?: string;
    token1Balance?: any;
    wrapAmount: string;
    size?: string;
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
}

const UnwrapModal = memo((props: UnwrapModalProps) => {
    return <Unwrap {...props} />;
}, (prevProps, nextProps) => {
    // Custom comparison to prevent unnecessary re-renders
    // Only re-render if these specific props change
    return (
        prevProps.isOpen === nextProps.isOpen &&
        prevProps.wrapAmount === nextProps.wrapAmount &&
        prevProps.isUnwrapping === nextProps.isUnwrapping &&
        prevProps.actionType === nextProps.actionType &&
        prevProps.token1Balance?.toString() === nextProps.token1Balance?.toString()
    );
});

UnwrapModal.displayName = 'UnwrapModal';

export default UnwrapModal;