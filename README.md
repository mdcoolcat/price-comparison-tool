# Product Price Comparison Tool

A TypeScript-based price comparison tool that searches multiple retailers using Google Shopping, Brave Search, and Tavily to find the best product prices.

## Features

- ✅ **URL or Product Name Input**: Enter either a product URL or just the product name
- ✅ **Automatic Product Extraction**: Extracts product names from URLs using Tavily
- ✅ **Multi-Engine Search**: Searches Google Shopping, Brave, and Tavily for comprehensive results
- ✅ **Flexible Search Modes**: Choose specific engines (`google`, `brave`, `tavily`, `mcp`) or search all at once
- ✅ **Smart Filtering**: Automatically filters out non-e-commerce sites (YouTube, Reddit, social media)
- ✅ **Price Parsing**: Automatically extracts prices, currencies, and discount information
- ✅ **Smart Sorting**: Results sorted by lowest price first
- ✅ **Multiple Currency Support**: Handles USD, GBP, EUR, CAD, and AUD
- ✅ **Clean Web Interface**: Simple, responsive UI for easy price comparison
- ✅ **Comprehensive Tests**: 105 tests with 100% pass rate

## Architecture

The tool supports **multiple integration approaches** for accessing search engines:

1. **Google Shopping API** - Direct REST API integration with Google Custom Search
2. **MCP Tools** - Three different integration options:
   - **CLI Bridge** (currently active): Spawns Claude Code CLI commands
   - **Direct MCP SDK**: Native SDK integration with stdio transport
   - **HTTP Proxy**: Separate proxy server for MCP tool access

### Core Components

1. **URL Handler** (`src/core/urlHandler.ts`) - Validates and normalizes URLs
2. **Product Extractor** (`src/core/productExtractor.ts`) - Extracts product names from URLs
3. **Search Service** (`src/core/searchService.ts`) - Coordinates searches across multiple engines with flexible modes
4. **Price Parser** (`src/core/priceParser.ts`) - Extracts prices and discounts from search results
5. **Result Sorter** (`src/core/resultSorter.ts`) - Sorts and deduplicates results by price

### Search Engine Integration

The tool integrates with multiple search engines through different services:

**Active Services:**
- `mcpBridge.ts` - CLI bridge to Claude Code for MCP tools (Brave + Tavily)
- `googleShopping.ts` - Google Custom Search API for shopping results

**Alternative MCP Integration Options:**
- `mcpClient.ts` - Direct integration using @modelcontextprotocol/sdk
- `mcpProxy.ts` + `mcp-proxy-server.ts` - HTTP-based proxy architecture

### MCP Tools Used

- `mcp__tavily-mcp__tavily-extract` - Extracts product information from URLs
- `mcp__brave-search__brave_web_search` - Searches via Brave Search API
- `mcp__tavily-mcp__tavily-search` - Searches via Tavily Search API

## Installation

```bash
# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env and add your API keys
```

### Environment Configuration

Create a `.env` file with the following API keys:

```bash
# Required for Brave Search
BRAVE_API_KEY=your_brave_api_key

# Required for Tavily
TAVILY_API_KEY=your_tavily_api_key

# Optional - for Google Shopping results
GOOGLE_API_KEY=your_google_api_key
GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id
```

