// Price parsing and discount detection utilities

import { PriceInfo, SearchResult, Currency, CURRENCY_RATES } from '../types';

// Regex patterns for price detection
const PRICE_PATTERNS = [
  { regex: /CAD\s?\$?\s?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/gi, currency: 'CAD' }, // Check CAD first
  { regex: /AUD\s?\$?\s?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/gi, currency: 'AUD' }, // Check AUD before generic $
  { regex: /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s?(USD|GBP|EUR|CAD|AUD)/gi, currency: 'match' },
  { regex: /\$\s?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g, currency: 'USD' },
  { regex: /£\s?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g, currency: 'GBP' },
  { regex: /€\s?(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)/g, currency: 'EUR' },
];

// Regex patterns for discount detection
const DISCOUNT_PATTERNS = [
  /(\d{1,2})%\s*off/i,
  /save\s*(\d{1,2})%/i,
  /(\d{1,2})%\s*discount/i,
  /discount:\s*(\d{1,2})%/i,
];

// Pattern for "was" prices
const WAS_PRICE_PATTERNS = [
  /was\s*\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i,
  /was\s*£(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i,
  /was\s*€(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)/i,
  /originally?\s*\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i,
  /reg(?:ular)?\s*\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i,
];

/**
 * Extracts price information from search result text
 * @param searchResult - Search result containing title, URL, and snippet
 * @returns PriceInfo object or null if no price found
 */
export function parsePrice(searchResult: SearchResult): PriceInfo | null {
  // First, try to extract structured data from Google Shopping
  if (searchResult.source === 'google' && searchResult.structuredData) {
    // Try Schema.org metatags first (most common format)
    if (searchResult.structuredData.metatags) {
      for (const metatag of searchResult.structuredData.metatags) {
        const priceAmount = metatag['product:price:amount'];
        if (priceAmount) {
          const priceStr = priceAmount.replace(/[^0-9.]/g, '');
          const amount = parseFloat(priceStr);

          if (amount > 0 && amount < 1000000) {
            const currencyCode = metatag['product:price:currency'] || 'USD';
            const currency = currencyCode.toUpperCase() as Currency;
            const retailer = extractRetailer(searchResult.url);

            return {
              retailer,
              productName: extractProductName(searchResult.title),
              currentPrice: amount,
              currency,
              url: searchResult.url,
              source: searchResult.source,
            };
          }
        }
      }
    }

    // Fallback to pagemap offers format
    if (searchResult.structuredData.offers) {
      for (const offer of searchResult.structuredData.offers) {
        if (offer.price) {
          const priceStr = offer.price.replace(/[^0-9.]/g, ''); // Remove non-numeric chars
          const amount = parseFloat(priceStr);

          if (amount > 0 && amount < 1000000) {
            const currency = (offer.pricecurrency?.toUpperCase() as Currency) || 'USD';
            const retailer = extractRetailer(searchResult.url);

            return {
              retailer,
              productName: extractProductName(searchResult.title),
              currentPrice: amount,
              currency,
              url: searchResult.url,
              source: searchResult.source,
            };
          }
        }
      }
    }
  }

  // Fall back to text-based extraction
  const text = `${searchResult.title} ${searchResult.snippet || ''} ${searchResult.description || ''}`;

  // Try to extract price
  const priceMatch = extractPrice(text);
  if (!priceMatch) {
    return null;
  }

  // Extract retailer from URL
  const retailer = extractRetailer(searchResult.url);

  // Try to extract discount
  const discount = extractDiscount(text);

  // Try to extract original price
  const originalPrice = extractOriginalPrice(text, priceMatch.currency);

  // Calculate discount if original price found but no percentage
  let finalDiscount = discount;
  if (!finalDiscount && originalPrice && originalPrice > priceMatch.amount) {
    finalDiscount = Math.round(((originalPrice - priceMatch.amount) / originalPrice) * 100);
  }

  return {
    retailer,
    productName: extractProductName(searchResult.title),
    currentPrice: priceMatch.amount,
    currency: priceMatch.currency,
    discount: finalDiscount,
    originalPrice,
    url: searchResult.url,
    source: searchResult.source,
  };
}

/**
 * Extracts price and currency from text
 */
function extractPrice(text: string): { amount: number; currency: Currency } | null {
  for (const pattern of PRICE_PATTERNS) {
    const matches = Array.from(text.matchAll(pattern.regex));

    for (const match of matches) {
      const priceStr = match[1];
      const currencyMatch = match[2]; // For patterns with explicit currency
      const matchIndex = match.index || 0;

      // Check context around the match to skip unit prices
      const contextBefore = text.substring(Math.max(0, matchIndex - 20), matchIndex);
      const contextAfter = text.substring(matchIndex + match[0].length, Math.min(text.length, matchIndex + match[0].length + 20));
      const fullContext = contextBefore + match[0] + contextAfter;

      // Skip if this looks like a unit price (price/unit)
      if (/\$?\d+\.?\d*\s*\/\s*(oz|ml|fl\.?\s?oz|gram|kg|lb|each|count|ct)/i.test(fullContext)) {
        continue;
      }

      // Skip if this is a shipping threshold (e.g., "FREE Shipping on $48+", "Free shipping over $35")
      if (/(free|flat rate)?\s*shipping\s*(on|over|above|at)?\s*\$?\d+/i.test(fullContext)) {
        continue;
      }

      // Skip if this is a payment plan (e.g., "4 payments of $4.50", "3 installments of $10")
      if (/(\d+\s*)?(payments?|installments?)\s*(of|@)\s*\$?\d+/i.test(fullContext)) {
        continue;
      }

      // Skip if this is part of a price range filter (e.g., "Less than $5", "Under $10", "Over $100")
      // Note: "from" is NOT included because it's often used for legitimate prices like "From $25"
      const rangeFilterTest = contextBefore + match[0];
      if (/(?:less than|under|over)\s+\$?\d+/i.test(rangeFilterTest)) {
        continue;
      }

      // Skip if followed by a dash/range (e.g., "$5-$10", "$10-$20")
      if (/\$\d+\.?\d*\s*[-–]\s*\$\d+/i.test(fullContext)) {
        continue;
      }

      // Determine currency
      let currency: Currency;
      if (pattern.currency === 'match' && currencyMatch) {
        currency = currencyMatch.toUpperCase() as Currency;
      } else {
        currency = pattern.currency as Currency;
      }

      // Parse price
      const amount = parseNumber(priceStr, currency);

      if (amount > 0 && amount < 1000000) { // Reasonable price range
        return { amount, currency };
      }
    }
  }

  return null;
}

/**
 * Parses a number string handling different formats
 */
function parseNumber(str: string, currency: Currency = 'USD'): number {
  // European format uses . for thousands and , for decimals
  if (currency === 'EUR' && str.includes('.') && str.includes(',')) {
    // Format: 1.299,50
    return parseFloat(str.replace(/\./g, '').replace(',', '.'));
  }

  if (currency === 'EUR' && str.includes(',') && !str.includes('.')) {
    // Format: 1299,50 or 99,50
    return parseFloat(str.replace(',', '.'));
  }

  // US/UK format: 1,299.50
  return parseFloat(str.replace(/,/g, ''));
}

/**
 * Extracts discount percentage from text
 */
function extractDiscount(text: string): number | undefined {
  for (const pattern of DISCOUNT_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const percentage = parseInt(match[1], 10);
      if (percentage > 0 && percentage <= 99) {
        return percentage;
      }
    }
  }
  return undefined;
}

