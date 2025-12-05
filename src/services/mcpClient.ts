// MCP Client - Connects to Brave and Tavily MCP servers
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { TavilyExtractResponse, BraveSearchResponse, TavilySearchResponse } from '../types';

class MCPClientManager {
  private braveClient: Client | null = null;
  private tavilyClient: Client | null = null;
  private braveTransport: StdioClientTransport | null = null;
  private tavilyTransport: StdioClientTransport | null = null;
  private initPromise: Promise<void> | null = null;

  async initialize() {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._doInitialize();
    return this.initPromise;
  }

  private async _doInitialize() {
    console.log('[MCP Client] Initializing MCP clients...');

    // Initialize Brave Search client
    try {
      this.braveTransport = new StdioClientTransport({
        command: 'node',
        args: [require.resolve('@modelcontextprotocol/server-brave-search/dist/index.js')],
        env: {
          ...process.env,
          BRAVE_API_KEY: process.env.BRAVE_API_KEY || '',
        },
      });

      this.braveClient = new Client(
        {
          name: 'price-comparison-brave-client',
          version: '1.0.0',
        },
        {
          capabilities: {},
        }
      );

      await this.braveClient.connect(this.braveTransport);
      console.log('[MCP Client] Brave Search client connected');
    } catch (error) {
      console.error('[MCP Client] Failed to connect to Brave:', error);
      this.braveClient = null;
    }

    // Initialize Tavily client
    try {
      this.tavilyTransport = new StdioClientTransport({
        command: 'node',
        args: [require.resolve('tavily-mcp/build/index.js')],
        env: {
          ...process.env,
          TAVILY_API_KEY: process.env.TAVILY_API_KEY || '',
        },
      });

      this.tavilyClient = new Client(
        {
          name: 'price-comparison-tavily-client',
          version: '1.0.0',
        },
        {
          capabilities: {},
        }
      );

      await this.tavilyClient.connect(this.tavilyTransport);
      console.log('[MCP Client] Tavily client connected');
    } catch (error) {
      console.error('[MCP Client] Failed to connect to Tavily:', error);
      this.tavilyClient = null;
    }

    if (!this.braveClient && !this.tavilyClient) {
      throw new Error('Failed to connect to any MCP servers');
    }
  }

  async callBraveSearch(query: string, count: number = 10): Promise<BraveSearchResponse> {
    await this.initialize();

    if (!this.braveClient) {
      throw new Error('Brave Search client not available');
    }

    console.log('[MCP Client] Calling Brave Search:', query);

    try {
      const response = await this.braveClient.callTool({
        name: 'brave_web_search',
        arguments: {
          query,
          count: Math.min(count, 20),
        },
      });

      console.log('[MCP Client] Brave response type:', response.content[0]?.type);

      // Parse the response based on type
      if (response.content[0]?.type === 'text') {
        const textContent = (response.content[0] as any).text;

        // Parse the text format: "Title: ...\nDescription: ...\nURL: ..."
        const results: any[] = [];
        const entries = textContent.split('\n\n');

        for (const entry of entries) {
          const lines = entry.trim().split('\n');
          const result: any = {};

          for (const line of lines) {
            if (line.startsWith('Title: ')) {
              result.title = line.substring(7).trim();
            } else if (line.startsWith('Description: ')) {
              result.description = line.substring(13).trim();
            } else if (line.startsWith('URL: ')) {
              result.url = line.substring(5).trim();
            }
          }

          if (result.title && result.url) {
            console.log('[MCP Client] Brave result:', JSON.stringify({ title: result.title, desc: result.description?.substring(0, 200) }));
            results.push(result);
          }
        }

        console.log('[MCP Client] Brave parsed', results.length, 'results');
        return { web: { results } };
      }

      return response.content[0] as any;
    } catch (error) {
      console.error('[MCP Client] Brave search error:', error);
      throw error;
    }
  }

