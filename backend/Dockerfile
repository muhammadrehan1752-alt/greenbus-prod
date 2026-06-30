FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache dumb-init python3 make g++

# ─── Build ────────────────────────────────────────────────────────────────────
FROM base AS build
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build

# ─── Production ───────────────────────────────────────────────────────────────
FROM base AS production
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY package*.json ./

RUN mkdir -p logs && chown -R node:node /app
USER node

EXPOSE 3001
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
