# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build

# Production stage — serve with Express (reads $PORT from Railway env var)
FROM node:20-alpine
WORKDIR /app
# Install express for serving
RUN npm init -y && npm install express
COPY --from=build /app/dist ./dist
COPY server.js .
# Railway injects $PORT — node server.js reads process.env.PORT
CMD ["node", "server.js"]
