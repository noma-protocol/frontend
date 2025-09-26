// Centralized imports for provider usage
export { localProvider, getProvider, providerService } from '../services/providerService';

// Re-export for components that were importing JsonRpcProvider directly
export const createProvider = () => {
  console.warn('[DEPRECATED] createProvider() is deprecated. Use getProvider() instead.');
  return getProvider();
};