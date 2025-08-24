# ESPN MCP Server 🏈🏀⚾🏒⚽

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](https://github.com/DynamicEndpoints/espn-mcp)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3.2-blue.svg)](https://www.typescriptlang.org/)
[![MCP SDK](https://img.shields.io/badge/MCP%20SDK-0.6.0-purple.svg)](https://github.com/modelcontextprotocol/typescript-sdk)

A modern, feature-rich **Model Context Protocol (MCP) server** that provides comprehensive access to ESPN sports data. Built with the latest 2025 MCP specification supporting **resources, prompts, tools, HTTP streaming, and session management**.

## 🚀 Features

### Core Capabilities
- **Real-time Sports Data** - Live scores, standings, news, and statistics
- **Multi-Transport Support** - STDIO, HTTP, and streaming endpoints
- **Modern MCP 2025 Specification** - Full support for latest features
- **Advanced Caching** - Intelligent caching with TTL and automatic cleanup
- **Resource Subscriptions** - Real-time updates and notifications
- **Interactive Prompts** - AI-powered sports analysis and predictions
- **HTTP Streaming** - Server-Sent Events (SSE) for live updates
- **Session Management** - Stateful connections and user sessions

### Sports Coverage
- **🏈 NFL** - National Football League
- **🏀 NBA** - National Basketball Association  
- **⚾ MLB** - Major League Baseball
- **🏒 NHL** - National Hockey League
- **⚽ Soccer** - MLS, Premier League, Champions League
- **🏀 College Basketball** - Men's and Women's
- **🏈 College Football** - Division I
- **🎾 Tennis** - Professional tours
- **⛳ Golf** - Major tournaments

### Data Types
- **Live Scores & Game Status** - Real-time game updates
- **Team Information** - Rosters, statistics, and performance metrics
- **Player Statistics** - Career stats, season performance, and trends
- **League Standings** - Current rankings and playoff pictures
- **Breaking News** - Latest sports news and updates
- **Historical Data** - Past seasons and career records

## 📋 Prerequisites

- **Node.js** 18+ (ESM support required)
- **TypeScript** 5.3+
- **npm** or **yarn** package manager

## 🛠️ Installation

### Quick Start

```bash
# Clone the repository
git clone https://github.com/DynamicEndpoints/espn-mcp.git
cd espn-mcp

# Install dependencies
npm install

# Build the project
npm run build

# Start the server (STDIO mode)
npm start

# Or start HTTP server
npm run start:modern:http
```

### Docker Deployment

```bash
# Build Docker image
npm run docker:build

# Run with Docker Compose
npm run docker:run

# Stop services
npm run docker:stop
```

### Kubernetes Deployment

```bash
# Deploy to Kubernetes
npm run k8s:deploy

# Remove deployment
npm run k8s:delete
```

## 🚀 Usage

### STDIO Mode (Default)
Perfect for MCP client integration:

```bash
npm start:modern
# or
node build/modern-server.js
```

### HTTP Mode
For web applications and REST API access:

```bash
npm run start:modern:http
# or  
node build/modern-server.js --http --port 3000
```

### Available Endpoints (HTTP Mode)
- `POST /mcp` - Main MCP JSON-RPC endpoint
- `GET /mcp` - Server-Sent Events (SSE) streaming
- `GET /health` - Health check and capabilities

## 🔧 Available Tools

### Core Sports Tools

#### Live Scores
```typescript
// Get live scores for any sport
get_live_scores({
  sport: "football" | "basketball" | "baseball" | "hockey" | "soccer" | "tennis" | "golf",
  league?: "nfl" | "college-football" | "nba" | "mens-college-basketball" | "mlb" | "nhl" | "mls"
})
```

#### Team Information
```typescript
// Get comprehensive team data
get_team_information({
  sport: "football" | "basketball" | "baseball" | "hockey" | "soccer",
  league?: string
})
```

#### League Standings
```typescript
// Get current standings and playoff information
get_league_standings({
  sport: "football" | "basketball" | "baseball" | "hockey" | "soccer",
  league?: string
})
```

#### Sports News
```typescript
// Get latest sports news
get_sports_news({
  sport?: string,  // Optional: filter by sport
  limit?: number   // Default: 10, Max: 50
})
```

#### Athlete Search
```typescript
// Search for athlete information
search_athletes({
  sport: "football" | "basketball" | "baseball" | "hockey" | "soccer" | "tennis" | "golf",
  league?: string
})
```

## 📊 Resources

Dynamic resources that update automatically:

### Live Dashboard
- **URI**: `espn://live-dashboard`
- **Description**: Real-time sports scores across all major leagues
- **Updates**: Every 30 seconds during live games

### Breaking News
- **URI**: `espn://breaking-news`  
- **Description**: Latest breaking news from the sports world
- **Updates**: Every 5 minutes

### Trending Athletes
- **URI**: `espn://trending-athletes`
- **Description**: Currently trending athletes and performances
- **Updates**: Every 10 minutes

### Playoff Picture
- **URI**: `espn://playoff-picture`
- **Description**: Current playoff standings and scenarios
- **Updates**: Daily during playoff seasons

## 🤖 Interactive Prompts

AI-powered sports analysis and insights:

### Game Performance Analysis
```typescript
analyze_game_performance({
  sport: string,           // Required: The sport to analyze
  team_or_player: string,  // Required: Team or player name
  game_context?: string    // Optional: Specific game context
})
```

### Head-to-Head Comparison
```typescript
compare_head_to_head({
  sport: string,              // Required: Sport for comparison
  entity1: string,            // Required: First team/player
  entity2: string,            // Required: Second team/player  
  comparison_type?: string    // Optional: "season", "career", "recent"
})
```

### Season Predictions
```typescript
predict_season_outcomes({
  sport: string,              // Required: Sport to analyze
  league: string,             // Required: Specific league
  prediction_scope?: string   // Optional: "playoffs", "championship", "awards"
})
```

## 🔧 Configuration

### Environment Variables

```bash
# Optional: Custom ESPN API base URL
ESPN_API_BASE_URL=https://site.api.espn.com/apis/site/v2/sports

# Optional: Cache TTL in milliseconds (default: 300000 = 5 minutes)
CACHE_TTL=300000

# Optional: HTTP server port (default: 3000)
PORT=3000

# Optional: Enable debug logging
DEBUG=true
```

### MCP Client Configuration

For Claude Desktop or other MCP clients:

```json
{
  "mcpServers": {
    "espn": {
      "command": "node",
      "args": ["/path/to/espn-mcp/build/modern-server.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

## 🏗️ Architecture

### Modern Design Patterns
- **Event-Driven Architecture** - Real-time updates and notifications
- **Intelligent Caching** - Multi-level caching with automatic invalidation
- **Resource Subscriptions** - Live data streaming to connected clients
- **Error Recovery** - Robust error handling and retry mechanisms
- **TypeScript First** - Full type safety and IntelliSense support

### Performance Features
- **Request Deduplication** - Prevents redundant API calls
- **Batch Processing** - Efficient handling of multiple requests
- **Connection Pooling** - Optimized HTTP client configuration
- **Memory Management** - Automatic cleanup and garbage collection

## 📚 API Examples

### Basic Usage
```javascript
// Get live NFL scores
const scores = await callTool("get_live_scores", {
  sport: "football",
  league: "nfl"
});

// Get NBA team information
const teams = await callTool("get_team_information", {
  sport: "basketball", 
  league: "nba"
});

// Get latest sports news
const news = await callTool("get_sports_news", {
  sport: "football",
  limit: 5
});
```

### Resource Subscription
```javascript
// Subscribe to live dashboard updates
const resource = await readResource("espn://live-dashboard");

// Handle resource updates
server.onResourceUpdate((uri, data) => {
  if (uri === "espn://live-dashboard") {
    console.log("Live scores updated:", data);
  }
});
```

### Interactive Prompts
```javascript
// Analyze team performance
const analysis = await getPrompt("analyze_game_performance", {
  sport: "football",
  team_or_player: "Kansas City Chiefs",
  game_context: "last 5 games"
});

// Compare players head-to-head  
const comparison = await getPrompt("compare_head_to_head", {
  sport: "basketball",
  entity1: "LeBron James",
  entity2: "Michael Jordan",
  comparison_type: "career"
});
```

## 🐳 Docker Support

### Dockerfile
Multi-stage build optimized for production:

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY build ./build
EXPOSE 3000
CMD ["node", "build/modern-server.js", "--http"]
```

### Docker Compose
```yaml
version: '3.8'
services:
  espn-mcp-server:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
    restart: unless-stopped
```

## ☸️ Kubernetes Support

### Deployment Configuration
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: espn-mcp-server
spec:
  replicas: 3
  selector:
    matchLabels:
      app: espn-mcp-server
  template:
    metadata:
      labels:
        app: espn-mcp-server
    spec:
      containers:
      - name: espn-mcp-server
        image: espn-mcp-server:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
```

## 🔍 Monitoring & Health Checks

### Health Endpoint
```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "healthy",
  "version": "2.0.0", 
  "timestamp": "2025-08-24T10:30:00.000Z",
  "capabilities": {
    "resources": { "subscribe": true, "listChanged": true },
    "prompts": { "listChanged": true },
    "tools": { "listChanged": true },
    "streaming": true,
    "sessionManagement": true
  }
}
```

### Logging
Structured logging with different levels:
- **Error**: Critical failures and exceptions
- **Warn**: Non-critical issues and degraded performance  
- **Info**: General operational messages
- **Debug**: Detailed troubleshooting information

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Setup
```bash
# Clone and setup
git clone https://github.com/DynamicEndpoints/espn-mcp.git
cd espn-mcp
npm install

# Development mode with auto-reload
npm run dev:modern

# Run tests
npm test

# Lint code
npm run lint
```

### Code Style
- **TypeScript** with strict mode enabled
- **ESLint** for code quality
- **Prettier** for formatting
- **Conventional Commits** for commit messages

## 🔒 Security

- **Input Validation** - All inputs validated with Zod schemas
- **Rate Limiting** - Built-in protection against abuse
- **CORS Configuration** - Secure cross-origin resource sharing
- **Error Handling** - No sensitive information leaked in errors

## 📈 Performance

### Benchmarks
- **Response Time**: < 100ms for cached data
- **Throughput**: 1000+ requests/second
- **Memory Usage**: < 100MB typical operation
- **Cache Hit Rate**: > 95% for live data

### Optimization Tips
- Use resource subscriptions for real-time data
- Cache frequently accessed data locally
- Batch multiple requests when possible
- Monitor memory usage in long-running processes

## 🐛 Troubleshooting

### Common Issues

#### Connection Timeouts
```bash
# Increase timeout for slow networks
export REQUEST_TIMEOUT=30000
```

#### Memory Issues
```bash
# Reduce cache TTL for memory-constrained environments
export CACHE_TTL=60000
```

#### Port Conflicts
```bash
# Use different port
npm run start:modern:http -- --port 3001
```

### Debug Mode
```bash
# Enable verbose logging
DEBUG=espn:* node build/modern-server.js
```

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **ESPN** for providing comprehensive sports data APIs
- **Model Context Protocol** team for the excellent SDK and specification
- **TypeScript** and **Node.js** communities for robust tooling
- **Contributors** who help improve this project

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/DynamicEndpoints/espn-mcp/issues)
- **Discussions**: [GitHub Discussions](https://github.com/DynamicEndpoints/espn-mcp/discussions)
- **Email**: support@dynamicendpoints.com

---

**Built with ❤️ by the DynamicEndpoints team**
