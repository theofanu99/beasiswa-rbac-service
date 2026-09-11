FROM node:24-alpine

WORKDIR /app

COPY package.json ./package.json
COPY package-lock.json ./package-lock.json

RUN ls -la /app && cat /app/package.json

RUN npm ci

COPY prisma ./prisma
COPY prisma7.config.ts ./

RUN DATABASE_URL="mysql://root:rootpassword@localhost:3306/beasiswa_rbac" npx prisma generate

COPY src ./src

EXPOSE 3001

CMD ["node", "src/server.js"]