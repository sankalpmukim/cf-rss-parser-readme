# RSS Card API 📖

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/sankalpmukim/cf-rss-parser-readme)

A Cloudflare Worker that generates dynamic SVG cards displaying your latest RSS feed articles, perfect for GitHub README profiles and personal websites.

## 🚀 Live Demo

🔗 **API Endpoint:** https://cf-rss-parser-readme.sankalpmukim.workers.dev/api/rss-card

![RSS Card Example](https://cf-rss-parser-readme.sankalpmukim.workers.dev/api/rss-card?feed_url=https%3A%2F%2Fsankalpmukim.dev%2Frss%2Ffeed.xml&theme=github&count=3&title=Latest%20Articles)

## ✨ Features

- 🎨 **4 Beautiful Themes** - Default, Dark, Radical, and GitHub
- 📱 **Responsive Design** - Customizable width and height
- ⚡ **Fast & Cached** - 30-minute cache for optimal performance
- 🌐 **CORS Enabled** - Use anywhere on the web
- 📊 **Customizable** - Control article count, title, and styling
- 🔒 **XML Feed Support** - Currently supports RSS/Atom XML feeds

## 🎯 GitHub README Integration

### Basic Usage

Add this to your GitHub README to display your latest articles:

```markdown
![Latest Articles](https://cf-rss-parser-readme.sankalpmukim.workers.dev/api/rss-card?feed_url=YOUR_ENCODED_RSS_URL&theme=github)
```

### Step-by-Step Setup

1. **Get your RSS feed URL** (must be XML format)
   - Common paths: `/rss.xml`, `/feed.xml`, `/atom.xml`
   - Examples: `https://yoursite.com/rss.xml`

2. **Encode your RSS URL** 
   - Use an online URL encoder or JavaScript: `encodeURIComponent(yourRssUrl)`
   - Example: `https://yoursite.com/rss.xml` → `https%3A%2F%2Fyoursite.com%2Frss.xml`

3. **Add to your README:**
   ```markdown
   ## 📝 Latest Articles
   
   ![RSS Articles](https://cf-rss-parser-readme.sankalpmukim.workers.dev/api/rss-card?feed_url=YOUR_ENCODED_URL&theme=dark&count=5)
   ```

## 🎨 Themes & Customization

### Available Themes

| Theme | Preview |
|-------|---------|
| `default` | Light theme with blue accents |
| `dark` | Dark GitHub-style theme |
| `github` | Clean GitHub README style |
| `radical` | High-contrast colorful theme |

### Parameters

| Parameter | Description | Default | Example |
|-----------|-------------|---------|---------|
| `feed_url` | **Required** - Your RSS feed URL (URL encoded) | - | `https%3A%2F%2Fexample.com%2Ffeed.xml` |
| `theme` | Card theme | `default` | `dark`, `github`, `radical` |
| `count` | Number of articles to display | `5` | `3`, `10` |
| `title` | Card title | `"Latest Articles"` | `"My%20Blog%20Posts"` |
| `width` | Card width in pixels | `400` | `500`, `600` |
| `height` | Card height in pixels | `200` | `300` (auto-adjusts based on content) |

### Example Configurations

#### Minimal Setup
```markdown
![Articles](https://cf-rss-parser-readme.sankalpmukim.workers.dev/api/rss-card?feed_url=YOUR_ENCODED_URL)
```

#### Custom Styled
```markdown
![My Blog](https://cf-rss-parser-readme.sankalpmukim.workers.dev/api/rss-card?feed_url=YOUR_ENCODED_URL&theme=dark&count=3&title=My%20Latest%20Posts&width=450)
```

#### Colorful Theme
```markdown
![Creative Posts](https://cf-rss-parser-readme.sankalpmukim.workers.dev/api/rss-card?feed_url=YOUR_ENCODED_URL&theme=radical&count=4&title=Creative%20Corner)
```

## 🛠️ Development

### Prerequisites
- Node.js
- Cloudflare account
- Wrangler CLI

### Local Development

```bash
# Clone the repository
git clone https://github.com/your-username/cf-rss-parser-readme.git
cd cf-rss-parser-readme

# Install dependencies
npm install

# Run locally
npm run dev

# Run tests
npm test

# Deploy to Cloudflare Workers
npm run deploy
```

### Project Structure

```
cf-rss-parser-readme/
├── src/
│   └── index.js          # Main Worker code
├── test/
│   └── index.spec.js     # Tests
├── package.json          # Dependencies
├── wrangler.jsonc        # Cloudflare Workers config
└── README.md
```

## 🔧 API Reference

### Endpoint
```
GET /api/rss-card
```

### Response
- **Content-Type:** `image/svg+xml`
- **Cache-Control:** `public, max-age=1800` (30 minutes)
- **CORS:** Enabled for all origins

### Error Handling
Returns error SVG cards for:
- Missing `feed_url` parameter
- Invalid or unreachable RSS feeds
- Malformed XML content

## 📝 RSS Feed Requirements

- **Format:** XML-based feeds (RSS 2.0, Atom)
- **Accessibility:** Must be publicly accessible
- **CORS:** Not required (server-side fetching)

### Supported Feed Elements
- `<title>` - Article title
- `<link>` - Article URL
- `<pubDate>` / `<published>` - Publication date
- `<description>` / `<summary>` - Article description

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙋‍♂️ Support

Having issues? Check out:

- [Live demo and documentation](https://cf-rss-parser-readme.sankalpmukim.workers.dev/)
- [GitHub Issues](https://github.com/your-username/cf-rss-parser-readme/issues)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)

---

⭐ If this project helped you, please consider giving it a star!