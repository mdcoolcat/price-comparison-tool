// URL validation and normalization utilities

/**
 * Checks if a given string is a valid URL
 * @param input - String to validate
 * @returns true if the input is a valid HTTP/HTTPS URL
 */
export function isValidUrl(input: string): boolean {
  if (!input || typeof input !== 'string') {
    return false;
  }

  try {
    const url = new URL(input);
    // Only accept http and https protocols
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    // Try with https:// prefix if not provided
    try {
      const url = new URL(`https://${input}`);
      return url.protocol === 'https:';
    } catch {
      return false;
    }
  }
}

/**
 * Normalizes a URL by ensuring it has a protocol and cleaning it up
 * @param url - URL string to normalize
 * @returns Normalized URL string
 * @throws Error if the URL is invalid
 */
export function normalizeUrl(url: string): string {
  if (!url || typeof url !== 'string') {
    throw new Error('Invalid URL: URL must be a non-empty string');
  }

  let normalizedUrl = url.trim();

  // Check for invalid protocols before processing
  if (normalizedUrl.match(/^[a-z]+:\/\//i)) {
    // Has a protocol, make sure it's http or https
    if (!normalizedUrl.match(/^https?:\/\//i)) {
      throw new Error(`Invalid protocol in URL: ${normalizedUrl}`);
    }
  } else {
    // No protocol, add https://
    normalizedUrl = `https://${normalizedUrl}`;
  }

  try {
    const parsed = new URL(normalizedUrl);

    // Double-check protocol is http or https
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error(`Invalid protocol: ${parsed.protocol}`);
    }

    // Return the normalized URL
    return parsed.href;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to normalize URL: ${error.message}`);
    }
    throw new Error('Failed to normalize URL: Unknown error');
  }
}

/**
 * Checks if input is a URL or plain text product name
 * @param input - String to check
 * @returns true if input appears to be a URL
 */
export function isUrl(input: string): boolean {
  if (!input || typeof input !== 'string') {
    return false;
  }

  // Check if it starts with http:// or https://
  if (input.match(/^https?:\/\//i)) {
    return true;
  }

  // Check if it looks like a URL (has domain-like structure)
  // Match patterns like: example.com, www.example.com, subdomain.example.com
  const domainPattern = /^([a-z0-9-]+\.)+[a-z]{2,}(\/.*)?$/i;
  return domainPattern.test(input.trim());
}
