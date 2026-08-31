# Multi-stage Dockerfile for Dashboard
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@10.30.1

# Copy monorepo config files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/ ./packages/
COPY apps/dashboard/ ./apps/dashboard/

# Install dependencies and build Vite app
ARG VITE_MAPTILER_API_KEY
ENV VITE_MAPTILER_API_KEY=$VITE_MAPTILER_API_KEY
ARG VITE_THEME_MODE
ENV VITE_THEME_MODE=$VITE_THEME_MODE

RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @uam/dashboard build

# Production Nginx image
FROM nginx:alpine AS runner

COPY --from=builder /app/apps/dashboard/dist /usr/share/nginx/html
COPY apps/dashboard/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
