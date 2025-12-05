// Product name extraction from URLs using Tavily extract

import { extractFromUrl } from '../services/mcpBridge';
import { ProductInfo } from '../types';

/**
 * Extracts product name from a URL using Tavily extract
 * @param url - URL of the product page
 * @returns Product information including extracted name
 */
export async function extractProductFromUrl(url: string): Promise<ProductInfo> {
  try {
    // Call Tavily extract via MCP bridge
    const response = await extractFromUrl(url);

    if (!response.results || response.results.length === 0) {
      throw new Error('No content extracted from URL');
    }

    const result = response.results[0];

    if (!result.success) {
      throw new Error('Failed to extract content from URL');
    }

    // Extract product name from content
    const productName = extractProductNameFromContent(result.content, url);

    return {
      name: productName,
      originalUrl: url,
      extractedAt: new Date(),
    };
  } catch (error) {
    throw new Error(
      `Failed to extract product from URL: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Extracts product name from page content
 * Uses heuristics to identify the most likely product name
 * @param content - Page content
 * @param url - Original URL (for context)
 * @returns Extracted product name
 */
export function extractProductNameFromContent(content: string, url: string): string {
  // Strategy 1: Look for common product name patterns
  const patterns = [
    // Look for title tags or heading-like content
    /<title[^>]*>(.*?)<\/title>/i,
    /<h1[^>]*>(.*?)<\/h1>/i,
    /product[_\s-]?name["\s:]*([^<"\n]+)/i,
    /title["\s:]*([^<"\n]{10,100})/i,
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      const name = cleanProductName(match[1]);
      if (name.length >= 3) {
        return name;
      }
    }
  }

  // Strategy 2: Extract from first significant line
  const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 10);

  for (const line of lines.slice(0, 20)) {
    // Skip lines that look like navigation or boilerplate
    if (isLikelyProductName(line)) {
      const name = cleanProductName(line);
      if (name.length >= 3) {
        return name;
      }
    }
  }

  // Strategy 3: Try to extract from URL path
  const productNameFromUrl = extractProductNameFromUrl(url);
  if (productNameFromUrl) {
    return productNameFromUrl;
  }

  // Fallback: Use first substantial text chunk
  const substantial = lines.find(l => l.length >= 10 && l.length <= 200);
  if (substantial) {
    return cleanProductName(substantial);
  }

  throw new Error('Could not extract product name from content');
}

/**
 * Cleans and normalizes product name
 */
function cleanProductName(name: string): string {
  // Remove HTML tags
  let cleaned = name.replace(/<[^>]*>/g, '');

  // Decode HTML entities
  cleaned = cleaned
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // Remove extra whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // Remove common suffixes
  cleaned = cleaned.replace(/\s*[-|]\s*(Buy Now|Shop Now|Price|Review|Details).*$/i, '');

  // Limit length
  if (cleaned.length > 150) {
    cleaned = cleaned.substring(0, 150).trim();
  }

  return cleaned;
}

/**
 * Checks if a line is likely to be a product name
 */
function isLikelyProductName(line: string): boolean {
  // Should be substantial but not too long
  if (line.length < 10 || line.length > 200) {
    return false;
  }

  // Skip common navigation/boilerplate text
  const skipPatterns = [
    /^(home|about|contact|privacy|terms|search|menu|login|sign in|cart|checkout)/i,
    /cookie/i,
    /^©/,
    /all rights reserved/i,
    /^follow us/i,
    /^subscribe/i,
  ];

  for (const pattern of skipPatterns) {
    if (pattern.test(line)) {
      return false;
    }
  }

  // Should contain alphanumeric characters
  if (!/[a-z0-9]/i.test(line)) {
    return false;
  }

  return true;
}

/**
 * Attempts to extract product name from URL path
 */
function extractProductNameFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const pathParts = parsed.pathname.split('/').filter(p => p.length > 0);

    // Look for parts that might be product names
    for (const part of pathParts.reverse()) {
      // Skip common path segments
      if (['product', 'item', 'dp', 'p', 'products', 'items'].includes(part.toLowerCase())) {
        continue;
      }

      // Look for descriptive segments (with dashes or underscores)
      if (part.includes('-') || part.includes('_')) {
        const name = part
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, l => l.toUpperCase());

        if (name.length >= 10) {
          return name;
        }
      }
    }
  } catch {
    return null;
  }

  return null;
}
