// Main orchestrator for price comparison

import { isUrl, normalizeUrl } from './core/urlHandler';
import { extractProductFromUrl } from './core/productExtractor';
import { searchProduct } from './core/searchService';
import { parsePrices, deduplicateByRetailer } from './core/priceParser';
import { sortByPriceAscending } from './core/resultSorter';
import { ComparisonResult } from './types';

export type SearchMode = 'all' | 'google' | 'brave' | 'tavily' | 'mcp';

/**
 * Main function to compare prices for a product
 * @param input - Product URL or product name
 * @param mode - Search mode: 'all' (default), 'google', 'brave', 'tavily', 'mcp' (brave+tavily)
 * @returns Comparison results with sorted prices
 */
export async function compareProductPrices(input: string, mode: SearchMode = 'all'): Promise<ComparisonResult> {
  try {
    let productName: string;

    // Step 1: Determine if input is URL or product name
    if (isUrl(input)) {
      // Extract product name from URL
      const normalizedUrl = normalizeUrl(input);
      const productInfo = await extractProductFromUrl(normalizedUrl);
      productName = productInfo.name;
    } else {
      // Use input directly as product name
      productName = input;
    }

    // Step 2: Search for the product
    const searchResults = await searchProduct(productName, 10, mode);

    // Step 3: Parse prices from search results
    const priceResults = parsePrices(searchResults);

    if (priceResults.length === 0) {
      return {
        success: false,
        productName,
        results: [],
        error: 'No prices found for this product',
      };
    }

    // Step 4: Deduplicate by retailer, prioritizing Google prices
    const deduplicatedResults = deduplicateByRetailer(priceResults, 'google');

    // Step 5: Sort by price ascending (lowest first)
    const sortedResults = sortByPriceAscending(deduplicatedResults);

    return {
      success: true,
      productName,
      results: sortedResults,
    };
  } catch (error) {
    return {
      success: false,
      productName: input,
      results: [],
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
