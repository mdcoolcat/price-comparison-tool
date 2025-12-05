import { describe, it, expect } from 'vitest';
import { isValidUrl, normalizeUrl, isUrl } from '../src/core/urlHandler';

describe('urlHandler', () => {
  describe('isValidUrl', () => {
    it('should return true for valid HTTP URLs', () => {
      expect(isValidUrl('http://example.com')).toBe(true);
      expect(isValidUrl('http://www.example.com')).toBe(true);
      expect(isValidUrl('http://example.com/path')).toBe(true);
    });

    it('should return true for valid HTTPS URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('https://www.example.com')).toBe(true);
      expect(isValidUrl('https://amazon.com/product/12345')).toBe(true);
    });

    it('should return true for URLs without protocol', () => {
      expect(isValidUrl('example.com')).toBe(true);
      expect(isValidUrl('www.example.com')).toBe(true);
    });

    it('should return false for invalid URLs', () => {
      expect(isValidUrl('not a url')).toBe(false);
      expect(isValidUrl('javascript:alert(1)')).toBe(false);
      expect(isValidUrl('ftp://example.com')).toBe(false);
    });

    it('should return false for empty or invalid input', () => {
      expect(isValidUrl('')).toBe(false);
      expect(isValidUrl(null as any)).toBe(false);
      expect(isValidUrl(undefined as any)).toBe(false);
    });

    it('should handle URLs with ports', () => {
      expect(isValidUrl('http://localhost:3000')).toBe(true);
      expect(isValidUrl('https://example.com:8080/path')).toBe(true);
    });

    it('should handle URLs with query parameters', () => {
      expect(isValidUrl('https://example.com?q=search')).toBe(true);
      expect(isValidUrl('https://example.com/path?q=search&page=2')).toBe(true);
    });

    it('should handle URLs with fragments', () => {
      expect(isValidUrl('https://example.com#section')).toBe(true);
      expect(isValidUrl('https://example.com/path#section')).toBe(true);
    });
  });

  describe('normalizeUrl', () => {
    it('should add https:// prefix when missing', () => {
      expect(normalizeUrl('example.com')).toBe('https://example.com/');
      expect(normalizeUrl('www.example.com')).toBe('https://www.example.com/');
    });

    it('should preserve existing http:// protocol', () => {
      const url = 'http://example.com';
      expect(normalizeUrl(url)).toBe('http://example.com/');
    });

    it('should preserve existing https:// protocol', () => {
      const url = 'https://example.com';
      expect(normalizeUrl(url)).toBe('https://example.com/');
    });

    it('should handle URLs with paths', () => {
      expect(normalizeUrl('example.com/path/to/product')).toBe(
        'https://example.com/path/to/product'
      );
      expect(normalizeUrl('https://example.com/path')).toBe(
        'https://example.com/path'
      );
    });

    it('should handle URLs with query parameters', () => {
      expect(normalizeUrl('example.com?q=search')).toBe(
        'https://example.com/?q=search'
      );
    });

    it('should trim whitespace', () => {
      expect(normalizeUrl('  example.com  ')).toBe('https://example.com/');
      expect(normalizeUrl('  https://example.com  ')).toBe('https://example.com/');
    });

    it('should throw error for empty input', () => {
      expect(() => normalizeUrl('')).toThrow('Invalid URL');
      expect(() => normalizeUrl('   ')).toThrow();
    });

    it('should throw error for invalid protocols', () => {
      expect(() => normalizeUrl('ftp://example.com')).toThrow();
      expect(() => normalizeUrl('javascript:alert(1)')).toThrow();
    });

    it('should handle URLs with ports', () => {
      expect(normalizeUrl('localhost:3000')).toBe('https://localhost:3000/');
      expect(normalizeUrl('example.com:8080')).toBe('https://example.com:8080/');
    });
  });

  describe('isUrl', () => {
    it('should return true for URLs with protocol', () => {
      expect(isUrl('http://example.com')).toBe(true);
      expect(isUrl('https://example.com')).toBe(true);
      expect(isUrl('HTTPS://example.com')).toBe(true);
    });

    it('should return true for domain-like strings', () => {
      expect(isUrl('example.com')).toBe(true);
      expect(isUrl('www.example.com')).toBe(true);
      expect(isUrl('subdomain.example.com')).toBe(true);
      expect(isUrl('example.co.uk')).toBe(true);
    });

    it('should return true for URLs with paths', () => {
      expect(isUrl('example.com/path')).toBe(true);
      expect(isUrl('example.com/path/to/product')).toBe(true);
    });

    it('should return false for plain text', () => {
      expect(isUrl('Gaming Laptop')).toBe(false);
      expect(isUrl('iPhone 15 Pro')).toBe(false);
      expect(isUrl('product name')).toBe(false);
    });

    it('should return false for empty or invalid input', () => {
      expect(isUrl('')).toBe(false);
      expect(isUrl('   ')).toBe(false);
      expect(isUrl(null as any)).toBe(false);
      expect(isUrl(undefined as any)).toBe(false);
    });

    it('should return false for invalid protocols', () => {
      expect(isUrl('ftp://example.com')).toBe(false);
      expect(isUrl('javascript:alert(1)')).toBe(false);
    });
  });
});
