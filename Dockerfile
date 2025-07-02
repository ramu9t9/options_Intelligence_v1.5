# Multi-stage Docker build for Options Intelligence Platform
# Production-ready containerization with security hardening

# Stage 1: Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install security updates and required packages
RUN apk update && apk upgrade && \
    apk add --no-cache python3 make g++ && \
    rm -rf /var/cache/apk/*

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Production stage
FROM node:18-alpine AS production

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S optionsapp -u 1001

# Set working directory
WORKDIR /app

# Install security updates
RUN apk update && apk upgrade && \
    apk add --no-cache dumb-init && \
    rm -rf /var/cache/apk/*

# Copy built application from builder stage
COPY --from=builder --chown=optionsapp:nodejs /app/dist ./dist
COPY --from=builder --chown=optionsapp:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=optionsapp:nodejs /app/package*.json ./

# Create logs directory
RUN mkdir -p /app/logs && chown optionsapp:nodejs /app/logs

# Copy environment template
COPY --chown=optionsapp:nodejs .env.example ./.env.example

# Set security headers and configurations
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=1024"

# Expose application port
EXPOSE 5000

# Switch to non-root user
USER optionsapp

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:5000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/server/index.js"]