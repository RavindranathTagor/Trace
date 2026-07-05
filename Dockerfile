# Trace — production image. A LONG-LIVED Node server (not serverless): the app
# holds in-memory globalThis state, persists data/*.json, and spawns the Discord
# bot as a child process — none of which survive on Vercel-style serverless.
# Deploy on Railway / Render / Fly / a VM / Kubernetes instead. See docs/DEPLOY.md.
# syntax=docker/dockerfile:1

FROM node:20-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# --- deps: install app dependencies from a clean lockfile ---
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# --- build: compile the Next.js app ---
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Always build from a clean slate — `rm -rf .next` guarantees no stale route cache is
# reused and busts any stale Docker build-layer cache (which was pinning `/` to an old
# prerender). The root route (/) is the marketing landing; /app is the product.
RUN rm -rf .next && npm run build

# --- runtime ---
FROM base AS runtime
ENV NODE_ENV=production
ENV PORT=3001
COPY --from=build /app ./
# The Discord/Teams adapters run as child processes and need their own deps.
RUN cd adapters && npm ci --omit=dev || true
EXPOSE 3001
# next start honours -p; PORT is also read by the app for the bot base URL.
CMD ["npx", "next", "start", "-p", "3001"]
