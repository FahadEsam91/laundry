# ---- Nuqa production image ----------------------------------------------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S nuqa && adduser -S nuqa -G nuqa && mkdir -p /app/data && chown nuqa:nuqa /app/data
COPY --from=build --chown=nuqa:nuqa /app/.next/standalone ./
COPY --from=build --chown=nuqa:nuqa /app/.next/static ./.next/static
COPY --from=build --chown=nuqa:nuqa /app/public ./public
USER nuqa
EXPOSE 3000
VOLUME ["/app/data"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "server.js"]