/**
 * Extracts original ("was") price from text
 */
function extractOriginalPrice(text: string, currency: Currency): number | undefined {
  for (const pattern of WAS_PRICE_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const priceStr = match[1];
      const amount = parseNumber(priceStr, currency);
      if (amount > 0) {
        return amount;
      }
    }
  }
  return undefined;
}

/**
 * Extracts retailer name from URL
 */
export function extractRetailer(url: string): string {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname;

    // Remove www. prefix
    const domain = hostname.replace(/^www\./, '');

    // Extract main domain name (before TLD)
    const parts = domain.split('.');
    if (parts.length >= 2) {
      // Capitalize first letter
      return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    }

    return domain;
  } catch {
    return 'Unknown';
  }
}

/**
 * Extracts product name from title (removes price and retailer info)
 */
function extractProductName(title: string): string {
  // Remove price patterns
  let cleaned = title;
  for (const pattern of PRICE_PATTERNS) {
    cleaned = cleaned.replace(pattern.regex, '');
  }

  // Remove discount patterns
  for (const pattern of DISCOUNT_PATTERNS) {
    cleaned = cleaned.replace(pattern, '');
  }

  // Remove common retailer suffixes
  cleaned = cleaned.replace(/\s*[-|]\s*(Amazon|eBay|Walmart|Best Buy|Target|Newegg).*$/i, '');

  // Remove trailing/leading whitespace and punctuation
  cleaned = cleaned.replace(/[:|]\s*$/, '').trim();

  return cleaned || title; // Fallback to original if nothing left
}

