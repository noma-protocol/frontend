import React, { memo } from 'react';
import WrapModal from './WrapModal';
import UnwrapModal from './UnwrapModal';

interface WrapUnwrapModalsProps {
    // Wrap props
    wrapAmount: string;
    isWrapping: boolean;
    setWrapAmount: (amount: string) => void;
    handleWrapAction: () => void;
    wrapActionType: string;
    setWrapActionType: (type: string) => void;
    bnbBalance?: any;
    isWrapOpen: boolean;
    setIsWrapOpen: (open: boolean) => void;
    
    // Unwrap props
    isUnwrapping: boolean;
    handleUnwrapAction: () => void;
    unwrapActionType: string;
    setUnwrapActionType: (type: string) => void;
    token1Balance?: any;
    isUnwrapOpen: boolean;
    setIsUnwrapOpen: (open: boolean) => void;
}

const WrapUnwrapModals = memo((props: WrapUnwrapModalsProps) => {
    return (
        <>
            <WrapModal
                wrapAmount={props.wrapAmount}
                isWrapping={props.isWrapping}
                setWrapAmount={props.setWrapAmount}
                handleAction={props.handleWrapAction}
                setActionType={props.setWrapActionType}
                actionType={props.wrapActionType}
                fontSize="xs"
                buttonSize="60px"
                bnbBalance={props.bnbBalance}
                size="lg"
                isOpen={props.isWrapOpen}
                setIsOpen={props.setIsWrapOpen}
            />
            <UnwrapModal
                isUnwrapping={props.isUnwrapping}
                setWrapAmount={props.setWrapAmount}
                handleAction={props.handleUnwrapAction}
                setActionType={props.setUnwrapActionType}
                actionType={props.unwrapActionType}
                fontSize="xs"
                buttonSize="60px"
                token1Balance={props.token1Balance}
                wrapAmount={props.wrapAmount}
                size="lg"
                isOpen={props.isUnwrapOpen}
                setIsOpen={props.setIsUnwrapOpen}
            />
        </>
    );
});

WrapUnwrapModals.displayName = 'WrapUnwrapModals';

export default WrapUnwrapModals;