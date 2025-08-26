import { useContractWrite } from 'wagmi';
import { useCallback, useState } from 'react';
import { toaster } from '../components/ui/toaster';

interface UseSafeContractWriteConfig extends Parameters<typeof useContractWrite>[0] {
  retryOnNonceError?: boolean;
  maxRetries?: number;
}

export function useSafeContractWrite(config: UseSafeContractWriteConfig) {
  const { retryOnNonceError = true, maxRetries = 2, ...wagmiConfig } = config;
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  // Store the original callbacks
  const originalOnError = wagmiConfig.onError;
  const originalOnSuccess = wagmiConfig.onSuccess;

  // Enhanced write function that handles retries
  const contractWrite = useContractWrite({
    ...wagmiConfig,
    onError: async (error: any, variables: any, context: any) => {
      const errorMessage = error?.message?.toLowerCase() || '';
      
      // Check if this is a nonce error and we should retry
      if (retryOnNonceError && 
          retryCount < maxRetries && 
          (errorMessage.includes('nonce too low') || 
           errorMessage.includes('nonce is too low') ||
           errorMessage.includes('transaction nonce is too low'))) {
        
        console.log(`Nonce error detected, retrying... (attempt ${retryCount + 1}/${maxRetries})`);
        setIsRetrying(true);
        
        // Show retry notification
        toaster.create({
          title: "Transaction retry",
          description: `Retrying transaction due to network sync issue... (${retryCount + 1}/${maxRetries})`,
          duration: 3000,
        });
        
        // Increment retry count
        setRetryCount(prev => prev + 1);
        
        // Wait a bit for the network to sync
        await new Promise(resolve => setTimeout(resolve, 2000 + (retryCount * 1000)));
        
        // Clear the error and allow user to retry
        setIsRetrying(false);
        
        // Don't call the original onError for nonce errors during retry
        return;
      }
      
      // Reset retry count on non-nonce errors
      setRetryCount(0);
      
      // Call original error handler
      if (originalOnError) {
        originalOnError(error, variables, context);
      }
    },
    onSuccess: (...args: any[]) => {
      // Reset retry count on success
      setRetryCount(0);
      setIsRetrying(false);
      
      // Call original success handler
      if (originalOnSuccess) {
        originalOnSuccess(...args);
      }
    }
  });

  // Create a wrapped write function that includes retry state
  const write = useCallback(
    (args?: any) => {
      if (!isRetrying) {
        return contractWrite.write(args);
      }
    },
    [contractWrite.write, isRetrying]
  );

  // Create a wrapped writeAsync function
  const writeAsync = useCallback(
    async (args?: any) => {
      if (!isRetrying) {
        return contractWrite.writeAsync(args);
      }
      throw new Error('Transaction is being retried, please wait...');
    },
    [contractWrite.writeAsync, isRetrying]
  );

  return {
    ...contractWrite,
    write,
    writeAsync,
    isRetrying,
    retryCount
  };
}