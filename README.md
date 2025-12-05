# Product Price Comparison Tool

A TypeScript-based price comparison tool that searches multiple retailers using Brave Search and Tavily to find the best product prices.

## Features

- ✅ **URL or Product Name Input**: Enter either a product URL or just the product name
- ✅ **Automatic Product Extraction**: Extracts product names from URLs using Tavily
- ✅ **Multi-Engine Search**: Searches both Brave and Tavily for comprehensive results
- ✅ **Price Parsing**: Automatically extracts prices, currencies, and discount information
- ✅ **Smart Sorting**: Results sorted by lowest price first
- ✅ **Multiple Currency Support**: Handles USD, GBP, EUR, CAD, and AUD
- ✅ **Clean Web Interface**: Simple, responsive UI for easy price comparison
- ✅ **Comprehensive Tests**: 105 tests with 100% pass rate

## Architecture

The tool uses a **CLI bridge architecture** where the Node.js server spawns Claude Code CLI commands to access MCP tools for web searching and content extraction.

### Core Components

1. **URL Handler** (`src/core/urlHandler.ts`) - Validates and normalizes URLs
2. **Product Extractor** (`src/core/productExtractor.ts`) - Extracts product names from URLs
3. **Search Service** (`src/core/searchService.ts`) - Searches Brave and Tavily in parallel
4. **Price Parser** (`src/core/priceParser.ts`) - Extracts prices and discounts from search results
5. **Result Sorter** (`src/core/resultSorter.ts`) - Sorts results by price

### MCP Integration

The `mcpBridge.ts` module spawns Claude Code CLI commands to call MCP tools:
- `mcp__tavily-mcp__tavily-extract` - Extracts content from URLs
- `mcp__brave-search__brave_web_search` - Searches via Brave
- `mcp__tavily-mcp__tavily-search` - Searches via Tavily

## Installation

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run with coverage
npm run test:coverage
```

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

Search for product prices.

**Request:**
```json
{
  "input": "Gaming Laptop"
}
```

or

```json
{
  "input": "https://amazon.com/product/gaming-laptop-123"
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
      "source": "brave",
      "normalizedPrice": 1249.99
    }
  ]
}
```

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
│   │   ├── urlHandler.ts          # Function 1: URL validation
│   │   ├── productExtractor.ts    # Function 2: Product name extraction
│   │   ├── searchService.ts       # Function 3: Multi-engine search
│   │   ├── priceParser.ts         # Function 4: Price parsing
│   │   └── resultSorter.ts        # Function 5: Result sorting
│   ├── services/
│   │   └── mcpBridge.ts           # CLI bridge to Claude Code
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
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

## How It Works

1. **Input Processing**: User enters a product URL or name
2. **Product Extraction** (if URL): Tavily extracts product name from the page
3. **Parallel Search**: Searches Brave and Tavily simultaneously
4. **Price Parsing**: Extracts prices, currencies, and discounts using regex patterns
5. **Deduplication**: Removes duplicate results based on URL similarity
6. **Currency Normalization**: Converts all prices to USD for fair comparison
7. **Sorting**: Sorts by lowest price first
8. **Display**: Shows results in a clean, responsive table

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

### MCP CLI Bridge

The current implementation assumes a Claude Code CLI interface:
```bash
claude mcp-call <tool-name> <params-json>
```

If this CLI format is not available, the MCP bridge may need adjustment. See `src/services/mcpBridge.ts` for implementation details.

### Static Exchange Rates

Currency conversion uses static rates defined in `src/types.ts`:
- USD: 1.0 (base)
- GBP: 1.27
- EUR: 1.09
- CAD: 0.74
- AUD: 0.66

For production use, consider integrating a live exchange rate API.

### Rate Limiting

The tool makes multiple API calls (Brave + Tavily). Be mindful of rate limits from the search engines.

## Future Enhancements

- Real-time exchange rate API integration
- Advanced result deduplication with similarity scoring
- Price history tracking
- Price drop alerts
- Browser extension
- More search engines (Google Shopping, etc.)
- User accounts and saved searches

## License

ISC

## Contributing

Contributions are welcome! Please ensure all tests pass before submitting PRs:

```bash
npm test
```
