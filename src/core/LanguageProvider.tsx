import React, { createContext } from "react";

// Define the type for context value
export interface LanguageContextType {
  isSpanishCountry: boolean;
}

// Create a new context with the defined type
const LanguageContext = createContext<LanguageContextType>({
  isSpanishCountry: false,
});

// Create a context provider component
const LanguageProvider: React.FC<any> = ({ children }) => {
//   const { isSpanishCountry } = useIP();

  const contextValue: LanguageContextType = {
    isSpanishCountry: false,
  };

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
};

export { LanguageProvider, LanguageContext };
