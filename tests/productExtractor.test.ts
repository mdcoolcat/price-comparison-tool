import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractProductFromUrl, extractProductNameFromContent } from '../src/core/productExtractor';
import * as mcpBridge from '../src/services/mcpBridge';
import { TavilyExtractResponse } from '../src/types';

// Mock the MCP bridge
vi.mock('../src/services/mcpBridge');

describe('productExtractor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('extractProductFromUrl', () => {
    it('should extract product name from URL using Tavily', async () => {
      const mockResponse: TavilyExtractResponse = {
        results: [
          {
            url: 'https://example.com/product/gaming-laptop',
            content: '<h1>Dell XPS 15 Gaming Laptop</h1><p>High performance laptop...</p>',
            success: true,
          },
        ],
      };

      vi.mocked(mcpBridge.extractFromUrl).mockResolvedValue(mockResponse);

      const result = await extractProductFromUrl('https://example.com/product/gaming-laptop');

      expect(result.name).toContain('Dell XPS 15');
      expect(result.originalUrl).toBe('https://example.com/product/gaming-laptop');
      expect(result.extractedAt).toBeInstanceOf(Date);
    });

    it('should throw error when no content extracted', async () => {
      const mockResponse: TavilyExtractResponse = {
        results: [],
      };

      vi.mocked(mcpBridge.extractFromUrl).mockResolvedValue(mockResponse);

      await expect(
        extractProductFromUrl('https://example.com/product')
      ).rejects.toThrow('No content extracted');
    });

    it('should throw error when extraction fails', async () => {
      const mockResponse: TavilyExtractResponse = {
        results: [
          {
            url: 'https://example.com/product',
            content: '',
            success: false,
          },
        ],
      };

      vi.mocked(mcpBridge.extractFromUrl).mockResolvedValue(mockResponse);

      await expect(
        extractProductFromUrl('https://example.com/product')
      ).rejects.toThrow('Failed to extract content');
    });

    it('should handle MCP bridge errors', async () => {
      vi.mocked(mcpBridge.extractFromUrl).mockRejectedValue(
        new Error('Network error')
      );

      await expect(
        extractProductFromUrl('https://example.com/product')
      ).rejects.toThrow('Failed to extract product from URL');
    });
  });

  describe('extractProductNameFromContent', () => {
    it('should extract from title tag', () => {
      const content = '<title>Gaming Laptop XYZ - Best Buy</title><p>Content...</p>';
      const name = extractProductNameFromContent(content, 'https://example.com');

      expect(name).toContain('Gaming Laptop XYZ');
    });

    it('should extract from h1 tag', () => {
      const content = '<h1>iPhone 15 Pro Max</h1><p>Description...</p>';
      const name = extractProductNameFromContent(content, 'https://example.com');

      expect(name).toContain('iPhone 15 Pro');
    });

    it('should extract from product_name field', () => {
      const content = 'product_name: "Dell XPS 13 Laptop"\nother: "data"';
      const name = extractProductNameFromContent(content, 'https://example.com');

      expect(name).toContain('Dell XPS 13');
    });

    it('should clean HTML entities', () => {
      const content = '<title>Gaming&nbsp;Laptop&amp;Mouse - Shop</title>';
      const name = extractProductNameFromContent(content, 'https://example.com');

      expect(name).toContain('Gaming Laptop');
      expect(name).toContain('&');
    });

    it('should remove HTML tags', () => {
      const content = '<h1><span class="brand">Dell</span> XPS 15</h1>';
      const name = extractProductNameFromContent(content, 'https://example.com');

      expect(name).not.toContain('<');
      expect(name).not.toContain('>');
      expect(name).toContain('Dell');
    });

    it('should remove common suffixes', () => {
      const content = '<title>Gaming Laptop - Buy Now | Amazon</title>';
      const name = extractProductNameFromContent(content, 'https://example.com');

      expect(name).toContain('Gaming Laptop');
      expect(name).not.toContain('Buy Now');
    });

    it('should limit length to 150 characters', () => {
      const longContent = '<title>' + 'A'.repeat(200) + '</title>';
      const name = extractProductNameFromContent(longContent, 'https://example.com');

      expect(name.length).toBeLessThanOrEqual(150);
    });

    it('should skip navigation text', () => {
      const content = 'Home\nAbout Us\nGaming Laptop XYZ\nContact';
      const name = extractProductNameFromContent(content, 'https://example.com');

      expect(name).toContain('Gaming Laptop');
      expect(name).not.toContain('Home');
      expect(name).not.toContain('About');
    });

    it('should use first substantial content when URL extraction fails', () => {
      const content = 'Some generic text that is not helpful but substantial enough';
      const url = 'https://example.com/product/123'; // Generic URL
      const name = extractProductNameFromContent(content, url);

      expect(name.length).toBeGreaterThan(3);
      expect(name).toBeTruthy();
    });

    it('should handle content with multiple potential names', () => {
      const content = `
        <div class="navigation">Home | Products</div>
        <h1>Dell XPS 15 Gaming Laptop</h1>
        <p>Description of the product...</p>
      `;
      const name = extractProductNameFromContent(content, 'https://example.com');

      expect(name).toContain('Dell XPS 15');
    });

    it('should throw error when no product name found', () => {
      const content = 'x'; // Too short
      const url = 'https://example.com';

      expect(() => extractProductNameFromContent(content, url)).toThrow(
        'Could not extract product name'
      );
    });

    it('should handle title field in JSON-like content', () => {
      const content = 'title: "MacBook Pro 16-inch"\nprice: 2499';
      const name = extractProductNameFromContent(content, 'https://example.com');

      expect(name).toContain('MacBook Pro');
    });

    it('should normalize whitespace', () => {
      const content = '<h1>Gaming     Laptop    XYZ</h1>';
      const name = extractProductNameFromContent(content, 'https://example.com');

      expect(name).not.toMatch(/\s{2,}/);
      expect(name).toContain('Gaming Laptop XYZ');
    });
  });
});
