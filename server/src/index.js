const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3001;

// Data file path
const DATA_FILE = path.join(__dirname, 'tokens.json');

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

// Initialize data file if it doesn't exist
async function initDataFile() {
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify({ tokens: [] }, null, 2));
  }
}

// Read tokens from file
async function readTokens() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading tokens:', error);
    return { tokens: [] };
  }
}

// Write tokens to file
async function writeTokens(data) {
  try {
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error writing tokens:', error);
    throw error;
  }
}

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get all tokens
app.get('/api/tokens', async (req, res) => {
  try {
    const data = await readTokens();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve tokens' });
  }
});

// Get tokens by deployer address
app.get('/api/tokens/deployer/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const data = await readTokens();
    const deployerTokens = data.tokens.filter(
      token => token.deployerAddress?.toLowerCase() === address.toLowerCase()
    );
    res.json({ tokens: deployerTokens });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve tokens' });
  }
});

// Save new token
app.post('/api/tokens', async (req, res) => {
  try {
    const tokenData = req.body;
    
    // Validate required fields
    const requiredFields = ['tokenName', 'tokenSymbol', 'tokenSupply', 'price', 'floorPrice'];
    const missingFields = requiredFields.filter(field => !tokenData[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        missingFields 
      });
    }
    
    // Add metadata
    const newToken = {
      ...tokenData,
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      status: 'pending'
    };
    
    // Read current data
    const data = await readTokens();
    
    // Add new token
    data.tokens.push(newToken);
    
    // Save to file
    await writeTokens(data);
    
    res.status(201).json({ 
      message: 'Token saved successfully', 
      token: newToken 
    });
  } catch (error) {
    console.error('Error saving token:', error);
    res.status(500).json({ error: 'Failed to save token' });
  }
});

// Update token status
app.patch('/api/tokens/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, transactionHash, contractAddress } = req.body;
    
    if (!status || !['success', 'failed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be "success" or "failed"' });
    }
    
    const data = await readTokens();
    const tokenIndex = data.tokens.findIndex(token => token.id === id);
    
    if (tokenIndex === -1) {
      return res.status(404).json({ error: 'Token not found' });
    }
    
    // Update token
    data.tokens[tokenIndex] = {
      ...data.tokens[tokenIndex],
      status,
      ...(transactionHash && { transactionHash }),
      ...(contractAddress && { contractAddress }),
      updatedAt: new Date().toISOString()
    };
    
    await writeTokens(data);
    
    res.json({ 
      message: 'Token status updated successfully',
      token: data.tokens[tokenIndex]
    });
  } catch (error) {
    console.error('Error updating token status:', error);
    res.status(500).json({ error: 'Failed to update token status' });
  }
});

// Export tokens as JSON
app.get('/api/tokens/export', async (req, res) => {
  try {
    const data = await readTokens();
    const filename = `tokens_export_${new Date().toISOString().split('T')[0]}.json`;
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to export tokens' });
  }
});

// Get statistics
app.get('/api/tokens/stats', async (req, res) => {
  try {
    const data = await readTokens();
    const stats = {
      total: data.tokens.length,
      pending: data.tokens.filter(t => t.status === 'pending').length,
      success: data.tokens.filter(t => t.status === 'success').length,
      failed: data.tokens.filter(t => t.status === 'failed').length,
      lastDeployment: data.tokens.length > 0 
        ? data.tokens[data.tokens.length - 1].timestamp 
        : null
    };
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

// Start server
async function startServer() {
  await initDataFile();
  
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Available endpoints:');
    console.log('  GET  /api/health');
    console.log('  GET  /api/tokens');
    console.log('  GET  /api/tokens/deployer/:address');
    console.log('  POST /api/tokens');
    console.log('  PATCH /api/tokens/:id/status');
    console.log('  GET  /api/tokens/export');
    console.log('  GET  /api/tokens/stats');
  });
}

startServer().catch(console.error);