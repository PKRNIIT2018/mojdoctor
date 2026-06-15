FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable && corepack prepare npm@latest --activate

FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
COPY packages/ packages/
RUN npm ci --ignore-scripts

FROM base AS build
COPY --from=deps /app/node_modules /app/node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build --filter=web

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
COPY --from=build /app/apps/web/public ./public
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
