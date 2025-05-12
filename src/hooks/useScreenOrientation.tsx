import { useState, useEffect } from 'react';

/**
 * Custom hook to detect screen orientation
 * @returns The current screen orientation ("portrait", "landscape", or other orientation values)
 */
export const useScreenOrientation = () => {
  // Initialize with current orientation or fallback based on dimensions
  const [orientation, setOrientation] = useState(
    window.screen.orientation?.type || 
    (window.innerWidth > window.innerHeight ? "landscape" : "portrait")
  );

  useEffect(() => {
    const handleOrientationChange = () => {
      // Check if window.screen.orientation is supported
      if (window.screen.orientation) {
        setOrientation(window.screen.orientation.type);
      } else {
        // Fallback for browsers that don't support window.screen.orientation
        setOrientation(window.innerWidth > window.innerHeight ? "landscape" : "portrait");
      }
    };

    // Add event listeners
    window.addEventListener("orientationchange", handleOrientationChange);
    window.addEventListener("resize", handleOrientationChange);

    // Initial check
    handleOrientationChange();

    // Cleanup
    return () => {
      window.removeEventListener("orientationchange", handleOrientationChange);
      window.removeEventListener("resize", handleOrientationChange);
    };
  }, []);

  return orientation;
};

export default useScreenOrientation;