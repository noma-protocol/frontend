import React, { useState } from 'react';
import {  HStack, Box, Button, Spinner, Text, VStack } from "@chakra-ui/react";
import { commify, commifyDecimals, } from '../utils';

import { isMobile } from "react-device-detect";
import bnbLogo from '../assets/images/bnb.png';

const LoanActiveLoan = ({}) => {


    return (
        <>
            <Text fontSize={isMobile?"12px":"15px"} fontWeight={"bold"} color="#a67c00">Active Loan</Text>
            <SimpleGrid columns={5} mt={-5}>
                <Box px={2} color="white" backgroundColor={"#a67c00"}> Collateral </Box>
                <Box px={2} color="white" backgroundColor={"#a67c00"}> Borrowed </Box>
                <Box px={2} color="white" backgroundColor={"#a67c00"}> 
                <HStack>
                    <Box><Text>LTV</Text></Box>
                    <Box><Image src={placeholderLogo} w={15} /></Box>
                </HStack>
                </Box>
                <Box px={2} color="white" backgroundColor={"#a67c00"}>
                Expires
                </Box>
                <Box px={2} color="white" backgroundColor={"#a67c00"}> Actions </Box>
                
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
                    <Box px={2}  mt={2} ml={-10}> 
                    <VStack>
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
                        variant={"outline"}
                        h={8}
                        // onClick={() => setIsLoading(true)}
                        disabled={isRolling || isLoading || isTokenInfoLoading || ltv <= 1}
                        w={"120px"}
                        border="1px solid #f3f7c6"
                    >
                    {isLoading ? <Spinner size="sm" /> : <Text color={"#f3f7c6"}>Roll</Text>}
                    </Button>
                    </DrawerTrigger>
                    <DrawerBackdrop />
                    <DrawerContent>
                        <Box mt="80%" ml={5}>
                        <DrawerHeader>
                            <DrawerTitle>
                                <Text as="h3" color="#a67c00">Roll Loan</Text>
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
                        <Box border="1px solid #a67c00" borderRadius="md" p={3} w="90%" >                              

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

                    </VStack>
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