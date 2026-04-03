# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build

# Production stage — serve with Express (reads $PORT from Railway)
FROM node:20-alpine
WORKDIR /app
RUN npm install express
COPY --from=build /app/dist ./dist
COPY server.js .
EXPOSE 3000
CMD ["node", "server.js"]
