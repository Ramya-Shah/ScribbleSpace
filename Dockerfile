# Using Node.js LTS version
FROM node:20-alpine

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

# Check code formatting
RUN pnpm format:check

# Build the React application
RUN pnpm build

# Expose the port that the server runs on
EXPOSE 3001

# Command to start the server (only after build is successful)
CMD ["sh", "-c", "ls -la dist && node server/index.js"]