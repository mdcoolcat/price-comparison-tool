// MCP Bridge: Wrapper around MCP client
// This module re-exports the MCP client functions for backward compatibility

import { TavilyExtractResponse, BraveSearchResponse, TavilySearchResponse } from '../types';

// Import the MCP client functions
import * as mcpClient from './mcpClient';

/**
 * Extracts content from a URL using Tavily extract
 * @param url - URL to extract content from
 * @returns Extracted content
 */
export async function extractFromUrl(url: string): Promise<TavilyExtractResponse> {
  return mcpClient.extractFromUrl(url);
}

/**
 * Searches using Brave Search MCP tool
 * @param query - Search query
 * @param count - Number of results to return (default: 10)
 * @returns Search results
 */
export async function searchBrave(query: string, count: number = 10): Promise<BraveSearchResponse> {
  return mcpClient.searchBrave(query, count);
}

/**
 * Searches using Tavily Search MCP tool
 * @param query - Search query
 * @param maxResults - Maximum number of results (default: 10)
 * @returns Search results
 */
export async function searchTavily(query: string, maxResults: number = 10): Promise<TavilySearchResponse> {
  return mcpClient.searchTavily(query, maxResults);
}

/**
 * Searches both Brave and Tavily in parallel
 * @param query - Search query
 * @param count - Number of results per engine
 * @returns Combined results from both engines
 */
export async function searchBoth(
  query: string,
  count: number = 10
): Promise<{
  brave: BraveSearchResponse | null;
  tavily: TavilySearchResponse | null;
  errors: Error[];
}> {
  return mcpClient.searchBoth(query, count);
}
