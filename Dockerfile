FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# --- deps ---
FROM base AS deps
RUN npm i -g pnpm@9
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --frozen-lockfile --ignore-scripts

# --- build ---
FROM deps AS build
COPY . .
# Generate Prisma Client for type-checking during build
RUN pnpm -C apps/web exec prisma generate --schema=prisma/schema.prisma
# Build Next.js
RUN pnpm -C apps/web build

# --- runtime ---
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080
RUN npm i -g pnpm@9

# workspace manifests
COPY --from=deps /app/package.json /app/package.json
COPY --from=deps /app/pnpm-workspace.yaml /app/pnpm-workspace.yaml
COPY --from=deps /app/pnpm-lock.yaml /app/pnpm-lock.yaml

# node_modules (root + app) and build output
COPY --from=deps  /app/node_modules              /app/node_modules
COPY --from=deps  /app/apps/web/node_modules     /app/apps/web/node_modules
COPY --from=build /app/apps/web/.next            /app/apps/web/.next
COPY --from=build /app/apps/web/package.json     /app/apps/web/package.json
COPY --from=build /app/apps/web/public           /app/apps/web/public
# include prisma schema for runtime generate
COPY --from=build /app/apps/web/prisma           /app/apps/web/prisma

# Generate Prisma Client again in the runtime image (ensures it exists at run)
RUN pnpm -C apps/web exec prisma generate --schema=prisma/schema.prisma

CMD ["pnpm", "-C", "apps/web", "start"]
