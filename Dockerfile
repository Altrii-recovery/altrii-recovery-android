FROM node:20-alpine AS base
# Needed by Prisma on Alpine (musl)
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# --- deps layer ---
FROM base AS deps
RUN npm i -g pnpm@9
# copy workspace manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# copy app manifest so hoisting works
COPY apps/web/package.json apps/web/package.json
# install deps (skip postinstall; schema not copied yet)
RUN pnpm install --frozen-lockfile --ignore-scripts

# --- build layer ---
FROM deps AS build
COPY . .
RUN pnpm -C apps/web exec prisma generate
RUN pnpm -C apps/web build

# --- runtime layer ---
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

RUN npm i -g pnpm@9

# workspace manifests so pnpm can resolve workspaces
COPY --from=deps /app/package.json /app/package.json
COPY --from=deps /app/pnpm-workspace.yaml /app/pnpm-workspace.yaml
COPY --from=deps /app/pnpm-lock.yaml /app/pnpm-lock.yaml

# node_modules (root + app) and build output
COPY --from=deps  /app/node_modules              /app/node_modules
COPY --from=deps  /app/apps/web/node_modules     /app/apps/web/node_modules
COPY --from=build /app/apps/web/.next            /app/apps/web/.next
COPY --from=build /app/apps/web/package.json     /app/apps/web/package.json
COPY --from=build /app/apps/web/public           /app/apps/web/public

CMD ["pnpm", "-C", "apps/web", "start"]
