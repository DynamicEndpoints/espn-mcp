# ESPN MCP Server - Containerized
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY src/ ./src/

# Build the application
RUN npm run build

# Create non-root user
RUN addgroup -g 1001 -S espn && \
    adduser -S espn -u 1001

# Change ownership of the app directory
RUN chown -R espn:espn /app
USER espn

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "process.exit(0)"

# Expose port for HTTP transport (if needed)
EXPOSE 3000

# Default command (can be overridden)
CMD ["node", "build/lazy-server.js"]

# Labels for better container management
LABEL maintainer="ESPN MCP Team"
LABEL version="2.0.0"
LABEL description="ESPN MCP Server with Lazy Loading"