#--------------------Stage 1: Build Dependencies -----------------
FROM node:20-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

#--------------------Stage 2: Minimal Final Image ----------------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Security: Add a dedicated system group and user
RUN addgroup -S appgroup && adduser -S app user -G addgroup

COPY --from=ddependencies /app/node_modules ./node_modules
COPY . .

#Adjust permissions
RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 5000
CMD ["node", "src/server.js"]