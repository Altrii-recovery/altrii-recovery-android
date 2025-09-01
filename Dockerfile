FROM node:20-alpine AS base
WORKDIR /app

# --- deps layer ---
FROM base AS deps
# install pnpm directly (avoid corepack signature issues)
RUN npm i -g pnpm@9
# copy root manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# copy app manifest so pnpm can hoist correctly
COPY apps/web/package.json apps/web/package.json
# install deps (workspace-aware)
RUN pnpm install --frozen-lockfile --ignore-scripts

# --- build layer ---
FROM deps AS build
# copy the full repo
COPY . .
# generate Prisma client for the app and build Next.js
RUN pnpm -C apps/web exec prisma generate
RUN pnpm -C apps/web build

# --- runtime layer ---
FROM base AS runner
RUN npm i -g pnpm@9
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080
# bring node_modules and built output
COPY --from=deps /app/node_modules /app/node_modules
COPY --from=build /app/apps/web/.next /app/apps/web/.next
COPY --from=build /app/apps/web/package.json /app/apps/web/package.json
COPY --from=build /app/apps/web/public /app/apps/web/public
# start Next.js in apps/web
CMD ["pnpm", "-C", "apps/web", "start"]
