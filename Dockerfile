# Stage 1: Build node-pty native module for linux/amd64
FROM node:20-slim AS builder

RUN apt-get update && apt-get install -y python3 make g++ ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json ./

ENV NODE_TLS_REJECT_UNAUTHORIZED=0
ENV npm_config_strict_ssl=false

# We only need production dependencies in the final image,
# and node-gyp will compile node-pty for linux/amd64!
RUN npm ci --omit=dev


# -------------------------
# Production Server
# -------------------------
FROM node:20-slim

# Install zsh and bash for terminal availability inside the container sandbox
RUN apt-get update && apt-get install -y zsh bash curl git python3 ca-certificates make g++ && rm -rf /var/lib/apt/lists/*

# Install Claude CLI globally so it's available to node-pty
RUN npm config set strict-ssl false && npm install -g @anthropic-ai/claude-code

WORKDIR /app

ENV NODE_TLS_REJECT_UNAUTHORIZED=0
ENV npm_config_strict_ssl=false

# Copy node_modules from builder (contains linux compiled node-pty)
COPY --from=builder /app/node_modules ./node_modules
COPY package.json package-lock.json ./

# Copy built application (both frontend and backend compiled locally on host)
COPY dist ./dist

# Expose App Runner standard port
EXPOSE 8080
ENV PORT=8080

CMD ["npm", "start"]
