# ===== BUILD =====
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# ===== RUN =====
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "dist/main.js"]
