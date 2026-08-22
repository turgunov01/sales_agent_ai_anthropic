FROM node:22-alpine AS builder
WORKDIR /app

ARG NUXT_PUBLIC_API_BASE=http://localhost/api/v1
ENV NUXT_PUBLIC_API_BASE=$NUXT_PUBLIC_API_BASE
ENV NUXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json* ./
COPY tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/

RUN npm ci --workspace @ai-sales/shared --workspace @ai-sales/web --include-workspace-root

COPY packages/shared packages/shared
COPY apps/web apps/web

RUN npm run build --workspace @ai-sales/shared \
 && npm run build --workspace @ai-sales/web

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup -S app && adduser -S app -G app
COPY --from=builder /app/apps/web/.output ./.output

USER app
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]