**Getting API Keys:**
- **Brave Search**: Get an API key at [Brave Search API](https://brave.com/search/api/)
- **Tavily**: Sign up at [Tavily](https://tavily.com/)
- **Google Custom Search** (optional):
  - API Key: [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
  - Search Engine ID: [Programmable Search Engine](https://programmablesearchengine.google.com/)

## Usage

### Development Mode

```bash
# Start development server (with auto-reload)
npm run dev
```

The server will start at `http://localhost:3000`

### Production Mode

```bash
# Build TypeScript
npm run build

# Start production server
npm start
```

## API

### POST /api/search

Search for product prices with flexible search modes.

**Request:**
```json
{
  "input": "Gaming Laptop",
  "mode": "all"
}
```

**Search Modes:**
- `all` (default) - Search Google, Brave, and Tavily simultaneously
- `google` - Search only Google Shopping
- `brave` - Search only Brave
- `tavily` - Search only Tavily
- `mcp` - Search both Brave and Tavily via MCP tools

**URL Input:**
```json
{
  "input": "https://amazon.com/product/gaming-laptop-123",
  "mode": "all"
}
```

**Response:**
```json
{
  "success": true,
  "productName": "Gaming Laptop XYZ",
  "results": [
    {
      "retailer": "Amazon",
      "productName": "Gaming Laptop XYZ",
      "currentPrice": 1249.99,
      "currency": "USD",
      "discount": 10,
      "originalPrice": 1388.88,
      "url": "https://amazon.com/...",
      "source": "google",
      "normalizedPrice": 1249.99
    }
  ]
}
```

**Source Values:**
- `google` - Result from Google Shopping
- `brave` - Result from Brave Search
- `tavily` - Result from Tavily Search

## Testing

The project includes comprehensive tests for all core functions:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Test Coverage

- **URL Handler**: 23 tests - URL validation, normalization, protocol handling
- **Price Parser**: 27 tests - Various price formats, currencies, discounts
- **Result Sorter**: 23 tests - Sorting, currency normalization, filtering
- **Product Extractor**: 17 tests - Content extraction, product name parsing
- **Search Service**: 15 tests - Multi-engine search, deduplication

**Total: 105 tests, 100% passing**

## Project Structure

```
price-comparison-tool/
├── src/
│   ├── core/
│   │   ├── urlHandler.ts          # URL validation and normalization
│   │   ├── productExtractor.ts    # Product name extraction from URLs
│   │   ├── searchService.ts       # Multi-engine search orchestration
│   │   ├── priceParser.ts         # Price and discount extraction
│   │   └── resultSorter.ts        # Result sorting and deduplication
│   ├── services/
│   │   ├── mcpBridge.ts           # [Active] CLI bridge to Claude Code
│   │   ├── mcpClient.ts           # [Alternative] Direct MCP SDK integration
│   │   ├── mcpProxy.ts            # [Alternative] HTTP proxy client
│   │   └── googleShopping.ts      # Google Custom Search API
│   ├── types.ts                   # TypeScript interfaces
│   ├── index.ts                   # Main orchestrator
│   └── server.ts                  # Express API server
├── public/
│   ├── index.html                 # Web interface
│   ├── style.css                  # Styling
│   └── app.js                     # Frontend logic
├── tests/
│   ├── urlHandler.test.ts
│   ├── productExtractor.test.ts
│   ├── searchService.test.ts
│   ├── priceParser.test.ts
│   └── resultSorter.test.ts
├── mcp-proxy-server.ts            # [Alternative] Standalone MCP proxy server
├── .env.example                   # Environment variable template
├── .gitignore
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

## How It Works

1. **Input Processing**: User enters a product URL or name (with optional search mode)
2. **Product Extraction** (if URL): Tavily extracts product name from the page
3. **Parallel Search**: Based on mode, searches across selected engines:
   - Google Shopping API (direct REST API)
   - Brave Search (via MCP tools)
   - Tavily Search (via MCP tools)
4. **E-commerce Filtering**: Removes non-shopping sites (YouTube, Reddit, social media)
5. **Price Parsing**: Extracts prices, currencies, and discounts using regex patterns
6. **Deduplication**: Removes duplicate results based on URL similarity and retailer
7. **Currency Normalization**: Converts all prices to USD for fair comparison
8. **Sorting**: Sorts by lowest price first, prioritizing Google Shopping results
9. **Display**: Shows results in a clean, responsive table

## Supported Price Formats

- **USD**: `$1,299.99`, `$99.99`, `1299.99 USD`
- **GBP**: `£999`, `£1,299.50`
- **EUR**: `€1.299,50`, `€999`
- **CAD**: `CAD $199.99`, `199.99 CAD`
- **AUD**: `AUD $149.99`, `149.99 AUD`

## Discount Detection

The tool detects discounts from patterns like:
- "20% off"
- "Save 15%"
- "Was $99.99"
- "Originally $149"

## Limitations & Notes

### MCP Integration Approaches

The project includes **three different MCP integration approaches**:

1. **CLI Bridge** (currently active in `mcpBridge.ts`):
   - Spawns Claude Code CLI commands: `claude mcp-call <tool-name> <params-json>`
   - Simple but requires Claude Code CLI to be installed and configured

2. **Direct SDK** (available in `mcpClient.ts`):
   - Uses `@modelcontextprotocol/sdk` with stdio transport
   - More efficient but requires MCP server packages to be installed

3. **HTTP Proxy** (available in `mcpProxy.ts` + `mcp-proxy-server.ts`):
   - Separate proxy server that Claude Code connects to
   - Allows the main app to run independently of MCP tools

To switch between approaches, modify the imports in `src/core/searchService.ts`.

### Google Shopping API

- **Optional**: The tool works without Google API keys, using only Brave and Tavily
- **Structured Data**: Google results often include better product metadata
- **Rate Limits**: Free tier allows 100 queries/day
- **Setup Required**: Requires both API key and Custom Search Engine ID

### Static Exchange Rates

Currency conversion uses static rates defined in `src/types.ts`:
- USD: 1.0 (base)
- GBP: 1.27
- EUR: 1.09
- CAD: 0.74
- AUD: 0.66

For production use, consider integrating a live exchange rate API.

### Rate Limiting

- **Brave Search**: Check your plan's rate limits
- **Tavily**: Check your plan's rate limits
- **Google Custom Search**: 100 queries/day (free tier)
- The tool searches engines in parallel, so one search = multiple API calls

## Future Enhancements

- ✅ ~~Google Shopping API integration~~ (Completed)
- ✅ ~~Multiple search modes~~ (Completed)
- ✅ ~~E-commerce filtering~~ (Completed)
- Real-time exchange rate API integration
- Advanced result deduplication with similarity scoring
- Price history tracking and trends
- Price drop alerts and notifications
- Browser extension
- Additional search engines (Bing Shopping, eBay API, etc.)
- User accounts and saved searches
- Product comparison across multiple products
- Reviews and ratings aggregation

## License

ISC

## Contributing

Contributions are welcome! Please ensure all tests pass before submitting PRs:

```bash
npm test
```