  async callTavilySearch(query: string, maxResults: number = 10): Promise<TavilySearchResponse> {
    await this.initialize();

    if (!this.tavilyClient) {
      throw new Error('Tavily client not available');
    }

    console.log('[MCP Client] Calling Tavily Search:', query);

    try {
      const response = await this.tavilyClient.callTool({
        name: 'tavily-search',
        arguments: {
          query,
          max_results: Math.min(maxResults, 20),
          search_depth: 'basic',
        },
      });

      console.log('[MCP Client] Tavily response type:', response.content[0]?.type);

      // Parse the response based on type
      if (response.content[0]?.type === 'text') {
        const textContent = (response.content[0] as any).text;

        // Parse the text format: "Title: ...\nURL: ...\nContent: ..."
        const results: any[] = [];
        const entries = textContent.split('\n\n');

        for (const entry of entries) {
          const lines = entry.trim().split('\n');
          const result: any = {};

          for (const line of lines) {
            if (line.startsWith('Title: ')) {
              result.title = line.substring(7).trim();
            } else if (line.startsWith('Content: ')) {
              result.content = line.substring(9).trim();
            } else if (line.startsWith('URL: ')) {
              result.url = line.substring(5).trim();
            }
          }

          if (result.title && result.url) {
            console.log('[MCP Client] Tavily result:', JSON.stringify({ title: result.title, content: result.content?.substring(0, 200) }));
            results.push(result);
          }
        }

        console.log('[MCP Client] Tavily parsed', results.length, 'results');
        return { results };
      }

      return response.content[0] as any;
    } catch (error) {
      console.error('[MCP Client] Tavily search error:', error);
      throw error;
    }
  }

  async callTavilyExtract(url: string): Promise<TavilyExtractResponse> {
    await this.initialize();

    if (!this.tavilyClient) {
      throw new Error('Tavily client not available');
    }

    console.log('[MCP Client] Calling Tavily Extract:', url);

    const response = await this.tavilyClient.callTool({
      name: 'tavily-extract',
      arguments: {
        urls: [url],
        extract_depth: 'basic',
      },
    });

    return response.content[0] as any;
  }

  async close() {
    if (this.braveClient) {
      await this.braveClient.close();
      this.braveClient = null;
    }
    if (this.tavilyClient) {
      await this.tavilyClient.close();
      this.tavilyClient = null;
    }
    this.initPromise = null;
    console.log('[MCP Client] Closed all connections');
  }
}

// Singleton instance
const mcpClient = new MCPClientManager();

// Export functions that use the singleton
export async function searchBrave(query: string, count: number = 10): Promise<BraveSearchResponse> {
  return mcpClient.callBraveSearch(query, count);
}

export async function searchTavily(query: string, maxResults: number = 10): Promise<TavilySearchResponse> {
  return mcpClient.callTavilySearch(query, maxResults);
}

export async function extractFromUrl(url: string): Promise<TavilyExtractResponse> {
  return mcpClient.callTavilyExtract(url);
}

export async function searchBoth(
  query: string,
  count: number = 10
): Promise<{
  brave: BraveSearchResponse | null;
  tavily: TavilySearchResponse | null;
  errors: Error[];
}> {
  const errors: Error[] = [];
  let braveResult: BraveSearchResponse | null = null;
  let tavilyResult: TavilySearchResponse | null = null;

  const [bravePromise, tavilyPromise] = await Promise.allSettled([
    searchBrave(query, count),
    searchTavily(query, count),
  ]);

  if (bravePromise.status === 'fulfilled') {
    braveResult = bravePromise.value;
  } else {
    errors.push(bravePromise.reason);
    console.warn('Brave search failed:', bravePromise.reason.message);
  }

  if (tavilyPromise.status === 'fulfilled') {
    tavilyResult = tavilyPromise.value;
  } else {
    errors.push(tavilyPromise.reason);
    console.warn('Tavily search failed:', tavilyPromise.reason.message);
  }

  if (!braveResult && !tavilyResult) {
    throw new Error('Both search engines failed');
  }

  return {
    brave: braveResult,
    tavily: tavilyResult,
    errors,
  };
}

// Cleanup on process exit
process.on('exit', () => {
  mcpClient.close().catch(console.error);
});

process.on('SIGINT', () => {
  mcpClient.close().then(() => process.exit(0)).catch(() => process.exit(1));
});

export default mcpClient;
