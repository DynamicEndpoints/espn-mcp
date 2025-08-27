# Contributing to ESPN MCP Server 🏈🏀⚾🏒⚽

Thank you for your interest in contributing to the ESPN MCP Server! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites
- **Node.js** 18+ with ESM support
- **TypeScript** 5.3+
- **Git** for version control
- Familiarity with **Model Context Protocol (MCP)**
- Understanding of **ESPN API** structure (helpful but not required)

### Development Setup
```bash
# Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/espn-mcp.git
cd espn-mcp

# Install dependencies
npm install

# Build the project
npm run build

# Test in development mode
npm run dev:modern
```

### Development Scripts
```bash
# Development with auto-rebuild
npm run dev:modern           # STDIO mode
npm run dev:modern:http      # HTTP mode

# Building
npm run build                # Compile TypeScript

# Testing different transports
npm run start:modern         # STDIO production
npm run start:modern:http    # HTTP production

# Docker development
npm run docker:build         # Build Docker image
npm run docker:run           # Run with Docker Compose
```

## 🏗️ Project Structure

```
espn-mcp/
├── src/
│   ├── modern-server.ts     # Main MCP server implementation
│   ├── core.ts             # Core ESPN API client
│   ├── enhanced-server.ts   # Enhanced server features
│   ├── formatters.ts       # Data formatting utilities
│   └── index.ts            # Entry points
├── build/                  # Compiled TypeScript output
├── .github/               # GitHub templates and workflows
├── docker-compose.yml     # Docker development setup
├── Dockerfile            # Container build instructions
├── k8s-deployment.yaml   # Kubernetes deployment
└── smithery.yaml         # Smithery platform config
```

## 🔧 Architecture Overview

### Core Components

#### ModernESPNClient
- **Location**: `src/modern-server.ts`
- **Purpose**: Main ESPN API client with 20+ specific endpoints
- **Key Methods**: 
  - `getNFLScores()`, `getNBAScores()`, etc.
  - `getCollegeFootballRankings()`
  - `getSpecificTeam(sport, league, team)`

#### MCP Server Implementation
- **Transport Support**: STDIO and HTTP with streaming
- **Tools**: 8 enhanced tools with advanced parameter support
- **Resources**: 4 dynamic resources with real-time updates
- **Prompts**: Interactive sports analysis capabilities

#### Enhanced Features
- **Smart Routing**: Automatic endpoint selection based on sport/league
- **Parameter Support**: Date filtering, week numbers, season types
- **Error Handling**: Graceful fallbacks and comprehensive error messages
- **Caching**: Intelligent caching with TTL and cleanup

## 🛠️ Development Guidelines

### Code Style
- **TypeScript** with strict mode enabled
- **ESLint** for code quality (when configured)
- **Prettier** for consistent formatting (when configured)
- **Descriptive variable names** and comprehensive comments
- **Type safety**: Always use proper TypeScript types

### ESPN API Integration
- **Endpoint Structure**: `/sport/league/resource` pattern
- **Hidden APIs**: Leverage ESPN's undocumented endpoints
- **Parameter Handling**: Support date formats (YYYYMMDD), week numbers, season types
- **Error Recovery**: Handle API failures gracefully with fallbacks

### MCP Specification Compliance
- **Tool Schemas**: Use Zod for input validation
- **Resource URIs**: Follow `espn://resource-name` pattern
- **Transport Support**: Maintain both STDIO and HTTP compatibility
- **Streaming**: Implement Server-Sent Events for real-time updates

## 🧪 Adding New Features

### Adding a New ESPN Endpoint
1. **Add method to ModernESPNClient**:
```typescript
async getNewEndpoint(params?: {param1?: string}) {
  const queryString = params ? this.buildQueryString(params) : '';
  return this.fetchData(`/sport/league/endpoint${queryString}`);
}
```

2. **Update tool handler**:
```typescript
case "new_tool": {
  const { sport, league } = args as any;
  const data = await espnClient.getNewEndpoint({ param1: "value" });
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}
```

3. **Add tool schema**:
```typescript
{
  name: "new_tool",
  description: "Description of what this tool does",
  inputSchema: {
    type: "object",
    properties: {
      sport: { type: "string", enum: ["football", "basketball"] },
      league: { type: "string", description: "Optional league filter" }
    },
    required: ["sport"]
  }
}
```

### Adding a New Sport/League
1. **Add league-specific methods**:
```typescript
async getNewLeagueScores() {
  return this.fetchData('/sport/new-league/scoreboard');
}
```

2. **Update tool routing**:
```typescript
case "sport":
  if (league === "new-league") {
    data = await espnClient.getNewLeagueScores();
  }
  break;
```

