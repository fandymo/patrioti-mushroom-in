# ---- Build stage ----
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# System deps required to compile the `canvas` native module
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

RUN npm install -g pnpm@10.4.1

# Install dependencies
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/
RUN pnpm install --frozen-lockfile

# Build (Vite frontend → dist/public, esbuild server → dist/index.js)
COPY . .
RUN pnpm run build

# ---- Production stage ----
FROM node:22-bookworm-slim AS production

WORKDIR /app

# Runtime libraries for canvas
RUN apt-get update && apt-get install -y --no-install-recommends \
    libcairo2 libpango1.0-0 libjpeg62-turbo libgif7 librsvg2-2 \
    && rm -rf /var/lib/apt/lists/*

RUN npm install -g pnpm@10.4.1

# Install production dependencies only
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/
RUN pnpm install --frozen-lockfile --prod

# Copy built output from builder
COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "dist/index.js"]
