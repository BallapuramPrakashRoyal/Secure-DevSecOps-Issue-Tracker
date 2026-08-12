FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev && npm install prisma --no-save

COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src

ENV NODE_ENV=production
EXPOSE 4000

# Apply migrations then start the server. Seed is run separately/manually.
CMD ["sh", "-c", "npx prisma migrate deploy && node src/server.js"]
