interface TokenData {
  id: string;
  timestamp: number;
  address?: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDescription: string;
  tokenDecimals: string;
  tokenSupply: string;
  logoPreview?: string;
  price: string;
  floorPrice: string;
  presalePrice: string;
  token1: string;
  selectedProtocol: string;
  presale: string;
  softCap: string;
  duration: string;
  deployerAddress?: string;
  transactionHash?: string;
  status: 'pending' | 'success' | 'failed';
}

const STORAGE_KEY = 'launchpad_tokens';

export const saveTokenData = (tokenData: Omit<TokenData, 'id' | 'timestamp'> & { deployerAddress?: string }): void => {
  try {
    // Get existing data
    const existingData = localStorage.getItem(STORAGE_KEY);
    const tokens: TokenData[] = existingData ? JSON.parse(existingData) : [];
    
    // Create new token entry
    const newToken: TokenData = {
      ...tokenData,
      id: `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      status: 'pending'
    };
    
    // Add to array
    tokens.push(newToken);
    
    // Save back to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
    
    console.log('Token data saved:', newToken);
  } catch (error) {
    console.error('Error saving token data:', error);
  }
};

export const getTokens = (): TokenData[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error retrieving tokens:', error);
    return [];
  }
};

export const updateTokenStatus = (tokenId: string, status: 'success' | 'failed', transactionHash?: string, address?: string): void => {
  try {
    const tokens = getTokens();
    const tokenIndex = tokens.findIndex(t => t.id === tokenId);
    
    if (tokenIndex !== -1) {
      tokens[tokenIndex].status = status;
      if (transactionHash) {
        tokens[tokenIndex].transactionHash = transactionHash;
      }
      if (address) {
        tokens[tokenIndex].address = address;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
    }
  } catch (error) {
    console.error('Error updating token status:', error);
  }
};

export const exportTokensAsJSON = (): void => {
  try {
    const tokens = getTokens();
    const dataStr = JSON.stringify(tokens, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `launchpad_tokens_${Date.now()}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  } catch (error) {
    console.error('Error exporting tokens:', error);
  }
};