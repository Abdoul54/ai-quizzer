FROM node:22-alpine AS base

# ─── Stage 1: Install dependencies ───────────────────────────────────────────
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

# ─── Stage 2: Build the application ──────────────────────────────────────────
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Placeholders to satisfy module-level initializations during Next.js static
# analysis of API routes. Real values are injected at runtime.
ENV DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder
ENV BETTER_AUTH_SECRET=build-time-placeholder-secret-32chars!!
ENV BETTER_AUTH_URL=http://localhost:3000
ENV NEXT_PUBLIC_APP_URL=http://localhost:3000
ENV TRUSTED_ORIGINS=http://localhost:3000
ENV SECURE_COOKIES=false
ENV OPENAI_API_KEY=sk-build-time-placeholder
ENV MISTRAL_API_KEY=build-time-placeholder
ENV ARCHITECT=build-time-placeholder
ENV BUILDER=build-time-placeholder
ENV QUIZ_EDITOR=build-time-placeholder
ENV XAPI_ENDPOINT=http://localhost
ENV XAPI_KEY=build-time-placeholder
ENV XAPI_SECRET=build-time-placeholder
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ─── Stage 3: Production runner ───────────────────────────────────────────────
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy only what's needed from the standalone output
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]