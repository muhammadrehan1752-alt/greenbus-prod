FROM node:20-alpine AS build
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Use npm install instead of npm ci (more forgiving)
RUN npm install --legacy-peer-deps

# Copy source
COPY . .

# Build
RUN npm run build

# ─── Nginx production serve ───────────────────────────────────────────────────
FROM nginx:alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
