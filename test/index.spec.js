import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import worker from '../src';

// Mock RSS feed data for testing
const mockRSSFeed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test Blog</title>
    <description>A test blog</description>
    <item>
      <title><![CDATA[Test Article 1]]></title>
      <link>https://example.com/article-1</link>
      <pubDate>Mon, 01 Jan 2024 12:00:00 GMT</pubDate>
      <description><![CDATA[This is test article 1 content]]></description>
    </item>
    <item>
      <title>Test Article 2</title>
      <link>https://example.com/article-2</link>
      <pubDate>Sun, 31 Dec 2023 12:00:00 GMT</pubDate>
      <description>This is test article 2 content</description>
    </item>
  </channel>
</rss>`;

const mockAtomFeed = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Test Atom Feed</title>
  <entry>
    <title>Atom Article 1</title>
    <link href="https://example.com/atom-1"/>
    <published>2024-01-01T12:00:00Z</published>
    <summary>Atom article 1 summary</summary>
  </entry>
</feed>`;

describe('RSS Card API Worker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock console methods to avoid noise in test output
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('Main fetch handler', () => {
    it('returns welcome HTML page for root path', async () => {
      const request = new Request('http://example.com/');
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('text/html');
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      
      const html = await response.text();
      expect(html).toContain('RSS Card API');
      expect(html).toContain('/api/rss-card');
      expect(html).toContain('feed_url');
    });

    it('returns welcome HTML page for unknown paths', async () => {
      const request = new Request('http://example.com/unknown');
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('text/html');
      const html = await response.text();
      expect(html).toContain('RSS Card API');
    });
  });

  describe('CORS handling', () => {
    it('handles OPTIONS preflight requests correctly', async () => {
      const request = new Request('http://example.com/api/rss-card', {
        method: 'OPTIONS'
      });
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, OPTIONS');
      expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type');
    });

    it('includes CORS headers in all responses', async () => {
      const request = new Request('http://example.com/');
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, OPTIONS');
    });
  });

  describe('RSS Card API endpoint', () => {
    beforeEach(() => {
      // Mock global fetch for RSS feed requests
      global.fetch = vi.fn();
    });

    it('returns error card when feed_url is missing', async () => {
      const request = new Request('http://example.com/api/rss-card');
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(400);
      expect(response.headers.get('Content-Type')).toBe('image/svg+xml');
      
      const svg = await response.text();
      expect(svg).toContain('<svg');
      expect(svg).toContain('feed_url parameter is required');
    });

    it('generates SVG card with valid RSS feed', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockRSSFeed)
      });

      const feedUrl = encodeURIComponent('https://example.com/feed.xml');
      const request = new Request(`http://example.com/api/rss-card?feed_url=${feedUrl}`);
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('image/svg+xml');
      expect(response.headers.get('Cache-Control')).toBe('public, max-age=1800');
      
      const svg = await response.text();
      expect(svg).toContain('<svg');
      expect(svg).toContain('Test Article 1');
      expect(svg).toContain('Test Article 2');
      expect(svg).toContain('Latest Articles');
    });

    it('applies custom parameters correctly', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockRSSFeed)
      });

      const feedUrl = encodeURIComponent('https://example.com/feed.xml');
      const params = new URLSearchParams({
        feed_url: 'https://example.com/feed.xml',
        theme: 'dark',
        count: '1',
        title: 'My Articles',
        width: '500',
        height: '300'
      });
      
      const request = new Request(`http://example.com/api/rss-card?${params}`);
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      const svg = await response.text();
      expect(svg).toContain('width="500"');
      expect(svg).toContain('My Articles');
      expect(svg).toContain('Test Article 1');
      expect(svg).not.toContain('Test Article 2'); // Only 1 article requested
    });

    it('handles RSS feed fetch errors gracefully', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      const feedUrl = encodeURIComponent('https://example.com/nonexistent.xml');
      const request = new Request(`http://example.com/api/rss-card?feed_url=${feedUrl}`);
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(400);
      const svg = await response.text();
      expect(svg).toContain('Error loading RSS feed');
    });

    it('handles network errors gracefully', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      const feedUrl = encodeURIComponent('https://example.com/feed.xml');
      const request = new Request(`http://example.com/api/rss-card?feed_url=${feedUrl}`);
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(400);
      const svg = await response.text();
      expect(svg).toContain('Error loading RSS feed');
    });
  });

  describe('RSS Feed Parsing', () => {
    it('parses RSS feed with CDATA titles correctly', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockRSSFeed)
      });

      const feedUrl = encodeURIComponent('https://example.com/feed.xml');
      const request = new Request(`http://example.com/api/rss-card?feed_url=${feedUrl}`);
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      const svg = await response.text();
      expect(svg).toContain('Test Article 1');
      expect(svg).toContain('Test Article 2');
    });

    it('parses Atom feed correctly', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockAtomFeed)
      });

      const feedUrl = encodeURIComponent('https://example.com/atom.xml');
      const request = new Request(`http://example.com/api/rss-card?feed_url=${feedUrl}`);
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      const svg = await response.text();
      expect(svg).toContain('Atom Article 1');
    });

    it('handles malformed feed data gracefully', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('<invalid>xml</invalid>')
      });

      const feedUrl = encodeURIComponent('https://example.com/bad-feed.xml');
      const request = new Request(`http://example.com/api/rss-card?feed_url=${feedUrl}`);
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(200);
      const svg = await response.text();
      expect(svg).toContain('<svg');
    });

    it('respects article count limit', async () => {
      const largeFeed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    ${Array.from({length: 10}, (_, i) => `
      <item>
        <title>Article ${i + 1}</title>
        <link>https://example.com/article-${i + 1}</link>
        <pubDate>Mon, 0${i + 1} Jan 2024 12:00:00 GMT</pubDate>
      </item>
    `).join('')}
  </channel>
</rss>`;

      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(largeFeed)
      });

      const feedUrl = encodeURIComponent('https://example.com/feed.xml');
      const request = new Request(`http://example.com/api/rss-card?feed_url=${feedUrl}&count=3`);
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      const svg = await response.text();
      expect(svg).toContain('Article 1');
      expect(svg).toContain('Article 2');
      expect(svg).toContain('Article 3');
      expect(svg).not.toContain('Article 4');
    });
  });

  describe('Theme support', () => {
    beforeEach(() => {
      global.fetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockRSSFeed)
      });
    });

    it.each(['default', 'dark', 'radical', 'github'])('generates card with %s theme', async (theme) => {
      const feedUrl = encodeURIComponent('https://example.com/feed.xml');
      const request = new Request(`http://example.com/api/rss-card?feed_url=${feedUrl}&theme=${theme}`);
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(200);
      const svg = await response.text();
      expect(svg).toContain('<svg');
      expect(svg).toContain('<style>');
    });

    it('falls back to default theme for unknown theme', async () => {
      const feedUrl = encodeURIComponent('https://example.com/feed.xml');
      const request = new Request(`http://example.com/api/rss-card?feed_url=${feedUrl}&theme=nonexistent`);
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      const svg = await response.text();
      expect(svg).toContain('<svg');
      expect(response.status).toBe(200);
    });
  });

  describe('Utility functions', () => {
    describe('escapeXml', () => {
      it('escapes XML special characters correctly', async () => {
        const testFeed = `<?xml version="1.0"?>
<rss><channel><item>
  <title>Test &amp; "Quotes" &lt;Tags&gt;</title>
  <link>https://example.com/test</link>
  <pubDate>Mon, 01 Jan 2024 12:00:00 GMT</pubDate>
</item></channel></rss>`;

        global.fetch.mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(testFeed)
        });

        const feedUrl = encodeURIComponent('https://example.com/feed.xml');
        const request = new Request(`http://example.com/api/rss-card?feed_url=${feedUrl}`);
        const ctx = createExecutionContext();
        const response = await worker.fetch(request, env, ctx);
        await waitOnExecutionContext(ctx);

        const svg = await response.text();
        expect(svg).toContain('Test &amp; &quot;Quotes&quot; &lt;Tags&gt;');
      });

      it('handles empty or null values', async () => {
        const testFeed = `<?xml version="1.0"?>
<rss><channel><item>
  <title></title>
  <link>https://example.com/test</link>
  <pubDate>Mon, 01 Jan 2024 12:00:00 GMT</pubDate>
</item></channel></rss>`;

        global.fetch.mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(testFeed)
        });

        const feedUrl = encodeURIComponent('https://example.com/feed.xml');
        const request = new Request(`http://example.com/api/rss-card?feed_url=${feedUrl}`);
        const ctx = createExecutionContext();
        const response = await worker.fetch(request, env, ctx);
        await waitOnExecutionContext(ctx);

        expect(response.status).toBe(200);
        const svg = await response.text();
        expect(svg).toContain('<svg');
      });
    });

    describe('HTML entity decoding', () => {
      it('decodes common HTML entities', async () => {
        const testFeed = `<?xml version="1.0"?>
<rss><channel><item>
  <title>Test &amp; &quot;HTML&quot; &lt;Entities&gt; &apos;Here&apos;</title>
  <link>https://example.com/test</link>
  <pubDate>Mon, 01 Jan 2024 12:00:00 GMT</pubDate>
  <description>Content with &nbsp; spaces</description>
</item></channel></rss>`;

        global.fetch.mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(testFeed)
        });

        const feedUrl = encodeURIComponent('https://example.com/feed.xml');
        const request = new Request(`http://example.com/api/rss-card?feed_url=${feedUrl}`);
        const ctx = createExecutionContext();
        const response = await worker.fetch(request, env, ctx);
        await waitOnExecutionContext(ctx);

        const svg = await response.text();
        // After decoding and then escaping for XML
        expect(svg).toContain('Test &amp; &quot;HTML&quot; &lt;Entities&gt; &apos;Here&apos;');
      });
    });
  });

  describe('Content truncation', () => {
    it('truncates long titles correctly', async () => {
      const longTitleFeed = `<?xml version="1.0"?>
<rss><channel><item>
  <title>This is a very long article title that should be truncated because it exceeds the maximum length allowed for display in the RSS card</title>
  <link>https://example.com/test</link>
  <pubDate>Mon, 01 Jan 2024 12:00:00 GMT</pubDate>
</item></channel></rss>`;

      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(longTitleFeed)
      });

      const feedUrl = encodeURIComponent('https://example.com/feed.xml');
      const request = new Request(`http://example.com/api/rss-card?feed_url=${feedUrl}&width=400`);
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      const svg = await response.text();
      expect(svg).toContain('...');
    });

    it('truncates long descriptions correctly', async () => {
      const longDescFeed = `<?xml version="1.0"?>
<rss><channel><item>
  <title>Test Article</title>
  <link>https://example.com/test</link>
  <pubDate>Mon, 01 Jan 2024 12:00:00 GMT</pubDate>
  <description>This is a very long description that contains a lot of text and should be truncated to fit within the card dimensions without making the card too large or unreadable for users who want to see a quick preview</description>
</item></channel></rss>`;

      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(longDescFeed)
      });

      const feedUrl = encodeURIComponent('https://example.com/feed.xml');
      const request = new Request(`http://example.com/api/rss-card?feed_url=${feedUrl}&width=400`);
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      const svg = await response.text();
      expect(svg).toContain('...');
    });
  });

  describe('Date formatting', () => {
    it('formats dates correctly', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockRSSFeed)
      });

      const feedUrl = encodeURIComponent('https://example.com/feed.xml');
      const request = new Request(`http://example.com/api/rss-card?feed_url=${feedUrl}`);
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      const svg = await response.text();
      expect(svg).toContain('Jan 1'); // Formatted date from mock feed
      expect(svg).toContain('Dec 31'); // Second article date
    });

    it('handles invalid dates gracefully', async () => {
      const invalidDateFeed = `<?xml version="1.0"?>
<rss><channel><item>
  <title>Test Article</title>
  <link>https://example.com/test</link>
  <pubDate>invalid-date</pubDate>
</item></channel></rss>`;

      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(invalidDateFeed)
      });

      const feedUrl = encodeURIComponent('https://example.com/feed.xml');
      const request = new Request(`http://example.com/api/rss-card?feed_url=${feedUrl}`);
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(200);
      const svg = await response.text();
      expect(svg).toContain('<svg');
    });
  });

  describe('Card dimensions', () => {
    beforeEach(() => {
      global.fetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockRSSFeed)
      });
    });

    it('adjusts card height based on article count', async () => {
      const feedUrl = encodeURIComponent('https://example.com/feed.xml');
      const request = new Request(`http://example.com/api/rss-card?feed_url=${feedUrl}&count=5`);
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      const svg = await response.text();
      const heightMatch = svg.match(/height="(\d+)"/);
      const height = parseInt(heightMatch?.[1] || '0');
      expect(height).toBeGreaterThan(200); // Should be larger than default for multiple articles
    });

    it('respects custom width and height', async () => {
      const feedUrl = encodeURIComponent('https://example.com/feed.xml');
      const request = new Request(`http://example.com/api/rss-card?feed_url=${feedUrl}&width=600&height=300`);
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      const svg = await response.text();
      expect(svg).toContain('width="600"');
      expect(svg).toContain('viewBox="0 0 600');
    });
  });
});