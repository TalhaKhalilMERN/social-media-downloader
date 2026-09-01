export type PlatformType = 'reelshort' | 'dramabox';

export interface UrlValidationResult {
  isValid: boolean;
  platform?: PlatformType;
  error?: string;
  normalizedUrl?: string;
}

/**
 * Validates whether a given URL belongs to a supported platform (ReelShort or DramaBox).
 * Rejects all other domains, malformed URLs, and lookalike domains.
 */
export function validateSupportedUrl(inputUrl: string): UrlValidationResult {
  if (!inputUrl || typeof inputUrl !== 'string' || !inputUrl.trim()) {
    return {
      isValid: false,
      error: 'Please enter a ReelShort or DramaBox episode URL.',
    };
  }

  const trimmed = inputUrl.trim();

  let parsed: URL;
  try {
    // If protocol is missing, prepend https:// for syntax evaluation
    const urlToParse = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    parsed = new URL(urlToParse);
  } catch {
    return {
      isValid: false,
      error: 'Please enter a syntactically valid URL.',
    };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return {
      isValid: false,
      error: 'Only HTTP and HTTPS URLs are supported.',
    };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Validate ReelShort domains (reelshort.com, www.reelshort.com, sub.reelshort.com)
  if (hostname === 'reelshort.com' || hostname.endsWith('.reelshort.com')) {
    return {
      isValid: true,
      platform: 'reelshort',
      normalizedUrl: parsed.toString(),
    };
  }

  // Validate DramaBox domains (dramabox.com, www.dramabox.com, sub.dramabox.com)
  if (hostname === 'dramabox.com' || hostname.endsWith('.dramabox.com')) {
    return {
      isValid: true,
      platform: 'dramabox',
      normalizedUrl: parsed.toString(),
    };
  }

  return {
    isValid: false,
    error: 'Unsupported website. This downloader currently supports ReelShort and DramaBox only.',
  };
}
