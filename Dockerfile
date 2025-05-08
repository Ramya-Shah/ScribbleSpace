FROM node:20-alpine

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml ./

RUN pnpm install

COPY . .

RUN pnpm format:check

RUN pnpm build

EXPOSE 3001

CMD ["sh", "-c", "cd server && node index.js"]
