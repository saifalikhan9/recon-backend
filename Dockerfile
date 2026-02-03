# 1. Use an official Node runtime as a parent image
FROM node:20-alpine

# 2. Set the working directory inside the container
WORKDIR /app

# 3. Copy package.json and package-lock.json first (for better caching)
COPY package*.json ./

# 4. Install dependencies
# We use 'ci' (clean install) for consistent builds
RUN npm ci

# 5. Copy the rest of the application code
COPY . .

# 6. Generate Prisma Client (Crucial step!)
RUN npx prisma generate

# 7. Build the TypeScript code
RUN npm run build

# 8. Expose the port the app runs on
EXPOSE 3000

# 9. Define the command to run the app
# We assume you have a "start" script in package.json (e.g., "node dist/server.js")
CMD ["npm", "start"]