# --- Stage 1: Build player component ---
    FROM node:18-alpine AS player
    WORKDIR /app
    
    COPY package.json .
    RUN npm install --frozen-lockfile
    
    # Copy the rest of the project
    COPY  . .

    RUN npm run build

# --- Stage 2: Build __tests__ ---
    FROM node:18-alpine AS builder

    WORKDIR /app

    COPY --from=player /app/dist ./dist

    RUN mkdir __tests__

    COPY __tests__/package.json ./__tests__/

    RUN cd __tests__ && npm install --frozen-lockfile

    COPY __tests__ __tests__/

    RUN cd __tests__ && npm run build

# --- Stage 3: Serve with Nginx ---
    FROM nginx:alpine AS server

    # Copy the custom Nginx config
    COPY nginx.conf /etc/nginx/conf.d/default.conf
    
    # Copy built files
    COPY --from=builder /app/__tests__/dist/ /usr/share/nginx/html/
    
    EXPOSE 80
    CMD ["nginx", "-g", "daemon off;"]