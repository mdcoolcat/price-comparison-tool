import { describe, it, expect } from 'vitest';
import { parsePrice, parsePrices, extractRetailer, deduplicateByRetailer } from '../src/core/priceParser';
import { SearchResult, PriceInfo } from '../src/types';

describe('priceParser', () => {
  describe('parsePrice', () => {
    it('should parse USD prices', () => {
      const result: SearchResult = {
        title: 'Gaming Laptop - $1,299.99',
        url: 'https://amazon.com/product/123',
        snippet: 'High performance laptop',
        source: 'brave',
      };

      const parsed = parsePrice(result);
      expect(parsed).not.toBeNull();
      expect(parsed?.currentPrice).toBe(1299.99);
      expect(parsed?.currency).toBe('USD');
      expect(parsed?.retailer).toBe('Amazon');
    });

    it('should parse GBP prices', () => {
      const result: SearchResult = {
        title: 'MacBook Pro £1,499',
        url: 'https://apple.com/uk/macbook',
        snippet: '',
        source: 'tavily',
      };

      const parsed = parsePrice(result);
      expect(parsed).not.toBeNull();
      expect(parsed?.currentPrice).toBe(1499);
      expect(parsed?.currency).toBe('GBP');
    });

    it('should parse EUR prices', () => {
      const result: SearchResult = {
        title: 'iPhone 15 Pro €1.299,50',
        url: 'https://example.de/phone',
        snippet: '',
        source: 'brave',
      };

      const parsed = parsePrice(result);
      expect(parsed).not.toBeNull();
      expect(parsed?.currentPrice).toBe(1299.50);
      expect(parsed?.currency).toBe('EUR');
    });

    it('should parse prices with currency code', () => {
      const result: SearchResult = {
        title: 'Product Name 499.99 USD',
        url: 'https://shop.com/product',
        snippet: '',
        source: 'tavily',
      };

      const parsed = parsePrice(result);
      expect(parsed).not.toBeNull();
      expect(parsed?.currentPrice).toBe(499.99);
      expect(parsed?.currency).toBe('USD');
    });

    it('should detect "% off" discount', () => {
      const result: SearchResult = {
        title: 'Gaming Mouse $59.99 - 20% off',
        url: 'https://bestbuy.com/mouse',
        snippet: '',
        source: 'brave',
      };

      const parsed = parsePrice(result);
      expect(parsed).not.toBeNull();
      expect(parsed?.discount).toBe(20);
    });

    it('should detect "Save %" discount', () => {
      const result: SearchResult = {
        title: 'Keyboard - $89.99',
        url: 'https://amazon.com/keyboard',
        snippet: 'Save 15% with coupon',
        source: 'brave',
      };

      const parsed = parsePrice(result);
      expect(parsed).not.toBeNull();
      expect(parsed?.discount).toBe(15);
    });

    it('should detect "was" price and calculate discount', () => {
      const result: SearchResult = {
        title: 'Monitor $299.99',
        url: 'https://newegg.com/monitor',
        snippet: 'Was $399.99',
        source: 'tavily',
      };

      const parsed = parsePrice(result);
      expect(parsed).not.toBeNull();
      expect(parsed?.originalPrice).toBe(399.99);
      expect(parsed?.discount).toBe(25); // (399.99 - 299.99) / 399.99 * 100
    });

    it('should extract product name', () => {
      const result: SearchResult = {
        title: 'Dell XPS 15 Laptop - $1,499.99 - Amazon',
        url: 'https://amazon.com/dell-xps',
        snippet: '',
        source: 'brave',
      };

      const parsed = parsePrice(result);
      expect(parsed).not.toBeNull();
      expect(parsed?.productName).toContain('Dell XPS 15');
      expect(parsed?.productName).not.toContain('$1,499.99');
    });

    it('should return null for results without prices', () => {
      const result: SearchResult = {
        title: 'Product Description Without Price',
        url: 'https://example.com/product',
        snippet: 'Read reviews and specifications',
        source: 'brave',
      };

      const parsed = parsePrice(result);
      expect(parsed).toBeNull();
    });

    it('should handle prices with spaces', () => {
      const result: SearchResult = {
        title: 'Product $ 29.99',
        url: 'https://shop.com/product',
        snippet: '',
        source: 'brave',
      };

      const parsed = parsePrice(result);
      expect(parsed).not.toBeNull();
      expect(parsed?.currentPrice).toBe(29.99);
    });

    it('should handle prices without cents', () => {
      const result: SearchResult = {
        title: 'Gaming Console $499',
        url: 'https://gamestop.com/console',
        snippet: '',
        source: 'tavily',
      };

      const parsed = parsePrice(result);
      expect(parsed).not.toBeNull();
      expect(parsed?.currentPrice).toBe(499);
    });

    it('should handle CAD currency', () => {
      const result: SearchResult = {
        title: 'Product CAD $199.99',
        url: 'https://bestbuy.ca/product',
        snippet: '',
        source: 'brave',
      };

      const parsed = parsePrice(result);
      expect(parsed).not.toBeNull();
      expect(parsed?.currentPrice).toBe(199.99);
      expect(parsed?.currency).toBe('CAD');
    });

    it('should extract correct retailer from URL', () => {
      const result: SearchResult = {
        title: 'Product $99.99',
        url: 'https://www.walmart.com/product/123',
        snippet: '',
        source: 'brave',
      };

      const parsed = parsePrice(result);
      expect(parsed).not.toBeNull();
      expect(parsed?.retailer).toBe('Walmart');
    });

    it('should preserve source information', () => {
      const result: SearchResult = {
        title: 'Product $50',
        url: 'https://example.com/product',
        snippet: '',
        source: 'tavily',
      };

      const parsed = parsePrice(result);
      expect(parsed).not.toBeNull();
      expect(parsed?.source).toBe('tavily');
    });

    it('should handle multiple prices and pick the first', () => {
      const result: SearchResult = {
        title: 'Product $99.99 was $149.99',
        url: 'https://shop.com/product',
        snippet: '',
        source: 'brave',
      };

      const parsed = parsePrice(result);
      expect(parsed).not.toBeNull();
      expect(parsed?.currentPrice).toBe(99.99);
      expect(parsed?.originalPrice).toBe(149.99);
    });

    it('should ignore unreasonably high prices', () => {
      const result: SearchResult = {
        title: 'Product $9,999,999.99',
        url: 'https://shop.com/product',
        snippet: '',
        source: 'brave',
      };

      const parsed = parsePrice(result);
      expect(parsed).toBeNull();
    });

    it('should handle "discount:" format', () => {
      const result: SearchResult = {
        title: 'Laptop $899',
        url: 'https://shop.com/laptop',
        snippet: 'Discount: 30%',
        source: 'tavily',
      };

      const parsed = parsePrice(result);
      expect(parsed).not.toBeNull();
      expect(parsed?.discount).toBe(30);
    });

    it('should handle "originally" price', () => {
      const result: SearchResult = {
        title: 'Headphones $79.99',
        url: 'https://shop.com/headphones',
        snippet: 'Originally $99.99',
        source: 'brave',
      };

      const parsed = parsePrice(result);
      expect(parsed).not.toBeNull();
      expect(parsed?.originalPrice).toBe(99.99);
    });
  });

  describe('extractRetailer', () => {
    it('should extract retailer from common domains', () => {
      expect(extractRetailer('https://amazon.com/product')).toBe('Amazon');
      expect(extractRetailer('https://www.amazon.com/product')).toBe('Amazon');
      expect(extractRetailer('https://ebay.com/item/123')).toBe('Ebay');
      expect(extractRetailer('https://walmart.com/product')).toBe('Walmart');
    });

    it('should capitalize retailer name', () => {
      expect(extractRetailer('https://bestbuy.com/product')).toBe('Bestbuy');
      expect(extractRetailer('https://target.com/product')).toBe('Target');
    });

    it('should handle subdomains', () => {
      expect(extractRetailer('https://shop.example.com/product')).toBe('Shop');
    });

    it('should handle invalid URLs gracefully', () => {
      expect(extractRetailer('not-a-url')).toBe('Unknown');
      expect(extractRetailer('')).toBe('Unknown');
    });

    it('should remove www prefix', () => {
      expect(extractRetailer('https://www.newegg.com/product')).toBe('Newegg');
    });
  });

  describe('parsePrices', () => {
    it('should parse multiple search results', () => {
      const results: SearchResult[] = [
        {
          title: 'Product A - $99.99',
          url: 'https://amazon.com/a',
          snippet: '',
          source: 'brave',
        },
        {
          title: 'Product B - $89.99',
          url: 'https://walmart.com/b',
          snippet: '10% off',
          source: 'tavily',
        },
        {
          title: 'Product C - No Price',
          url: 'https://example.com/c',
          snippet: '',
          source: 'brave',
        },
      ];

      const parsed = parsePrices(results);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].currentPrice).toBe(99.99);
      expect(parsed[1].currentPrice).toBe(89.99);
      expect(parsed[1].discount).toBe(10);
    });

    it('should return empty array for results without prices', () => {
      const results: SearchResult[] = [
        {
          title: 'No Price Here',
          url: 'https://example.com/1',
          snippet: '',
          source: 'brave',
        },
      ];

      const parsed = parsePrices(results);
      expect(parsed).toHaveLength(0);
    });

    it('should handle empty input', () => {
      const parsed = parsePrices([]);
      expect(parsed).toHaveLength(0);
    });

    it('should preserve all properties', () => {
      const results: SearchResult[] = [
        {
          title: 'Gaming Mouse $59.99 - 20% off',
          url: 'https://bestbuy.com/mouse',
          snippet: 'Was $74.99',
          source: 'brave',
        },
      ];

      const parsed = parsePrices(results);
      expect(parsed).toHaveLength(1);
      expect(parsed[0]).toMatchObject({
        currentPrice: 59.99,
        currency: 'USD',
        discount: 20,
        originalPrice: 74.99,
        retailer: 'Bestbuy',
        source: 'brave',
      });
    });
  });

  describe('deduplicateByRetailer', () => {
    it('should keep unique retailers', () => {
      const prices: PriceInfo[] = [
        {
          retailer: 'Amazon',
          productName: 'Product A',
          currentPrice: 100,
          currency: 'USD',
          url: 'https://amazon.com/product-a',
          source: 'google',
        },
        {
          retailer: 'Walmart',
          productName: 'Product A',
          currentPrice: 95,
          currency: 'USD',
          url: 'https://walmart.com/product-a',
          source: 'tavily',
        },
      ];

      const deduplicated = deduplicateByRetailer(prices);
      expect(deduplicated).toHaveLength(2);
    });

    it('should prioritize Google source for same retailer', () => {
      const prices: PriceInfo[] = [
        {
          retailer: 'Amazon',
          productName: 'Product A',
          currentPrice: 100,
          currency: 'USD',
          url: 'https://amazon.com/product-a',
          source: 'tavily',
        },
        {
          retailer: 'Amazon',
          productName: 'Product A',
          currentPrice: 105,
          currency: 'USD',
          url: 'https://amazon.com/product-a-2',
          source: 'google',
        },
        {
          retailer: 'Amazon',
          productName: 'Product A',
          currentPrice: 110,
          currency: 'USD',
          url: 'https://www.amazon.com/product-a-3',
          source: 'brave',
        },
      ];

      const deduplicated = deduplicateByRetailer(prices, 'google');
      expect(deduplicated).toHaveLength(1);
      expect(deduplicated[0].currentPrice).toBe(105);
      expect(deduplicated[0].source).toBe('google');
    });

    it('should handle same retailer without Google source', () => {
      const prices: PriceInfo[] = [
        {
          retailer: 'Amazon',
          productName: 'Product A',
          currentPrice: 100,
          currency: 'USD',
          url: 'https://amazon.com/product-a',
          source: 'tavily',
        },
        {
          retailer: 'Amazon',
          productName: 'Product A',
          currentPrice: 105,
          currency: 'USD',
          url: 'https://www.amazon.com/product-a-2',
          source: 'brave',
        },
      ];

      const deduplicated = deduplicateByRetailer(prices, 'google');
      expect(deduplicated).toHaveLength(1);
      // Should take the first one when no Google source exists
      expect(deduplicated[0].currentPrice).toBe(100);
      expect(deduplicated[0].source).toBe('tavily');
    });

    it('should normalize retailer URLs correctly', () => {
      const prices: PriceInfo[] = [
        {
          retailer: 'Amazon',
          productName: 'Product A',
          currentPrice: 100,
          currency: 'USD',
          url: 'https://www.amazon.com/product-a',
          source: 'google',
        },
        {
          retailer: 'Amazon',
          productName: 'Product A',
          currentPrice: 105,
          currency: 'USD',
          url: 'https://amazon.com/product-b',
          source: 'tavily',
        },
        {
          retailer: 'Amazon',
          productName: 'Product A',
          currentPrice: 110,
          currency: 'USD',
          url: 'https://www.amazon.co.uk/product-c',
          source: 'brave',
        },
      ];

      const deduplicated = deduplicateByRetailer(prices, 'google');
      // All URLs should be recognized as same retailer (amazon)
      expect(deduplicated).toHaveLength(1);
      expect(deduplicated[0].currentPrice).toBe(100);
      expect(deduplicated[0].source).toBe('google');
    });

    it('should handle empty input', () => {
      const deduplicated = deduplicateByRetailer([]);
      expect(deduplicated).toHaveLength(0);
    });

    it('should handle single result', () => {
      const prices: PriceInfo[] = [
        {
          retailer: 'Amazon',
          productName: 'Product A',
          currentPrice: 100,
          currency: 'USD',
          url: 'https://amazon.com/product-a',
          source: 'google',
        },
      ];

      const deduplicated = deduplicateByRetailer(prices);
      expect(deduplicated).toHaveLength(1);
      expect(deduplicated[0]).toEqual(prices[0]);
    });

    it('should work with different priority sources', () => {
      const prices: PriceInfo[] = [
        {
          retailer: 'Amazon',
          productName: 'Product A',
          currentPrice: 100,
          currency: 'USD',
          url: 'https://amazon.com/product-a',
          source: 'tavily',
        },
        {
          retailer: 'Amazon',
          productName: 'Product A',
          currentPrice: 105,
          currency: 'USD',
          url: 'https://amazon.com/product-a-2',
          source: 'brave',
        },
      ];

      const deduplicatedTavily = deduplicateByRetailer(prices, 'tavily');
      expect(deduplicatedTavily[0].source).toBe('tavily');
      expect(deduplicatedTavily[0].currentPrice).toBe(100);

      const deduplicatedBrave = deduplicateByRetailer(prices, 'brave');
      expect(deduplicatedBrave[0].source).toBe('brave');
      expect(deduplicatedBrave[0].currentPrice).toBe(105);
    });
  });
});
