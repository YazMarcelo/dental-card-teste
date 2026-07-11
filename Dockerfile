# ---- Build ----
FROM node:20-alpine AS builder
WORKDIR /app

# Instala dependências
COPY package.json ./
RUN npm install

# Copia o código e builda (output: standalone)
COPY . .
RUN npm run build

# ---- Runtime ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Usuário sem privilégios
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# Artefatos do build standalone
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

# server.js é gerado pelo output standalone do Next
CMD ["node", "server.js"]
