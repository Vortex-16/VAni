# Use Node 20 as the base image
FROM node:20-slim AS base

# Install pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Set working directory
WORKDIR /app

# Copy the entire workspace
COPY . .

# Install all dependencies (including devDependencies for building)
RUN pnpm install --frozen-lockfile

# Build the api-server
# This uses the workspace filter to only build the backend
RUN pnpm --filter @workspace/api-server run build

# Expose the port the app runs on
EXPOSE 3000

# Set the environment to production
ENV NODE_ENV=production

# Start the application
# We use the filter to run the start script in the api-server workspace
CMD ["pnpm", "--filter", "@workspace/api-server", "run", "start"]
