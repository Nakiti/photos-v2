# syntax=docker/dockerfile:1
#
# Focal backend — production image.
#
# The app is executed directly from TypeScript via `tsx` (see the `start`
# script); there is no compile-to-dist step. `npm run build`
# (prisma generate + typecheck) is the build-time gate, enforced in CI.
#
# Runtime deps include `tsx`, `sharp`, `@prisma/client` AND the `prisma` CLI,
# so this same image can both serve traffic (`npm start`) and apply migrations
# (`npm run migrate:deploy`) as a separate release step.

FROM node:22-bookworm-slim

# Prisma's query engine needs OpenSSL. sharp ships prebuilt linux binaries via npm.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install production dependencies against the committed lockfile (reproducible).
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Generate the Prisma client from the committed schema.
COPY prisma ./prisma
RUN npx prisma generate

# Copy the application source.
COPY . .

ENV NODE_ENV=production
# index.ts binds 0.0.0.0:4000.
EXPOSE 4000

# Run as the unprivileged user that the node image provides.
USER node

# Container-level liveness probe — uses /health (cheap, no dependency checks),
# so a transient DB/Redis/S3 blip does not get the container killed. For
# readiness (does it have working deps?), point your load balancer / orchestrator
# at GET /ready, which probes MySQL + Redis + S3 and returns 503 if any is down.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:4000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["npm", "run", "start"]
