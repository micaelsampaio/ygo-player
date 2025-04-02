# --- Stage 1: Use ygo-player image to get the built player application ---
FROM ygo-player AS player

FROM ygo-core AS core

FROM ygo-core-images-utils AS images-utils

# --- Stage 2: Build the tests project ---
FROM node:22-alpine AS tests
WORKDIR /app

# Set the DOCKER environment variable
ENV DOCKER=true

# Copy package.json and package-lock.json for the tests project
COPY package.json package-lock.json ./

# Install dependencies for the tests project
RUN npm install

COPY --from=core /app/dist ./node_modules/ygo-core

# Copy the ygo-player dist folder from the player image
COPY --from=player /app/dist ./node_modules/ygo-player

# Copy the ygo-player dist folder from the player image
COPY --from=images-utils /app/dist ./node_modules/ygo-core-images-utils

# Copy the rest of the tests project
COPY . .

# Build the tests project
RUN npm run build

# --- Stage 3: Serve with Nginx ---
FROM nginx:alpine AS server

# Copy the custom Nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built files from the tests stage
COPY --from=tests /app/dist/ /usr/share/nginx/html/

# Expose the port for the Nginx server
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]