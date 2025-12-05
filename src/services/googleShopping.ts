// Google Custom Search API for shopping results
import { SearchResult } from '../types';

interface GoogleSearchItem {
  title: string;
  link: string;
  snippet: string;
  pagemap?: {
    offer?: Array<{
      price?: string;
      pricecurrency?: string;
    }>;
    product?: Array<{
      name?: string;
      image?: string;
    }>;
    metatags?: Array<{
      'product:price:amount'?: string;
      'product:price:currency'?: string;
      'product:availability'?: string;
      [key: string]: string | undefined;
    }>;
  };
}

interface GoogleSearchResponse {
  items?: GoogleSearchItem[];
}

/**
 * Search for products using Google Custom Search API
 * @param query - Product search query
 * @param maxResults - Maximum number of results (default: 10, max: 10 per request)
 * @returns Array of search results with structured product data
 */
export async function searchGoogleShopping(
  query: string,
  maxResults: number = 10
): Promise<SearchResult[]> {
  const apiKey = process.env.GOOGLE_API_KEY;
  const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

  if (!apiKey || !searchEngineId) {
    console.warn('[Google Shopping] API key or Search Engine ID not configured, skipping...');
    return [];
  }

  try {
    // Google Custom Search API endpoint
    const url = new URL('https://www.googleapis.com/customsearch/v1');
    url.searchParams.set('key', apiKey);
    url.searchParams.set('cx', searchEngineId);
    url.searchParams.set('q', `${query} buy price`);
    url.searchParams.set('num', Math.min(maxResults, 10).toString());

    console.log('[Google Shopping] Searching:', query);

    const response = await fetch(url.toString());

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Google Shopping] API error:', response.status, errorText);
      return [];
    }

    const data: GoogleSearchResponse = await response.json();

    if (!data.items || data.items.length === 0) {
      console.log('[Google Shopping] No results found');
      return [];
    }

    const results: SearchResult[] = data.items.map(item => ({
      title: item.title,
      url: item.link,
      snippet: item.snippet,
      description: item.snippet,
      source: 'google',
      // Store structured data if available (for price extraction)
      structuredData: item.pagemap ? {
        offers: item.pagemap.offer,
        products: item.pagemap.product,
        metatags: item.pagemap.metatags,
      } : undefined,
    }));

    console.log(`[Google Shopping] Found ${results.length} results`);
    return results;
  } catch (error) {
    console.error('[Google Shopping] Search failed:', error instanceof Error ? error.message : error);
    return [];
  }
}
