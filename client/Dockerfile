# Build stage
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Browser talks to nginx on this container; nginx proxies /api to the server.
ARG VITE_API_BACKEND=http
ARG VITE_API_BASE_URL=/api
ARG VITE_AUTH_API_URL=/api/auth
ARG VITE_APP_ENV=production
ARG VITE_MOCK_AUTH_ENABLED=false

ENV VITE_API_BACKEND=$VITE_API_BACKEND \
    VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_AUTH_API_URL=$VITE_AUTH_API_URL \
    VITE_APP_ENV=$VITE_APP_ENV \
    VITE_MOCK_AUTH_ENABLED=$VITE_MOCK_AUTH_ENABLED

# Serve from site root inside the container (not relative base).
RUN npm run build -- --base /

# Serve stage
FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
