import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchProduct, filterEcommerceResults } from '../src/core/searchService';
import * as mcpBridge from '../src/services/mcpBridge';
import * as googleShopping from '../src/services/googleShopping';
import { BraveSearchResponse, TavilySearchResponse, SearchResult } from '../src/types';

// Mock the MCP bridge and Google Shopping
vi.mock('../src/services/mcpBridge');
vi.mock('../src/services/googleShopping');

describe('searchService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('searchProduct', () => {
    it('should search using both Brave and Tavily', async () => {
      const mockBraveResponse: BraveSearchResponse = {
        type: 'search',
        results: {
          web: {
            results: [
              {
                title: 'Gaming Laptop $1299',
                url: 'https://amazon.com/gaming-laptop',
                description: 'High performance gaming laptop',
              },
            ],
          },
        },
      };

      const mockTavilyResponse: TavilySearchResponse = {
        query: 'Gaming Laptop price',
        results: [
          {
            title: 'Gaming Laptop $1249',
            url: 'https://bestbuy.com/gaming-laptop',
            content: 'Best gaming laptop deal',
            score: 0.95,
          },
        ],
      };

      vi.mocked(mcpBridge.searchBoth).mockResolvedValue({
        brave: mockBraveResponse,
        tavily: mockTavilyResponse,
        errors: [],
      });

      const results = await searchProduct('Gaming Laptop');

      expect(results).toHaveLength(2);
      expect(results[0].source).toBe('brave');
      expect(results[1].source).toBe('tavily');
    });

    it('should work with only Brave results', async () => {
      const mockBraveResponse: BraveSearchResponse = {
        type: 'search',
        results: {
          web: {
            results: [
              {
                title: 'Product $99',
                url: 'https://amazon.com/product',
                description: 'Product description',
              },
            ],
          },
        },
      };

      vi.mocked(mcpBridge.searchBoth).mockResolvedValue({
        brave: mockBraveResponse,
        tavily: null,
        errors: [new Error('Tavily failed')],
      });

      const results = await searchProduct('Product Name');

      expect(results).toHaveLength(1);
      expect(results[0].source).toBe('brave');
    });

    it('should work with only Tavily results', async () => {
      const mockTavilyResponse: TavilySearchResponse = {
        query: 'Product Name price',
        results: [
          {
            title: 'Product $99',
            url: 'https://walmart.com/product',
            content: 'Product details',
            score: 0.9,
          },
        ],
      };

      vi.mocked(mcpBridge.searchBoth).mockResolvedValue({
        brave: null,
        tavily: mockTavilyResponse,
        errors: [new Error('Brave failed')],
      });

      const results = await searchProduct('Product Name');

      expect(results).toHaveLength(1);
      expect(results[0].source).toBe('tavily');
    });

    it('should throw error when both engines fail', async () => {
      vi.mocked(mcpBridge.searchBoth).mockRejectedValue(
        new Error('Both search engines failed')
      );

      await expect(searchProduct('Product')).rejects.toThrow('Search failed');
    });

    it('should throw error for empty product name', async () => {
      await expect(searchProduct('')).rejects.toThrow('Product name cannot be empty');
      await expect(searchProduct('   ')).rejects.toThrow('Product name cannot be empty');
    });

    it('should enhance search query with "price" keyword', async () => {
      const mockResponse = {
        brave: {
          type: 'search' as const,
          results: { web: { results: [] } },
        },
        tavily: {
          query: 'Product price',
          results: [],
        },
        errors: [],
      };

      vi.mocked(mcpBridge.searchBoth).mockResolvedValue(mockResponse);

      // Will throw because no results, but we can check the call
      await expect(searchProduct('Product')).rejects.toThrow('No search results');

      expect(mcpBridge.searchBoth).toHaveBeenCalledWith('Product price', 10);
    });

    it('should not add "price" if already in query', async () => {
      const mockResponse = {
        brave: {
          type: 'search' as const,
          results: { web: { results: [] } },
        },
        tavily: {
          query: 'Gaming Laptop price',
          results: [],
        },
        errors: [],
      };

      vi.mocked(mcpBridge.searchBoth).mockResolvedValue(mockResponse);

      await expect(searchProduct('Gaming Laptop price')).rejects.toThrow();

      expect(mcpBridge.searchBoth).toHaveBeenCalledWith('Gaming Laptop price', 10);
    });

    it('should remove duplicate URLs', async () => {
      const mockBraveResponse: BraveSearchResponse = {
        type: 'search',
        results: {
          web: {
            results: [
              {
                title: 'Product $99',
                url: 'https://www.amazon.com/product',
                description: 'Description',
              },
            ],
          },
        },
      };

      const mockTavilyResponse: TavilySearchResponse = {
        query: 'Product price',
        results: [
          {
            title: 'Product $99',
            url: 'https://amazon.com/product/', // Same URL, different format
            content: 'Description',
            score: 0.9,
          },
        ],
      };

      vi.mocked(mcpBridge.searchBoth).mockResolvedValue({
        brave: mockBraveResponse,
        tavily: mockTavilyResponse,
        errors: [],
      });

      const results = await searchProduct('Product');

      expect(results).toHaveLength(1); // Duplicate removed
    });

    it('should preserve full Tavily content for price extraction', async () => {
      const longContent = 'A'.repeat(500);

      const mockTavilyResponse: TavilySearchResponse = {
        query: 'Product price',
        results: [
          {
            title: 'Product',
            url: 'https://example.com/product',
            content: longContent,
            score: 0.9,
          },
        ],
      };

      vi.mocked(mcpBridge.searchBoth).mockResolvedValue({
        brave: null,
        tavily: mockTavilyResponse,
        errors: [],
      });

      const results = await searchProduct('Product');

      // Should preserve full content for better price extraction
      expect(results[0].snippet).toBe(longContent);
      expect(results[0].snippet?.length).toBe(500);
    });

    it('should handle custom result count', async () => {
      const mockResponse = {
        brave: {
          type: 'search' as const,
          results: { web: { results: [] } },
        },
        tavily: {
          query: 'Product price',
          results: [],
        },
        errors: [],
      };

      vi.mocked(mcpBridge.searchBoth).mockResolvedValue(mockResponse);
      vi.mocked(googleShopping.searchGoogleShopping).mockResolvedValue([]);

      await expect(searchProduct('Product', 20)).rejects.toThrow();

      expect(mcpBridge.searchBoth).toHaveBeenCalledWith('Product price', 20);
    });

    describe('search modes', () => {
      it('should only search Google when mode is "google"', async () => {
        const mockGoogleResults: SearchResult[] = [
          {
            title: 'Product',
            url: 'https://amazon.com/product',
            snippet: 'Description',
            source: 'google',
          },
        ];

        vi.mocked(googleShopping.searchGoogleShopping).mockResolvedValue(mockGoogleResults);

        const results = await searchProduct('Product', 10, 'google');

        expect(results).toHaveLength(1);
        expect(results[0].source).toBe('google');
        expect(googleShopping.searchGoogleShopping).toHaveBeenCalledWith('Product price', 10);
        expect(mcpBridge.searchBoth).not.toHaveBeenCalled();
      });

      it('should only search MCP engines when mode is "mcp"', async () => {
        const mockMCPResponse = {
          brave: {
            type: 'search' as const,
            results: {
              web: {
                results: [
                  {
                    title: 'Product',
                    url: 'https://amazon.com/product',
                    description: 'Description',
                  },
                ],
              },
            },
          },
          tavily: null,
          errors: [],
        };

        vi.mocked(mcpBridge.searchBoth).mockResolvedValue(mockMCPResponse);

        const results = await searchProduct('Product', 10, 'mcp');

        expect(results).toHaveLength(1);
        expect(results[0].source).toBe('brave');
        expect(mcpBridge.searchBoth).toHaveBeenCalledWith('Product price', 10);
        expect(googleShopping.searchGoogleShopping).not.toHaveBeenCalled();
      });

      it('should search all sources when mode is "all"', async () => {
        const mockMCPResponse = {
          brave: {
            type: 'search' as const,
            results: {
              web: {
                results: [
                  {
                    title: 'Product Brave',
                    url: 'https://walmart.com/product',
                    description: 'Brave result',
                  },
                ],
              },
            },
          },
          tavily: null,
          errors: [],
        };

        const mockGoogleResults: SearchResult[] = [
          {
            title: 'Product Google',
            url: 'https://amazon.com/product',
            snippet: 'Google result',
            source: 'google',
          },
        ];

        vi.mocked(mcpBridge.searchBoth).mockResolvedValue(mockMCPResponse);
        vi.mocked(googleShopping.searchGoogleShopping).mockResolvedValue(mockGoogleResults);

        const results = await searchProduct('Product', 10, 'all');

        expect(results).toHaveLength(2);
        expect(results.some(r => r.source === 'brave')).toBe(true);
        expect(results.some(r => r.source === 'google')).toBe(true);
        expect(mcpBridge.searchBoth).toHaveBeenCalled();
        expect(googleShopping.searchGoogleShopping).toHaveBeenCalled();
      });

      it('should only search Brave when mode is "brave"', async () => {
        const mockMCPResponse = {
          brave: {
            type: 'search' as const,
            results: {
              web: {
                results: [
                  {
                    title: 'Product',
                    url: 'https://target.com/product',
                    description: 'Description',
                  },
                ],
              },
            },
          },
          tavily: {
            query: 'Product',
            results: [{ title: 'Tavily', url: 'https://walmart.com/tav', content: 'Content', score: 0.9 }],
          },
          errors: [],
        };

        vi.mocked(mcpBridge.searchBoth).mockResolvedValue(mockMCPResponse);

        const results = await searchProduct('Product', 10, 'brave');

        expect(results).toHaveLength(1);
        expect(results[0].source).toBe('brave');
      });

      it('should only search Tavily when mode is "tavily"', async () => {
        const mockMCPResponse = {
          brave: {
            type: 'search' as const,
            results: {
              web: {
                results: [
                  {
                    title: 'Brave',
                    url: 'https://ebay.com/item',
                    description: 'Description',
                  },
                ],
              },
            },
          },
          tavily: {
            query: 'Product',
            results: [{ title: 'Product', url: 'https://bestbuy.com/product', content: 'Content', score: 0.9 }],
          },
          errors: [],
        };

        vi.mocked(mcpBridge.searchBoth).mockResolvedValue(mockMCPResponse);

        const results = await searchProduct('Product', 10, 'tavily');

        expect(results).toHaveLength(1);
        expect(results[0].source).toBe('tavily');
      });
    });
  });

  describe('filterEcommerceResults', () => {
    it('should filter by e-commerce domains', () => {
      const results: SearchResult[] = [
        {
          title: 'Product on Amazon',
          url: 'https://amazon.com/product',
          snippet: '',
          source: 'brave',
        },
        {
          title: 'Product Review',
          url: 'https://review-site.com/article',
          snippet: '',
          source: 'brave',
        },
        {
          title: 'Product on eBay',
          url: 'https://ebay.com/item/123',
          snippet: '',
          source: 'tavily',
        },
      ];

      const filtered = filterEcommerceResults(results);

      expect(filtered).toHaveLength(2);
      expect(filtered[0].url).toContain('amazon');
      expect(filtered[1].url).toContain('ebay');
    });

    it('should filter by e-commerce keywords in URL', () => {
      const results: SearchResult[] = [
        {
          title: 'Product',
          url: 'https://example.com/shop/product',
          snippet: '',
          source: 'brave',
        },
        {
          title: 'Article',
          url: 'https://blog.com/article',
          snippet: '',
          source: 'brave',
        },
      ];

      const filtered = filterEcommerceResults(results);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].url).toContain('shop');
    });

    it('should filter by e-commerce keywords in title', () => {
      const results: SearchResult[] = [
        {
          title: 'Buy Product Here',
          url: 'https://example.com/product',
          snippet: '',
          source: 'brave',
        },
        {
          title: 'Product Review',
          url: 'https://example.com/review',
          snippet: '',
          source: 'brave',
        },
      ];

      const filtered = filterEcommerceResults(results);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].title).toContain('Buy');
    });

    it('should handle empty array', () => {
      const filtered = filterEcommerceResults([]);
      expect(filtered).toHaveLength(0);
    });

    it('should be case insensitive', () => {
      const results: SearchResult[] = [
        {
          title: 'Product',
          url: 'https://AMAZON.COM/product',
          snippet: '',
          source: 'brave',
        },
      ];

      const filtered = filterEcommerceResults(results);

      expect(filtered).toHaveLength(1);
    });
  });
});
