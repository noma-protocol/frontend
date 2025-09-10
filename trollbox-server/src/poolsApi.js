import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const poolsFilePath = path.join(__dirname, '../data/pools.json');

// Ensure pools.json exists
const ensurePoolsFile = () => {
  if (!fs.existsSync(poolsFilePath)) {
    fs.writeFileSync(poolsFilePath, JSON.stringify({ pools: [] }, null, 2));
  }
};

// Read pools from file
const readPools = () => {
  ensurePoolsFile();
  const data = fs.readFileSync(poolsFilePath, 'utf8');
  return JSON.parse(data);
};

// Write pools to file
const writePools = (poolsData) => {
  fs.writeFileSync(poolsFilePath, JSON.stringify(poolsData, null, 2));
};

// Add a new pool
export const addPool = (poolConfig) => {
  const poolsData = readPools();
  
  // Check if pool already exists
  const existingPool = poolsData.pools.find(
    p => p.address.toLowerCase() === poolConfig.address.toLowerCase()
  );
  
  if (existingPool) {
    console.log(`Pool ${poolConfig.address} already exists`);
    return existingPool;
  }
  
  // Add the new pool
  poolsData.pools.push(poolConfig);
  writePools(poolsData);
  
  console.log(`Added new pool: ${poolConfig.name} at ${poolConfig.address}`);
  return poolConfig;
};

// Update pool status
export const updatePoolStatus = (poolAddress, enabled) => {
  const poolsData = readPools();
  
  const pool = poolsData.pools.find(
    p => p.address.toLowerCase() === poolAddress.toLowerCase()
  );
  
  if (pool) {
    pool.enabled = enabled;
    writePools(poolsData);
    console.log(`Updated pool ${poolAddress} enabled status to ${enabled}`);
  }
  
  return pool;
};

// Get all pools
export const getPools = () => {
  return readPools();
};

// Create pool configuration for a new token
export const createPoolConfig = ({
  tokenName,
  tokenSymbol,
  tokenAddress,
  tokenDecimals,
  poolAddress,
  protocol = 'uniswap',
  feeTier = 3000,
  pairTokenSymbol = 'WMON',
  pairTokenAddress = '0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701',
  pairTokenDecimals = 18,
  isToken0 = true // Whether the new token is token0 or token1
}) => {
  const token0 = isToken0 ? {
    symbol: tokenSymbol,
    address: tokenAddress,
    decimals: parseInt(tokenDecimals)
  } : {
    symbol: pairTokenSymbol,
    address: pairTokenAddress,
    decimals: pairTokenDecimals
  };
  
  const token1 = isToken0 ? {
    symbol: pairTokenSymbol,
    address: pairTokenAddress,
    decimals: pairTokenDecimals
  } : {
    symbol: tokenSymbol,
    address: tokenAddress,
    decimals: parseInt(tokenDecimals)
  };
  
  return {
    name: `${tokenSymbol}/${pairTokenSymbol} ${protocol.charAt(0).toUpperCase() + protocol.slice(1)}`,
    address: poolAddress,
    protocol: protocol,
    version: 'v3',
    token0: token0,
    token1: token1,
    feeTier: feeTier,
    enabled: true,
    createdAt: new Date().toISOString()
  };
};

export default {
  addPool,
  updatePoolStatus,
  getPools,
  createPoolConfig
};