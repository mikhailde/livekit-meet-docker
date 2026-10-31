# 1. Базовый образ
FROM node:alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate

# 2. Установка зависимостей
FROM base AS deps
COPY meet/package.json meet/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# 3. Сборка приложения
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY meet/ ./

# Полностью подключаем build.env для Next.js сборщика
COPY build.env* ./
RUN if [ -f build.env ]; then cp build.env .env.local; fi

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm build
RUN pnpm prune --prod

# 4. Финальный легковесный образ
FROM node:alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

USER nextjs

EXPOSE 3000

CMD ["node_modules/.bin/next", "start"]