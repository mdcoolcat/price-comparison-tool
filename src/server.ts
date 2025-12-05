// Express API server for price comparison tool

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { compareProductPrices } from './index';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Main price comparison endpoint
app.post('/api/search', async (req, res) => {
  try {
    const { input, mode = 'all' } = req.body;

    if (!input || typeof input !== 'string' || input.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Input is required and must be a non-empty string',
      });
    }

    // Validate mode
    const validModes = ['all', 'google', 'brave', 'tavily', 'mcp'];
    if (!validModes.includes(mode)) {
      return res.status(400).json({
        success: false,
        error: `Invalid mode. Must be one of: ${validModes.join(', ')}`,
      });
    }

    console.log(`Searching for: ${input} (mode: ${mode})`);

    const result = await compareProductPrices(input.trim(), mode);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

// Serve index.html for root path
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Price comparison server running at http://localhost:${PORT}`);
    console.log(`📊 API endpoint: http://localhost:${PORT}/api/search`);
  });
}

export default app;
