// Result sorting and normalization utilities

import { PriceInfo, CURRENCY_RATES, Currency } from '../types';

/**
 * Normalizes a price to USD for comparison
 * @param price - Price amount
 * @param currency - Currency code
 * @returns Price in USD
 */
export function normalizeToUSD(price: number, currency: Currency): number {
  const rate = CURRENCY_RATES[currency] || 1.0;
  return price * rate;
}

/**
 * Sorts price results by normalized price (descending - highest first)
 * @param results - Array of price information
 * @returns Sorted array (highest price first)
 */
export function sortByPrice(results: PriceInfo[]): PriceInfo[] {
  if (!results || results.length === 0) {
    return [];
  }

  // Create a copy to avoid mutating original
  const resultsCopy = [...results];

  // Normalize and sort
  return resultsCopy
    .map(result => ({
      ...result,
      normalizedPrice: normalizeToUSD(result.currentPrice, result.currency),
    }))
    .sort((a, b) => {
      // Sort by normalized price descending (highest first)
      return (b.normalizedPrice || 0) - (a.normalizedPrice || 0);
    });
}

/**
 * Sorts price results by normalized price (ascending - lowest first)
 * @param results - Array of price information
 * @returns Sorted array (lowest price first)
 */
export function sortByPriceAscending(results: PriceInfo[]): PriceInfo[] {
  if (!results || results.length === 0) {
    return [];
  }

  // Create a copy to avoid mutating original
  const resultsCopy = [...results];

  // Normalize and sort
  return resultsCopy
    .map(result => ({
      ...result,
      normalizedPrice: normalizeToUSD(result.currentPrice, result.currency),
    }))
    .sort((a, b) => {
      // Sort by normalized price ascending (lowest first)
      return (a.normalizedPrice || 0) - (b.normalizedPrice || 0);
    });
}

/**
 * Sorts price results by discount percentage (highest discount first)
 * @param results - Array of price information
 * @returns Sorted array (highest discount first)
 */
export function sortByDiscount(results: PriceInfo[]): PriceInfo[] {
  if (!results || results.length === 0) {
    return [];
  }

  // Create a copy to avoid mutating original
  const resultsCopy = [...results];

  return resultsCopy.sort((a, b) => {
    const discountA = a.discount || 0;
    const discountB = b.discount || 0;
    return discountB - discountA;
  });
}

/**
 * Filters results by maximum price (in USD)
 * @param results - Array of price information
 * @param maxPriceUSD - Maximum price in USD
 * @returns Filtered results
 */
export function filterByMaxPrice(results: PriceInfo[], maxPriceUSD: number): PriceInfo[] {
  if (!results || results.length === 0) {
    return [];
  }

  return results.filter(result => {
    const normalizedPrice = normalizeToUSD(result.currentPrice, result.currency);
    return normalizedPrice <= maxPriceUSD;
  });
}

/**
 * Filters results by minimum discount percentage
 * @param results - Array of price information
 * @param minDiscount - Minimum discount percentage
 * @returns Filtered results
 */
export function filterByMinDiscount(results: PriceInfo[], minDiscount: number): PriceInfo[] {
  if (!results || results.length === 0) {
    return [];
  }

  return results.filter(result => {
    return (result.discount || 0) >= minDiscount;
  });
}
