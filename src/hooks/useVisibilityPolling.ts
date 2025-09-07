import { useEffect, useRef } from 'react';

/**
 * Custom hook that runs a callback at specified intervals only when the page is visible
 * This helps reduce unnecessary RPC calls when the user is not actively viewing the page
 */
export const useVisibilityPolling = (
  callback: () => void | Promise<void>,
  interval: number,
  dependencies: React.DependencyList = []
) => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    const runCallback = async () => {
      if (document.visibilityState === 'visible') {
        await callback();
      }
    };

    // Run immediately if visible
    if (document.visibilityState === 'visible') {
      callback();
    }

    const startPolling = () => {
      // Clear any existing interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      // Only start polling if the page is visible
      if (document.visibilityState === 'visible') {
        intervalRef.current = setInterval(runCallback, interval);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Page became visible - run callback immediately and start polling
        callback();
        startPolling();
      } else {
        // Page became hidden - stop polling
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    };

    // Start initial polling
    startPolling();

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [interval, ...dependencies]);
};