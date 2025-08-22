import React, { createContext, useContext, useState, ReactNode } from 'react';

interface Token {
  id: number;
  name: string;
  symbol: string;
  vault: string;
  token0: string;
  token1: string;
  price: number;
  [key: string]: any;
}

interface TokenContextType {
  selectedToken: Token | null;
  setSelectedToken: (token: Token | null) => void;
}

const TokenContext = createContext<TokenContextType | undefined>(undefined);

export const TokenProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);

  return (
    <TokenContext.Provider value={{ selectedToken, setSelectedToken }}>
      {children}
    </TokenContext.Provider>
  );
};

export const useToken = () => {
  const context = useContext(TokenContext);
  if (!context) {
    throw new Error('useToken must be used within a TokenProvider');
  }
  return context;
};