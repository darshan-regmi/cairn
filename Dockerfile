# Multi-stage build for the self-hosted image.
#
# Only production dependencies and the traced Next.js standalone bundle reach the
# final stage. No secrets are baked in: every credential is read from the
# environment at run time.
# syntax=docker/dockerfile:1

# ---------- dependencies ----------
# Full install (including dev deps) just so the build has a toolchain. Prisma's
# postinstall needs the schema, so those files come in before `npm ci`.
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma.config.ts ./
COPY prisma ./prisma
# prisma.config.ts resolves DATABASE_URL eagerly, and .env is kept out of the
# build context. `prisma generate` never connects, so a placeholder is enough to
# get the client (and the postinstall hook) through npm ci.
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
RUN npm ci

# ---------- prisma cli ----------
# The entrypoint runs `prisma migrate deploy`, but `prisma` is a devDependency,
# so the traced standalone bundle does not carry it — nor its closure (effect,
# c12, the schema-engine binaries, ...). Install just the CLI here. There is no
# package.json in this stage's workdir, so npm resolves only the CLI and its
# dependencies, not the whole project.
FROM node:22-alpine AS prisma-cli
WORKDIR /cli
COPY package.json /tmp/app-package.json
RUN npm install --no-save --no-audit --no-fund \
      prisma@$(node -p "require('/tmp/app-package.json').devDependencies.prisma")

# ---------- build ----------
FROM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 \
    DATABASE_URL=postgresql://build:build@localhost:5432/build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# src/generated is gitignored (and excluded from the build context), so the
# Prisma client is generated here rather than copied.
RUN npx prisma generate
RUN npm run build

# ---------- run ----------
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Prisma CLI plus its dependency closure, for the entrypoint's migrations.
# Copied before the standalone bundle so the app's traced versions win on any
# package present in both trees.
COPY --from=prisma-cli /cli/node_modules ./node_modules

# .next/standalone already carries the traced production node_modules.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
# The standalone output excludes public/, so it is copied by hand. Without this
# every file in public/ (the logo, icons, favicon) 404s in the self-host image.
COPY --from=builder /app/public ./public

# The schema and Prisma config travel with the image so migrations can run.
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod 755 /usr/local/bin/docker-entrypoint.sh

# The base image already ships an unprivileged `node` user.
USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/login').then(r=>process.exit(r.status<500?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "server.js"]
