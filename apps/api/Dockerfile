FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable && corepack prepare npm@latest --activate

FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY packages/ packages/
RUN npm ci --ignore-scripts

FROM base AS build
COPY --from=deps /app/node_modules /app/node_modules
COPY . .
RUN npm run build --filter=api

FROM base AS runner
ENV NODE_ENV=production
ENV API_PORT=4000
COPY --from=build /app/apps/api/dist ./dist
COPY --from=deps /app/node_modules ./node_modules
EXPOSE 4000
CMD ["node", "dist/main.js"]
