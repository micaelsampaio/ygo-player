# --- Stage 1: Use ygo-core image to get the dist folder ---
    FROM registry.gitlab.com/ygo101/ygo-core:latest AS core

    # --- Stage 2: Build ygo-player ---
    FROM node:22-alpine AS player
    WORKDIR /app
    
    # Copy package.json
    COPY package.json ./

    # Install dependencies
    RUN npm install
    
    # Copy the ygo-core dist folder from the ygo-core image
    COPY --from=core /app/dist ./node_modules/ygo-core
    
    # Copy the rest of the player project
    COPY . .
    
    # Build the player application
    RUN npm run build:docker