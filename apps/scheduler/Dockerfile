# Multi-stage Dockerfile for Scheduler
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@10.30.1

# Copy monorepo config files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/ ./packages/
COPY apps/scheduler/ ./apps/scheduler/

# Install dependencies and build
RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @uam/scheduler build

# Production image
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install pnpm
RUN npm install -g pnpm@10.30.1

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ ./packages/
COPY apps/scheduler/package.json ./apps/scheduler/

# Install prod dependencies only
RUN pnpm install --prod --no-frozen-lockfile

# Copy compiled output from builder
COPY --from=builder /app/apps/scheduler/dist ./apps/scheduler/dist

EXPOSE 3002

CMD ["node", "apps/scheduler/dist/main.js"]
