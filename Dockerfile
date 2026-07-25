# Production Dockerfile for AB Essentia Next.js frontend
# Builds the standalone server bundle for Cloud Run / App Engine / any container host.

FROM node:20-alpine AS base

# ---- Dependencies ----
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production --ignore-scripts

# ---- Build ----
FROM base AS builder
WORKDIR /app

# Copy prod node_modules from deps stage (faster, reliable)
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build uses environment variables at build time. For runtime secrets (keys),
# they are read from the container environment; NEXT_PUBLIC_* must be set here
# if they are referenced in browser code.
RUN npm run build

# ---- Runner ----
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Next.js standalone output structure
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
