/**
 * @typedef {Object} Env
 */

export default {
	/**
	 * @param {Request} request
	 * @param {Env} env
	 * @param {ExecutionContext} ctx
	 * @returns {Promise<Response>}
	 */
	async fetch(request, env, ctx) {
		const url = new URL(request.url);
		console.log(`RSS Card API accessed from ${request.headers.get('user-agent')} at path ${url.pathname}!`);

		// CORS headers for all responses
		const corsHeaders = {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type',
		};

		// Handle preflight requests
		if (request.method === 'OPTIONS') {
			return new Response(null, { headers: corsHeaders });
		}

		if (url.pathname === '/api/rss-card') {
			return await handleRSSCard(request, corsHeaders);
		}

		// Default welcome page
		const welcomeHTML = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>RSS Card API</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 40px; background: #f8fafc; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        h1 { color: #1e293b; margin-bottom: 8px; }
        .subtitle { color: #64748b; margin-bottom: 32px; }
        .endpoint { background: #f1f5f9; padding: 16px; border-radius: 8px; margin: 16px 0; font-family: monospace; }
        .param { background: #ecfdf5; padding: 12px; border-left: 4px solid #10b981; margin: 8px 0; }
        .example { background: #fef3c7; padding: 16px; border-radius: 8px; margin: 16px 0; }
        code { background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-size: 14px; }
        .demo-card { text-align: center; margin: 24px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🚀 RSS Card API</h1>
        <p class="subtitle">Generate dynamic SVG cards for your GitHub README displaying latest RSS feed articles</p>
        
        <h2>📍 API Endpoint</h2>
        <div class="endpoint">GET /api/rss-card</div>
        
        <h2>📋 Parameters</h2>
        <div class="param"><strong>feed_url</strong> (required) - RSS feed URL (URL encoded)</div>
        <div class="param"><strong>theme</strong> - Card theme: default, dark, radical, github</div>
        <div class="param"><strong>count</strong> - Number of articles (default: 5)</div>
        <div class="param"><strong>title</strong> - Card title (default: "Latest Articles")</div>
        <div class="param"><strong>width</strong> - Card width (default: 400)</div>
        <div class="param"><strong>height</strong> - Card height (default: 200)</div>
        
        <h2>🎨 Example</h2>
        <div class="example">
          <code>/api/rss-card?feed_url=https%3A%2F%2Fsankalpmukim.dev%2Frss%2Ffeed.xml&theme=dark&count=3</code>
        </div>
        
        <div class="demo-card">
          <img src="/api/rss-card?feed_url=https%3A%2F%2Fsankalpmukim.dev%2Frss%2Ffeed.xml&theme=github&count=4&title=Sankalp's%20Articles" alt="Demo RSS Card" />
        </div>
        
        <h2>🔗 Usage in GitHub README</h2>
        <div class="example">
          <code>![RSS Card](${url.origin}/api/rss-card?feed_url=YOUR_ENCODED_RSS_URL&theme=dark)</code>
        </div>
        
        <p><strong>Remember:</strong> Always URL encode your RSS feed URL!</p>
      </div>
    </body>
    </html>`;

		return new Response(welcomeHTML, {
			headers: {
				'content-type': 'text/html',
				...corsHeaders,
			},
		});
	},
};

async function handleRSSCard(request, corsHeaders) {
	const url = new URL(request.url);
	const params = url.searchParams;

	const feedUrl = params.get('feed_url');
	const count = parseInt(params.get('count') || '5');
	const theme = params.get('theme') || 'default';
	const title = params.get('title') || 'Latest Articles';
	const width = parseInt(params.get('width') || '400');
	const height = parseInt(params.get('height') || '200');

	console.log(`here1`);
	if (!feedUrl) {
		return createErrorCard('feed_url parameter is required', width, corsHeaders);
	}

	try {
		// Fetch RSS feed
		const response = await fetch(decodeURIComponent(feedUrl), {
			headers: {
				'User-Agent': 'RSS-Card-API/1.0',
			},
		});

		if (!response.ok) {
			throw new Error(`Failed to fetch RSS feed: ${response.status}`);
		}

		console.log(`here2`);
		const feedData = await response.text();
		const articles = parseRSSFeed(feedData, count);
		console.log(JSON.stringify(articles));
		const svg = generateSVGCard(articles, theme, title, width, height);

		return new Response(svg, {
			headers: {
				'Content-Type': 'image/svg+xml',
				'Cache-Control': 'public, max-age=1800', // 30 minutes
				...corsHeaders,
			},
		});
	} catch (error) {
		console.error('RSS Card Error:', error);
		return createErrorCard('Error loading RSS feed', width, corsHeaders);
	}
}

function parseRSSFeed(feedData, maxCount) {
	const articles = [];

	try {
		// Simple RSS/Atom parser
		const itemRegex = /<(?:item|entry)[\s\S]*?<\/(?:item|entry)>/gi;
		const items = feedData.match(itemRegex) || [];

		for (let i = 0; i < Math.min(items.length, maxCount); i++) {
			const item = items[i];

			// Extract title
			const titleMatch = item.match(/<title(?:[^>]*)>[\s]*<!\[CDATA\[(.*?)\]\]>[\s]*<\/title>|<title(?:[^>]*)>(.*?)<\/title>/i);
			const title = titleMatch ? (titleMatch[1] || titleMatch[2] || '').trim() : 'Untitled';

			// Extract link
			const linkMatch = item.match(/<link(?:[^>]*)>(.*?)<\/link>|<link[^>]*href=["'](.*?)["']/i);
			const link = linkMatch ? (linkMatch[1] || linkMatch[2] || '').trim() : '#';

			// Extract date
			const dateMatch = item.match(/<(?:pubDate|published|updated)(?:[^>]*)>(.*?)<\/(?:pubDate|published|updated)>/i);
			const dateStr = dateMatch ? dateMatch[1].trim() : new Date().toISOString();

			// Extract description/content
			const descMatch = item.match(
				/<(?:description|summary|content)(?:[^>]*)>[\s]*<!\[CDATA\[(.*?)\]\]>[\s]*<\/(?:description|summary|content)>|<(?:description|summary|content)(?:[^>]*)>(.*?)<\/(?:description|summary|content)>/i
			);
			const description = descMatch ? (descMatch[1] || descMatch[2] || '').replace(/<[^>]*>/g, '').trim() : '';

			articles.push({
				title: decodeHTMLEntities(title),
				link: link.startsWith('http') ? link : '#',
				pubDate: dateStr,
				contentSnippet: decodeHTMLEntities(description),
			});
		}
	} catch (error) {
		console.error('Parse error:', error);
	}

	return articles;
}

function decodeHTMLEntities(text) {
	const entities = {
		'&amp;': '&',
		'&lt;': '<',
		'&gt;': '>',
		'&quot;': '"',
		'&#39;': "'",
		'&apos;': "'",
		'&nbsp;': ' ',
	};

	return text.replace(/&[#\w]+;/g, (entity) => entities[entity] || entity);
}

function generateSVGCard(articles, theme, title, width, height) {
	const themes = {
		default: {
			bg: '#ffffff',
			border: '#d1d5db',
			title: '#1f2937',
			text: '#374151',
			link: '#2563eb',
			accent: '#3b82f6',
		},
		dark: {
			bg: '#0d1117',
			border: '#30363d',
			title: '#f0f6fc',
			text: '#8b949e',
			link: '#58a6ff',
			accent: '#238636',
		},
		radical: {
			bg: '#141321',
			border: '#fff',
			title: '#fe428e',
			text: '#a9fef7',
			link: '#f8d847',
			accent: '#fe428e',
		},
		github: {
			bg: '#ffffff',
			border: '#e1e4e8',
			title: '#24292e',
			text: '#586069',
			link: '#0366d6',
			accent: '#28a745',
		},
	};

	const colors = themes[theme] || themes.default;
	const cardHeight = Math.max(height, 120 + articles.length * 45);

	const articleElements = articles
		.map((article, index) => {
			const yPos = index * 45;
			const date = new Date(article.pubDate).toLocaleDateString('en-US', {
				month: 'short',
				day: 'numeric',
			});

			// Truncate title if too long
			const maxTitleLength = Math.floor((width - 60) / 8);
			const truncatedTitle = article.title.length > maxTitleLength ? article.title.substring(0, maxTitleLength) + '...' : article.title;

			// Truncate description
			const description = article.contentSnippet || '';
			const maxDescLength = Math.floor((width - 60) / 6);
			const truncatedDesc = description.length > maxDescLength ? description.substring(0, maxDescLength) + '...' : description;

			return `
      <g transform="translate(0, ${yPos})">
        <circle cx="4" cy="8" r="2" fill="${colors.accent}" opacity="0.8"/>
        <text x="15" y="12" class="article-title">${escapeXml(truncatedTitle)}</text>
        <text x="15" y="28" class="article-date">${date}</text>
        ${truncatedDesc ? `<text x="15" y="42" class="article-desc">${escapeXml(truncatedDesc)}</text>` : ''}
      </g>
    `;
		})
		.join('');

	return `
<svg width="${width}" height="${cardHeight}" viewBox="0 0 ${width} ${cardHeight}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .title { font: 600 18px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${colors.title}; }
      .article-title { font: 500 14px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${colors.link}; }
      .article-date { font: 400 12px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${colors.text}; }
      .article-desc { font: 400 11px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${colors.text}; }
      .border { stroke: ${colors.border}; stroke-width: 1; fill: ${colors.bg}; }
    </style>
  </defs>
  
  <rect class="border" x="0.5" y="0.5" rx="4.5" height="99%" width="99%"/>
  
  <g transform="translate(25, 35)">
    <circle cx="6" cy="6" r="6" fill="${colors.accent}"/>
    <text x="20" y="10" class="title">${escapeXml(title)}</text>
  </g>
  
  <g transform="translate(25, 65)">
    ${articleElements}
  </g>
  
  <g transform="translate(${width - 80}, ${cardHeight - 20})">
    <text x="0" y="0" class="article-date" opacity="0.6">via RSS</text>
  </g>
</svg>`;
}

function createErrorCard(message, width, corsHeaders) {
	const errorSvg = `
<svg width="${width}" height="120" viewBox="0 0 ${width} 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="0.5" y="0.5" rx="4.5" height="99%" width="99%" stroke="#ef4444" fill="#fef2f2"/>
  <text x="20" y="40" font="600 16px 'Segoe UI'" fill="#dc2626">Error loading RSS feed</text>
  <text x="20" y="65" font="400 12px 'Segoe UI'" fill="#991b1b">${escapeXml(message)}</text>
</svg>`;

	return new Response(errorSvg, {
		status: 400,
		headers: {
			'Content-Type': 'image/svg+xml',
			...corsHeaders,
		},
	});
}

function escapeXml(unsafe) {
	if (!unsafe) return '';
	return unsafe.replace(/[<>&'"]/g, function (c) {
		switch (c) {
			case '<':
				return '&lt;';
			case '>':
				return '&gt;';
			case '&':
				return '&amp;';
			case "'":
				return '&apos;';
			case '"':
				return '&quot;';
		}
	});
}
