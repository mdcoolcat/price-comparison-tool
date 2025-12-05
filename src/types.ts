// Core type definitions for the price comparison tool

export interface PriceInfo {
  retailer: string;
  productName: string;
  currentPrice: number;
  currency: string;
  discount?: number; // percentage
  originalPrice?: number;
  url: string;
  source: 'brave' | 'tavily' | 'google';
  normalizedPrice?: number; // Price normalized to USD for sorting
}

export interface SearchResult {
  title: string;
  url: string;
  snippet?: string;
  description?: string;
  source: 'brave' | 'tavily' | 'google';
  structuredData?: {
    offers?: Array<{
      price?: string;
      pricecurrency?: string;
    }>;
    products?: Array<{
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

export interface ProductInfo {
  name: string;
  originalUrl: string;
  extractedAt: Date;
}

export interface ComparisonResult {
  success: boolean;
  productName: string;
  results: PriceInfo[];
  error?: string;
}

// Currency conversion rates (static for MVP)
export const CURRENCY_RATES: Record<string, number> = {
  USD: 1.0,
  GBP: 1.27, // 1 GBP = 1.27 USD
  EUR: 1.09, // 1 EUR = 1.09 USD
  CAD: 0.74, // 1 CAD = 0.74 USD
  AUD: 0.66, // 1 AUD = 0.66 USD
};

// Supported currencies
export type Currency = keyof typeof CURRENCY_RATES;

// MCP Tool Response Types
export interface TavilyExtractResponse {
  results: Array<{
    url: string;
    content: string;
    success: boolean;
  }>;
}

export interface BraveSearchResponse {
  type: 'search';
  results: {
    web: {
      results: Array<{
        title: string;
        url: string;
        description?: string;
        extra_snippets?: string[];
      }>;
    };
  };
}

export interface TavilySearchResponse {
  query: string;
  results: Array<{
    title: string;
    url: string;
    content: string;
    score: number;
  }>;
}
