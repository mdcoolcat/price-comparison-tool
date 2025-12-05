// MCP Proxy Service - HTTP client to call Claude Code's MCP proxy endpoints
// This runs IN the Node.js app and makes HTTP requests to a separate MCP proxy server

import { TavilyExtractResponse, BraveSearchResponse, TavilySearchResponse } from '../types';

const MCP_PROXY_URL = process.env.MCP_PROXY_URL || 'http://localhost:3001';

/**
 * Call Tavily Extract via MCP proxy
 */
export async function extractFromUrl(url: string): Promise<TavilyExtractResponse> {
  try {
    const response = await fetch(`${MCP_PROXY_URL}/mcp/tavily-extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls: [url] }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    return await response.json();
  } catch (error) {
    throw new Error(`Failed to extract from URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Call Brave Search via MCP proxy
 */
export async function searchBrave(query: string, count: number = 10): Promise<BraveSearchResponse> {
  try {
    const response = await fetch(`${MCP_PROXY_URL}/mcp/brave-search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, count }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    return await response.json();
  } catch (error) {
    throw new Error(`Brave search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Call Tavily Search via MCP proxy
 */
export async function searchTavily(query: string, maxResults: number = 10): Promise<TavilySearchResponse> {
  try {
    const response = await fetch(`${MCP_PROXY_URL}/mcp/tavily-search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, max_results: maxResults }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    return await response.json();
  } catch (error) {
    throw new Error(`Tavily search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Search both engines in parallel
 */
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
