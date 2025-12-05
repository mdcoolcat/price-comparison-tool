// MCP Proxy Server - Run this with Claude Code to provide MCP tools via HTTP
// This server is designed to be run BY Claude Code, giving it access to MCP tools

import express from 'express';
import cors from 'cors';

const app = express();
const PROXY_PORT = 3001;

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'MCP Proxy Server running' });
});

// Tavily Extract endpoint
app.post('/mcp/tavily-extract', async (req, res) => {
  try {
    const { urls } = req.body;

    if (!urls || !Array.isArray(urls)) {
      return res.status(400).json({ error: 'urls array is required' });
    }

    console.log('[MCP Proxy] Tavily Extract request:', urls);

    // This will be called BY Claude Code, which has access to MCP tools
    // For now, return a placeholder that Claude can fill in
    res.json({
      message: 'Please ask Claude Code to call mcp__tavily-mcp__tavily-extract tool',
      params: { urls, extract_depth: 'basic' },
      instruction: 'USE_MCP_TOOL:mcp__tavily-mcp__tavily-extract'
    });
  } catch (error) {
    console.error('[MCP Proxy] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Brave Search endpoint
app.post('/mcp/brave-search', async (req, res) => {
  try {
    const { query, count = 10 } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'query is required' });
    }

    console.log('[MCP Proxy] Brave Search request:', query);

    // Placeholder for Claude to fill in
    res.json({
      message: 'Please ask Claude Code to call mcp__brave-search__brave_web_search tool',
      params: { query, count: Math.min(count, 20) },
      instruction: 'USE_MCP_TOOL:mcp__brave-search__brave_web_search'
    });
  } catch (error) {
    console.error('[MCP Proxy] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Tavily Search endpoint
app.post('/mcp/tavily-search', async (req, res) => {
  try {
    const { query, max_results = 10 } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'query is required' });
    }

    console.log('[MCP Proxy] Tavily Search request:', query);

    // Placeholder for Claude to fill in
    res.json({
      message: 'Please ask Claude Code to call mcp__tavily-mcp__tavily-search tool',
      params: { query, max_results: Math.min(max_results, 20), search_depth: 'basic' },
      instruction: 'USE_MCP_TOOL:mcp__tavily-mcp__tavily-search'
    });
  } catch (error) {
    console.error('[MCP Proxy] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

if (require.main === module) {
  app.listen(PROXY_PORT, () => {
    console.log(`🔌 MCP Proxy Server running at http://localhost:${PROXY_PORT}`);
    console.log(`📡 Ready to proxy MCP tool calls from Claude Code`);
  });
}

export default app;
