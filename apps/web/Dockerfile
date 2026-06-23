FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx next build && \
    STANDALONE=$(find .next/standalone -name "server.js" -exec dirname {} \; | head -1) && \
    mkdir -p "$STANDALONE/.next" && \
    cp -r .next/static "$STANDALONE/.next/static" && \
    cp -r public "$STANDALONE/public"

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
EXPOSE 3000
CMD ["node", "server.js"]
