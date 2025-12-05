// Search service to coordinate searches across multiple engines

import { searchBoth } from '../services/mcpBridge';
import { searchGoogleShopping } from '../services/googleShopping';
import { SearchResult } from '../types';

export type SearchMode = 'all' | 'google' | 'brave' | 'tavily' | 'mcp';

/**
 * Searches for a product across selected search engines
 * @param productName - Name of product to search for
 * @param count - Number of results per engine (default: 10)
 * @param mode - Search mode: 'all', 'google', 'brave', 'tavily', or 'mcp' (brave+tavily)
 * @returns Combined array of search results
 */
export async function searchProduct(
  productName: string,
  count: number = 10,
  mode: SearchMode = 'all'
): Promise<SearchResult[]> {
  if (!productName || productName.trim().length === 0) {
    throw new Error('Product name cannot be empty');
  }

  // Enhance search query for better results
  const searchQuery = enhanceSearchQuery(productName);

  try {
    const results: SearchResult[] = [];
    let errors: Error[] = [];

    // Determine which engines to search based on mode
    const searchGoogle = mode === 'all' || mode === 'google';
    const searchBraveAndTavily = mode === 'all' || mode === 'mcp' || mode === 'brave' || mode === 'tavily';

    // Search engines in parallel based on mode
    const promises: Promise<any>[] = [];

    if (searchBraveAndTavily) {
      promises.push(searchBoth(searchQuery, count));
    }

    if (searchGoogle) {
      promises.push(searchGoogleShopping(searchQuery, count));
    }

    const settled = await Promise.all(promises);
    let mcpResults: any = null;
    let googleResults: SearchResult[] = [];

    // Parse results based on what we searched
    let resultIndex = 0;
    if (searchBraveAndTavily) {
      mcpResults = settled[resultIndex++];
    }
    if (searchGoogle) {
      googleResults = settled[resultIndex++];
    }

    // Process MCP results (Brave and/or Tavily)
    if (mcpResults) {
      const { brave, tavily, errors: mcpErrors } = mcpResults;
      errors = mcpErrors;

      // Process Brave results if needed
      if ((mode === 'all' || mode === 'mcp' || mode === 'brave') && brave && brave.results?.web?.results) {
        for (const result of brave.results.web.results) {
          results.push({
            title: result.title,
            url: result.url,
            snippet: result.description,
            description: result.description,
            source: 'brave',
          });
        }
      }

      // Process Tavily results if needed
      if ((mode === 'all' || mode === 'mcp' || mode === 'tavily') && tavily && tavily.results) {
        for (const result of tavily.results) {
          results.push({
            title: result.title,
            url: result.url,
            snippet: result.content, // Keep full content for price extraction
            description: result.content, // Keep full content for price extraction
            source: 'tavily',
          });
        }
      }
    }

    // Process Google Shopping results
    if (searchGoogle && googleResults && googleResults.length > 0) {
      results.push(...googleResults);
    }

    // Log any errors but continue with available results
    if (errors.length > 0) {
      console.warn(`Search completed with ${errors.length} error(s):`, errors.map(e => e.message));
    }

    if (results.length === 0) {
      throw new Error('No search results found from any engine');
    }

    // Remove duplicates based on URL
    const uniqueResults = deduplicateResults(results);

    // Filter out non-ecommerce sites (YouTube, Reddit, etc.)
    const ecommerceResults = filterEcommerceResults(uniqueResults);

    console.log(`[Search] Found ${ecommerceResults.length} e-commerce results (mode: ${mode})`);
    return ecommerceResults;
  } catch (error) {
    throw new Error(
      `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Enhances search query to find pricing information
 */
function enhanceSearchQuery(productName: string): string {
  // Check if query already contains pricing-related keywords
  const lowerQuery = productName.toLowerCase();
  const hasPricingKeyword = ['price', 'buy', 'shop', 'purchase'].some(k => lowerQuery.includes(k));

  // If no pricing keyword, add "price"
  if (!hasPricingKeyword) {
    return `${productName} price`;
  }

  return productName;
}

/**
 * Removes duplicate results based on URL similarity
 */
function deduplicateResults(results: SearchResult[]): SearchResult[] {
  const seen = new Set<string>();
  const unique: SearchResult[] = [];

  for (const result of results) {
    // Normalize URL for comparison (remove protocol, www, trailing slash, query params)
    const normalizedUrl = normalizeUrlForDedup(result.url);

    if (!seen.has(normalizedUrl)) {
      seen.add(normalizedUrl);
      unique.push(result);
    }
  }

  return unique;
}

/**
 * Normalizes URL for deduplication
 */
function normalizeUrlForDedup(url: string): string {
  try {
    const parsed = new URL(url);

    // Remove protocol, www, and trailing slash
    let normalized = parsed.hostname.replace(/^www\./, '') + parsed.pathname;
    normalized = normalized.replace(/\/$/, '');

    return normalized.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

/**
 * Filters search results to only include e-commerce pages
 * @param results - Search results to filter
 * @returns Filtered results
 */
export function filterEcommerceResults(results: SearchResult[]): SearchResult[] {
  // Non-ecommerce domains to exclude
  const nonEcommerceDomains = [
    'youtube',
    'youtu.be',
    'reddit',
    'twitter',
    'facebook',
    'instagram',
    'tiktok',
    'pinterest',
  ];

  // Common e-commerce domains and patterns
  const ecommerceDomains = [
    'amazon',
    'ebay',
    'walmart',
    'target',
    'bestbuy',
    'newegg',
    'costco',
    'homedepot',
    'lowes',
    'macys',
    'nordstrom',
    'zappos',
    'wayfair',
    'overstock',
    'etsy',
    'aliexpress',
    'alibaba',
  ];

  const ecommerceKeywords = [
    '/shop/',
    '/store/',
    '/product',
    '/item',
  ];

  const titleKeywords = [
    'buy',
    'shop',
  ];

  return results.filter(result => {
    const url = result.url.toLowerCase();
    const title = result.title.toLowerCase();

    // First, exclude non-ecommerce domains
    if (nonEcommerceDomains.some(domain => url.includes(domain))) {
      return false;
    }

    // Check if URL contains e-commerce domain
    if (ecommerceDomains.some(domain => url.includes(domain))) {
      return true;
    }

    // Check if URL path contains e-commerce keywords (more specific)
    if (ecommerceKeywords.some(keyword => url.includes(keyword))) {
      return true;
    }

    // Check if title contains buy/shop keywords
    if (titleKeywords.some(keyword => title.includes(keyword))) {
      return true;
    }

    return false;
  });
}
