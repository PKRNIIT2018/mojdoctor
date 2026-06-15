FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable && corepack prepare npm@latest --activate

FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/inngest/package.json apps/inngest/
COPY packages/ packages/
RUN npm ci --ignore-scripts

FROM base AS build
COPY --from=deps /app/node_modules /app/node_modules
COPY . .
RUN npm run build --filter=inngest

FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /app/apps/inngest/dist ./dist
COPY --from=deps /app/node_modules ./node_modules
EXPOSE 3002
CMD ["node", "dist/index.js"]