/**
 * Batch parse multiple search results
 */
export function parsePrices(searchResults: SearchResult[]): PriceInfo[] {
  return searchResults
    .map(result => parsePrice(result))
    .filter((price): price is PriceInfo => price !== null);
}

/**
 * Normalizes retailer URL for comparison
 * Extracts the domain without subdomain for matching (e.g., amazon.com, walmart.com)
 */
function normalizeRetailerUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    // Remove www. prefix
    const withoutWww = hostname.replace(/^www\./, '');

    // Extract main domain (e.g., amazon.com, amazon.co.uk -> amazon)
    // For most cases, take the second-to-last and last parts
    const parts = withoutWww.split('.');

    if (parts.length >= 2) {
      // Handle cases like amazon.co.uk (keep amazon)
      // and amazon.com (keep amazon)
      return parts[0];
    }

    return withoutWww;
  } catch {
    return url.toLowerCase();
  }
}

/**
 * Deduplicates price results by retailer, prioritizing specific source
 * When the same retailer appears with different prices from different sources,
 * the specified priority source is preferred.
 *
 * @param prices - Array of price information
 * @param prioritySource - Source to prioritize ('google', 'brave', 'tavily')
 * @returns Deduplicated array with priority source preferred
 */
export function deduplicateByRetailer(
  prices: PriceInfo[],
  prioritySource: 'google' | 'brave' | 'tavily' = 'google'
): PriceInfo[] {
  // Group by normalized retailer URL
  const retailerMap = new Map<string, PriceInfo[]>();

  for (const price of prices) {
    const normalizedRetailer = normalizeRetailerUrl(price.url);

    if (!retailerMap.has(normalizedRetailer)) {
      retailerMap.set(normalizedRetailer, []);
    }

    retailerMap.get(normalizedRetailer)!.push(price);
  }

  // For each retailer, pick the best result based on priority
  const deduplicated: PriceInfo[] = [];

  for (const [retailer, priceList] of retailerMap.entries()) {
    if (priceList.length === 1) {
      // Only one result for this retailer, keep it
      deduplicated.push(priceList[0]);
    } else {
      // Multiple results for same retailer, prioritize by source
      // Order: priority source > other sources
      const priorityResult = priceList.find(p => p.source === prioritySource);

      if (priorityResult) {
        // Use priority source result
        deduplicated.push(priorityResult);
      } else {
        // No priority source, just take the first one
        deduplicated.push(priceList[0]);
      }
    }
  }

  return deduplicated;
}
