FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (need dev deps for TypeScript compilation)
RUN npm ci

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

# Set transport mode to HTTP
ENV TRANSPORT=http

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "process.exit(0)"

# Expose port for HTTP transport (Smithery requires 8081)
EXPOSE 8081

# Default command - use modern server in HTTP mode
CMD ["node", "build/modern-server.js"]

# Labels for better container management
LABEL maintainer="ESPN MCP Team"
LABEL version="2.0.0"
LABEL description="ESPN MCP Server with HTTP Transport"