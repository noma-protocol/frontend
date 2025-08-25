import React, { useState } from 'react';
import {  HStack, Box, Button, Spinner, Text, VStack } from "@chakra-ui/react";
import { commify, commifyDecimals, } from '../utils';

import { isMobile } from "react-device-detect";
import bnbLogo from '../assets/images/bnb.png';

const LoanActiveLoan = ({}) => {


    return (
        <>
            <Text fontSize={isMobile?"12px":"15px"} fontWeight={"bold"} color="#4ade80">Active Loan</Text>
            <SimpleGrid columns={5} mt={-5}>
                <Box px={2} color="white" backgroundColor={"#4ade80"}> Collateral </Box>
                <Box px={2} color="white" backgroundColor={"#4ade80"}> Borrowed </Box>
                <Box px={2} color="white" backgroundColor={"#4ade80"}> 
                <HStack>
                    <Box><Text>LTV</Text></Box>
                    <Box><Image src={placeholderLogo} w={15} /></Box>
                </HStack>
                </Box>
                <Box px={2} color="white" backgroundColor={"#4ade80"}>
                Expires
                </Box>
                <Box px={2} color="white" backgroundColor={"#4ade80"}> Actions </Box>
                
                {loanData?.borrowAmount > 0 ? ( 
                    <>
                    <Box px={2} mt={2}> 
                        <HStack>
                            <Box  fontSize="sm">
                            {displayedCollateral}
                            </Box>
                            <Box  fontSize="xx-small">
                            {token0Info.tokenSymbol}
                            </Box>
                        </HStack>
                    </Box>
                    <Box px={2} mt={2}> 
                        <HStack>
                            <Box  fontSize="sm">
                            {commify(formatEther(`${loanData.borrowAmount}`), 4)}
                            </Box>
                            <Box  fontSize="xx-small">
                            {token1Info.tokenSymbol}
                            </Box>
                        </HStack>
                    </Box>
                    <Box px={2}  mt={2}> {commifyDecimals(ltv, 2)}</Box>
                    <Box px={2}  mt={2}> {getDaysLeft(`${loanData?.expires}`)} days</Box>
                    <Box px={2} mt={2}> 
                    <HStack spacing={2}>
                    <LoanAddCollateral
                        token0Symbol={token0Info.tokenSymbol}
                        handleSetCollateral={setExtraCollateral}
                        extraCollateral={extraCollateral}
                        isMobile={isMobile}
                        ltv={ltv}
                        handleClickAdd={handleClickAdd}
                        isAdding={isAdding}
                        setIsAdding={setIsAdding}
                        isLoading={isLoading}
                        setIsLoading={setIsLoading}
                        isTokenInfoLoading={isTokenInfoLoading}
                    />
                    <LoanRepay
                        fullCollateral={loanData?.collateralAmount}
                        loanAmount={loanData?.borrowAmount}
                        token0Symbol={token0Info.tokenSymbol}
                        repayAmount={repayAmount}
                        setRepayAmount={setRepayAmount}
                        handleClickRepayAmount={handleClickRepayAmount}
                        isRepaying={isRepaying}
                        setIsRepaying={setIsRepaying}
                        isMobile={isMobile}
                        imv={IMV}
                        ltv={ltv}
                        isLoading={isTokenInfoLoading}
                    />
                    <DrawerRoot >
                    <DrawerTrigger asChild>
                    <Button 
                        h="38px"
                        disabled={isRolling || isLoading || isTokenInfoLoading || ltv <= 1}
                        w="90px"
                        bg="rgba(255, 255, 255, 0.05)"
                        backdropFilter="blur(10px)"
                        color="white"
                        borderRadius="md"
                        border="1px solid rgba(255, 255, 255, 0.1)"
                        boxShadow="0 2px 8px rgba(0, 0, 0, 0.1)"
                        fontWeight="600"
                        fontSize="sm"
                        _hover={{
                            bg: "rgba(74, 222, 128, 0.1)",
                            transform: "translateY(-1px)",
                            boxShadow: "0 4px 12px rgba(74, 222, 128, 0.15)",
                            borderColor: "rgba(74, 222, 128, 0.3)"
                        }}
                        _active={{
                            transform: "translateY(0)",
                            boxShadow: "0 2px 6px rgba(74, 222, 128, 0.1)"
                        }}
                        _disabled={{
                            opacity: 0.6,
                            cursor: "not-allowed"
                        }}
                    >
                    {isLoading ? <Spinner size="sm" /> : "Roll"}
                    </Button>
                    </DrawerTrigger>
                    <DrawerBackdrop />
                    <DrawerContent>
                        <Box mt="80%" ml={5}>
                        <DrawerHeader>
                            <DrawerTitle>
                                <Text as="h3" color="#4ade80">Roll Loan</Text>
                            </DrawerTitle>
                            <DrawerCloseTrigger asChild mt="82%" mr={5} setIsRolling={setIsRolling}>
                                <Button variant="ghost" size="sm" onClick={() => setIsRolling(false)} mt={2} ml={-2}>×</Button>
                            </DrawerCloseTrigger>
                        </DrawerHeader>
                        <DrawerBody>
                            {/* <Input
                                placeholder="Amount to roll"
                                // onChange={(e) => setWrapAmount(e.target.value)}
                                w="80%"
                            /> */}
                        <Box border="1px solid #4ade80" borderRadius="md" p={3} w="90%" >                              

                            <HStack>
                                <Box w="120px"><Text fontSize="sm" color="#f3f7c6">New Duration:</Text></Box>
                                <Box><Text fontSize="sm" color="white">{duration / 86400} days</Text></Box>
                            </HStack>
                            <HStack>
                                <Box  w="120px"><Text fontSize="sm" c color="#f3f7c6">Expires On:</Text></Box>
                                <Box><Text fontSize="sm" color="white">{calculateExpiryDate(getDaysLeft(`${loanData?.expires}`))}</Text></Box>
                            </HStack>
                            <HStack>
                                <Box  w="120px"><Text fontSize="sm" color="#f3f7c6">Amount:</Text></Box>
                                <Box><Text fontSize="sm" color="white">{commifyDecimals(rollLoanAmount, 4)} {isTokenInfoLoading ? <Spinner size="sm" />: token1Info.tokenSymbol}</Text></Box>
                            </HStack>
                            <HStack>
                                <Box  w="120px"><Text fontSize="sm" color="#f3f7c6">Loan Fees:</Text></Box>
                                <Box>
                                    <Text color="white" fontSize="sm">
                                    {commifyDecimals((rollLoanAmount * 0.057 / 100) * (duration / 86400), 4)}&nbsp;
                                    {isTokenInfoLoading ? <Spinner size="sm" /> : token1Info.tokenSymbol}
                                    </Text></Box>
                            </HStack>
                        </Box>  
                        <Box mt={10}>
                        <DrawerActionTrigger asChild>
                                <Button variant="outline"  w="120px" onClick={() => setIsRolling(false)}>
                                    Cancel
                                </Button>
                                
                            </DrawerActionTrigger>
                            <Button colorScheme="blue" onClick={handleClickRoll} w="120px" ml={2}>
                                {isRolling ? <Spinner size="sm" /> : "Confirm"}
                            </Button>                                
                        </Box>                                
                        </DrawerBody>
                        </Box>
                        {/* <DrawerFooter>
                        </DrawerFooter> */}
                    </DrawerContent>
                    </DrawerRoot>

                    </HStack>
                    </Box>

                    </>
                ) : (
                    <>
                    <Box p={2}>
                    No Data
                    </Box>
                    <Box>

                    </Box>
                    <Box>
                    </Box>
                    </>
                )}
            </SimpleGrid>        
        </>
    );
}
export default LoanActiveLoan;