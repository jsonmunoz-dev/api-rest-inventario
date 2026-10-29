# Etapa 1: instala solo dependencias de producción
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# Etapa 2: imagen final mínima, sin herramientas de build ni tests
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --retries=5 \
  CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["node", "src/server.js"]
