import { describe, it, expect } from 'vitest';
import {
  sortByPrice,
  sortByPriceAscending,
  sortByDiscount,
  normalizeToUSD,
  filterByMaxPrice,
  filterByMinDiscount,
} from '../src/core/resultSorter';
import { PriceInfo } from '../src/types';

describe('resultSorter', () => {
  describe('normalizeToUSD', () => {
    it('should return same value for USD', () => {
      expect(normalizeToUSD(100, 'USD')).toBe(100);
    });

    it('should convert GBP to USD', () => {
      expect(normalizeToUSD(100, 'GBP')).toBe(127); // 100 * 1.27
    });

    it('should convert EUR to USD', () => {
      expect(normalizeToUSD(100, 'EUR')).toBeCloseTo(109, 1); // 100 * 1.09
    });

    it('should convert CAD to USD', () => {
      expect(normalizeToUSD(100, 'CAD')).toBe(74); // 100 * 0.74
    });

    it('should convert AUD to USD', () => {
      expect(normalizeToUSD(100, 'AUD')).toBe(66); // 100 * 0.66
    });
  });

  describe('sortByPrice', () => {
    it('should sort by price descending (highest first)', () => {
      const results: PriceInfo[] = [
        {
          retailer: 'Amazon',
          productName: 'Product',
          currentPrice: 50,
          currency: 'USD',
          url: 'https://amazon.com/1',
          source: 'brave',
        },
        {
          retailer: 'Walmart',
          productName: 'Product',
          currentPrice: 100,
          currency: 'USD',
          url: 'https://walmart.com/1',
          source: 'brave',
        },
        {
          retailer: 'Target',
          productName: 'Product',
          currentPrice: 75,
          currency: 'USD',
          url: 'https://target.com/1',
          source: 'brave',
        },
      ];

      const sorted = sortByPrice(results);
      expect(sorted[0].currentPrice).toBe(100);
      expect(sorted[1].currentPrice).toBe(75);
      expect(sorted[2].currentPrice).toBe(50);
    });

    it('should sort multi-currency prices correctly', () => {
      const results: PriceInfo[] = [
        {
          retailer: 'US Store',
          productName: 'Product',
          currentPrice: 100,
          currency: 'USD',
          url: 'https://us.com/1',
          source: 'brave',
        },
        {
          retailer: 'UK Store',
          productName: 'Product',
          currentPrice: 100,
          currency: 'GBP', // 100 GBP = 127 USD
          url: 'https://uk.com/1',
          source: 'brave',
        },
        {
          retailer: 'EU Store',
          productName: 'Product',
          currentPrice: 100,
          currency: 'EUR', // 100 EUR = 109 USD
          url: 'https://eu.com/1',
          source: 'brave',
        },
      ];

      const sorted = sortByPrice(results);
      expect(sorted[0].currency).toBe('GBP'); // Highest when normalized
      expect(sorted[1].currency).toBe('EUR');
      expect(sorted[2].currency).toBe('USD');
    });

    it('should add normalizedPrice to results', () => {
      const results: PriceInfo[] = [
        {
          retailer: 'Store',
          productName: 'Product',
          currentPrice: 100,
          currency: 'GBP',
          url: 'https://store.com/1',
          source: 'brave',
        },
      ];

      const sorted = sortByPrice(results);
      expect(sorted[0].normalizedPrice).toBe(127);
    });

    it('should handle empty array', () => {
      const sorted = sortByPrice([]);
      expect(sorted).toHaveLength(0);
    });

    it('should handle single result', () => {
      const results: PriceInfo[] = [
        {
          retailer: 'Store',
          productName: 'Product',
          currentPrice: 100,
          currency: 'USD',
          url: 'https://store.com/1',
          source: 'brave',
        },
      ];

      const sorted = sortByPrice(results);
      expect(sorted).toHaveLength(1);
      expect(sorted[0].currentPrice).toBe(100);
    });

    it('should not mutate original array', () => {
      const results: PriceInfo[] = [
        {
          retailer: 'Amazon',
          productName: 'Product',
          currentPrice: 50,
          currency: 'USD',
          url: 'https://amazon.com/1',
          source: 'brave',
        },
        {
          retailer: 'Walmart',
          productName: 'Product',
          currentPrice: 100,
          currency: 'USD',
          url: 'https://walmart.com/1',
          source: 'brave',
        },
      ];

      const original = [...results];
      sortByPrice(results);

      expect(results[0].currentPrice).toBe(original[0].currentPrice);
      expect(results[1].currentPrice).toBe(original[1].currentPrice);
    });

    it('should handle equal prices', () => {
      const results: PriceInfo[] = [
        {
          retailer: 'Store A',
          productName: 'Product',
          currentPrice: 100,
          currency: 'USD',
          url: 'https://storea.com/1',
          source: 'brave',
        },
        {
          retailer: 'Store B',
          productName: 'Product',
          currentPrice: 100,
          currency: 'USD',
          url: 'https://storeb.com/1',
          source: 'brave',
        },
      ];

      const sorted = sortByPrice(results);
      expect(sorted).toHaveLength(2);
      expect(sorted[0].currentPrice).toBe(100);
      expect(sorted[1].currentPrice).toBe(100);
    });
  });

  describe('sortByPriceAscending', () => {
    it('should sort by price ascending (lowest first)', () => {
      const results: PriceInfo[] = [
        {
          retailer: 'Amazon',
          productName: 'Product',
          currentPrice: 100,
          currency: 'USD',
          url: 'https://amazon.com/1',
          source: 'brave',
        },
        {
          retailer: 'Walmart',
          productName: 'Product',
          currentPrice: 50,
          currency: 'USD',
          url: 'https://walmart.com/1',
          source: 'brave',
        },
        {
          retailer: 'Target',
          productName: 'Product',
          currentPrice: 75,
          currency: 'USD',
          url: 'https://target.com/1',
          source: 'brave',
        },
      ];

      const sorted = sortByPriceAscending(results);
      expect(sorted[0].currentPrice).toBe(50);
      expect(sorted[1].currentPrice).toBe(75);
      expect(sorted[2].currentPrice).toBe(100);
    });

    it('should handle empty array', () => {
      const sorted = sortByPriceAscending([]);
      expect(sorted).toHaveLength(0);
    });
  });

  describe('sortByDiscount', () => {
    it('should sort by discount percentage descending', () => {
      const results: PriceInfo[] = [
        {
          retailer: 'Store A',
          productName: 'Product',
          currentPrice: 100,
          currency: 'USD',
          discount: 10,
          url: 'https://storea.com/1',
          source: 'brave',
        },
        {
          retailer: 'Store B',
          productName: 'Product',
          currentPrice: 90,
          currency: 'USD',
          discount: 30,
          url: 'https://storeb.com/1',
          source: 'brave',
        },
        {
          retailer: 'Store C',
          productName: 'Product',
          currentPrice: 95,
          currency: 'USD',
          discount: 20,
          url: 'https://storec.com/1',
          source: 'brave',
        },
      ];

      const sorted = sortByDiscount(results);
      expect(sorted[0].discount).toBe(30);
      expect(sorted[1].discount).toBe(20);
      expect(sorted[2].discount).toBe(10);
    });

    it('should handle results without discount', () => {
      const results: PriceInfo[] = [
        {
          retailer: 'Store A',
          productName: 'Product',
          currentPrice: 100,
          currency: 'USD',
          url: 'https://storea.com/1',
          source: 'brave',
        },
        {
          retailer: 'Store B',
          productName: 'Product',
          currentPrice: 90,
          currency: 'USD',
          discount: 20,
          url: 'https://storeb.com/1',
          source: 'brave',
        },
      ];

      const sorted = sortByDiscount(results);
      expect(sorted[0].discount).toBe(20);
      expect(sorted[1].discount).toBeUndefined();
    });

    it('should handle empty array', () => {
      const sorted = sortByDiscount([]);
      expect(sorted).toHaveLength(0);
    });
  });

  describe('filterByMaxPrice', () => {
    it('should filter results by max price in USD', () => {
      const results: PriceInfo[] = [
        {
          retailer: 'Store A',
          productName: 'Product',
          currentPrice: 50,
          currency: 'USD',
          url: 'https://storea.com/1',
          source: 'brave',
        },
        {
          retailer: 'Store B',
          productName: 'Product',
          currentPrice: 150,
          currency: 'USD',
          url: 'https://storeb.com/1',
          source: 'brave',
        },
        {
          retailer: 'Store C',
          productName: 'Product',
          currentPrice: 100,
          currency: 'USD',
          url: 'https://storec.com/1',
          source: 'brave',
        },
      ];

      const filtered = filterByMaxPrice(results, 100);
      expect(filtered).toHaveLength(2);
      expect(filtered.every(r => r.currentPrice <= 100)).toBe(true);
    });

    it('should handle multi-currency filtering', () => {
      const results: PriceInfo[] = [
        {
          retailer: 'US Store',
          productName: 'Product',
          currentPrice: 100,
          currency: 'USD',
          url: 'https://us.com/1',
          source: 'brave',
        },
        {
          retailer: 'UK Store',
          productName: 'Product',
          currentPrice: 100,
          currency: 'GBP', // 127 USD
          url: 'https://uk.com/1',
          source: 'brave',
        },
      ];

      const filtered = filterByMaxPrice(results, 120);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].currency).toBe('USD');
    });

    it('should handle empty array', () => {
      const filtered = filterByMaxPrice([], 100);
      expect(filtered).toHaveLength(0);
    });
  });

  describe('filterByMinDiscount', () => {
    it('should filter results by minimum discount', () => {
      const results: PriceInfo[] = [
        {
          retailer: 'Store A',
          productName: 'Product',
          currentPrice: 100,
          currency: 'USD',
          discount: 5,
          url: 'https://storea.com/1',
          source: 'brave',
        },
        {
          retailer: 'Store B',
          productName: 'Product',
          currentPrice: 90,
          currency: 'USD',
          discount: 20,
          url: 'https://storeb.com/1',
          source: 'brave',
        },
        {
          retailer: 'Store C',
          productName: 'Product',
          currentPrice: 95,
          currency: 'USD',
          discount: 15,
          url: 'https://storec.com/1',
          source: 'brave',
        },
      ];

      const filtered = filterByMinDiscount(results, 15);
      expect(filtered).toHaveLength(2);
      expect(filtered.every(r => (r.discount || 0) >= 15)).toBe(true);
    });

    it('should exclude results without discount', () => {
      const results: PriceInfo[] = [
        {
          retailer: 'Store A',
          productName: 'Product',
          currentPrice: 100,
          currency: 'USD',
          url: 'https://storea.com/1',
          source: 'brave',
        },
        {
          retailer: 'Store B',
          productName: 'Product',
          currentPrice: 90,
          currency: 'USD',
          discount: 20,
          url: 'https://storeb.com/1',
          source: 'brave',
        },
      ];

      const filtered = filterByMinDiscount(results, 10);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].discount).toBe(20);
    });

    it('should handle empty array', () => {
      const filtered = filterByMinDiscount([], 10);
      expect(filtered).toHaveLength(0);
    });
  });
});
