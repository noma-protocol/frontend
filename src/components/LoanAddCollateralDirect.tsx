import React, { useState } from 'react';
import { VStack, HStack, Box, Button, Spinner, Text } from "@chakra-ui/react";
import { formatNumberPrecise, commifyDecimals, commify } from '../utils';
import { formatEther, parseEther } from "viem";
import { useContractWrite } from 'wagmi';
import ExtVaultAbi from '../assets/ExtVault.json';

const LoanAddCollateralDirect = ({  
    size,
    token0Symbol, 
    extraCollateral, 
    handleSetCollateral, 
    handleSetExtraCollateral,
    isMobile, 
    ltv, 
    vaultAddress,
    address,
    setLoanHistory,
    isTokenInfoLoading, 
    token0Balance, 
    ...props
}) => {
    const [isAdding, setIsAdding] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    
    const {
        write: addCollateralDirect
    } = useContractWrite({
        address: vaultAddress,
        abi: ExtVaultAbi.abi,
        functionName: "addCollateral",
        args: [
            parseEther(`${extraCollateral}`),
        ],
        onSuccess(data) {
            console.log("Add collateral direct success:", data);
            setIsAdding(false);
            setIsLoading(false);
            
            // Manually add to loan history
            const newLoan = {
                id: Date.now() + Math.random(),
                type: "add_collateral",
                user: address,
                amount: parseFloat(extraCollateral),
                time: new Date(),
                txHash: data.hash,
                shortTxHash: `${data.hash.slice(0, 6)}...${data.hash.slice(-4)}`
            };
            
            setLoanHistory(prev => {
                const updated = [newLoan, ...prev.slice(0, 199)];
                try {
                    localStorage.setItem('noma_loan_history', JSON.stringify(updated));
                } catch (error) {
                    console.error("Error saving loan history:", error);
                }
                return updated;
            });
            
            setTimeout(() => {
                window.location.reload();
            }, 4000);
        },
        onError(error) {
            console.error("Add collateral direct failed:", error);
            setIsAdding(false);
            setIsLoading(false);
        }
    });
    
    const handleClickAdd = () => {
        if (Number(extraCollateral) <= 0) {
            return;
        }
        
        setIsAdding(true);
        setIsLoading(true);
        
        // Call the contract directly without approval
        // This will fail if there's no approval, but it will show the correct error
        addCollateralDirect();
    };

    const displayCollateral = extraCollateral >= 1000000 ? formatNumberPrecise(extraCollateral, 5) : commify(extraCollateral, 4);

    return (
        <Box w="100%" textAlign="center" display="flex" alignItems="center" justifyContent="center">
            <Button 
                h={size == "lg" ? "38px" : "32px"}
                disabled={isTokenInfoLoading || isAdding}
                w="100%"
                bg="linear-gradient(135deg, #4ade80 0%, #22c55e 100%)"
                backdropFilter="blur(10px)"
                color="black"
                borderRadius="md"
                border="1px solid rgba(74, 222, 128, 0.3)"
                boxShadow="0 4px 12px rgba(74, 222, 128, 0.2)"
                fontWeight="600"
                fontSize={size == "lg" ? "sm" : "xs"}
                _hover={{
                    bg: "linear-gradient(135deg, #3fd873 0%, #1cb350 100%)",
                    transform: "translateY(-1px)",
                    boxShadow: "0 6px 16px rgba(74, 222, 128, 0.25)"
                }}
                _active={{
                    transform: "translateY(0)",
                    boxShadow: "0 2px 8px rgba(74, 222, 128, 0.2)"
                }}
                _disabled={{
                    opacity: 0.6,
                    cursor: "not-allowed"
                }}
                onClick={handleClickAdd}
            >
                {isAdding ? <Spinner size="sm" /> : "Add (Direct)"}
            </Button>
        </Box>
    )
}

export default LoanAddCollateralDirect;