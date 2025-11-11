FROM node:18-alpine AS builder

# Create the directory structure that matches tsconfig expectations
# tsconfig expects: ../shared relative to api-gateway
WORKDIR /app/notification-system

# Copy shared package
COPY shared ./shared
WORKDIR /app/notification-system/shared
RUN npm install && npm run build

# Copy API Gateway code
WORKDIR /app/notification-system
COPY api-gateway/package*.json ./api-gateway/
COPY api-gateway/tsconfig*.json ./api-gateway/
COPY api-gateway/nest-cli.json ./api-gateway/
COPY api-gateway/src ./api-gateway/src

# Build API Gateway (from api-gateway directory, ../shared will resolve correctly)
WORKDIR /app/notification-system/api-gateway
RUN npm install
RUN npm run build

FROM node:18-alpine

WORKDIR /app

# Copy built shared package (already built in builder stage)
COPY --from=builder /app/notification-system/shared/dist ./shared/dist
COPY --from=builder /app/notification-system/shared/package.json ./shared/
COPY --from=builder /app/notification-system/shared/node_modules ./shared/node_modules

# Copy built API Gateway
COPY --from=builder /app/notification-system/api-gateway/dist ./dist
COPY --from=builder /app/notification-system/api-gateway/node_modules ./node_modules
COPY --from=builder /app/notification-system/api-gateway/package*.json ./
COPY api-gateway/public ./public


EXPOSE 3000


HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/v1/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"


CMD ["node", "dist/api-gateway/src/main.js"]
