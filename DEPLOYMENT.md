# ESPN MCP Server - Deployment Guide

This guide covers deploying the ESPN MCP Server with lazy loading and modern deployment strategies.

## 🚀 Quick Start

### Development Mode
```bash
npm install
npm run dev          # Starts stdio server with lazy loading
npm run dev:http     # Starts HTTP server with web interface
```

### Production Deployment Options

## 1. 📦 Docker Deployment

### Single Container
```bash
# Build the image
npm run docker:build

# Run with docker-compose (includes Redis, Nginx)
npm run docker:run

# Stop services
npm run docker:stop
```

### Environment Variables
```bash
NODE_ENV=production
ESPN_CACHE_TTL=300000      # 5 minutes cache
ESPN_API_TIMEOUT=10000     # 10 seconds timeout
PORT=3000
ALLOWED_ORIGINS=*          # For CORS
```

## 2. ☸️ Kubernetes Deployment

### Prerequisites
- Kubernetes cluster (1.20+)
- kubectl configured
- Persistent storage classes

### Deploy
```bash
# Create namespace
kubectl create namespace mcp-services

# Deploy all resources
npm run k8s:deploy

# Check status
kubectl get pods -n mcp-services

# View logs
kubectl logs -f deployment/espn-mcp-server -n mcp-services
```

### Features
- **Auto-scaling**: 2-10 replicas based on CPU/Memory
- **Rolling updates**: Zero-downtime deployments
- **Health checks**: Liveness and readiness probes
- **Resource limits**: Memory and CPU constraints
- **Persistent storage**: For data and logs

## 3. 🌐 Serverless Deployment

### AWS Lambda
```bash
# Install serverless framework
npm install -g serverless

# Deploy to AWS
serverless deploy --stage production
```

### Google Cloud Functions
```bash
# Deploy to GCP
gcloud functions deploy espn-mcp-server \\
  --runtime nodejs20 \\
  --trigger-http \\
  --memory 512MB \\
  --timeout 300s
```

## 4. 🔧 Configuration Options

### Lazy Loading Configuration
```javascript
const lazyConfig = {
  // Cache TTL per sport (milliseconds)
  cacheTTL: {
    nfl: 180000,    // 3 minutes
    nba: 60000,     // 1 minute (fast-paced)
    mlb: 120000,    // 2 minutes
    nhl: 120000,    // 2 minutes
    cfb: 300000,    // 5 minutes
    soccer: 240000  // 4 minutes
  },
  
  // API timeout
  apiTimeout: 10000,
  
  // Max concurrent requests
  maxConcurrency: 10
};
```

### Transport Options

#### 1. STDIO (Default)
- Best for: Claude Desktop, direct integration
- Command: `node build/lazy-server.js`

#### 2. HTTP + SSE
- Best for: Web clients, multiple users
- Command: `node build/http-server.js`
- Port: 3000 (configurable)

#### 3. WebSocket (Future)
- Best for: Real-time applications
- Bidirectional communication

## 5. 📊 Monitoring & Observability

### Health Endpoints
- `GET /health` - Server health status
- `GET /metrics` - Cache and performance metrics
- `GET /status` - Load balancer status check

### Metrics Available
```json
{
  "activeSessions": 5,
  "uptime": 3600,
  "memory": {
    "rss": 45678,
    "heapUsed": 12345,
    "heapTotal": 23456
  },
  "cacheStats": {
    "size": 25,
    "activeLoads": 2
  }
}
```

### Logging
- Structured JSON logs
- Request/response tracing
- Error aggregation
- Performance metrics

## 6. 🔒 Security Considerations

### Network Security
- Rate limiting (10 req/s per IP)
- CORS configuration
- DNS rebinding protection
- Security headers

### Container Security
- Non-root user execution
- Minimal base image (Alpine)
- Security scanning
- Resource constraints

### API Security
- Input validation with Zod
- Request sanitization
- Error handling
- Timeout protection

## 7. 🚦 Load Balancing Strategies

### Round Robin (Default)
```nginx
upstream espn_mcp_backend {
    server espn-mcp-server-1:3000;
    server espn-mcp-server-2:3000;
    server espn-mcp-server-3:3000;
}
```

### Weighted Load Balancing
```nginx
upstream espn_mcp_backend {
    server espn-mcp-server-1:3000 weight=3;
    server espn-mcp-server-2:3000 weight=2;
    server espn-mcp-server-3:3000 weight=1;
}
```

### Session Affinity
For HTTP transport with session management:
```nginx
upstream espn_mcp_backend {
    ip_hash;  # Route based on client IP
    server espn-mcp-server-1:3000;
    server espn-mcp-server-2:3000;
}
```

## 8. 🔄 CI/CD Pipeline

### GitHub Actions Example
```yaml
name: Deploy ESPN MCP Server

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build
        run: npm run build
        
      - name: Test
        run: npm test
        
      - name: Build Docker image
        run: docker build -t espn-mcp:${{ github.sha }} .
        
      - name: Deploy to Kubernetes
        run: |
          kubectl set image deployment/espn-mcp-server \\
            espn-mcp-server=espn-mcp:${{ github.sha }}
```

## 9. 📈 Performance Optimization

### Lazy Loading Benefits
- **Reduced Memory**: Only load data when needed
- **Faster Startup**: No blocking initialization
- **Better Caching**: Intelligent cache management
- **Lower Latency**: Parallel request handling

### Cache Strategies
1. **Time-based expiry**: Different TTL per sport
2. **LRU eviction**: Remove least recently used
3. **Warming**: Pre-load popular data
4. **Invalidation**: Smart cache clearing

### Monitoring Performance
```bash
# View cache hit rates
curl http://localhost:3000/metrics

# Check response times
curl -w "%{time_total}" http://localhost:3000/mcp

# Monitor resource usage
kubectl top pods -n mcp-services
```

## 10. 🔧 Troubleshooting

### Common Issues

#### High Memory Usage
```bash
# Check cache size
curl http://localhost:3000/metrics | jq .cacheStats

# Clear cache
curl -X POST http://localhost:3000/cache/clear
```

#### Slow Response Times
```bash
# Check active loads
curl http://localhost:3000/metrics | jq .cacheStats.activeLoads

# Monitor API calls
kubectl logs -f deployment/espn-mcp-server | grep "API call"
```

#### Connection Issues
```bash
# Test health endpoint
curl http://localhost:3000/health

# Check transport connectivity
curl -H "Content-Type: application/json" \\
     -d '{"jsonrpc":"2.0","method":"tools/list","id":1}' \\
     http://localhost:3000/mcp
```

## 📚 Additional Resources

- [MCP Specification](https://modelcontextprotocol.io)
- [ESPN API Documentation](https://www.espn.com/apis/devcenter/)
- [Container Best Practices](https://cloud.google.com/architecture/best-practices-for-building-containers)
- [Kubernetes Deployment Guide](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)

---

Need help? Open an issue or check the troubleshooting section above.