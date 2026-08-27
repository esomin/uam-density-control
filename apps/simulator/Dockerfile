# Multi-stage Dockerfile for Simulator
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@10.30.1

# Copy monorepo config files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/ ./packages/
COPY apps/simulator/ ./apps/simulator/

# Install dependencies and build
RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @uam/simulator build

# Production image
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install pnpm
RUN npm install -g pnpm@10.30.1

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ ./packages/
COPY apps/simulator/package.json ./apps/simulator/

# Install prod dependencies only
RUN pnpm install --prod --no-frozen-lockfile

# Copy compiled output from builder
COPY --from=builder /app/apps/simulator/dist ./apps/simulator/dist

EXPOSE 3001

CMD ["node", "apps/simulator/dist/main.js"]
