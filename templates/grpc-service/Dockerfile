# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files and pre-built application
COPY package*.json ./
COPY dist ./dist
COPY proto ./proto

# Install only production dependencies
RUN npm ci --production

# Runtime stage
FROM node:18-alpine

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/proto ./proto

# Switch to non-root user
USER nodejs

# Expose gRPC port
EXPOSE 50051

# Expose metrics port
EXPOSE 9090

# Health check using grpc_health_probe
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:9090/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]