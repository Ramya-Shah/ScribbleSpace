# Using Node.js LTS version
FROM node:20

# Set working directory
WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Copy package.json and pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install

# Copy all files
COPY . .

# Build the React application
RUN pnpm build

# Expose the port that the server runs on
EXPOSE 3001

# Command to start the server
CMD ["node", "server/index.js"]