3. **Update schemas and documentation**

### Adding New Tools
1. **Define tool schema** in the `tools` array
2. **Implement handler** in both MCP server implementations
3. **Add documentation** and usage examples
4. **Test thoroughly** with various parameters

## 🧪 Testing

### Manual Testing
```bash
# Test STDIO mode
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | npm start

# Test HTTP mode
npm run start:modern:http
curl -X POST http://localhost:8081/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

### Tool Testing
Test each tool with various parameter combinations:
```bash
# Test live scores with different parameters
{"method":"tools/call","params":{"name":"get_live_scores","arguments":{"sport":"football","league":"nfl","week":"1","seasontype":"2"}}}

# Test specific team lookup
{"method":"tools/call","params":{"name":"get_specific_team","arguments":{"sport":"football","league":"nfl","team":"patriots"}}}
```

### Docker Testing
```bash
npm run docker:build
npm run docker:run
# Test endpoints against running container
```

## 📚 Documentation

### Code Documentation
- **JSDoc comments** for all public methods
- **Type annotations** for all parameters and return values
- **Usage examples** in method comments
- **Error handling** documentation

### API Documentation
- Update **README.md** with new tools/features
- Add **usage examples** for new functionality
- Update **parameter descriptions** and valid values
- Include **error scenarios** and troubleshooting

## 🚀 Deployment Considerations

### Container Support
- **Dockerfile**: Multi-stage build for production optimization
- **Docker Compose**: Development environment setup
- **Kubernetes**: Production deployment manifests
- **Smithery**: Platform-specific configuration

### Environment Variables
```bash
# Optional configurations
ESPN_API_BASE_URL=https://site.api.espn.com/apis/site/v2/sports
CACHE_TTL=300000
PORT=8081
TRANSPORT=http
DEBUG=true
```

### Performance Optimization
- **Caching Strategy**: Implement appropriate TTL for different data types
- **Connection Pooling**: Reuse HTTP connections for API calls
- **Error Recovery**: Implement retry logic with exponential backoff
- **Memory Management**: Clean up resources properly

## 🔄 Pull Request Process

1. **Fork** the repository
2. **Create feature branch**: `git checkout -b feature/amazing-feature`
3. **Make changes** following guidelines above
4. **Test thoroughly** with multiple scenarios
5. **Update documentation** as needed
6. **Commit changes**: Use conventional commit format
7. **Push to branch**: `git push origin feature/amazing-feature`
8. **Open Pull Request** using the provided template

### Commit Message Format
```
type(scope): description

feat(nfl): add support for playoff week filtering
fix(api): handle ESPN API timeout errors gracefully
docs(readme): update tool usage examples
```

### PR Requirements
- [ ] Code follows project style guidelines
- [ ] All tests pass (manual testing required)
- [ ] Documentation updated appropriately
- [ ] No TypeScript compilation errors
- [ ] Breaking changes clearly documented
- [ ] ESPN API integration tested

## 🐛 Bug Reports

Use the bug report template and include:
- **Specific tool/endpoint** experiencing issues
- **Sport/league** involved (if applicable)
- **Environment details** (OS, Node.js version, transport mode)
- **Steps to reproduce** with exact parameters
- **Expected vs actual behavior**
- **Error logs** (sanitized of sensitive info)

## ✨ Feature Requests

Use the feature request template and include:
- **Clear use case** and problem statement
- **Proposed solution** with examples
- **Sport/league relevance** (if applicable)
- **Priority level** and impact assessment
- **Alternative approaches** considered

## 🤝 Community Guidelines

### Be Respectful
- Use inclusive and welcoming language
- Respect different perspectives and experiences
- Focus on constructive feedback
- Help newcomers get started

### Be Collaborative
- Share knowledge and expertise
- Provide helpful code reviews
- Suggest improvements positively
- Celebrate contributions

### Be Professional
- Keep discussions focused and on-topic
- Use appropriate channels for different types of communication
- Respect maintainer decisions and project direction
- Follow the code of conduct

## 📞 Getting Help

- **Documentation**: Check README.md and code comments
- **Issues**: Search existing issues before creating new ones
- **Discussions**: Use GitHub Discussions for general questions
- **Contact**: Reach out to maintainers for complex issues

## 🏆 Recognition

Contributors are recognized through:
- **README contributors section**
- **Release notes** for significant contributions
- **GitHub contributor graphs**
- **Community highlights** for exceptional help

Thank you for contributing to the ESPN MCP Server! Your efforts help make sports data more accessible to everyone. 🚀