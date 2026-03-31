# Production build for Backend
FROM node:20-alpine

RUN apk add --no-cache openssl libc6-compat

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm install --omit=dev

# Generate Prisma Client
RUN npx prisma generate

# Copy the rest of the application
COPY . .

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "start"]
